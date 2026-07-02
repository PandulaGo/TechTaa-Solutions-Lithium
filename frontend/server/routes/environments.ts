import { Router } from 'express';
import db from '../db';
import type { Environment, EnvironmentVariable } from '../types';

const router = Router();

function getNow(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function rowToEnvironment(row: any): Environment {
  return {
    id: row.Id,
    name: row.Name,
    description: row.Description ?? null,
    isDefault: !!row.IsDefault,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

function rowToVariable(row: any): EnvironmentVariable {
  return {
    id: row.Id,
    environmentId: row.EnvironmentId,
    key: row.Key,
    value: row.Value,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM Environments ORDER BY IsDefault DESC, Name').all() as any[];
    res.json(rows.map(rowToEnvironment));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM Environments WHERE Id = ?').get(Number(req.params.id)) as any;
    if (!row) return res.status(404).json({ error: 'Not found' });

    const env = rowToEnvironment(row);
    const varRows = db.prepare('SELECT * FROM EnvironmentVariables WHERE EnvironmentId = ? ORDER BY Key').all(Number(req.params.id)) as any[];
    env.variables = varRows.map(rowToVariable);

    res.json(env);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const now = getNow();
    const isDefault = req.body.isDefault ? 1 : 0;

    if (isDefault) {
      db.prepare('UPDATE Environments SET IsDefault = 0').run();
    }

    const result = db.prepare('INSERT INTO Environments (Name, Description, IsDefault, CreatedAt, UpdatedAt) VALUES (?, ?, ?, ?, ?)')
      .run(req.body.name, req.body.description ?? null, isDefault, now, now);

    const row = db.prepare('SELECT * FROM Environments WHERE Id = ?').get(result.lastInsertRowid) as any;
    res.status(201).json(rowToEnvironment(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const now = getNow();
    const existing = db.prepare('SELECT * FROM Environments WHERE Id = ?').get(Number(req.params.id)) as any;
    if (!existing) return res.status(404).json({ error: 'Not found' });

    if (req.body.isDefault) {
      db.prepare('UPDATE Environments SET IsDefault = 0').run();
    }

    db.prepare('UPDATE Environments SET Name=?, Description=?, IsDefault=?, UpdatedAt=? WHERE Id=?')
      .run(
        req.body.name ?? existing.Name,
        req.body.description ?? existing.Description,
        req.body.isDefault !== undefined ? (req.body.isDefault ? 1 : 0) : existing.IsDefault,
        now,
        Number(req.params.id)
      );

    const row = db.prepare('SELECT * FROM Environments WHERE Id = ?').get(Number(req.params.id)) as any;
    res.json(rowToEnvironment(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM Environments WHERE Id = ?').run(Number(req.params.id));
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/variables', (req, res) => {
  try {
    const env = db.prepare('SELECT * FROM Environments WHERE Id = ?').get(Number(req.params.id)) as any;
    if (!env) return res.status(404).json({ error: 'Environment not found' });

    const rows = db.prepare('SELECT * FROM EnvironmentVariables WHERE EnvironmentId = ? ORDER BY Key').all(Number(req.params.id)) as any[];
    res.json(rows.map(rowToVariable));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/variables', (req, res) => {
  try {
    const env = db.prepare('SELECT * FROM Environments WHERE Id = ?').get(Number(req.params.id)) as any;
    if (!env) return res.status(404).json({ error: 'Environment not found' });

    const now = getNow();
    const result = db.prepare('INSERT INTO EnvironmentVariables (EnvironmentId, Key, Value, CreatedAt, UpdatedAt) VALUES (?, ?, ?, ?, ?)')
      .run(Number(req.params.id), req.body.key, req.body.value, now, now);

    const row = db.prepare('SELECT * FROM EnvironmentVariables WHERE Id = ?').get(result.lastInsertRowid) as any;
    res.status(201).json(rowToVariable(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/variables/:varId', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM EnvironmentVariables WHERE Id = ? AND EnvironmentId = ?')
      .get(Number(req.params.varId), Number(req.params.id)) as any;
    if (!existing) return res.status(404).json({ error: 'Variable not found' });

    const now = getNow();
    db.prepare('UPDATE EnvironmentVariables SET Key=?, Value=?, UpdatedAt=? WHERE Id=?')
      .run(
        req.body.key ?? existing.Key,
        req.body.value ?? existing.Value,
        now,
        Number(req.params.varId)
      );

    const row = db.prepare('SELECT * FROM EnvironmentVariables WHERE Id = ?').get(Number(req.params.varId)) as any;
    res.json(rowToVariable(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/variables/:varId', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM EnvironmentVariables WHERE Id = ? AND EnvironmentId = ?')
      .run(Number(req.params.varId), Number(req.params.id));
    if (result.changes === 0) return res.status(404).json({ error: 'Variable not found' });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/set-default', (req, res) => {
  try {
    const env = db.prepare('SELECT * FROM Environments WHERE Id = ?').get(Number(req.params.id)) as any;
    if (!env) return res.status(404).json({ error: 'Not found' });

    const now = getNow();
    db.prepare('UPDATE Environments SET IsDefault = 0').run();
    db.prepare('UPDATE Environments SET IsDefault = 1, UpdatedAt = ? WHERE Id = ?').run(now, Number(req.params.id));

    const row = db.prepare('SELECT * FROM Environments WHERE Id = ?').get(Number(req.params.id)) as any;
    res.json(rowToEnvironment(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
