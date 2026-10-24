import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Prevent unhandled errors from terminating dev server process
process.on('uncaughtException', (err: any) => {
  if (err?.code === 'EADDRINUSE' && err?.port === 24678) {
    return;
  }
  console.warn('[PesoTrack] Handled uncaught exception:', err?.message || err);
});

process.on('unhandledRejection', (reason: any) => {
  console.warn('[PesoTrack] Handled unhandled rejection:', reason?.message || reason);
});

// ---------------------------------------------------------------------------
// CONFIGURATION & ARGUMENT PARSING
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
function getCliArg(flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  const prefixMatch = args.find((a) => a.startsWith(`${flag}=`));
  if (prefixMatch) {
    return prefixMatch.split('=')[1];
  }
  return undefined;
}

const cliPort = getCliArg('--port') || process.env.npm_config_port;
const cliHost = getCliArg('--host') || process.env.npm_config_host;

// Port 3000 is required by the environment and reverse proxy.
// Note: In Cloud Run, process.env.PORT is 8080, but AI Studio's dev server
// reverse proxy specifically binds and maps to port 3000.
const PORT = cliPort ? parseInt(cliPort, 10) : 3000;
const HOST = cliHost || process.env.HOST || '0.0.0.0';
const IS_DEV = process.env.NODE_ENV !== 'production';

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// API ENDPOINTS (Unified with Vercel Serverless Functions)
// ---------------------------------------------------------------------------
import healthHandler from './api/health.ts';
import syncHandler from './api/sync.ts';
import restoreHandler from './api/restore.ts';
import authStatusHandler from './api/auth-status.ts';
import jointHandler from './api/joint.ts';

app.all('/api/health', (req: any, res: any) => healthHandler(req, res));
app.all('/api/sync', (req: any, res: any) => syncHandler(req, res));
app.all('/api/restore', (req: any, res: any) => restoreHandler(req, res));
app.all(['/api/auth/status', '/api/auth-status'], (req: any, res: any) => authStatusHandler(req, res));
app.all('/api/joint', (req: any, res: any) => jointHandler(req, res));

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
        ws: false,
        watch: {
          ignored: [
            '**/android/**',
            '**/dist/**',
            '**/.git/**',
            '**/.aistudio/**',
            '**/.tempmediaStorage/**',
          ],
        },
      },
      appType: 'spa',
    });

    if (vite.ws) {
      try {
        vite.ws.on('error', () => {
          // Ignore WebSocket errors as per environment constraints
        });
      } catch {}
    }

    app.use(vite.middlewares);

    // Fallback SPA HTML handler for client-side routing
    app.use('*', async (req: any, res: any, next: any) => {
      if (req.method !== 'GET') return next();
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({ ok: false, error: 'API endpoint not found' });
      }
      try {
        const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf-8');
        const transformedHtml = await vite.transformIndexHtml(req.originalUrl, indexHtml);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(transformedHtml);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve('dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: any, res: any, next: any) => {
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(404).json({ ok: false, error: 'API endpoint not found' });
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  function listenWithRetry(port: number, host: string, retries = 25, delayMs = 600) {
    let currentServer: any = null;
    try {
      currentServer = app.listen(port, host, () => {
        console.log(`[PesoTrack] Full-stack Server listening on port ${port} (dev: ${IS_DEV})`);
      });
    } catch (listenErr: any) {
      console.warn(`[PesoTrack] listen error on port ${port}:`, listenErr?.message);
    }

    if (!currentServer) return;

    currentServer.on('error', (err: any) => {
      if (err?.code === 'EADDRINUSE') {
        if (retries > 0) {
          console.warn(`[PesoTrack] Port ${port} in use, retrying in ${delayMs}ms... (${retries} retries left)`);
          setTimeout(() => {
            try {
              currentServer.close();
            } catch {}
            listenWithRetry(port, host, retries - 1, delayMs);
          }, delayMs);
        } else {
          console.warn(`[PesoTrack] Port ${port} currently held, scheduling persistent keep-alive retry in 3000ms...`);
          setTimeout(() => {
            listenWithRetry(port, host, 15, delayMs);
          }, 3000);
        }
      } else {
        console.error('[PesoTrack] Server error:', err);
      }
    });

    const onShutdown = () => {
      console.log('[PesoTrack] Shutting down server gracefully...');
      try {
        currentServer.close();
      } catch {}
      process.exit(0);
    };

    process.once('SIGTERM', onShutdown);
    process.once('SIGINT', onShutdown);

    return currentServer;
  }

  listenWithRetry(PORT, HOST);
}

startServer().catch((err) => {
  console.error('[PesoTrack] Failed to start server:', err);
});
