import { Router } from 'express';
import db from '../db';
import type { ApiResult } from '../types';

const router = Router();

function rowToResult(row: any): ApiResult {
  return {
    id: row.Id,
    apiEndpointId: row.ApiEndpointId,
    statusCode: row.StatusCode,
    responseTimeMs: row.ResponseTimeMs,
    responseHeaders: row.ResponseHeaders ?? null,
    responseBody: row.ResponseBody ?? null,
    requestBody: row.RequestBody ?? null,
    requestHeaders: row.RequestHeaders ?? null,
    requestUrl: row.RequestUrl ?? null,
    isSuccess: !!row.IsSuccess,
    errorMessage: row.ErrorMessage ?? null,
    executedAt: row.ExecutedAt,
  };
}

router.get('/', (req, res) => {
  try {
    const conditions: string[] = [];
    const values: any[] = [];

    if (req.query.endpointId) {
      conditions.push('r.ApiEndpointId = ?');
      values.push(Number(req.query.endpointId));
    }
    if (req.query.collectionId) {
      conditions.push('r.ApiEndpointId IN (SELECT Id FROM ApiEndpoints WHERE CollectionId = ?)');
      values.push(Number(req.query.collectionId));
    }
    if (req.query.isSuccess !== undefined) {
      conditions.push('r.IsSuccess = ?');
      values.push(req.query.isSuccess === 'true' ? 1 : 0);
    }
    if (req.query.from) {
      conditions.push('r.ExecutedAt >= ?');
      values.push(req.query.from);
    }
    if (req.query.to) {
      conditions.push('r.ExecutedAt <= ?');
      values.push(req.query.to);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize as string) || 50));
    const offset = (page - 1) * pageSize;

    const rows = db.prepare(`
      SELECT * FROM ApiResults r ${where} ORDER BY r.ExecutedAt DESC LIMIT ? OFFSET ?
    `).all(...values, pageSize, offset) as any[];

    const results = rows.map(row => {
      const result = rowToResult(row);
      const ep = db.prepare('SELECT * FROM ApiEndpoints WHERE Id = ?').get(row.ApiEndpointId) as any;
      if (ep) {
        result.apiEndpoint = {
          id: ep.Id,
          collectionId: ep.CollectionId ?? null,
          name: ep.Name,
          description: ep.Description ?? null,
          method: ep.Method,
          url: ep.Url,
          headers: ep.Headers ?? null,
          body: ep.Body ?? null,
          bodyType: ep.BodyType ?? null,
          authType: ep.AuthType ?? 'None',
          authConfig: ep.AuthConfig ?? null,
          createdAt: ep.CreatedAt,
          updatedAt: ep.UpdatedAt,
        };
      }
      return result;
    });

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM ApiResults WHERE Id = ?').get(Number(req.params.id)) as any;
    if (!row) return res.status(404).json({ error: 'Not found' });

    const result = rowToResult(row);
    const ep = db.prepare('SELECT * FROM ApiEndpoints WHERE Id = ?').get(row.ApiEndpointId) as any;
    if (ep) {
      result.apiEndpoint = {
        id: ep.Id,
        collectionId: ep.CollectionId ?? null,
        name: ep.Name,
        description: ep.Description ?? null,
        method: ep.Method,
        url: ep.Url,
        headers: ep.Headers ?? null,
        body: ep.Body ?? null,
        bodyType: ep.BodyType ?? null,
        authType: ep.AuthType ?? 'None',
        authConfig: ep.AuthConfig ?? null,
        createdAt: ep.CreatedAt,
        updatedAt: ep.UpdatedAt,
      };
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
