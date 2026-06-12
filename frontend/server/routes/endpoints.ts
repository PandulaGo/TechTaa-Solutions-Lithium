import { Router } from 'express';
import db from '../db';
import { executeEndpoint } from '../services/apiExecution';
import { validateResult } from '../services/validation';
import { exportEndpoints, importEndpoints } from '../services/exportImport';
import type { ApiEndpoint } from '../types';

const router = Router();

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

router.get('/', (req, res) => {
  try {
    const collectionId = req.query.collectionId;
    let rows: any[];
    if (collectionId) {
      rows = db.prepare('SELECT * FROM ApiEndpoints WHERE CollectionId = ?').all(Number(collectionId));
    } else {
      rows = db.prepare('SELECT * FROM ApiEndpoints').all();
    }

    const endpoints = rows.map(row => {
      const ep = rowToEndpoint(row);
      const coll = db.prepare('SELECT * FROM Collections WHERE Id = ?').get(row.CollectionId) as any;
      if (coll) {
        ep.collection = {
          id: coll.Id,
          name: coll.Name,
          description: coll.Description ?? null,
          createdAt: coll.CreatedAt,
          updatedAt: coll.UpdatedAt,
        };
      }
      return ep;
    });

    res.json(endpoints);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export', (req, res) => {
  try {
    const idsParam = req.query.ids as string;
    if (!idsParam) return res.status(400).json({ error: 'ids query param required' });

    const ids = idsParam.split(',').map(Number).filter(n => !isNaN(n));
    const result = exportEndpoints(ids);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/import', (req, res) => {
  try {
    const result = importEndpoints(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM ApiEndpoints WHERE Id = ?').get(Number(req.params.id)) as any;
    if (!row) return res.status(404).json({ error: 'Not found' });

    const ep = rowToEndpoint(row);
    const coll = db.prepare('SELECT * FROM Collections WHERE Id = ?').get(row.CollectionId) as any;
    if (coll) {
      ep.collection = {
        id: coll.Id,
        name: coll.Name,
        description: coll.Description ?? null,
        createdAt: coll.CreatedAt,
        updatedAt: coll.UpdatedAt,
      };
    }

    res.json(ep);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const now = getNow();
    const result = db.prepare(`
      INSERT INTO ApiEndpoints (CollectionId, Name, Description, Method, Url, Headers, Body, BodyType, AuthType, AuthConfig, CreatedAt, UpdatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.body.collectionId ?? null,
      req.body.name,
      req.body.description ?? null,
      req.body.method,
      req.body.url,
      req.body.headers ?? null,
      req.body.body ?? null,
      req.body.bodyType ?? null,
      req.body.authType ?? 'None',
      req.body.authConfig ?? null,
      now,
      now
    );

    const row = db.prepare('SELECT * FROM ApiEndpoints WHERE Id = ?').get(result.lastInsertRowid) as any;
    res.status(201).json(rowToEndpoint(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const now = getNow();
    const existing = db.prepare('SELECT * FROM ApiEndpoints WHERE Id = ?').get(Number(req.params.id)) as any;
    if (!existing) return res.status(404).json({ error: 'Not found' });

    db.prepare(`
      UPDATE ApiEndpoints SET CollectionId=?, Name=?, Description=?, Method=?, Url=?, Headers=?, Body=?, BodyType=?, AuthType=?, AuthConfig=?, UpdatedAt=?
      WHERE Id=?
    `).run(
      req.body.collectionId ?? existing.CollectionId,
      req.body.name ?? existing.Name,
      req.body.description ?? existing.Description,
      req.body.method ?? existing.Method,
      req.body.url ?? existing.Url,
      req.body.headers ?? existing.Headers,
      req.body.body ?? existing.Body,
      req.body.bodyType ?? existing.BodyType,
      req.body.authType ?? existing.AuthType,
      req.body.authConfig ?? existing.AuthConfig,
      now,
      Number(req.params.id)
    );

    const row = db.prepare('SELECT * FROM ApiEndpoints WHERE Id = ?').get(Number(req.params.id)) as any;
    res.json(rowToEndpoint(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM ApiEndpoints WHERE Id = ?').run(Number(req.params.id));
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk-run', async (req, res) => {
  try {
    const { endpointIds } = req.body;
    if (!Array.isArray(endpointIds)) return res.status(400).json({ error: 'endpointIds array required' });

    const results: any[] = [];
    for (const id of endpointIds) {
      const row = db.prepare('SELECT * FROM ApiEndpoints WHERE Id = ?').get(id) as any;
      if (!row) continue;

      const ep = rowToEndpoint(row);
      const result = await executeEndpoint(ep);

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

      results.push({
        apiEndpointId: id,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        isSuccess: isValid,
        errorMessage: result.errorMessage || null,
      });
    }

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/run', async (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM ApiEndpoints WHERE Id = ?').get(Number(req.params.id)) as any;
    if (!row) return res.status(404).json({ error: 'Not found' });

    const ep = rowToEndpoint(row);
    const result = await executeEndpoint(ep);

    const rules = db.prepare('SELECT * FROM ValidationRules WHERE ApiEndpointId = ?').all(ep.id) as any[];
    const isValid = validateResult(result, rules.map(r => ({ ...r, isEnabled: !!r.IsEnabled })));

    const now = getNow();
    db.prepare(`
      INSERT INTO ApiResults (ApiEndpointId, StatusCode, ResponseTimeMs, ResponseHeaders, ResponseBody, RequestBody, RequestHeaders, IsSuccess, ErrorMessage, ExecutedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ep.id, result.statusCode, result.responseTimeMs,
      result.responseHeaders, result.responseBody ?? null,
      result.requestBody ?? null, result.requestHeaders ?? null,
      isValid ? 1 : 0, result.errorMessage || null, now
    );

    res.json({
      apiEndpointId: ep.id,
      statusCode: result.statusCode,
      responseTimeMs: result.responseTimeMs,
      isSuccess: isValid,
      errorMessage: result.errorMessage || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
