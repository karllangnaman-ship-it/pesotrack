import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const IS_DEV = process.env.NODE_ENV !== 'production';

function getPort(): number {
  // 1. Check CLI argument e.g. --port 3000
  const portIndex = process.argv.indexOf('--port');
  if (portIndex !== -1 && process.argv[portIndex + 1]) {
    const parsed = Number(process.argv[portIndex + 1]);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // 2. In development or preview on AI Studio, dev server MUST strictly bind to port 3000
  // Note: process.env.PORT is often 8080 in Cloud Run containers, which causes EADDRINUSE
  if (IS_DEV) {
    return 3000;
  }

  // 3. In production, check process.env.PORT, otherwise default to 3000
  if (process.env.PORT) {
    const envPort = Number(process.env.PORT);
    if (!isNaN(envPort) && envPort > 0) return envPort;
  }

  return 3000;
}

function getHost(): string {
  const hostIndex = process.argv.indexOf('--host');
  if (hostIndex !== -1 && process.argv[hostIndex + 1]) {
    return process.argv[hostIndex + 1];
  }
  return '0.0.0.0';
}

const PORT = getPort();
const HOST = getHost();

app.use(express.json());

// ---------------------------------------------------------------------------
// API ENDPOINTS (Unified with Vercel Serverless Functions)
// ---------------------------------------------------------------------------
import healthHandler from './api/health.ts';
import syncHandler from './api/sync.ts';
import restoreHandler from './api/restore.ts';
import authStatusHandler from './api/auth-status.ts';

app.all('/api/health', (req, res) => healthHandler(req, res));
app.all('/api/sync', (req, res) => syncHandler(req, res));
app.all('/api/restore', (req, res) => restoreHandler(req, res));
app.all(['/api/auth/status', '/api/auth-status'], (req, res) => authStatusHandler(req, res));

// ---------------------------------------------------------------------------
// VITE INTEGRATION
// ---------------------------------------------------------------------------
async function startServer() {
  if (IS_DEV) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: HOST,
        port: PORT,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, HOST, () => {
    console.log(`[PesoTrack] Full-stack Server listening on http://${HOST}:${PORT} (dev: ${IS_DEV})`);
  });
}

startServer().catch((err) => {
  console.error('[PesoTrack] Failed to start server:', err);
  process.exit(1);
});
