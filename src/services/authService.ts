import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  Unsubscribe,
} from 'firebase/auth';
import { auth } from './firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
}

export function formatAuthError(err: unknown): string {
  if (!err || typeof err !== 'object') return 'An unexpected error occurred.';
  const code = (err as { code?: string }).code || '';
  const message = (err as { message?: string }).message || '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Incorrect email or password. Please try again.';
    case 'auth/user-not-found':
      return 'No account registered with this email address.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection or continue using PesoTrack offline.';
    case 'auth/operation-not-allowed':
      return 'Email/Password provider is not yet enabled in Firebase Console. Please go to Firebase Console -> Authentication -> Sign-in method and enable Email/Password.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again in a few minutes or reset your password.';
    default:
      return message || 'Authentication failed. Please try again.';
  }
}

/**
 * Register user with Email and Password and immediately dispatch a Firebase email verification link.
 */
export async function registerWithEmailPassword(
  email: string,
  pass: string,
  displayName?: string
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName && displayName.trim()) {
    try {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    } catch (e) {
      console.warn('Could not update display name:', e);
    }
  }

  // Send the official Firebase email verification link
  try {
    await sendEmailVerification(cred.user);
  } catch (e) {
    console.warn('Could not send initial verification email link:', e);
  }

  return cred.user;
}

/**
 * Sign in user with Email and Password and reload auth state to check latest emailVerified status.
 */
export async function loginWithEmailPassword(
  email: string,
  pass: string
): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  try {
    await cred.user.reload();
    if (cred.user.emailVerified) {
      await cred.user.getIdToken(true);
    }
  } catch (err) {
    console.warn('[Auth] User reload failed after sign-in:', err);
  }
  return cred.user;
}

export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Resend the Firebase verification email link to the current or specified user.
 */
export async function sendVerificationLink(targetUser?: User | null): Promise<void> {
  const userToSend = targetUser || auth.currentUser;
  if (!userToSend) {
    throw new Error('No active user to send verification email to.');
  }
  await sendEmailVerification(userToSend);
}

/**
 * Reload the current Firebase user and check if their email has been verified via the clickable link.
 * Forces ID token refresh so Firestore Security Rules immediately receive email_verified: true.
 */
export async function reloadCurrentUser(targetUser?: User | null): Promise<{
  user: User | null;
  emailVerified: boolean;
}> {
  const user = targetUser || auth.currentUser;
  if (!user) return { user: null, emailVerified: false };
  try {
    await user.reload();
    const active = auth.currentUser || user;
    if (active.emailVerified) {
      await active.getIdToken(true);
    }
    return {
      user: active,
      emailVerified: Boolean(active.emailVerified),
    };
  } catch (e) {
    console.warn('Failed reloading user state:', e);
    return {
      user,
      emailVerified: Boolean(user.emailVerified),
    };
  }
}

// ---------------------------------------------------------------------------
// Secure Local Session Policy for Previously Verified Offline Access
// ---------------------------------------------------------------------------

export interface VerifiedSessionRecord {
  uid: string;
  email: string;
  verifiedAt: string;
  lastActiveAt: string;
}

const VERIFIED_SESSION_PREFIX = 'pesotrack_verified_session_';
const LAST_VERIFIED_UID_KEY = 'pesotrack_last_verified_uid';

export function saveVerifiedSession(user: { uid: string; email: string | null }): void {
  try {
    const key = `${VERIFIED_SESSION_PREFIX}${user.uid}`;
    const session: VerifiedSessionRecord = {
      uid: user.uid,
      email: user.email || '',
      verifiedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem(LAST_VERIFIED_UID_KEY, user.uid);
  } catch (e) {
    console.error('Failed to save verified session:', e);
  }
}

export function getVerifiedSession(uid: string): VerifiedSessionRecord | null {
  try {
    const raw = localStorage.getItem(`${VERIFIED_SESSION_PREFIX}${uid}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getLastVerifiedUid(): string | null {
  try {
    return localStorage.getItem(LAST_VERIFIED_UID_KEY);
  } catch {
    return null;
  }
}

export function clearVerifiedSession(uid: string): void {
  try {
    localStorage.removeItem(`${VERIFIED_SESSION_PREFIX}${uid}`);
    if (localStorage.getItem(LAST_VERIFIED_UID_KEY) === uid) {
      localStorage.removeItem(LAST_VERIFIED_UID_KEY);
    }
  } catch {}
}

export function isUserVerifiedOnThisDevice(uid?: string | null): boolean {
  if (!uid) return false;
  const session = getVerifiedSession(uid);
  return Boolean(session && session.uid === uid);
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuth(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}
