import db from '../db';
import { startCollectionRun } from './collectionRunner';
import { getDefaultEnvironmentId } from './variableInterpolation';
import type { Schedule } from '../types';

let intervalId: ReturnType<typeof setInterval> | null = null;
let running = 0;
let isRunning = false;
const MAX_CONCURRENT = 5;

function getNow(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z';
}

async function runDueCollection(schedule: Schedule) {
  while (running >= MAX_CONCURRENT) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  running++;

  try {
    const endpoints = db.prepare('SELECT Id FROM ApiEndpoints WHERE CollectionId = ?').all(schedule.collectionId) as any[];
    if (endpoints.length === 0) return;

    const now = getNow();
    const runResult = db.prepare(`
      INSERT INTO CollectionRuns (CollectionId, CollectionName, Status, TotalEndpoints, IsAdHoc, StartedAt)
      VALUES (?, (SELECT Name FROM Collections WHERE Id = ?), 'Running', ?, 0, ?)
    `).run(schedule.collectionId, schedule.collectionId, endpoints.length, now);
    const runId = runResult.lastInsertRowid as number;

    const insertResult = db.prepare(`
      INSERT INTO CollectionRunResults (CollectionRunId, ApiEndpointId, EndpointName, Status)
      VALUES (?, ?, ?, 'Pending')
    `);
    for (const ep of endpoints) {
      const name = (db.prepare('SELECT Name FROM ApiEndpoints WHERE Id = ?').get(ep.Id) as any)?.Name || '';
      insertResult.run(runId, ep.Id, name);
    }

    const environmentId = getDefaultEnvironmentId();
    startCollectionRun(runId, endpoints.map((e: any) => e.Id), environmentId);

    const nextRunAt = new Date(Date.now() + schedule.intervalSeconds * 1000)
      .toISOString().replace('T', ' ').substring(0, 19) + 'Z';
    db.prepare('UPDATE Schedules SET LastRunAt = ?, NextRunAt = ?, UpdatedAt = ? WHERE Id = ?')
      .run(now, nextRunAt, now, schedule.id);
  } catch (err) {
    console.error(`Schedule run failed for collection ${schedule.collectionId}:`, err);
  } finally {
    running--;
  }
}

function tick() {
  try {
    if (!isRunning) return;

    const now = getNow();

    // Get IDs of collections that are temporary imports (skip them)
    const tempColIds = db.prepare('SELECT CollectionId FROM TemporaryImports WHERE CollectionId IS NOT NULL')
      .all().map((r: any) => r.CollectionId);

    let query = `
      SELECT * FROM Schedules
      WHERE IsEnabled = 1 AND (NextRunAt IS NULL OR NextRunAt <= ?)
    `;
    const params: any[] = [now];

    if (tempColIds.length > 0) {
      const placeholders = tempColIds.map(() => '?').join(',');
      query += ` AND CollectionId NOT IN (${placeholders})`;
      params.push(...tempColIds);
    }

    const dueRows = db.prepare(query).all(...params) as any[];

    const dueSchedules: Schedule[] = dueRows.map(r => ({
      id: r.Id,
      collectionId: r.CollectionId,
      isEnabled: !!r.IsEnabled,
      intervalSeconds: r.IntervalSeconds,
      lastRunAt: r.LastRunAt,
      nextRunAt: r.NextRunAt,
      createdAt: r.CreatedAt,
      updatedAt: r.UpdatedAt,
    }));

    for (const schedule of dueSchedules) {
      runDueCollection(schedule);
    }
  } catch (err) {
    console.error('Schedule tick error:', err);
  }
}

export function startScheduler(): void {
  if (intervalId) return;
  isRunning = true;
  tick();
  intervalId = setInterval(tick, 1000);
  console.log('ScheduleRunner started');
}

export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  isRunning = false;
  console.log('ScheduleRunner stopped');
}

export function getSchedulerRunning(): boolean {
  return isRunning;
}
