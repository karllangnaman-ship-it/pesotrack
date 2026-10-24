import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Info,
  Leaf,
  Mail,
  Menu,
  Plus,
  Receipt,
  Search,
  TrendingDown,
  UserCheck,
  Users,
} from 'lucide-react';
import { AccountDetailModal } from './components/AccountDetailModal';
import { AddAccountModal } from './components/AddAccountModal';
import { CreateJointModal } from './components/CreateJointModal';
import { JointInvitationsModal } from './components/JointInvitationsModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { NavigationSidebar } from './components/NavigationSidebar';
import { JointNavigationSidebar } from './components/JointNavigationSidebar';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { TransactionModal } from './components/TransactionModal';
import { EmailVerificationScreen } from './components/EmailVerificationScreen';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { JointActivityView } from './components/JointActivityView';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { AccountsPage } from './pages/AccountsPage';
import { BillCalendarPage } from './pages/BillCalendarPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { DebtPayoffPlannerPage } from './pages/DebtPayoffPlannerPage';
import { HomePage } from './pages/HomePage';
import { JointFinancesPage } from './pages/JointFinancesPage';
import { MonthlyBillsPage } from './pages/MonthlyBillsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { JointSettingsPage } from './pages/JointSettingsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { GroceryListPage } from './pages/GroceryListPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { JointChatPage } from './pages/JointChatPage';
import { IncomingRingModal } from './components/IncomingRingModal';
import { SyncStatusBadge } from './components/SyncStatusBadge';
import { JointModeSwitch } from './components/JointModeSwitch';
import {
  AccountCategory,
  ActiveTab,
  JointActiveTab,
  TransactionRecord,
  TransactionType,
} from './types/finance';
import { ReconciledAccount } from './utils/financeEngine';
import {
  getPendingWidgetAction,
  registerWidgetActionListener,
  WidgetActionData,
} from './services/widgetBridgeService';

const PesoTrackAppContent: React.FC = () => {
  const {
    toastMessage,
    clearToast,
    showToast,
    syncStatus,
    isOnline,
    pendingSyncCount,
    lastSyncTime,
    isRulesPermissionError,
    firebaseProjectId,
    currentUser,
    unverifiedUser,
    handleVerifiedUser,
    logout,
    accountMode,
    setAccountMode,
    activeJointWorkspace,
    jointDiscoveryStatus,
    jointDiscoveryError,
    jointAccounts,
    jointTransactions,
    jointBills,
    jointMonthlyBillEntries,
    jointBudgets,
    jointGroceryItems,
    jointActivities,
    jointInvitations,
    jointSentInvitations,
    isJointRealtimeActive,
    jointPendingMutationCount,
    jointLastSyncTime,
    createJointWorkspace,
    invitePartnerToJoint,
    acceptJointInvitation,
    declineJointInvitation,
    revokeJointInvitation,
    updateJointWorkspace,
    removeJointMember,
    leaveJointWorkspace,
    refreshJointData,
    openAuthModal,
    unreadNotificationsCount,
    activeIncomingRing,
    respondToIncomingRing,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [jointActiveTab, setJointActiveTab] = useState<JointActiveTab>('overview');
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  // Safeguard: When switching back to Personal Account mode, Joint Chat is strictly hidden
  useEffect(() => {
    if (accountMode === 'personal' && activeTab === 'messages') {
      setActiveTab('home');
    }
  }, [accountMode, activeTab]);
  const [accountsSubTab, setAccountsSubTab] = useState<'accounts' | 'receivables'>('accounts');
  const [accountsCategoryFilter, setAccountsCategoryFilter] = useState<'All' | AccountCategory>('All');
  const [reportsSection, setReportsSection] = useState<'analytics' | 'cashflow' | 'breakdown' | undefined>(undefined);
  const [settingsSection, setSettingsSection] = useState<'profile' | 'notifications' | 'backup' | 'appearance' | 'sync' | undefined>(undefined);

  // Responsive Navigation State
  const [isOpenMobileDrawer, setIsOpenMobileDrawer] = useState<boolean>(false);
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pesotrack_desktop_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCollapseDesktop = () => {
    setIsCollapsedDesktop((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pesotrack_desktop_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Modals state
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [addAccountCategory, setAddAccountCategory] = useState<AccountCategory>('Wallet');
  const [editingAccount, setEditingAccount] = useState<ReconciledAccount | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [txInitialType, setTxInitialType] = useState<TransactionType>('expense');
  const [txInitialAccountId, setTxInitialAccountId] = useState<string | undefined>(undefined);
  const [txInitialDestAccountId, setTxInitialDestAccountId] = useState<string | undefined>(undefined);
  const [txInitialAmount, setTxInitialAmount] = useState<number | string | undefined>(undefined);
  const [txInitialCategory, setTxInitialCategory] = useState<string | undefined>(undefined);
  const [editingTransaction, setEditingTransaction] = useState<TransactionRecord | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateJointOpen, setIsCreateJointOpen] = useState(false);
  const [isJointInvitationsOpen, setIsJointInvitationsOpen] = useState(false);

  const handleOpenAddAccount = (category: AccountCategory = 'Wallet') => {
    setEditingAccount(null);
    setAddAccountCategory(category);
    setIsAddAccountOpen(true);
  };

  const handleOpenEditAccount = (acc: ReconciledAccount) => {
    setEditingAccount(acc);
    setAddAccountCategory(acc.category);
    setIsAddAccountOpen(true);
  };

  const handleOpenAddTransaction = (
    type: TransactionType = 'expense',
    accountId?: string,
    destinationAccountId?: string,
    amount?: number | string,
    category?: string
  ) => {
    setEditingTransaction(null);
    setTxInitialType(type);
    setTxInitialAccountId(accountId);
    setTxInitialDestAccountId(destinationAccountId);
    setTxInitialAmount(amount);
    setTxInitialCategory(category);
    setIsTransactionModalOpen(true);
  };

  const handleOpenEditTransaction = (tx: TransactionRecord) => {
    setEditingTransaction(tx);
    setIsTransactionModalOpen(true);
  };

  // Central Navigation Handler
  const handleNavigate = (tab: ActiveTab) => {
    setActiveTab(tab);
  };

  const handleNavigateToAccountsCategory = (category: AccountCategory) => {
    setAccountsSubTab('accounts');
    setAccountsCategoryFilter(category);
    setActiveTab('accounts');
  };

  // Listen for native Android home-screen widget actions (both cold start and runtime)
  useEffect(() => {
    const handleWidgetAction = (data: WidgetActionData) => {
      if (!data || !data.action) return;

      if (data.action === 'open_action') {
        const target = data.target;
        if (target === 'expense') {
          handleOpenAddTransaction('expense');
        } else if (target === 'income') {
          handleOpenAddTransaction('income');
        } else if (target === 'transfer') {
          handleOpenAddTransaction('transfer');
        } else if (target === 'loan') {
          handleNavigateToAccountsCategory('Loans');
        } else if (target === 'card') {
          handleNavigateToAccountsCategory('Credit');
        } else if (target === 'grocery') {
          handleNavigate('grocery-list');
        }
      } else if (data.action === 'quick_expense') {
        const amt = data.payload?.amount || 250;
        const cat = data.payload?.category || 'Food';
        handleOpenAddTransaction('expense', undefined, undefined, amt, cat);
        showToast('Review quick expense — tap Save to record', 'info');
      } else if (data.action === 'open_overview') {
        if (data.target === 'income') {
          handleOpenAddTransaction('income');
        } else if (data.target === 'expense') {
          handleOpenAddTransaction('expense');
        } else if (data.target === 'reports') {
          handleNavigate('reports');
        }
      } else if (data.action === 'open_tab') {
        if (data.target) {
          handleNavigate(data.target as ActiveTab);
        }
      } else if (data.action === 'open_app') {
        if (data.target === 'login') {
          handleNavigate('settings');
        } else {
          handleNavigate('home');
        }
      }
    };

    // Cold start check
    getPendingWidgetAction().then((pending) => {
      if (pending) {
        handleWidgetAction(pending);
      }
    });

    // Runtime tap event listener
    const cleanup = registerWidgetActionListener(handleWidgetAction);
    return () => {
      cleanup();
    };
  }, []);

  // Block dashboard & cloud sync if email is unverified
  if (unverifiedUser) {
    return (
      <EmailVerificationScreen
        unverifiedUser={unverifiedUser}
        onVerified={handleVerifiedUser}
        onLogout={logout}
      />
    );
  }

  const isChatActive = activeTab === 'messages' && accountMode === 'joint';

  return (
    <div
      className={
        isChatActive
          ? 'h-[100dvh] max-h-[100dvh] w-full max-w-full bg-[#F6F4EE] dark:bg-[#0D1410] text-[#252923] dark:text-[#F3F4F1] flex overflow-hidden'
          : 'min-h-screen min-h-[100dvh] w-full max-w-full bg-[#F6F4EE] dark:bg-[#0D1410] text-[#252923] dark:text-[#F3F4F1] flex overflow-x-hidden'
      }
    >
      {/* 1. Centralized Responsive Navigation: Desktop Permanent/Rail Sidebar + Mobile/Tablet Slide-out Drawer */}
      {accountMode === 'joint' ? (
        <JointNavigationSidebar
          activeTab={activeTab as JointActiveTab}
          onNavigate={(tab) => {
            handleNavigate(tab as ActiveTab);
            setIsOpenMobileDrawer(false);
          }}
          isOpenMobile={isOpenMobileDrawer}
          onCloseMobile={() => setIsOpenMobileDrawer(false)}
          isCollapsedDesktop={isCollapsedDesktop}
          onToggleCollapseDesktop={handleToggleCollapseDesktop}
        />
      ) : (
        <NavigationSidebar
          activeTab={activeTab}
          onNavigate={(tab) => {
            handleNavigate(tab);
            setIsOpenMobileDrawer(false);
          }}
          isOpenMobile={isOpenMobileDrawer}
          onCloseMobile={() => setIsOpenMobileDrawer(false)}
          isCollapsedDesktop={isCollapsedDesktop}
          onToggleCollapseDesktop={handleToggleCollapseDesktop}
        />
      )}

      {/* 2. Main Application Canvas Container */}
      <div
        className={
          isChatActive
            ? 'flex-1 min-w-0 flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden'
            : 'flex-1 min-w-0 flex flex-col min-h-screen min-h-[100dvh] transition-all'
        }
      >
        {/* Top Header */}
        <header
          className={
            isChatActive
              ? 'shrink-0 z-30 w-full bg-[#F6F4EE]/90 dark:bg-[#0D1410]/90 backdrop-blur-md border-b border-[#E5E1D8] dark:border-[#223528] pt-[env(safe-area-inset-top,0px)]'
              : 'sticky top-0 z-30 w-full bg-[#F6F4EE]/90 dark:bg-[#0D1410]/90 backdrop-blur-md border-b border-[#E5E1D8] dark:border-[#223528] pt-[env(safe-area-inset-top,0px)]'
          }
        >
          <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-6 px-2 sm:px-6 lg:px-8 h-14 sm:h-16 min-w-0">
            {/* Left Zone: Hamburger Menu on Mobile/Tablet + Brand Wordmark */}
            <div className="flex items-center gap-1 sm:gap-3 min-w-0 shrink">
              <button
                type="button"
                onClick={() => setIsOpenMobileDrawer(true)}
                aria-label="Open navigation menu"
                className="lg:hidden p-1.5 sm:p-2 -ml-1 rounded-xl text-[#777D75] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  handleNavigate('home');
                }}
                className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-xl font-extrabold tracking-tight text-[#174F32] dark:text-white whitespace-nowrap hover:opacity-85 transition-opacity shrink-0"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#174F32] dark:bg-[#1E382A] text-[#83C95B] flex items-center justify-center shadow-2xs shrink-0">
                  <Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#83C95B]/30 stroke-[2.4]" />
                </div>
                <span>PesoTrack</span>
              </button>
            </div>

            {/* Center Zone: Active Section Title / Breadcrumb (hidden on narrow screens) */}
            <div className="hidden md:flex items-center gap-2 text-xs font-bold text-[#777D75] dark:text-[#8FA095] uppercase tracking-wider truncate">
              <span>{accountMode === 'joint' ? 'Joint Finances' : 'Personal Vault'}</span>
              <span>/</span>
              <span className="text-[#252923] dark:text-white capitalize">
                {accountMode === 'joint'
                  ? (activeJointWorkspace?.name ? `${activeJointWorkspace.name} • ${activeTab.replace('-', ' ')}` : 'Shared Finances')
                  : activeTab.replace('-', ' ')}
              </span>
            </div>

            {/* Right Zone: Primary Actions (Mode Switch & Sync Status) */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
              <SyncStatusBadge
                status={syncStatus}
                isOnline={isOnline}
                pendingCount={pendingSyncCount}
                lastSyncTime={lastSyncTime}
                isRulesNeeded={isRulesPermissionError}
                onSyncClick={() => {
                  setSettingsSection('sync');
                  handleNavigate('settings');
                }}
              />

              {/* Dedicated Personal / Joint Account Mode Selector */}
              <JointModeSwitch
                mode={accountMode}
                onChangeMode={setAccountMode}
                pendingInvitationsCount={
                  jointInvitations.filter((i) => i.status === 'pending').length
                }
              />
            </div>
          </div>
        </header>

        {/* Global Notice Banner when Firestore Rules are missing */}
        {currentUser && isRulesPermissionError && (
          <div className="bg-amber-500/15 border-b border-amber-500/25 px-3.5 sm:px-6 lg:px-8 py-2 text-xs text-amber-950 dark:text-amber-100 flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 text-amber-600 dark:text-amber-400 font-bold">⚠️</span>
              <span className="truncate">
                Firestore rules not published for project <strong className="font-mono">{firebaseProjectId}</strong>. Local vault safe.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSettingsSection('sync');
                handleNavigate('settings');
              }}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
            >
              Fix in Settings
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main
          className={
            activeTab === 'messages' && accountMode === 'joint'
              ? 'flex-1 w-full flex flex-col p-0 min-w-0 min-h-0 h-full overflow-hidden'
              : 'flex-1 w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-16 min-w-0 overflow-hidden'
          }
        >
          {accountMode === 'joint' && !currentUser ? (
            <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-[#174F32] text-[#83C95B] flex items-center justify-center shadow-md">
                <Users className="w-8 h-8 stroke-[2.2]" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#252923] dark:text-white tracking-tight">
                  PesoTrack Joint Finances
                </h1>
                <p className="text-sm text-[#777D75] dark:text-[#8FA095] leading-relaxed">
                  Manage shared finances, household budgets, recurring bills, and grocery shopping in real-time with your partner or family.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="px-6 py-3 rounded-2xl bg-[#174F32] hover:bg-[#123E27] text-white text-sm font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-[#83C95B]" />
                  <span>Sign In or Register to Use Joint Account</span>
                </button>
              </div>
            </div>
          ) : accountMode === 'joint' && jointDiscoveryStatus === 'loading' && !activeJointWorkspace ? (
            <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-pulse">
                <Users className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h1 className="text-xl font-extrabold text-[#252923] dark:text-white">Loading your Joint Finances…</h1>
              <p className="text-sm text-[#777D75] dark:text-[#8FA095]">Looking up workspaces connected to your signed-in account.</p>
            </div>
          ) : accountMode === 'joint' && jointDiscoveryStatus === 'error' && !activeJointWorkspace ? (
            <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-5">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-red-500/10 text-red-600 dark:text-red-300 flex items-center justify-center shadow-xs">
                <AlertCircle className="w-8 h-8 stroke-[2.2]" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-extrabold text-[#252923] dark:text-white">Couldn’t load Joint Finances</h1>
                <p className="text-sm text-[#777D75] dark:text-[#8FA095] leading-relaxed">{jointDiscoveryError || 'Your workspace list could not be retrieved. Your existing data has not been changed.'}</p>
              </div>
              <button type="button" onClick={() => refreshJointData()} className="px-6 py-3 rounded-2xl bg-[#174F32] hover:bg-[#123E27] text-white text-sm font-extrabold">Try Again</button>
            </div>
          ) : accountMode === 'joint' && !activeJointWorkspace ? (
            <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                <Users className="w-8 h-8 stroke-[2.2]" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#252923] dark:text-white tracking-tight">
                  Start Your Joint Finances
                </h1>
                <p className="text-sm text-[#777D75] dark:text-[#8FA095] leading-relaxed">
                  Create a workspace to share balances, record shared bills, track bill calendars, sync grocery lists, and collaborate in real-time with your partner.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateJointOpen(true)}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#174F32] hover:bg-[#123E27] text-white text-sm font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#83C95B]" />
                  <span>Create Joint Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsJointInvitationsOpen(true)}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] text-[#252923] dark:text-white text-sm font-bold shadow-xs hover:bg-[#F9F8F5] dark:hover:bg-[#1A2A20] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-[#174F32] dark:text-[#83C95B]" />
                  <span>Check Invitations ({jointInvitations.filter((i) => i.status === 'pending').length})</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Contextual Search & Quick Action Toolbar (Hidden when on Messages tab to allow Messenger full-height experience) */}
              {activeTab !== 'messages' && (
                <div className="flex items-center gap-2 sm:gap-2.5 mb-3.5 sm:mb-4 w-full min-w-0 max-w-full overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(true)}
                    className="flex-1 min-w-0 max-w-[calc(100%-140px)] sm:max-w-none flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] text-xs sm:text-sm font-medium text-[#777D75] dark:text-[#8FA095] hover:bg-[#F9F8F5] dark:hover:bg-[#1A2A20] transition-colors shadow-[0_1px_6px_rgba(0,0,0,0.02)] min-h-[44px] overflow-hidden"
                  >
                    <Search className="w-4 h-4 text-[#777D75] dark:text-[#8FA095] shrink-0" />
                    <span className="truncate">Search transactions, bills, accounts...</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenAddTransaction('expense')}
                    className="px-3.5 sm:px-4 py-2.5 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] text-[#252923] dark:text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-[0_1px_6px_rgba(0,0,0,0.02)] hover:border-[#174F32]/40 hover:bg-[#F9F8F5] dark:hover:bg-[#1A2A20] transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5] text-[#174F32] dark:text-[#83C95B] shrink-0" />
                    <span>Add Record</span>
                  </button>
                </div>
              )}

              {/* Sub-navigation Switcher for Obligations & Schedules (Identical in Personal & Joint) */}
              {(activeTab === 'bills' || activeTab === 'calendar' || activeTab === 'debt-planner') && (
                <div className="flex items-center gap-1 sm:gap-1.5 p-1 mb-4 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_1px_6px_rgba(0,0,0,0.02)] overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => handleNavigate('bills')}
                    className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'bills'
                        ? 'bg-[#174F32] text-white dark:bg-[#1E3B2B] dark:text-[#86EFAC] shadow-xs'
                        : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>Bills & Salary</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate('calendar')}
                    className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'calendar'
                        ? 'bg-[#174F32] text-white dark:bg-[#1E3B2B] dark:text-[#86EFAC] shadow-xs'
                        : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>Bill Calendar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate('debt-planner')}
                    className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'debt-planner'
                        ? 'bg-[#174F32] text-white dark:bg-[#1E3B2B] dark:text-[#86EFAC] shadow-xs'
                        : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>Debt Payoff</span>
                  </button>
                </div>
              )}

              {/* Active Views: Render dedicated Joint Finances Workspace in joint mode, HomePage in personal mode */}
              {(activeTab === 'home' || activeTab === 'overview') && (
                accountMode === 'joint' ? (
                  <JointFinancesPage
                    currentUser={currentUser}
                    onOpenAuthModal={() => openAuthModal('login')}
                    workspace={activeJointWorkspace}
                    accounts={jointAccounts}
                    transactions={jointTransactions}
                    bills={jointBills}
                    monthlyBillEntries={jointMonthlyBillEntries}
                    budgets={jointBudgets}
                    groceryItems={jointGroceryItems}
                    activities={jointActivities}
                    invitations={jointInvitations}
                    sentInvitations={jointSentInvitations}
                    isRealtimeActive={isJointRealtimeActive}
                    isOnline={isOnline}
                    lastSyncTime={jointLastSyncTime}
                    pendingMutationCount={jointPendingMutationCount}
                    onCreateWorkspace={createJointWorkspace}
                    onInvitePartner={invitePartnerToJoint}
                    onAcceptInvitation={acceptJointInvitation}
                    onDeclineInvitation={declineJointInvitation}
                    onRevokeInvitation={revokeJointInvitation}
                    onUpdateWorkspace={updateJointWorkspace}
                    onRemoveMember={removeJointMember}
                    onLeaveWorkspace={leaveJointWorkspace}
                    onRefreshData={refreshJointData}
                    showToast={showToast}
                    activeTab="overview"
                    onNavigateTab={(tab) => handleNavigate(tab as ActiveTab)}
                  />
                ) : (
                  <HomePage
                    onNavigate={(tab) => {
                      if (tab === 'accounts') {
                        setAccountsSubTab('accounts');
                      }
                      setActiveTab(tab);
                    }}
                    onOpenAddAccount={() => handleOpenAddAccount('Wallet')}
                    onSelectAccount={(id) => setSelectedAccountId(id)}
                    onOpenAddTransaction={handleOpenAddTransaction}
                    onSelectTransaction={(tx) => setSelectedTransaction(tx)}
                    onSelectCategory={handleNavigateToAccountsCategory}
                  />
                )
              )}

              {activeTab === 'bills' && (
                <MonthlyBillsPage
                  onOpenCalendar={() => handleNavigate('calendar')}
                  onOpenDebtPlanner={() => handleNavigate('debt-planner')}
                />
              )}

              {activeTab === 'calendar' && <BillCalendarPage />}

              {activeTab === 'debt-planner' && <DebtPayoffPlannerPage />}

              {activeTab === 'transactions' && (
                <TransactionsPage
                  onOpenAddTransaction={handleOpenAddTransaction}
                  onSelectTransaction={(tx) => setSelectedTransaction(tx)}
                />
              )}

              {activeTab === 'budgets' && <BudgetsPage />}

              {activeTab === 'accounts' && (
                <AccountsPage
                  key={`accounts-${accountsSubTab}-${accountsCategoryFilter}`}
                  initialSubTab={accountsSubTab}
                  initialCategoryFilter={accountsCategoryFilter}
                  onOpenAddAccount={handleOpenAddAccount}
                  onSelectAccount={(id) => setSelectedAccountId(id)}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsPage
                  initialSection={reportsSection}
                  onNavigate={handleNavigate}
                  onOpenAddTransaction={handleOpenAddTransaction}
                  onSelectTransaction={(tx) => setSelectedTransaction(tx)}
                />
              )}

              {activeTab === 'grocery-list' && (
                <GroceryListPage
                  onNavigate={handleNavigate}
                  onOpenAddTransaction={handleOpenAddTransaction}
                />
              )}

              {activeTab === 'activity' && (
                <JointActivityView mode={accountMode} />
              )}

              {activeTab === 'notifications' && (
                <NotificationsPage
                  mode={accountMode}
                  onNavigate={(tab) => handleNavigate(tab)}
                />
              )}

              {activeTab === 'messages' && accountMode === 'joint' && (
                <JointChatPage
                  onBackToOverview={() => handleNavigate('overview')}
                  onOpenMobileMenu={() => setIsOpenMobileDrawer(true)}
                />
              )}

              {activeTab === 'settings' && (
                accountMode === 'joint' ? (
                  <JointSettingsPage
                    onOpenCreateWorkspace={() => setIsCreateJointOpen(true)}
                    onOpenInvitations={() => setIsJointInvitationsOpen(true)}
                  />
                ) : (
                  <SettingsPage initialSection={settingsSection} />
                )
              )}
            </>
          )}
        </main>
      </div>

      {/* Floating Add Transaction CTA (available in both Personal and Joint mode when not on grocery list or messages) */}
      {activeTab !== 'grocery-list' && activeTab !== 'messages' && (
        <button
          type="button"
          onClick={() => handleOpenAddTransaction('expense')}
          aria-label="Add transaction"
          className="fixed bottom-[max(env(safe-area-inset-bottom,0px),1.25rem)] right-4 sm:right-6 md:right-8 z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#4E9D39] hover:bg-[#438B31] text-white shadow-[0_8px_24px_rgba(78,157,57,0.38)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.8]" />
        </button>
      )}

      {/* Toast Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-[calc(4.5rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-50 px-4 py-2 sm:py-2.5 rounded-full text-white text-xs font-semibold shadow-lg flex items-center gap-2 max-w-[90vw] truncate ${
            toastMessage.type === 'error'
              ? 'bg-red-800 dark:bg-red-900 border border-red-500/50 shadow-red-950/40'
              : toastMessage.type === 'info'
              ? 'bg-slate-800 dark:bg-slate-900 border border-slate-600/40 shadow-slate-950/40'
              : 'bg-[#174F32] dark:bg-[#163825] border border-[#83C95B]/30'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />
          ) : toastMessage.type === 'info' ? (
            <Info className="w-4 h-4 text-sky-300 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#83C95B] shrink-0" />
          )}
          <span className="truncate">{toastMessage.text}</span>
          <button
            type="button"
            onClick={clearToast}
            className="ml-1 opacity-70 hover:opacity-100 shrink-0 cursor-pointer"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* Modals */}
      <AddAccountModal
        isOpen={isAddAccountOpen}
        onClose={() => {
          setIsAddAccountOpen(false);
          setEditingAccount(null);
        }}
        initialCategory={addAccountCategory}
        editingAccount={editingAccount}
      />

      <AccountDetailModal
        accountId={selectedAccountId}
        onClose={() => setSelectedAccountId(null)}
        onEditAccount={handleOpenEditAccount}
        onOpenAddTransaction={handleOpenAddTransaction}
        onSelectTransaction={(tx) => setSelectedTransaction(tx)}
      />

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false);
          setEditingTransaction(null);
          setTxInitialAmount(undefined);
          setTxInitialCategory(undefined);
        }}
        initialType={txInitialType}
        initialAccountId={txInitialAccountId}
        initialDestinationAccountId={txInitialDestAccountId}
        initialAmount={txInitialAmount}
        initialCategory={txInitialCategory}
        editingTransaction={editingTransaction}
        mode={accountMode}
        onOpenCreateAccount={() => {
          setIsTransactionModalOpen(false);
          handleOpenAddAccount();
        }}
      />

      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onEdit={handleOpenEditTransaction}
      />

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectAccount={(id) => setSelectedAccountId(id)}
        onSelectTransaction={(tx) => setSelectedTransaction(tx)}
      />

      <CreateJointModal
        isOpen={isCreateJointOpen}
        onClose={() => setIsCreateJointOpen(false)}
        onSubmit={createJointWorkspace}
        userEmail={currentUser?.email}
      />

      <JointInvitationsModal
        isOpen={isJointInvitationsOpen}
        onClose={() => setIsJointInvitationsOpen(false)}
        invitations={jointInvitations}
        sentInvitations={jointSentInvitations}
        onAccept={acceptJointInvitation}
        onDecline={declineJointInvitation}
        onRevoke={revokeJointInvitation}
        currentUserEmail={currentUser?.email}
      />

      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        onNavigateTab={(tab, mode) => {
          if (mode === 'joint') {
            setAccountMode('joint');
          } else {
            setAccountMode('personal');
          }
          handleNavigate(tab as ActiveTab);
        }}
      />

      <IncomingRingModal
        ringRequest={activeIncomingRing}
        onAccept={() => {
          respondToIncomingRing('accepted');
          setAccountMode('joint');
          handleNavigate('messages');
        }}
        onDismiss={() => {
          respondToIncomingRing('dismissed');
        }}
      />
    </div>
  );
};

export function App() {
  return (
    <FinanceProvider>
      <PesoTrackAppContent />
    </FinanceProvider>
  );
}

export default App;
