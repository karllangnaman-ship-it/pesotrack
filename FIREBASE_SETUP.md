# PesoTrack — Firebase Authentication, Security Rules & Cloud Sync Setup Guide

This guide provides step-by-step instructions for configuring Firebase Authentication, publishing Firestore Security Rules, configuring email verification, and testing cross-user data isolation for **PesoTrack**.

---

## 1. Verify Your Firebase Project Configuration

Your application reads its Firebase credentials from `/firebase-applet-config.json`. Ensure your configuration matches your active project:

```json
{
  "projectId": "pesotrack-51670",
  "appId": "1:1034020660663:web:9c460843f5373220bab432",
  "apiKey": "AIzaSyCQhVHgEhiJNWD8f6csuxlr1yzxDDijTOI",
  "authDomain": "pesotrack-51670.firebaseapp.com",
  "firestoreDatabaseId": "(default)",
  "storageBucket": "pesotrack-51670.firebasestorage.app",
  "messagingSenderId": "1034020660663"
}
```

> **Note:** If you change your Firebase project in the future, update `/firebase-applet-config.json` with the new project settings.

---

## 2. Publish Firestore Security Rules in Firebase Console

When a new Cloud Firestore database is created, it begins in **Production Mode** with locked security rules (`allow read, write: if false;`), causing requests to fail with `Missing or insufficient permissions`.

### Step-by-Step Publication:

1. Open the [Firebase Console Firestore Rules for pesotrack-51670](https://console.firebase.google.com/project/pesotrack-51670/firestore/rules).
2. Alternatively, in the Firebase Console:
   - Go to **Build** &rarr; **Firestore Database**.
   - Click the **Rules** tab at the top.
3. Replace the entire contents of the rules editor with the rules from `firestore.rules`:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Helper Functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isValidId(id) {
      return id is string && id.size() > 0 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    // Isolated Per-User Workspace Scope
    // Every user's accounts, transactions, bills, budgets, receivables, and settings are strictly isolated under /users/{userId}
    match /users/{userId} {
      allow get, list, create, update, delete: if isOwner(userId);

      // Financial Accounts Subcollection
      match /accounts/{accountId} {
        allow get, list, create, update, delete: if isOwner(userId);
      }

      // Transactions Subcollection
      match /transactions/{transactionId} {
        allow get, list, create, update, delete: if isOwner(userId);
      }

      // Bill Definitions Subcollection
      match /bills/{billId} {
        allow get, list, create, update, delete: if isOwner(userId);
      }

      // Monthly Bill Entries Subcollection
      match /monthlyBillEntries/{entryId} {
        allow get, list, create, update, delete: if isOwner(userId);
      }

      // Receivables (Money Owed to Me) Subcollection
      match /receivables/{receivableId} {
        allow get, list, create, update, delete: if isOwner(userId);
      }

      // Monthly Budgets Subcollection
      match /budgets/{budgetId} {
        allow get, list, create, update, delete: if isOwner(userId);
      }

      // User Workspace Sync State and Settings
      match /sync/{syncId} {
        allow get, list, create, update, delete: if isOwner(userId);
      }

      match /sync_state/{syncId} {
        allow get, list, create, update, delete: if isOwner(userId);
      }

      // Catch-all for any user-scoped subcollections
      match /{allSubcollections=**} {
        allow read, write: if isOwner(userId);
      }
    }

    // Global Safety Net: Default-deny catch-all for any documents outside /users
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

4. Click **Publish**.
5. Return to PesoTrack and tap **Verify & Sync Now**. The sync status badge will turn green (**Synced**).

### Optional: Deploying via Firebase CLI
If you have the Firebase CLI logged in locally, you can deploy rules directly using:
```bash
firebase deploy --only firestore:rules
```

---

## 3. Configure Firebase Authentication

1. In the [Firebase Console](https://console.firebase.google.com/project/pesotrack-51670/authentication), navigate to **Build** &rarr; **Authentication**.
2. Click **Get started** if not already enabled.
3. Select the **Sign-in method** tab.
4. Enable **Email/Password**:
   - Turn on **Email/Password**.
   - (Optional) Leave Email link (passwordless) unchecked unless desired.
   - Click **Save**.
5. Enable **Google** (Optional):
   - Turn on **Google**.
   - Set the support email and click **Save**.

---

## 4. Email Verification & 6-Digit Code Setup

PesoTrack supports two verification mechanisms:

### Method A: Built-in Firebase Email Verification Link (Works Out-of-the-Box)
- When a user signs up, Firebase sends an email verification link to their email address.
- The user can click the link in their inbox and tap **"I Clicked the Link in My Email"** in PesoTrack to immediately verify their account.
- This requires **zero third-party SMTP configuration** and uses Google's email infrastructure.

### Method B: Server-Side 6-Digit Numeric Verification Code
- When an account is created, the Express server (`server.ts`) generates a cryptographically secure 6-digit code.
- Plaintext codes are never stored; codes are hashed with a unique salt using `scrypt` with a 15-minute expiration and a 5-attempt limit.
- If SMTP credentials are provided in `.env`, the server automatically emails the 6-digit code:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-character-app-password"
SMTP_FROM="PesoTrack <no-reply@pesotrack.app>"
```

> **For Gmail SMTP:** Use an **App Password** generated from your Google Account (Security &rarr; 2-Step Verification &rarr; App passwords). Do not use your regular account password.
>
> **Development Mode:** If SMTP credentials are not yet configured in `.env`, the server generates the verification code, logs it to the terminal, and displays it in a development banner inside the verification screen so you can test the complete flow immediately.

---

## 5. Verify Multi-User Account Isolation

PesoTrack enforces strict per-user account isolation at two levels:

1. **Client Isolation:**
   - Every user's local records are stored in a dedicated key `pesotrack_workspace_${uid}` in browser storage.
   - Unauthenticated guest users use `pesotrack_state_v1`.
   - Logging out clears the in-memory application state and resets to the guest vault without deleting the user's saved records.
2. **Cloud Security Rules Isolation:**
   - The security rules mandate `request.auth.uid == userId`.
   - Any query attempting to read or write `/users/{otherUid}/*` is rejected by Firestore with `permission-denied`.

### Testing with Two Separate Accounts:

1. Open PesoTrack and tap **Sign In / Register**.
2. Register Account A (`user1@example.ph`) and complete email verification.
3. Add a wallet account (e.g., "GCash — User 1", ₱5,000) and add an expense.
4. Tap **Sync Now** &rarr; verify the status turns **Synced**.
5. Go to **Settings** &rarr; tap the **Sign Out** button.
6. Register Account B (`user2@example.ph`) and verify.
7. Observe that Account B's workspace is completely empty with 0 accounts and 0 transactions.
8. Add an account for User B (e.g., "Maya — User 2", ₱10,000).
9. Log out of Account B and log back into Account A.
10. Verify that Account A's "GCash — User 1" account and transactions remain intact.

---

## 6. Summary of Sync Status Indicators

| Badge | Meaning | Action Needed |
| :--- | :--- | :--- |
| **Synced** | Local vault matches cloud database | None, all data backed up. |
| **Rules Needed** | Project Firestore rules locked | Copy rules and publish in Firebase Console. |
| **Offline** | Device has no internet connection | None, offline changes saved locally. |
| **Pending (N)** | N local changes queued for cloud | Changes will sync automatically when online. |
| **Sync Notice** | Sync encountered an error | Tap badge or visit Settings to review details. |
