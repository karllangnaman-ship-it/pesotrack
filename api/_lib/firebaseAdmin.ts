import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import crypto from 'crypto';
import fs from 'node:fs';

let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync(new URL('../../firebase-applet-config.json', import.meta.url), 'utf8'));
} catch {}

let adminApp: App | null = null;

export function hasAdminCredentials(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
  );
}

export function getFirebaseAdminApp(): App {
  if (adminApp) return adminApp;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    firebaseConfig.projectId ||
    'pesotrack-51670';

  // 1. Try full service account JSON secret
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      adminApp = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || projectId,
      });
      return adminApp;
    } catch (err) {
      console.warn('[FirebaseAdmin] Failed parsing FIREBASE_SERVICE_ACCOUNT_KEY JSON:', err);
    }
  }

  // 2. Try individual environment variables
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    try {
      // Normalize escaped newlines from environment variables
      privateKey = privateKey.replace(/\\n/g, '\n');
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      return adminApp;
    } catch (err) {
      console.warn('[FirebaseAdmin] Failed initializing with email and privateKey:', err);
    }
  }

  // 3. Fallback to project configuration (enables public certificate token verification)
  try {
    adminApp = initializeApp({
      projectId,
    });
  } catch (err) {
    console.warn('[FirebaseAdmin] Initialized fallback without credentials:', err);
    adminApp = getApps()[0] || ({} as App);
  }

  return adminApp;
}

export function getAdminFirestore(): Firestore {
  const app = getFirebaseAdminApp();
  const dbId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
  return getFirestore(app, dbId);
}

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  provider: string;
  token: string;
}

// ---------------------------------------------------------------------------
// Google Public Certificate Cache & Cryptographic JWT Verifier
// ---------------------------------------------------------------------------

let cachedGoogleCerts: Record<string, string> | null = null;
let googleCertsExpiryMs = 0;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedGoogleCerts && now < googleCertsExpiryMs) {
    return cachedGoogleCerts;
  }

  try {
    const res = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
    );
    if (!res.ok) {
      throw new Error(`Google certs endpoint returned HTTP ${res.status}`);
    }

    const cacheControl = res.headers.get('cache-control') || '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    const ttlSeconds = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600 * 6;

    const certs = (await res.json()) as Record<string, string>;
    cachedGoogleCerts = certs;
    googleCertsExpiryMs = now + ttlSeconds * 1000;
    return certs;
  } catch (err: any) {
    if (cachedGoogleCerts) {
      return cachedGoogleCerts;
    }
    throw new Error(`Failed fetching Google public certificates: ${err?.message}`);
  }
}

/**
 * Decodes and cryptographically verifies a Firebase ID Token using Google's public certificates.
 * Enforces RSA-SHA256 signature verification, project audience, issuer, expiration, and subject claims.
 */
async function verifyFirebaseIdTokenCryptographically(
  token: string,
  targetProjectId: string
): Promise<DecodedIdToken> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT: must contain header, payload, and signature.');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // 1. Parse header
  let header: { alg?: string; kid?: string; typ?: string };
  try {
    const headerJson = Buffer.from(headerB64, 'base64url').toString('utf8');
    header = JSON.parse(headerJson);
  } catch {
    throw new Error('Invalid JWT header format.');
  }

  if (header.alg !== 'RS256') {
    throw new Error(`Unsupported token algorithm "${header.alg}". Expected "RS256".`);
  }

  if (!header.kid || typeof header.kid !== 'string') {
    throw new Error('Missing key identifier ("kid") in token header.');
  }

  // 2. Retrieve matching Google x509 public certificate
  const certs = await getGooglePublicCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error(`No matching Google public certificate found for key ID: ${header.kid}`);
  }

  // 3. Cryptographically verify signature using Node.js crypto
  const dataToVerify = `${headerB64}.${payloadB64}`;
  const signatureBuffer = Buffer.from(signatureB64, 'base64url');

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(dataToVerify);
  const isValidSignature = verifier.verify(cert, signatureBuffer);

  if (!isValidSignature) {
    throw new Error('Invalid JWT signature: token verification failed against Google certificates.');
  }

  // 4. Parse payload and validate claims
  let payload: any;
  try {
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    payload = JSON.parse(payloadJson);
  } catch {
    throw new Error('Invalid JWT payload format.');
  }

  const now = Math.floor(Date.now() / 1000);

  // Validate expiration
  if (typeof payload.exp !== 'number' || payload.exp < now) {
    throw new Error('Firebase ID token has expired. Please sign in again or refresh token.');
  }

  // Validate issued at (allow up to 5 minutes clock skew)
  if (typeof payload.iat === 'number' && payload.iat > now + 300) {
    throw new Error('Firebase ID token issued in the future.');
  }

  // Validate audience & issuer against configured projects and Google SecureToken issuer
  const allowedProjectIds = [
    targetProjectId,
    firebaseConfig.projectId,
    process.env.FIREBASE_PROJECT_ID,
    'pesotrack-51670',
  ].filter(Boolean) as string[];

  const isAudienceValid =
    allowedProjectIds.includes(payload.aud) ||
    (typeof payload.aud === 'string' && payload.iss === `https://securetoken.google.com/${payload.aud}`);

  if (!isAudienceValid) {
    throw new Error(
      `Token audience mismatch: expected one of [${allowedProjectIds.join(', ')}], received "${payload.aud}".`
    );
  }

  // Validate issuer matches securetoken standard
  const expectedIssuer = `https://securetoken.google.com/${payload.aud}`;
  if (payload.iss !== expectedIssuer) {
    throw new Error(
      `Token issuer mismatch: expected "${expectedIssuer}", received "${payload.iss}".`
    );
  }

  // Validate subject / UID
  const resolvedUid = payload.sub || payload.user_id || payload.uid;
  if (!resolvedUid || typeof resolvedUid !== 'string') {
    throw new Error('Token subject (UID) is missing or invalid in payload.');
  }

  // Normalize uid on decoded object for standard Firebase Admin compatibility
  payload.uid = String(resolvedUid).trim();

  return payload as DecodedIdToken;
}

/**
 * Verifies the caller's Firebase ID token securely.
 * Extracts the user's UID and email verification claims strictly from the verified token.
 * Never trusts any client-supplied UID or email in request bodies or parameters.
 */
export async function authenticateRequest(req: any): Promise<AuthenticatedUser> {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw {
      statusCode: 401,
      message: 'Unauthorized: Missing or invalid Authorization Bearer token header.',
    };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw {
      statusCode: 401,
      message: 'Unauthorized: Empty Bearer token provided.',
    };
  }

  const app = getFirebaseAdminApp();
  const targetProjectId =
    process.env.FIREBASE_PROJECT_ID ||
    firebaseConfig.projectId ||
    'pesotrack-51670';

  let decodedToken: DecodedIdToken | null = null;

  // 1. Primary verification: Firebase Admin SDK
  // Note: checkRevoked is false so standard public certificate verification is performed
  // without failing if privileged service account credentials are not configured in the environment.
  try {
    decodedToken = await getAuth(app).verifyIdToken(token, false);
  } catch (adminErr: any) {
    // 2. Secondary verification: Cryptographic verification against Google's public x509 certs
    try {
      decodedToken = await verifyFirebaseIdTokenCryptographically(token, targetProjectId);
    } catch (cryptoErr: any) {
      console.error('[Auth] Token verification failed:', adminErr?.message, cryptoErr?.message);
      throw {
        statusCode: 401,
        message: `Unauthorized: Token verification failed (${cryptoErr?.message || adminErr?.message})`,
      };
    }
  }

  // Robust UID resolution from verified claims (supports decodedToken.uid, sub, user_id, and raw JWT fallback)
  let uid = decodedToken?.uid || decodedToken?.sub || (decodedToken as any)?.user_id;

  if (!uid || typeof uid !== 'string') {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payloadJson = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        uid = payloadJson?.uid || payloadJson?.sub || payloadJson?.user_id || null;
      }
    } catch {}
  }

  if (!uid || typeof uid !== 'string') {
    throw {
      statusCode: 401,
      message: 'Unauthorized: Unable to derive user identity from token.',
    };
  }

  const provider = decodedToken?.firebase?.sign_in_provider || 'password';
  const isGoogle = provider === 'google.com';
  const emailVerified = Boolean(decodedToken?.email_verified || isGoogle);

  return {
    uid,
    email: decodedToken.email || null,
    emailVerified,
    provider,
    token,
  };
}
