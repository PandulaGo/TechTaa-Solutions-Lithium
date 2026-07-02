import db from '../db';
import { executeEndpoint } from './apiExecution';
import { validateResult } from './validation';
import { getDefaultEnvironmentId } from './variableInterpolation';
import type { ApiEndpoint, Schedule } from '../types';

let intervalId: ReturnType<typeof setInterval> | null = null;
let running = 0;
const MAX_CONCURRENT = 5;

function parseRow(row: any): ApiEndpoint {
  return { ...row, collectionId: row.CollectionId ?? null, bodyType: row.BodyType ?? null };
}

function getNow(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

async function runDueSchedule(schedule: Schedule) {
  while (running >= MAX_CONCURRENT) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  running++;

  try {
    const endpoint = db.prepare('SELECT * FROM ApiEndpoints WHERE Id = ?').get(schedule.apiEndpointId) as any;
    if (!endpoint) return;

    const result = await executeEndpoint(parseRow(endpoint), getDefaultEnvironmentId());

    const rules = db.prepare('SELECT * FROM ValidationRules WHERE ApiEndpointId = ?').all(schedule.apiEndpointId) as any[];
    const isValid = validateResult(result, rules.map(r => ({ ...r, isEnabled: !!r.IsEnabled })));

    const now = getNow();
    db.prepare(`
      INSERT INTO ApiResults (ApiEndpointId, StatusCode, ResponseTimeMs, ResponseHeaders, ResponseBody, RequestBody, RequestHeaders, IsSuccess, ErrorMessage, ExecutedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      schedule.apiEndpointId, result.statusCode, result.responseTimeMs,
      result.responseHeaders, result.responseBody ?? null,
      result.requestBody ?? null, result.requestHeaders ?? null,
      isValid ? 1 : 0, result.errorMessage || null, now
    );

    const nextRunAt = new Date(Date.now() + schedule.intervalSeconds * 1000).toISOString().replace('T', ' ').substring(0, 19);
    db.prepare('UPDATE Schedules SET LastRunAt = ?, NextRunAt = ?, UpdatedAt = ? WHERE Id = ?')
      .run(now, nextRunAt, now, schedule.id);
  } catch (err) {
    console.error(`Schedule run failed for endpoint ${schedule.apiEndpointId}:`, err);
  } finally {
    running--;
  }
}

function tick() {
  try {
    const now = getNow();
    const dueRows = db.prepare(`
      SELECT * FROM Schedules
      WHERE IsEnabled = 1 AND (NextRunAt IS NULL OR NextRunAt <= ?)
    `).all(now) as any[];

    const dueSchedules: Schedule[] = dueRows.map(r => ({
      id: r.Id,
      apiEndpointId: r.ApiEndpointId,
      isEnabled: !!r.IsEnabled,
      intervalSeconds: r.IntervalSeconds,
      lastRunAt: r.LastRunAt,
      nextRunAt: r.NextRunAt,
      createdAt: r.CreatedAt,
      updatedAt: r.UpdatedAt,
    }));

    for (const schedule of dueSchedules) {
      runDueSchedule(schedule);
    }
  } catch (err) {
    console.error('Schedule tick error:', err);
  }
}

export function startScheduler(): void {
  if (intervalId) return;
  tick();
  intervalId = setInterval(tick, 1000);
  console.log('ScheduleRunner started');
}

export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('ScheduleRunner stopped');
  }
}
