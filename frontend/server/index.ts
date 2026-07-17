import express from 'express';
import cors from 'cors';
import endpointsRouter from './routes/endpoints';
import collectionsRouter from './routes/collections';
import schedulesRouter from './routes/schedules';
import validationRulesRouter from './routes/validationRules';
import resultsRouter from './routes/results';
import dashboardRouter from './routes/dashboard';
import environmentsRouter from './routes/environments';
import collectionRunsRouter from './routes/collectionRuns';
import { startScheduler } from './services/scheduleRunner';

const app = express();
const PORT = 10021;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/endpoints', endpointsRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/validation-rules', validationRulesRouter);
app.use('/api/results', resultsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/environments', environmentsRouter);
app.use('/api/collection-runs', collectionRunsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Lithium API server running on http://localhost:${PORT}`);
  startScheduler();
});
