import { Router } from 'express';
import db from '../db';
import type { DashboardStats } from '../types';

const router = Router();

router.get('/', (req, res) => {
  try {
    const totalEndpoints = (db.prepare('SELECT COUNT(*) as cnt FROM ApiEndpoints').get() as any).cnt;

    const passCount = (db.prepare(`
      SELECT COUNT(DISTINCT r.ApiEndpointId) as cnt
      FROM ApiResults r
      INNER JOIN (
        SELECT ApiEndpointId, MAX(ExecutedAt) as MaxDate
        FROM ApiResults GROUP BY ApiEndpointId
      ) latest ON r.ApiEndpointId = latest.ApiEndpointId AND r.ExecutedAt = latest.MaxDate
      WHERE r.IsSuccess = 1
    `).get() as any).cnt;

    const failCount = (db.prepare(`
      SELECT COUNT(DISTINCT r.ApiEndpointId) as cnt
      FROM ApiResults r
      INNER JOIN (
        SELECT ApiEndpointId, MAX(ExecutedAt) as MaxDate
        FROM ApiResults GROUP BY ApiEndpointId
      ) latest ON r.ApiEndpointId = latest.ApiEndpointId AND r.ExecutedAt = latest.MaxDate
      WHERE r.IsSuccess = 0
    `).get() as any).cnt;

    const avgLatency = (db.prepare('SELECT AVG(ResponseTimeMs) as avg FROM ApiResults').get() as any).avg;

    const stats: DashboardStats = {
      totalEndpoints,
      passCount,
      failCount,
      averageLatencyMs: avgLatency ? Math.round(avgLatency) : 0,
    };

    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
