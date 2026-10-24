import { handleCors } from './_lib/cors.ts';
import { authenticateRequest, getAdminFirestore } from './_lib/firebaseAdmin.ts';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({
      ok: false,
      error: 'Method Not Allowed. Cloud sync requires POST.',
    });
  }

  // 1. Authenticate request using Firebase ID Token
  let user;
  try {
    user = await authenticateRequest(req);
  } catch (err: any) {
    return res.status(err.statusCode || 401).json({
      ok: false,
      error: err.message || 'Unauthorized.',
    });
  }

  // 2. Enforce email verification policy
  if (!user.emailVerified) {
    return res.status(403).json({
      ok: false,
      error: 'Email verification required. Please click the verification link sent to your email before syncing to cloud.',
      email: user.email,
    });
  }

  const { uid } = user;
  const body = req.body || {};

  // 3. Validate payload
  const { queueItems, fullState } = body;
  if (!queueItems && !fullState) {
    return res.status(400).json({
      ok: false,
      error: 'Bad Request: Missing synchronization payload ("queueItems" or "fullState" required).',
    });
  }

  const nowIso = new Date().toISOString();
  let syncedCount = 0;

  try {
    const firestore = getAdminFirestore();
    let batch = firestore.batch();
    let batchOperationsCount = 0;

    // A. Process offline queue items if provided
    if (Array.isArray(queueItems) && queueItems.length > 0) {
      for (const item of queueItems) {
        if (!item.entityId || !item.entityType) continue;

        const collectionName =
          item.entityType === 'sync_state'
            ? 'sync'
            : item.entityType === 'grocery_categories'
            ? 'groceryCategories'
            : item.entityType;

        // CRITICAL: Strictly isolate path to users/{uid}/... derived from verified token
        const docRef = firestore
          .collection('users')
          .doc(uid)
          .collection(collectionName)
          .doc(item.entityId);

        if (item.action === 'delete') {
          batch.set(
            docRef,
            {
              id: item.entityId,
              userId: uid,
              isDeleted: true,
              updatedAt: item.timestamp || nowIso,
            },
            { merge: true }
          );
        } else {
          // Sanitize item data and strictly enforce verified owner UID
          const sanitized = {
            ...(item.data || {}),
            id: item.entityId,
            userId: uid, // Override client UID with verified token UID
            isDeleted: false,
            updatedAt: item.timestamp || nowIso,
          };
          batch.set(docRef, sanitized, { merge: true });
        }
        batchOperationsCount++;
        syncedCount++;

        // Commit in chunks if nearing batch limit of 500
        if (batchOperationsCount >= 450) {
          await batch.commit();
          batch = firestore.batch();
          batchOperationsCount = 0;
        }
      }
    }

    // B. Process full state if provided
    if (fullState && typeof fullState === 'object') {
      // 1. Accounts
      if (Array.isArray(fullState.accounts)) {
        for (const acc of fullState.accounts) {
          if (!acc.id) continue;
          const ref = firestore.collection('users').doc(uid).collection('accounts').doc(acc.id);
          batch.set(
            ref,
            {
              ...acc,
              userId: uid,
              updatedAt: acc.updatedAt || nowIso,
            },
            { merge: true }
          );
          batchOperationsCount++;
          syncedCount++;
        }
      }

      // 2. Transactions
      if (Array.isArray(fullState.transactions)) {
        for (const tx of fullState.transactions) {
          if (!tx.id) continue;
          const ref = firestore.collection('users').doc(uid).collection('transactions').doc(tx.id);
          batch.set(
            ref,
            {
              ...tx,
              userId: uid,
              updatedAt: tx.updatedAt || nowIso,
            },
            { merge: true }
          );
          batchOperationsCount++;
          syncedCount++;
        }
      }

      // 3. Bills
      if (Array.isArray(fullState.bills)) {
        for (const b of fullState.bills) {
          if (!b.id) continue;
          const ref = firestore.collection('users').doc(uid).collection('bills').doc(b.id);
          batch.set(
            ref,
            {
              ...b,
              userId: uid,
              updatedAt: b.updatedAt || nowIso,
            },
            { merge: true }
          );
          batchOperationsCount++;
          syncedCount++;
        }
      }

      // 4. Monthly Bill Entries
      if (fullState.monthlyBillEntries && typeof fullState.monthlyBillEntries === 'object') {
        for (const [entryId, entry] of Object.entries(fullState.monthlyBillEntries)) {
          if (!entryId) continue;
          const ref = firestore
            .collection('users')
            .doc(uid)
            .collection('monthlyBillEntries')
            .doc(entryId);
          batch.set(
            ref,
            {
              ...(entry as any),
              id: entryId,
              userId: uid,
              updatedAt: (entry as any)?.updatedAt || nowIso,
            },
            { merge: true }
          );
          batchOperationsCount++;
          syncedCount++;
        }
      }

      // 5. Receivables
      if (Array.isArray(fullState.receivables)) {
        for (const r of fullState.receivables) {
          if (!r.id) continue;
          const ref = firestore.collection('users').doc(uid).collection('receivables').doc(r.id);
          batch.set(
            ref,
            {
              ...r,
              userId: uid,
              updatedAt: r.updatedAt || nowIso,
            },
            { merge: true }
          );
          batchOperationsCount++;
          syncedCount++;
        }
      }

      // 6. Budgets
      if (fullState.budgets && typeof fullState.budgets === 'object') {
        for (const [key, b] of Object.entries(fullState.budgets)) {
          const ref = firestore.collection('users').doc(uid).collection('budgets').doc(key);
          batch.set(
            ref,
            {
              ...(b as any),
              userId: uid,
              updatedAt: (b as any)?.updatedAt || nowIso,
            },
            { merge: true }
          );
          batchOperationsCount++;
          syncedCount++;
        }
      }

      // 7. Grocery Items
      if (Array.isArray(fullState.groceryItems)) {
        for (const item of fullState.groceryItems) {
          if (!item.id) continue;
          const ref = firestore.collection('users').doc(uid).collection('groceries').doc(item.id);
          batch.set(
            ref,
            {
              ...item,
              userId: uid,
              updatedAt: item.updatedAt || nowIso,
            },
            { merge: true }
          );
          batchOperationsCount++;
          syncedCount++;
        }
      }

      // 8. Grocery Categories
      if (Array.isArray(fullState.groceryCategories)) {
        for (const cat of fullState.groceryCategories) {
          if (!cat.id) continue;
          const ref = firestore.collection('users').doc(uid).collection('groceryCategories').doc(cat.id);
          batch.set(
            ref,
            {
              ...cat,
              userId: uid,
              updatedAt: nowIso,
            },
            { merge: true }
          );
          batchOperationsCount++;
          syncedCount++;
        }
      }

      // 9. Recurring Transactions
      if (Array.isArray(fullState.recurringTransactions)) {
        for (const item of fullState.recurringTransactions) {
          if (!item.id) continue;
          const ref = firestore
            .collection('users')
            .doc(uid)
            .collection('recurringTransactions')
            .doc(item.id);
          batch.set(
            ref,
            {
              ...item,
              userId: uid,
              updatedAt: item.updatedAt || nowIso,
            },
            { merge: true }
          );
          batchOperationsCount++;
          syncedCount++;
        }
      }

      // 10. Workspace Settings & Sync State
      const syncDocRef = firestore
        .collection('users')
        .doc(uid)
        .collection('sync')
        .doc('state');

      batch.set(
        syncDocRef,
        {
          userId: uid,
          version: fullState.version || 1,
          customBillNames: fullState.customBillNames || [],
          customCategories: fullState.customCategories,
          settings: fullState.settings,
          updatedAt: nowIso,
        },
        { merge: true }
      );
      batchOperationsCount++;
    }

    if (batchOperationsCount > 0) {
      await batch.commit();
    }

    return res.status(200).json({
      ok: true,
      syncedCount,
      serverTimestamp: nowIso,
      message: `Successfully synchronized ${syncedCount} records to cloud vault.`,
      verifiedUid: uid,
    });
  } catch (dbErr: any) {
    console.error('[SyncEndpoint] Error writing to Firestore via Admin SDK:', dbErr);

    // If Admin SDK credentials are not present in server environment, return informative guidance
    if (
      dbErr?.code === 'app/no-options' ||
      dbErr?.code === 7 ||
      dbErr?.message?.includes('Could not load the default credentials') ||
      dbErr?.message?.includes('Missing or insufficient permissions')
    ) {
      return res.status(200).json({
        ok: true,
        fallbackToClientSdk: true,
        message: 'Backend verified user authentication. Direct client Firestore sync active.',
        verifiedUid: uid,
        serverTimestamp: nowIso,
      });
    }

    return res.status(500).json({
      ok: false,
      error: 'Backend failed writing synchronized changes to cloud vault.',
      detail: dbErr?.message || 'Database mutation error',
    });
  }
}
