import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  BarChart3,
  Calendar,
  ChevronRight,
  CreditCard,
  HandCoins,
  PieChart,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { ProviderLogo } from '../components/ProviderLogo';
import { SwipeableFinancialSummary } from '../components/SwipeableFinancialSummary';
import { useFinance } from '../context/FinanceContext';
import { AccountCategory, ActiveTab, TransactionRecord, TransactionType } from '../types/finance';
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
  onSelectCategory?: (category: AccountCategory) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenAddAccount,
  onSelectAccount,
  onOpenAddTransaction,
  onSelectTransaction,
  onSelectCategory,
}) => {
  const {
    reconciledAccounts,
    receivablesSummary,
    state,
    currentUser,
  } = useFinance();

  const hide = state.settings.hideBalances;

  const activeAccounts = reconciledAccounts.filter((a) => !a.archived);
  const displayedAccounts = activeAccounts.slice(0, 4);

  const currentMonthKey = getMonthKey();

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
              Bills, debt payments, and collections due this month
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('bills')}
            className="text-xs font-semibold text-[#174F32] dark:text-[#83C95B] hover:opacity-80 flex items-center gap-0.5"
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
            className="p-2.5 sm:p-3 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] text-left hover:bg-[#EFECE3] dark:hover:bg-[#203428] transition-colors group"
          >
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-[#252923] dark:text-[#F3F4F1] truncate">
              Monthly Bills
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095] truncate">
              {state.bills?.length || 0} bills configured
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('calendar')}
            className="p-2.5 sm:p-3 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] text-left hover:bg-[#EFECE3] dark:hover:bg-[#203428] transition-colors group"
          >
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-[#252923] dark:text-[#F3F4F1] truncate">
              Bill Calendar
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095] truncate">
              {monthMetrics.eventsCount} on schedule
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('debt-planner')}
            className="p-2.5 sm:p-3 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] text-left hover:bg-[#EFECE3] dark:hover:bg-[#203428] transition-colors group"
          >
            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-[#252923] dark:text-[#F3F4F1] truncate">
              Debt Planner
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095] truncate">
              Snowball & Avalanche
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="p-2.5 sm:p-3 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] text-left hover:bg-[#EFECE3] dark:hover:bg-[#203428] transition-colors group"
          >
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-[#252923] dark:text-[#F3F4F1] truncate">
              Analytics
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095] truncate">
              Trends & CSV export
            </div>
          </button>
        </div>

        {/* Monthly Summary KPI Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-[#E5E1D8] dark:border-[#223528]">
          <div className="p-2.5 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20]">
            <div className="text-[10px] sm:text-[11px] text-[#777D75] dark:text-[#8FA095] truncate">Bills Due</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-[#252923] dark:text-white mt-0.5 truncate">
              {formatPeso(monthMetrics.totalBillsDue, { hide })}
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095]">
              Paid: {formatPeso(monthMetrics.totalBillsPaid, { hide, compact: true })}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20]">
            <div className="text-[10px] sm:text-[11px] text-[#777D75] dark:text-[#8FA095] truncate">Remaining to Pay</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-[#DC2626] mt-0.5 truncate">
              {formatPeso(monthMetrics.remainingBillsToPay, { hide })}
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095]">
              {monthMetrics.remainingBillsToPay === 0 ? 'All settled' : 'Unsettled balance'}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20]">
            <div className="text-[10px] sm:text-[11px] text-[#777D75] dark:text-[#8FA095] truncate">Credit & Loans</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-[#174F32] dark:text-[#83C95B] mt-0.5 truncate">
              {formatPeso(monthMetrics.upcomingCreditAndLoans, { hide })}
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095]">
              Active obligations
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20]">
            <div className="text-[10px] sm:text-[11px] text-[#777D75] dark:text-[#8FA095] truncate">Overdue</div>
            <div
              className={`text-sm sm:text-base font-bold tabular-nums mt-0.5 truncate ${
                monthMetrics.overdueCount > 0 ? 'text-[#DC2626]' : 'text-neutral-400'
              }`}
            >
              {monthMetrics.overdueCount > 0
                ? formatPeso(monthMetrics.overdueAmount, { hide })
                : 'None'}
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095]">
              {monthMetrics.overdueCount} past due
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20]">
            <div className="text-[10px] sm:text-[11px] text-[#777D75] dark:text-[#8FA095] truncate">Expected Collections</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-[#16A34A] dark:text-[#83C95B] mt-0.5 truncate">
              {formatPeso(monthMetrics.expectedCollections, { hide })}
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095]">
              Money owed to you
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20]">
            <div className="text-[10px] sm:text-[11px] text-[#777D75] dark:text-[#8FA095] truncate">Month Budget</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-[#252923] dark:text-white mt-0.5 truncate">
              {formatPeso(budgetSummary.totalSpent, { hide })}
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095]">
              Limit: {formatPeso(budgetSummary.totalBudget, { hide, compact: true })}
            </div>
          </div>
        </div>
      </div>

      {/* Money Owed to Me Quick Card */}
      {receivablesSummary.totalOutstanding > 0 && (
        <button
          type="button"
          onClick={() => onNavigate('accounts')}
          className="w-full bg-white dark:bg-[#15221B] rounded-[24px] px-4 sm:px-5 py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] flex items-center justify-between hover:bg-[#F9F8F5] dark:hover:bg-[#1A2A20] transition-all text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0 mr-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <HandCoins className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-[13px] font-bold text-[#252923] dark:text-white truncate">
                Money Owed to Me: <span className="text-blue-600 dark:text-blue-400 tabular-nums">{formatPeso(receivablesSummary.totalOutstanding, { hide })}</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-[#777D75] dark:text-[#8FA095] truncate">
                {receivablesSummary.debtorsCount} {receivablesSummary.debtorsCount === 1 ? 'person owes' : 'people owe'} you money (Receivables)
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#777D75] dark:text-[#8FA095] flex items-center gap-1 shrink-0">
            <span>View</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>
        </button>
      )}

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

        {displayedAccounts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 w-full max-w-full min-w-0">
            {displayedAccounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => onSelectAccount(acc.id)}
                className="bg-white dark:bg-[#15221B] rounded-[22px] p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] text-left flex flex-col justify-between min-h-[138px] sm:min-h-[146px] hover:border-[#174F32]/30 dark:hover:border-[#83C95B]/30 hover:bg-[#F9F8F5] dark:hover:bg-[#1A2A20] active:scale-[0.99] transition-all min-w-0"
              >
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 w-full">
                  <ProviderLogo
                    providerId={acc.providerId}
                    name={acc.name}
                    customColor={acc.customColor}
                    size="md"
                  />
                  <span className="text-sm sm:text-[15px] font-bold text-[#252923] dark:text-white truncate flex-1 min-w-0">
                    {acc.name}
                  </span>
                </div>

                <div className="mt-4 sm:mt-5 w-full min-w-0">
                  <div
                    className={`text-[17px] sm:text-[19px] font-extrabold tabular-nums tracking-tight truncate ${
                      acc.isLiability && acc.currentBalance > 0
                        ? 'text-[#DC2626]'
                        : 'text-[#252923] dark:text-white'
                    }`}
                  >
                    {formatPeso(acc.currentBalance, { hide })}
                  </div>
                  <div className="text-xs sm:text-[13px] text-[#777D75] dark:text-[#8FA095] mt-0.5 truncate">
                    {acc.category}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#15221B] rounded-[24px] p-5 sm:p-6 text-center space-y-3 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528]">
            <p className="text-xs sm:text-sm text-[#777D75] dark:text-[#8FA095]">
              No financial accounts added yet. Add wallets, savings, cards, or loans.
            </p>
            <button
              type="button"
              onClick={onOpenAddAccount}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Account</span>
            </button>
          </div>
        )}

        {/* "See all accounts >" */}
        <div className="flex items-center justify-center pt-2.5 pb-1">
          <button
            type="button"
            onClick={() => onNavigate('accounts')}
            className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold text-[#174F32] dark:text-[#83C95B] hover:bg-[#174F32]/5 dark:hover:bg-white/5 transition-colors"
          >
            <span>See all accounts</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

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
                  {formatMonthLabel(currentMonthKey)} Budget
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('budgets')}
                className="text-xs font-semibold text-[#174F32] dark:text-[#83C95B] hover:opacity-80"
              >
                Manage
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#777D75] dark:text-[#8FA095]">Remaining</span>
                <span
                  className={`font-bold tabular-nums ${
                    budgetSummary.remainingBudget < 0
                      ? 'text-[#DC2626]'
                      : 'text-[#252923] dark:text-white'
                  }`}
                >
                  {formatPeso(budgetSummary.remainingBudget, { hide })}
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#E8E4DA] dark:bg-[#1A2A20] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    budgetSummary.overallStatus === 'exceeded'
                      ? 'bg-[#DC2626]'
                      : budgetSummary.overallStatus === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-[#4E9D39]'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, budgetSummary.overallPercent))}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[#777D75] dark:text-[#8FA095] tabular-nums">
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

        {/* Right Column: Recent Transactions (md:col-span-7) */}
        <div className="md:col-span-7 w-full max-w-full min-w-0">
          <div className="bg-white dark:bg-[#15221B] rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] w-full max-w-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h2 className="text-base sm:text-[18px] font-bold text-[#252923] dark:text-white">
                Recent Transactions
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('transactions')}
                className="inline-flex items-center gap-0.5 sm:gap-1 text-xs sm:text-[13px] font-bold text-[#174F32] dark:text-[#83C95B] hover:opacity-80 transition-opacity min-h-[40px] px-1"
              >
                <span>See All</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="py-6 sm:py-8 text-center space-y-2.5">
                <p className="text-xs sm:text-sm text-[#777D75] dark:text-[#8FA095]">
                  No transactions recorded yet.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenAddTransaction('expense')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Transaction</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#EFECE3] dark:divide-[#1E2E23]">
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
                      className="w-full py-3 sm:py-3.5 first:pt-1 last:pb-1 text-left hover:bg-[#F9F8F5] dark:hover:bg-[#1A2A20] rounded-xl transition-colors min-w-0"
                    >
                      <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <ProviderLogo
                            providerId={acc?.providerId || 'custom'}
                            name={acc?.name || tx.category}
                            customColor={acc?.customColor}
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
                          </div>
                        </div>

                        <div
                          className={`text-xs sm:text-[15px] font-bold tabular-nums shrink-0 ${
                            isPositive
                              ? 'text-[#16A34A] dark:text-[#83C95B]'
                              : isNegative
                              ? 'text-[#DC2626]'
                              : 'text-[#252923] dark:text-neutral-200'
                          }`}
                        >
                          {isPositive ? '+' : isNegative ? '-' : ''}
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
