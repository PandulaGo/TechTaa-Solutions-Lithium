import db from '../db';
import type { ExportPayload, ExportedEndpoint } from '../types';

function getNow(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z';
}

function parseJsonField(value: string | null): any {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return value; }
}

function stringifyJsonField(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function rowToEndpoint(row: any): ExportedEndpoint {
  return {
    name: row.Name,
    description: row.Description,
    method: row.Method,
    url: row.Url,
    headers: parseJsonField(row.Headers),
    body: parseJsonField(row.Body),
    bodyType: row.BodyType,
    authType: row.AuthType,
    authConfig: parseJsonField(row.AuthConfig),
    collectionName: row.CollectionName || null,
    validationRules: [],
  };
}

export function exportEndpoints(ids: number[]): ExportPayload {
  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT e.*, c.Name as CollectionName
    FROM ApiEndpoints e
    LEFT JOIN Collections c ON e.CollectionId = c.Id
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

function getOrCreateCollection(name: string, description: string | null): number {
  const existing = db.prepare('SELECT Id FROM Collections WHERE Name = ?').get(name) as any;
  if (existing) return existing.Id;
  const now = getNow();
  const result = db.prepare('INSERT INTO Collections (Name, Description, CreatedAt, UpdatedAt) VALUES (?, ?, ?, ?)').run(name, description, now, now);
  return result.lastInsertRowid as number;
}

const insertEndpoint = db.prepare(`
  INSERT INTO ApiEndpoints (CollectionId, Name, Description, Method, Url, Headers, Body, BodyType, AuthType, AuthConfig, CreatedAt, UpdatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertSchedule = db.prepare(`
  INSERT INTO Schedules (CollectionId, IsEnabled, IntervalSeconds, NextRunAt, CreatedAt, UpdatedAt)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertRule = db.prepare(`
  INSERT INTO ValidationRules (ApiEndpointId, RuleType, ExpectedValue, ComparisonType, IsEnabled, "Order")
  VALUES (?, ?, ?, ?, ?, ?)
`);

function insertOneEndpoint(collectionId: number | null, ep: any): void {
  const now = getNow();
  const result = insertEndpoint.run(
    collectionId, ep.name, ep.description || null, ep.method, ep.url,
    stringifyJsonField(ep.headers), stringifyJsonField(ep.body), ep.bodyType?.toLowerCase() || null,
    ep.authType || 'None', stringifyJsonField(ep.authConfig), now, now
  );
  const endpointId = result.lastInsertRowid as number;

  for (const rule of (ep.validationRules || [])) {
    insertRule.run(endpointId, rule.ruleType, rule.expectedValue, rule.comparisonType, rule.isEnabled ? 1 : 0, rule.order);
  }
}

export function importEndpoints(payload: any): { imported: number } {
  if (payload.collections && Array.isArray(payload.collections)) {
    return importCollections(payload.collections);
  }
  if (payload.endpoints && Array.isArray(payload.endpoints)) {
    return importLegacy(payload.endpoints);
  }
  return { imported: 0 };
}

function importCollections(collections: any[]): { imported: number } {
  let imported = 0;

  const runAll = db.transaction(() => {
    for (const col of collections) {
      const collectionId = getOrCreateCollection(col.name, col.description || null);

      for (const ep of col.endpoints) {
        insertOneEndpoint(collectionId, ep);
        imported++;
      }

      if (col.schedule) {
        const now = getNow();
        const nextRunAt = new Date(Date.now() + col.schedule.intervalSeconds * 1000)
          .toISOString().replace('T', ' ').substring(0, 19) + 'Z';
        insertSchedule.run(collectionId, col.schedule.isEnabled ? 1 : 0, col.schedule.intervalSeconds, nextRunAt, now, now);
      }
    }
  });

  runAll();
  return { imported };
}

function importLegacy(endpoints: any[]): { imported: number } {
  let imported = 0;

  const runAll = db.transaction(() => {
    for (const ep of endpoints) {
      let collectionId: number | null = null;
      if (ep.collectionName) {
        collectionId = getOrCreateCollection(ep.collectionName, null);
      }
      insertOneEndpoint(collectionId, ep);
      imported++;
    }
  });

  runAll();
  return { imported };
}

export function importTemporary(payload: any): { imported: number; endpointIds: number[]; collectionIds: number[] } {
  const endpointIds: number[] = [];
  const collectionIds: number[] = [];
  let imported = 0;

  const runAll = db.transaction(() => {
    if (payload.collections && Array.isArray(payload.collections)) {
      for (const col of payload.collections) {
        const collectionId = getOrCreateCollection(col.name, col.description || null);
        collectionIds.push(collectionId);
        for (const ep of col.endpoints) {
          const now = getNow();
          const result = insertEndpoint.run(
            collectionId, ep.name, ep.description || null, ep.method, ep.url,
            stringifyJsonField(ep.headers), stringifyJsonField(ep.body), ep.bodyType?.toLowerCase() || null,
            ep.authType || 'None', stringifyJsonField(ep.authConfig), now, now
          );
          const epId = result.lastInsertRowid as number;
          endpointIds.push(epId);
          for (const rule of (ep.validationRules || [])) {
            insertRule.run(epId, rule.ruleType, rule.expectedValue, rule.comparisonType, rule.isEnabled ? 1 : 0, rule.order);
          }
          imported++;
        }
      }
    } else if (payload.endpoints && Array.isArray(payload.endpoints)) {
      for (const ep of payload.endpoints) {
        let collectionId: number | null = null;
        if (ep.collectionName) {
          collectionId = getOrCreateCollection(ep.collectionName, null);
          if (!collectionIds.includes(collectionId)) collectionIds.push(collectionId);
        }
        const now = getNow();
        const result = insertEndpoint.run(
          collectionId, ep.name, ep.description || null, ep.method, ep.url,
          stringifyJsonField(ep.headers), stringifyJsonField(ep.body), ep.bodyType?.toLowerCase() || null,
          ep.authType || 'None', stringifyJsonField(ep.authConfig), now, now
        );
        const epId = result.lastInsertRowid as number;
        endpointIds.push(epId);
        for (const rule of (ep.validationRules || [])) {
          insertRule.run(epId, rule.ruleType, rule.expectedValue, rule.comparisonType, rule.isEnabled ? 1 : 0, rule.order);
        }
        imported++;
      }
    }
  });

  runAll();
  return { imported, endpointIds, collectionIds };
}

export function cleanupTemporary(collections: number[]) {
  const runAll = db.transaction(() => {
    for (const colId of collections) {
      const endpoints = db.prepare('SELECT Id FROM ApiEndpoints WHERE CollectionId = ?').all(colId) as any[];
      for (const ep of endpoints) {
        db.prepare('DELETE FROM ValidationRules WHERE ApiEndpointId = ?').run(ep.Id);
        db.prepare('DELETE FROM ApiResults WHERE ApiEndpointId = ?').run(ep.Id);
      }
      db.prepare('DELETE FROM ApiEndpoints WHERE CollectionId = ?').run(colId);
      db.prepare('DELETE FROM Schedules WHERE CollectionId = ?').run(colId);
      db.prepare('DELETE FROM Collections WHERE Id = ?').run(colId);
    }
  });

  runAll();
}
