import db from '../db';
import { executeEndpoint } from './apiExecution';
import { validateResult } from './validation';
import type { ApiEndpoint } from '../types';

const activeRuns = new Set<number>();

function getNow(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function rowToEndpoint(row: any): ApiEndpoint {
  return {
    id: row.Id,
    collectionId: row.CollectionId ?? null,
    name: row.Name,
    description: row.Description ?? null,
    method: row.Method,
    url: row.Url,
    headers: row.Headers ?? null,
    body: row.Body ?? null,
    bodyType: row.BodyType ?? null,
    authType: row.AuthType ?? 'None',
    authConfig: row.AuthConfig ?? null,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

export async function startCollectionRun(runId: number, endpointIds: number[], environmentId: number | null): Promise<void> {
  if (activeRuns.has(runId)) return;
  activeRuns.add(runId);

  try {
    for (const id of endpointIds) {
      if (!activeRuns.has(runId)) break;

      db.prepare("UPDATE CollectionRunResults SET Status = 'Running' WHERE CollectionRunId = ? AND ApiEndpointId = ?")
        .run(runId, id);

      const row = db.prepare('SELECT * FROM ApiEndpoints WHERE Id = ?').get(id) as any;
      if (!row) continue;

      const ep = rowToEndpoint(row);
      const result = await executeEndpoint(ep, environmentId);
      const rules = db.prepare('SELECT * FROM ValidationRules WHERE ApiEndpointId = ?').all(id) as any[];
      const isValid = validateResult(result, rules.map(r => ({ ...r, isEnabled: !!r.IsEnabled })));

      const now = getNow();
      db.prepare(`
        INSERT INTO ApiResults (ApiEndpointId, StatusCode, ResponseTimeMs, ResponseHeaders, ResponseBody, RequestBody, RequestHeaders, IsSuccess, ErrorMessage, ExecutedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, result.statusCode, result.responseTimeMs,
        result.responseHeaders, result.responseBody ?? null,
        result.requestBody ?? null, result.requestHeaders ?? null,
        isValid ? 1 : 0, result.errorMessage || null, now
      );

      db.prepare(`
        UPDATE CollectionRunResults SET Status = 'Completed', StatusCode = ?, ResponseTimeMs = ?, IsSuccess = ?, ErrorMessage = ?, ResponseBody = ?, ExecutedAt = ?
        WHERE CollectionRunId = ? AND ApiEndpointId = ?
      `).run(result.statusCode, result.responseTimeMs, isValid ? 1 : 0, result.errorMessage || null, result.responseBody ?? null, now, runId, id);

      db.prepare(`
        UPDATE CollectionRuns SET CompletedCount = CompletedCount + 1, SuccessCount = SuccessCount + ?, FailCount = FailCount + ?
        WHERE Id = ?
      `).run(isValid ? 1 : 0, isValid ? 0 : 1, runId);
    }
  } catch (err) {
    console.error(`Collection run ${runId} error:`, err);
  } finally {
    const now = getNow();
    db.prepare("UPDATE CollectionRuns SET Status = 'Completed', CompletedAt = ? WHERE Id = ?").run(now, runId);
    activeRuns.delete(runId);
  }
}

export function isRunActive(runId: number): boolean {
  return activeRuns.has(runId);
}
