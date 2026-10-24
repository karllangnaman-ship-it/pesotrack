# PesoTrack Online-Only Backend on Vercel

This guide documents the architecture, configuration, deployment, and verification for the Vercel-hosted online-only backend integrated into PesoTrack.

---

## 1. Architecture Overview

- **Online-Only Operation**: PesoTrack is offline-first. All records (accounts, transactions, payments, bills, loans, budgets) are saved to persistent device storage first. Vercel serverless functions are called only when the device is online and authenticated.
- **Serverless API Routes**:
  - `GET /api/health` — Public health check reporting backend availability, environment, and services without exposing secrets.
  - `POST /api/sync` — Authenticated synchronization endpoint. Verifies caller identity using Firebase ID Token (`Authorization: Bearer <token>`), validates payload, enforces email verification, and writes exclusively to the user's isolated collection (`users/{uid}/...`).
  - `GET /api/restore` — Authenticated cloud data retrieval. Validates caller identity using Firebase ID Token and returns the authenticated user's records with summary metrics.
  - `GET /api/auth-status` (and `GET /api/auth/status`) — Capability status.
- **Persistent Storage**: Cloud Firestore remains the canonical cloud database. Vercel acts as the secure serverless API layer.
- **Data Isolation**: The user's UID is derived strictly from the verified Firebase ID token on the server, never from client-supplied fields.

---

## 2. Environment Variables

### Public Client Variables (Vite & Android APK)
Configured in `.env` or build environment. Variables prefixed with `VITE_` are bundled into the client application:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Production URL of your Vercel deployment. In web browser, leave empty to use relative `/api`. For Android Capacitor APK, set this to your deployed domain. | `https://pesotrack.vercel.app` |

### Server-Only Private Variables (Vercel Project Settings)
**Never prefix private secrets with `VITE_`.** Configure these directly in **Vercel Project Settings → Environment Variables**:

| Variable | Target Environments | Description |
| :--- | :--- | :--- |
| `FIREBASE_PROJECT_ID` | Production, Preview, Development | Your Firebase project ID (e.g., `pesotrack-51670`). |
| `FIREBASE_CLIENT_EMAIL` | Production, Preview, Development | Service Account client email from Google Cloud / Firebase Console. |
| `FIREBASE_PRIVATE_KEY` | Production, Preview, Development | Service Account private key (includes `-----BEGIN PRIVATE KEY-----`). |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Optional Alternative | Full JSON string of the service account file. |
| `ALLOWED_ORIGINS` | Production, Preview, Development | Comma-separated allowed CORS origins (e.g., `https://pesotrack.vercel.app,capacitor://localhost`). |

---

## 3. How to Obtain Firebase Service Account Credentials

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project: **pesotrack-51670**.
3. Click the gear icon ⚙️ (Project settings) → **Service accounts** tab.
4. Click **Generate new private key** and download the JSON file.
5. In the downloaded JSON:
   - `project_id` → set as `FIREBASE_PROJECT_ID`
   - `client_email` → set as `FIREBASE_CLIENT_EMAIL`
   - `private_key` → set as `FIREBASE_PRIVATE_KEY` (paste the full multiline string as-is into Vercel)
   - Or paste the entire JSON into `FIREBASE_SERVICE_ACCOUNT_KEY`.

---

## 4. Deploying to Vercel

### Option A: Via GitHub (Recommended)
1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/new), import your repository.
3. Framework Preset: **Vite**.
4. Root Directory: `./`.
5. Under **Environment Variables**, add:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
6. Click **Deploy**.

### Option B: Via Vercel CLI
```bash
npm install -g vercel
vercel login
vercel link
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_CLIENT_EMAIL
vercel env add FIREBASE_PRIVATE_KEY
vercel --prod
```

---

## 5. Android Capacitor APK Integration

When building the release APK for Android devices:

1. Add your deployed Vercel domain to your build `.env`:
   ```env
   VITE_API_BASE_URL="https://your-vercel-domain.vercel.app"
   ```
2. Build and sync the Android assets:
   ```bash
   npm run build
   npx cap sync android
   ```
3. Open in Android Studio or compile with Gradle:
   ```bash
   cd android && ./gradlew assembleRelease
   ```
4. The Android app will route its online API requests to `https://your-vercel-domain.vercel.app/api/...` while continuing to function 100% offline when disconnected.

---

## 6. Verification and Testing

1. **Health Check**:
   ```bash
   curl -i https://your-vercel-domain.vercel.app/api/health
   ```
   Expected response: `200 OK` with JSON `{ "ok": true, "status": "healthy", ... }`.

2. **Unauthenticated Request Rejection**:
   ```bash
   curl -i -X POST https://your-vercel-domain.vercel.app/api/sync \
     -H "Content-Type: application/json" \
     -d '{"queueItems":[]}'
   ```
   Expected response: `401 Unauthorized` (`Missing or invalid Authorization Bearer token header`).

3. **Multi-User Isolation**:
   Every mutation and retrieval enforces `users/{verifiedTokenUid}/...`. Even if a client sends a payload with another user's `userId`, the server overrides it with the cryptographic identity from Google's token.

4. **Offline Resilience**:
   - Disconnect Wi-Fi / mobile data.
   - Open PesoTrack. All local balances, bills, and transactions remain accessible.
   - Create a new expense or account. It is saved immediately to local storage and queued.
   - Reconnect internet and tap "Sync to Cloud". Changes flush and synchronize with the cloud vault.
