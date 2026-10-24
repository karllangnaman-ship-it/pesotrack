import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, isPermissionError } from './firebase';
import {
  FinancialAccount,
  TransactionRecord,
  BillDefinition,
  MonthlyBillEntry,
  MonthlyBudget,
  ReceivableRecord,
  GroceryItem,
  GroceryCategory,
  PesoTrackState,
} from '../types/finance';
import firebaseConfig from '../../firebase-applet-config.json';
import { reloadCurrentUser } from './authService';
import { CURRENT_FIREBASE_PROJECT_ID, parseSyncError } from '../utils/firestoreRulesHelper';
import { sendSyncToBackend, fetchRestoreFromBackend } from './apiClient';
import { BackupSummary } from '../utils/backupService';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncQueueItem {
  id: string; // Unique queue item ID
  uid: string;
  entityType:
    | 'accounts'
    | 'transactions'
    | 'bills'
    | 'monthlyBillEntries'
    | 'budgets'
    | 'receivables'
    | 'groceries'
    | 'grocery_categories'
    | 'sync_state';
  entityId: string;
  action: 'upsert' | 'delete';
  data?: any;
  timestamp: string; // ISO
}

export interface DetailedSyncResult {
  ok: boolean;
  status:
    | 'synced'
    | 'partially_synced'
    | 'failed'
    | 'offline'
    | 'email_unverified'
    | 'unauthenticated'
    | 'permission_denied'
    | 'config_missing';
  message: string;
  detail?: string;
  firebaseErrorCode?: string;
  flushedCount: number;
  uploadedCount: number;
  downloadedCount: number;
  updatedState: PesoTrackState;
}

function getQueueStorageKey(uid: string): string {
  return `pesotrack_sync_queue_${uid}`;
}

export function getPendingQueue(uid: string): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(getQueueStorageKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed reading sync queue:', e);
    return [];
  }
}

export function savePendingQueue(uid: string, queue: SyncQueueItem[]): void {
  try {
    localStorage.setItem(getQueueStorageKey(uid), JSON.stringify(queue));
  } catch (e) {
    console.error('Failed writing sync queue:', e);
  }
}

export function enqueueChange(
  uid: string,
  entityType: SyncQueueItem['entityType'],
  entityId: string,
  action: 'upsert' | 'delete',
  data?: any
): void {
  if (!uid) return;
  const current = getPendingQueue(uid);
  const now = new Date().toISOString();
  // Deduplicate within queue for same entityId to avoid redundant network writes
  const filtered = current.filter(
    (item) => !(item.entityType === entityType && item.entityId === entityId)
  );
  filtered.push({
    id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    uid,
    entityType,
    entityId,
    action,
    data,
    timestamp: now,
  });
  savePendingQueue(uid, filtered);
}

export function clearQueue(uid: string): void {
  try {
    localStorage.removeItem(getQueueStorageKey(uid));
  } catch {}
}

/**
 * Flush any queued offline operations to Cloud Firestore for the user.
 */
export async function flushSyncQueue(
  uid: string
): Promise<{ success: boolean; flushedCount: number; remainingCount: number; lastError?: any }> {
  const queue = getPendingQueue(uid);
  if (queue.length === 0) {
    return { success: true, flushedCount: 0, remainingCount: 0 };
  }

  // Ensure current user matches UID before flushing
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return { success: false, flushedCount: 0, remainingCount: queue.length };
  }

  const remaining: SyncQueueItem[] = [];
  let flushedCount = 0;
  let lastError: any = null;

  for (const item of queue) {
    try {
      const collectionName =
        item.entityType === 'sync_state'
          ? 'sync'
          : item.entityType === 'grocery_categories'
          ? 'groceryCategories'
          : item.entityType;
      const docRef = doc(db, 'users', uid, collectionName, item.entityId);
      if (item.action === 'delete') {
        // Soft tombstone with isDeleted to prevent resurrecting on other devices
        await setDoc(
          docRef,
          {
            id: item.entityId,
            userId: uid,
            isDeleted: true,
            updatedAt: item.timestamp,
          },
          { merge: true }
        );
      } else {
        await setDoc(
          docRef,
          {
            ...item.data,
            userId: uid,
            isDeleted: false,
            updatedAt: item.timestamp || new Date().toISOString(),
          },
          { merge: true }
        );
      }
      flushedCount++;
    } catch (err) {
      console.warn(`[Sync] Failed flushing queue item ${item.id}:`, err);
      lastError = err;
      remaining.push(item);
    }
  }

  savePendingQueue(uid, remaining);
  return {
    success: remaining.length === 0,
    flushedCount,
    remainingCount: remaining.length,
    lastError,
  };
}

/**
 * Download all cloud records for a user from Firestore and return a complete restored state.
 * Never throws empty state over existing data.
 */
export async function restoreAccountDataFromCloud(
  uid: string,
  baseState: PesoTrackState
): Promise<{
  restoredState: PesoTrackState;
  hasCloudData: boolean;
  totalRecordsCount: number;
  accountsCount: number;
  transactionsCount: number;
}> {
  // Query remote collections for this user
  const [
    accSnap,
    txSnap,
    billSnap,
    entriesSnap,
    budSnap,
    recSnap,
    grocSnap,
    catSnap,
    syncDocSnap,
  ] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'accounts')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, `users/${uid}/accounts`)
    ),
    getDocs(collection(db, 'users', uid, 'transactions')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, `users/${uid}/transactions`)
    ),
    getDocs(collection(db, 'users', uid, 'bills')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, `users/${uid}/bills`)
    ),
    getDocs(collection(db, 'users', uid, 'monthlyBillEntries')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, `users/${uid}/monthlyBillEntries`)
    ),
    getDocs(collection(db, 'users', uid, 'budgets')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, `users/${uid}/budgets`)
    ),
    getDocs(collection(db, 'users', uid, 'receivables')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, `users/${uid}/receivables`)
    ),
    getDocs(collection(db, 'users', uid, 'groceries')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, `users/${uid}/groceries`)
    ),
    getDocs(collection(db, 'users', uid, 'groceryCategories')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, `users/${uid}/groceryCategories`)
    ),
    getDoc(doc(db, 'users', uid, 'sync', 'state')).catch((e) =>
      handleFirestoreError(e, OperationType.GET, `users/${uid}/sync/state`)
    ),
  ]);

  const remoteAccounts: FinancialAccount[] = [];
  accSnap.forEach((d) => {
    const data = d.data();
    if (!data.isDeleted) remoteAccounts.push(data as FinancialAccount);
  });

  const remoteTransactions: TransactionRecord[] = [];
  txSnap.forEach((d) => {
    const data = d.data();
    if (!data.isDeleted) remoteTransactions.push(data as TransactionRecord);
  });
  remoteTransactions.sort(
    (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
  );

  const remoteBills: BillDefinition[] = [];
  billSnap.forEach((d) => {
    const data = d.data();
    if (!data.isDeleted) remoteBills.push(data as BillDefinition);
  });

  const remoteEntries: Record<string, MonthlyBillEntry> = {};
  entriesSnap.forEach((d) => {
    const data = d.data();
    if (!data.isDeleted) remoteEntries[d.id] = data as MonthlyBillEntry;
  });

  const remoteBudgets: Record<string, MonthlyBudget> = {};
  budSnap.forEach((d) => {
    const data = d.data();
    if (!data.isDeleted) remoteBudgets[d.id] = data as MonthlyBudget;
  });

  const remoteReceivables: ReceivableRecord[] = [];
  recSnap.forEach((d) => {
    const data = d.data();
    if (!data.isDeleted) remoteReceivables.push(data as ReceivableRecord);
  });

  const remoteGroceries: GroceryItem[] = [];
  grocSnap.forEach((d) => {
    const data = d.data();
    if (!data.isDeleted) remoteGroceries.push(data as GroceryItem);
  });

  const remoteGroceryCategories: GroceryCategory[] = [];
  catSnap.forEach((d) => {
    const data = d.data();
    if (!data.isDeleted) remoteGroceryCategories.push(data as GroceryCategory);
  });

  const remoteSyncData = syncDocSnap.exists() ? syncDocSnap.data() : null;

  const hasCloudData =
    remoteAccounts.length > 0 ||
    remoteTransactions.length > 0 ||
    remoteBills.length > 0 ||
    remoteReceivables.length > 0 ||
    remoteGroceries.length > 0 ||
    Boolean(remoteSyncData);

  const totalRecordsCount =
    remoteAccounts.length +
    remoteTransactions.length +
    remoteBills.length +
    Object.keys(remoteEntries).length +
    remoteReceivables.length +
    Object.keys(remoteBudgets).length +
    remoteGroceries.length +
    remoteGroceryCategories.length;

  if (!hasCloudData) {
    return {
      restoredState: baseState,
      hasCloudData: false,
      totalRecordsCount: 0,
      accountsCount: 0,
      transactionsCount: 0,
    };
  }

  const restoredState: PesoTrackState = {
    version: remoteSyncData?.version || baseState.version || 1,
    accounts: remoteAccounts,
    transactions: remoteTransactions,
    bills: remoteBills,
    monthlyBillEntries: remoteEntries,
    receivables: remoteReceivables,
    budgets: Object.keys(remoteBudgets).length > 0 ? remoteBudgets : baseState.budgets,
    recurringTransactions: baseState.recurringTransactions || [],
    groceryItems: remoteGroceries.length > 0 ? remoteGroceries : baseState.groceryItems || [],
    groceryCategories:
      remoteGroceryCategories.length > 0
        ? remoteGroceryCategories
        : baseState.groceryCategories,
    customBillNames: remoteSyncData?.customBillNames || baseState.customBillNames || [],
    customCategories: remoteSyncData?.customCategories || baseState.customCategories,
    settings: remoteSyncData?.settings
      ? { ...baseState.settings, ...remoteSyncData.settings }
      : baseState.settings,
    updatedAt: new Date().toISOString(),
  };

  return {
    restoredState,
    hasCloudData: true,
    totalRecordsCount,
    accountsCount: remoteAccounts.length,
    transactionsCount: remoteTransactions.length,
  };
}

const SAFETY_BACKUP_STORAGE_KEY = 'pesotrack_safety_backup_before_restore';

/**
 * Creates an automatic local safety backup before a cloud restore replaces local records.
 */
export function createLocalSafetyBackup(state: PesoTrackState): string {
  const timestamp = new Date().toISOString();
  try {
    localStorage.setItem(
      SAFETY_BACKUP_STORAGE_KEY,
      JSON.stringify({
        state,
        createdAt: timestamp,
      })
    );
  } catch (e) {
    console.warn('[Sync] Failed writing local safety backup:', e);
  }
  return timestamp;
}

export function getLocalSafetyBackup(): { state: PesoTrackState; createdAt: string } | null {
  try {
    const raw = localStorage.getItem(SAFETY_BACKUP_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Retrieve user cloud backup from Vercel backend with automatic direct Firestore fallback.
 */
export async function fetchUserCloudBackup(
  uid: string,
  baseState: PesoTrackState
): Promise<{
  ok: boolean;
  hasCloudData: boolean;
  restoredState?: PesoTrackState;
  summary?: BackupSummary;
  source?: 'vercel-backend' | 'firestore-client';
  message: string;
  error?: string;
}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      ok: false,
      hasCloudData: false,
      message: 'Internet unavailable. Device is operating in offline mode.',
      error: 'Device is offline.',
    };
  }

  // 1. Try Vercel Serverless Backend API
  try {
    const backendRes = await fetchRestoreFromBackend();
    if (backendRes.ok && backendRes.hasCloudData && backendRes.data) {
      return {
        ok: true,
        hasCloudData: true,
        restoredState: backendRes.data,
        summary: backendRes.summary,
        source: 'vercel-backend',
        message: backendRes.message || 'Cloud backup retrieved via Vercel online backend.',
      };
    }
  } catch (backendErr) {
    console.warn('[Sync] Vercel backend restore fallback triggered:', backendErr);
  }

  // 2. Direct Cloud Firestore Client SDK Fallback
  try {
    const clientRes = await restoreAccountDataFromCloud(uid, baseState);
    if (!clientRes.hasCloudData) {
      return {
        ok: true,
        hasCloudData: false,
        message: 'No cloud records found in this account.',
      };
    }

    const state = clientRes.restoredState;
    const summary: BackupSummary = {
      accountsCount: state.accounts.length,
      transactionsCount: state.transactions.length,
      budgetsCount: Object.keys(state.budgets || {}).length,
      recurringCount: (state.recurringTransactions || []).length,
      customCategoriesCount:
        (state.customCategories?.expense?.length || 0) +
        (state.customCategories?.income?.length || 0),
      receivablesCount: (state.receivables || []).length,
      billsCount: (state.bills || []).length,
      billEntriesCount: Object.keys(state.monthlyBillEntries || {}).length,
      profileName: state.settings?.profileName,
      version: state.version || 1,
      updatedAt: state.updatedAt,
    };

    return {
      ok: true,
      hasCloudData: true,
      restoredState: state,
      summary,
      source: 'firestore-client',
      message: `Retrieved ${summary.accountsCount} accounts and ${summary.transactionsCount} transactions from cloud vault.`,
    };
  } catch (err: any) {
    return {
      ok: false,
      hasCloudData: false,
      error: err?.message || 'Could not retrieve cloud data.',
      message: 'Failed to download cloud backup. Local records are intact.',
    };
  }
}


/**
 * Core Two-Way Sync Engine:
 * 1. Flushes queued mutations.
 * 2. Pulls remote user collections.
 * 3. Merges local and cloud records safely by stable ID and updatedAt timestamps.
 * 4. Pushes newer or local-only records to Firestore.
 */
export async function performFullSync(
  uid: string,
  localState: PesoTrackState
): Promise<{
  updatedState: PesoTrackState;
  error?: string;
  flushedCount: number;
  uploadedCount: number;
  downloadedCount: number;
  hasPartialFailure?: boolean;
}> {
  // 1. Flush any pending mutations from local offline queue
  const flushRes = await flushSyncQueue(uid);

  // 2. Fetch remote documents for this user
  const [
    accSnap,
    txSnap,
    billSnap,
    entriesSnap,
    budSnap,
    recSnap,
    grocSnap,
    catSnap,
    syncDocSnap,
  ] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'accounts')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, `users/${uid}/accounts`)
    ),
    getDocs(collection(db, 'users', uid, 'transactions')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, `users/${uid}/transactions`)
    ),
    getDocs(collection(db, 'users', uid, 'bills')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, `users/${uid}/bills`)
    ),
    getDocs(collection(db, 'users', uid, 'monthlyBillEntries')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, `users/${uid}/monthlyBillEntries`)
    ),
    getDocs(collection(db, 'users', uid, 'budgets')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, `users/${uid}/budgets`)
    ),
    getDocs(collection(db, 'users', uid, 'receivables')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, `users/${uid}/receivables`)
    ),
    getDocs(collection(db, 'users', uid, 'groceries')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, `users/${uid}/groceries`)
    ),
    getDocs(collection(db, 'users', uid, 'groceryCategories')).catch((e) =>
      handleFirestoreError(e, OperationType.LIST, `users/${uid}/groceryCategories`)
    ),
    getDoc(doc(db, 'users', uid, 'sync', 'state')).catch((e) =>
      handleFirestoreError(e, OperationType.GET, `users/${uid}/sync/state`)
    ),
  ]);

  // Remote collections map
  const remoteAccounts = new Map<string, any>();
  accSnap.forEach((d) => remoteAccounts.set(d.id, d.data()));

  const remoteTransactions = new Map<string, any>();
  txSnap.forEach((d) => remoteTransactions.set(d.id, d.data()));

  const remoteBills = new Map<string, any>();
  billSnap.forEach((d) => remoteBills.set(d.id, d.data()));

  const remoteEntries = new Map<string, any>();
  entriesSnap.forEach((d) => remoteEntries.set(d.id, d.data()));

  const remoteBudgets = new Map<string, any>();
  budSnap.forEach((d) => remoteBudgets.set(d.id, d.data()));

  const remoteReceivables = new Map<string, any>();
  recSnap.forEach((d) => remoteReceivables.set(d.id, d.data()));

  const remoteGroceries = new Map<string, any>();
  grocSnap.forEach((d) => remoteGroceries.set(d.id, d.data()));

  const remoteGroceryCategories = new Map<string, any>();
  catSnap.forEach((d) => remoteGroceryCategories.set(d.id, d.data()));

  const totalDownloaded =
    remoteAccounts.size +
    remoteTransactions.size +
    remoteBills.size +
    remoteEntries.size +
    remoteBudgets.size +
    remoteReceivables.size +
    remoteGroceries.size +
    remoteGroceryCategories.size;

  // Merge Accounts
  const mergedAccounts: FinancialAccount[] = [];
  const localAccountMap = new Map(localState.accounts.map((a) => [a.id, a]));
  const accountsToUpload: FinancialAccount[] = [];

  for (const [id, rAcc] of remoteAccounts.entries()) {
    if (rAcc.isDeleted) {
      localAccountMap.delete(id);
      continue;
    }
    const localAcc = localAccountMap.get(id);
    if (!localAcc) {
      mergedAccounts.push(rAcc as FinancialAccount);
    } else {
      const localTime = new Date(localAcc.updatedAt || localAcc.createdAt || 0).getTime();
      const remoteTime = new Date(rAcc.updatedAt || rAcc.createdAt || 0).getTime();
      if (remoteTime >= localTime) {
        mergedAccounts.push(rAcc as FinancialAccount);
      } else {
        mergedAccounts.push(localAcc);
        accountsToUpload.push(localAcc);
      }
      localAccountMap.delete(id);
    }
  }
  for (const [_, lAcc] of localAccountMap.entries()) {
    mergedAccounts.push(lAcc);
    accountsToUpload.push(lAcc);
  }

  // Merge Transactions
  const mergedTransactions: TransactionRecord[] = [];
  const localTxMap = new Map(localState.transactions.map((t) => [t.id, t]));
  const txToUpload: TransactionRecord[] = [];

  for (const [id, rTx] of remoteTransactions.entries()) {
    if (rTx.isDeleted) {
      localTxMap.delete(id);
      continue;
    }
    const localTx = localTxMap.get(id);
    if (!localTx) {
      mergedTransactions.push(rTx as TransactionRecord);
    } else {
      const localTime = new Date(localTx.updatedAt || localTx.dateTime || 0).getTime();
      const remoteTime = new Date(rTx.updatedAt || rTx.dateTime || 0).getTime();
      if (remoteTime >= localTime) {
        mergedTransactions.push(rTx as TransactionRecord);
      } else {
        mergedTransactions.push(localTx);
        txToUpload.push(localTx);
      }
      localTxMap.delete(id);
    }
  }
  for (const [_, lTx] of localTxMap.entries()) {
    mergedTransactions.push(lTx);
    txToUpload.push(lTx);
  }
  mergedTransactions.sort(
    (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
  );

  // Merge Bills
  const mergedBills: BillDefinition[] = [];
  const localBillMap = new Map((localState.bills || []).map((b) => [b.id, b]));
  const billsToUpload: BillDefinition[] = [];

  for (const [id, rBill] of remoteBills.entries()) {
    if (rBill.isDeleted) {
      localBillMap.delete(id);
      continue;
    }
    const lBill = localBillMap.get(id);
    if (!lBill) {
      mergedBills.push(rBill as BillDefinition);
    } else {
      const localTime = new Date(lBill.updatedAt || lBill.createdAt || 0).getTime();
      const remoteTime = new Date(rBill.updatedAt || rBill.createdAt || 0).getTime();
      if (remoteTime >= localTime) {
        mergedBills.push(rBill as BillDefinition);
      } else {
        mergedBills.push(lBill);
        billsToUpload.push(lBill);
      }
      localBillMap.delete(id);
    }
  }
  for (const [_, lBill] of localBillMap.entries()) {
    mergedBills.push(lBill);
    billsToUpload.push(lBill);
  }

  // Merge Monthly Bill Entries
  const mergedEntries: Record<string, MonthlyBillEntry> = {};
  const localEntryMap = new Map(Object.entries(localState.monthlyBillEntries || {}));
  const entriesToUpload: MonthlyBillEntry[] = [];

  for (const [id, rEntry] of remoteEntries.entries()) {
    if (rEntry.isDeleted) {
      localEntryMap.delete(id);
      continue;
    }
    const lEntry = localEntryMap.get(id);
    if (!lEntry) {
      mergedEntries[id] = rEntry as MonthlyBillEntry;
    } else {
      const localTime = new Date(lEntry.updatedAt || lEntry.createdAt || 0).getTime();
      const remoteTime = new Date(rEntry.updatedAt || rEntry.createdAt || 0).getTime();
      if (remoteTime >= localTime) {
        mergedEntries[id] = rEntry as MonthlyBillEntry;
      } else {
        mergedEntries[id] = lEntry;
        entriesToUpload.push(lEntry);
      }
      localEntryMap.delete(id);
    }
  }
  for (const [id, lEntry] of localEntryMap.entries()) {
    mergedEntries[id] = lEntry;
    entriesToUpload.push(lEntry);
  }

  // Merge Receivables
  const mergedReceivables: ReceivableRecord[] = [];
  const localRecMap = new Map((localState.receivables || []).map((r) => [r.id, r]));
  const recsToUpload: ReceivableRecord[] = [];

  for (const [id, rRec] of remoteReceivables.entries()) {
    if (rRec.isDeleted) {
      localRecMap.delete(id);
      continue;
    }
    const lRec = localRecMap.get(id);
    if (!lRec) {
      mergedReceivables.push(rRec as ReceivableRecord);
    } else {
      const localTime = new Date(lRec.updatedAt || lRec.createdAt || 0).getTime();
      const remoteTime = new Date(rRec.updatedAt || rRec.createdAt || 0).getTime();
      if (remoteTime >= localTime) {
        mergedReceivables.push(rRec as ReceivableRecord);
      } else {
        mergedReceivables.push(lRec);
        recsToUpload.push(lRec);
      }
      localRecMap.delete(id);
    }
  }
  for (const [_, lRec] of localRecMap.entries()) {
    mergedReceivables.push(lRec);
    recsToUpload.push(lRec);
  }

  // Merge Budgets
  const mergedBudgets: Record<string, MonthlyBudget> = {};
  const localBudgetMap = new Map(Object.entries(localState.budgets || {}));
  const budgetsToUpload: MonthlyBudget[] = [];

  for (const [id, rBud] of remoteBudgets.entries()) {
    if (rBud.isDeleted) {
      localBudgetMap.delete(id);
      continue;
    }
    mergedBudgets[id] = rBud as MonthlyBudget;
    localBudgetMap.delete(id);
  }
  for (const [id, lBud] of localBudgetMap.entries()) {
    mergedBudgets[id] = lBud;
    budgetsToUpload.push(lBud);
  }

  // Upload newer or local-only records to Cloud Firestore under users/{uid}/...
  const uploadPromises: Promise<any>[] = [];
  const nowIso = new Date().toISOString();

  for (const acc of accountsToUpload) {
    uploadPromises.push(
      setDoc(
        doc(db, 'users', uid, 'accounts', acc.id),
        {
          ...acc,
          userId: uid,
          updatedAt: acc.updatedAt || nowIso,
        },
        { merge: true }
      )
    );
  }
  for (const tx of txToUpload) {
    uploadPromises.push(
      setDoc(
        doc(db, 'users', uid, 'transactions', tx.id),
        {
          ...tx,
          userId: uid,
          updatedAt: tx.updatedAt || nowIso,
        },
        { merge: true }
      )
    );
  }
  for (const bill of billsToUpload) {
    uploadPromises.push(
      setDoc(
        doc(db, 'users', uid, 'bills', bill.id),
        {
          ...bill,
          userId: uid,
          updatedAt: bill.updatedAt || nowIso,
        },
        { merge: true }
      )
    );
  }
  for (const ent of entriesToUpload) {
    uploadPromises.push(
      setDoc(
        doc(db, 'users', uid, 'monthlyBillEntries', ent.id),
        {
          ...ent,
          userId: uid,
          updatedAt: ent.updatedAt || nowIso,
        },
        { merge: true }
      )
    );
  }
  for (const rec of recsToUpload) {
    uploadPromises.push(
      setDoc(
        doc(db, 'users', uid, 'receivables', rec.id),
        {
          ...rec,
          userId: uid,
          updatedAt: rec.updatedAt || nowIso,
        },
        { merge: true }
      )
    );
  }
  for (const bud of budgetsToUpload) {
    uploadPromises.push(
      setDoc(
        doc(db, 'users', uid, 'budgets', bud.monthKey),
        {
          ...bud,
          userId: uid,
          updatedAt: bud.updatedAt || nowIso,
        },
        { merge: true }
      )
    );
  }

  // Merge Groceries
  const mergedGroceries: GroceryItem[] = [];
  const localGrocMap = new Map((localState.groceryItems || []).map((g) => [g.id, g]));
  const grocsToUpload: GroceryItem[] = [];

  for (const [id, rGroc] of remoteGroceries.entries()) {
    if (rGroc.isDeleted) {
      localGrocMap.delete(id);
      continue;
    }
    const localG = localGrocMap.get(id);
    if (!localG) {
      mergedGroceries.push(rGroc as GroceryItem);
    } else {
      const localTime = new Date(localG.updatedAt || localG.createdAt || 0).getTime();
      const remoteTime = new Date(rGroc.updatedAt || rGroc.createdAt || 0).getTime();
      if (remoteTime >= localTime) {
        mergedGroceries.push(rGroc as GroceryItem);
      } else {
        mergedGroceries.push(localG);
        grocsToUpload.push(localG);
      }
      localGrocMap.delete(id);
    }
  }
  for (const [_, lGroc] of localGrocMap.entries()) {
    mergedGroceries.push(lGroc);
    grocsToUpload.push(lGroc);
  }

  // Merge Grocery Categories
  const mergedCategories: GroceryCategory[] = [];
  const localCatMap = new Map((localState.groceryCategories || []).map((c) => [c.id, c]));
  const catsToUpload: GroceryCategory[] = [];

  for (const [id, rCat] of remoteGroceryCategories.entries()) {
    if (rCat.isDeleted) {
      localCatMap.delete(id);
      continue;
    }
    const localC = localCatMap.get(id);
    if (!localC) {
      mergedCategories.push(rCat as GroceryCategory);
    } else {
      mergedCategories.push(rCat as GroceryCategory);
      localCatMap.delete(id);
    }
  }
  for (const [_, lCat] of localCatMap.entries()) {
    mergedCategories.push(lCat);
    catsToUpload.push(lCat);
  }

  for (const g of grocsToUpload) {
    uploadPromises.push(
      setDoc(
        doc(db, 'users', uid, 'groceries', g.id),
        {
          ...g,
          userId: uid,
          updatedAt: g.updatedAt || nowIso,
        },
        { merge: true }
      )
    );
  }

  for (const c of catsToUpload) {
    uploadPromises.push(
      setDoc(
        doc(db, 'users', uid, 'groceryCategories', c.id),
        {
          ...c,
          userId: uid,
          updatedAt: nowIso,
        },
        { merge: true }
      )
    );
  }

  // Also update user sync state doc
  uploadPromises.push(
    setDoc(
      doc(db, 'users', uid, 'sync', 'state'),
      {
        userId: uid,
        version: localState.version || 1,
        customBillNames: localState.customBillNames || [],
        customCategories: localState.customCategories,
        settings: localState.settings,
        updatedAt: nowIso,
      },
      { merge: true }
    )
  );

  // Await upload batches with settlement inspection
  const uploadResults = await Promise.allSettled(uploadPromises);
  const successfulUploads = uploadResults.filter((r) => r.status === 'fulfilled').length;
  const failedUploads = uploadResults.filter((r) => r.status === 'rejected').length;

  const remoteSyncData = syncDocSnap.exists() ? syncDocSnap.data() : null;
  const finalSettings = remoteSyncData?.settings
    ? { ...localState.settings, ...remoteSyncData.settings }
    : localState.settings;

  const finalState: PesoTrackState = {
    version: localState.version || 1,
    accounts: mergedAccounts,
    transactions: mergedTransactions,
    bills: mergedBills,
    monthlyBillEntries: mergedEntries,
    receivables: mergedReceivables,
    budgets: Object.keys(mergedBudgets).length > 0 ? mergedBudgets : localState.budgets,
    recurringTransactions: localState.recurringTransactions || [],
    groceryItems: mergedGroceries,
    groceryCategories:
      mergedCategories.length > 0 ? mergedCategories : localState.groceryCategories,
    customBillNames: remoteSyncData?.customBillNames || localState.customBillNames || [],
    customCategories: remoteSyncData?.customCategories || localState.customCategories,
    settings: finalSettings,
    updatedAt: nowIso,
  };

  return {
    updatedState: finalState,
    flushedCount: flushRes.flushedCount,
    uploadedCount: successfulUploads,
    downloadedCount: totalDownloaded,
    hasPartialFailure: failedUploads > 0,
  };
}

/**
 * 10-Step Verification & Synchronization Pipeline for "Verify & Sync Now"
 */
export async function verifyAndSyncPipeline(
  localState: PesoTrackState
): Promise<DetailedSyncResult> {
  // Step 1: Verify that Firebase configuration exists
  if (!firebaseConfig || !firebaseConfig.projectId || !firebaseConfig.apiKey) {
    return {
      ok: false,
      status: 'config_missing',
      message: 'Firebase configuration missing.',
      detail: 'Please configure firebase-applet-config.json with your Firebase project credentials.',
      flushedCount: 0,
      uploadedCount: 0,
      downloadedCount: 0,
      updatedState: localState,
    };
  }

  // Step 2: Verify the current authentication session
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return {
      ok: false,
      status: 'unauthenticated',
      message: 'Please sign in.',
      detail: 'A signed-in account is required for cloud synchronization. All changes remain safe in your local vault.',
      flushedCount: 0,
      uploadedCount: 0,
      downloadedCount: 0,
      updatedState: localState,
    };
  }

  // Step 3: Verify that the authenticated account is email-verified
  const reloadRes = await reloadCurrentUser();
  const isGoogle = currentUser.providerData?.some((p) => p.providerId === 'google.com');
  const isVerified = Boolean(reloadRes.emailVerified || isGoogle);

  if (!isVerified) {
    return {
      ok: false,
      status: 'email_unverified',
      message: 'Email verification required.',
      detail: `An official verification link was sent to ${currentUser.email}. Please click the link in your email to enable cloud sync.`,
      flushedCount: 0,
      uploadedCount: 0,
      downloadedCount: 0,
      updatedState: localState,
    };
  }

  // Step 4: Verify Firestore reachability & internet connection
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      ok: false,
      status: 'offline',
      message: 'Internet unavailable — changes remain saved locally.',
      detail: 'Device is operating in offline mode. Records will sync automatically once an active connection returns.',
      flushedCount: 0,
      uploadedCount: 0,
      downloadedCount: 0,
      updatedState: localState,
    };
  }

  // Step 5: Verify Firestore Security Rules with a real health-check write to the user's isolated path
  try {
    await setDoc(
      doc(db, 'users', currentUser.uid, 'sync', 'health'),
      {
        verifiedCheckAt: new Date().toISOString(),
        userId: currentUser.uid,
      },
      { merge: true }
    );
  } catch (err: any) {
    if (isPermissionError(err)) {
      const code = err?.code || 'permission-denied';
      return {
        ok: false,
        status: 'permission_denied',
        firebaseErrorCode: code,
        message: 'Firestore permission denied — publish the security rules in Firebase Console.',
        detail: `Firebase error code: [${code}]. Project "${CURRENT_FIREBASE_PROJECT_ID}" rejected database operations. Copy and publish the security rules in Firebase Console.`,
        flushedCount: 0,
        uploadedCount: 0,
        downloadedCount: 0,
        updatedState: localState,
      };
    }
  }

  // Step 6-9: Execute Full Two-Way Sync Pipeline
  try {
    const syncRes = await performFullSync(currentUser.uid, localState);

    if (syncRes.hasPartialFailure) {
      return {
        ok: true,
        status: 'partially_synced',
        message: 'Synchronization partially completed.',
        detail: `${syncRes.flushedCount + syncRes.uploadedCount} changes uploaded, ${syncRes.downloadedCount} cloud records checked. Some items pending next retry.`,
        flushedCount: syncRes.flushedCount,
        uploadedCount: syncRes.uploadedCount,
        downloadedCount: syncRes.downloadedCount,
        updatedState: syncRes.updatedState,
      };
    }

    // Step 10: Confirm successful operations
    return {
      ok: true,
      status: 'synced',
      message: 'Synchronization completed.',
      detail: `All changes synchronized with project "${CURRENT_FIREBASE_PROJECT_ID}". Up to date with cloud.`,
      flushedCount: syncRes.flushedCount,
      uploadedCount: syncRes.uploadedCount,
      downloadedCount: syncRes.downloadedCount,
      updatedState: syncRes.updatedState,
    };
  } catch (err: any) {
    const parsed = parseSyncError(err);
    if (parsed.isPermissionDenied) {
      const code = (err as any)?.code || 'permission-denied';
      return {
        ok: false,
        status: 'permission_denied',
        firebaseErrorCode: code,
        message: 'Firestore permission denied — publish the security rules in Firebase Console.',
        detail: `Firebase error code: [${code}]. Security rules in project "${CURRENT_FIREBASE_PROJECT_ID}" need to be published in Firebase Console.`,
        flushedCount: 0,
        uploadedCount: 0,
        downloadedCount: 0,
        updatedState: localState,
      };
    }

    if (parsed.isOffline) {
      return {
        ok: false,
        status: 'offline',
        message: 'Internet unavailable — changes remain saved locally.',
        flushedCount: 0,
        uploadedCount: 0,
        downloadedCount: 0,
        updatedState: localState,
      };
    }

    return {
      ok: false,
      status: 'failed',
      message: 'Synchronization failed — local changes are preserved.',
      detail: err?.message || 'Could not complete synchronization.',
      flushedCount: 0,
      uploadedCount: 0,
      downloadedCount: 0,
      updatedState: localState,
    };
  }
}
