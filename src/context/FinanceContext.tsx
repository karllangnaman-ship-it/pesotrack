import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AccountCategory,
  AccountPaymentRecord,
  AddBillInput,
  AddGroceryItemInput,
  AddReceivableInput,
  BillCategory,
  BillDefinition,
  BillPaymentRecord,
  ConvertGroceriesToExpenseInput,
  CreditAccountInfo,
  CreditPurchaseOrDrawdown,
  DEFAULT_BILL_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_GROCERY_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_NOTIFICATION_SETTINGS,
  FinancialAccount,
  GroceryCategory,
  GroceryItem,
  LoanAccountInfo,
  MonthlyBillEntry,
  MonthlyBudget,
  NotificationSettings,
  PesoTrackState,
  ReceivablePaymentRecord,
  ReceivablePaymentSchedule,
  ReceivableRecord,
  RecordBillPaymentInput,
  RecordReceivablePaymentInput,
  RecurrenceFrequency,
  RecurringTransaction,
  SavingsGoalInfo,
  ThemeMode,
  TransactionRecord,
  UserSettings,
} from '../types/finance';
import { fromCentavos, getMonthKey, toCentavos } from '../utils/currency';
import { calculateEstimatedItemTotal, DEFAULT_GROCERY_ITEMS } from '../utils/groceryEngine';
import {
  calculateAccountBalance,
  calculateNetWorthSummary,
  calculateReceivablesSummary,
  createInitialPesoTrackState,
  getReceivableStatus,
  NetWorthSummary,
  reconcileAllAccounts,
  ReconciledAccount,
  ReceivablesSummary,
} from '../utils/financeEngine';
import { calculateReceivableTermsAndSchedule } from '../utils/loanCalculations';
import { applyThemeToDom, resolveIsDarkMode } from '../utils/theme';
import { initCapacitorApp } from '../utils/capacitorApp';
import {
  reconcileAllLocalReminders,
  sanitizeNotificationSettings,
  sendImmediateTestNotification,
} from '../utils/notificationService';
import {
  AuthUser,
  logoutUser,
  subscribeToAuth,
  isUserVerifiedOnThisDevice,
  saveVerifiedSession,
  clearVerifiedSession,
  getLastVerifiedUid,
  reloadCurrentUser,
} from '../services/authService';
import { User } from 'firebase/auth';
import {
  enqueueChange,
  flushSyncQueue,
  getPendingQueue,
  performFullSync,
  restoreAccountDataFromCloud,
  verifyAndSyncPipeline,
  SyncStatus,
  fetchUserCloudBackup,
  createLocalSafetyBackup,
  getLocalSafetyBackup,
} from '../services/syncService';
import { pingBackendHealth, BackendHealthResult } from '../services/apiClient';
import { BackupSummary } from '../utils/backupService';
import { auth, testFirestoreConnection } from '../services/firebase';
import {
  parseSyncError,
  CURRENT_FIREBASE_PROJECT_ID,
} from '../utils/firestoreRulesHelper';
import { AuthModal } from '../components/AuthModal';
import { FirstTimeMigrationModal } from '../components/FirstTimeMigrationModal';
import {
  computeWidgetMetrics,
  syncWidgetFinancialData,
  clearNativeWidgetData,
} from '../services/widgetBridgeService';

const GUEST_STORAGE_KEY = 'pesotrack_state_v1';
const LOCAL_STORAGE_KEY = GUEST_STORAGE_KEY;
const LAST_ACTIVE_UID_KEY = 'pesotrack_last_active_uid';
const LAST_SYNC_TIME_KEY = 'pesotrack_last_sync_time';

function getUserStorageKey(uid?: string | null): string {
  return uid ? `pesotrack_workspace_${uid}` : GUEST_STORAGE_KEY;
}

export function advanceDueDate(dateStr: string, frequency: RecurrenceFrequency): string {
  try {
    const [y, m, d] = (dateStr || new Date().toISOString().slice(0, 10))
      .slice(0, 10)
      .split('-')
      .map(Number);
    const date = new Date(y, (m || 1) - 1, d || 1);
    if (frequency === 'daily') {
      date.setDate(date.getDate() + 1);
    } else if (frequency === 'weekly') {
      date.setDate(date.getDate() + 7);
    } else if (frequency === 'monthly') {
      date.setMonth(date.getMonth() + 1);
    } else if (frequency === 'annually') {
      date.setFullYear(date.getFullYear() + 1);
    }
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    const nd = String(date.getDate()).padStart(2, '0');
    return `${ny}-${nm}-${nd}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export interface AddAccountInput {
  providerId: string;
  name: string;
  category: AccountCategory;
  startingBalance: number;
  totalRepayment?: number;
  description?: string;
  customColor?: string;
  accountNumberMasked?: string;
  savingsGoal?: SavingsGoalInfo;
  creditInfo?: CreditAccountInfo;
  loanInfo?: LoanAccountInfo;
}

export interface AddTransactionInput {
  type: TransactionRecord['type'];
  amount: number;
  accountId: string;
  destinationAccountId?: string;
  category: string;
  merchantOrTitle: string;
  dateTime: string;
  notes?: string;
  adjustmentSign?: 'positive' | 'negative';
  interestPortion?: number;
  transferFee?: number;
}

interface FinanceContextValue {
  state: PesoTrackState;
  reconciledAccounts: ReconciledAccount[];
  netWorthSummary: NetWorthSummary;
  receivables: ReceivableRecord[];
  receivablesSummary: ReceivablesSummary;
  isDarkMode: boolean;
  isLoading: boolean;
  syncError: string | null;
  toastMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
  clearToast: () => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  toggleHideBalances: () => void;
  addAccount: (input: AddAccountInput) => ReconciledAccount | null;
  updateAccount: (accountId: string, updates: Partial<AddAccountInput>) => boolean;
  deleteAccount: (accountId: string) => void;
  toggleArchiveAccount: (accountId: string) => void;
  addTransaction: (input: AddTransactionInput) => TransactionRecord | null;
  updateTransaction: (txId: string, input: AddTransactionInput) => boolean;
  deleteTransaction: (txId: string) => void;
  saveMonthlyBudget: (monthKey: string, budget: MonthlyBudget) => void;
  updateSettings: (updates: Partial<UserSettings>) => void;
  importBackupJSON: (
    rawJson: string,
    mode: 'merge' | 'replace'
  ) => { ok: boolean; message: string };
  resetToDefaultDemo: () => void;
  clearAllData: () => void;
  // Money Owed to Me (Receivables)
  addReceivable: (input: AddReceivableInput) => ReceivableRecord | null;
  updateReceivable: (id: string, updates: Partial<AddReceivableInput>) => boolean;
  deleteReceivable: (id: string) => void;
  recordReceivablePayment: (input: RecordReceivablePaymentInput) => boolean;
  deleteReceivablePayment: (receivableId: string, paymentId: string) => boolean;
  // Recurring Activities
  recurringTransactions: RecurringTransaction[];
  addRecurringTransaction: (
    input: Omit<RecurringTransaction, 'id' | 'createdAt'>
  ) => RecurringTransaction;
  updateRecurringTransaction: (
    id: string,
    updates: Partial<RecurringTransaction>
  ) => boolean;
  deleteRecurringTransaction: (id: string) => void;
  toggleRecurringActive: (id: string) => void;
  recordRecurringPayment: (id: string) => TransactionRecord | null;
  // Customizable Categories
  customCategories: { expense: string[]; income: string[] };
  addCustomCategory: (type: 'expense' | 'income', name: string) => boolean;
  renameCustomCategory: (
    type: 'expense' | 'income',
    oldName: string,
    newName: string
  ) => boolean;
  deleteCustomCategory: (type: 'expense' | 'income', name: string) => boolean;
  reorderCustomCategories: (
    type: 'expense' | 'income',
    categories: string[]
  ) => void;
  resetCategoriesToDefault: () => void;
  // Multiple Installments / Purchases
  addAccountPurchase: (
    accountId: string,
    purchase: Omit<
      CreditPurchaseOrDrawdown,
      'id' | 'createdAt' | 'remainingBalance' | 'totalPaid' | 'status'
    >
  ) => CreditPurchaseOrDrawdown | null;
  updateAccountPurchase: (
    accountId: string,
    purchaseId: string,
    updates: Partial<CreditPurchaseOrDrawdown>
  ) => boolean;
  deleteAccountPurchase: (accountId: string, purchaseId: string) => boolean;
  recordPurchasePayment: (
    accountId: string,
    purchaseId: string,
    payment: {
      amount: number;
      date?: string;
      notes?: string;
      sourceAccountId?: string;
    }
  ) => boolean;
  recordBatchAccountPayment: (
    accountId: string,
    allocations: { purchaseId: string; amount: number }[],
    payment: {
      totalAmount: number;
      date?: string;
      notes?: string;
      sourceAccountId?: string;
    }
  ) => boolean;
  enableMultipleTransactionsForAccount: (accountId: string) => boolean;
  payCreditBill: (
    accountId: string,
    payment: {
      amount: number;
      date?: string;
      sourceAccountId?: string;
      notes?: string;
    }
  ) => boolean;
  recordLoanPayment: (
    accountId: string,
    payment: {
      amount: number;
      date?: string;
      sourceAccountId?: string;
      notes?: string;
      interestPortion?: number;
    }
  ) => boolean;
  // Monthly Bills & Variable Expenses
  bills: BillDefinition[];
  monthlyBillEntries: Record<string, MonthlyBillEntry>;
  customBillNames: string[];
  addBill: (input: AddBillInput) => BillDefinition | null;
  updateBill: (billId: string, updates: Partial<BillDefinition>) => boolean;
  deleteBill: (billId: string) => void;
  updateMonthlyBillEntry: (
    billId: string,
    monthKey: string,
    updates: Partial<MonthlyBillEntry>
  ) => boolean;
  recordBillPayment: (input: RecordBillPaymentInput) => boolean;
  deleteBillPayment: (
    billId: string,
    monthKey: string,
    paymentId: string
  ) => boolean;
  saveCustomBillName: (name: string) => void;
  // Local Notifications & Reminders
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => void;
  testLocalNotification: () => Promise<{ ok: boolean; message: string }>;
  // Firebase Authentication & Offline Cloud Sync
  currentUser: AuthUser | null;
  unverifiedUser: User | null;
  setUnverifiedUser: (user: User | null) => void;
  handleVerifiedUser: (user: User) => void;
  isOnline: boolean;
  syncStatus: SyncStatus;
  lastSyncTime: string | null;
  pendingSyncCount: number;
  syncNow: () => Promise<void>;
  isRulesPermissionError: boolean;
  firebaseProjectId: string;
  clearSyncError: () => void;
  openAuthModal: (mode?: 'login' | 'register' | 'forgot') => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register' | 'forgot';
  logout: () => Promise<void>;
  // Vercel Online Backend & Separate Cloud Restore Integration
  backendStatus: BackendHealthResult;
  checkBackendHealth: () => Promise<void>;
  restoreFromCloudVault: (
    mode: 'merge' | 'replace'
  ) => Promise<{ ok: boolean; message: string; summary?: BackupSummary }>;
  getCloudBackupOverview: () => Promise<{
    ok: boolean;
    hasCloudData: boolean;
    summary?: BackupSummary;
    message?: string;
  }>;
  getLocalSafetyBackupInfo: () => { state: PesoTrackState; createdAt: string } | null;
  // Grocery List Management
  groceryItems: GroceryItem[];
  groceryCategories: GroceryCategory[];
  addGroceryItem: (input: AddGroceryItemInput) => GroceryItem | null;
  updateGroceryItem: (id: string, updates: Partial<AddGroceryItemInput>) => boolean;
  deleteGroceryItem: (id: string) => boolean;
  toggleGroceryPurchased: (id: string) => boolean;
  duplicateGroceryItem: (id: string) => GroceryItem | null;
  moveGroceryItemCategory: (id: string, newCategory: string) => boolean;
  addGroceryCategory: (cat: { name: string; icon?: string; description?: string }) => GroceryCategory | null;
  updateGroceryCategory: (id: string, updates: Partial<GroceryCategory>) => boolean;
  deleteGroceryCategory: (id: string, targetCategoryForItems?: string) => boolean;
  convertGroceriesToExpense: (input: ConvertGroceriesToExpenseInput) => {
    success: boolean;
    transaction?: TransactionRecord;
    message?: string;
  };
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

function validateAndSanitizeState(raw: unknown): PesoTrackState | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<PesoTrackState>;
  if (!Array.isArray(candidate.accounts) || !Array.isArray(candidate.transactions)) {
    return null;
  }
  const fallback = createInitialPesoTrackState();
  return {
    version: candidate.version || 1,
    accounts: candidate.accounts,
    transactions: candidate.transactions,
    budgets:
      candidate.budgets && typeof candidate.budgets === 'object'
        ? candidate.budgets
        : fallback.budgets,
    recurringTransactions: Array.isArray(candidate.recurringTransactions)
      ? candidate.recurringTransactions
      : fallback.recurringTransactions || [],
    bills: Array.isArray(candidate.bills) ? candidate.bills : fallback.bills || [],
    monthlyBillEntries:
      candidate.monthlyBillEntries && typeof candidate.monthlyBillEntries === 'object'
        ? candidate.monthlyBillEntries
        : {},
    customBillNames: Array.isArray(candidate.customBillNames)
      ? candidate.customBillNames
      : fallback.customBillNames || [
          'Condo Dues',
          'Tuition Fee',
          'Groceries',
          'Car Maintenance',
          'Gym Membership',
          'Pet Care',
        ],
    customCategories: {
      expense:
        candidate.customCategories?.expense &&
        Array.isArray(candidate.customCategories.expense)
          ? candidate.customCategories.expense
          : fallback.customCategories?.expense || DEFAULT_EXPENSE_CATEGORIES,
      income:
        candidate.customCategories?.income &&
        Array.isArray(candidate.customCategories.income)
          ? candidate.customCategories.income
          : fallback.customCategories?.income || DEFAULT_INCOME_CATEGORIES,
    },
    receivables: Array.isArray(candidate.receivables) ? candidate.receivables : [],
    groceryItems: Array.isArray(candidate.groceryItems)
      ? candidate.groceryItems
      : fallback.groceryItems || DEFAULT_GROCERY_ITEMS,
    groceryCategories:
      Array.isArray(candidate.groceryCategories) && candidate.groceryCategories.length > 0
        ? candidate.groceryCategories
        : fallback.groceryCategories || DEFAULT_GROCERY_CATEGORIES,
    settings: {
      ...fallback.settings,
      ...(candidate.settings || {}),
      themeMode:
        candidate.settings?.themeMode ||
        (candidate.settings?.darkMode ? 'dark' : 'system'),
      themeColor:
        candidate.settings?.themeColor &&
        ['forest', 'ocean', 'purple', 'teal', 'sunset', 'rose', 'crimson', 'amber', 'monochrome'].includes(
          candidate.settings.themeColor
        )
          ? candidate.settings.themeColor
          : (fallback.settings.themeColor || 'forest'),
      notificationSettings: sanitizeNotificationSettings({
        ...(fallback.settings.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS),
        ...(candidate.settings?.notificationSettings || {}),
      }),
    },
    updatedAt: candidate.updatedAt || new Date().toISOString(),
  };
}

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [unverifiedUser, setUnverifiedUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_SYNC_TIME_KEY);
    } catch {
      return null;
    }
  });
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  const [state, setState] = useState<PesoTrackState>(() => {
    try {
      const lastUid = typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_ACTIVE_UID_KEY) : null;
      const key = getUserStorageKey(lastUid);
      const saved = localStorage.getItem(key) || localStorage.getItem(GUEST_STORAGE_KEY);
      if (saved) {
        const parsed = validateAndSanitizeState(JSON.parse(saved));
        if (parsed) return parsed;
      }
    } catch (e) {
      console.error('Failed to read localStorage state:', e);
    }
    return createInitialPesoTrackState();
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isRulesPermissionError, setIsRulesPermissionError] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (
    text: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    setToastMessage({ text, type });
  };

  const clearToast = () => setToastMessage(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Persist workspace changes locally to user or guest storage
  useEffect(() => {
    try {
      const key = getUserStorageKey(currentUser?.uid);
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error('Failed saving to localStorage:', e);
    }

    // Synchronize native Android home-screen widgets with live data
    try {
      const metrics = computeWidgetMetrics(
        state.transactions,
        Boolean(currentUser),
        currentUser?.displayName || state.settings.profileName
      );
      syncWidgetFinancialData(metrics);
    } catch (err) {
      console.warn('[FinanceContext] Widget update error:', err);
    }
  }, [state, currentUser]);

  // Helper to enqueue a mutation for offline sync and flush when online
  const queueMutation = (
    entityType:
      | 'accounts'
      | 'transactions'
      | 'bills'
      | 'monthlyBillEntries'
      | 'budgets'
      | 'receivables'
      | 'sync_state',
    entityId: string,
    action: 'upsert' | 'delete',
    data?: any
  ) => {
    if (currentUser?.uid) {
      enqueueChange(currentUser.uid, entityType, entityId, action, data);
      const qLen = getPendingQueue(currentUser.uid).length;
      setPendingSyncCount(qLen);
      if (navigator.onLine) {
        flushSyncQueue(currentUser.uid)
          .then(() => {
            setPendingSyncCount(getPendingQueue(currentUser.uid).length);
          })
          .catch((err) => {
            console.warn('[Sync] Queue flush deferred (offline or unreachable):', err);
          });
      }
    }
  };

  const isNetworkOrOfflineError = (err: any): boolean => {
    if (!err) return false;
    const msg = (err?.message || String(err)).toLowerCase();
    const code = err?.code || '';
    return (
      code === 'unavailable' ||
      code === 'deadline-exceeded' ||
      msg.includes('unavailable') ||
      msg.includes('offline') ||
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('could not reach')
    );
  };

  // Full synchronization routine
  const triggerSync = async (uid: string) => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }
    // Only attempt cloud sync if authenticated and email is verified
    if (!currentUser || !currentUser.emailVerified) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const res = await performFullSync(uid, state);
      if (res.error) {
        const parsed = parseSyncError(res.error);
        if (parsed.isPermissionDenied) {
          setIsRulesPermissionError(true);
          setSyncStatus('error');
          setSyncError(parsed.detailedMessage);
        } else if (parsed.isOffline) {
          setIsRulesPermissionError(false);
          setSyncStatus('offline');
          setSyncError(parsed.detailedMessage);
        } else {
          setIsRulesPermissionError(false);
          setSyncStatus('error');
          setSyncError(parsed.detailedMessage);
        }
      } else {
        setIsRulesPermissionError(false);
        setState(res.updatedState);
        setSyncStatus('synced');
        const nowIso = new Date().toISOString();
        setLastSyncTime(nowIso);
        localStorage.setItem(LAST_SYNC_TIME_KEY, nowIso);
        setPendingSyncCount(getPendingQueue(uid).length);
      }
    } catch (err: any) {
      const parsed = parseSyncError(err);
      if (parsed.isPermissionDenied) {
        setIsRulesPermissionError(true);
        setSyncStatus('error');
        setSyncError(parsed.detailedMessage);
      } else if (parsed.isOffline) {
        setIsRulesPermissionError(false);
        setSyncStatus('offline');
        setSyncError(parsed.detailedMessage);
      } else {
        setIsRulesPermissionError(false);
        setSyncStatus('error');
        setSyncError(parsed.detailedMessage);
      }
    }
  };

  const syncNow = async () => {
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const result = await verifyAndSyncPipeline(state);
      switch (result.status) {
        case 'config_missing':
          setSyncStatus('error');
          setSyncError(result.detail || result.message);
          showToast(result.message, 'error');
          break;
        case 'unauthenticated':
          setSyncStatus('offline');
          setAuthModalMode('login');
          setIsAuthModalOpen(true);
          showToast(result.message, 'info');
          break;
        case 'email_unverified':
          setSyncStatus('error');
          setSyncError(result.detail || result.message);
          if (auth.currentUser) {
            setUnverifiedUser(auth.currentUser);
          }
          showToast(result.message, 'error');
          break;
        case 'offline':
          setSyncStatus('offline');
          setSyncError(result.detail || result.message);
          showToast(result.message, 'info');
          break;
        case 'permission_denied':
          setIsRulesPermissionError(true);
          setSyncStatus('error');
          setSyncError(result.detail || result.message);
          showToast(result.message, 'error');
          break;
        case 'partially_synced':
          setIsRulesPermissionError(false);
          setState(result.updatedState);
          setSyncStatus('synced');
          const partialTime = new Date().toISOString();
          setLastSyncTime(partialTime);
          localStorage.setItem(LAST_SYNC_TIME_KEY, partialTime);
          if (currentUser?.uid) {
            setPendingSyncCount(getPendingQueue(currentUser.uid).length);
          }
          showToast(result.message, 'info');
          break;
        case 'synced':
          setIsRulesPermissionError(false);
          setSyncError(null);
          setState(result.updatedState);
          setSyncStatus('synced');
          const nowIso = new Date().toISOString();
          setLastSyncTime(nowIso);
          localStorage.setItem(LAST_SYNC_TIME_KEY, nowIso);
          setPendingSyncCount(0);
          showToast(result.message, 'success');
          break;
        case 'failed':
        default:
          setSyncStatus('error');
          setSyncError(result.detail || result.message);
          showToast(result.message, 'error');
          break;
      }
    } catch (err: any) {
      const parsed = parseSyncError(err);
      if (parsed.isPermissionDenied) {
        setIsRulesPermissionError(true);
        setSyncStatus('error');
        setSyncError(parsed.detailedMessage);
        showToast('Firestore permission denied — publish the correct security rules.', 'error');
      } else if (parsed.isOffline) {
        setSyncStatus('offline');
        setSyncError(parsed.detailedMessage);
        showToast('Internet unavailable — changes remain saved locally.', 'info');
      } else {
        setSyncStatus('error');
        setSyncError(err?.message || 'Synchronization failed — local changes are preserved.');
        showToast('Synchronization failed — local changes are preserved.', 'error');
      }
    }
  };

  // Vercel Backend Health Monitoring
  const [backendStatus, setBackendStatus] = useState<BackendHealthResult>({
    isDeviceOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isBackendReachable: false,
  });

  const checkBackendHealth = async () => {
    try {
      const res = await pingBackendHealth();
      setBackendStatus(res);
    } catch {
      setBackendStatus({
        isDeviceOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        isBackendReachable: false,
        message: 'Backend ping failed.',
      });
    }
  };

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      checkBackendHealth();
    }
  }, [isOnline]);

  const getCloudBackupOverview = async (): Promise<{
    ok: boolean;
    hasCloudData: boolean;
    summary?: BackupSummary;
    message?: string;
  }> => {
    if (!currentUser?.uid) {
      return {
        ok: false,
        hasCloudData: false,
        message: 'Please sign in to access your cloud vault.',
      };
    }
    if (!navigator.onLine) {
      return {
        ok: false,
        hasCloudData: false,
        message: 'Internet unavailable. Device is operating in offline mode.',
      };
    }

    const res = await fetchUserCloudBackup(currentUser.uid, state);
    return {
      ok: res.ok,
      hasCloudData: res.hasCloudData,
      summary: res.summary,
      message: res.message,
    };
  };

  const getLocalSafetyBackupInfo = () => {
    return getLocalSafetyBackup();
  };

  const restoreFromCloudVault = async (
    mode: 'merge' | 'replace'
  ): Promise<{ ok: boolean; message: string; summary?: BackupSummary }> => {
    if (!currentUser?.uid) {
      openAuthModal('login');
      return {
        ok: false,
        message: 'Please sign in to restore your cloud vault.',
      };
    }

    if (!navigator.onLine) {
      showToast('Internet unavailable — your local data is preserved.', 'info');
      return {
        ok: false,
        message: 'Internet unavailable. Connect to internet to restore cloud backup.',
      };
    }

    setIsLoading(true);
    try {
      const res = await fetchUserCloudBackup(currentUser.uid, state);

      if (!res.ok || !res.hasCloudData || !res.restoredState) {
        showToast(res.message || 'No cloud records found in this account.', 'info');
        return {
          ok: false,
          message: res.message || 'No cloud records found.',
        };
      }

      const cloudState = res.restoredState;
      const userKey = getUserStorageKey(currentUser.uid);

      if (mode === 'replace') {
        // CRITICAL: Create automatic local safety backup BEFORE replacing local workspace!
        createLocalSafetyBackup(state);

        setState(cloudState);
        localStorage.setItem(userKey, JSON.stringify(cloudState));
        showToast(
          `Safety backup saved! Restored ${cloudState.accounts.length} accounts and ${cloudState.transactions.length} transactions from cloud vault.`,
          'success'
        );
        return {
          ok: true,
          message: 'Successfully replaced local vault with cloud backup.',
          summary: res.summary,
        };
      } else {
        // Merge mode: preserve existing local records and merge missing/newer cloud records
        const localAccMap = new Map(state.accounts.map((a) => [a.id, a]));
        for (const cAcc of cloudState.accounts) {
          if (!localAccMap.has(cAcc.id)) {
            localAccMap.set(cAcc.id, cAcc);
          }
        }

        const localTxMap = new Map(state.transactions.map((t) => [t.id, t]));
        for (const cTx of cloudState.transactions) {
          if (!localTxMap.has(cTx.id)) {
            localTxMap.set(cTx.id, cTx);
          }
        }

        const localBillMap = new Map((state.bills || []).map((b) => [b.id, b]));
        for (const cBill of cloudState.bills || []) {
          if (!localBillMap.has(cBill.id)) {
            localBillMap.set(cBill.id, cBill);
          }
        }

        const mergedEntries = {
          ...(state.monthlyBillEntries || {}),
          ...(cloudState.monthlyBillEntries || {}),
        };

        const localRecMap = new Map((state.receivables || []).map((r) => [r.id, r]));
        for (const cRec of cloudState.receivables || []) {
          if (!localRecMap.has(cRec.id)) {
            localRecMap.set(cRec.id, cRec);
          }
        }

        const mergedBudgets = {
          ...(state.budgets || {}),
          ...(cloudState.budgets || {}),
        };

        const mergedState: PesoTrackState = {
          version: state.version || 1,
          accounts: Array.from(localAccMap.values()),
          transactions: Array.from(localTxMap.values()).sort(
            (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
          ),
          bills: Array.from(localBillMap.values()),
          monthlyBillEntries: mergedEntries,
          receivables: Array.from(localRecMap.values()),
          budgets: mergedBudgets,
          recurringTransactions: state.recurringTransactions || [],
          customBillNames: Array.from(
            new Set([...(state.customBillNames || []), ...(cloudState.customBillNames || [])])
          ),
          customCategories: {
            expense: Array.from(
              new Set([
                ...(state.customCategories?.expense || []),
                ...(cloudState.customCategories?.expense || []),
              ])
            ),
            income: Array.from(
              new Set([
                ...(state.customCategories?.income || []),
                ...(cloudState.customCategories?.income || []),
              ])
            ),
          },
          settings: {
            ...cloudState.settings,
            ...state.settings,
          },
          updatedAt: new Date().toISOString(),
        };

        setState(mergedState);
        localStorage.setItem(userKey, JSON.stringify(mergedState));
        showToast('Cloud records merged into your local vault!', 'success');
        return {
          ok: true,
          message: 'Successfully merged cloud backup into local vault.',
          summary: res.summary,
        };
      }
    } catch (err: any) {
      console.error('[CloudRestore] Error restoring cloud data:', err);
      showToast('Could not restore from cloud vault. Local records preserved.', 'error');
      return {
        ok: false,
        message: err?.message || 'Failed restoring from cloud.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (currentUser?.uid) {
      const pending = getPendingQueue(currentUser.uid).length;
      if (pending > 0 && navigator.onLine) {
        try {
          await flushSyncQueue(currentUser.uid);
        } catch (e) {
          console.warn('[Logout] Flush failed before logout:', e);
        }
      }
      clearVerifiedSession(currentUser.uid);
    }
    setIsRulesPermissionError(false);
    setSyncError(null);
    setCurrentUser(null);
    setUnverifiedUser(null);
    localStorage.removeItem(LAST_ACTIVE_UID_KEY);
    try {
      const guestRaw = localStorage.getItem(GUEST_STORAGE_KEY);
      if (guestRaw) {
        const parsed = validateAndSanitizeState(JSON.parse(guestRaw));
        setState(parsed || createInitialPesoTrackState());
      } else {
        setState(createInitialPesoTrackState());
      }
    } catch {
      setState(createInitialPesoTrackState());
    }
    await logoutUser();
    await clearNativeWidgetData();
    showToast('Signed out of cloud account. Switched to local vault.', 'info');
  };

  const handleVerifiedUser = (user: User) => {
    saveVerifiedSession(user);
    const authUser: AuthUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      emailVerified: true,
      isAnonymous: user.isAnonymous,
    };
    setUnverifiedUser(null);
    setCurrentUser(authUser);
    localStorage.setItem(LAST_ACTIVE_UID_KEY, user.uid);
    showToast('Email verified! Opening your cloud vault...', 'success');
    if (navigator.onLine) {
      triggerSync(user.uid);
    }
  };

  const openAuthModal = (mode: 'login' | 'register' | 'forgot' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => setIsAuthModalOpen(false);

  // First-time local data migration handlers
  const handleAssociateLocalData = async () => {
    if (!currentUser?.uid) return;
    const uid = currentUser.uid;
    const userStorageKey = getUserStorageKey(uid);
    localStorage.setItem(userStorageKey, JSON.stringify(state));

    state.accounts.forEach((acc) => enqueueChange(uid, 'accounts', acc.id, 'upsert', acc));
    state.transactions.forEach((tx) => enqueueChange(uid, 'transactions', tx.id, 'upsert', tx));
    (state.bills || []).forEach((b) => enqueueChange(uid, 'bills', b.id, 'upsert', b));
    Object.entries(state.monthlyBillEntries || {}).forEach(([k, e]) =>
      enqueueChange(uid, 'monthlyBillEntries', k, 'upsert', e)
    );
    (state.receivables || []).forEach((r) => enqueueChange(uid, 'receivables', r.id, 'upsert', r));
    Object.entries(state.budgets || {}).forEach(([k, b]) => enqueueChange(uid, 'budgets', k, 'upsert', b));
    enqueueChange(uid, 'sync_state', 'state', 'upsert', {
      settings: state.settings,
      customCategories: state.customCategories,
    });

    setIsMigrationModalOpen(false);
    showToast('Local records linked to your account! Syncing...', 'success');
    if (navigator.onLine) {
      triggerSync(uid);
    }
  };

  const handleStartFreshWorkspace = async () => {
    if (!currentUser?.uid) return;
    const uid = currentUser.uid;
    const userStorageKey = getUserStorageKey(uid);
    const fresh = createInitialPesoTrackState();
    setState(fresh);
    localStorage.setItem(userStorageKey, JSON.stringify(fresh));
    setIsMigrationModalOpen(false);
    showToast('Fresh workspace created for this account.', 'info');
    if (navigator.onLine) {
      triggerSync(uid);
    }
  };

  // Auth observer, verification check, offline session restoration, and cloud data restore
  useEffect(() => {
    const unsub = subscribeToAuth(async (fbUser) => {
      if (fbUser) {
        const isGoogle = fbUser.providerData?.some((p) => p.providerId === 'google.com');

        if (navigator.onLine) {
          try {
            await fbUser.reload();
          } catch (e) {
            console.warn('[Auth] Reload user error:', e);
          }
        }

        const isVerified = Boolean(fbUser.emailVerified || isGoogle);

        if (isVerified) {
          saveVerifiedSession(fbUser);
          const authUser: AuthUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            emailVerified: true,
            isAnonymous: fbUser.isAnonymous,
          };
          setCurrentUser(authUser);
          setUnverifiedUser(null);
          localStorage.setItem(LAST_ACTIVE_UID_KEY, fbUser.uid);
          setPendingSyncCount(getPendingQueue(fbUser.uid).length);

          const userKey = getUserStorageKey(fbUser.uid);
          const saved = localStorage.getItem(userKey);

          if (saved) {
            try {
              const parsed = validateAndSanitizeState(JSON.parse(saved));
              if (parsed) setState(parsed);
            } catch (e) {
              console.error('Failed parsing workspace:', e);
            }
            if (navigator.onLine) {
              triggerSync(fbUser.uid);
            }
          } else {
            // New device scenario: restore available records from Cloud Firestore
            let cloudRestored = false;
            if (navigator.onLine) {
              try {
                const restoreRes = await restoreAccountDataFromCloud(fbUser.uid, state);
                if (restoreRes.hasCloudData) {
                  setState(restoreRes.restoredState);
                  localStorage.setItem(userKey, JSON.stringify(restoreRes.restoredState));
                  cloudRestored = true;
                  showToast(
                    `Restored ${restoreRes.accountsCount} accounts and ${restoreRes.transactionsCount} transactions from your cloud vault!`,
                    'success'
                  );
                  triggerSync(fbUser.uid);
                  return;
                }
              } catch (err) {
                console.warn('[Sync] Cloud restore check failed:', err);
              }
            }

            if (!cloudRestored) {
              // Check if guest has existing records before deciding
              const guestRaw = localStorage.getItem(GUEST_STORAGE_KEY);
              let hasRecords = false;
              if (guestRaw) {
                try {
                  const p = JSON.parse(guestRaw);
                  if (
                    p &&
                    ((p.accounts && p.accounts.length > 0) ||
                      (p.transactions && p.transactions.length > 0) ||
                      (p.bills && p.bills.length > 0))
                  ) {
                    hasRecords = true;
                  }
                } catch {}
              }

              if (hasRecords) {
                setIsMigrationModalOpen(true);
              } else {
                const fresh = createInitialPesoTrackState();
                setState(fresh);
                localStorage.setItem(userKey, JSON.stringify(fresh));
                if (navigator.onLine) {
                  triggerSync(fbUser.uid);
                }
              }
            }
          }
        } else {
          // User exists in Firebase, but email is NOT verified
          // Offline policy: If user was previously verified on this device, allow offline access
          if (!navigator.onLine && isUserVerifiedOnThisDevice(fbUser.uid)) {
            const authUser: AuthUser = {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName,
              emailVerified: true,
              isAnonymous: fbUser.isAnonymous,
            };
            setCurrentUser(authUser);
            setUnverifiedUser(null);
            setSyncStatus('offline');
            const userKey = getUserStorageKey(fbUser.uid);
            const saved = localStorage.getItem(userKey);
            if (saved) {
              try {
                const parsed = validateAndSanitizeState(JSON.parse(saved));
                if (parsed) setState(parsed);
              } catch {}
            }
          } else {
            // Block access: Do not mark as authenticated, set unverifiedUser to show verification screen
            setCurrentUser(null);
            setUnverifiedUser(fbUser);
          }
        }
      } else {
        setCurrentUser(null);
        setUnverifiedUser(null);
        localStorage.removeItem(LAST_ACTIVE_UID_KEY);
        setPendingSyncCount(0);
        try {
          const guestRaw = localStorage.getItem(GUEST_STORAGE_KEY);
          if (guestRaw) {
            const parsed = validateAndSanitizeState(JSON.parse(guestRaw));
            if (parsed) setState(parsed);
            else setState(createInitialPesoTrackState());
          } else {
            setState(createInitialPesoTrackState());
          }
        } catch {
          setState(createInitialPesoTrackState());
        }
      }
    });

    return () => unsub();
  }, []);

  // Network connectivity listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('synced');
      if (currentUser?.uid) {
        flushSyncQueue(currentUser.uid).then(() => {
          setPendingSyncCount(getPendingQueue(currentUser.uid).length);
          triggerSync(currentUser.uid);
        });
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser]);

  // Reactive listener for OS / system appearance preference
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  // Synchronized theme resolution: 'light' | 'dark' | 'system'
  const isDarkMode = useMemo(() => {
    const tm = state.settings.themeMode;
    if (tm === 'dark') return true;
    if (tm === 'light') return false;
    if (tm === 'system') return systemPrefersDark;
    return typeof state.settings.darkMode === 'boolean'
      ? state.settings.darkMode
      : systemPrefersDark;
  }, [state.settings.themeMode, state.settings.darkMode, systemPrefersDark]);

  // Apply theme to DOM and native Capacitor status bar
  useEffect(() => {
    applyThemeToDom(isDarkMode, state.settings.themeColor);
    initCapacitorApp(isDarkMode);
  }, [isDarkMode, state.settings.themeColor]);

  const reconciledAccounts = useMemo(
    () => reconcileAllAccounts(state.accounts, state.transactions),
    [state.accounts, state.transactions]
  );

  const netWorthSummary = useMemo(
    () => calculateNetWorthSummary(reconciledAccounts),
    [reconciledAccounts]
  );

  const receivables = useMemo(
    () => state.receivables || [],
    [state.receivables]
  );

  const receivablesSummary = useMemo(
    () => calculateReceivablesSummary(receivables),
    [receivables]
  );

  const bills = useMemo(() => state.bills || [], [state.bills]);
  const monthlyBillEntries = useMemo(
    () => state.monthlyBillEntries || {},
    [state.monthlyBillEntries]
  );
  const customBillNames = useMemo(
    () => state.customBillNames || [],
    [state.customBillNames]
  );
  const notificationSettings = useMemo(
    () => sanitizeNotificationSettings(state.settings.notificationSettings),
    [state.settings.notificationSettings]
  );

  // Sync scheduled local notifications whenever bills, debts, or settings change
  useEffect(() => {
    reconcileAllLocalReminders(
      state,
      reconciledAccounts,
      state.receivables || []
    ).catch((err) => {
      console.warn('[FinanceContext] Reminder reconciliation failed:', err);
    });
  }, [
    state.bills,
    state.monthlyBillEntries,
    state.settings.notificationSettings,
    reconciledAccounts,
    state.receivables,
  ]);

  const toggleHideBalances = () => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        hideBalances: !prev.settings.hideBalances,
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  const addAccount = (input: AddAccountInput): ReconciledAccount | null => {
    const cleanName = input.name.trim();
    const safeStarting = fromCentavos(toCentavos(input.startingBalance || 0));
    if (!cleanName || safeStarting < 0) {
      showToast('Please provide a valid account name and starting balance.', 'error');
      return null;
    }

    const nowIso = new Date().toISOString();
    const newId = `acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const newAccount: FinancialAccount = {
      id: newId,
      providerId: input.providerId,
      name: cleanName,
      category: input.category,
      startingBalance: safeStarting,
      totalRepayment:
        input.totalRepayment !== undefined
          ? input.totalRepayment
          : input.category === 'Loans'
          ? input.loanInfo?.totalRepayment
          : input.category === 'Credit'
          ? input.creditInfo?.totalRepayment
          : undefined,
      description: input.description?.trim() || undefined,
      customColor: input.customColor,
      accountNumberMasked: input.accountNumberMasked?.trim() || undefined,
      createdAt: nowIso,
      savingsGoal: input.savingsGoal,
      creditInfo: input.creditInfo,
      loanInfo: input.loanInfo,
    };

    const newTransactions = [...state.transactions];
    if (safeStarting > 0) {
      newTransactions.unshift({
        id: `tx_start_${newId}`,
        type: 'adjustment',
        adjustmentSign: 'positive',
        amount: safeStarting,
        accountId: newId,
        category: 'Starting Balance',
        merchantOrTitle: 'Starting Balance',
        dateTime: nowIso,
        notes: `Initial ${input.category.toLowerCase()} balance`,
        isStartingBalance: true,
      });
    }

    const nextAccounts = [...state.accounts, newAccount];
    setState((prev) => ({
      ...prev,
      accounts: nextAccounts,
      transactions: newTransactions,
      updatedAt: nowIso,
    }));

    queueMutation('accounts', newAccount.id, 'upsert', newAccount);
    if (newTransactions.length > 0 && newTransactions[0].id.startsWith('tx_start_')) {
      queueMutation('transactions', newTransactions[0].id, 'upsert', newTransactions[0]);
    }

    showToast(`Added ${cleanName} (${input.category})`, 'success');
    const reconciled = reconcileAllAccounts([newAccount], newTransactions)[0];
    return reconciled;
  };

  const updateAccount = (
    accountId: string,
    updates: Partial<AddAccountInput>
  ): boolean => {
    const existing = state.accounts.find((a) => a.id === accountId);
    if (!existing) return false;

    const nowIso = new Date().toISOString();
    const nextStarting =
      updates.startingBalance !== undefined
        ? fromCentavos(toCentavos(updates.startingBalance))
        : existing.startingBalance;

    const nextTotalRepayment =
      updates.totalRepayment !== undefined
        ? updates.totalRepayment
        : updates.loanInfo?.totalRepayment ??
          updates.creditInfo?.totalRepayment ??
          existing.totalRepayment;

    const updatedAccount: FinancialAccount = {
      ...existing,
      providerId: updates.providerId ?? existing.providerId,
      name: updates.name ? updates.name.trim() : existing.name,
      category: updates.category ?? existing.category,
      startingBalance: nextStarting,
      totalRepayment: nextTotalRepayment,
      description:
        updates.description !== undefined
          ? updates.description.trim() || undefined
          : existing.description,
      customColor: updates.customColor ?? existing.customColor,
      accountNumberMasked:
        updates.accountNumberMasked !== undefined
          ? updates.accountNumberMasked.trim() || undefined
          : existing.accountNumberMasked,
      savingsGoal:
        updates.savingsGoal !== undefined
          ? updates.savingsGoal
          : existing.savingsGoal,
      creditInfo:
        updates.creditInfo !== undefined ? updates.creditInfo : existing.creditInfo,
      loanInfo: updates.loanInfo !== undefined ? updates.loanInfo : existing.loanInfo,
    };

    let nextTransactions = [...state.transactions];
    const startTxIdx = nextTransactions.findIndex(
      (t) => t.accountId === accountId && t.isStartingBalance
    );

    if (updates.startingBalance !== undefined) {
      if (startTxIdx >= 0) {
        if (nextStarting > 0) {
          nextTransactions[startTxIdx] = {
            ...nextTransactions[startTxIdx],
            amount: nextStarting,
          };
        } else {
          nextTransactions.splice(startTxIdx, 1);
        }
      } else if (nextStarting > 0) {
        nextTransactions.push({
          id: `tx_start_${accountId}`,
          type: 'adjustment',
          adjustmentSign: 'positive',
          amount: nextStarting,
          accountId,
          category: 'Starting Balance',
          merchantOrTitle: 'Starting Balance',
          dateTime: existing.createdAt || nowIso,
          isStartingBalance: true,
        });
      }
    }

    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) => (a.id === accountId ? updatedAccount : a)),
      transactions: nextTransactions,
      updatedAt: nowIso,
    }));

    queueMutation('accounts', updatedAccount.id, 'upsert', updatedAccount);
    showToast(`Updated ${updatedAccount.name}`, 'success');
    return true;
  };

  const deleteAccount = (accountId: string) => {
    const target = state.accounts.find((a) => a.id === accountId);
    if (!target) return;

    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.filter((a) => a.id !== accountId),
      transactions: prev.transactions.filter(
        (t) => t.accountId !== accountId && t.destinationAccountId !== accountId
      ),
      updatedAt: new Date().toISOString(),
    }));
    queueMutation('accounts', accountId, 'delete');
    showToast(`Deleted account ${target.name}`, 'info');
  };

  const toggleArchiveAccount = (accountId: string) => {
    const target = state.accounts.find((a) => a.id === accountId);
    if (!target) return;

    const nextArchived = !target.archived;
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.id === accountId ? { ...a, archived: nextArchived } : a
      ),
      updatedAt: new Date().toISOString(),
    }));
    showToast(
      nextArchived ? `Archived ${target.name}` : `Restored ${target.name}`,
      'info'
    );
  };

  const addAccountPurchase = (
    accountId: string,
    input: Omit<
      CreditPurchaseOrDrawdown,
      'id' | 'createdAt' | 'remainingBalance' | 'totalPaid' | 'status'
    >
  ): CreditPurchaseOrDrawdown | null => {
    const target = state.accounts.find((a) => a.id === accountId);
    if (!target) {
      showToast('Account not found.', 'error');
      return null;
    }

    const principal = fromCentavos(toCentavos(input.principal));
    if (principal <= 0) {
      showToast('Principal amount must be greater than ₱0.00', 'error');
      return null;
    }

    const totalRepay =
      input.totalRepayment && input.totalRepayment > 0
        ? fromCentavos(toCentavos(input.totalRepayment))
        : principal;

    const termMonths = Math.max(1, Math.round(input.termMonths || 12));
    const monthlyPayment =
      input.monthlyPayment && input.monthlyPayment > 0
        ? fromCentavos(toCentavos(input.monthlyPayment))
        : fromCentavos(toCentavos(totalRepay / termMonths));

    // 1. One Limit Per Account – strictly isolated, cannot exceed this account's available limit
    if (target.category === 'Credit' && target.creditInfo) {
      const limit = target.creditInfo.creditLimit || 0;
      const existingPurchases = target.creditInfo.purchases || [];
      const currentUsed = existingPurchases.reduce(
        (sum, p) => sum + (p.remainingBalance > 0 ? p.remainingBalance : 0),
        0
      );
      const available = Math.max(0, limit - currentUsed);
      if (principal > available) {
        showToast(
          `Transaction amount (₱${principal.toLocaleString('en-US', { minimumFractionDigits: 2 })}) exceeds available credit limit of ₱${available.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          'error'
        );
        return null;
      }
    }

    if (target.category === 'Loans' && target.loanInfo) {
      const limit = target.loanInfo.creditLimit || target.loanInfo.originalPrincipal || 0;
      if (limit > 0) {
        const existingDrawdowns = target.loanInfo.drawdowns || [];
        const currentUsed = existingDrawdowns.reduce(
          (sum, d) => sum + (d.remainingBalance > 0 ? d.remainingBalance : 0),
          0
        );
        const available = Math.max(0, limit - currentUsed);
        if (principal > available) {
          showToast(
            `Transaction amount (₱${principal.toLocaleString('en-US', { minimumFractionDigits: 2 })}) exceeds available loan limit of ₱${available.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            'error'
          );
          return null;
        }
      }
    }

    const newPurchase: CreditPurchaseOrDrawdown = {
      id: `pur_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: input.name.trim() || 'New Transaction',
      principal,
      totalRepayment: totalRepay,
      termMonths,
      startDate: input.startDate || new Date().toISOString().slice(0, 10),
      firstPaymentDate:
        input.firstPaymentDate ||
        input.startDate ||
        new Date().toISOString().slice(0, 10),
      dueDay: input.dueDay >= 1 && input.dueDay <= 31 ? input.dueDay : 15,
      interestRate: input.interestRate,
      interestAmount: input.interestAmount,
      interestRateType: input.interestRateType,
      customMonthlyPayment: input.customMonthlyPayment,
      isManualPayment: input.isManualPayment,
      monthlyPayment,
      totalInterest: Math.max(0, fromCentavos(toCentavos(totalRepay - principal))),
      remainingBalance: totalRepay,
      totalPaid: 0,
      status: 'active',
      payments: [],
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) => {
        if (a.id !== accountId) return a;
        if (a.category === 'Credit') {
          const currentPurchases = a.creditInfo?.purchases || [];
          return {
            ...a,
            creditInfo: {
              ...(a.creditInfo || {
                creditLimit: 50000,
                statementDay: 15,
                dueDay: 5,
                reminderEnabled: true,
              }),
              enableMultipleInstallments: true,
              purchases: [...currentPurchases, newPurchase],
            },
          };
        } else if (a.category === 'Loans') {
          const currentDrawdowns = a.loanInfo?.drawdowns || [];
          const establishedLoanLimit =
            a.loanInfo?.creditLimit || a.loanInfo?.originalPrincipal || principal;
          const origPrincipal =
            a.loanInfo?.originalPrincipal || establishedLoanLimit;

          return {
            ...a,
            loanInfo: {
              ...(a.loanInfo || {
                originalPrincipal: origPrincipal,
                interestRateAnnual: 12,
                termMonths: 12,
                monthlyInstallmentEstimate: monthlyPayment,
                dueDay: 15,
                startDate: new Date().toISOString().slice(0, 10),
                repaymentModel: 'flat_rate',
                reminderEnabled: true,
              }),
              // Preserve original credit/loan limit - do NOT overwrite!
              creditLimit: establishedLoanLimit,
              originalPrincipal: origPrincipal,
              enableMultipleInstallments: true,
              drawdowns: [...currentDrawdowns, newPurchase],
            },
          };
        }
        return a;
      }),
      updatedAt: new Date().toISOString(),
    }));

    showToast(`Added "${newPurchase.name}"`, 'success');
    return newPurchase;
  };

  const updateAccountPurchase = (
    accountId: string,
    purchaseId: string,
    updates: Partial<CreditPurchaseOrDrawdown>
  ): boolean => {
    let found = false;
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) => {
        if (a.id !== accountId) return a;
        if (a.category === 'Credit' && a.creditInfo?.purchases) {
          const updated = a.creditInfo.purchases.map((p) => {
            if (p.id !== purchaseId) return p;
            found = true;
            const nextTotalRepay =
              updates.totalRepayment !== undefined
                ? updates.totalRepayment
                : p.totalRepayment;
            const nextRemaining =
              updates.remainingBalance !== undefined
                ? updates.remainingBalance
                : Math.max(0, nextTotalRepay - (p.totalPaid || 0));
            return {
              ...p,
              ...updates,
              totalRepayment: nextTotalRepay,
              remainingBalance: nextRemaining,
              status: (nextRemaining <= 0 ? 'completed' : 'active') as 'completed' | 'active',
            };
          });
          return {
            ...a,
            creditInfo: {
              ...a.creditInfo,
              purchases: updated,
            },
          };
        }
        if (a.category === 'Loans' && a.loanInfo?.drawdowns) {
          const updated = a.loanInfo.drawdowns.map((d) => {
            if (d.id !== purchaseId) return d;
            found = true;
            const nextTotalRepay =
              updates.totalRepayment !== undefined
                ? updates.totalRepayment
                : d.totalRepayment;
            const nextRemaining =
              updates.remainingBalance !== undefined
                ? updates.remainingBalance
                : Math.max(0, nextTotalRepay - (d.totalPaid || 0));
            return {
              ...d,
              ...updates,
              totalRepayment: nextTotalRepay,
              remainingBalance: nextRemaining,
              status: (nextRemaining <= 0 ? 'completed' : 'active') as 'completed' | 'active',
            };
          });
          return {
            ...a,
            loanInfo: {
              ...a.loanInfo,
              drawdowns: updated,
            },
          };
        }
        return a;
      }),
      updatedAt: new Date().toISOString(),
    }));

    if (found) {
      showToast('Purchase updated successfully.', 'success');
    }
    return found;
  };

  const deleteAccountPurchase = (
    accountId: string,
    purchaseId: string
  ): boolean => {
    let deleted = false;
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) => {
        if (a.id !== accountId) return a;
        if (a.category === 'Credit' && a.creditInfo?.purchases) {
          deleted = true;
          return {
            ...a,
            creditInfo: {
              ...a.creditInfo,
              purchases: a.creditInfo.purchases.filter((p) => p.id !== purchaseId),
            },
          };
        }
        if (a.category === 'Loans' && a.loanInfo?.drawdowns) {
          deleted = true;
          return {
            ...a,
            loanInfo: {
              ...a.loanInfo,
              drawdowns: a.loanInfo.drawdowns.filter((d) => d.id !== purchaseId),
            },
          };
        }
        return a;
      }),
      updatedAt: new Date().toISOString(),
    }));
    if (deleted) {
      showToast('Deleted purchase record.', 'info');
    }
    return deleted;
  };

  const recordPurchasePayment = (
    accountId: string,
    purchaseId: string,
    payment: {
      amount: number;
      date?: string;
      notes?: string;
      sourceAccountId?: string;
    }
  ): boolean => {
    const target = state.accounts.find((a) => a.id === accountId);
    if (!target) return false;

    const safeAmount = fromCentavos(toCentavos(payment.amount));
    if (safeAmount <= 0) {
      showToast('Payment amount must be greater than ₱0.00', 'error');
      return false;
    }

    const payDate = payment.date || new Date().toISOString().slice(0, 10);
    const payRecordId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    let targetPurchaseName = 'Purchase';

    let txToRecord: TransactionRecord | null = null;
    if (payment.sourceAccountId) {
      const txId = `tx_pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      txToRecord = {
        id: txId,
        type: 'transfer',
        amount: safeAmount,
        accountId: payment.sourceAccountId,
        destinationAccountId: accountId,
        category: target.category === 'Credit' ? 'Credit Payment' : 'Loan Payment',
        merchantOrTitle: `Payment for ${target.name}`,
        dateTime: new Date(payDate + 'T12:00:00').toISOString(),
        notes: payment.notes || 'Installment payment',
      };
    }

    let updatedSuccess = false;

    setState((prev) => {
      const updatedAccounts = prev.accounts.map((a) => {
        if (a.id !== accountId) return a;
        if (a.category === 'Credit' && a.creditInfo?.purchases) {
          const newPurchases = a.creditInfo.purchases.map((p) => {
            if (p.id !== purchaseId) return p;
            updatedSuccess = true;
            targetPurchaseName = p.name;
            const newTotalPaid = fromCentavos(toCentavos(p.totalPaid + safeAmount));
            const newRemaining = Math.max(
              0,
              fromCentavos(toCentavos(p.remainingBalance - safeAmount))
            );
            const newStatus: 'active' | 'completed' =
              newRemaining <= 0 ? 'completed' : 'active';
            const newPaymentEntry: AccountPaymentRecord = {
              id: payRecordId,
              date: payDate,
              amount: safeAmount,
              notes: payment.notes,
              sourceAccountId: payment.sourceAccountId,
              transactionId: txToRecord?.id,
            };
            return {
              ...p,
              totalPaid: newTotalPaid,
              remainingBalance: newRemaining,
              status: newStatus,
              payments: [...(p.payments || []), newPaymentEntry],
            };
          });
          return {
            ...a,
            creditInfo: {
              ...a.creditInfo,
              purchases: newPurchases,
            },
          };
        }
        if (a.category === 'Loans' && a.loanInfo?.drawdowns) {
          const newDrawdowns = a.loanInfo.drawdowns.map((d) => {
            if (d.id !== purchaseId) return d;
            updatedSuccess = true;
            targetPurchaseName = d.name;
            const newTotalPaid = fromCentavos(toCentavos(d.totalPaid + safeAmount));
            const newRemaining = Math.max(
              0,
              fromCentavos(toCentavos(d.remainingBalance - safeAmount))
            );
            const newStatus: 'active' | 'completed' =
              newRemaining <= 0 ? 'completed' : 'active';
            const newPaymentEntry: AccountPaymentRecord = {
              id: payRecordId,
              date: payDate,
              amount: safeAmount,
              notes: payment.notes,
              sourceAccountId: payment.sourceAccountId,
              transactionId: txToRecord?.id,
            };
            return {
              ...d,
              totalPaid: newTotalPaid,
              remainingBalance: newRemaining,
              status: newStatus,
              payments: [...(d.payments || []), newPaymentEntry],
            };
          });
          return {
            ...a,
            loanInfo: {
              ...a.loanInfo,
              drawdowns: newDrawdowns,
            },
          };
        }
        return a;
      });

      const nextTransactions = txToRecord
        ? [
            {
              ...txToRecord,
              merchantOrTitle: `Payment: ${targetPurchaseName} (${target.name})`,
            },
            ...prev.transactions,
          ]
        : prev.transactions;

      return {
        ...prev,
        accounts: updatedAccounts,
        transactions: nextTransactions,
        updatedAt: new Date().toISOString(),
      };
    });

    if (updatedSuccess) {
      showToast(
        `Recorded ₱${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} payment for "${targetPurchaseName}"`,
        'success'
      );
    }
    return updatedSuccess;
  };

  const recordBatchAccountPayment = (
    accountId: string,
    allocations: { purchaseId: string; amount: number }[],
    payment: {
      totalAmount: number;
      date?: string;
      notes?: string;
      sourceAccountId?: string;
    }
  ): boolean => {
    const target = state.accounts.find((a) => a.id === accountId);
    if (!target) return false;

    const safeTotal = fromCentavos(toCentavos(payment.totalAmount));
    if (safeTotal <= 0 || allocations.length === 0) {
      showToast('Payment amount and allocations must be greater than ₱0.00', 'error');
      return false;
    }

    const payDate = payment.date || new Date().toISOString().slice(0, 10);
    const allocMap = new Map<string, number>();
    for (const alloc of allocations) {
      const amt = fromCentavos(toCentavos(alloc.amount));
      if (amt > 0) {
        allocMap.set(alloc.purchaseId, amt);
      }
    }

    if (allocMap.size === 0) {
      showToast('No valid allocation amounts provided', 'error');
      return false;
    }

    const txId = payment.sourceAccountId
      ? `tx_batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      : undefined;

    let txToRecord: TransactionRecord | null = null;
    if (payment.sourceAccountId && txId) {
      txToRecord = {
        id: txId,
        type: 'transfer',
        amount: safeTotal,
        accountId: payment.sourceAccountId,
        destinationAccountId: accountId,
        category: target.category === 'Credit' ? 'Credit Payment' : 'Loan Payment',
        merchantOrTitle: `Payment to ${target.name} (${allocMap.size} items)`,
        dateTime: new Date(payDate + 'T12:00:00').toISOString(),
        notes: payment.notes || `Allocated payment across ${allocMap.size} items`,
      };
    }

    let updatedCount = 0;

    setState((prev) => {
      const updatedAccounts = prev.accounts.map((a) => {
        if (a.id !== accountId) return a;
        if (a.category === 'Credit' && a.creditInfo?.purchases) {
          const newPurchases = a.creditInfo.purchases.map((p) => {
            const allocAmt = allocMap.get(p.id);
            if (!allocAmt) return p;
            updatedCount++;
            const newTotalPaid = fromCentavos(toCentavos(p.totalPaid + allocAmt));
            const newRemaining = Math.max(
              0,
              fromCentavos(toCentavos(p.remainingBalance - allocAmt))
            );
            const newStatus: 'active' | 'completed' =
              newRemaining <= 0 ? 'completed' : 'active';
            const payEntry: AccountPaymentRecord = {
              id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              date: payDate,
              amount: allocAmt,
              notes: payment.notes || 'Batch allocation payment',
              sourceAccountId: payment.sourceAccountId,
              transactionId: txId,
            };
            return {
              ...p,
              totalPaid: newTotalPaid,
              remainingBalance: newRemaining,
              status: newStatus,
              payments: [...(p.payments || []), payEntry],
            };
          });
          return {
            ...a,
            creditInfo: {
              ...a.creditInfo,
              purchases: newPurchases,
            },
          };
        }
        if (a.category === 'Loans' && a.loanInfo?.drawdowns) {
          const newDrawdowns = a.loanInfo.drawdowns.map((d) => {
            const allocAmt = allocMap.get(d.id);
            if (!allocAmt) return d;
            updatedCount++;
            const newTotalPaid = fromCentavos(toCentavos(d.totalPaid + allocAmt));
            const newRemaining = Math.max(
              0,
              fromCentavos(toCentavos(d.remainingBalance - allocAmt))
            );
            const newStatus: 'active' | 'completed' =
              newRemaining <= 0 ? 'completed' : 'active';
            const payEntry: AccountPaymentRecord = {
              id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              date: payDate,
              amount: allocAmt,
              notes: payment.notes || 'Batch allocation payment',
              sourceAccountId: payment.sourceAccountId,
              transactionId: txId,
            };
            return {
              ...d,
              totalPaid: newTotalPaid,
              remainingBalance: newRemaining,
              status: newStatus,
              payments: [...(d.payments || []), payEntry],
            };
          });
          return {
            ...a,
            loanInfo: {
              ...a.loanInfo,
              drawdowns: newDrawdowns,
            },
          };
        }
        return a;
      });

      const nextTransactions = txToRecord
        ? [txToRecord, ...prev.transactions]
        : prev.transactions;

      return {
        ...prev,
        accounts: updatedAccounts,
        transactions: nextTransactions,
        updatedAt: new Date().toISOString(),
      };
    });

    if (updatedCount > 0) {
      showToast(
        `Allocated ₱${safeTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} across ${updatedCount} ${target.category === 'Credit' ? 'purchases' : 'borrowings'}`,
        'success'
      );
    }
    return updatedCount > 0;
  };

  const payCreditBill = (
    accountId: string,
    payment: {
      amount: number;
      date?: string;
      sourceAccountId?: string;
      notes?: string;
    }
  ): boolean => {
    const target = state.accounts.find((a) => a.id === accountId);
    if (!target || target.category !== 'Credit') {
      showToast('Selected account is not a valid credit account', 'error');
      return false;
    }

    const safeAmount = fromCentavos(toCentavos(payment.amount));
    if (safeAmount <= 0) {
      showToast('Payment amount must be greater than ₱0.00', 'error');
      return false;
    }

    const payDate = payment.date || new Date().toISOString().slice(0, 10);
    const payRecordId = `pay_credit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const txId = `tx_credit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    let txToRecord: TransactionRecord;
    if (payment.sourceAccountId) {
      const sourceAcc = state.accounts.find((a) => a.id === payment.sourceAccountId);
      txToRecord = {
        id: txId,
        type: 'transfer',
        amount: safeAmount,
        accountId: payment.sourceAccountId,
        destinationAccountId: accountId,
        category: 'Credit Payment',
        merchantOrTitle: `Credit Bill Payment – ${target.name}`,
        dateTime: new Date(payDate + 'T12:00:00').toISOString(),
        notes: payment.notes
          ? `${payment.notes} (Paid via ${sourceAcc?.name || 'Wallet'})`
          : `Credit bill payment via ${sourceAcc?.name || 'Wallet'}`,
      };
    } else {
      txToRecord = {
        id: txId,
        type: 'adjustment',
        amount: safeAmount,
        accountId: accountId,
        adjustmentSign: 'negative',
        category: 'Credit Payment',
        merchantOrTitle: `Credit Bill Payment – ${target.name}`,
        dateTime: new Date(payDate + 'T12:00:00').toISOString(),
        notes: payment.notes || 'Direct credit bill payment',
      };
    }

    setState((prev) => {
      const updatedAccounts = prev.accounts.map((a) => {
        if (a.id !== accountId) return a;

        if (
          a.creditInfo?.enableMultipleInstallments &&
          a.creditInfo.purchases &&
          a.creditInfo.purchases.length > 0
        ) {
          let remainingToAllocate = safeAmount;
          const newPurchases = a.creditInfo.purchases.map((p) => {
            if (remainingToAllocate <= 0 || p.remainingBalance <= 0) return p;
            const alloc = Math.min(p.remainingBalance, remainingToAllocate);
            remainingToAllocate = fromCentavos(toCentavos(remainingToAllocate - alloc));
            const newTotalPaid = fromCentavos(toCentavos(p.totalPaid + alloc));
            const newRemaining = Math.max(0, fromCentavos(toCentavos(p.remainingBalance - alloc)));
            const newStatus: 'active' | 'completed' = newRemaining <= 0 ? 'completed' : 'active';
            const payEntry: AccountPaymentRecord = {
              id: `${payRecordId}_${p.id}`,
              date: payDate,
              amount: alloc,
              notes: payment.notes || 'Credit bill payment',
              sourceAccountId: payment.sourceAccountId,
              transactionId: txId,
            };
            return {
              ...p,
              totalPaid: newTotalPaid,
              remainingBalance: newRemaining,
              status: newStatus,
              payments: [...(p.payments || []), payEntry],
            };
          });

          return {
            ...a,
            creditInfo: {
              ...a.creditInfo,
              purchases: newPurchases,
            },
          };
        }

        return a;
      });

      const nextTxs = [txToRecord, ...prev.transactions];
      const nextState: PesoTrackState = {
        ...prev,
        accounts: updatedAccounts,
        transactions: nextTxs,
        updatedAt: new Date().toISOString(),
      };

      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextState));
      } catch (err) {
        console.error('LocalStorage write error:', err);
      }

      return nextState;
    });

    showToast(
      `Recorded ₱${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} credit bill payment for "${target.name}"`,
      'success'
    );
    return true;
  };

  const recordLoanPayment = (
    accountId: string,
    payment: {
      amount: number;
      date?: string;
      sourceAccountId?: string;
      notes?: string;
      interestPortion?: number;
    }
  ): boolean => {
    const target = state.accounts.find((a) => a.id === accountId);
    if (!target || target.category !== 'Loans') {
      showToast('Selected account is not a valid loan account', 'error');
      return false;
    }

    const safeAmount = fromCentavos(toCentavos(payment.amount));
    if (safeAmount <= 0) {
      showToast('Payment amount must be greater than ₱0.00', 'error');
      return false;
    }

    const payDate = payment.date || new Date().toISOString().slice(0, 10);
    const payRecordId = `pay_loan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const txId = `tx_loan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    let txToRecord: TransactionRecord;
    if (payment.sourceAccountId) {
      const sourceAcc = state.accounts.find((a) => a.id === payment.sourceAccountId);
      txToRecord = {
        id: txId,
        type: 'transfer',
        amount: safeAmount,
        accountId: payment.sourceAccountId,
        destinationAccountId: accountId,
        category: 'Loan Payment',
        merchantOrTitle: `Loan Repayment – ${target.name}`,
        interestPortion: payment.interestPortion || 0,
        dateTime: new Date(payDate + 'T12:00:00').toISOString(),
        notes: payment.notes
          ? `${payment.notes} (Paid via ${sourceAcc?.name || 'Wallet'})`
          : `Loan payment via ${sourceAcc?.name || 'Wallet'}`,
      };
    } else {
      txToRecord = {
        id: txId,
        type: 'adjustment',
        amount: safeAmount,
        accountId: accountId,
        adjustmentSign: 'negative',
        category: 'Loan Payment',
        merchantOrTitle: `Loan Repayment – ${target.name}`,
        interestPortion: payment.interestPortion || 0,
        dateTime: new Date(payDate + 'T12:00:00').toISOString(),
        notes: payment.notes || 'Direct loan payment',
      };
    }

    setState((prev) => {
      const updatedAccounts = prev.accounts.map((a) => {
        if (a.id !== accountId) return a;

        if (
          a.loanInfo?.enableMultipleInstallments &&
          a.loanInfo.drawdowns &&
          a.loanInfo.drawdowns.length > 0
        ) {
          let remainingToAllocate = safeAmount;
          const newDrawdowns = a.loanInfo.drawdowns.map((d) => {
            if (remainingToAllocate <= 0 || d.remainingBalance <= 0) return d;
            const alloc = Math.min(d.remainingBalance, remainingToAllocate);
            remainingToAllocate = fromCentavos(toCentavos(remainingToAllocate - alloc));
            const newTotalPaid = fromCentavos(toCentavos(d.totalPaid + alloc));
            const newRemaining = Math.max(0, fromCentavos(toCentavos(d.remainingBalance - alloc)));
            const newStatus: 'active' | 'completed' = newRemaining <= 0 ? 'completed' : 'active';
            const payEntry: AccountPaymentRecord = {
              id: `${payRecordId}_${d.id}`,
              date: payDate,
              amount: alloc,
              notes: payment.notes || 'Loan repayment',
              sourceAccountId: payment.sourceAccountId,
              transactionId: txId,
            };
            return {
              ...d,
              totalPaid: newTotalPaid,
              remainingBalance: newRemaining,
              status: newStatus,
              payments: [...(d.payments || []), payEntry],
            };
          });

          return {
            ...a,
            loanInfo: {
              ...a.loanInfo,
              drawdowns: newDrawdowns,
            },
          };
        }

        return a;
      });

      const nextTxs = [txToRecord, ...prev.transactions];
      const nextState: PesoTrackState = {
        ...prev,
        accounts: updatedAccounts,
        transactions: nextTxs,
        updatedAt: new Date().toISOString(),
      };

      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextState));
      } catch (err) {
        console.error('LocalStorage write error:', err);
      }

      return nextState;
    });

    showToast(
      `Recorded ₱${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} loan payment for "${target.name}"`,
      'success'
    );
    return true;
  };

  const enableMultipleTransactionsForAccount = (accountId: string): boolean => {
    const target = state.accounts.find((a) => a.id === accountId);
    if (!target) return false;
    if (target.category !== 'Credit' && target.category !== 'Loans') return false;

    let modified = false;

    setState((prev) => {
      const nextAccounts = prev.accounts.map((a) => {
        if (a.id !== accountId) return a;
        modified = true;

        if (a.category === 'Credit') {
          const existingPurchases = a.creditInfo?.purchases ? [...a.creditInfo.purchases] : [];
          // Preserve existing debt / single installment as the first transaction item if not yet populated
          if (
            existingPurchases.length === 0 &&
            (a.startingBalance > 0 || (a.creditInfo?.installmentPrincipal || 0) > 0)
          ) {
            const initPrincipal = a.creditInfo?.installmentPrincipal || a.startingBalance || 0;
            const initTotalRepay =
              a.creditInfo?.totalRepayment || a.totalRepayment || initPrincipal;
            const terms = a.creditInfo?.termMonths || 12;
            const dueDay = a.creditInfo?.dueDay || 5;
            existingPurchases.push({
              id: `pur_${Date.now()}_init`,
              name: `${a.name} Initial Purchase`,
              principal: initPrincipal,
              totalRepayment: initTotalRepay,
              termMonths: terms,
              startDate:
                a.creditInfo?.startDate ||
                a.createdAt?.slice(0, 10) ||
                new Date().toISOString().slice(0, 10),
              firstPaymentDate:
                a.creditInfo?.startDate || new Date().toISOString().slice(0, 10),
              dueDay,
              interestRate: a.creditInfo?.interestRate ?? 0,
              interestRateType: a.creditInfo?.interestRateType || 'monthly',
              monthlyPayment:
                a.creditInfo?.customMonthlyPayment ||
                Math.round(initTotalRepay / terms),
              remainingBalance:
                a.startingBalance > 0 ? a.startingBalance : initTotalRepay,
              totalPaid: Math.max(
                0,
                initTotalRepay -
                  (a.startingBalance > 0 ? a.startingBalance : initTotalRepay)
              ),
              status: 'active',
              payments: [],
              createdAt: new Date().toISOString(),
            });
          }

          return {
            ...a,
            creditInfo: {
              ...(a.creditInfo || {
                creditLimit: 50000,
                statementDay: 15,
                dueDay: 5,
                reminderEnabled: true,
              }),
              enableMultipleInstallments: true,
              purchases: existingPurchases,
            },
          };
        }

        if (a.category === 'Loans') {
          const existingDrawdowns = a.loanInfo?.drawdowns ? [...a.loanInfo.drawdowns] : [];
          const establishedLimit =
            a.loanInfo?.creditLimit || a.loanInfo?.originalPrincipal || a.startingBalance || 50000;

          if (
            existingDrawdowns.length === 0 &&
            ((a.loanInfo?.originalPrincipal || 0) > 0 || a.startingBalance > 0)
          ) {
            const initPrincipal =
              a.loanInfo?.originalPrincipal || a.startingBalance || 0;
            const initTotalRepay =
              a.loanInfo?.totalRepayment || a.totalRepayment || initPrincipal;
            const terms = a.loanInfo?.termMonths || 12;
            const dueDay = a.loanInfo?.dueDay || 15;
            existingDrawdowns.push({
              id: `drw_${Date.now()}_init`,
              name: `${a.name} Initial Borrowing`,
              principal: initPrincipal,
              totalRepayment: initTotalRepay,
              termMonths: terms,
              startDate:
                a.loanInfo?.startDate ||
                a.createdAt?.slice(0, 10) ||
                new Date().toISOString().slice(0, 10),
              firstPaymentDate:
                a.loanInfo?.startDate || new Date().toISOString().slice(0, 10),
              dueDay,
              interestRate:
                a.loanInfo?.interestRate ?? a.loanInfo?.interestRateAnnual ?? 0,
              interestRateType: a.loanInfo?.interestRateType || 'annual',
              monthlyPayment:
                a.loanInfo?.customMonthlyPayment ||
                a.loanInfo?.monthlyInstallmentEstimate ||
                Math.round(initTotalRepay / terms),
              remainingBalance:
                a.startingBalance > 0 ? a.startingBalance : initTotalRepay,
              totalPaid: Math.max(
                0,
                initTotalRepay -
                  (a.startingBalance > 0 ? a.startingBalance : initTotalRepay)
              ),
              status: 'active',
              payments: [],
              createdAt: new Date().toISOString(),
            });
          }

          return {
            ...a,
            loanInfo: {
              ...(a.loanInfo || {
                originalPrincipal: establishedLimit,
                interestRateAnnual: 12,
                termMonths: 12,
                monthlyInstallmentEstimate: 0,
                dueDay: 15,
                startDate: new Date().toISOString().slice(0, 10),
                repaymentModel: 'flat_rate',
                reminderEnabled: true,
              }),
              creditLimit: establishedLimit,
              originalPrincipal: a.loanInfo?.originalPrincipal || establishedLimit,
              enableMultipleInstallments: true,
              drawdowns: existingDrawdowns,
            },
          };
        }

        return a;
      });

      return {
        ...prev,
        accounts: nextAccounts,
        updatedAt: new Date().toISOString(),
      };
    });

    if (modified) {
      showToast(`Multiple transactions enabled for ${target.name}`, 'success');
    }
    return modified;
  };

  const addTransaction = (input: AddTransactionInput): TransactionRecord | null => {
    const safeAmount = fromCentavos(toCentavos(input.amount));
    if (safeAmount <= 0) {
      showToast('Amount must be greater than ₱0.00', 'error');
      return null;
    }
    if (!input.accountId) {
      showToast('Please select an account.', 'error');
      return null;
    }
    if (input.type === 'transfer') {
      if (!input.destinationAccountId) {
        showToast('Please select a destination account for the transfer.', 'error');
        return null;
      }
      if (input.accountId === input.destinationAccountId) {
        showToast('Source and destination accounts must be different.', 'error');
        return null;
      }
    }

    let computedInterest = input.interestPortion;
    if (
      input.type === 'transfer' &&
      input.destinationAccountId &&
      computedInterest === undefined
    ) {
      const destAcc = reconciledAccounts.find(
        (a) => a.id === input.destinationAccountId
      );
      if (destAcc?.category === 'Loans' && destAcc.loanInfo) {
        const { interestRateAnnual, repaymentModel, originalPrincipal } =
          destAcc.loanInfo;
        const monthlyRate = (interestRateAnnual || 0) / 100 / 12;
        if (repaymentModel === 'principal_first') {
          computedInterest = 0;
        } else if (repaymentModel === 'flat_rate') {
          computedInterest = Math.min(
            safeAmount,
            fromCentavos(toCentavos(originalPrincipal * monthlyRate))
          );
        } else {
          computedInterest = Math.min(
            safeAmount,
            fromCentavos(toCentavos(destAcc.currentBalance * monthlyRate))
          );
        }
      }
    }

    const newTx: TransactionRecord = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: input.type,
      amount: safeAmount,
      accountId: input.accountId,
      destinationAccountId:
        input.type === 'transfer' ? input.destinationAccountId : undefined,
      category: input.category || 'Other',
      merchantOrTitle: input.merchantOrTitle.trim() || input.category || 'Transaction',
      dateTime: input.dateTime || new Date().toISOString(),
      notes: input.notes?.trim() || undefined,
      adjustmentSign:
        input.type === 'adjustment' ? input.adjustmentSign || 'positive' : undefined,
      interestPortion: computedInterest,
    };

    const newTransactions = [newTx];
    if (input.type === 'transfer' && input.transferFee && input.transferFee > 0) {
      newTransactions.push({
        id: `tx_fee_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'expense',
        amount: fromCentavos(toCentavos(input.transferFee)),
        accountId: input.accountId,
        category: 'Bills',
        merchantOrTitle: `Transfer Fee (${newTx.merchantOrTitle})`,
        dateTime: input.dateTime || new Date().toISOString(),
        notes: `Transfer fee of ₱${input.transferFee.toFixed(2)}`,
      });
    }

    const nextAllTransactions = [...newTransactions, ...state.transactions];
    setState((prev) => ({
      ...prev,
      transactions: nextAllTransactions,
      updatedAt: new Date().toISOString(),
    }));

    newTransactions.forEach((t) => queueMutation('transactions', t.id, 'upsert', t));

    const sourceAcc = state.accounts.find((a) => a.id === input.accountId);
    if (sourceAcc) {
      const updatedBalance = calculateAccountBalance(sourceAcc, nextAllTransactions);
      showToast(
        `Recorded ₱${safeAmount.toFixed(2)} ${input.type}. ${sourceAcc.name} balance: ₱${updatedBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        'success'
      );
    } else {
      showToast('Transaction saved', 'success');
    }

    return newTx;
  };

  const updateTransaction = (
    txId: string,
    input: AddTransactionInput
  ): boolean => {
    const safeAmount = fromCentavos(toCentavos(input.amount));
    if (safeAmount <= 0) {
      showToast('Amount must be greater than ₱0.00', 'error');
      return false;
    }

    let updatedTxObj: TransactionRecord | null = null;
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) => {
        if (t.id === txId) {
          const updated: TransactionRecord = {
            ...t,
            type: input.type,
            amount: safeAmount,
            accountId: input.accountId,
            destinationAccountId:
              input.type === 'transfer' ? input.destinationAccountId : undefined,
            category: input.category,
            merchantOrTitle:
              input.merchantOrTitle.trim() || input.category || 'Transaction',
            dateTime: input.dateTime,
            notes: input.notes?.trim() || undefined,
            adjustmentSign:
              input.type === 'adjustment'
                ? input.adjustmentSign || 'positive'
                : undefined,
            interestPortion: input.interestPortion,
          };
          updatedTxObj = updated;
          return updated;
        }
        return t;
      }),
      updatedAt: new Date().toISOString(),
    }));

    if (updatedTxObj) {
      queueMutation('transactions', txId, 'upsert', updatedTxObj);
    }
    showToast('Transaction updated', 'success');
    return true;
  };

  const deleteTransaction = (txId: string) => {
    const target = state.transactions.find((t) => t.id === txId);
    if (!target) return;

    setState((prev) => {
      const nextAccounts = target.isStartingBalance
        ? prev.accounts.map((a) =>
            a.id === target.accountId ? { ...a, startingBalance: 0 } : a
          )
        : prev.accounts;

      return {
        ...prev,
        accounts: nextAccounts,
        transactions: prev.transactions.filter((t) => t.id !== txId),
        updatedAt: new Date().toISOString(),
      };
    });
    queueMutation('transactions', txId, 'delete');
    showToast('Transaction deleted', 'info');
  };

  const saveMonthlyBudget = (monthKey: string, budget: MonthlyBudget) => {
    setState((prev) => ({
      ...prev,
      budgets: {
        ...prev.budgets,
        [monthKey]: budget,
      },
      updatedAt: new Date().toISOString(),
    }));
    showToast(`Budget saved for ${monthKey}`, 'success');
  };

  const updateSettings = (updates: Partial<UserSettings>) => {
    if (updates.themeColor) {
      applyThemeToDom(isDarkMode, updates.themeColor);
    }
    setState((prev) => {
      const nextSettings = {
        ...prev.settings,
        ...updates,
      };
      if (currentUser?.uid) {
        enqueueChange(currentUser.uid, 'sync_state', 'state', 'upsert', {
          settings: nextSettings,
          customCategories: prev.customCategories,
        });
      }
      return {
        ...prev,
        settings: nextSettings,
        updatedAt: new Date().toISOString(),
      };
    });
    showToast('Settings updated', 'success');
  };

  // Recurring Activities Implementation
  const recurringTransactions = state.recurringTransactions || [];

  const addRecurringTransaction = (
    input: Omit<RecurringTransaction, 'id' | 'createdAt'>
  ): RecurringTransaction => {
    const newItem: RecurringTransaction = {
      ...input,
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      recurringTransactions: [...(prev.recurringTransactions || []), newItem],
      updatedAt: new Date().toISOString(),
    }));
    showToast(`Scheduled recurring ${input.name}`, 'success');
    return newItem;
  };

  const updateRecurringTransaction = (
    id: string,
    updates: Partial<RecurringTransaction>
  ): boolean => {
    setState((prev) => ({
      ...prev,
      recurringTransactions: (prev.recurringTransactions || []).map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
      updatedAt: new Date().toISOString(),
    }));
    showToast('Recurring activity updated', 'success');
    return true;
  };

  const deleteRecurringTransaction = (id: string) => {
    setState((prev) => ({
      ...prev,
      recurringTransactions: (prev.recurringTransactions || []).filter(
        (item) => item.id !== id
      ),
      updatedAt: new Date().toISOString(),
    }));
    showToast('Recurring activity removed', 'info');
  };

  const toggleRecurringActive = (id: string) => {
    setState((prev) => ({
      ...prev,
      recurringTransactions: (prev.recurringTransactions || []).map((item) => {
        if (item.id === id) {
          const nextActive = !item.isActive;
          showToast(
            nextActive ? `Resumed "${item.name}"` : `Paused "${item.name}"`,
            'info'
          );
          return { ...item, isActive: nextActive };
        }
        return item;
      }),
      updatedAt: new Date().toISOString(),
    }));
  };

  const recordRecurringPayment = (id: string): TransactionRecord | null => {
    const item = (state.recurringTransactions || []).find((r) => r.id === id);
    if (!item) return null;

    const recordedTx = addTransaction({
      type: item.type,
      amount: item.amount,
      accountId: item.accountId,
      destinationAccountId: item.destinationAccountId,
      category: item.category,
      merchantOrTitle: item.name,
      dateTime: new Date().toISOString(),
      notes: item.notes
        ? `${item.notes} (Recurring: ${item.frequency})`
        : `Recurring payment (${item.frequency})`,
    });

    if (recordedTx) {
      const nextDue = advanceDueDate(item.nextDueDate || item.startDate, item.frequency);
      setState((prev) => ({
        ...prev,
        recurringTransactions: (prev.recurringTransactions || []).map((r) =>
          r.id === id
            ? {
                ...r,
                nextDueDate: nextDue,
                lastRecordedDate: new Date().toISOString(),
              }
            : r
        ),
        updatedAt: new Date().toISOString(),
      }));
    }

    return recordedTx;
  };

  // Customizable Categories Implementation
  const customCategories = {
    expense:
      state.customCategories?.expense && state.customCategories.expense.length > 0
        ? state.customCategories.expense
        : DEFAULT_EXPENSE_CATEGORIES,
    income:
      state.customCategories?.income && state.customCategories.income.length > 0
        ? state.customCategories.income
        : DEFAULT_INCOME_CATEGORIES,
  };

  const addCustomCategory = (type: 'expense' | 'income', name: string): boolean => {
    const clean = name.trim();
    if (!clean) return false;
    const current = customCategories[type];
    if (current.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      showToast(`Category "${clean}" already exists`, 'info');
      return false;
    }
    const nextList = [...current, clean];
    setState((prev) => ({
      ...prev,
      customCategories: {
        expense: type === 'expense' ? nextList : customCategories.expense,
        income: type === 'income' ? nextList : customCategories.income,
      },
      updatedAt: new Date().toISOString(),
    }));
    showToast(`Added category "${clean}"`, 'success');
    return true;
  };

  const renameCustomCategory = (
    type: 'expense' | 'income',
    oldName: string,
    newName: string
  ): boolean => {
    const clean = newName.trim();
    if (!clean || clean.toLowerCase() === oldName.toLowerCase()) return false;
    const current = customCategories[type];
    const nextList = current.map((c) => (c === oldName ? clean : c));

    const nextTxs = state.transactions.map((tx) =>
      tx.category === oldName &&
      (type === 'expense' ? tx.type === 'expense' : tx.type === 'income')
        ? { ...tx, category: clean }
        : tx
    );

    setState((prev) => ({
      ...prev,
      transactions: nextTxs,
      customCategories: {
        expense: type === 'expense' ? nextList : customCategories.expense,
        income: type === 'income' ? nextList : customCategories.income,
      },
      updatedAt: new Date().toISOString(),
    }));
    showToast(`Renamed "${oldName}" to "${clean}"`, 'success');
    return true;
  };

  const deleteCustomCategory = (
    type: 'expense' | 'income',
    name: string
  ): boolean => {
    const current = customCategories[type];
    if (current.length <= 1) {
      showToast('You must keep at least one category', 'error');
      return false;
    }
    const nextList = current.filter((c) => c !== name);
    setState((prev) => ({
      ...prev,
      customCategories: {
        expense: type === 'expense' ? nextList : customCategories.expense,
        income: type === 'income' ? nextList : customCategories.income,
      },
      updatedAt: new Date().toISOString(),
    }));
    showToast(`Deleted category "${name}"`, 'info');
    return true;
  };

  const reorderCustomCategories = (
    type: 'expense' | 'income',
    categories: string[]
  ) => {
    setState((prev) => ({
      ...prev,
      customCategories: {
        expense: type === 'expense' ? categories : customCategories.expense,
        income: type === 'income' ? categories : customCategories.income,
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  const resetCategoriesToDefault = () => {
    setState((prev) => ({
      ...prev,
      customCategories: {
        expense: DEFAULT_EXPENSE_CATEGORIES,
        income: DEFAULT_INCOME_CATEGORIES,
      },
      updatedAt: new Date().toISOString(),
    }));
    showToast('Categories reset to defaults', 'info');
  };

  // ==========================================
  // Money Owed to Me (Receivables) Actions
  // ==========================================
  const addReceivable = (input: AddReceivableInput): ReceivableRecord | null => {
    const personName = input.personName.trim();
    const principal = fromCentavos(toCentavos(input.principal));
    if (!personName) {
      showToast('Please provide a borrower name.', 'error');
      return null;
    }
    if (principal <= 0) {
      showToast('Principal lent must be greater than ₱0.00', 'error');
      return null;
    }

    let interestAmount = 0;
    if (input.interestAmount !== undefined && input.interestAmount >= 0) {
      interestAmount = fromCentavos(toCentavos(input.interestAmount));
    } else if (input.interestType === 'fixed' && input.interestAmount && input.interestAmount > 0) {
      interestAmount = fromCentavos(toCentavos(input.interestAmount));
    } else if (input.interestType === 'percentage' && input.interestRate && input.interestRate > 0) {
      interestAmount = fromCentavos(toCentavos(principal * (input.interestRate / 100)));
    }

    const totalExpected = fromCentavos(toCentavos(principal + interestAmount));
    const nowIso = new Date().toISOString();
    const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const finalDueDate =
      input.dueDate ||
      (input.schedule && input.schedule.length > 0
        ? input.schedule[input.schedule.length - 1].dueDate
        : input.scheduleStartDate || input.lentDate || nowIso.slice(0, 10));

    const newReceivable: ReceivableRecord = {
      id,
      personName,
      principal,
      termMonths: input.termMonths !== undefined ? input.termMonths : 12,
      collectionDueDay: input.collectionDueDay !== undefined ? input.collectionDueDay : 15,
      scheduleStartDate: input.scheduleStartDate || input.lentDate || nowIso.slice(0, 10),
      enableMultipleLending: !!input.enableMultipleLending,
      lentDate: input.lentDate || nowIso.slice(0, 10),
      dueDate: finalDueDate,
      interestType: input.interestType || 'none',
      interestRate: input.interestRate,
      interestRateType: input.interestRateType || 'annual',
      repaymentModel: input.repaymentModel || 'amortized',
      isFixedMonthlyPayment: !!input.isFixedMonthlyPayment,
      fixedMonthlyPayment: input.fixedMonthlyPayment,
      monthlyCollectionEstimate: input.monthlyCollectionEstimate,
      interestAmount,
      totalExpected,
      totalCollected: 0,
      remainingBalance: totalExpected,
      paymentSchedule: input.paymentSchedule || 'monthly',
      schedule: input.schedule || [],
      contactInfo: input.contactInfo?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      payments: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setState((prev) => ({
      ...prev,
      receivables: [...(prev.receivables || []), newReceivable],
      updatedAt: nowIso,
    }));

    queueMutation('receivables', newReceivable.id, 'upsert', newReceivable);
    showToast(
      `Added record: ${personName} owes ₱${totalExpected.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      'success'
    );
    return newReceivable;
  };

  const updateReceivable = (
    id: string,
    updates: Partial<AddReceivableInput>
  ): boolean => {
    let found = false;
    setState((prev) => {
      const nextReceivables = (prev.receivables || []).map((r) => {
        if (r.id !== id) return r;
        found = true;
        const personName =
          updates.personName !== undefined ? updates.personName.trim() : r.personName;
        const principal =
          updates.principal !== undefined
            ? fromCentavos(toCentavos(updates.principal))
            : r.principal;

        const interestType =
          updates.interestType !== undefined ? updates.interestType : r.interestType;
        const interestRate =
          updates.interestRate !== undefined ? updates.interestRate : r.interestRate;
        let interestAmount = r.interestAmount || 0;
        if (updates.interestAmount !== undefined) {
          interestAmount = fromCentavos(toCentavos(updates.interestAmount));
        } else if (interestType === 'fixed') {
          interestAmount =
            updates.interestAmount !== undefined
              ? fromCentavos(toCentavos(updates.interestAmount))
              : interestAmount;
        } else if (interestType === 'percentage' && interestRate) {
          interestAmount = fromCentavos(toCentavos(principal * (interestRate / 100)));
        } else if (interestType === 'none') {
          interestAmount = 0;
        }

        const totalExpected = fromCentavos(toCentavos(principal + interestAmount));
        const totalCollected = r.totalCollected;
        const remainingBalance = Math.max(
          0,
          fromCentavos(toCentavos(totalExpected - totalCollected))
        );

        const finalDueDate =
          updates.dueDate ||
          (updates.schedule && updates.schedule.length > 0
            ? updates.schedule[updates.schedule.length - 1].dueDate
            : r.dueDate);

        return {
          ...r,
          personName,
          principal,
          termMonths: updates.termMonths !== undefined ? updates.termMonths : r.termMonths,
          collectionDueDay:
            updates.collectionDueDay !== undefined
              ? updates.collectionDueDay
              : r.collectionDueDay,
          scheduleStartDate:
            updates.scheduleStartDate !== undefined
              ? updates.scheduleStartDate
              : r.scheduleStartDate,
          enableMultipleLending:
            updates.enableMultipleLending !== undefined
              ? updates.enableMultipleLending
              : r.enableMultipleLending,
          lentDate: updates.lentDate || r.lentDate,
          dueDate: finalDueDate,
          interestType,
          interestRate,
          interestRateType: updates.interestRateType ?? r.interestRateType ?? 'annual',
          repaymentModel: updates.repaymentModel ?? r.repaymentModel ?? 'amortized',
          isFixedMonthlyPayment:
            updates.isFixedMonthlyPayment !== undefined
              ? updates.isFixedMonthlyPayment
              : r.isFixedMonthlyPayment,
          fixedMonthlyPayment:
            updates.fixedMonthlyPayment !== undefined
              ? updates.fixedMonthlyPayment
              : r.fixedMonthlyPayment,
          monthlyCollectionEstimate:
            updates.monthlyCollectionEstimate !== undefined
              ? updates.monthlyCollectionEstimate
              : r.monthlyCollectionEstimate,
          interestAmount,
          totalExpected,
          remainingBalance,
          paymentSchedule: updates.paymentSchedule || r.paymentSchedule,
          schedule: updates.schedule !== undefined ? updates.schedule : r.schedule,
          contactInfo:
            updates.contactInfo !== undefined
              ? updates.contactInfo.trim() || undefined
              : r.contactInfo,
          notes:
            updates.notes !== undefined ? updates.notes.trim() || undefined : r.notes,
          updatedAt: new Date().toISOString(),
        };
      });

      return {
        ...prev,
        receivables: nextReceivables,
        updatedAt: new Date().toISOString(),
      };
    });

    if (found) {
      showToast('Receivable updated', 'success');
    }
    return found;
  };

  const deleteReceivable = (id: string) => {
    const target = (state.receivables || []).find((r) => r.id === id);
    if (!target) return;

    setState((prev) => ({
      ...prev,
      receivables: (prev.receivables || []).filter((r) => r.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    queueMutation('receivables', id, 'delete');
    showToast(`Removed receivable for ${target.personName}`, 'info');
  };

  const recordReceivablePayment = (
    input: RecordReceivablePaymentInput
  ): boolean => {
    const target = (state.receivables || []).find((r) => r.id === input.receivableId);
    if (!target) {
      showToast('Receivable record not found', 'error');
      return false;
    }

    const safeAmount = fromCentavos(toCentavos(input.amount));
    if (safeAmount <= 0) {
      showToast('Payment amount must be greater than ₱0.00', 'error');
      return false;
    }

    if (safeAmount > target.remainingBalance + 0.05) {
      showToast(
        `Payment amount (₱${safeAmount.toFixed(2)}) exceeds remaining balance of ₱${target.remainingBalance.toFixed(2)}`,
        'error'
      );
      return false;
    }

    const payDate = input.date || new Date().toISOString().slice(0, 10);

    // Prevent duplicate payments (identical amount, date, and payment method within 2.5s)
    const isDuplicate = target.payments.some(
      (p) =>
        Math.abs(p.amount - safeAmount) < 0.01 &&
        p.date === payDate &&
        p.paymentMethod === input.paymentMethod &&
        Date.now() - new Date(p.createdAt).getTime() < 2500
    );
    if (isDuplicate) {
      showToast('A payment with the same amount and details was just recorded.', 'info');
      return false;
    }

    const payId = `rpay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Optional Deposit into User Account (ONLY if explicitly chosen by user)
    let createdTx: TransactionRecord | null = null;
    if (input.destinationAccountId) {
      const destAccount = state.accounts.find((a) => a.id === input.destinationAccountId);
      if (destAccount) {
        createdTx = {
          id: `tx_rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'income',
          amount: safeAmount,
          accountId: input.destinationAccountId,
          category: 'Debt Collection',
          merchantOrTitle: `Repayment from ${target.personName}`,
          dateTime: new Date(payDate + 'T12:00:00').toISOString(),
          notes: input.notes
            ? `${input.notes} (via ${input.paymentMethod})`
            : `Receivable repayment from ${target.personName} (${input.paymentMethod})`,
        };
      }
    }

    const newPaymentRecord: ReceivablePaymentRecord = {
      id: payId,
      receivableId: input.receivableId,
      amount: safeAmount,
      date: payDate,
      paymentMethod: input.paymentMethod,
      destinationAccountId: input.destinationAccountId || undefined,
      transactionId: createdTx?.id,
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setState((prev) => {
      const nextReceivables = (prev.receivables || []).map((r) => {
        if (r.id !== input.receivableId) return r;
        const newPayments = [...r.payments, newPaymentRecord];
        const newTotalCollected = fromCentavos(
          newPayments.reduce((sum, p) => sum + toCentavos(p.amount), 0)
        );
        const newRemaining = Math.max(
          0,
          fromCentavos(toCentavos(r.totalExpected - newTotalCollected))
        );

        // Update installment statuses in collection schedule
        let cumulativePaid = newTotalCollected;
        let cumDue = 0;
        const baseSchedule =
          r.schedule && r.schedule.length > 0
            ? r.schedule
            : calculateReceivableTermsAndSchedule({
                principal: r.principal,
                termMonths: r.termMonths || 12,
                interestRate: r.interestRate ?? 0,
                interestRateType: r.interestRateType || 'annual',
                repaymentModel: r.repaymentModel || 'amortized',
                isFixedMonthlyPayment: r.isFixedMonthlyPayment,
                fixedMonthlyPayment: r.fixedMonthlyPayment,
                scheduleStartDate:
                  r.scheduleStartDate || r.lentDate || new Date().toISOString().slice(0, 10),
                paymentSchedule: r.paymentSchedule || 'monthly',
              }).schedule;

        const updatedSchedule = baseSchedule?.map((item) => {
          cumDue += item.collectionAmount;
          const isPaid = newRemaining <= 0 || cumulativePaid >= cumDue - 0.05;
          return {
            ...item,
            isPaid,
          };
        });

        return {
          ...r,
          payments: newPayments,
          totalCollected: newTotalCollected,
          remainingBalance: newRemaining,
          schedule: updatedSchedule || r.schedule,
          updatedAt: new Date().toISOString(),
        };
      });

      const nextTransactions = createdTx
        ? [createdTx, ...prev.transactions]
        : prev.transactions;

      const nextState: PesoTrackState = {
        ...prev,
        receivables: nextReceivables,
        transactions: nextTransactions,
        updatedAt: new Date().toISOString(),
      };

      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextState));
      } catch (err) {
        console.error('LocalStorage write error:', err);
      }

      return nextState;
    });

    showToast(
      `Recorded ₱${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} payment from ${target.personName}${
        input.destinationAccountId ? ' (deposited)' : ''
      }`,
      'success'
    );
    return true;
  };

  const deleteReceivablePayment = (
    receivableId: string,
    paymentId: string
  ): boolean => {
    let deleted = false;
    setState((prev) => {
      let txIdToDelete: string | undefined;
      const nextReceivables = (prev.receivables || []).map((r) => {
        if (r.id !== receivableId) return r;
        const targetPayment = r.payments.find((p) => p.id === paymentId);
        if (!targetPayment) return r;
        deleted = true;
        txIdToDelete = targetPayment.transactionId;
        const nextPayments = r.payments.filter((p) => p.id !== paymentId);
        const newTotalCollected = fromCentavos(
          nextPayments.reduce((sum, p) => sum + toCentavos(p.amount), 0)
        );
        const newRemaining = Math.max(
          0,
          fromCentavos(toCentavos(r.totalExpected - newTotalCollected))
        );

        let cumulativePaid = newTotalCollected;
        let cumDue = 0;
        const updatedSchedule = r.schedule?.map((item) => {
          cumDue += item.collectionAmount;
          const isPaid = newRemaining <= 0 || cumulativePaid >= cumDue - 0.05;
          return {
            ...item,
            isPaid,
          };
        });

        return {
          ...r,
          payments: nextPayments,
          totalCollected: newTotalCollected,
          remainingBalance: newRemaining,
          schedule: updatedSchedule || r.schedule,
          updatedAt: new Date().toISOString(),
        };
      });

      const nextTransactions = txIdToDelete
        ? prev.transactions.filter((t) => t.id !== txIdToDelete)
        : prev.transactions;

      return {
        ...prev,
        receivables: nextReceivables,
        transactions: nextTransactions,
        updatedAt: new Date().toISOString(),
      };
    });

    if (deleted) {
      showToast('Payment record removed', 'info');
    }
    return deleted;
  };

  // ==========================================
  // Monthly Bills – Fixed & Variable Actions
  // ==========================================
  const addBill = (input: AddBillInput): BillDefinition | null => {
    const name = input.name.trim();
    if (!name) {
      showToast('Please enter a bill name.', 'error');
      return null;
    }

    const safeAmount = fromCentavos(toCentavos(input.defaultAmount));
    if (safeAmount <= 0) {
      showToast('Bill amount must be greater than ₱0.00', 'error');
      return null;
    }

    const id = `bill_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();

    const customCategoryName =
      input.category === 'Other' && input.customCategoryName
        ? input.customCategoryName.trim()
        : undefined;

    const newBill: BillDefinition = {
      id,
      name,
      category: input.category,
      customCategoryName,
      type: input.type,
      defaultAmount: safeAmount,
      dueDay: Math.min(31, Math.max(1, Math.round(input.dueDay || 1))),
      startMonth: input.startMonth || nowIso.slice(0, 7),
      endMonth: input.endMonth || undefined,
      frequency: input.frequency || 'monthly',
      notes: input.notes?.trim() || undefined,
      reminderEnabled: input.reminderEnabled !== false,
      reminderDaysBefore: input.reminderDaysBefore ?? 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setState((prev) => {
      const nextCustomNames =
        customCategoryName &&
        !(prev.customBillNames || []).some(
          (n) => n.toLowerCase() === customCategoryName.toLowerCase()
        )
          ? [...(prev.customBillNames || []), customCategoryName]
          : prev.customBillNames || [];

      return {
        ...prev,
        bills: [...(prev.bills || []), newBill],
        customBillNames: nextCustomNames,
        updatedAt: nowIso,
      };
    });

    queueMutation('bills', newBill.id, 'upsert', newBill);
    showToast(`Added bill "${customCategoryName || name}"`, 'success');
    return newBill;
  };

  const updateBill = (
    billId: string,
    updates: Partial<BillDefinition>
  ): boolean => {
    let updated = false;
    let updatedBillObj: BillDefinition | null = null;
    const nowIso = new Date().toISOString();

    setState((prev) => {
      const nextBills = (prev.bills || []).map((b) => {
        if (b.id !== billId) return b;
        updated = true;
        const up = {
          ...b,
          ...updates,
          updatedAt: nowIso,
        };
        updatedBillObj = up;
        return up;
      });

      return {
        ...prev,
        bills: nextBills,
        updatedAt: nowIso,
      };
    });

    if (updated && updatedBillObj) {
      queueMutation('bills', billId, 'upsert', updatedBillObj);
      showToast('Bill settings updated', 'success');
    }
    return updated;
  };

  const deleteBill = (billId: string) => {
    const target = state.bills?.find((b) => b.id === billId);
    if (!target) return;

    setState((prev) => ({
      ...prev,
      bills: (prev.bills || []).filter((b) => b.id !== billId),
      updatedAt: new Date().toISOString(),
    }));
    queueMutation('bills', billId, 'delete');
    showToast(`Deleted bill "${target.name}"`, 'info');
  };

  const updateMonthlyBillEntry = (
    billId: string,
    monthKey: string,
    updates: Partial<MonthlyBillEntry>
  ): boolean => {
    const targetBill = state.bills?.find((b) => b.id === billId);
    if (!targetBill) return false;

    const entryKey = `${billId}_${monthKey}`;
    const nowIso = new Date().toISOString();

    setState((prev) => {
      const existing = prev.monthlyBillEntries?.[entryKey] || {
        id: entryKey,
        billId,
        monthKey,
        dueDay: targetBill.dueDay,
        dueDate: `${monthKey}-${String(targetBill.dueDay).padStart(2, '0')}`,
        actualAmount: targetBill.defaultAmount,
        payments: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const updatedEntry: MonthlyBillEntry = {
        ...existing,
        ...updates,
        updatedAt: nowIso,
      };

      return {
        ...prev,
        monthlyBillEntries: {
          ...(prev.monthlyBillEntries || {}),
          [entryKey]: updatedEntry,
        },
        updatedAt: nowIso,
      };
    });

    showToast(`Updated bill for ${monthKey}`, 'success');
    return true;
  };

  const recordBillPayment = (input: RecordBillPaymentInput): boolean => {
    const targetBill = state.bills?.find((b) => b.id === input.billId);
    if (!targetBill) {
      showToast('Bill not found.', 'error');
      return false;
    }

    const safeAmount = fromCentavos(toCentavos(input.amount));
    if (safeAmount <= 0) {
      showToast('Payment amount must be greater than ₱0.00', 'error');
      return false;
    }

    const payDate = input.date || new Date().toISOString().slice(0, 10);
    const payId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const entryKey = `${input.billId}_${input.monthKey}`;

    let createdTx: TransactionRecord | undefined;
    if (input.sourceAccountId) {
      const sourceAcc = state.accounts.find((a) => a.id === input.sourceAccountId);
      if (!sourceAcc) {
        showToast('Selected deduction account was not found.', 'error');
        return false;
      }

      const billDisplayName =
        targetBill.category === 'Other' && targetBill.customCategoryName
          ? targetBill.customCategoryName
          : targetBill.name;

      createdTx = {
        id: `tx_bill_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'expense',
        amount: safeAmount,
        accountId: input.sourceAccountId,
        category: 'Bills',
        merchantOrTitle: `Bill: ${billDisplayName} (${input.monthKey})`,
        dateTime: `${payDate}T12:00:00`,
        notes: input.notes?.trim() || `Payment for ${billDisplayName}`,
      };
    }

    const newPaymentRecord: BillPaymentRecord = {
      id: payId,
      billId: input.billId,
      monthKey: input.monthKey,
      amount: safeAmount,
      date: payDate,
      paymentMethod: input.paymentMethod,
      sourceAccountId: input.sourceAccountId,
      transactionId: createdTx?.id,
      notes: input.notes?.trim(),
      createdAt: new Date().toISOString(),
    };

    setState((prev) => {
      const existingEntry = prev.monthlyBillEntries?.[entryKey] || {
        id: entryKey,
        billId: input.billId,
        monthKey: input.monthKey,
        dueDay: targetBill.dueDay,
        dueDate: `${input.monthKey}-${String(targetBill.dueDay).padStart(2, '0')}`,
        actualAmount: targetBill.defaultAmount,
        payments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedPayments = [
        ...(existingEntry.payments || []),
        newPaymentRecord,
      ];
      const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);

      const updatedEntry: MonthlyBillEntry = {
        ...existingEntry,
        payments: updatedPayments,
        isPaidManually: totalPaid >= existingEntry.actualAmount,
        updatedAt: new Date().toISOString(),
      };

      const nextMonthlyEntries = {
        ...(prev.monthlyBillEntries || {}),
        [entryKey]: updatedEntry,
      };

      const nextTransactions = createdTx
        ? [createdTx, ...prev.transactions]
        : prev.transactions;

      const nextState: PesoTrackState = {
        ...prev,
        monthlyBillEntries: nextMonthlyEntries,
        transactions: nextTransactions,
        updatedAt: new Date().toISOString(),
      };

      return nextState;
    });

    const billDisplayName =
      targetBill.category === 'Other' && targetBill.customCategoryName
        ? targetBill.customCategoryName
        : targetBill.name;

    showToast(
      `Recorded ₱${safeAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
      })} payment for ${billDisplayName}${
        input.sourceAccountId ? ' (deducted from wallet)' : ''
      }`,
      'success'
    );
    return true;
  };

  const deleteBillPayment = (
    billId: string,
    monthKey: string,
    paymentId: string
  ): boolean => {
    const entryKey = `${billId}_${monthKey}`;
    let deleted = false;
    let txIdToDelete: string | undefined;

    setState((prev) => {
      const existingEntry = prev.monthlyBillEntries?.[entryKey];
      if (!existingEntry) return prev;

      const targetPayment = existingEntry.payments?.find(
        (p) => p.id === paymentId
      );
      if (!targetPayment) return prev;

      deleted = true;
      txIdToDelete = targetPayment.transactionId;

      const nextPayments = existingEntry.payments.filter(
        (p) => p.id !== paymentId
      );
      const totalPaid = nextPayments.reduce((sum, p) => sum + p.amount, 0);

      const nextEntry: MonthlyBillEntry = {
        ...existingEntry,
        payments: nextPayments,
        isPaidManually: totalPaid >= existingEntry.actualAmount,
        updatedAt: new Date().toISOString(),
      };

      const nextMonthlyEntries = {
        ...(prev.monthlyBillEntries || {}),
        [entryKey]: nextEntry,
      };

      const nextTransactions = txIdToDelete
        ? prev.transactions.filter((t) => t.id !== txIdToDelete)
        : prev.transactions;

      return {
        ...prev,
        monthlyBillEntries: nextMonthlyEntries,
        transactions: nextTransactions,
        updatedAt: new Date().toISOString(),
      };
    });

    if (deleted) {
      showToast('Bill payment record removed', 'info');
    }
    return deleted;
  };

  const saveCustomBillName = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setState((prev) => {
      if (
        (prev.customBillNames || []).some(
          (n) => n.toLowerCase() === clean.toLowerCase()
        )
      ) {
        return prev;
      }
      return {
        ...prev,
        customBillNames: [...(prev.customBillNames || []), clean],
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const updateNotificationSettings = (
    updates: Partial<NotificationSettings>
  ) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        notificationSettings: sanitizeNotificationSettings({
          ...(prev.settings.notificationSettings ||
            DEFAULT_NOTIFICATION_SETTINGS),
          ...updates,
        }),
      },
      updatedAt: new Date().toISOString(),
    }));
    showToast('Reminder preferences updated', 'success');
  };

  const testLocalNotification = async () => {
    const result = await sendImmediateTestNotification();
    showToast(result.message, result.ok ? 'success' : 'error');
    return result;
  };

  const importBackupJSON = (
    rawJson: string,
    mode: 'merge' | 'replace'
  ): { ok: boolean; message: string } => {
    try {
      const parsed = JSON.parse(rawJson);
      const validated = validateAndSanitizeState(parsed);
      if (!validated) {
        return {
          ok: false,
          message: 'Invalid backup file format. Missing accounts or transactions.',
        };
      }

      if (mode === 'replace') {
        const next = {
          ...validated,
          updatedAt: new Date().toISOString(),
        };
        setState(next);
        showToast('Backup restored successfully', 'success');
        return {
          ok: true,
          message: `Restored ${validated.accounts.length} accounts, ${validated.transactions.length} transactions, and ${validated.receivables?.length || 0} receivables.`,
        };
      } else {
        const existingAccIds = new Set(state.accounts.map((a) => a.id));
        const existingTxIds = new Set(state.transactions.map((t) => t.id));
        const existingRecIds = new Set((state.receivables || []).map((r) => r.id));
        const existingBillIds = new Set((state.bills || []).map((b) => b.id));

        const addedAccounts = validated.accounts.filter(
          (a) => !existingAccIds.has(a.id)
        );
        const addedTransactions = validated.transactions.filter(
          (t) => !existingTxIds.has(t.id)
        );
        const addedReceivables = (validated.receivables || []).filter(
          (r) => !existingRecIds.has(r.id)
        );
        const addedBills = (validated.bills || []).filter(
          (b) => !existingBillIds.has(b.id)
        );

        const mergedState: PesoTrackState = {
          ...state,
          accounts: [...state.accounts, ...addedAccounts],
          transactions: [...addedTransactions, ...state.transactions],
          receivables: [...(state.receivables || []), ...addedReceivables],
          bills: [...(state.bills || []), ...addedBills],
          monthlyBillEntries: {
            ...(state.monthlyBillEntries || {}),
            ...(validated.monthlyBillEntries || {}),
          },
          customBillNames: Array.from(
            new Set([
              ...(state.customBillNames || []),
              ...(validated.customBillNames || []),
            ])
          ),
          budgets: {
            ...validated.budgets,
            ...state.budgets,
          },
          recurringTransactions: [
            ...(state.recurringTransactions || []),
            ...(validated.recurringTransactions || []).filter(
              (vr) =>
                !(state.recurringTransactions || []).some(
                  (er) => er.id === vr.id
                )
            ),
          ],
          customCategories: {
            expense: Array.from(
              new Set([
                ...(state.customCategories?.expense || DEFAULT_EXPENSE_CATEGORIES),
                ...(validated.customCategories?.expense || []),
              ])
            ),
            income: Array.from(
              new Set([
                ...(state.customCategories?.income || DEFAULT_INCOME_CATEGORIES),
                ...(validated.customCategories?.income || []),
              ])
            ),
          },
          settings: {
            ...state.settings,
            notificationSettings: {
              ...(state.settings.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS),
              ...(validated.settings.notificationSettings || {}),
            },
          },
          updatedAt: new Date().toISOString(),
        };

        setState(mergedState);
        showToast(
          `Merged ${addedAccounts.length} accounts, ${addedTransactions.length} transactions, and ${addedBills.length} bills`,
          'success'
        );
        return {
          ok: true,
          message: `Merged ${addedAccounts.length} new accounts, ${addedTransactions.length} new transactions, and ${addedBills.length} new bills.`,
        };
      }
    } catch {
      return {
        ok: false,
        message: 'Could not parse JSON file. Please select a valid PesoTrack backup.',
      };
    }
  };

  const resetToDefaultDemo = () => {
    const fresh = createInitialPesoTrackState();
    setState(fresh);
    showToast('Restored default PesoTrack accounts and bills', 'info');
  };

  const clearAllData = () => {
    const emptyState: PesoTrackState = {
      version: 1,
      accounts: [],
      transactions: [],
      receivables: [],
      bills: [],
      monthlyBillEntries: {},
      customBillNames: [],
      budgets: {
        [getMonthKey()]: {
          monthKey: getMonthKey(),
          totalBudget: 0,
          alertThresholdPercent: 80,
          categoryBudgets: [],
        },
      },
      recurringTransactions: [],
      customCategories: {
        expense: DEFAULT_EXPENSE_CATEGORIES,
        income: DEFAULT_INCOME_CATEGORIES,
      },
      settings: state.settings,
      updatedAt: new Date().toISOString(),
    };
    setState(emptyState);
    showToast('All accounts, transactions, and bills cleared', 'info');
  };

  // ==========================================
  // Grocery List Feature Implementation
  // ==========================================
  const groceryItems: GroceryItem[] = useMemo(() => {
    return (state.groceryItems || []).filter((item) => !item.isDeleted);
  }, [state.groceryItems]);

  const groceryCategories: GroceryCategory[] = useMemo(() => {
    return state.groceryCategories && state.groceryCategories.length > 0
      ? state.groceryCategories
      : DEFAULT_GROCERY_CATEGORIES;
  }, [state.groceryCategories]);

  const addGroceryItem = (input: AddGroceryItemInput): GroceryItem | null => {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      showToast('Please enter an item name', 'error');
      return null;
    }
    const quantity = Math.max(0.001, Number(input.quantity) || 1);
    const estimatedPrice = Math.max(0, Number(input.estimatedPrice) || 0);
    const estimatedTotal = calculateEstimatedItemTotal(quantity, estimatedPrice);
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const newItem: GroceryItem = {
      id: `groc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: trimmedName,
      category: input.category || 'Others',
      quantity,
      unit: input.unit || 'piece',
      estimatedPrice,
      estimatedTotal,
      isPurchased: Boolean(input.isPurchased),
      purchasedDate: input.isPurchased ? input.purchasedDate || today : undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    setState((prev) => {
      const nextItems = [newItem, ...(prev.groceryItems || [])];
      return {
        ...prev,
        groceryItems: nextItems,
        updatedAt: now,
      };
    });

    if (currentUser?.uid) {
      enqueueChange(currentUser.uid, 'groceries', newItem.id, 'upsert', newItem);
    }

    showToast(`Added "${newItem.name}" to grocery list`, 'success');
    return newItem;
  };

  const updateGroceryItem = (
    id: string,
    updates: Partial<AddGroceryItemInput>
  ): boolean => {
    const existing = (state.groceryItems || []).find((i) => i.id === id);
    if (!existing) return false;

    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const quantity =
      updates.quantity !== undefined
        ? Math.max(0.001, Number(updates.quantity) || 1)
        : existing.quantity;
    const estimatedPrice =
      updates.estimatedPrice !== undefined
        ? Math.max(0, Number(updates.estimatedPrice) || 0)
        : existing.estimatedPrice;
    const estimatedTotal = calculateEstimatedItemTotal(quantity, estimatedPrice);

    const isPurchased =
      updates.isPurchased !== undefined ? Boolean(updates.isPurchased) : existing.isPurchased;
    const purchasedDate =
      updates.isPurchased !== undefined
        ? updates.isPurchased
          ? updates.purchasedDate || existing.purchasedDate || today
          : undefined
        : existing.purchasedDate;

    const updatedItem: GroceryItem = {
      ...existing,
      name: updates.name !== undefined ? updates.name.trim() : existing.name,
      category: updates.category !== undefined ? updates.category : existing.category,
      quantity,
      unit: updates.unit !== undefined ? updates.unit : existing.unit,
      estimatedPrice,
      estimatedTotal,
      isPurchased,
      purchasedDate,
      notes: updates.notes !== undefined ? updates.notes.trim() || undefined : existing.notes,
      updatedAt: now,
    };

    setState((prev) => {
      const nextItems = (prev.groceryItems || []).map((i) =>
        i.id === id ? updatedItem : i
      );
      return {
        ...prev,
        groceryItems: nextItems,
        updatedAt: now,
      };
    });

    if (currentUser?.uid) {
      enqueueChange(currentUser.uid, 'groceries', id, 'upsert', updatedItem);
    }

    showToast(`Updated "${updatedItem.name}"`, 'success');
    return true;
  };

  const deleteGroceryItem = (id: string): boolean => {
    const existing = (state.groceryItems || []).find((i) => i.id === id);
    if (!existing) return false;

    const now = new Date().toISOString();
    setState((prev) => {
      const nextItems = (prev.groceryItems || []).filter((i) => i.id !== id);
      return {
        ...prev,
        groceryItems: nextItems,
        updatedAt: now,
      };
    });

    if (currentUser?.uid) {
      enqueueChange(currentUser.uid, 'groceries', id, 'delete');
    }

    showToast(`Removed "${existing.name}"`, 'info');
    return true;
  };

  const toggleGroceryPurchased = (id: string): boolean => {
    const existing = (state.groceryItems || []).find((i) => i.id === id);
    if (!existing) return false;

    const nextPurchased = !existing.isPurchased;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const updatedItem: GroceryItem = {
      ...existing,
      isPurchased: nextPurchased,
      purchasedDate: nextPurchased ? today : undefined,
      updatedAt: now,
    };

    setState((prev) => {
      const nextItems = (prev.groceryItems || []).map((i) =>
        i.id === id ? updatedItem : i
      );
      return {
        ...prev,
        groceryItems: nextItems,
        updatedAt: now,
      };
    });

    if (currentUser?.uid) {
      enqueueChange(currentUser.uid, 'groceries', id, 'upsert', updatedItem);
    }

    return true;
  };

  const duplicateGroceryItem = (id: string): GroceryItem | null => {
    const existing = (state.groceryItems || []).find((i) => i.id === id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const newItem: GroceryItem = {
      ...existing,
      id: `groc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `${existing.name} (Copy)`,
      isPurchased: false,
      purchasedDate: undefined,
      isRecordedAsExpense: false,
      expenseTransactionId: undefined,
      createdAt: now,
      updatedAt: now,
    };

    setState((prev) => {
      const nextItems = [newItem, ...(prev.groceryItems || [])];
      return {
        ...prev,
        groceryItems: nextItems,
        updatedAt: now,
      };
    });

    if (currentUser?.uid) {
      enqueueChange(currentUser.uid, 'groceries', newItem.id, 'upsert', newItem);
    }

    showToast(`Duplicated "${existing.name}"`, 'success');
    return newItem;
  };

  const moveGroceryItemCategory = (id: string, newCategory: string): boolean => {
    const existing = (state.groceryItems || []).find((i) => i.id === id);
    if (!existing) return false;

    const now = new Date().toISOString();
    const updatedItem: GroceryItem = {
      ...existing,
      category: newCategory,
      updatedAt: now,
    };

    setState((prev) => {
      const nextItems = (prev.groceryItems || []).map((i) =>
        i.id === id ? updatedItem : i
      );
      return {
        ...prev,
        groceryItems: nextItems,
        updatedAt: now,
      };
    });

    if (currentUser?.uid) {
      enqueueChange(currentUser.uid, 'groceries', id, 'upsert', updatedItem);
    }

    showToast(`Moved to ${newCategory}`, 'success');
    return true;
  };

  const addGroceryCategory = (cat: {
    name: string;
    icon?: string;
    description?: string;
  }): GroceryCategory | null => {
    const trimmed = cat.name.trim();
    if (!trimmed) {
      showToast('Category name cannot be empty', 'error');
      return null;
    }

    const currentCats =
      state.groceryCategories && state.groceryCategories.length > 0
        ? state.groceryCategories
        : DEFAULT_GROCERY_CATEGORIES;

    if (currentCats.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast('A category with that name already exists', 'error');
      return null;
    }

    const newCat: GroceryCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: trimmed,
      icon: cat.icon || '📦',
      description: cat.description?.trim() || `${trimmed} grocery items`,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    const nextCats = [...currentCats, newCat];
    const now = new Date().toISOString();

    setState((prev) => ({
      ...prev,
      groceryCategories: nextCats,
      updatedAt: now,
    }));

    if (currentUser?.uid) {
      enqueueChange(currentUser.uid, 'grocery_categories', newCat.id, 'upsert', newCat);
    }

    showToast(`Added category "${trimmed}"`, 'success');
    return newCat;
  };

  const updateGroceryCategory = (
    id: string,
    updates: Partial<GroceryCategory>
  ): boolean => {
    const currentCats =
      state.groceryCategories && state.groceryCategories.length > 0
        ? state.groceryCategories
        : DEFAULT_GROCERY_CATEGORIES;

    const existing = currentCats.find((c) => c.id === id);
    if (!existing) return false;

    const oldName = existing.name;
    const newName = updates.name ? updates.name.trim() : oldName;
    const now = new Date().toISOString();

    const updatedCats = currentCats.map((c) =>
      c.id === id
        ? {
            ...c,
            name: newName,
            icon: updates.icon !== undefined ? updates.icon : c.icon,
            description: updates.description !== undefined ? updates.description : c.description,
          }
        : c
    );

    let updatedItems = state.groceryItems || [];
    if (newName !== oldName) {
      updatedItems = updatedItems.map((item) =>
        item.category === oldName ? { ...item, category: newName, updatedAt: now } : item
      );
    }

    setState((prev) => ({
      ...prev,
      groceryCategories: updatedCats,
      groceryItems: updatedItems,
      updatedAt: now,
    }));

    if (currentUser?.uid) {
      enqueueChange(currentUser.uid, 'grocery_categories', id, 'upsert', {
        ...existing,
        ...updates,
        name: newName,
      });
    }

    showToast(`Updated category "${newName}"`, 'success');
    return true;
  };

  const deleteGroceryCategory = (
    id: string,
    targetCategoryForItems: string = 'Others'
  ): boolean => {
    const currentCats =
      state.groceryCategories && state.groceryCategories.length > 0
        ? state.groceryCategories
        : DEFAULT_GROCERY_CATEGORIES;

    const existing = currentCats.find((c) => c.id === id);
    if (!existing) return false;

    const now = new Date().toISOString();
    const remainingCats = currentCats.filter((c) => c.id !== id);

    const updatedItems = (state.groceryItems || []).map((item) => {
      if (item.category === existing.name) {
        return {
          ...item,
          category: targetCategoryForItems,
          updatedAt: now,
        };
      }
      return item;
    });

    setState((prev) => ({
      ...prev,
      groceryCategories: remainingCats,
      groceryItems: updatedItems,
      updatedAt: now,
    }));

    if (currentUser?.uid) {
      enqueueChange(currentUser.uid, 'grocery_categories', id, 'delete');
    }

    showToast(`Deleted category "${existing.name}" (items moved to ${targetCategoryForItems})`, 'info');
    return true;
  };

  const convertGroceriesToExpense = (
    input: ConvertGroceriesToExpenseInput
  ): { success: boolean; transaction?: TransactionRecord; message?: string } => {
    if (!input.itemIds || input.itemIds.length === 0) {
      return { success: false, message: 'No grocery items selected.' };
    }

    const allItems = state.groceryItems || [];
    const targetItems = allItems.filter(
      (item) => input.itemIds.includes(item.id) && !item.isDeleted
    );

    if (targetItems.length === 0) {
      return { success: false, message: 'Selected items could not be found.' };
    }

    const alreadyRecorded = targetItems.filter((item) => item.isRecordedAsExpense);
    if (alreadyRecorded.length > 0) {
      const names = alreadyRecorded.map((i) => i.name).join(', ');
      return {
        success: false,
        message: `Some items have already been recorded as expenses: ${names}`,
      };
    }

    const totalCentavos = targetItems.reduce(
      (sum, item) => sum + toCentavos(item.estimatedTotal),
      0
    );
    const totalAmount = fromCentavos(totalCentavos);

    if (totalAmount <= 0) {
      return { success: false, message: 'Total expense amount must be greater than zero.' };
    }

    const itemizedList = targetItems
      .map((item) => `• ${item.name} (${item.quantity} ${item.unit}) - ₱${item.estimatedTotal.toFixed(2)}`)
      .join('\n');

    const formattedNotes = `Grocery Shopping Items:\n${itemizedList}`;

    const tx = addTransaction({
      type: 'expense',
      amount: totalAmount,
      accountId: input.accountId,
      category: input.category || 'Groceries',
      merchantOrTitle: input.description.trim() || `Grocery run (${targetItems.length} items)`,
      dateTime: `${input.date}T12:00:00.000Z`,
      notes: formattedNotes,
    });

    if (!tx) {
      return { success: false, message: 'Failed to create transaction record.' };
    }

    const now = new Date().toISOString();
    const updatedItems = allItems.map((item) => {
      if (input.itemIds.includes(item.id)) {
        const updated = {
          ...item,
          isPurchased: true,
          purchasedDate: item.purchasedDate || input.date,
          isRecordedAsExpense: true,
          expenseTransactionId: tx.id,
          updatedAt: now,
        };
        if (currentUser?.uid) {
          enqueueChange(currentUser.uid, 'groceries', item.id, 'upsert', updated);
        }
        return updated;
      }
      return item;
    });

    setState((prev) => ({
      ...prev,
      groceryItems: updatedItems,
      updatedAt: now,
    }));

    showToast(`Recorded ₱${totalAmount.toLocaleString()} grocery expense to ${tx.category}`, 'success');

    return { success: true, transaction: tx };
  };

  return (
    <FinanceContext.Provider
      value={{
        state,
        reconciledAccounts,
        netWorthSummary,
        receivables,
        receivablesSummary,
        bills,
        monthlyBillEntries,
        customBillNames,
        addBill,
        updateBill,
        deleteBill,
        updateMonthlyBillEntry,
        recordBillPayment,
        deleteBillPayment,
        saveCustomBillName,
        notificationSettings,
        updateNotificationSettings,
        testLocalNotification,
        isDarkMode,
        isLoading,
        syncError,
        toastMessage,
        clearToast,
        showToast,
        toggleHideBalances,
        addAccount,
        updateAccount,
        deleteAccount,
        toggleArchiveAccount,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        saveMonthlyBudget,
        updateSettings,
        importBackupJSON,
        resetToDefaultDemo,
        clearAllData,
        addReceivable,
        updateReceivable,
        deleteReceivable,
        recordReceivablePayment,
        deleteReceivablePayment,
        recurringTransactions,
        addRecurringTransaction,
        updateRecurringTransaction,
        deleteRecurringTransaction,
        toggleRecurringActive,
        recordRecurringPayment,
        customCategories,
        addCustomCategory,
        renameCustomCategory,
        deleteCustomCategory,
        reorderCustomCategories,
        resetCategoriesToDefault,
        addAccountPurchase,
        updateAccountPurchase,
        deleteAccountPurchase,
        recordPurchasePayment,
        recordBatchAccountPayment,
        enableMultipleTransactionsForAccount,
        payCreditBill,
        recordLoanPayment,
        currentUser,
        unverifiedUser,
        setUnverifiedUser,
        handleVerifiedUser,
        isOnline,
        syncStatus,
        lastSyncTime,
        pendingSyncCount,
        syncNow,
        isRulesPermissionError,
        firebaseProjectId: CURRENT_FIREBASE_PROJECT_ID,
        clearSyncError: () => setSyncError(null),
        openAuthModal,
        closeAuthModal,
        isAuthModalOpen,
        authModalMode,
        logout,
        backendStatus,
        checkBackendHealth,
        restoreFromCloudVault,
        getCloudBackupOverview,
        getLocalSafetyBackupInfo,
        // Grocery List Provider Exports
        groceryItems,
        groceryCategories,
        addGroceryItem,
        updateGroceryItem,
        deleteGroceryItem,
        toggleGroceryPurchased,
        duplicateGroceryItem,
        moveGroceryItemCategory,
        addGroceryCategory,
        updateGroceryCategory,
        deleteGroceryCategory,
        convertGroceriesToExpense,
      }}
    >
      {children}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={closeAuthModal}
        onSuccess={() => {
          showToast('Signed in successfully!', 'success');
        }}
        onUnverifiedUser={(u) => {
          setUnverifiedUser(u);
        }}
      />
      <FirstTimeMigrationModal
        isOpen={isMigrationModalOpen}
        userEmail={currentUser?.email || 'User'}
        localAccountsCount={state.accounts.length}
        localTransactionsCount={state.transactions.length}
        localBillsCount={state.bills?.length || 0}
        onAssociateLocalData={handleAssociateLocalData}
        onStartFreshWorkspace={handleStartFreshWorkspace}
      />
    </FinanceContext.Provider>
  );
};

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return ctx;
}
