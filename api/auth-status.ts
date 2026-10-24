import { handleCors } from './_lib/cors.ts';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  return res.status(200).json({
    ok: true,
    emailVerificationMode: 'firebase-link',
    twoWaySyncEnabled: true,
    backend: 'vercel-serverless',
    timestamp: new Date().toISOString(),
  });
}
