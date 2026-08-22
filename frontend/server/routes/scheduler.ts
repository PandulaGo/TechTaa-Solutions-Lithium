import { Router } from 'express';
import { startScheduler, stopScheduler, getSchedulerRunning } from '../services/scheduleRunner';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({ running: getSchedulerRunning() });
});

router.post('/start', (_req, res) => {
  startScheduler();
  res.json({ running: true });
});

router.post('/stop', (_req, res) => {
  stopScheduler();
  res.json({ running: false });
});

export default router;
