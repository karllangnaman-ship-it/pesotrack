import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth, isPermissionError } from './firebase';
import {
  FinancialAccount,
  TransactionRecord,
  BillDefinition,
  MonthlyBillEntry,
  MonthlyBudget,
  GroceryItem,
  GroceryCategory,
  JointWorkspace,
  JointActivityItem,
  BillPaymentRecord,
  RecurringTransaction,
  AppNotification,
} from '../types/finance';
import { logJointActivityApi } from './apiClient';

export interface JointWorkspaceState {
  workspace: JointWorkspace | null;
  accounts: FinancialAccount[];
  transactions: TransactionRecord[];
  bills: BillDefinition[];
  monthlyBillEntries: Record<string, MonthlyBillEntry>;
  budgets: Record<string, MonthlyBudget>;
  groceryItems: GroceryItem[];
  groceryCategories: GroceryCategory[];
  recurringTransactions: RecurringTransaction[];
  activities: JointActivityItem[];
  notifications: AppNotification[];
  isRealtimeActive: boolean;
  isOnline: boolean;
  lastSyncTime: string | null;
  pendingMutationCount: number;
}

export interface JointMutationItem {
  id: string;
  workspaceId: string;
  collectionName: string;
  docId: string;
  action: 'set' | 'update' | 'delete';
  data?: any;
  timestamp: string;
  activity?: {
    actorName: string;
    actionType: any;
    description: string;
    amount?: number;
  };
}

function getJointStorageKey(workspaceId: string): string {
  return `pesotrack_joint_cache_${workspaceId}`;
}

function getJointQueueKey(workspaceId: string): string {
  return `pesotrack_joint_queue_${workspaceId}`;
}

export function loadCachedJointState(workspaceId: string): Partial<JointWorkspaceState> | null {
  try {
    const raw = localStorage.getItem(getJointStorageKey(workspaceId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCachedJointState(workspaceId: string, state: Partial<JointWorkspaceState>): void {
  try {
    const existing = loadCachedJointState(workspaceId) || {};
    localStorage.setItem(getJointStorageKey(workspaceId), JSON.stringify({ ...existing, ...state }));
  } catch {}
}

export function getJointPendingQueue(workspaceId: string): JointMutationItem[] {
  try {
    const raw = localStorage.getItem(getJointQueueKey(workspaceId));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveJointPendingQueue(workspaceId: string, queue: JointMutationItem[]): void {
  try {
    localStorage.setItem(getJointQueueKey(workspaceId), JSON.stringify(queue));
  } catch {}
}

export function enqueueJointMutation(mutation: JointMutationItem): void {
  const current = getJointPendingQueue(mutation.workspaceId);
  const filtered = current.filter(
    (item) => !(item.collectionName === mutation.collectionName && item.docId === mutation.docId)
  );
  filtered.push(mutation);
  saveJointPendingQueue(mutation.workspaceId, filtered);
}

export function clearJointQueue(workspaceId: string): void {
  try {
    localStorage.removeItem(getJointQueueKey(workspaceId));
  } catch {}
}

/**
 * Flush offline joint mutations to Firestore when reconnected.
 */
export async function flushJointQueue(workspaceId: string): Promise<number> {
  const queue = getJointPendingQueue(workspaceId);
  if (queue.length === 0) return 0;

  const remaining: JointMutationItem[] = [];
  let flushed = 0;

  for (const item of queue) {
    try {
      const docRef = doc(db, 'jointWorkspaces', workspaceId, item.collectionName, item.docId);
      if (item.action === 'delete') {
        await setDoc(docRef, { id: item.docId, isDeleted: true, updatedAt: item.timestamp }, { merge: true });
      } else {
        await setDoc(docRef, item.data, { merge: true });
      }
      if (item.activity) {
        logJointActivityApi(workspaceId, {
          id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          jointWorkspaceId: workspaceId,
          actorUid: auth.currentUser?.uid || '',
          actorName: item.activity.actorName,
          actionType: item.activity.actionType,
          description: item.activity.description,
          amount: item.activity.amount,
          timestamp: item.timestamp,
        }).catch(() => {});
      }
      flushed++;
    } catch (err) {
      console.warn('[JointSync] Failed flushing queued item:', item, err);
      remaining.push(item);
    }
  }

  saveJointPendingQueue(workspaceId, remaining);
  return flushed;
}

/**
 * Realtime Subscription Manager for Joint Workspace.
 * Listens directly via Firestore onSnapshot for live changes made by either partner!
 */
export class JointRealtimeManager {
  private workspaceId: string;
  private unsubscribers: Unsubscribe[] = [];
  private onStateChange: (state: Partial<JointWorkspaceState>) => void;
  private isOnline = navigator.onLine;

  constructor(
    workspaceId: string,
    onStateChange: (state: Partial<JointWorkspaceState>) => void
  ) {
    this.workspaceId = workspaceId;
    this.onStateChange = onStateChange;
  }

  public start() {
    this.stop();
    if (!this.workspaceId) return;

    // 1. Workspace metadata listener
    const wsRef = doc(db, 'jointWorkspaces', this.workspaceId);
    const unWs = onSnapshot(
      wsRef,
      (snap) => {
        if (snap.exists()) {
          const ws = snap.data() as JointWorkspace;
          this.onStateChange({ workspace: ws, isRealtimeActive: true });
        }
      },
      (err) => {
        console.warn('[JointSync] Workspace metadata listener error:', err.message);
      }
    );
    this.unsubscribers.push(unWs);

    // 2. Accounts subcollection
    const accRef = collection(db, 'jointWorkspaces', this.workspaceId, 'accounts');
    const unAcc = onSnapshot(
      accRef,
      (snap) => {
        const accounts: FinancialAccount[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          if (!data.isDeleted) accounts.push(data);
        });
        this.onStateChange({ accounts, lastSyncTime: new Date().toISOString() });
      },
      (err) => console.warn('[JointSync] Accounts listener error:', err.message)
    );
    this.unsubscribers.push(unAcc);

    // 3. Transactions subcollection
    const txRef = collection(db, 'jointWorkspaces', this.workspaceId, 'transactions');
    const unTx = onSnapshot(
      txRef,
      (snap) => {
        const transactions: TransactionRecord[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          if (!data.isDeleted) transactions.push(data);
        });
        transactions.sort(
          (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
        );
        this.onStateChange({ transactions, lastSyncTime: new Date().toISOString() });
      },
      (err) => console.warn('[JointSync] Transactions listener error:', err.message)
    );
    this.unsubscribers.push(unTx);

    // 4. Bills subcollection
    const billsRef = collection(db, 'jointWorkspaces', this.workspaceId, 'bills');
    const unBills = onSnapshot(
      billsRef,
      (snap) => {
        const bills: BillDefinition[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          if (!data.isDeleted) bills.push(data);
        });
        this.onStateChange({ bills });
      },
      (err) => console.warn('[JointSync] Bills listener error:', err.message)
    );
    this.unsubscribers.push(unBills);

    // 5. Monthly Bill Entries subcollection
    const entriesRef = collection(db, 'jointWorkspaces', this.workspaceId, 'monthlyBillEntries');
    const unEntries = onSnapshot(
      entriesRef,
      (snap) => {
        const monthlyBillEntries: Record<string, MonthlyBillEntry> = {};
        snap.forEach((d) => {
          const data = d.data() as any;
          if (!data.isDeleted) monthlyBillEntries[data.id] = data;
        });
        this.onStateChange({ monthlyBillEntries });
      },
      (err) => console.warn('[JointSync] Monthly entries listener error:', err.message)
    );
    this.unsubscribers.push(unEntries);

    // 6. Budgets subcollection
    const budgetsRef = collection(db, 'jointWorkspaces', this.workspaceId, 'budgets');
    const unBudgets = onSnapshot(
      budgetsRef,
      (snap) => {
        const budgets: Record<string, MonthlyBudget> = {};
        snap.forEach((d) => {
          const data = d.data() as any;
          if (!data.isDeleted) budgets[data.monthKey || data.id] = data;
        });
        this.onStateChange({ budgets });
      },
      (err) => console.warn('[JointSync] Budgets listener error:', err.message)
    );
    this.unsubscribers.push(unBudgets);

    // 7. Groceries subcollection
    const grocRef = collection(db, 'jointWorkspaces', this.workspaceId, 'groceries');
    const unGroc = onSnapshot(
      grocRef,
      (snap) => {
        const groceryItems: GroceryItem[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          if (!data.isDeleted) groceryItems.push(data);
        });
        groceryItems.sort((a, b) => (a.isPurchased === b.isPurchased ? 0 : a.isPurchased ? 1 : -1));
        this.onStateChange({ groceryItems });
      },
      (err) => console.warn('[JointSync] Groceries listener error:', err.message)
    );
    this.unsubscribers.push(unGroc);

    // 8. Activity subcollection (timeline)
    const actRef = collection(db, 'jointWorkspaces', this.workspaceId, 'activity');
    const unAct = onSnapshot(
      actRef,
      (snap) => {
        const activities: JointActivityItem[] = [];
        snap.forEach((d) => activities.push(d.data() as JointActivityItem));
        activities.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        this.onStateChange({ activities: activities.slice(0, 60) });
      },
      (err) => console.warn('[JointSync] Activity listener error:', err.message)
    );
    this.unsubscribers.push(unAct);

    // 9. Recurring Transactions (Salary & Income streams) subcollection
    const recRef = collection(db, 'jointWorkspaces', this.workspaceId, 'recurringTransactions');
    const unRec = onSnapshot(
      recRef,
      (snap) => {
        const recurringTransactions: RecurringTransaction[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          if (!data.isDeleted) recurringTransactions.push(data);
        });
        recurringTransactions.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
        this.onStateChange({ recurringTransactions, lastSyncTime: new Date().toISOString() });
      },
      (err) => console.warn('[JointSync] Recurring transactions listener error:', err.message)
    );
    this.unsubscribers.push(unRec);

    // 10. Joint Notifications subcollection
    const notifRef = collection(db, 'jointWorkspaces', this.workspaceId, 'notifications');
    const unNotif = onSnapshot(
      notifRef,
      (snap) => {
        const notifications: AppNotification[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          if (!data.isDeleted) notifications.push(data);
        });
        notifications.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        this.onStateChange({ notifications: notifications.slice(0, 100) });
      },
      (err) => console.warn('[JointSync] Notifications listener error:', err.message)
    );
    this.unsubscribers.push(unNotif);

    // Flush any pending mutations if online
    if (navigator.onLine) {
      flushJointQueue(this.workspaceId).then((flushed) => {
        if (flushed > 0) {
          this.onStateChange({
            pendingMutationCount: getJointPendingQueue(this.workspaceId).length,
          });
        }
      });
    }
  }

  public stop() {
    this.unsubscribers.forEach((un) => {
      try {
        un();
      } catch {}
    });
    this.unsubscribers = [];
  }
}

/**
 * Mutation helper functions for the Joint Workspace
 */
function mapActionToNotificationType(actionType: string): any {
  if (actionType.includes('bill_paid')) return 'bill_paid';
  if (actionType.includes('bill')) return 'bill_due';
  if (actionType.includes('grocery_purchased')) return 'grocery_purchased';
  if (actionType.includes('grocery')) return 'grocery_added';
  if (actionType.includes('transaction_added')) return 'transaction_added';
  if (actionType.includes('transaction_deleted')) return 'transaction_deleted';
  if (actionType.includes('salary')) return 'salary_deposited';
  if (actionType.includes('account')) return 'account_updated';
  if (actionType.includes('budget')) return 'budget_alert';
  if (actionType.includes('member_joined')) return 'member_joined';
  if (actionType.includes('member_invited')) return 'member_invited';
  return 'general';
}

function getNotificationTitleForActivity(act: any): string {
  if (act.actionType === 'bill_paid') return 'Bill Paid';
  if (act.actionType === 'bill_created' || act.actionType === 'bill_added') return 'New Bill Added';
  if (act.actionType === 'grocery_purchased') return 'Groceries Purchased';
  if (act.actionType === 'grocery_added') return 'Grocery Item Added';
  if (act.actionType === 'transaction_added') return 'Shared Transaction';
  if (act.actionType === 'salary_added' || act.actionType === 'salary_deposited') return 'Salary / Income Stream';
  if (act.actionType === 'budget_updated') return 'Budget Updated';
  if (act.actionType === 'member_joined') return 'Partner Joined';
  if (act.actionType === 'member_invited') return 'Invitation Sent';
  return 'Household Activity';
}

function getTargetTabForEntity(entityType?: string): any {
  if (entityType === 'bill') return 'bills';
  if (entityType === 'grocery') return 'grocery-list';
  if (entityType === 'account') return 'accounts';
  if (entityType === 'transaction') return 'transactions';
  if (entityType === 'budget') return 'budgets';
  return 'activity';
}

export async function writeJointMutation(
  workspaceId: string,
  collectionName: string,
  docId: string,
  action: 'set' | 'update' | 'delete',
  data?: any,
  activity?: {
    actorName: string;
    actionType: any;
    description: string;
    amount?: number;
    actorAvatarColor?: string;
    entityType?: 'transaction' | 'account' | 'bill' | 'grocery' | 'budget' | 'member' | 'workspace';
    entityId?: string;
    entityName?: string;
    category?: string;
    changeSummary?: string;
  }
): Promise<boolean> {
  const now = new Date().toISOString();
  const mutationItem: JointMutationItem = {
    id: `jmut_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    workspaceId,
    collectionName,
    docId,
    action,
    data,
    timestamp: now,
    activity,
  };

  // If offline, queue and return
  if (!navigator.onLine) {
    enqueueJointMutation(mutationItem);
    return false;
  }

  try {
    const docRef = doc(db, 'jointWorkspaces', workspaceId, collectionName, docId);
    if (action === 'delete') {
      await setDoc(docRef, { id: docId, isDeleted: true, updatedAt: now }, { merge: true });
    } else {
      await setDoc(docRef, data, { merge: true });
    }

    if (activity) {
      const actId = `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const actData: JointActivityItem = {
        id: actId,
        jointWorkspaceId: workspaceId,
        actorUid: auth.currentUser?.uid || '',
        actorName: activity.actorName,
        actorAvatarColor: activity.actorAvatarColor || '#174F32',
        actionType: activity.actionType,
        description: activity.description,
        amount: activity.amount,
        entityType: activity.entityType,
        entityId: activity.entityId || docId,
        entityName: activity.entityName,
        category: activity.category,
        changeSummary: activity.changeSummary,
        timestamp: now,
      };

      // Write directly to subcollection so onSnapshot fires immediately
      setDoc(doc(db, 'jointWorkspaces', workspaceId, 'activity', actId), actData, { merge: true }).catch(() => {});

      // Also create a Joint notification for the workspace
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const notifData: AppNotification = {
        id: notifId,
        scope: 'joint',
        type: mapActionToNotificationType(activity.actionType),
        title: getNotificationTitleForActivity(activity),
        message: activity.description,
        timestamp: now,
        isRead: false,
        actorUid: auth.currentUser?.uid || '',
        actorName: activity.actorName,
        workspaceId,
        targetTab: getTargetTabForEntity(activity.entityType),
        targetId: docId,
      };
      setDoc(doc(db, 'jointWorkspaces', workspaceId, 'notifications', notifId), notifData, { merge: true }).catch(() => {});

      logJointActivityApi(workspaceId, actData).catch(() => {});
    }

    return true;
  } catch (err: any) {
    console.warn('[JointSync] Direct write failed, enqueuing:', err?.message);
    enqueueJointMutation(mutationItem);
    return false;
  }
}

export async function writeJointNotification(
  workspaceId: string,
  notification: AppNotification
): Promise<boolean> {
  try {
    const docRef = doc(db, 'jointWorkspaces', workspaceId, 'notifications', notification.id);
    await setDoc(docRef, notification, { merge: true });
    return true;
  } catch (err) {
    console.warn('[JointSync] writeJointNotification error:', err);
    return false;
  }
}
