// Secure CORS middleware for Vercel Serverless Functions and Express server

export function handleCors(req: any, res: any): boolean {
  const origin = req.headers.origin || req.headers.Origin || '';

  // Determine allowed origins securely
  const envAllowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const appUrl = (process.env.APP_URL || '').trim();

  // Allow Capacitor Android native webview origins
  const isCapacitorOrigin =
    origin === 'capacitor://localhost' ||
    origin === 'http://localhost' ||
    origin === 'https://localhost';

  // Allow local development origins
  const isLocalDev =
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:');

  // Allow Vercel preview & production deployments
  const isVercelDomain =
    origin.endsWith('.vercel.app') ||
    (appUrl && origin === appUrl);

  const isExplicitlyAllowed = envAllowed.includes(origin);

  const isAllowed =
    !origin || // Non-browser / same-origin / server-to-server requests
    isCapacitorOrigin ||
    isLocalDev ||
    isVercelDomain ||
    isExplicitlyAllowed;

  if (origin && isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (!origin) {
    // If no origin header, allow same-origin
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, Accept, X-Requested-With, X-Client-Version'
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true; // Handled
  }

  return false; // Proceed to route handler
}
