import { join } from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { getConfig } from './config.js';
import { authenticate } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';
import { resolveWebRoot } from './lib/web-root.js';
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
  // Render terminates TLS in front of the service, so the client IP and
  // protocol must be read from the forwarding headers.
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors((request, callback) => {
      const requestOrigin = request.headers.origin;
      let allowed = !requestOrigin;
      if (requestOrigin) {
        if (config.clientOrigins.includes('*') || config.clientOrigins.includes(requestOrigin)) {
          allowed = true;
        } else {
          // Requests served by this process need no CORS grant, but reflecting
          // the origin keeps browsers and proxies from rejecting the response.
          try {
            allowed = new URL(requestOrigin).host === request.headers.host;
          } catch {
            allowed = false;
          }
        }
      }
      callback(null, { origin: allowed, credentials: true });
    }),
  );
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

  // The web client is served from the same origin in production, so the browser
  // never makes a cross-origin request and no build-time API URL is needed.
  const webRoot = config.serveWeb ? resolveWebRoot() : null;
  if (webRoot) {
    app.use(
      express.static(webRoot, {
        index: false,
        setHeaders(response, filePath) {
          if (filePath.endsWith('index.html')) {
            response.setHeader('Cache-Control', 'no-cache');
          } else if (/[\\/]assets[\\/]/.test(filePath)) {
            response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );
    // Express 5 dropped the bare "*" pattern, so client routes use a RegExp.
    app.get(/^(?!\/(api|health)(\/|$)).*/, (_request, response) => {
      response.setHeader('Cache-Control', 'no-cache');
      response.sendFile(join(webRoot, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
