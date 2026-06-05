import { Router } from 'express';
import db from '../db';
import type { Schedule } from '../types';

const router = Router();

function getNow(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function rowToSchedule(row: any): Schedule {
  return {
    id: row.Id,
    apiEndpointId: row.ApiEndpointId,
    isEnabled: !!row.IsEnabled,
    intervalSeconds: row.IntervalSeconds,
    lastRunAt: row.LastRunAt ?? null,
    nextRunAt: row.NextRunAt ?? null,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

router.get('/', (req, res) => {
  try {
    const endpointId = req.query.endpointId;
    let rows: any[];
    if (endpointId) {
      rows = db.prepare('SELECT * FROM Schedules WHERE ApiEndpointId = ?').all(Number(endpointId));
    } else {
      rows = db.prepare('SELECT * FROM Schedules').all();
    }

    const schedules = rows.map(row => {
      const sch = rowToSchedule(row);
      const ep = db.prepare('SELECT * FROM ApiEndpoints WHERE Id = ?').get(row.ApiEndpointId) as any;
      if (ep) {
        sch.apiEndpoint = {
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
      return sch;
    });

    res.json(schedules);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM Schedules WHERE Id = ?').get(Number(req.params.id)) as any;
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(rowToSchedule(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const endpointId = Number(req.query.endpointId) || req.body.apiEndpointId;
    if (!endpointId) return res.status(400).json({ error: 'endpointId required' });

    const now = getNow();
    const intervalSeconds = req.body.intervalSeconds || 60;
    const nextRunAt = new Date(Date.now() + intervalSeconds * 1000)
      .toISOString().replace('T', ' ').substring(0, 19);

    const result = db.prepare(`
      INSERT INTO Schedules (ApiEndpointId, IsEnabled, IntervalSeconds, NextRunAt, CreatedAt, UpdatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(endpointId, req.body.isEnabled !== false ? 1 : 0, intervalSeconds, nextRunAt, now, now);

    const row = db.prepare('SELECT * FROM Schedules WHERE Id = ?').get(result.lastInsertRowid) as any;
    res.status(201).json(rowToSchedule(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const now = getNow();
    const existing = db.prepare('SELECT * FROM Schedules WHERE Id = ?').get(Number(req.params.id)) as any;
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const updates: string[] = [];
    const values: any[] = [];

    if (req.body.isEnabled !== undefined) {
      updates.push('IsEnabled = ?');
      values.push(req.body.isEnabled ? 1 : 0);
    }
    if (req.body.intervalSeconds !== undefined) {
      updates.push('IntervalSeconds = ?');
      values.push(req.body.intervalSeconds);
    }

    if (updates.length === 0) {
      const row = db.prepare('SELECT * FROM Schedules WHERE Id = ?').get(Number(req.params.id)) as any;
      return res.json(rowToSchedule(row));
    }

    updates.push('UpdatedAt = ?');
    values.push(now);
    values.push(Number(req.params.id));

    db.prepare(`UPDATE Schedules SET ${updates.join(', ')} WHERE Id = ?`).run(...values);

    const row = db.prepare('SELECT * FROM Schedules WHERE Id = ?').get(Number(req.params.id)) as any;
    res.json(rowToSchedule(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM Schedules WHERE Id = ?').run(Number(req.params.id));
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
