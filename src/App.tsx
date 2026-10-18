import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
<<<<<<< HEAD
  Leaf,
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  Menu,
  Plus,
  Receipt,
  Search,
  TrendingDown,
} from 'lucide-react';
import { AccountDetailModal } from './components/AccountDetailModal';
import { AddAccountModal } from './components/AddAccountModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { NavigationSidebar } from './components/NavigationSidebar';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { TransactionModal } from './components/TransactionModal';
import { EmailVerificationScreen } from './components/EmailVerificationScreen';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { AccountsPage } from './pages/AccountsPage';
import { BillCalendarPage } from './pages/BillCalendarPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { DebtPayoffPlannerPage } from './pages/DebtPayoffPlannerPage';
import { HomePage } from './pages/HomePage';
import { MonthlyBillsPage } from './pages/MonthlyBillsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TransactionsPage } from './pages/TransactionsPage';
<<<<<<< HEAD
import { GroceryListPage } from './pages/GroceryListPage';
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
import { SyncStatusBadge } from './components/SyncStatusBadge';
import {
  AccountCategory,
  ActiveTab,
  TransactionRecord,
  TransactionType,
} from './types/finance';
import { ReconciledAccount } from './utils/financeEngine';
<<<<<<< HEAD
import {
  getPendingWidgetAction,
  registerWidgetActionListener,
  WidgetActionData,
} from './services/widgetBridgeService';
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce

const PesoTrackAppContent: React.FC = () => {
  const {
    toastMessage,
    clearToast,
<<<<<<< HEAD
    showToast,
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
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
  } = useFinance();

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
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
<<<<<<< HEAD
  const [txInitialAmount, setTxInitialAmount] = useState<number | string | undefined>(undefined);
  const [txInitialCategory, setTxInitialCategory] = useState<string | undefined>(undefined);
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  const [editingTransaction, setEditingTransaction] = useState<TransactionRecord | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
<<<<<<< HEAD
    destinationAccountId?: string,
    amount?: number | string,
    category?: string
=======
    destinationAccountId?: string
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  ) => {
    setEditingTransaction(null);
    setTxInitialType(type);
    setTxInitialAccountId(accountId);
    setTxInitialDestAccountId(destinationAccountId);
<<<<<<< HEAD
    setTxInitialAmount(amount);
    setTxInitialCategory(category);
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
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

<<<<<<< HEAD
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

=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
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

  return (
<<<<<<< HEAD
    <div className="min-h-screen min-h-[100dvh] w-full max-w-full bg-[#F6F4EE] dark:bg-[#0D1410] text-[#252923] dark:text-[#F3F4F1] flex overflow-x-hidden">
=======
    <div className="min-h-screen min-h-[100dvh] w-full max-w-full bg-[#F3F0F5] dark:bg-[#0E0F14] text-neutral-950 dark:text-neutral-100 flex overflow-x-hidden">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
      {/* 1. Centralized Responsive Navigation: Desktop Permanent/Rail Sidebar + Mobile/Tablet Slide-out Drawer */}
      <NavigationSidebar
        activeTab={activeTab}
        onNavigate={handleNavigate}
        isOpenMobile={isOpenMobileDrawer}
        onCloseMobile={() => setIsOpenMobileDrawer(false)}
        isCollapsedDesktop={isCollapsedDesktop}
        onToggleCollapseDesktop={handleToggleCollapseDesktop}
      />

      {/* 2. Main Application Canvas Container */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen min-h-[100dvh] transition-all">
        {/* Top Header */}
<<<<<<< HEAD
        <header className="sticky top-0 z-30 w-full bg-[#F6F4EE]/90 dark:bg-[#0D1410]/90 backdrop-blur-md border-b border-[#E5E1D8] dark:border-[#223528] pt-[env(safe-area-inset-top,0px)]">
=======
        <header className="sticky top-0 z-30 w-full bg-[#F3F0F5]/90 dark:bg-[#0E0F14]/90 backdrop-blur-md border-b border-black/[0.04] dark:border-white/[0.06] pt-[env(safe-area-inset-top,0px)]">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-6 px-3.5 sm:px-6 lg:px-8 h-14 sm:h-16 min-w-0">
            {/* Left Zone: Hamburger Menu on Mobile/Tablet + Brand Wordmark */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
              <button
                type="button"
                onClick={() => setIsOpenMobileDrawer(true)}
                aria-label="Open navigation menu"
<<<<<<< HEAD
                className="lg:hidden p-2 -ml-1 rounded-xl text-[#777D75] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
=======
                className="lg:hidden p-2 -ml-1 rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              >
                <Menu className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('home')}
<<<<<<< HEAD
                className="flex items-center gap-2 text-base sm:text-xl font-extrabold tracking-tight text-[#174F32] dark:text-white whitespace-nowrap hover:opacity-85 transition-opacity"
              >
                <div className="w-7 h-7 rounded-lg bg-[#174F32] dark:bg-[#1E382A] text-[#83C95B] flex items-center justify-center shadow-2xs">
                  <Leaf className="w-4 h-4 fill-[#83C95B]/30 stroke-[2.4]" />
                </div>
                <span>PesoTrack</span>
=======
                className="text-base sm:text-xl font-extrabold tracking-tight text-black dark:text-white whitespace-nowrap hover:opacity-85 transition-opacity"
              >
                PesoTrack
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              </button>
            </div>

            {/* Center Zone: Active Section Title / Breadcrumb (hidden on narrow screens) */}
<<<<<<< HEAD
            <div className="hidden md:flex items-center gap-2 text-xs font-bold text-[#777D75] dark:text-[#8FA095] uppercase tracking-wider truncate">
              <span>Vault</span>
              <span>/</span>
              <span className="text-[#252923] dark:text-white capitalize">
=======
            <div className="hidden md:flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider truncate">
              <span>Vault</span>
              <span>/</span>
              <span className="text-neutral-900 dark:text-white capitalize">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                {activeTab.replace('-', ' ')}
              </span>
            </div>

            {/* Right Zone: Primary Actions (Search & Add Account & Sync Status) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
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

              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search transactions"
<<<<<<< HEAD
                className="p-2 sm:p-2.5 rounded-full text-[#777D75] dark:text-[#8FA095] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
=======
                className="p-2 sm:p-2.5 rounded-full text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              >
                <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              <button
                type="button"
                onClick={() => handleOpenAddAccount('Wallet')}
<<<<<<< HEAD
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 shadow-xs min-h-[38px] flex items-center justify-center"
=======
                className="px-3.5 sm:px-4 py-2 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs sm:text-sm font-bold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 shadow-xs min-h-[38px] flex items-center justify-center"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              >
                + Account
              </button>
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
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-16 min-w-0 overflow-hidden">
          {/* Contextual Search & Quick Action Toolbar */}
          <div className="flex items-center gap-2 sm:gap-2.5 mb-3.5 sm:mb-4 w-full min-w-0 max-w-full overflow-hidden">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
<<<<<<< HEAD
              className="flex-1 min-w-0 max-w-[calc(100%-140px)] sm:max-w-none flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] text-xs sm:text-sm font-medium text-[#777D75] dark:text-[#8FA095] hover:bg-[#F9F8F5] dark:hover:bg-[#1A2A20] transition-colors shadow-[0_1px_6px_rgba(0,0,0,0.02)] min-h-[44px] overflow-hidden"
            >
              <Search className="w-4 h-4 text-[#777D75] dark:text-[#8FA095] shrink-0" />
=======
              className="flex-1 min-w-0 max-w-[calc(100%-140px)] sm:max-w-none flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-full bg-white dark:bg-[#12131A] border border-neutral-200/80 dark:border-white/[0.06] text-xs sm:text-sm font-medium text-neutral-400 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-[0_1px_6px_rgba(0,0,0,0.02)] min-h-[44px] overflow-hidden"
            >
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              <span className="truncate">Search transactions, bills, accounts...</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddTransaction('expense')}
<<<<<<< HEAD
              className="px-3.5 sm:px-4 py-2.5 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] text-[#252923] dark:text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-[0_1px_6px_rgba(0,0,0,0.02)] hover:border-[#174F32]/40 hover:bg-[#F9F8F5] dark:hover:bg-[#1A2A20] transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
            >
              <Plus className="w-4 h-4 stroke-[2.5] text-[#174F32] dark:text-[#83C95B] shrink-0" />
=======
              className="px-3.5 sm:px-4 py-2.5 rounded-full bg-white dark:bg-[#12131A] border border-neutral-200/80 dark:border-white/[0.06] text-black dark:text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-[0_1px_6px_rgba(0,0,0,0.02)] hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
            >
              <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              <span>Add Record</span>
            </button>
          </div>

          {/* Sub-navigation Switcher for Obligations & Schedules */}
          {(activeTab === 'bills' || activeTab === 'calendar' || activeTab === 'debt-planner') && (
<<<<<<< HEAD
            <div className="flex items-center gap-1 sm:gap-1.5 p-1 mb-4 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_1px_6px_rgba(0,0,0,0.02)] overflow-x-auto no-scrollbar">
=======
            <div className="flex items-center gap-1 sm:gap-1.5 p-1 mb-4 rounded-2xl bg-white dark:bg-[#12131A] border border-neutral-200/80 dark:border-white/[0.06] shadow-[0_1px_6px_rgba(0,0,0,0.02)] overflow-x-auto no-scrollbar">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              <button
                type="button"
                onClick={() => handleNavigate('bills')}
                className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'bills'
<<<<<<< HEAD
                    ? 'bg-[#174F32] text-white dark:bg-[#1E3B2B] dark:text-[#86EFAC] shadow-xs'
                    : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
=======
                    ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                }`}
              >
                <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Monthly Bills</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('calendar')}
                className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'calendar'
<<<<<<< HEAD
                    ? 'bg-[#174F32] text-white dark:bg-[#1E3B2B] dark:text-[#86EFAC] shadow-xs'
                    : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
=======
                    ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
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
<<<<<<< HEAD
                    ? 'bg-[#174F32] text-white dark:bg-[#1E3B2B] dark:text-[#86EFAC] shadow-xs'
                    : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
=======
                    ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Debt Payoff</span>
              </button>
            </div>
          )}

          {/* Active View */}
          {activeTab === 'home' && (
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
<<<<<<< HEAD
              onSelectCategory={handleNavigateToAccountsCategory}
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
            />
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
<<<<<<< HEAD
              key={`accounts-${accountsSubTab}-${accountsCategoryFilter}`}
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              initialSubTab={accountsSubTab}
              initialCategoryFilter={accountsCategoryFilter}
              onOpenAddAccount={handleOpenAddAccount}
              onSelectAccount={(id) => setSelectedAccountId(id)}
            />
          )}

          {activeTab === 'reports' && (
<<<<<<< HEAD
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
=======
            <ReportsPage initialSection={reportsSection} />
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          )}

          {activeTab === 'settings' && (
            <SettingsPage initialSection={settingsSection} />
          )}
        </main>
      </div>

<<<<<<< HEAD
      {/* Floating Add Transaction CTA (hidden on grocery-list where dedicated Grocery FAB is shown) */}
      {activeTab !== 'grocery-list' && (
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
        <div className="fixed top-[calc(4.5rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-50 px-4 py-2 sm:py-2.5 rounded-full bg-[#174F32] dark:bg-[#163825] text-white text-xs font-semibold shadow-lg border border-[#83C95B]/30 flex items-center gap-2 max-w-[90vw] truncate">
          <CheckCircle2 className="w-4 h-4 text-[#83C95B] shrink-0" />
=======
      {/* Floating Add Transaction CTA (Positioned cleanly above system safe area, NO bottom bar) */}
      <button
        type="button"
        onClick={() => handleOpenAddTransaction('expense')}
        aria-label="Add transaction"
        className="fixed bottom-[max(env(safe-area-inset-bottom,0px),1.25rem)] right-4 sm:right-6 md:right-8 z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.6]" />
      </button>

      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-[calc(4.5rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-50 px-4 py-2 sm:py-2.5 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold shadow-lg flex items-center gap-2 max-w-[90vw] truncate">
          <CheckCircle2 className="w-4 h-4 text-[#2CE59B] dark:text-[#2E9E6B] shrink-0" />
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          <span className="truncate">{toastMessage.text}</span>
          <button
            type="button"
            onClick={clearToast}
            className="ml-1 opacity-70 hover:opacity-100 shrink-0"
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
<<<<<<< HEAD
          setTxInitialAmount(undefined);
          setTxInitialCategory(undefined);
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
        }}
        initialType={txInitialType}
        initialAccountId={txInitialAccountId}
        initialDestinationAccountId={txInitialDestAccountId}
<<<<<<< HEAD
        initialAmount={txInitialAmount}
        initialCategory={txInitialCategory}
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
        editingTransaction={editingTransaction}
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
