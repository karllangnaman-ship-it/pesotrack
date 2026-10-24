import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Crown,
  DollarSign,
  Heart,
  Landmark,
  Layers,
  Leaf,
  Lock,
  LogOut,
  Mail,
  Minus,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  AccountCategory,
  FinancialAccount,
  GroceryItem,
  JointActiveTab,
  JointActivityItem,
  JointInvitation,
  JointMember,
  JointWorkspace,
  MonthlyBillEntry,
  BillDefinition,
  MonthlyBudget,
  TransactionRecord,
  TransactionType,
} from '../types/finance';
import { formatPeso, fromCentavos, getMonthKey, toCentavos } from '../utils/currency';
import { calculateAccountBalance } from '../utils/financeEngine';
import { ProviderLogo } from '../components/ProviderLogo';
import { CreateJointModal } from '../components/CreateJointModal';
import { JointInvitationsModal } from '../components/JointInvitationsModal';
import { JointWorkspaceSettingsModal } from '../components/JointWorkspaceSettingsModal';
import { writeJointMutation } from '../services/jointSyncService';
import { AuthUser } from '../services/authService';
import {
  AddJointAccountModal,
  AddJointTransactionModal,
  AddJointBillModal,
  AddJointGroceryModal,
} from '../components/JointActionModals';
import { JointWorkspaceHeader } from '../components/JointWorkspaceHeader';
import { JointActivityView } from '../components/JointActivityView';
import { NotificationCenterModal } from '../components/NotificationCenterModal';
import { useFinance } from '../context/FinanceContext';

interface JointFinancesPageProps {
  activeTab?: JointActiveTab;
  onNavigateTab?: (tab: JointActiveTab) => void;
  currentUser: AuthUser | null;
  onOpenAuthModal: () => void;
  workspace: JointWorkspace | null;
  accounts: FinancialAccount[];
  transactions: TransactionRecord[];
  bills: BillDefinition[];
  monthlyBillEntries: Record<string, MonthlyBillEntry>;
  budgets: Record<string, MonthlyBudget>;
  groceryItems: GroceryItem[];
  activities: JointActivityItem[];
  invitations: JointInvitation[];
  sentInvitations: JointInvitation[];
  isRealtimeActive: boolean;
  isOnline: boolean;
  lastSyncTime: string | null;
  pendingMutationCount: number;
  onCreateWorkspace: (data: {
    name: string;
    relationship: string;
    inviteeEmail?: string;
    invitationMessage?: string;
  }) => Promise<boolean>;
  onInvitePartner: (email: string, message?: string) => Promise<boolean>;
  onAcceptInvitation: (id: string) => Promise<boolean>;
  onDeclineInvitation: (id: string) => Promise<boolean>;
  onRevokeInvitation: (id: string) => Promise<boolean>;
  onUpdateWorkspace: (data: { name: string; relationship: string }) => Promise<boolean>;
  onRemoveMember: (memberUid: string) => Promise<boolean>;
  onLeaveWorkspace: () => Promise<boolean>;
  onRefreshData?: () => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const JointFinancesPage: React.FC<JointFinancesPageProps> = ({
  activeTab: controlledActiveTab,
  onNavigateTab,
  currentUser,
  onOpenAuthModal,
  workspace,
  accounts,
  transactions,
  bills,
  monthlyBillEntries,
  budgets,
  groceryItems,
  activities,
  invitations,
  sentInvitations,
  isRealtimeActive,
  isOnline,
  lastSyncTime,
  pendingMutationCount,
  onCreateWorkspace,
  onInvitePartner,
  onAcceptInvitation,
  onDeclineInvitation,
  onRevokeInvitation,
  onUpdateWorkspace,
  onRemoveMember,
  onLeaveWorkspace,
  onRefreshData,
  showToast,
}) => {
  const [localActiveTab, setLocalActiveTab] = useState<JointActiveTab>('overview');
  const activeTab = controlledActiveTab ?? localActiveTab;
  const setActiveTab = (tab: JointActiveTab) => {
    setLocalActiveTab(tab);
    onNavigateTab?.(tab);
  };
  const {
    unreadNotificationsCount,
    jointUnreadCount,
    setAccountMode,
    setJointAccounts,
    setJointTransactions,
    setJointBills,
    setJointGroceryItems,
  } = useFinance();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInvitationsModalOpen, setIsInvitationsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Modals for joint financial operations
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [addAccountCategory, setAddAccountCategory] = useState<AccountCategory>('Wallet');
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [isAddGroceryOpen, setIsAddGroceryOpen] = useState(false);
  const [isConvertGroceryOpen, setIsConvertGroceryOpen] = useState(false);

  // Filters
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | TransactionType>('all');
  const [accountCategoryFilter, setAccountCategoryFilter] = useState<'All' | AccountCategory>('All');
  const [grocerySearch, setGrocerySearch] = useState('');

  // State for sub-tabs (Budgets, Members, Settings)
  const [editingBudgetCategory, setEditingBudgetCategory] = useState<string | null>(null);
  const [budgetLimitInput, setBudgetLimitInput] = useState<string>('');
  const [inviteEmailInput, setInviteEmailInput] = useState<string>('');
  const [inviteMessageInput, setInviteMessageInput] = useState<string>('');
  const [isInvitingPartner, setIsInvitingPartner] = useState<boolean>(false);
  const [settingsName, setSettingsName] = useState<string>(workspace?.name || '');
  const [settingsRel, setSettingsRel] = useState<string>(workspace?.relationship || 'Partner');
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  // Sync settings inputs when workspace changes
  React.useEffect(() => {
    if (workspace) {
      setSettingsName(workspace.name || '');
      setSettingsRel(workspace.relationship || 'Partner');
    }
  }, [workspace?.id, workspace?.name, workspace?.relationship]);

  const currentMonthKey = getMonthKey();
  const currentUserId = currentUser?.uid || '';
  const currentUserName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  // ---------------------------------------------------------------------------
  // Reconciled Account Balances for Joint Workspace
  // ---------------------------------------------------------------------------
  const reconciledJointAccounts = useMemo(() => {
    return accounts.map((acc) => {
      const balance = calculateAccountBalance(acc, transactions);
      return {
        ...acc,
        balance,
      };
    });
  }, [accounts, transactions]);

  // Combined Financial Summaries
  const metrics = useMemo(() => {
    let combinedCash = 0;
    let combinedDebt = 0;

    reconciledJointAccounts.forEach((acc) => {
      if (acc.category === 'Wallet' || acc.category === 'Savings') {
        combinedCash += Math.max(0, acc.balance);
      } else if (acc.category === 'Credit' || acc.category === 'Loans') {
        combinedDebt += Math.max(0, acc.balance);
      }
    });

    let currentMonthIncome = 0;
    let currentMonthExpense = 0;

    transactions.forEach((tx) => {
      if (!tx.dateTime.startsWith(currentMonthKey)) return;
      if (tx.isStartingBalance) return;

      if (tx.type === 'income') {
        currentMonthIncome += tx.amount;
      } else if (tx.type === 'expense') {
        currentMonthExpense += tx.amount;
      }
    });

    const netCashFlow = currentMonthIncome - currentMonthExpense;

    // Shared bills due this month
    let billsDueTotal = 0;
    let unpaidBillsCount = 0;
    bills.forEach((b) => {
      const entryId = `${b.id}_${currentMonthKey}`;
      const entry = monthlyBillEntries[entryId];
      const dueAmt = entry?.actualAmount ?? b.defaultAmount;
      const paid = entry?.payments?.reduce((s, p) => s + p.amount, 0) || 0;
      const remaining = Math.max(0, dueAmt - paid);
      if (remaining > 0 && !entry?.isPaidManually) {
        billsDueTotal += remaining;
        unpaidBillsCount++;
      }
    });

    return {
      combinedCash,
      combinedDebt,
      currentMonthIncome,
      currentMonthExpense,
      netCashFlow,
      billsDueTotal,
      unpaidBillsCount,
    };
  }, [reconciledJointAccounts, transactions, bills, monthlyBillEntries, currentMonthKey]);

  // Partner member information
  const partnerMember = useMemo(() => {
    if (!workspace || !workspace.members) return null;
    return workspace.members.find((m) => m.uid !== currentUserId) || null;
  }, [workspace, currentUserId]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (txTypeFilter !== 'all' && tx.type !== txTypeFilter) return false;
      if (txSearch.trim()) {
        const q = txSearch.toLowerCase();
        return (
          tx.merchantOrTitle.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          (tx.createdByName || '').toLowerCase().includes(q) ||
          (tx.notes || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, txTypeFilter, txSearch]);

  // Filtered groceries
  const filteredGroceries = useMemo(() => {
    return groceryItems.filter((g) => {
      if (grocerySearch.trim()) {
        const q = grocerySearch.toLowerCase();
        return g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [groceryItems, grocerySearch]);

  // ---------------------------------------------------------------------------
  // Joint Mutation Handlers
  // ---------------------------------------------------------------------------
  const handleSaveJointAccount = async (accountData: FinancialAccount) => {
    if (!workspace) return;
    const isNew = !accounts.some((a) => a.id === accountData.id);
    const enriched: FinancialAccount = {
      ...accountData,
      jointWorkspaceId: workspace.id,
      createdByUid: currentUserId,
      createdByName: currentUserName,
      updatedAt: new Date().toISOString(),
    };

    setJointAccounts((prev) => {
      const exists = prev.some((a) => a.id === enriched.id);
      return exists ? prev.map((a) => (a.id === enriched.id ? enriched : a)) : [...prev, enriched];
    });

    if (isNew && accountData.startingBalance > 0) {
      const startTx: TransactionRecord = {
        id: `tx_start_${accountData.id}`,
        type: 'adjustment',
        adjustmentSign: 'positive',
        amount: accountData.startingBalance,
        accountId: accountData.id,
        category: 'Starting Balance',
        merchantOrTitle: 'Starting Balance',
        dateTime: accountData.createdAt || new Date().toISOString(),
        notes: `Initial ${accountData.category.toLowerCase()} balance`,
        isStartingBalance: true,
        jointWorkspaceId: workspace.id,
        paidByUserId: currentUserId,
        paidByUserName: currentUserName,
      };

      setJointTransactions((prev) => [startTx, ...prev]);

      await writeJointMutation(
        workspace.id,
        'transactions',
        startTx.id,
        'set',
        startTx,
        {
          actorName: currentUserName,
          actionType: 'account_created',
          description: `Starting balance for joint account "${accountData.name}" (${formatPeso(accountData.startingBalance)})`,
          amount: accountData.startingBalance,
          entityType: 'account',
          entityId: accountData.id,
          entityName: accountData.name,
        }
      );
    }

    await writeJointMutation(
      workspace.id,
      'accounts',
      accountData.id,
      'set',
      enriched,
      {
        actorName: currentUserName,
        actionType: isNew ? 'account_created' : 'account_updated',
        description: isNew
          ? `${currentUserName} added joint account "${accountData.name}".`
          : `${currentUserName} updated joint account "${accountData.name}".`,
        entityType: 'account',
        entityId: accountData.id,
        entityName: accountData.name,
      }
    );

    showToast(isNew ? 'Joint account created!' : 'Joint account updated!', 'success');
    setIsAddAccountOpen(false);
  };

  const handleSaveJointTransaction = async (txData: TransactionRecord) => {
    if (!workspace) return;
    const enriched: TransactionRecord = {
      ...txData,
      jointWorkspaceId: workspace.id,
      createdByUid: currentUserId,
      createdByName: currentUserName,
      paidByUserId: currentUserId,
      paidByUserName: currentUserName,
      updatedAt: new Date().toISOString(),
    };

    setJointTransactions((prev) => {
      const exists = prev.some((t) => t.id === enriched.id);
      return exists ? prev.map((t) => (t.id === enriched.id ? enriched : t)) : [enriched, ...prev];
    });

    await writeJointMutation(
      workspace.id,
      'transactions',
      txData.id,
      'set',
      enriched,
      {
        actorName: currentUserName,
        actionType: 'transaction_added',
        description: `${currentUserName} recorded joint ${txData.type}: ${txData.merchantOrTitle} (${formatPeso(txData.amount)}).`,
        amount: txData.amount,
        entityType: 'transaction',
        entityId: txData.id,
        entityName: txData.merchantOrTitle,
        category: txData.category,
      }
    );

    showToast(`Joint ${txData.type} recorded!`, 'success');
    setIsAddTxOpen(false);
  };

  const handleDeleteJointTransaction = async (txId: string) => {
    if (!workspace) return;
    const tx = transactions.find((t) => t.id === txId);
    await writeJointMutation(
      workspace.id,
      'transactions',
      txId,
      'delete',
      null,
      {
        actorName: currentUserName,
        actionType: 'transaction_deleted',
        description: `${currentUserName} deleted a joint transaction (${tx?.merchantOrTitle || txId}).`,
      }
    );
    showToast('Joint transaction deleted.', 'info');
  };

  const handleSaveJointBill = async (billData: BillDefinition) => {
    if (!workspace) return;
    const isNew = !bills.some((b) => b.id === billData.id);
    const enriched: BillDefinition = {
      ...billData,
      jointWorkspaceId: workspace.id,
      createdByUid: currentUserId,
      createdByName: currentUserName,
      updatedAt: new Date().toISOString(),
    };

    setJointBills((prev) => {
      const exists = prev.some((b) => b.id === enriched.id);
      return exists ? prev.map((b) => (b.id === enriched.id ? enriched : b)) : [...prev, enriched];
    });

    await writeJointMutation(
      workspace.id,
      'bills',
      billData.id,
      'set',
      enriched,
      {
        actorName: currentUserName,
        actionType: 'bill_created',
        description: `${currentUserName} added shared bill "${billData.name}".`,
        amount: billData.defaultAmount,
        entityType: 'bill',
        entityId: billData.id,
        entityName: billData.name,
        category: billData.category,
      }
    );

    showToast(isNew ? 'Shared bill added!' : 'Shared bill updated!', 'success');
    setIsAddBillOpen(false);
  };

  const handlePayJointBill = async (bill: BillDefinition) => {
    if (!workspace) return;
    const entryId = `${bill.id}_${currentMonthKey}`;
    const entry = monthlyBillEntries[entryId] || {
      id: entryId,
      billId: bill.id,
      monthKey: currentMonthKey,
      dueDate: `${currentMonthKey}-${String(bill.dueDay).padStart(2, '0')}`,
      actualAmount: bill.defaultAmount,
      payments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newPayment = {
      id: paymentId,
      billId: bill.id,
      monthKey: currentMonthKey,
      amount: entry.actualAmount,
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: 'Cash' as const,
      createdAt: new Date().toISOString(),
    };

    const updatedEntry: MonthlyBillEntry = {
      ...entry,
      payments: [...(entry.payments || []), newPayment],
      isPaidManually: true,
      updatedAt: new Date().toISOString(),
    };

    await writeJointMutation(
      workspace.id,
      'monthlyBillEntries',
      entryId,
      'set',
      updatedEntry,
      {
        actorName: currentUserName,
        actionType: 'bill_paid',
        description: `${currentUserName} marked ${bill.name} as paid (${formatPeso(entry.actualAmount)}).`,
        amount: entry.actualAmount,
        entityType: 'bill',
        entityId: bill.id,
        entityName: bill.name,
      }
    );

    showToast(`Marked ${bill.name} as paid!`, 'success');
  };

  const handleSaveJointGrocery = async (groceryData: GroceryItem) => {
    if (!workspace) return;
    const isNew = !groceryItems.some((g) => g.id === groceryData.id);
    const enriched: GroceryItem = {
      ...groceryData,
      jointWorkspaceId: workspace.id,
      createdByUid: currentUserId,
      createdByName: currentUserName,
      updatedAt: new Date().toISOString(),
    };

    setJointGroceryItems((prev) => {
      const exists = prev.some((g) => g.id === enriched.id);
      return exists ? prev.map((g) => (g.id === enriched.id ? enriched : g)) : [...prev, enriched];
    });

    await writeJointMutation(
      workspace.id,
      'groceries',
      groceryData.id,
      'set',
      enriched,
      {
        actorName: currentUserName,
        actionType: 'grocery_added',
        description: `${currentUserName} added "${groceryData.name}" to the shared grocery list.`,
        amount: groceryData.estimatedTotal,
        entityType: 'grocery',
        entityId: groceryData.id,
        entityName: groceryData.name,
        category: groceryData.category,
      }
    );

    showToast(isNew ? 'Grocery item added!' : 'Grocery item updated!', 'success');
    setIsAddGroceryOpen(false);
  };

  const handleToggleGroceryPurchased = async (item: GroceryItem) => {
    if (!workspace) return;
    const nextPurchased = !item.isPurchased;
    const updated = {
      ...item,
      isPurchased: nextPurchased,
      purchasedDate: nextPurchased ? new Date().toISOString().slice(0, 10) : undefined,
      updatedAt: new Date().toISOString(),
    };

    await writeJointMutation(
      workspace.id,
      'groceries',
      item.id,
      'set',
      updated,
      {
        actorName: currentUserName,
        actionType: 'grocery_purchased',
        description: nextPurchased
          ? `${currentUserName} checked off "${item.name}" as bought.`
          : `${currentUserName} uncheck "${item.name}".`,
      }
    );
  };

  const handleDeleteGroceryItem = async (itemId: string) => {
    if (!workspace) return;
    await writeJointMutation(workspace.id, 'groceries', itemId, 'delete');
    showToast('Grocery item removed', 'info');
  };

  const handleSaveBudget = async (category: string, amountPesos: number) => {
    if (!workspace) return;
    const amountCentavos = toCentavos(amountPesos);
    const existingMonthBudget = budgets[currentMonthKey] || {
      monthKey: currentMonthKey,
      totalBudget: 0,
      categoryBudgets: [],
      alertThresholdPercent: 80,
    };

    const existingCatList = existingMonthBudget.categoryBudgets || [];
    const updatedCatList = existingCatList.some((c) => c.category.toLowerCase() === category.toLowerCase())
      ? existingCatList.map((c) =>
          c.category.toLowerCase() === category.toLowerCase() ? { ...c, limit: amountCentavos } : c
        )
      : [...existingCatList, { category, limit: amountCentavos }];

    const newTotal = updatedCatList.reduce((sum, c) => sum + c.limit, 0);

    const updatedMonthBudget: MonthlyBudget = {
      ...existingMonthBudget,
      monthKey: currentMonthKey,
      totalBudget: newTotal,
      categoryBudgets: updatedCatList,
      updatedAt: new Date().toISOString(),
    };

    await writeJointMutation(
      workspace.id,
      'budgets',
      currentMonthKey,
      'set',
      updatedMonthBudget,
      {
        actorName: currentUserName,
        actionType: 'budget_updated',
        description: `${currentUserName} updated joint budget for ${category} to ${formatPeso(amountCentavos)}.`,
      }
    );
    setEditingBudgetCategory(null);
    setBudgetLimitInput('');
    showToast(`Joint budget for "${category}" saved!`, 'success');
  };

  const handleSendPartnerInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmailInput.trim()) return;
    const targetEmail = inviteEmailInput.trim().toLowerCase();
    if (currentUser?.email && targetEmail === currentUser.email.toLowerCase()) {
      showToast('You cannot invite your own email address.', 'error');
      return;
    }
    setIsInvitingPartner(true);
    try {
      const ok = await onInvitePartner(targetEmail, inviteMessageInput.trim() || undefined);
      if (ok) {
        setInviteEmailInput('');
        setInviteMessageInput('');
        showToast(`Invitation sent to ${targetEmail}!`, 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to send invitation.', 'error');
    } finally {
      setIsInvitingPartner(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsName.trim()) {
      showToast('Workspace name cannot be empty.', 'error');
      return;
    }
    setIsSavingSettings(true);
    try {
      const ok = await onUpdateWorkspace({
        name: settingsName.trim(),
        relationship: settingsRel.trim() || 'Partner',
      });
      if (ok) {
        showToast('Joint workspace settings updated!', 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to update workspace settings.', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ---------------------------------------------------------------------------
  // STATE 1: GUEST (NOT AUTHENTICATED)
  // ---------------------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="space-y-6 pb-12 w-full max-w-4xl mx-auto px-4 py-8">
        <div className="text-center space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[#174F32] text-[#83C95B] flex items-center justify-center shadow-md">
            <Users className="w-8 h-8 stroke-[2.2]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#252923] dark:text-white tracking-tight">
              PesoTrack Joint Accounts
            </h1>
            <p className="text-sm text-[#777D75] dark:text-[#8FA095] leading-relaxed">
              Manage shared finances, household budgets, recurring bills, and grocery shopping in real-time with your partner or family.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-6 py-3 rounded-2xl bg-[#174F32] hover:bg-[#123E27] text-white text-sm font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-[#83C95B]" />
              <span>Sign In or Register to Use Joint Account</span>
            </button>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-2xl p-5 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#252923] dark:text-white">Real-Time Sync</h3>
            <p className="text-xs text-[#777D75] dark:text-[#8FA095] leading-relaxed">
              When either partner records an expense, pays a bill, or buys groceries, changes synchronize immediately.
            </p>
          </div>

          <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-2xl p-5 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#252923] dark:text-white">Strict Personal Privacy</h3>
            <p className="text-xs text-[#777D75] dark:text-[#8FA095] leading-relaxed">
              Your personal accounts and transactions remain 100% private. Only shared joint finances appear here.
            </p>
          </div>

          <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-2xl p-5 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#252923] dark:text-white">Bills & Grocery Checklist</h3>
            <p className="text-xs text-[#777D75] dark:text-[#8FA095] leading-relaxed">
              Keep track of household utilities and grocery planning with live check-off and expense conversion.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STATE 2: EMPTY STATE (NO ACTIVE JOINT WORKSPACE)
  // ---------------------------------------------------------------------------
  if (!workspace) {
    const pendingReceived = invitations.filter((i) => i.status === 'pending');

    return (
      <div className="space-y-6 pb-12 w-full max-w-4xl mx-auto px-4 py-6">
        {/* Pending Invitations Banner (if any) */}
        {pendingReceived.length > 0 && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-emerald-950 dark:text-emerald-100">
                    You have {pendingReceived.length} pending joint account invitation{pendingReceived.length > 1 ? 's' : ''}!
                  </h2>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    A partner has invited you to share household finances.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInvitationsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-extrabold transition-all shrink-0 cursor-pointer shadow-xs"
              >
                Review & Accept
              </button>
            </div>
          </div>
        )}

        {/* Hero Card */}
        <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-6 sm:p-10 text-center shadow-xs space-y-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-[#174F32]/10 dark:bg-[#83C95B]/15 text-[#174F32] dark:text-[#83C95B] flex items-center justify-center">
            <Users className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2.2]" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#252923] dark:text-white tracking-tight">
              Start Your Joint Finances
            </h1>
            <p className="text-xs sm:text-sm text-[#777D75] dark:text-[#8FA095] leading-relaxed">
              Create a shared workspace to collaborate on bills, grocery lists, shared wallets, and household spending.
            </p>
          </div>

          {/* Privacy Guarantee Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8F3EC] dark:bg-[#183023] text-xs font-bold text-[#174F32] dark:text-[#83C95B] border border-[#C5E2D1] dark:border-[#264835]">
            <Lock className="w-3.5 h-3.5" />
            <span>Personal accounts remain private & untouched</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#174F32] hover:bg-[#123E27] text-white text-sm font-extrabold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Joint Account</span>
            </button>

            <button
              type="button"
              onClick={() => setIsInvitationsModalOpen(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#283C2F] text-xs sm:text-sm font-bold text-[#252923] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4 text-[#777D75]" />
              <span>Check Invitations</span>
              {pendingReceived.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              )}
            </button>
          </div>
        </div>

        {/* Modals */}
        <CreateJointModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={onCreateWorkspace}
          userEmail={currentUser.email}
        />

        <JointInvitationsModal
          isOpen={isInvitationsModalOpen}
          onClose={() => setIsInvitationsModalOpen(false)}
          invitations={invitations}
          sentInvitations={sentInvitations}
          onAccept={onAcceptInvitation}
          onDecline={onDeclineInvitation}
          onRevoke={onRevokeInvitation}
          currentUserEmail={currentUser.email}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STATE 3: ACTIVE JOINT WORKSPACE
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4 sm:space-y-6 pb-12 w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
      {/* 1. Joint Workspace Header Card */}
      <JointWorkspaceHeader
        workspace={workspace}
        currentUserId={currentUserId}
        isOnline={isOnline}
        pendingMutationCount={pendingMutationCount}
        lastSyncTime={lastSyncTime}
        unreadCount={jointUnreadCount > 0 ? jointUnreadCount : unreadNotificationsCount}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        onOpenSettings={() => setActiveTab('settings')}
        onInviteMember={() => setIsSettingsModalOpen(true)}
      />

      {/* 2. Overview Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Financial Summary Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Combined Cash & Wallets */}
            <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#777D75] dark:text-[#8FA095]">Combined Cash</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <p className="text-base sm:text-xl font-extrabold text-[#252923] dark:text-white tabular-nums tracking-tight">
                {formatPeso(metrics.combinedCash)}
              </p>
              <p className="text-[11px] text-[#777D75]">{accounts.length} joint account{accounts.length === 1 ? '' : 's'}</p>
            </div>

            {/* Joint Income This Month */}
            <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#777D75] dark:text-[#8FA095]">Joint Income</span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <p className="text-base sm:text-xl font-extrabold text-[#252923] dark:text-white tabular-nums tracking-tight">
                {formatPeso(metrics.currentMonthIncome)}
              </p>
              <p className="text-[11px] text-[#777D75]">This month</p>
            </div>

            {/* Joint Expenses This Month */}
            <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#777D75] dark:text-[#8FA095]">Joint Expenses</span>
                <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <p className="text-base sm:text-xl font-extrabold text-[#252923] dark:text-white tabular-nums tracking-tight">
                {formatPeso(metrics.currentMonthExpense)}
              </p>
              <p className="text-[11px] text-[#777D75]">This month</p>
            </div>

            {/* Shared Bills Due */}
            <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#777D75] dark:text-[#8FA095]">Shared Bills Due</span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <p className="text-base sm:text-xl font-extrabold text-[#252923] dark:text-white tabular-nums tracking-tight">
                {formatPeso(metrics.billsDueTotal)}
              </p>
              <p className="text-[11px] text-[#777D75]">
                {metrics.unpaidBillsCount} unpaid bill{metrics.unpaidBillsCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {/* Quick Action Responsive Toolbar */}
          <div className="bg-[#E8F3EC] dark:bg-[#183023] border border-[#C5E2D1] dark:border-[#264835] rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-extrabold text-[#174F32] dark:text-[#83C95B]">
              Quick Shared Actions:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setTxType('expense');
                  setIsAddTxOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer min-h-[40px]"
              >
                <Plus className="w-4 h-4 text-[#83C95B]" />
                <span>Record Expense</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTxType('income');
                  setIsAddTxOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#1C2C23] text-[#252923] dark:text-white border border-[#E5E1D8] dark:border-[#283C2F] text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer min-h-[40px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Add Income</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAddAccountCategory('Wallet');
                  setIsAddAccountOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#1C2C23] text-[#252923] dark:text-white border border-[#E5E1D8] dark:border-[#283C2F] text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer min-h-[40px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Wallet className="w-4 h-4 text-[#174F32] dark:text-[#83C95B]" />
                <span>+ Shared Account</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddBillOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#1C2C23] text-[#252923] dark:text-white border border-[#E5E1D8] dark:border-[#283C2F] text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer min-h-[40px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>+ Add Bill</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddGroceryOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#1C2C23] text-[#252923] dark:text-white border border-[#E5E1D8] dark:border-[#283C2F] text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer min-h-[40px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>+ Grocery</span>
              </button>
            </div>
          </div>

          {/* Quick Hub Navigation Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] text-left hover:border-[#174F32]/50 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <Wallet className="w-4 h-4 text-[#174F32] dark:text-[#83C95B] group-hover:scale-110 transition-transform" />
                <ChevronRight className="w-3.5 h-3.5 text-[#777D75] opacity-50 group-hover:opacity-100" />
              </div>
              <p className="text-xs font-extrabold text-[#252923] dark:text-white truncate">Accounts</p>
              <p className="text-[11px] text-[#777D75] truncate">{accounts.length} active</p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] text-left hover:border-[#174F32]/50 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <ArrowUpRight className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                <ChevronRight className="w-3.5 h-3.5 text-[#777D75] opacity-50 group-hover:opacity-100" />
              </div>
              <p className="text-xs font-extrabold text-[#252923] dark:text-white truncate">Transactions</p>
              <p className="text-[11px] text-[#777D75] truncate">{transactions.length} recorded</p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bills')}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] text-left hover:border-[#174F32]/50 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                <ChevronRight className="w-3.5 h-3.5 text-[#777D75] opacity-50 group-hover:opacity-100" />
              </div>
              <p className="text-xs font-extrabold text-[#252923] dark:text-white truncate">Bills & Due</p>
              <p className="text-[11px] text-[#777D75] truncate">{metrics.unpaidBillsCount} unpaid</p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('groceries')}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] text-left hover:border-[#174F32]/50 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                <ChevronRight className="w-3.5 h-3.5 text-[#777D75] opacity-50 group-hover:opacity-100" />
              </div>
              <p className="text-xs font-extrabold text-[#252923] dark:text-white truncate">Grocery List</p>
              <p className="text-[11px] text-[#777D75] truncate">{groceryItems.filter(g => !g.isPurchased).length} to buy</p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('budgets')}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] text-left hover:border-[#174F32]/50 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                <ChevronRight className="w-3.5 h-3.5 text-[#777D75] opacity-50 group-hover:opacity-100" />
              </div>
              <p className="text-xs font-extrabold text-[#252923] dark:text-white truncate">Budgets</p>
              <p className="text-[11px] text-[#777D75] truncate">Category limits</p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] text-left hover:border-[#174F32]/50 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                <ChevronRight className="w-3.5 h-3.5 text-[#777D75] opacity-50 group-hover:opacity-100" />
              </div>
              <p className="text-xs font-extrabold text-[#252923] dark:text-white truncate">Members</p>
              <p className="text-[11px] text-[#777D75] truncate">
                {partnerMember ? 'Collaborating' : '1 Member'}
              </p>
            </button>
          </div>

          {/* Two-Column Layout: Recent Transactions + Shared Bills */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Recent Shared Transactions */}
            <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#252923] dark:text-white">
                  Recent Shared Activity
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('transactions')}
                  className="text-xs font-bold text-[#174F32] dark:text-[#83C95B] hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              {transactions.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Receipt className="w-8 h-8 mx-auto text-[#777D75] opacity-50" />
                  <p className="text-xs text-[#777D75]">No joint transactions yet</p>
                  <button
                    type="button"
                    onClick={() => {
                      setTxType('expense');
                      setIsAddTxOpen(true);
                    }}
                    className="text-xs font-bold text-[#174F32] dark:text-[#83C95B] hover:underline cursor-pointer"
                  >
                    + Record first shared expense
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {transactions.slice(0, 5).map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-2xl bg-[#F6F4EE]/70 dark:bg-[#1C2C23]/70 border border-[#E5E1D8]/60 dark:border-[#283C2F]/60 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.type === 'income'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}
                        >
                          {tx.type === 'income' ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0 truncate">
                          <p className="text-xs sm:text-sm font-bold text-[#252923] dark:text-white truncate">
                            {tx.merchantOrTitle}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-[#777D75] dark:text-[#8FA095]">
                            <span>{tx.category}</span>
                            <span>•</span>
                            <span>By {tx.createdByName || 'Partner'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p
                          className={`text-xs sm:text-sm font-extrabold tabular-nums ${
                            tx.type === 'income'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-[#252923] dark:text-white'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'} {formatPeso(tx.amount)}
                        </p>
                        <span className="text-[10px] text-[#777D75]">
                          {new Date(tx.dateTime).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shared Household Bills */}
            <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#252923] dark:text-white">
                  Shared Bills & Utilities
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('bills')}
                  className="text-xs font-bold text-[#174F32] dark:text-[#83C95B] hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              {bills.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Calendar className="w-8 h-8 mx-auto text-[#777D75] opacity-50" />
                  <p className="text-xs text-[#777D75]">No joint bills configured yet</p>
                  <button
                    type="button"
                    onClick={() => setIsAddBillOpen(true)}
                    className="text-xs font-bold text-[#174F32] dark:text-[#83C95B] hover:underline cursor-pointer"
                  >
                    + Add Meralco, Rent, or Wi-Fi bill
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {bills.slice(0, 4).map((b) => {
                    const entryId = `${b.id}_${currentMonthKey}`;
                    const entry = monthlyBillEntries[entryId];
                    const dueAmt = entry?.actualAmount ?? b.defaultAmount;
                    const paid = entry?.payments?.reduce((s, p) => s + p.amount, 0) || 0;
                    const isPaid = entry?.isPaidManually || paid >= dueAmt;

                    return (
                      <div
                        key={b.id}
                        className="p-3 rounded-2xl bg-[#F6F4EE]/70 dark:bg-[#1C2C23]/70 border border-[#E5E1D8]/60 dark:border-[#283C2F]/60 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-[#252923] dark:text-white truncate">
                            {b.name}
                          </p>
                          <p className="text-[11px] text-[#777D75] dark:text-[#8FA095]">
                            Due Day {b.dueDay} of month • {b.category}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs sm:text-sm font-extrabold tabular-nums text-[#252923] dark:text-white">
                            {formatPeso(dueAmt)}
                          </span>

                          {isPaid ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Paid</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePayJointBill(b)}
                              className="px-2.5 py-1 rounded-lg bg-[#174F32] hover:bg-[#123E27] text-white text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Accounts Tab Content */}
      {activeTab === 'accounts' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-[#E8E4DA] dark:bg-[#16241C] p-1 rounded-2xl overflow-x-auto">
              {(['All', 'Wallet', 'Savings', 'Credit', 'Loans'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAccountCategoryFilter(cat)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    accountCategoryFilter === cat
                      ? 'bg-[#174F32] text-white shadow-xs'
                      : 'text-[#61685D] dark:text-[#9EA59B]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setAddAccountCategory('Wallet');
                setIsAddAccountOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Shared Account</span>
            </button>
          </div>

          {reconciledJointAccounts.length === 0 ? (
            <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-10 text-center space-y-3">
              <Wallet className="w-10 h-10 mx-auto text-[#777D75] opacity-50" />
              <h3 className="text-base font-extrabold text-[#252923] dark:text-white">
                No Shared Accounts Yet
              </h3>
              <p className="text-xs text-[#777D75] max-w-sm mx-auto">
                Add a joint wallet (e.g. "Household Maya", "Groceries Cash") or shared bank account for both of you to monitor.
              </p>
              <button
                type="button"
                onClick={() => setIsAddAccountOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#174F32] text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Shared Account</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {reconciledJointAccounts
                .filter((a) => accountCategoryFilter === 'All' || a.category === accountCategoryFilter)
                .map((acc) => (
                  <div
                    key={acc.id}
                    className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-2xl p-4 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <ProviderLogo
                          providerId={acc.providerId}
                          name={acc.name}
                          customColor={acc.customColor}
                          className="w-10 h-10 rounded-xl"
                        />
                        <div>
                          <h4 className="text-sm font-extrabold text-[#252923] dark:text-white leading-tight">
                            {acc.name}
                          </h4>
                          <span className="text-[11px] text-[#777D75]">{acc.category}</span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#174F32]/10 dark:bg-[#83C95B]/15 text-[#174F32] dark:text-[#83C95B]">
                        Shared
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#E5E1D8]/60 dark:border-[#223528]/60 flex items-center justify-between">
                      <span className="text-xs text-[#777D75]">Current Balance</span>
                      <span className="text-base font-extrabold text-[#252923] dark:text-white tabular-nums">
                        {formatPeso(acc.balance)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#777D75] pt-1">
                      <span>Created by {acc.createdByName || 'Partner'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTxType('expense');
                          setIsAddTxOpen(true);
                        }}
                        className="text-[#174F32] dark:text-[#83C95B] font-bold hover:underline cursor-pointer"
                      >
                        + Transaction
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Transactions Tab Content */}
      {activeTab === 'transactions' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#777D75] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Search shared transactions..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] text-xs sm:text-sm text-[#252923] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32]"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-[#E8E4DA] dark:bg-[#16241C] p-1 rounded-2xl">
                {(['all', 'expense', 'income', 'transfer'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTxTypeFilter(t)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                      txTypeFilter === t
                        ? 'bg-[#174F32] text-white shadow-xs'
                        : 'text-[#61685D] dark:text-[#9EA59B]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setTxType('expense');
                  setIsAddTxOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Transaction</span>
              </button>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-10 text-center space-y-2">
              <Receipt className="w-8 h-8 mx-auto text-[#777D75] opacity-50" />
              <p className="text-sm font-bold text-[#252923] dark:text-white">No transactions found</p>
              <p className="text-xs text-[#777D75]">Record a joint expense or income to track your shared budget.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl overflow-hidden shadow-2xs divide-y divide-[#E5E1D8]/60 dark:divide-[#223528]/60">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 sm:p-4 hover:bg-black/2 dark:hover:bg-white/2 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'income'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}
                    >
                      {tx.type === 'income' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-extrabold text-[#252923] dark:text-white truncate">
                        {tx.merchantOrTitle}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-[#777D75] dark:text-[#8FA095] flex-wrap">
                        <span className="font-semibold text-[#174F32] dark:text-[#83C95B]">
                          {tx.category}
                        </span>
                        <span>•</span>
                        <span>{new Date(tx.dateTime).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 font-bold">
                          By {tx.createdByName || 'Partner'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <p
                      className={`text-xs sm:text-sm font-black tabular-nums ${
                        tx.type === 'income'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-[#252923] dark:text-white'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'} {formatPeso(tx.amount)}
                    </p>

                    <button
                      type="button"
                      onClick={() => handleDeleteJointTransaction(tx.id)}
                      className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                      title="Delete transaction"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Bills Tab Content */}
      {activeTab === 'bills' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#252923] dark:text-white">
                Shared Household Bills
              </h3>
              <p className="text-xs text-[#777D75]">
                Track monthly electricity, water, internet, and rent obligations
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddBillOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs sm:text-sm font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Shared Bill</span>
            </button>
          </div>

          {bills.length === 0 ? (
            <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-10 text-center space-y-3">
              <Calendar className="w-10 h-10 mx-auto text-[#777D75] opacity-50" />
              <h4 className="text-sm font-extrabold text-[#252923] dark:text-white">
                No Shared Bills Defined
              </h4>
              <p className="text-xs text-[#777D75] max-w-sm mx-auto">
                Add recurring bills like Meralco, Maynilad, Converge, or Rent to synchronize due dates and payment tracking.
              </p>
              <button
                type="button"
                onClick={() => setIsAddBillOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#174F32] text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Shared Bill</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {bills.map((b) => {
                const entryId = `${b.id}_${currentMonthKey}`;
                const entry = monthlyBillEntries[entryId];
                const dueAmt = entry?.actualAmount ?? b.defaultAmount;
                const paid = entry?.payments?.reduce((s, p) => s + p.amount, 0) || 0;
                const isPaid = entry?.isPaidManually || paid >= dueAmt;

                return (
                  <div
                    key={b.id}
                    className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-2xl p-4 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-extrabold text-[#252923] dark:text-white">
                          {b.name}
                        </h4>
                        <span className="text-[11px] text-[#777D75]">
                          {b.category} • Day {b.dueDay}
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          isPaid
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {isPaid ? 'Paid' : 'Due'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#E5E1D8]/60 dark:border-[#223528]/60 flex items-center justify-between">
                      <span className="text-xs text-[#777D75]">Due Amount</span>
                      <span className="text-base font-extrabold text-[#252923] dark:text-white tabular-nums">
                        {formatPeso(dueAmt)}
                      </span>
                    </div>

                    {!isPaid ? (
                      <button
                        type="button"
                        onClick={() => handlePayJointBill(b)}
                        className="w-full py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Paid for {currentMonthKey}</span>
                      </button>
                    ) : (
                      <div className="py-1.5 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-xl">
                        ✓ Settled for this month
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Grocery List Tab Content */}
      {activeTab === 'groceries' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#777D75] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={grocerySearch}
                onChange={(e) => setGrocerySearch(e.target.value)}
                placeholder="Search shared grocery items..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] text-xs sm:text-sm text-[#252923] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32]"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAddGroceryOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Grocery Item</span>
            </button>
          </div>

          {filteredGroceries.length === 0 ? (
            <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-10 text-center space-y-3">
              <ShoppingBag className="w-10 h-10 mx-auto text-[#777D75] opacity-50" />
              <h4 className="text-sm font-extrabold text-[#252923] dark:text-white">
                Shared Grocery List is Empty
              </h4>
              <p className="text-xs text-[#777D75] max-w-sm mx-auto">
                Add groceries so you and your partner can check them off live while shopping at the supermarket!
              </p>
              <button
                type="button"
                onClick={() => setIsAddGroceryOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#174F32] text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl overflow-hidden shadow-2xs divide-y divide-[#E5E1D8]/60 dark:divide-[#223528]/60">
              {filteredGroceries.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                    item.isPurchased ? 'opacity-60 bg-black/2 dark:bg-white/2' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleGroceryPurchased(item)}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                        item.isPurchased
                          ? 'bg-[#174F32] border-[#174F32] text-white shadow-2xs'
                          : 'border-[#777D75]/40 hover:border-[#174F32]'
                      }`}
                    >
                      {item.isPurchased && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    <div className="min-w-0">
                      <p
                        className={`text-xs sm:text-sm font-bold text-[#252923] dark:text-white truncate ${
                          item.isPurchased ? 'line-through text-[#777D75]' : ''
                        }`}
                      >
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-[#777D75] dark:text-[#8FA095]">
                        <span>{item.quantity} {item.unit}</span>
                        <span>•</span>
                        <span>{item.category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs sm:text-sm font-black tabular-nums text-[#252923] dark:text-white">
                      {formatPeso(item.estimatedTotal || item.estimatedPrice * item.quantity)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDeleteGroceryItem(item.id)}
                      className="p-1 rounded-lg text-[#777D75] hover:text-red-500 hover:bg-black/5 transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. Activity Timeline & Interactive Calendar */}
      {activeTab === 'activity' && (
        <JointActivityView />
      )}

      {/* 8. Notifications Center View */}
      {activeTab === 'notifications' && (
        <div className="space-y-4 animate-fadeIn">
          <NotificationCenterModal
            isOpen={true}
            onClose={() => setActiveTab('overview')}
            onNavigateTab={(tab, mode) => {
              if (mode === 'joint') {
                setActiveTab(tab as JointActiveTab);
              } else {
                setAccountMode('personal');
              }
            }}
          />
        </div>
      )}

      {/* 8. Debt & Repayments Tab Content */}
      {activeTab === 'debt' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-[#252923] dark:text-white">
                Shared Debt & Repayments
              </h3>
              <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
                Track joint credit cards, household loans, and payoff progress
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setTxType('expense');
                setIsAddTxOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs sm:text-sm font-bold shadow-xs flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              <Plus className="w-4 h-4 text-[#83C95B]" />
              <span>+ Record Repayment</span>
            </button>
          </div>

          {/* Debt Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-[#777D75]">Combined Liabilities</span>
              <p className="text-xl sm:text-2xl font-black text-red-600 dark:text-red-400 tabular-nums">
                {formatPeso(metrics.combinedDebt)}
              </p>
              <p className="text-[11px] text-[#777D75]">
                {reconciledJointAccounts.filter((a) => a.category === 'Credit' || a.category === 'Loans').length} shared liability accounts
              </p>
            </div>

            <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-[#777D75]">Credit Cards</span>
              <p className="text-xl sm:text-2xl font-black text-[#252923] dark:text-white tabular-nums">
                {formatPeso(
                  reconciledJointAccounts
                    .filter((a) => a.category === 'Credit')
                    .reduce((sum, a) => sum + Math.abs(a.balance), 0)
                )}
              </p>
              <p className="text-[11px] text-[#777D75]">
                {reconciledJointAccounts.filter((a) => a.category === 'Credit').length} credit cards
              </p>
            </div>

            <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-[#777D75]">Loans & Obligations</span>
              <p className="text-xl sm:text-2xl font-black text-[#252923] dark:text-white tabular-nums">
                {formatPeso(
                  reconciledJointAccounts
                    .filter((a) => a.category === 'Loans')
                    .reduce((sum, a) => sum + Math.abs(a.balance), 0)
                )}
              </p>
              <p className="text-[11px] text-[#777D75]">
                {reconciledJointAccounts.filter((a) => a.category === 'Loans').length} loan accounts
              </p>
            </div>
          </div>

          {/* Accounts List for Debt */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#777D75] dark:text-[#8FA095]">
              Joint Debt & Card Accounts
            </h4>

            {reconciledJointAccounts.filter((a) => a.category === 'Credit' || a.category === 'Loans').length === 0 ? (
              <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-8 text-center space-y-3">
                <ShieldCheck className="w-10 h-10 mx-auto text-emerald-500 opacity-80" />
                <h4 className="text-sm font-extrabold text-[#252923] dark:text-white">
                  No Shared Debt Recorded
                </h4>
                <p className="text-xs text-[#777D75] max-w-sm mx-auto">
                  You and your partner have not added any joint credit cards or loans to this workspace.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAddAccountCategory('Credit');
                    setIsAddAccountOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Shared Credit or Loan</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {reconciledJointAccounts
                  .filter((a) => a.category === 'Credit' || a.category === 'Loans')
                  .map((acc) => (
                    <div
                      key={acc.id}
                      className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-2xl p-4 shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <ProviderLogo
                            providerId={acc.providerId}
                            name={acc.name}
                            customColor={acc.customColor}
                            className="w-10 h-10 rounded-xl"
                          />
                          <div>
                            <h5 className="text-sm font-extrabold text-[#252923] dark:text-white">
                              {acc.name}
                            </h5>
                            <span className="text-[11px] text-[#777D75]">{acc.category}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-red-500/15 text-red-700 dark:text-red-300">
                          Liability
                        </span>
                      </div>

                      <div className="pt-2 border-t border-[#E5E1D8]/60 dark:border-[#223528]/60 flex items-center justify-between">
                        <span className="text-xs text-[#777D75]">Current Balance</span>
                        <span className="text-base font-extrabold text-red-600 dark:text-red-400 tabular-nums">
                          {formatPeso(Math.abs(acc.balance))}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#777D75] pt-1">
                        <span>Added by {acc.createdByName || 'Partner'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setTxType('expense');
                            setIsAddTxOpen(true);
                          }}
                          className="text-[#174F32] dark:text-[#83C95B] font-bold hover:underline cursor-pointer"
                        >
                          + Repayment
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. Budgets Tab Content */}
      {activeTab === 'budgets' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-[#252923] dark:text-white">
                Shared Household Budgets
              </h3>
              <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
                Set monthly spending limits for shared categories in {currentMonthKey}
              </p>
            </div>
          </div>

          {/* Budget Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'Food & Dining',
              'Groceries',
              'Utilities',
              'Housing & Rent',
              'Transportation',
              'Healthcare',
              'Shopping',
              'Entertainment',
              'Other',
            ].map((cat) => {
              // Calculate actual monthly expenses in this category
              const spentCentavos = transactions
                .filter(
                  (tx) =>
                    tx.type === 'expense' &&
                    (tx.category || '').toLowerCase() === cat.toLowerCase()
                )
                .reduce((sum, tx) => sum + tx.amount, 0);

              const currentMonthBudget = budgets[currentMonthKey];
              const catBudget = currentMonthBudget?.categoryBudgets?.find(
                (b) => (b.category || '').toLowerCase() === cat.toLowerCase()
              );
              const limitCentavos = catBudget?.limit || 0;
              const hasBudget = limitCentavos > 0;
              const percentUsed = hasBudget ? Math.min(100, Math.round((spentCentavos / limitCentavos) * 100)) : 0;
              const isOverBudget = hasBudget && spentCentavos > limitCentavos;
              const isEditing = editingBudgetCategory === cat;

              return (
                <div
                  key={cat}
                  className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-2xl p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#174F32]/10 dark:bg-[#83C95B]/15 text-[#174F32] dark:text-[#83C95B] flex items-center justify-center font-bold text-xs">
                        {cat.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-[#252923] dark:text-white">
                          {cat}
                        </h4>
                        <span className="text-[11px] text-[#777D75]">
                          Spent: <strong className="text-[#252923] dark:text-white tabular-nums">{formatPeso(spentCentavos)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-[#777D75] block">Budget Limit</span>
                      <span className="text-xs font-black text-[#252923] dark:text-white tabular-nums">
                        {hasBudget ? formatPeso(limitCentavos) : 'No limit set'}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {hasBudget ? (
                    <div className="space-y-1">
                      <div className="w-full h-2 rounded-full bg-[#E5E1D8] dark:bg-[#223528] overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            isOverBudget
                              ? 'bg-red-500'
                              : percentUsed > 80
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, (spentCentavos / limitCentavos) * 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#777D75]">
                        <span className={isOverBudget ? 'text-red-500 font-bold' : ''}>
                          {isOverBudget ? 'Over Budget!' : `${percentUsed}% used`}
                        </span>
                        <span>
                          {isOverBudget
                            ? `Exceeded by ${formatPeso(spentCentavos - limitCentavos)}`
                            : `${formatPeso(limitCentavos - spentCentavos)} remaining`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#777D75] bg-black/3 dark:bg-white/3 px-3 py-1.5 rounded-xl">
                      Set a target limit to monitor shared spending alerts.
                    </div>
                  )}

                  {/* Edit Budget Input / Action */}
                  <div className="pt-2 border-t border-[#E5E1D8]/60 dark:border-[#223528]/60 flex items-center justify-between">
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-full">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#777D75]">₱</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={budgetLimitInput}
                            onChange={(e) => setBudgetLimitInput(e.target.value)}
                            placeholder="Enter limit"
                            className="w-full pl-6 pr-2 py-1.5 rounded-xl border border-[#E5E1D8] dark:border-[#283C2F] text-xs text-[#252923] dark:text-white bg-white dark:bg-[#1C2C23]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const num = parseFloat(budgetLimitInput);
                            if (!isNaN(num) && num >= 0) {
                              handleSaveBudget(cat, num);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold shadow-xs cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBudgetCategory(null);
                            setBudgetLimitInput('');
                          }}
                          className="px-2 py-1.5 rounded-xl text-xs text-[#777D75] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBudgetCategory(cat);
                          setBudgetLimitInput(hasBudget ? String(fromCentavos(limitCentavos)) : '');
                        }}
                        className="text-xs font-bold text-[#174F32] dark:text-[#83C95B] hover:underline cursor-pointer ml-auto"
                      >
                        {hasBudget ? 'Edit Budget' : '+ Set Budget'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 10. Members & Invitations Tab Content */}
      {activeTab === 'members' && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-base font-extrabold text-[#252923] dark:text-white">
              Joint Workspace Members
            </h3>
            <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
              Manage collaborating partners and pending household invitations
            </p>
          </div>

          {/* Active Members Grid */}
          <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-5 shadow-2xs space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#777D75]">
              Current Members ({workspace.members?.length || 1} of 2)
            </h4>

            <div className="divide-y divide-[#E5E1D8]/60 dark:divide-[#223528]/60">
              {(workspace.members || []).map((m) => {
                const isMe = m.uid === currentUserId;
                const isOwner = m.role === 'owner';

                return (
                  <div key={m.uid} className="py-3.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-2xl text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0"
                        style={{ backgroundColor: m.avatarColor || '#174F32' }}
                      >
                        {m.displayName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-extrabold text-[#252923] dark:text-white truncate">
                            {m.displayName}
                          </p>
                          {isMe && (
                            <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#777D75] truncate">{m.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-[#E5E1D8]/70 dark:bg-[#223528]/70 text-[#252923] dark:text-white capitalize flex items-center gap-1">
                        {isOwner && <Crown className="w-3 h-3 text-amber-500" />}
                        <span>{m.role}</span>
                      </span>

                      {!isMe && workspace.ownerUid === currentUserId && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Are you sure you want to remove ${m.displayName} from this joint account?`)) {
                              await onRemoveMember(m.uid);
                            }
                          }}
                          className="p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Remove member"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Invite Partner Form (if slot is open) */}
          {(workspace.members || []).length < 2 && (
            <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#174F32]/10 dark:bg-[#83C95B]/15 text-[#174F32] dark:text-[#83C95B] flex items-center justify-center">
                  <UserPlus className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-[#252923] dark:text-white">
                    Invite Your Partner or Housemate
                  </h4>
                  <p className="text-xs text-[#777D75]">
                    They will receive an invitation to join "{workspace.name}"
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendPartnerInvite} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-[#252923] dark:text-white block mb-1">
                    Partner's Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmailInput}
                    onChange={(e) => setInviteEmailInput(e.target.value)}
                    placeholder="partner@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F4EE]/60 dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#283C2F] text-xs sm:text-sm text-[#252923] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#252923] dark:text-white block mb-1">
                    Optional Personal Note
                  </label>
                  <textarea
                    rows={2}
                    value={inviteMessageInput}
                    onChange={(e) => setInviteMessageInput(e.target.value)}
                    placeholder="Hi! Join me to manage our shared household budget and bills together."
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F6F4EE]/60 dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#283C2F] text-xs text-[#252923] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32]"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#E8F3EC] dark:bg-[#183023] border border-[#C5E2D1] dark:border-[#264835] text-[11px] text-[#174F32] dark:text-[#C5E7D4]">
                  🔒 <strong>Privacy Assured:</strong> Your personal accounts and private transactions remain 100% confidential.
                </div>

                <button
                  type="submit"
                  disabled={isInvitingPartner}
                  className="px-5 py-2.5 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs sm:text-sm font-extrabold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[42px]"
                >
                  {isInvitingPartner ? (
                    <span>Sending Invitation...</span>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 text-[#83C95B]" />
                      <span>Send Partner Invitation</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Pending Sent Invitations */}
          {sentInvitations.length > 0 && (
            <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-5 shadow-2xs space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#777D75]">
                Pending Sent Invitations ({sentInvitations.length})
              </h4>

              <div className="divide-y divide-[#E5E1D8]/60 dark:divide-[#223528]/60">
                {sentInvitations.map((inv) => (
                  <div key={inv.id} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-[#252923] dark:text-white">
                        {inv.inviteeEmail}
                      </p>
                      <p className="text-[11px] text-[#777D75]">
                        Sent {new Date(inv.createdAt).toLocaleDateString()} • Status: <span className="capitalize font-bold text-amber-600 dark:text-amber-400">{inv.status}</span>
                      </p>
                    </div>

                    {inv.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => onRevokeInvitation(inv.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 11. Joint Settings Tab Content */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-fadeIn max-w-3xl">
          <div>
            <h3 className="text-base font-extrabold text-[#252923] dark:text-white">
              Joint Workspace Settings
            </h3>
            <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
              Configure workspace name, relationship, synchronization, and membership
            </p>
          </div>

          {/* Identity Form */}
          <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-5 shadow-2xs space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#777D75]">
              Workspace Identity
            </h4>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#252923] dark:text-white block mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F4EE]/60 dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#283C2F] text-xs sm:text-sm text-[#252923] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#252923] dark:text-white block mb-1">
                  Relationship Type
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {['Partner', 'Spouse', 'Family', 'Housemate', 'Roommate', 'Other'].map((rel) => (
                    <button
                      key={rel}
                      type="button"
                      onClick={() => setSettingsRel(rel)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        settingsRel === rel
                          ? 'bg-[#174F32] text-white shadow-xs'
                          : 'bg-[#F6F4EE]/60 dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#283C2F] text-[#61685D] dark:text-[#9EA59B]'
                      }`}
                    >
                      {rel}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-5 py-2.5 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs sm:text-sm font-extrabold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingSettings ? 'Saving...' : 'Save Workspace Changes'}
              </button>
            </form>
          </div>

          {/* Sync & Cloud Diagnostics */}
          <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-5 shadow-2xs space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#777D75]">
              Cloud Vault & Realtime Sync Diagnostics
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-black/2 dark:bg-white/2 space-y-1">
                <span className="text-[#777D75] block">Workspace ID</span>
                <span className="font-mono text-[11px] text-[#252923] dark:text-white break-all">{workspace.id}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/2 dark:bg-white/2 space-y-1">
                <span className="text-[#777D75] block">Connection State</span>
                <span className="font-bold text-[#252923] dark:text-white">
                  {isOnline ? 'Online (Connected)' : 'Offline (Local Vault Active)'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/2 dark:bg-white/2 space-y-1">
                <span className="text-[#777D75] block">Pending Cloud Queue</span>
                <span className="font-bold text-[#252923] dark:text-white">
                  {pendingMutationCount} queued changes
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/2 dark:bg-white/2 space-y-1">
                <span className="text-[#777D75] block">Last Synchronized</span>
                <span className="font-bold text-[#252923] dark:text-white">
                  {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onRefreshData?.();
                showToast('Synchronizing joint workspace with cloud vault...', 'info');
              }}
              className="px-4 py-2 rounded-xl bg-white dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#283C2F] text-xs font-bold text-[#252923] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Force Cloud Re-sync</span>
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-5 shadow-2xs space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">
              Workspace Actions
            </h4>
            <p className="text-xs text-[#777D75]">
              Leave this shared workspace or remove partner collaboration. Your personal account and private vault are completely unaffected.
            </p>

            <button
              type="button"
              onClick={async () => {
                if (window.confirm('Are you sure you want to leave this joint workspace? You will lose access to shared accounts and transactions.')) {
                  await onLeaveWorkspace();
                }
              }}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave Joint Workspace</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals for Joint Operations */}
      <JointWorkspaceSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        workspace={workspace}
        currentUserId={currentUserId}
        onUpdateWorkspace={onUpdateWorkspace}
        onInvitePartner={onInvitePartner}
        onRemoveMember={onRemoveMember}
        onLeaveWorkspace={onLeaveWorkspace}
      />

      <JointInvitationsModal
        isOpen={isInvitationsModalOpen}
        onClose={() => setIsInvitationsModalOpen(false)}
        invitations={invitations}
        sentInvitations={sentInvitations}
        onAccept={onAcceptInvitation}
        onDecline={onDeclineInvitation}
        onRevoke={onRevokeInvitation}
        currentUserEmail={currentUser.email}
      />

      <AddJointAccountModal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        onSave={handleSaveJointAccount}
        initialCategory={addAccountCategory}
      />

      <AddJointTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        onSave={handleSaveJointTransaction}
        accounts={accounts}
        initialType={txType}
        onOpenCreateAccount={() => setIsAddAccountOpen(true)}
      />

      <AddJointBillModal
        isOpen={isAddBillOpen}
        onClose={() => setIsAddBillOpen(false)}
        onSave={handleSaveJointBill}
      />

      <AddJointGroceryModal
        isOpen={isAddGroceryOpen}
        onClose={() => setIsAddGroceryOpen(false)}
        onSave={handleSaveJointGrocery}
      />

      <NotificationCenterModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        onNavigateTab={(tab, mode) => {
          if (mode === 'joint') {
            setActiveTab(tab as JointActiveTab);
          } else {
            setAccountMode('personal');
          }
        }}
      />
    </div>
  );
};
