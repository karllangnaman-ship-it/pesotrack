import { handleCors } from './_lib/cors.ts';
import fs from 'node:fs';

let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));
} catch {}

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({
      ok: false,
      error: 'Method Not Allowed. Use GET for health checks.',
    });
  }

  const hasServiceAccount = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
  );

  return res.status(200).json({
    ok: true,
    status: 'healthy',
    service: 'PesoTrack Online Backend',
    mode: 'online-only',
    timestamp: new Date().toISOString(),
    projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId || 'ai-studio-applet-webapp-bd7cc',
    adminConfigured: hasServiceAccount,
    features: {
      healthCheck: true,
      tokenVerification: true,
      cloudSync: true,
      cloudRestore: true,
    },
  });
}
