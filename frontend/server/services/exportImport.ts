import db from '../db';
import type { ExportPayload, ExportedEndpoint, ImportPayload } from '../types';

function getNow(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function rowToEndpoint(row: any): ExportedEndpoint {
  return {
    name: row.Name,
    description: row.Description,
    method: row.Method,
    url: row.Url,
    headers: row.Headers,
    body: row.Body,
    bodyType: row.BodyType,
    authType: row.AuthType,
    authConfig: row.AuthConfig,
    collectionName: row.CollectionName || null,
    schedule: row.ScheduleInterval ? {
      intervalSeconds: row.ScheduleInterval,
      isEnabled: !!row.ScheduleIsEnabled,
    } : undefined,
    validationRules: [],
  };
}

export function exportEndpoints(ids: number[]): ExportPayload {
  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT e.*, c.Name as CollectionName,
           s.IntervalSeconds as ScheduleInterval, s.IsEnabled as ScheduleIsEnabled
    FROM ApiEndpoints e
    LEFT JOIN Collections c ON e.CollectionId = c.Id
    LEFT JOIN Schedules s ON s.ApiEndpointId = e.Id
    WHERE e.Id IN (${placeholders})
  `).all(...ids) as any[];

  const endpoints: ExportedEndpoint[] = rows.map(rowToEndpoint);

  for (const ep of endpoints) {
    const endpointId = ids[endpoints.indexOf(ep)];
    const rules = db.prepare('SELECT * FROM ValidationRules WHERE ApiEndpointId = ? ORDER BY "Order"').all(endpointId) as any[];
    ep.validationRules = rules.map(r => ({
      ruleType: r.RuleType,
      expectedValue: r.ExpectedValue,
      comparisonType: r.ComparisonType,
      order: r.Order,
      isEnabled: !!r.IsEnabled,
    }));
  }

  return { endpoints };
}

export function importEndpoints(payload: ImportPayload): { imported: number } {
  let imported = 0;

  const insertEndpoint = db.prepare(`
    INSERT INTO ApiEndpoints (CollectionId, Name, Description, Method, Url, Headers, Body, BodyType, AuthType, AuthConfig, CreatedAt, UpdatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSchedule = db.prepare(`
    INSERT INTO Schedules (ApiEndpointId, IsEnabled, IntervalSeconds, NextRunAt, CreatedAt, UpdatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertRule = db.prepare(`
    INSERT INTO ValidationRules (ApiEndpointId, RuleType, ExpectedValue, ComparisonType, IsEnabled, "Order")
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const getCollectionId = db.transaction((name: string) => {
    const existing = db.prepare('SELECT Id FROM Collections WHERE Name = ?').get(name) as any;
    if (existing) return existing.Id;
    const now = getNow();
    const result = db.prepare('INSERT INTO Collections (Name, CreatedAt, UpdatedAt) VALUES (?, ?, ?)').run(name, now, now);
    return result.lastInsertRowid as number;
  });

  for (const ep of payload.endpoints) {
    const now = getNow();
    let collectionId: number | null = null;

    if (ep.collectionName) {
      collectionId = getCollectionId(ep.collectionName);
    }

    const result = insertEndpoint.run(
      collectionId, ep.name, ep.description || null, ep.method, ep.url,
      ep.headers || null, ep.body || null, ep.bodyType || null,
      ep.authType || 'None', ep.authConfig || null, now, now
    );

    const endpointId = result.lastInsertRowid as number;

    if (ep.schedule) {
      const nextRunAt = new Date(Date.now() + ep.schedule.intervalSeconds * 1000)
        .toISOString().replace('T', ' ').substring(0, 19);
      insertSchedule.run(endpointId, ep.schedule.isEnabled ? 1 : 0, ep.schedule.intervalSeconds, nextRunAt, now, now);
    }

    for (const rule of (ep.validationRules || [])) {
      insertRule.run(endpointId, rule.ruleType, rule.expectedValue, rule.comparisonType, rule.isEnabled ? 1 : 0, rule.order);
    }

    imported++;
  }

  return { imported };
}
