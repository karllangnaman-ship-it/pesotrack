import React, { useMemo } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Calendar,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Flame,
  HandCoins,
  Landmark,
  PieChart,
  Plus,
  Receipt,
  TrendingDown,
} from 'lucide-react';
import { ProviderLogo } from '../components/ProviderLogo';
import { SwipeableFinancialSummary } from '../components/SwipeableFinancialSummary';
import { useFinance } from '../context/FinanceContext';
import { ActiveTab, TransactionRecord, TransactionType } from '../types/finance';
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
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenAddAccount,
  onSelectAccount,
  onOpenAddTransaction,
  onSelectTransaction,
}) => {
  const {
    reconciledAccounts,
    netWorthSummary,
    receivablesSummary,
    state,
    toggleHideBalances,
  } = useFinance();

  const hide = state.settings.hideBalances;
  const activeAccounts = reconciledAccounts.filter((a) => !a.archived);
  const displayedAccounts = activeAccounts.slice(0, 4);

  const currentMonthKey = getMonthKey();
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
              Bills, debt payments, and collections due this month
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('bills')}
            className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white flex items-center gap-0.5"
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
            className="p-2.5 sm:p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
          >
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-black dark:text-white truncate">
              Monthly Bills
            </div>
            <div className="text-[10px] text-neutral-400 truncate">
              {state.bills?.length || 0} bills configured
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('calendar')}
            className="p-2.5 sm:p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
          >
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-black dark:text-white truncate">
              Bill Calendar
            </div>
            <div className="text-[10px] text-neutral-400 truncate">
              {monthMetrics.eventsCount} items on schedule
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('debt-planner')}
            className="p-2.5 sm:p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
          >
            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-black dark:text-white truncate">
              Debt Planner
            </div>
            <div className="text-[10px] text-neutral-400 truncate">
              Snowball & Avalanche
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="p-2.5 sm:p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
          >
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-black dark:text-white truncate">
              Analytics
            </div>
            <div className="text-[10px] text-neutral-400 truncate">
              Trends & CSV export
            </div>
          </button>
        </div>

        {/* Monthly Summary KPI Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
          <div className="p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/50">
            <div className="text-[10px] sm:text-[11px] text-neutral-500 truncate">Bills Due This Month</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-black dark:text-white mt-0.5 truncate">
              {formatPeso(monthMetrics.totalBillsDue, { hide })}
            </div>
            <div className="text-[10px] text-neutral-400">
              Paid: {formatPeso(monthMetrics.totalBillsPaid, { hide, compact: true })}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/50">
            <div className="text-[10px] sm:text-[11px] text-neutral-500 truncate">Remaining Bills to Pay</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-[#DC2626] mt-0.5 truncate">
              {formatPeso(monthMetrics.remainingBillsToPay, { hide })}
            </div>
            <div className="text-[10px] text-neutral-400">
              {monthMetrics.remainingBillsToPay === 0 ? 'All settled' : 'Unsettled balance'}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/50">
            <div className="text-[10px] sm:text-[11px] text-neutral-500 truncate">Credit & Loan Dues</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
              {formatPeso(monthMetrics.upcomingCreditAndLoans, { hide })}
            </div>
            <div className="text-[10px] text-neutral-400">
              Active obligations
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/50">
            <div className="text-[10px] sm:text-[11px] text-neutral-500 truncate">Overdue Obligations</div>
            <div
              className={`text-sm sm:text-base font-bold tabular-nums mt-0.5 truncate ${
                monthMetrics.overdueCount > 0 ? 'text-[#DC2626]' : 'text-neutral-400'
              }`}
            >
              {monthMetrics.overdueCount > 0
                ? formatPeso(monthMetrics.overdueAmount, { hide })
                : 'None'}
            </div>
            <div className="text-[10px] text-neutral-400">
              {monthMetrics.overdueCount} past due
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/50">
            <div className="text-[10px] sm:text-[11px] text-neutral-500 truncate">Expected Collections</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-[#2E9E6B] mt-0.5 truncate">
              {formatPeso(monthMetrics.expectedCollections, { hide })}
            </div>
            <div className="text-[10px] text-neutral-400">
              Money owed to you
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/50">
            <div className="text-[10px] sm:text-[11px] text-neutral-500 truncate">Month Spending</div>
            <div className="text-sm sm:text-base font-bold tabular-nums text-black dark:text-white mt-0.5 truncate">
              {formatPeso(budgetSummary.totalSpent, { hide })}
            </div>
            <div className="text-[10px] text-neutral-400">
              Budget: {formatPeso(budgetSummary.totalBudget, { hide, compact: true })}
            </div>
          </div>
        </div>
      </div>

      {/* Money Owed to Me Quick Card */}
      {receivablesSummary.totalOutstanding > 0 && (
        <button
          type="button"
          onClick={() => onNavigate('accounts')}
          className="w-full bg-white dark:bg-neutral-900 rounded-[20px] sm:rounded-[22px] px-4 sm:px-5 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between hover:bg-neutral-50/70 dark:hover:bg-neutral-800/80 transition-all text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0 mr-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <HandCoins className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-[13px] font-bold text-black dark:text-white truncate">
                Money Owed to Me: <span className="text-blue-600 dark:text-blue-400 tabular-nums">{formatPeso(receivablesSummary.totalOutstanding, { hide })}</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-neutral-400 truncate">
                {receivablesSummary.debtorsCount} {receivablesSummary.debtorsCount === 1 ? 'person owes' : 'people owe'} you money (Receivables)
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-1 shrink-0">
            <span>View</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>
        </button>
      )}

      {/* B. FINANCIAL ACCOUNT CARDS (2-col on mobile, 4-col on tablet/desktop) */}
      <div className="w-full max-w-full min-w-0">
        {displayedAccounts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 w-full max-w-full min-w-0">
            {displayedAccounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => onSelectAccount(acc.id)}
                className="bg-white dark:bg-neutral-900 rounded-[20px] sm:rounded-[22px] p-3 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.025)] text-left flex flex-col justify-between min-h-[134px] sm:min-h-[142px] hover:bg-neutral-50/70 dark:hover:bg-neutral-800/80 active:scale-[0.99] transition-all min-w-0"
              >
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 w-full">
                  <ProviderLogo
                    providerId={acc.providerId}
                    name={acc.name}
                    customColor={acc.customColor}
                    size="md"
                  />
                  <span className="text-sm sm:text-[15px] font-semibold text-neutral-900 dark:text-white truncate flex-1 min-w-0">
                    {acc.name}
                  </span>
                </div>

                <div className="mt-4 sm:mt-5 w-full min-w-0">
                  <div
                    className={`text-[17px] sm:text-[19px] font-bold tabular-nums tracking-tight truncate ${
                      acc.isLiability && acc.currentBalance > 0
                        ? 'text-[#DC2626]'
                        : 'text-black dark:text-white'
                    }`}
                  >
                    {formatPeso(acc.currentBalance, { hide })}
                  </div>
                  <div className="text-xs sm:text-[13px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                    {acc.category}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-5 sm:p-6 text-center space-y-3 shadow-[0_2px_12px_rgba(0,0,0,0.025)]">
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
              No financial accounts added yet. Add wallets, savings, cards, or loans.
            </p>
            <button
              type="button"
              onClick={onOpenAddAccount}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Account</span>
            </button>
          </div>
        )}

        {/* "See all accounts >" */}
        <div className="flex items-center justify-center pt-2 pb-1">
          <button
            type="button"
            onClick={() => onNavigate('accounts')}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm sm:text-[15px] font-semibold text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <span>See all accounts</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

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
                  {formatMonthLabel(currentMonthKey)} Budget
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('budgets')}
                className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              >
                Manage
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Remaining</span>
                <span
                  className={`font-bold tabular-nums ${
                    budgetSummary.remainingBudget < 0
                      ? 'text-[#DC2626]'
                      : 'text-black dark:text-white'
                  }`}
                >
                  {formatPeso(budgetSummary.remainingBudget, { hide })}
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    budgetSummary.overallStatus === 'exceeded'
                      ? 'bg-[#DC2626]'
                      : budgetSummary.overallStatus === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-[#2E9E6B]'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, budgetSummary.overallPercent))}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-neutral-400 tabular-nums">
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

        {/* Right Column on Tablet (md:col-span-7) */}
        <div className="md:col-span-7 w-full max-w-full min-w-0">
          {/* D. TRANSACTIONS SECTION */}
          <div className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] w-full max-w-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h2 className="text-base sm:text-[18px] font-bold text-black dark:text-white">
                Transactions
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('transactions')}
                className="inline-flex items-center gap-0.5 sm:gap-1 text-xs sm:text-[14px] font-semibold text-black dark:text-white hover:opacity-75 transition-opacity min-h-[40px] px-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="py-6 sm:py-8 text-center space-y-2.5">
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                  No transactions recorded yet.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenAddTransaction('expense')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Transaction</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-neutral-200/90 dark:divide-neutral-800">
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
                      className="w-full py-3 sm:py-3.5 first:pt-1 last:pb-1 text-left hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 rounded-xl transition-colors min-w-0"
                    >
                      <div className="text-[11px] sm:text-[12px] text-neutral-500 dark:text-neutral-400 mb-1">
                        {formatTransactionDateTime(tx.dateTime)}
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <ProviderLogo
                            providerId={acc?.providerId || 'custom'}
                            name={acc?.name || tx.category}
                            customColor={acc?.customColor}
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
                          </div>
                        </div>

                        <div
                          className={`text-xs sm:text-[15px] font-semibold tabular-nums shrink-0 ${
                            isPositive
                              ? 'text-[#2E9E6B]'
                              : isNegative
                              ? 'text-[#DC2626]'
                              : 'text-neutral-800 dark:text-neutral-200'
                          }`}
                        >
                          {isNegative ? '-' : ''}
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
