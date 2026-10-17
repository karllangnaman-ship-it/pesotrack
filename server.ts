import express from 'express';
import { createServer as createHttpServer } from 'http';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createHttpServer(app);
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
        // Share Express's HTTP server so Vite does not open a second HMR port.
        ws: { server: httpServer },
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

  const listen = (port: number): Promise<number> => new Promise((resolve, reject) => {
    const cleanup = () => {
      httpServer.off('error', onError);
      httpServer.off('listening', onListening);
    };

    const onError = (error: NodeJS.ErrnoException) => {
      cleanup();
      if (error.code === 'EADDRINUSE' && port < PORT + 10) {
        console.warn(`[PesoTrack] Port ${port} is in use; trying ${port + 1}.`);
        listen(port + 1).then(resolve, reject);
        return;
      }
      reject(error);
    };

    const onListening = () => {
      cleanup();
      resolve(port);
    };

    httpServer.once('error', onError);
    httpServer.once('listening', onListening);
    httpServer.listen(port, '0.0.0.0');
  });

  const activePort = await listen(PORT);
  console.log(`[PesoTrack] Full-stack Server listening on port ${activePort} (dev: ${IS_DEV})`);
}

startServer().catch((err) => {
  console.error('[PesoTrack] Failed to start server:', err);
  process.exit(1);
});
