import { Router } from 'express';
import db from '../db';
import { startCollectionRun } from '../services/collectionRunner';
import type { Collection } from '../types';

const router = Router();

function getNow(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function rowToCollection(row: any): Collection {
  return {
    id: row.Id,
    name: row.Name,
    description: row.Description ?? null,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM Collections').all() as any[];
    res.json(rows.map(rowToCollection));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM Collections WHERE Id = ?').get(Number(req.params.id)) as any;
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(rowToCollection(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/endpoints', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM ApiEndpoints WHERE CollectionId = ?').all(Number(req.params.id)) as any[];
    res.json(rows.map(r => ({
      id: r.Id,
      collectionId: r.CollectionId ?? null,
      name: r.Name,
      description: r.Description ?? null,
      method: r.Method,
      url: r.Url,
      headers: r.Headers ?? null,
      body: r.Body ?? null,
      bodyType: r.BodyType ?? null,
      authType: r.AuthType ?? 'None',
      authConfig: r.AuthConfig ?? null,
      createdAt: r.CreatedAt,
      updatedAt: r.UpdatedAt,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const now = getNow();
    const result = db.prepare('INSERT INTO Collections (Name, Description, CreatedAt, UpdatedAt) VALUES (?, ?, ?, ?)')
      .run(req.body.name, req.body.description ?? null, now, now);
    const row = db.prepare('SELECT * FROM Collections WHERE Id = ?').get(result.lastInsertRowid) as any;
    res.status(201).json(rowToCollection(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const now = getNow();
    const existing = db.prepare('SELECT * FROM Collections WHERE Id = ?').get(Number(req.params.id)) as any;
    if (!existing) return res.status(404).json({ error: 'Not found' });

    db.prepare('UPDATE Collections SET Name=?, Description=?, UpdatedAt=? WHERE Id=?')
      .run(req.body.name ?? existing.Name, req.body.description ?? existing.Description, now, Number(req.params.id));

    const row = db.prepare('SELECT * FROM Collections WHERE Id = ?').get(Number(req.params.id)) as any;
    res.json(rowToCollection(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM Collections WHERE Id = ?').run(Number(req.params.id));
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/run', (req, res) => {
  try {
    const collection = db.prepare('SELECT * FROM Collections WHERE Id = ?').get(Number(req.params.id)) as any;
    if (!collection) return res.status(404).json({ error: 'Not found' });

    const endpoints = db.prepare('SELECT * FROM ApiEndpoints WHERE CollectionId = ?').all(collection.Id) as any[];
    if (endpoints.length === 0) return res.status(400).json({ error: 'Collection has no endpoints' });

    const environmentId = req.body?.environmentId ?? null;
    const now = getNow();

    const runResult = db.prepare(`
      INSERT INTO CollectionRuns (CollectionId, CollectionName, Status, TotalEndpoints, StartedAt)
      VALUES (?, ?, 'Running', ?, ?)
    `).run(collection.Id, collection.Name, endpoints.length, now);
    const runId = runResult.lastInsertRowid as number;

    const insertResult = db.prepare(`
      INSERT INTO CollectionRunResults (CollectionRunId, ApiEndpointId, EndpointName, Status)
      VALUES (?, ?, ?, 'Pending')
    `);
    for (const ep of endpoints) {
      insertResult.run(runId, ep.Id, ep.Name);
    }

    const endpointIds = endpoints.map(e => e.Id);
    startCollectionRun(runId, endpointIds, environmentId);

    res.json({ runId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
