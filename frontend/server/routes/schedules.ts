import { Router } from 'express';
import db from '../db';
import type { Schedule } from '../types';

const router = Router();

function getNow(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z';
}

function rowToSchedule(row: any): Schedule {
  return {
    id: row.Id,
    collectionId: row.CollectionId,
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
    const collectionId = req.query.collectionId;
    let rows: any[];
    if (collectionId) {
      rows = db.prepare('SELECT * FROM Schedules WHERE CollectionId = ?').all(Number(collectionId));
    } else {
      rows = db.prepare('SELECT * FROM Schedules').all();
    }

    const schedules = rows.map(row => {
      const sch = rowToSchedule(row);
      const col = db.prepare('SELECT * FROM Collections WHERE Id = ?').get(row.CollectionId) as any;
      if (col) {
        sch.collection = {
          id: col.Id,
          name: col.Name,
          description: col.Description ?? null,
          createdAt: col.CreatedAt,
          updatedAt: col.UpdatedAt,
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
    const collectionId = Number(req.query.collectionId) || req.body.collectionId;
    if (!collectionId) return res.status(400).json({ error: 'collectionId required' });

    const existing = db.prepare('SELECT * FROM Schedules WHERE CollectionId = ?').get(collectionId) as any;
    if (existing) return res.status(409).json({ error: 'Schedule already exists for this collection' });

    const now = getNow();
    const intervalSeconds = req.body.intervalSeconds || 60;
    const nextRunAt = new Date(Date.now() + intervalSeconds * 1000)
      .toISOString().replace('T', ' ').substring(0, 19) + 'Z';

    const result = db.prepare(`
      INSERT INTO Schedules (CollectionId, IsEnabled, IntervalSeconds, NextRunAt, CreatedAt, UpdatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(collectionId, req.body.isEnabled !== false ? 1 : 0, intervalSeconds, nextRunAt, now, now);

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
