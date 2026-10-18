<<<<<<< HEAD
import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
=======
import React, { useMemo } from 'react';
import {
  AlertCircle,
  ArrowRight,
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  BarChart3,
  Calendar,
  ChevronRight,
  CreditCard,
<<<<<<< HEAD
  HandCoins,
=======
  Eye,
  EyeOff,
  Flame,
  HandCoins,
  Landmark,
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  PieChart,
  Plus,
  Receipt,
  TrendingDown,
<<<<<<< HEAD
  TrendingUp,
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
} from 'lucide-react';
import { ProviderLogo } from '../components/ProviderLogo';
import { SwipeableFinancialSummary } from '../components/SwipeableFinancialSummary';
import { useFinance } from '../context/FinanceContext';
<<<<<<< HEAD
import { AccountCategory, ActiveTab, TransactionRecord, TransactionType } from '../types/finance';
=======
import { ActiveTab, TransactionRecord, TransactionType } from '../types/finance';
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
import {
  formatMonthLabel,
  formatPeso,
  formatTransactionDateTime,
  getMonthKey,
} from '../utils/currency';
import { calculateMonthlyBudgetSummary } from '../utils/financeEngine';
import {
  calculateMonthCalendarMetrics,
  getCalendarEventsForMonth,
} from '../utils/calendarEngine';

interface HomePageProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenAddAccount: () => void;
  onSelectAccount: (accountId: string) => void;
  onOpenAddTransaction: (type?: TransactionType) => void;
  onSelectTransaction: (tx: TransactionRecord) => void;
<<<<<<< HEAD
  onSelectCategory?: (category: AccountCategory) => void;
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenAddAccount,
  onSelectAccount,
  onOpenAddTransaction,
  onSelectTransaction,
<<<<<<< HEAD
  onSelectCategory,
}) => {
  const {
    reconciledAccounts,
    receivablesSummary,
    state,
    currentUser,
  } = useFinance();

  const hide = state.settings.hideBalances;

=======
}) => {
  const {
    reconciledAccounts,
    netWorthSummary,
    receivablesSummary,
    state,
    toggleHideBalances,
  } = useFinance();

  const hide = state.settings.hideBalances;
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  const activeAccounts = reconciledAccounts.filter((a) => !a.archived);
  const displayedAccounts = activeAccounts.slice(0, 4);

  const currentMonthKey = getMonthKey();
<<<<<<< HEAD

  // Dynamic time of day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const userName =
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    state.settings.profileName ||
    'Karl';

  // Compute month cash flow totals
  const { monthIncome, monthExpense, netCashFlow } = useMemo(() => {
    let income = 0;
    let expense = 0;
    state.transactions.forEach((tx) => {
      if (tx.dateTime.startsWith(currentMonthKey)) {
        if (
          tx.type === 'income' ||
          (tx.type === 'adjustment' && tx.adjustmentSign !== 'negative')
        ) {
          income += tx.amount;
        } else if (
          tx.type === 'expense' ||
          (tx.type === 'adjustment' && tx.adjustmentSign === 'negative')
        ) {
          expense += tx.amount;
        }
      }
    });
    return {
      monthIncome: income,
      monthExpense: expense,
      netCashFlow: income - expense,
    };
  }, [state.transactions, currentMonthKey]);

=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  const budgetSummary = useMemo(
    () =>
      calculateMonthlyBudgetSummary(
        currentMonthKey,
        state.budgets,
        state.transactions
      ),
    [currentMonthKey, state.budgets, state.transactions]
  );

  const currentMonthEvents = useMemo(() => {
    return getCalendarEventsForMonth(
      currentMonthKey,
      state.bills || [],
      state.monthlyBillEntries || {},
      reconciledAccounts,
      state.receivables || [],
      state.recurringTransactions || [],
      state.transactions
    );
  }, [
    currentMonthKey,
    state.bills,
    state.monthlyBillEntries,
    reconciledAccounts,
    state.receivables,
    state.recurringTransactions,
    state.transactions,
  ]);

  const monthMetrics = useMemo(() => {
    return calculateMonthCalendarMetrics(currentMonthEvents, currentMonthKey);
  }, [currentMonthEvents, currentMonthKey]);

  const sortedTransactions = useMemo(
    () =>
      [...state.transactions].sort(
        (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
      ),
    [state.transactions]
  );
  const recentTransactions = sortedTransactions.slice(0, 6);

  return (
<<<<<<< HEAD
    <div className="space-y-4 sm:space-y-5 pb-8 w-full max-w-full min-w-0 overflow-hidden">
      {/* 1. GREETING */}
      <div className="pt-1">
        <h1 className="text-xl sm:text-2xl font-black text-[#252923] dark:text-[#F3F4F1] tracking-tight">
          {greeting}, <span className="text-[#174F32] dark:text-[#83C95B]">{userName}!</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#777D75] dark:text-[#8FA095] mt-0.5">
          Let's make your money work smarter.
        </p>
      </div>

      {/* 2. HERO NET WORTH / FINANCIAL SUMMARY (Reference Screen 1) */}
      <SwipeableFinancialSummary
        onOpenAddAccount={onOpenAddAccount}
        onSelectCategory={onSelectCategory}
      />

      {/* 3. QUICK ACTION BAR (Reference Screen 1) */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => onOpenAddTransaction('income')}
          className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] flex flex-col items-center justify-center text-center gap-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#174F32]/40 dark:hover:border-[#83C95B]/40 hover:bg-[#F9F8F5] dark:hover:bg-[#1A2A22] transition-all group"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#E8F5E9] dark:bg-[#193B28] text-[#16A34A] dark:text-[#83C95B] flex items-center justify-center group-hover:scale-105 transition-transform">
            <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.4]" />
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-[#252923] dark:text-[#F3F4F1] truncate">
            Add Income
          </span>
        </button>

        <button
          type="button"
          onClick={() => onOpenAddTransaction('expense')}
          className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] flex flex-col items-center justify-center text-center gap-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#DC2626]/40 dark:hover:border-[#DC2626]/40 hover:bg-[#F9F8F5] dark:hover:bg-[#1A2A22] transition-all group"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FEE2E2] dark:bg-[#3D1A18] text-[#DC2626] dark:text-[#FCA5A5] flex items-center justify-center group-hover:scale-105 transition-transform">
            <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.4]" />
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-[#252923] dark:text-[#F3F4F1] truncate">
            Add Expense
          </span>
        </button>

        <button
          type="button"
          onClick={() => onOpenAddTransaction('transfer')}
          className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] flex flex-col items-center justify-center text-center gap-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-blue-500/40 hover:bg-[#F9F8F5] dark:hover:bg-[#1A2A22] transition-all group"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#DBEAFE] dark:bg-[#172E4D] text-[#2563EB] dark:text-[#93C5FD] flex items-center justify-center group-hover:scale-105 transition-transform">
            <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.4]" />
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-[#252923] dark:text-[#F3F4F1] truncate">
            Transfer
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('bills')}
          className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] flex flex-col items-center justify-center text-center gap-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-purple-500/40 hover:bg-[#F9F8F5] dark:hover:bg-[#1A2A22] transition-all group"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#EDE9FE] dark:bg-[#2C1D4A] text-[#7C3AED] dark:text-[#C4B5FD] flex items-center justify-center group-hover:scale-105 transition-transform">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.4]" />
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-[#252923] dark:text-[#F3F4F1] truncate">
            Monthly Bills
          </span>
        </button>
      </div>

      {/* 4. "THIS MONTH" SUMMARY METRIC CARDS (Reference Screen 1) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-[#252923] dark:text-[#F3F4F1]">
            This Month
          </h2>
          <span className="text-xs font-semibold text-[#777D75] dark:text-[#8FA095]">
            {formatMonthLabel(currentMonthKey)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="text-[11px] sm:text-xs text-[#777D75] dark:text-[#8FA095] font-medium">
              Income
            </div>
            <div className="text-base sm:text-lg font-extrabold tabular-nums text-[#252923] dark:text-white mt-1 truncate">
              {formatPeso(monthIncome, { hide })}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-[#16A34A] dark:text-[#83C95B] mt-1">
              <TrendingUp className="w-3 h-3 stroke-[2.5]" />
              <span>Earned this month</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="text-[11px] sm:text-xs text-[#777D75] dark:text-[#8FA095] font-medium">
              Expenses
            </div>
            <div className="text-base sm:text-lg font-extrabold tabular-nums text-[#252923] dark:text-white mt-1 truncate">
              {formatPeso(monthExpense, { hide })}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-[#DC2626] dark:text-[#FCA5A5] mt-1">
              <TrendingDown className="w-3 h-3 stroke-[2.5]" />
              <span>Spent this month</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="text-[11px] sm:text-xs text-[#777D75] dark:text-[#8FA095] font-medium">
              Net Cash Flow
            </div>
            <div
              className={`text-base sm:text-lg font-extrabold tabular-nums mt-1 truncate ${
                netCashFlow >= 0 ? 'text-[#16A34A] dark:text-[#83C95B]' : 'text-[#DC2626]'
              }`}
            >
              {netCashFlow >= 0 ? '+' : ''}
              {formatPeso(netCashFlow, { hide })}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-[#777D75] dark:text-[#8FA095] mt-1">
              <span>{netCashFlow >= 0 ? 'Surplus retained' : 'Deficit this period'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. MONTHLY OVERVIEW & OBLIGATIONS DASHBOARD */}
      <div id="monthly-summary" className="bg-white dark:bg-[#15221B] rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] space-y-3.5 scroll-mt-20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-[17px] font-bold text-[#252923] dark:text-[#F3F4F1] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#174F32] dark:text-[#83C95B]" />
              <span>Monthly Obligations & Schedule</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-[#777D75] dark:text-[#8FA095]">
=======
    <div className="space-y-3.5 sm:space-y-4 pb-8 w-full max-w-full min-w-0 overflow-hidden">
      {/* A. SWIPEABLE FINANCIAL SUMMARY (Slide 1: Total Assets, Slide 2: Total Debt) */}
      <SwipeableFinancialSummary onOpenAddAccount={onOpenAddAccount} />

      {/* MONTHLY DASHBOARD (Section 6) */}
      <div id="monthly-summary" className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] space-y-3.5 scroll-mt-20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-[17px] font-bold text-black dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
              <span>Monthly Overview ({formatMonthLabel(currentMonthKey)})</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-neutral-500">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              Bills, debt payments, and collections due this month
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('bills')}
<<<<<<< HEAD
            className="text-xs font-semibold text-[#174F32] dark:text-[#83C95B] hover:opacity-80 flex items-center gap-0.5"
=======
            className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white flex items-center gap-0.5"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          >
            <span>Manage</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4 Quick Access Shortcuts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => onNavigate('bills')}
<<<<<<< HEAD
            className="p-2.5 sm:p-3 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] text-left hover:bg-[#EFECE3] dark:hover:bg-[#203428] transition-colors group"
=======
            className="p-2.5 sm:p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          >
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
<<<<<<< HEAD
            <div className="text-xs font-bold text-[#252923] dark:text-[#F3F4F1] truncate">
              Monthly Bills
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095] truncate">
=======
            <div className="text-xs font-bold text-black dark:text-white truncate">
              Monthly Bills
            </div>
            <div className="text-[10px] text-neutral-400 truncate">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              {state.bills?.length || 0} bills configured
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('calendar')}
<<<<<<< HEAD
            className="p-2.5 sm:p-3 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] text-left hover:bg-[#EFECE3] dark:hover:bg-[#203428] transition-colors group"
=======
            className="p-2.5 sm:p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          >
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
<<<<<<< HEAD
            <div className="text-xs font-bold text-[#252923] dark:text-[#F3F4F1] truncate">
              Bill Calendar
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095] truncate">
              {monthMetrics.eventsCount} on schedule
=======
            <div className="text-xs font-bold text-black dark:text-white truncate">
              Bill Calendar
            </div>
            <div className="text-[10px] text-neutral-400 truncate">
              {monthMetrics.eventsCount} items on schedule
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('debt-planner')}
<<<<<<< HEAD
            className="p-2.5 sm:p-3 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] text-left hover:bg-[#EFECE3] dark:hover:bg-[#203428] transition-colors group"
=======
            className="p-2.5 sm:p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          >
            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <TrendingDown className="w-4 h-4" />
            </div>
<<<<<<< HEAD
            <div className="text-xs font-bold text-[#252923] dark:text-[#F3F4F1] truncate">
              Debt Planner
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095] truncate">
=======
            <div className="text-xs font-bold text-black dark:text-white truncate">
              Debt Planner
            </div>
            <div className="text-[10px] text-neutral-400 truncate">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              Snowball & Avalanche
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('reports')}
<<<<<<< HEAD
            className="p-2.5 sm:p-3 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] text-left hover:bg-[#EFECE3] dark:hover:bg-[#203428] transition-colors group"
=======
            className="p-2.5 sm:p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          >
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-4 h-4" />
            </div>
<<<<<<< HEAD
            <div className="text-xs font-bold text-[#252923] dark:text-[#F3F4F1] truncate">
              Analytics
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095] truncate">
=======
            <div className="text-xs font-bold text-black dark:text-white truncate">
              Analytics
            </div>
            <div className="text-[10px] text-neutral-400 truncate">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              Trends & CSV export
            </div>
          </button>
        </div>

        {/* Monthly Summary KPI Highlights */}
<<<<<<< HEAD
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-[#E5E1D8] dark:border-[#223528]">
          <div className="p-2.5 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20]">
            <div className="text-[10px] sm:text-[11px] text-[#777D75] dark:text-[#8FA095] truncate">Bills Due</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-[#252923] dark:text-white mt-0.5 truncate">
              {formatPeso(monthMetrics.totalBillsDue, { hide })}
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095]">
=======
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
          <div className="p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/50">
            <div className="text-[10px] sm:text-[11px] text-neutral-500 truncate">Bills Due This Month</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-black dark:text-white mt-0.5 truncate">
              {formatPeso(monthMetrics.totalBillsDue, { hide })}
            </div>
            <div className="text-[10px] text-neutral-400">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              Paid: {formatPeso(monthMetrics.totalBillsPaid, { hide, compact: true })}
            </div>
          </div>

<<<<<<< HEAD
          <div className="p-2.5 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20]">
            <div className="text-[10px] sm:text-[11px] text-[#777D75] dark:text-[#8FA095] truncate">Remaining to Pay</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-[#DC2626] mt-0.5 truncate">
              {formatPeso(monthMetrics.remainingBillsToPay, { hide })}
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095]">
=======
          <div className="p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/50">
            <div className="text-[10px] sm:text-[11px] text-neutral-500 truncate">Remaining Bills to Pay</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-[#DC2626] mt-0.5 truncate">
              {formatPeso(monthMetrics.remainingBillsToPay, { hide })}
            </div>
            <div className="text-[10px] text-neutral-400">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              {monthMetrics.remainingBillsToPay === 0 ? 'All settled' : 'Unsettled balance'}
            </div>
          </div>

<<<<<<< HEAD
          <div className="p-2.5 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20]">
            <div className="text-[10px] sm:text-[11px] text-[#777D75] dark:text-[#8FA095] truncate">Credit & Loans</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-[#174F32] dark:text-[#83C95B] mt-0.5 truncate">
              {formatPeso(monthMetrics.upcomingCreditAndLoans, { hide })}
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095]">
=======
          <div className="p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/50">
            <div className="text-[10px] sm:text-[11px] text-neutral-500 truncate">Credit & Loan Dues</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
              {formatPeso(monthMetrics.upcomingCreditAndLoans, { hide })}
            </div>
            <div className="text-[10px] text-neutral-400">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              Active obligations
            </div>
          </div>

<<<<<<< HEAD
          <div className="p-2.5 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20]">
            <div className="text-[10px] sm:text-[11px] text-[#777D75] dark:text-[#8FA095] truncate">Overdue</div>
=======
          <div className="p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/50">
            <div className="text-[10px] sm:text-[11px] text-neutral-500 truncate">Overdue Obligations</div>
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
            <div
              className={`text-sm sm:text-base font-bold tabular-nums mt-0.5 truncate ${
                monthMetrics.overdueCount > 0 ? 'text-[#DC2626]' : 'text-neutral-400'
              }`}
            >
              {monthMetrics.overdueCount > 0
                ? formatPeso(monthMetrics.overdueAmount, { hide })
                : 'None'}
            </div>
<<<<<<< HEAD
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095]">
=======
            <div className="text-[10px] text-neutral-400">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              {monthMetrics.overdueCount} past due
            </div>
          </div>

<<<<<<< HEAD
          <div className="p-2.5 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20]">
            <div className="text-[10px] sm:text-[11px] text-[#777D75] dark:text-[#8FA095] truncate">Expected Collections</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-[#16A34A] dark:text-[#83C95B] mt-0.5 truncate">
              {formatPeso(monthMetrics.expectedCollections, { hide })}
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095]">
=======
          <div className="p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/50">
            <div className="text-[10px] sm:text-[11px] text-neutral-500 truncate">Expected Collections</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-[#2E9E6B] mt-0.5 truncate">
              {formatPeso(monthMetrics.expectedCollections, { hide })}
            </div>
            <div className="text-[10px] text-neutral-400">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              Money owed to you
            </div>
          </div>

<<<<<<< HEAD
          <div className="p-2.5 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20]">
            <div className="text-[10px] sm:text-[11px] text-[#777D75] dark:text-[#8FA095] truncate">Month Budget</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-[#252923] dark:text-white mt-0.5 truncate">
              {formatPeso(budgetSummary.totalSpent, { hide })}
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095]">
              Limit: {formatPeso(budgetSummary.totalBudget, { hide, compact: true })}
=======
          <div className="p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/50">
            <div className="text-[10px] sm:text-[11px] text-neutral-500 truncate">Month Spending</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-black dark:text-white mt-0.5 truncate">
              {formatPeso(budgetSummary.totalSpent, { hide })}
            </div>
            <div className="text-[10px] text-neutral-400">
              Budget: {formatPeso(budgetSummary.totalBudget, { hide, compact: true })}
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
            </div>
          </div>
        </div>
      </div>

      {/* Money Owed to Me Quick Card */}
      {receivablesSummary.totalOutstanding > 0 && (
        <button
          type="button"
          onClick={() => onNavigate('accounts')}
<<<<<<< HEAD
          className="w-full bg-white dark:bg-[#15221B] rounded-[24px] px-4 sm:px-5 py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] flex items-center justify-between hover:bg-[#F9F8F5] dark:hover:bg-[#1A2A20] transition-all text-left"
=======
          className="w-full bg-white dark:bg-neutral-900 rounded-[20px] sm:rounded-[22px] px-4 sm:px-5 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between hover:bg-neutral-50/70 dark:hover:bg-neutral-800/80 transition-all text-left"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
        >
          <div className="flex items-center gap-2.5 min-w-0 mr-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <HandCoins className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
<<<<<<< HEAD
              <div className="text-xs sm:text-[13px] font-bold text-[#252923] dark:text-white truncate">
                Money Owed to Me: <span className="text-blue-600 dark:text-blue-400 tabular-nums">{formatPeso(receivablesSummary.totalOutstanding, { hide })}</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-[#777D75] dark:text-[#8FA095] truncate">
=======
              <div className="text-xs sm:text-[13px] font-bold text-black dark:text-white truncate">
                Money Owed to Me: <span className="text-blue-600 dark:text-blue-400 tabular-nums">{formatPeso(receivablesSummary.totalOutstanding, { hide })}</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-neutral-400 truncate">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                {receivablesSummary.debtorsCount} {receivablesSummary.debtorsCount === 1 ? 'person owes' : 'people owe'} you money (Receivables)
              </div>
            </div>
          </div>
<<<<<<< HEAD
          <span className="text-xs font-semibold text-[#777D75] dark:text-[#8FA095] flex items-center gap-1 shrink-0">
=======
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-1 shrink-0">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
            <span>View</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>
        </button>
      )}

<<<<<<< HEAD
      {/* 6. FINANCIAL ACCOUNT CARDS (Reference Screen 2) */}
      <div className="w-full max-w-full min-w-0">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm sm:text-base font-bold text-[#252923] dark:text-[#F3F4F1]">
            Wallets & Accounts
          </h2>
          <button
            type="button"
            onClick={onOpenAddAccount}
            className="text-xs font-bold text-[#174F32] dark:text-[#83C95B] hover:opacity-80 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>
        </div>

=======
      {/* B. FINANCIAL ACCOUNT CARDS (2-col on mobile, 4-col on tablet/desktop) */}
      <div className="w-full max-w-full min-w-0">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
        {displayedAccounts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 w-full max-w-full min-w-0">
            {displayedAccounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => onSelectAccount(acc.id)}
<<<<<<< HEAD
                className="bg-white dark:bg-[#15221B] rounded-[22px] p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] text-left flex flex-col justify-between min-h-[138px] sm:min-h-[146px] hover:border-[#174F32]/30 dark:hover:border-[#83C95B]/30 hover:bg-[#F9F8F5] dark:hover:bg-[#1A2A20] active:scale-[0.99] transition-all min-w-0"
=======
                className="bg-white dark:bg-neutral-900 rounded-[20px] sm:rounded-[22px] p-3 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.025)] text-left flex flex-col justify-between min-h-[134px] sm:min-h-[142px] hover:bg-neutral-50/70 dark:hover:bg-neutral-800/80 active:scale-[0.99] transition-all min-w-0"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              >
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 w-full">
                  <ProviderLogo
                    providerId={acc.providerId}
                    name={acc.name}
                    customColor={acc.customColor}
                    size="md"
                  />
<<<<<<< HEAD
                  <span className="text-sm sm:text-[15px] font-bold text-[#252923] dark:text-white truncate flex-1 min-w-0">
=======
                  <span className="text-sm sm:text-[15px] font-semibold text-neutral-900 dark:text-white truncate flex-1 min-w-0">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                    {acc.name}
                  </span>
                </div>

                <div className="mt-4 sm:mt-5 w-full min-w-0">
                  <div
<<<<<<< HEAD
                    className={`text-[17px] sm:text-[19px] font-extrabold tabular-nums tracking-tight truncate ${
                      acc.isLiability && acc.currentBalance > 0
                        ? 'text-[#DC2626]'
                        : 'text-[#252923] dark:text-white'
=======
                    className={`text-[17px] sm:text-[19px] font-bold tabular-nums tracking-tight truncate ${
                      acc.isLiability && acc.currentBalance > 0
                        ? 'text-[#DC2626]'
                        : 'text-black dark:text-white'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                    }`}
                  >
                    {formatPeso(acc.currentBalance, { hide })}
                  </div>
<<<<<<< HEAD
                  <div className="text-xs sm:text-[13px] text-[#777D75] dark:text-[#8FA095] mt-0.5 truncate">
=======
                  <div className="text-xs sm:text-[13px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                    {acc.category}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
<<<<<<< HEAD
          <div className="bg-white dark:bg-[#15221B] rounded-[24px] p-5 sm:p-6 text-center space-y-3 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528]">
            <p className="text-xs sm:text-sm text-[#777D75] dark:text-[#8FA095]">
=======
          <div className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-5 sm:p-6 text-center space-y-3 shadow-[0_2px_12px_rgba(0,0,0,0.025)]">
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              No financial accounts added yet. Add wallets, savings, cards, or loans.
            </p>
            <button
              type="button"
              onClick={onOpenAddAccount}
<<<<<<< HEAD
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold transition-colors"
=======
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
            >
              <Plus className="w-4 h-4" />
              <span>Add First Account</span>
            </button>
          </div>
        )}

        {/* "See all accounts >" */}
<<<<<<< HEAD
        <div className="flex items-center justify-center pt-2.5 pb-1">
          <button
            type="button"
            onClick={() => onNavigate('accounts')}
            className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold text-[#174F32] dark:text-[#83C95B] hover:bg-[#174F32]/5 dark:hover:bg-white/5 transition-colors"
=======
        <div className="flex items-center justify-center pt-2 pb-1">
          <button
            type="button"
            onClick={() => onNavigate('accounts')}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm sm:text-[15px] font-semibold text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          >
            <span>See all accounts</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

<<<<<<< HEAD
      {/* 7. LOWER SECTION: Budget Highlight & Recent Transactions */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4 items-start w-full max-w-full min-w-0">
        {/* Left Column (md:col-span-5) */}
        <div className="space-y-3.5 sm:space-y-4 md:col-span-5 w-full max-w-full min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('budgets')}
            className="w-full bg-white dark:bg-[#15221B] rounded-[24px] py-5 sm:py-6 px-4 sm:px-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] flex items-center justify-between hover:bg-[#F9F8F5] dark:hover:bg-[#1A2A20] active:scale-[0.99] transition-all group overflow-hidden"
          >
            <div className="text-left">
              <span className="text-base sm:text-lg font-bold text-[#252923] dark:text-white block">
                Set Your Budget
              </span>
              <span className="text-xs text-[#777D75] dark:text-[#8FA095]">
                Plan spending limits by category
              </span>
            </div>
            <span className="w-9 h-9 rounded-full bg-[#174F32] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ArrowRight className="w-4 h-4 stroke-[2.6]" />
            </span>
          </button>

          {/* Budget Overview Card */}
          <div className="bg-white dark:bg-[#15221B] rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] space-y-3 w-full max-w-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#174F32] dark:text-[#83C95B]" />
                <span className="text-xs sm:text-sm font-bold text-[#252923] dark:text-white">
=======
      {/* LOWER SECTION: Stack on Mobile, 2 balanced columns on Tablet & Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4 items-start w-full max-w-full min-w-0">
        {/* Left Column on Tablet (md:col-span-5) */}
        <div className="space-y-3.5 sm:space-y-4 md:col-span-5 w-full max-w-full min-w-0">
          {/* C. SET YOUR BUDGET CARD */}
          <button
            type="button"
            onClick={() => onNavigate('budgets')}
            className="w-full bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] py-6 sm:py-7 px-4 sm:px-6 shadow-[0_2px_12px_rgba(0,0,0,0.025)] flex items-center justify-between hover:bg-neutral-50/70 dark:hover:bg-neutral-800/80 active:scale-[0.99] transition-all group overflow-hidden"
          >
            <span className="text-base sm:text-[18px] font-normal text-neutral-900 dark:text-white truncate mr-2">
              Set your Budget
            </span>
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.6]" />
            </span>
          </button>

          {/* Tablet Budget Overview Highlight (balances left column on tablets) */}
          <div className="hidden md:block bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] space-y-3 w-full max-w-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-neutral-500" />
                <span className="text-xs sm:text-sm font-bold text-black dark:text-white">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                  {formatMonthLabel(currentMonthKey)} Budget
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('budgets')}
<<<<<<< HEAD
                className="text-xs font-semibold text-[#174F32] dark:text-[#83C95B] hover:opacity-80"
=======
                className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              >
                Manage
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
<<<<<<< HEAD
                <span className="text-[#777D75] dark:text-[#8FA095]">Remaining</span>
=======
                <span className="text-neutral-500">Remaining</span>
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                <span
                  className={`font-bold tabular-nums ${
                    budgetSummary.remainingBudget < 0
                      ? 'text-[#DC2626]'
<<<<<<< HEAD
                      : 'text-[#252923] dark:text-white'
=======
                      : 'text-black dark:text-white'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                  }`}
                >
                  {formatPeso(budgetSummary.remainingBudget, { hide })}
                </span>
              </div>
<<<<<<< HEAD
              <div className="w-full h-2.5 bg-[#E8E4DA] dark:bg-[#1A2A20] rounded-full overflow-hidden">
=======
              <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    budgetSummary.overallStatus === 'exceeded'
                      ? 'bg-[#DC2626]'
                      : budgetSummary.overallStatus === 'warning'
                      ? 'bg-amber-500'
<<<<<<< HEAD
                      : 'bg-[#4E9D39]'
=======
                      : 'bg-[#2E9E6B]'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, budgetSummary.overallPercent))}%`,
                  }}
                />
              </div>
<<<<<<< HEAD
              <div className="flex justify-between text-[11px] text-[#777D75] dark:text-[#8FA095] tabular-nums">
=======
              <div className="flex justify-between text-[11px] text-neutral-400 tabular-nums">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                <span>
                  Spent: {formatPeso(budgetSummary.totalSpent, { hide, compact: true })}
                </span>
                <span>
                  Limit: {formatPeso(budgetSummary.totalBudget, { hide, compact: true })}
                </span>
              </div>
            </div>
          </div>
        </div>

<<<<<<< HEAD
        {/* Right Column: Recent Transactions (md:col-span-7) */}
        <div className="md:col-span-7 w-full max-w-full min-w-0">
          <div className="bg-white dark:bg-[#15221B] rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] w-full max-w-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h2 className="text-base sm:text-[18px] font-bold text-[#252923] dark:text-white">
                Recent Transactions
=======
        {/* Right Column on Tablet (md:col-span-7) */}
        <div className="md:col-span-7 w-full max-w-full min-w-0">
          {/* D. TRANSACTIONS SECTION */}
          <div className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] w-full max-w-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h2 className="text-base sm:text-[18px] font-bold text-black dark:text-white">
                Transactions
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('transactions')}
<<<<<<< HEAD
                className="inline-flex items-center gap-0.5 sm:gap-1 text-xs sm:text-[13px] font-bold text-[#174F32] dark:text-[#83C95B] hover:opacity-80 transition-opacity min-h-[40px] px-1"
              >
                <span>See All</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
=======
                className="inline-flex items-center gap-0.5 sm:gap-1 text-xs sm:text-[14px] font-semibold text-black dark:text-white hover:opacity-75 transition-opacity min-h-[40px] px-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="py-6 sm:py-8 text-center space-y-2.5">
<<<<<<< HEAD
                <p className="text-xs sm:text-sm text-[#777D75] dark:text-[#8FA095]">
=======
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                  No transactions recorded yet.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenAddTransaction('expense')}
<<<<<<< HEAD
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold transition-colors"
=======
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Transaction</span>
                </button>
              </div>
            ) : (
<<<<<<< HEAD
              <div className="divide-y divide-[#EFECE3] dark:divide-[#1E2E23]">
=======
              <div className="divide-y divide-neutral-200/90 dark:divide-neutral-800">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                {recentTransactions.map((tx) => {
                  const acc = reconciledAccounts.find((a) => a.id === tx.accountId);
                  const destAcc = tx.destinationAccountId
                    ? reconciledAccounts.find((a) => a.id === tx.destinationAccountId)
                    : undefined;

                  const isPositive =
                    tx.type === 'income' ||
                    (tx.type === 'adjustment' && tx.adjustmentSign !== 'negative');
                  const isNegative =
                    tx.type === 'expense' ||
                    (tx.type === 'adjustment' && tx.adjustmentSign === 'negative');

                  return (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => onSelectTransaction(tx)}
<<<<<<< HEAD
                      className="w-full py-3 sm:py-3.5 first:pt-1 last:pb-1 text-left hover:bg-[#F9F8F5] dark:hover:bg-[#1A2A20] rounded-xl transition-colors min-w-0"
                    >
=======
                      className="w-full py-3 sm:py-3.5 first:pt-1 last:pb-1 text-left hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 rounded-xl transition-colors min-w-0"
                    >
                      <div className="text-[11px] sm:text-[12px] text-neutral-500 dark:text-neutral-400 mb-1">
                        {formatTransactionDateTime(tx.dateTime)}
                      </div>
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                      <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <ProviderLogo
                            providerId={acc?.providerId || 'custom'}
                            name={acc?.name || tx.category}
                            customColor={acc?.customColor}
<<<<<<< HEAD
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-[14px] font-bold text-[#252923] dark:text-white truncate">
                              {tx.merchantOrTitle}
                            </div>
                            <div className="text-[11px] text-[#777D75] dark:text-[#8FA095] truncate">
                              {formatTransactionDateTime(tx.dateTime)} ·{' '}
                              {tx.type === 'transfer' && destAcc
                                ? `${acc?.name} → ${destAcc.name}`
                                : tx.category}
                            </div>
=======
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-[14px] font-medium text-black dark:text-white truncate">
                              {tx.merchantOrTitle}
                            </div>
                            {tx.type === 'transfer' && destAcc ? (
                              <div className="text-[10px] sm:text-xs text-neutral-500 truncate">
                                {acc?.name} → {destAcc.name}
                              </div>
                            ) : (
                              <div className="text-[10px] sm:text-xs text-neutral-400 truncate">
                                {tx.category}
                              </div>
                            )}
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                          </div>
                        </div>

                        <div
<<<<<<< HEAD
                          className={`text-xs sm:text-[15px] font-bold tabular-nums shrink-0 ${
                            isPositive
                              ? 'text-[#16A34A] dark:text-[#83C95B]'
                              : isNegative
                              ? 'text-[#DC2626]'
                              : 'text-[#252923] dark:text-neutral-200'
                          }`}
                        >
                          {isPositive ? '+' : isNegative ? '-' : ''}
=======
                          className={`text-xs sm:text-[15px] font-semibold tabular-nums shrink-0 ${
                            isPositive
                              ? 'text-[#2E9E6B]'
                              : isNegative
                              ? 'text-[#DC2626]'
                              : 'text-neutral-800 dark:text-neutral-200'
                          }`}
                        >
                          {isNegative ? '-' : ''}
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                          {formatPeso(tx.amount, { hide })}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
