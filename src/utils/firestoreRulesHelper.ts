import firebaseConfig from '../../firebase-applet-config.json';

export const CURRENT_FIREBASE_PROJECT_ID =
  firebaseConfig.projectId || 'pesotrack-51670';

export const FIRESTORE_RULES_SOURCE = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Helper Functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isVerifiedUser() {
      return isSignedIn() && (
        request.auth.token.email_verified == true ||
        request.auth.token.firebase.sign_in_provider == 'google.com'
      );
    }

    function isVerifiedOwner(userId) {
      return isOwner(userId) && isVerifiedUser();
    }

    // Default-deny catch-all for any document outside /users
    match /{document=**} {
      allow read, write: if false;
    }

    // Isolated Per-User Workspace Scope
    // Only the authenticated and email-verified owner can read and write to their own workspace documents
    match /users/{userId} {
      allow read, write: if isVerifiedOwner(userId);

      // Financial Accounts Subcollection
      match /accounts/{accountId} {
        allow read, write: if isVerifiedOwner(userId);
      }

      // Transactions Subcollection
      match /transactions/{transactionId} {
        allow read, write: if isVerifiedOwner(userId);
      }

      // Bill Definitions Subcollection
      match /bills/{billId} {
        allow read, write: if isVerifiedOwner(userId);
      }

      // Monthly Bill Entries Subcollection
      match /monthlyBillEntries/{entryId} {
        allow read, write: if isVerifiedOwner(userId);
      }

      // Receivables Subcollection
      match /receivables/{receivableId} {
        allow read, write: if isVerifiedOwner(userId);
      }

      // Monthly Budgets Subcollection
      match /budgets/{budgetId} {
        allow read, write: if isVerifiedOwner(userId);
      }

      // Sync State & Health Check Subcollections
      match /sync/{syncId} {
        allow read, write: if isVerifiedOwner(userId);
      }

      match /sync_state/{syncId} {
        allow read, write: if isVerifiedOwner(userId);
      }

      // User-scoped catch-all for any nested subcollections
      match /{allSubcollections=**} {
        allow read, write: if isVerifiedOwner(userId);
      }
    }
  }
}`;

export function getFirebaseConsoleRulesUrl(
  projectId: string = CURRENT_FIREBASE_PROJECT_ID
): string {
  return `https://console.firebase.google.com/project/${projectId}/firestore/rules`;
}

export interface ParsedSyncError {
  isPermissionDenied: boolean;
  isOffline: boolean;
  isUnauthenticated: boolean;
  isEmailUnverified: boolean;
  title: string;
  description: string;
  detailedMessage: string;
  suggestedAction: string;
  canCopyRules: boolean;
}

export function parseSyncError(error: any): ParsedSyncError {
  const errMsg = error?.message || (typeof error === 'string' ? error : '') || '';
  const errCode = error?.code || '';
  const errDetail = error?.detail || '';
  const lowerMsg = `${errMsg} ${errCode} ${errDetail}`.toLowerCase();

  const isEmailUnverified =
    lowerMsg.includes('email_unverified') ||
    lowerMsg.includes('email verification required') ||
    lowerMsg.includes('unverified email');

  if (isEmailUnverified) {
    const desc =
      'Your account email has not been verified yet. Check your inbox for the verification link.';
    return {
      isPermissionDenied: false,
      isOffline: false,
      isUnauthenticated: false,
      isEmailUnverified: true,
      title: 'Email Verification Required',
      description: desc,
      detailedMessage: desc,
      suggestedAction:
        'Click the verification link sent to your email, then tap Refresh Verification Status.',
      canCopyRules: false,
    };
  }

  const isOffline =
    lowerMsg.includes('offline') ||
    lowerMsg.includes('network') ||
    lowerMsg.includes('failed to get document because the client is offline') ||
    lowerMsg.includes('unavailable') ||
    (typeof navigator !== 'undefined' && !navigator.onLine);

  if (isOffline) {
    const desc =
      'Changes are being queued locally. Two-way sync will resume once an active connection returns.';
    return {
      isPermissionDenied: false,
      isOffline: true,
      isUnauthenticated: false,
      isEmailUnverified: false,
      title: 'Operating Offline',
      description: desc,
      detailedMessage: desc,
      suggestedAction: 'No action needed — your offline data is safe.',
      canCopyRules: false,
    };
  }

  const isUnauthenticated =
    lowerMsg.includes('unauthenticated') ||
    lowerMsg.includes('please sign in') ||
    lowerMsg.includes('no active user');

  if (isUnauthenticated) {
    const desc =
      'You must be signed in to sync your financial data to the cloud vault.';
    return {
      isPermissionDenied: false,
      isOffline: false,
      isUnauthenticated: true,
      isEmailUnverified: false,
      title: 'Sign In Required',
      description: desc,
      detailedMessage: desc,
      suggestedAction: 'Log in to your PesoTrack account.',
      canCopyRules: false,
    };
  }

  const isPermissionDenied =
    errCode === 'permission-denied' ||
    lowerMsg.includes('permission-denied') ||
    lowerMsg.includes('missing or insufficient permissions') ||
    lowerMsg.includes('rejected database operations');

  if (isPermissionDenied) {
    const desc = `Project "${CURRENT_FIREBASE_PROJECT_ID}" rejected the database operation. The isolated user security rules must be published in Firebase Console.`;
    return {
      isPermissionDenied: true,
      isOffline: false,
      isUnauthenticated: false,
      isEmailUnverified: false,
      title: 'Firestore Rules Not Published',
      description: desc,
      detailedMessage: desc,
      suggestedAction:
        'Copy the security rules below and publish them in your Firebase Console.',
      canCopyRules: true,
    };
  }

  const desc = errMsg || 'An unexpected error occurred during cloud synchronization.';
  return {
    isPermissionDenied: false,
    isOffline: false,
    isUnauthenticated: false,
    isEmailUnverified: false,
    title: 'Sync Interrupted',
    description: desc,
    detailedMessage: desc,
    suggestedAction: 'Check your network connection and retry the sync.',
    canCopyRules: false,
  };
}
