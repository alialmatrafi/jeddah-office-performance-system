import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { getConfig } from './config.js';
import { authenticate } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';
import { auditLogsRouter } from './routes/audit-logs.js';
import { authRouter } from './routes/auth.js';
import { districtsRouter } from './routes/districts.js';
import { distributorsRouter } from './routes/distributors.js';
import { reportsRouter } from './routes/reports.js';
import { returnsRouter } from './routes/returns.js';
import { usersRouter } from './routes/users.js';
import { workRouter } from './routes/work.js';

export function createApp() {
  const config = getConfig();
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: '1mb' }));
  app.get('/health', (_request, response) => {
    response.json({ data: { status: 'ok' } });
  });
  app.use('/api/auth', authRouter);
  app.use('/api/users', authenticate, usersRouter);
  app.use('/api/distributors', authenticate, distributorsRouter);
  app.use('/api/districts', authenticate, districtsRouter);
  app.use('/api/work', authenticate, workRouter);
  app.use('/api/returns', authenticate, returnsRouter);
  app.use('/api/reports', authenticate, reportsRouter);
  app.use('/api/audit-logs', authenticate, auditLogsRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
