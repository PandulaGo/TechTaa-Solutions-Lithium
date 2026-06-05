import { Router } from 'express';
import db from '../db';
import type { ValidationRule } from '../types';

const router = Router();

function rowToRule(row: any): ValidationRule {
  return {
    id: row.Id,
    apiEndpointId: row.ApiEndpointId,
    ruleType: row.RuleType,
    expectedValue: row.ExpectedValue,
    comparisonType: row.ComparisonType,
    isEnabled: !!row.IsEnabled,
    order: row.Order,
  };
}

router.get('/', (req, res) => {
  try {
    const endpointId = req.query.endpointId;
    let rows: any[];
    if (endpointId) {
      rows = db.prepare('SELECT * FROM ValidationRules WHERE ApiEndpointId = ? ORDER BY "Order"').all(Number(endpointId));
    } else {
      rows = db.prepare('SELECT * FROM ValidationRules ORDER BY "Order"').all();
    }
    res.json(rows.map(rowToRule));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM ValidationRules WHERE Id = ?').get(Number(req.params.id)) as any;
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(rowToRule(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const endpointId = Number(req.query.endpointId) || req.body.apiEndpointId;
    if (!endpointId) return res.status(400).json({ error: 'endpointId required' });

    const result = db.prepare(`
      INSERT INTO ValidationRules (ApiEndpointId, RuleType, ExpectedValue, ComparisonType, IsEnabled, "Order")
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      endpointId,
      req.body.ruleType || 'StatusCode',
      req.body.expectedValue || '200',
      req.body.comparisonType || 'Equals',
      req.body.isEnabled !== false ? 1 : 0,
      req.body.order ?? 0
    );

    const row = db.prepare('SELECT * FROM ValidationRules WHERE Id = ?').get(result.lastInsertRowid) as any;
    res.status(201).json(rowToRule(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM ValidationRules WHERE Id = ?').get(Number(req.params.id)) as any;
    if (!existing) return res.status(404).json({ error: 'Not found' });

    db.prepare(`
      UPDATE ValidationRules SET RuleType=?, ExpectedValue=?, ComparisonType=?, IsEnabled=?, "Order"=?
      WHERE Id=?
    `).run(
      req.body.ruleType ?? existing.RuleType,
      req.body.expectedValue ?? existing.ExpectedValue,
      req.body.comparisonType ?? existing.ComparisonType,
      req.body.isEnabled !== undefined ? (req.body.isEnabled ? 1 : 0) : existing.IsEnabled,
      req.body.order ?? existing.Order,
      Number(req.params.id)
    );

    const row = db.prepare('SELECT * FROM ValidationRules WHERE Id = ?').get(Number(req.params.id)) as any;
    res.json(rowToRule(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM ValidationRules WHERE Id = ?').run(Number(req.params.id));
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
