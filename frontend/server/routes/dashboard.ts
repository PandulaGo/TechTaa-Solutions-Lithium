import { Router } from 'express';
import db from '../db';
import { config } from '../config';
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

    const totalSchedules = (db.prepare('SELECT COUNT(*) as cnt FROM Schedules').get() as any).cnt;
    const totalValidationRules = (db.prepare('SELECT COUNT(*) as cnt FROM ValidationRules').get() as any).cnt;

    const stats: DashboardStats = {
      totalEndpoints,
      passCount,
      failCount,
      averageLatencyMs: avgLatency ? Math.round(avgLatency) : 0,
      totalSchedules,
      totalValidationRules,
    };

    const recentCollections = db.prepare(`
      SELECT 
        c.Id as collectionId,
        c.Name as collectionName,
        COUNT(DISTINCT e.Id) as endpointCount,
        SUM(CASE WHEN r.IsSuccess = 1 THEN 1 ELSE 0 END) as passCount,
        SUM(CASE WHEN r.IsSuccess = 0 THEN 1 ELSE 0 END) as failCount,
        ROUND(AVG(r.ResponseTimeMs)) as averageLatencyMs,
        MAX(r.ExecutedAt) as lastRunAt
      FROM Collections c
      INNER JOIN ApiEndpoints e ON e.CollectionId = c.Id
      INNER JOIN ApiResults r ON r.ApiEndpointId = e.Id
      INNER JOIN (
        SELECT ApiEndpointId, MAX(ExecutedAt) as MaxDate
        FROM ApiResults
        GROUP BY ApiEndpointId
      ) latest ON r.ApiEndpointId = latest.ApiEndpointId AND r.ExecutedAt = latest.MaxDate
      GROUP BY c.Id
      ORDER BY lastRunAt DESC
      LIMIT ${config.Dashboard.RecentCollectionsLimit}
    `).all();

    const recentEndpoints = db.prepare(`
      SELECT 
        e.Id as id,
        e.Name as name,
        e.Method as method,
        COALESCE(r.RequestUrl, e.Url) as url,
        r.StatusCode as statusCode,
        r.ResponseTimeMs as responseTimeMs,
        r.IsSuccess as isSuccess,
        r.ExecutedAt as executedAt
      FROM ApiEndpoints e
      INNER JOIN ApiResults r ON r.ApiEndpointId = e.Id
      INNER JOIN (
        SELECT ApiEndpointId, MAX(ExecutedAt) as MaxDate
        FROM ApiResults
        GROUP BY ApiEndpointId
      ) latest ON r.ApiEndpointId = latest.ApiEndpointId AND r.ExecutedAt = latest.MaxDate
      ORDER BY r.ExecutedAt DESC
      LIMIT ${config.Dashboard.RecentEndpointsLimit}
    `).all();

    res.json({
      ...stats,
      recentCollections,
      recentEndpoints,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
