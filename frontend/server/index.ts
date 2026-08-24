import express from 'express';
import cors from 'cors';
import { config } from './config';
import endpointsRouter from './routes/endpoints';
import collectionsRouter from './routes/collections';
import schedulesRouter from './routes/schedules';
import validationRulesRouter from './routes/validationRules';
import resultsRouter from './routes/results';
import dashboardRouter from './routes/dashboard';
import environmentsRouter from './routes/environments';
import collectionRunsRouter from './routes/collectionRuns';
import schedulerRouter from './routes/scheduler';
import { startScheduler } from './services/scheduleRunner';

const app = express();

app.use(cors({ origin: config.Server.CorsOrigins }));
app.use(express.json({ limit: `${config.Server.JsonBodyLimitMb}mb` }));

app.use('/api/endpoints', endpointsRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/validation-rules', validationRulesRouter);
app.use('/api/results', resultsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/environments', environmentsRouter);
app.use('/api/collection-runs', collectionRunsRouter);
app.use('/api/scheduler', schedulerRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(config.Server.Port, config.Server.Host, () => {
  console.log(`Lithium API server running on http://${config.Server.Host}:${config.Server.Port}`);
});

if (config.Scheduler.AutoStart) {
  startScheduler();
}
