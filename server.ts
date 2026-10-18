import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const IS_DEV = process.env.NODE_ENV !== 'production';

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
        host: '0.0.0.0',
        port: PORT,
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PesoTrack] Full-stack Server listening on port ${PORT} (dev: ${IS_DEV})`);
  });
}

startServer().catch((err) => {
  console.error('[PesoTrack] Failed to start server:', err);
  process.exit(1);
});
