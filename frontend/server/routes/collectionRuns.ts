import { Router } from 'express';
import db from '../db';
import type { CollectionRun, CollectionRunResult } from '../types';

const router = Router();

router.get('/', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT * FROM CollectionRuns ORDER BY StartedAt DESC LIMIT 10
    `).all() as any[];

    const runs: CollectionRun[] = rows.map(r => ({
      id: r.Id,
      collectionId: r.CollectionId ?? null,
      collectionName: r.CollectionName,
      status: r.Status,
      totalEndpoints: r.TotalEndpoints,
      completedCount: r.CompletedCount,
      successCount: r.SuccessCount,
      failCount: r.FailCount,
      isAdHoc: !!r.IsAdHoc,
      startedAt: r.StartedAt,
      completedAt: r.CompletedAt ?? null,
    }));

    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const run = db.prepare('SELECT * FROM CollectionRuns WHERE Id = ?').get(Number(req.params.id)) as any;
    if (!run) return res.status(404).json({ error: 'Not found' });

    const resultRows = db.prepare('SELECT * FROM CollectionRunResults WHERE CollectionRunId = ? ORDER BY Id').all(run.Id) as any[];

    const runData: CollectionRun = {
      id: run.Id,
      collectionId: run.CollectionId ?? null,
      collectionName: run.CollectionName,
      status: run.Status,
      totalEndpoints: run.TotalEndpoints,
      completedCount: run.CompletedCount,
      successCount: run.SuccessCount,
      failCount: run.FailCount,
      isAdHoc: !!run.IsAdHoc,
      startedAt: run.StartedAt,
      completedAt: run.CompletedAt ?? null,
      results: resultRows.map(r => ({
        id: r.Id,
        collectionRunId: r.CollectionRunId,
        apiEndpointId: r.ApiEndpointId,
        endpointName: r.EndpointName,
        statusCode: r.StatusCode,
        responseTimeMs: r.ResponseTimeMs,
        isSuccess: !!r.IsSuccess,
        errorMessage: r.ErrorMessage ?? null,
        status: r.Status,
        executedAt: r.ExecutedAt ?? null,
      })),
    };

    res.json(runData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/export-responses', (req, res) => {
  try {
    const runId = Number(req.params.id);

    const rows = db.prepare(`
      SELECT ar.ResponseBody
      FROM CollectionRunResults cr
      INNER JOIN ApiResults ar ON ar.ApiEndpointId = cr.ApiEndpointId AND ar.ExecutedAt = cr.ExecutedAt
      WHERE cr.CollectionRunId = ? AND cr.IsSuccess = 1 AND ar.ResponseBody IS NOT NULL
      ORDER BY cr.Id
    `).all(runId) as any[];

    const bodies = rows.map(r => {
      if (!r.ResponseBody) return null;
      try { return JSON.parse(r.ResponseBody); } catch { return r.ResponseBody; }
    }).filter(Boolean);

    res.setHeader('Content-Disposition', `attachment; filename="collection-run-${runId}-responses.json"`);
    res.json(bodies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
