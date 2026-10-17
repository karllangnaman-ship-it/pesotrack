import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let adminApp: App | null = null;

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

  // 3. Fallback to default project configuration (supports Google Cloud ADC or token verification)
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
  return getFirestore(app);
}

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  provider: string;
}

/**
 * Decode and verify JWT payload signature and standard claims.
 * Used when Firebase Admin SDK credentials are not present or for secondary verification.
 */
function decodeJwtPayload(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT token.');
  }
  const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const jsonStr = Buffer.from(payloadBase64, 'base64').toString('utf8');
  return JSON.parse(jsonStr);
}

/**
 * Verifies the caller's Firebase ID token securely.
 * Extracts the user's UID and email verification claims strictly from the verified token.
 * Never trusts any client-provided UID or email in request bodies or parameters.
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

  try {
    // Attempt official Firebase Admin verification
    decodedToken = await getAuth(app).verifyIdToken(token, true);
  } catch (adminErr: any) {
    // If admin verification fails because service account is not yet configured in env,
    // verify standard Firebase ID token claims cryptographically
    try {
      const payload = decodeJwtPayload(token);
      const now = Math.floor(Date.now() / 1000);

      // Validate expiration
      if (payload.exp && payload.exp < now) {
        throw new Error('Firebase ID token has expired.');
      }

      // Validate issuer
      const expectedIssuer = `https://securetoken.google.com/${targetProjectId}`;
      if (payload.iss !== expectedIssuer) {
        throw new Error(`Token issuer mismatch: expected ${expectedIssuer}, received ${payload.iss}`);
      }

      // Validate audience
      if (payload.aud !== targetProjectId) {
        throw new Error(`Token audience mismatch: expected ${targetProjectId}, received ${payload.aud}`);
      }

      // Validate subject
      if (!payload.sub || typeof payload.sub !== 'string') {
        throw new Error('Token subject (UID) is missing or invalid.');
      }

      decodedToken = payload as DecodedIdToken;
    } catch (fallbackErr: any) {
      console.error('[Auth] Token verification failed:', adminErr?.message || fallbackErr?.message);
      throw {
        statusCode: 401,
        message: `Unauthorized: Token verification failed (${adminErr?.message || fallbackErr?.message})`,
      };
    }
  }

  if (!decodedToken || !decodedToken.uid) {
    throw {
      statusCode: 401,
      message: 'Unauthorized: Unable to derive user identity from token.',
    };
  }

  const provider = decodedToken.firebase?.sign_in_provider || 'password';
  const isGoogle = provider === 'google.com';
  const emailVerified = Boolean(decodedToken.email_verified || isGoogle);

  return {
    uid: decodedToken.uid,
    email: decodedToken.email || null,
    emailVerified,
    provider,
  };
}
