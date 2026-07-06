/**
 * Express application factory. Kept separate from the server bootstrap so it
 * can be imported directly in tests without opening a port.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import config from './config.js';
import assistantRoutes from './routes/assistant.js';
import operationsRoutes from './routes/operations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // Security headers. A CSP that permits the self-hosted, dependency-free UI.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );

  const corsOrigin = config.cors.origin.includes('*') ? '*' : config.cors.origin;
  app.use(cors({ origin: corsOrigin }));

  // Cap body size to reduce abuse surface.
  app.use(express.json({ limit: '16kb' }));

  // Rate limit the API surface.
  app.use(
    '/api',
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests. Please slow down.' },
    }),
  );

  // Health check.
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      llm: config.llm.enabled ? 'live' : 'grounded',
      time: new Date().toISOString(),
    });
  });

  app.use('/api', assistantRoutes);
  app.use('/api', operationsRoutes);

  // Static, accessible front-end.
  app.use(express.static(join(__dirname, '..', 'public')));

  // 404 for unknown API routes.
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  // Centralised error handler: never leak internals to the client.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    if (config.env !== 'test') {
      console.error('[error]', err.message);
    }
    res.status(status).json({ error: 'An unexpected error occurred.' });
  });

  return app;
}

export default createApp;
