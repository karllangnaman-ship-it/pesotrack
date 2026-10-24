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

    // Default-deny catch-all for any document
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

      // Grocery Items Subcollection
      match /groceries/{groceryId} {
        allow read, write: if isVerifiedOwner(userId);
      }

      // Grocery Categories Subcollection
      match /groceryCategories/{categoryId} {
        allow read, write: if isVerifiedOwner(userId);
      }

      // User-scoped catch-all for any nested subcollections
      match /{allSubcollections=**} {
        allow read, write: if isVerifiedOwner(userId);
      }
    }

    // Collaborative Joint Workspaces Scope
    // Only verified members of the joint workspace can access the workspace and its shared financial records
    match /jointWorkspaces/{workspaceId} {
      // Existing members can access. An invited user can read workspace metadata to accept an invitation if open slot exists (< 10 members)
      allow get: if isVerifiedUser() && (
        (request.auth.uid in resource.data.memberUids) ||
        (resource.data.members.size() < 10)
      );
      allow list: if isVerifiedUser() && (request.auth.uid in resource.data.memberUids);
      allow create: if isVerifiedUser() && (request.auth.uid in request.resource.data.memberUids);
      // Existing members can update workspace settings. An invited member can join adding their own UID (up to 10 members)
      allow update: if isVerifiedUser() && (
        (request.auth.uid in resource.data.memberUids) ||
        (
          resource.data.members.size() < 10 &&
          request.resource.data.members.size() <= 10 &&
          request.resource.data.ownerUid == resource.data.ownerUid &&
          (request.auth.uid in request.resource.data.memberUids)
        )
      );
      allow delete: if isVerifiedUser() && resource.data.ownerUid == request.auth.uid;

      // Subcollections (accounts, transactions, bills, monthlyBillEntries, budgets, groceries, activity)
      match /{allSubcollections=**} {
        allow read, write: if isVerifiedUser() && (
          request.auth.uid in get(/databases/$(database)/documents/jointWorkspaces/$(workspaceId)).data.memberUids
        );
      }
    }

    // Collaborative Joint Invitations Scope
    // Only the inviter or the intended recipient (matching verified email) can access and respond to invitations
    match /jointInvitations/{invitationId} {
      allow get: if isVerifiedUser() && (
        resource.data.inviterUid == request.auth.uid ||
        (resource.data.inviteeEmail is string && request.auth.token.email is string &&
         (resource.data.inviteeEmail == request.auth.token.email ||
          resource.data.inviteeEmail.lower() == request.auth.token.email.lower()))
      );
      allow list: if isVerifiedUser() && (
        resource.data.inviterUid == request.auth.uid ||
        (resource.data.inviteeEmail is string && request.auth.token.email is string &&
         (resource.data.inviteeEmail == request.auth.token.email ||
          resource.data.inviteeEmail.lower() == request.auth.token.email.lower()))
      );
      allow create: if isVerifiedUser() && request.resource.data.inviterUid == request.auth.uid;
      allow update: if isVerifiedUser() && (
        resource.data.inviterUid == request.auth.uid ||
        (resource.data.inviteeEmail is string && request.auth.token.email is string &&
         (resource.data.inviteeEmail == request.auth.token.email ||
          resource.data.inviteeEmail.lower() == request.auth.token.email.lower()))
      );
      allow delete: if isVerifiedUser() && resource.data.inviterUid == request.auth.uid;
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
