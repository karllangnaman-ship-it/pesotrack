import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  DollarSign,
  Download,
  Filter,
  HandCoins,
  Landmark,
  PieChart,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { ProviderLogo } from '../components/ProviderLogo';
import { useFinance } from '../context/FinanceContext';
import {
  addPHP,
  formatMonthLabel,
  formatPeso,
  fromCentavos,
  getMonthKey,
  subPHP,
  toCentavos,
} from '../utils/currency';
import { exportAnalyticsCSV } from '../utils/backupService';
import { calculateMonthlyBudgetSummary } from '../utils/financeEngine';

type DateRangePreset =
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
  | 'all_time'
  | 'custom';

interface ReportsPageProps {
  initialSection?: 'analytics' | 'cashflow' | 'breakdown';
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ initialSection }) => {
  const {
    state,
    reconciledAccounts,
    netWorthSummary,
    receivablesSummary,
    monthlyBillEntries,
    bills,
    showToast,
  } = useFinance();
  const hide = state.settings.hideBalances;

  // Filter state
  const [rangePreset, setRangePreset] = useState<DateRangePreset>('this_month');

  React.useEffect(() => {
    if (initialSection) {
      const el = document.getElementById(`section-${initialSection}`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
    }
  }, [initialSection]);
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10)
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [isExporting, setIsExporting] = useState(false);

  // Compute effective date range boundaries
  const { startDateStr, endDateStr, periodLabel } = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-indexed

    let start = new Date(curYear, curMonth, 1);
    let end = new Date(curYear, curMonth + 1, 0, 23, 59, 59);
    let label = 'This Month';

    if (rangePreset === 'last_month') {
      start = new Date(curYear, curMonth - 1, 1);
      end = new Date(curYear, curMonth, 0, 23, 59, 59);
      label = 'Last Month';
    } else if (rangePreset === 'last_3_months') {
      start = new Date(curYear, curMonth - 2, 1);
      end = new Date(curYear, curMonth + 1, 0, 23, 59, 59);
      label = 'Last 3 Months';
    } else if (rangePreset === 'last_6_months') {
      start = new Date(curYear, curMonth - 5, 1);
      end = new Date(curYear, curMonth + 1, 0, 23, 59, 59);
      label = 'Last 6 Months';
    } else if (rangePreset === 'this_year') {
      start = new Date(curYear, 0, 1);
      end = new Date(curYear, 11, 31, 23, 59, 59);
      label = `${curYear} Full Year`;
    } else if (rangePreset === 'all_time') {
      start = new Date(2000, 0, 1);
      end = new Date(2100, 11, 31, 23, 59, 59);
      label = 'All Time';
    } else if (rangePreset === 'custom') {
      const s = customStartDate ? new Date(customStartDate) : new Date(curYear, curMonth, 1);
      const e = customEndDate ? new Date(customEndDate) : new Date();
      start = s;
      end = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59);
      label = `${customStartDate} to ${customEndDate}`;
    }

    return {
      startDateStr: start.toISOString().slice(0, 10),
      endDateStr: end.toISOString().slice(0, 10),
      periodLabel: label,
    };
  }, [rangePreset, customStartDate, customEndDate]);

  // Filter transactions within range
  // CRITICAL RULE: Transfers between user's own accounts are NOT income or expenses
  const transactionsInPeriod = useMemo(() => {
    return state.transactions.filter((tx) => {
      if (tx.isStartingBalance) return false;
      const dateStr = tx.dateTime.slice(0, 10);
      return dateStr >= startDateStr && dateStr <= endDateStr;
    });
  }, [state.transactions, startDateStr, endDateStr]);

  // Cash Flow Calculations adhering strictly to accounting rules
  const cashFlowMetrics = useMemo(() => {
    let incomeCentavos = 0;
    let expenseCentavos = 0;
    let creditRepaymentCentavos = 0;
    let loanRepaymentCentavos = 0;
    let billExpenseCentavos = 0;

    for (const tx of transactionsInPeriod) {
      const c = toCentavos(tx.amount);

      // Transfers between accounts:
      if (tx.type === 'transfer') {
        const destAcc = reconciledAccounts.find((a) => a.id === tx.destinationAccountId);
        if (destAcc?.category === 'Credit') {
          creditRepaymentCentavos += c;
        } else if (destAcc?.category === 'Loans') {
          loanRepaymentCentavos += c;
        }
        // Transfers between user's own wallets are neither income nor expense!
        continue;
      }

      if (tx.type === 'income') {
        incomeCentavos += c;
      } else if (tx.type === 'expense') {
        expenseCentavos += c;
        if (tx.category === 'Bills' || tx.merchantOrTitle?.toLowerCase().includes('bill')) {
          billExpenseCentavos += c;
        }
      } else if (tx.type === 'adjustment') {
        if (tx.adjustmentSign === 'negative') {
          expenseCentavos += c;
        } else {
          incomeCentavos += c;
        }
      }
    }

    const totalIncome = fromCentavos(incomeCentavos);
    const totalExpense = fromCentavos(expenseCentavos);
    const netCashFlow = subPHP(totalIncome, totalExpense);

    return {
      totalIncome,
      totalExpense,
      netCashFlow,
      monthlyBillExpenses: fromCentavos(billExpenseCentavos),
      creditRepayments: fromCentavos(creditRepaymentCentavos),
      loanRepayments: fromCentavos(loanRepaymentCentavos),
    };
  }, [transactionsInPeriod, reconciledAccounts]);

  // Spending by Category
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    let totalCentavos = 0;

    for (const tx of transactionsInPeriod) {
      if (tx.type !== 'expense' && !(tx.type === 'adjustment' && tx.adjustmentSign === 'negative')) {
        continue;
      }
      const c = toCentavos(tx.amount);
      totalCentavos += c;
      const cat = tx.category || 'Other';
      map.set(cat, (map.get(cat) || 0) + c);
    }

    const total = fromCentavos(totalCentavos);
    const items = Array.from(map.entries()).map(([category, centavos]) => {
      const amount = fromCentavos(centavos);
      const percent = total > 0 ? (amount / total) * 100 : 0;
      return { category, amount, percent };
    });

    items.sort((a, b) => b.amount - a.amount);
    return { items, total };
  }, [transactionsInPeriod]);

  // Top 5 spending categories
  const topCategories = useMemo(() => {
    return categoryBreakdown.items.slice(0, 5);
  }, [categoryBreakdown.items]);

  // Monthly Time Series for chart
  const timeSeriesBuckets = useMemo(() => {
    const bucketMap = new Map<
      string,
      { key: string; label: string; income: number; expense: number }
    >();

    for (const tx of transactionsInPeriod) {
      const d = new Date(tx.dateTime);
      if (Number.isNaN(d.getTime())) continue;

      let key: string;
      let label: string;

      if (rangePreset === 'this_month' || rangePreset === 'last_month') {
        // Group by day
        key = tx.dateTime.slice(0, 10);
        label = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
      } else {
        // Group by month
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        label = d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
      }

      const existing = bucketMap.get(key) || { key, label, income: 0, expense: 0 };
      if (tx.type === 'income' || (tx.type === 'adjustment' && tx.adjustmentSign !== 'negative')) {
        existing.income = addPHP(existing.income, tx.amount);
      } else if (tx.type === 'expense' || (tx.type === 'adjustment' && tx.adjustmentSign === 'negative')) {
        existing.expense = addPHP(existing.expense, tx.amount);
      }
      bucketMap.set(key, existing);
    }

    return Array.from(bucketMap.entries())
      .sort(([k1], [k2]) => k1.localeCompare(k2))
      .slice(-8)
      .map(([, val]) => val);
  }, [transactionsInPeriod, rangePreset]);

  const maxBucketValue = useMemo(() => {
    let max = 1;
    for (const b of timeSeriesBuckets) {
      if (b.income > max) max = b.income;
      if (b.expense > max) max = b.expense;
    }
    return max;
  }, [timeSeriesBuckets]);

  // Month-to-Month comparison: current month vs previous month
  const monthComparison = useMemo(() => {
    const curMonthKey = getMonthKey();
    const [y, m] = curMonthKey.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    let curIncome = 0;
    let curExpense = 0;
    let prevIncome = 0;
    let prevExpense = 0;

    for (const tx of state.transactions) {
      if (tx.isStartingBalance || tx.type === 'transfer') continue;
      const mKey = tx.dateTime.slice(0, 7);

      if (mKey === curMonthKey) {
        if (tx.type === 'income') curIncome = addPHP(curIncome, tx.amount);
        if (tx.type === 'expense') curExpense = addPHP(curExpense, tx.amount);
      } else if (mKey === prevMonthKey) {
        if (tx.type === 'income') prevIncome = addPHP(prevIncome, tx.amount);
        if (tx.type === 'expense') prevExpense = addPHP(prevExpense, tx.amount);
      }
    }

    const expenseDelta = subPHP(curExpense, prevExpense);
    const incomeDelta = subPHP(curIncome, prevIncome);

    return {
      curMonthKey,
      prevMonthKey,
      curIncome,
      curExpense,
      prevIncome,
      prevExpense,
      expenseDelta,
      incomeDelta,
    };
  }, [state.transactions]);

  // Budget vs Actual for the current selected month
  const activeMonthKey = rangePreset === 'last_month' ? monthComparison.prevMonthKey : getMonthKey();
  const budgetSummary = useMemo(() => {
    return calculateMonthlyBudgetSummary(activeMonthKey, state.budgets, state.transactions);
  }, [activeMonthKey, state.budgets, state.transactions]);

  // CSV Report Export Trigger (Offline Local)
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const res = await exportAnalyticsCSV({
        periodLabel,
        totalIncome: cashFlowMetrics.totalIncome,
        totalExpense: cashFlowMetrics.totalExpense,
        netCashFlow: cashFlowMetrics.netCashFlow,
        totalAssets: netWorthSummary.totalAssets,
        totalDebt: netWorthSummary.totalDebt,
        netWorth: netWorthSummary.netWorth,
        monthlyBillsPaid: cashFlowMetrics.monthlyBillExpenses,
        creditRepayments: cashFlowMetrics.creditRepayments,
        loanRepayments: cashFlowMetrics.loanRepayments,
        receivablesCollected: receivablesSummary.totalCollected,
        receivablesOutstanding: receivablesSummary.totalOutstanding,
        categoryBreakdown: categoryBreakdown.items,
        transactions: transactionsInPeriod,
      });
      showToast(res.message, res.ok ? 'success' : 'error');
    } catch (err) {
      showToast('Failed to export CSV report.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4 pb-12 w-full max-w-full min-w-0 overflow-hidden">
      {/* 1. Header & Date Range Filter Toolbar */}
      <div id="section-analytics" className="bg-white dark:bg-neutral-900 rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] space-y-3.5 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-black dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
              <span>Spending Analytics & Reports</span>
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Offline financial intelligence reconciled from your actual transactions
            </p>
          </div>

          {/* Export Report CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold flex items-center gap-1.5 shadow-xs hover:opacity-90 transition-opacity self-start sm:self-auto disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV Report'}</span>
          </button>
        </div>

        {/* Date Range Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {(
            [
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'last_3_months', label: 'Last 3 Mos' },
              { id: 'last_6_months', label: 'Last 6 Mos' },
              { id: 'this_year', label: 'This Year' },
              { id: 'all_time', label: 'All Time' },
              { id: 'custom', label: 'Custom Range' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setRangePreset(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                rangePreset === p.id
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/80 dark:hover:bg-neutral-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Start & End Date Pickers */}
        {rangePreset === 'custom' && (
          <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs text-black dark:text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs text-black dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Primary 9 Summary Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Total Income */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Total Income</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-[#2E9E6B] mt-1 truncate">
            {formatPeso(cashFlowMetrics.totalIncome, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Inflows ({periodLabel})
          </div>
        </div>

        {/* Total Expenses */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Total Expenses</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-[#DC2626] mt-1 truncate">
            {formatPeso(cashFlowMetrics.totalExpense, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Outflows ({periodLabel})
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Net Cash Flow</div>
          <div
            className={`text-base sm:text-lg font-bold tabular-nums mt-1 truncate ${
              cashFlowMetrics.netCashFlow >= 0 ? 'text-[#2E9E6B]' : 'text-[#DC2626]'
            }`}
          >
            {formatPeso(cashFlowMetrics.netCashFlow, { hide, showPlus: true })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Income minus expenses
          </div>
        </div>

        {/* Monthly Bills Expenses */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Monthly Bills Expenses</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-black dark:text-white mt-1 truncate">
            {formatPeso(cashFlowMetrics.monthlyBillExpenses, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Utilities & subscriptions
          </div>
        </div>

        {/* Credit Repayments */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Credit Repayments</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400 mt-1 truncate">
            {formatPeso(cashFlowMetrics.creditRepayments, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Paid towards cards
          </div>
        </div>

        {/* Loan Repayments */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Loan Repayments</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400 mt-1 truncate">
            {formatPeso(cashFlowMetrics.loanRepayments, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Principal & interest paid
          </div>
        </div>

        {/* Outstanding Credit & Loan Balances (Debt) */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Outstanding Total Debt</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-[#DC2626] mt-1 truncate">
            {formatPeso(netWorthSummary.totalDebt, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Credit ({formatPeso(netWorthSummary.creditTotal, { hide, compact: true })}) + Loans ({formatPeso(netWorthSummary.loansTotal, { hide, compact: true })})
          </div>
        </div>

        {/* Receivables Collected */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Receivables Collected</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-[#2E9E6B] mt-1 truncate">
            {formatPeso(receivablesSummary.totalCollected, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Repaid by debtors
          </div>
        </div>

        {/* Receivables Outstanding */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Receivables Outstanding</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400 mt-1 truncate">
            {formatPeso(receivablesSummary.totalOutstanding, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Money owed to you
          </div>
        </div>
      </div>

      {/* 3. Cash Flow Chart: Inflow vs Outflow */}
      <div id="section-cashflow" className="bg-white dark:bg-neutral-900 rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] space-y-3.5 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-black dark:text-white">
              Income vs. Expenses Trend
            </h2>
            <p className="text-xs text-neutral-500">
              Inflows vs Outflows in {periodLabel}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#2E9E6B] inline-block shrink-0" />
              Inflow
            </span>
            <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#DC2626] inline-block shrink-0" />
              Outflow
            </span>
          </div>
        </div>

        {timeSeriesBuckets.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400">
            No transactions found for this date range.
          </div>
        ) : (
          <div className="pt-2 w-full overflow-hidden">
            <div className="flex items-end justify-between gap-1 sm:gap-2 h-36 pt-4 px-1 sm:px-2 border-b border-neutral-100 dark:border-neutral-800">
              {timeSeriesBuckets.map((bucket, idx) => {
                const incHeight = Math.max(
                  bucket.income > 0 ? 8 : 2,
                  Math.round((bucket.income / maxBucketValue) * 110)
                );
                const expHeight = Math.max(
                  bucket.expense > 0 ? 8 : 2,
                  Math.round((bucket.expense / maxBucketValue) * 110)
                );
                return (
                  <div
                    key={`${bucket.label}_${idx}`}
                    className="flex-1 flex flex-col items-center justify-end h-full min-w-0"
                  >
                    <div className="flex items-end gap-1 sm:gap-1.5 h-28">
                      <div
                        className="w-2.5 sm:w-4 bg-[#2E9E6B] rounded-t-sm sm:rounded-t-md transition-all duration-300"
                        style={{ height: `${incHeight}px` }}
                        title={`Inflow: ${formatPeso(bucket.income, { hide })}`}
                      />
                      <div
                        className="w-2.5 sm:w-4 bg-[#DC2626] rounded-t-sm sm:rounded-t-md transition-all duration-300"
                        style={{ height: `${expHeight}px` }}
                        title={`Outflow: ${formatPeso(bucket.expense, { hide })}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between gap-1 sm:gap-2 pt-2 px-1 text-center">
              {timeSeriesBuckets.map((bucket, idx) => (
                <div
                  key={`lbl_${bucket.label}_${idx}`}
                  className="flex-1 text-[10px] sm:text-[11px] font-medium text-neutral-500 truncate"
                >
                  {bucket.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Spending Breakdown by Category & Top Categories */}
      <div id="section-breakdown" className="grid grid-cols-1 md:grid-cols-12 gap-3.5 scroll-mt-20">
        {/* Category Breakdown (md:col-span-7) */}
        <div className="md:col-span-7 bg-white dark:bg-neutral-900 rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-black dark:text-white">
                Spending Breakdown by Category
              </h2>
              <p className="text-xs text-neutral-500">
                Total spent: {formatPeso(categoryBreakdown.total, { hide })}
              </p>
            </div>
            <span className="text-xs font-bold text-neutral-400">
              {categoryBreakdown.items.length} categories
            </span>
          </div>

          {categoryBreakdown.items.length === 0 ? (
            <p className="text-xs text-neutral-400 py-6 text-center">
              No expenses recorded in this period.
            </p>
          ) : (
            <div className="space-y-2.5 pt-1">
              {categoryBreakdown.items.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-black dark:text-white">
                      {item.category}
                    </span>
                    <span className="font-bold tabular-nums text-black dark:text-white">
                      {formatPeso(item.amount, { hide })}
                      <span className="text-[11px] text-neutral-400 font-normal ml-1.5">
                        ({item.percent.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neutral-950 dark:bg-white rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, item.percent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top 5 Categories & Month Comparison (md:col-span-5) */}
        <div className="md:col-span-5 space-y-3.5">
          {/* Top Categories Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] space-y-3">
            <h3 className="text-sm font-bold text-black dark:text-white">
              Top Spending Categories
            </h3>
            {topCategories.length === 0 ? (
              <p className="text-xs text-neutral-400 py-2">No expenses recorded.</p>
            ) : (
              <div className="space-y-2">
                {topCategories.map((c, idx) => (
                  <div
                    key={c.category}
                    className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-black dark:text-white">
                        {c.category}
                      </span>
                    </div>
                    <span className="font-bold tabular-nums text-black dark:text-white">
                      {formatPeso(c.amount, { hide })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Month-to-Month Comparison Delta Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] space-y-2.5">
            <h3 className="text-sm font-bold text-black dark:text-white">
              Month-to-Month Comparison
            </h3>
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 space-y-2 text-xs">
              <div className="flex justify-between items-center text-neutral-500">
                <span>
                  Expenses ({formatMonthLabel(monthComparison.curMonthKey)} vs{' '}
                  {formatMonthLabel(monthComparison.prevMonthKey)}):
                </span>
                <span
                  className={`font-bold tabular-nums flex items-center gap-0.5 ${
                    monthComparison.expenseDelta <= 0
                      ? 'text-[#2E9E6B]'
                      : 'text-[#DC2626]'
                  }`}
                >
                  {monthComparison.expenseDelta <= 0 ? (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  )}
                  {formatPeso(Math.abs(monthComparison.expenseDelta), { hide })}
                </span>
              </div>

              <div className="flex justify-between items-center text-neutral-500">
                <span>Income Delta:</span>
                <span
                  className={`font-bold tabular-nums flex items-center gap-0.5 ${
                    monthComparison.incomeDelta >= 0
                      ? 'text-[#2E9E6B]'
                      : 'text-[#DC2626]'
                  }`}
                >
                  {formatPeso(monthComparison.incomeDelta, { hide, showPlus: true })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Budget vs Actual Spending Comparison */}
      <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-black dark:text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-neutral-500" />
              <span>Budget vs. Actual Spending ({formatMonthLabel(activeMonthKey)})</span>
            </h2>
            <p className="text-xs text-neutral-500">
              Total Budget: {formatPeso(budgetSummary.totalBudget, { hide })} • Spent:{' '}
              {formatPeso(budgetSummary.totalSpent, { hide })}
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              budgetSummary.overallStatus === 'exceeded'
                ? 'bg-red-500/10 text-[#DC2626]'
                : budgetSummary.overallStatus === 'warning'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 text-[#2E9E6B]'
            }`}
          >
            {budgetSummary.overallPercent.toFixed(0)}% utilized
          </span>
        </div>

        {budgetSummary.categoryBreakdown.length === 0 ? (
          <p className="text-xs text-neutral-400 py-3">
            No category limits configured for {formatMonthLabel(activeMonthKey)}. Go to Budgets tab to set up spending limits.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {budgetSummary.categoryBreakdown.map((cb) => (
              <div
                key={cb.category}
                className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1.5"
              >
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-black dark:text-white">
                    {cb.category}
                  </span>
                  <span className="tabular-nums text-neutral-600 dark:text-neutral-300">
                    {formatPeso(cb.spent, { hide })} / {formatPeso(cb.limit, { hide })}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      cb.status === 'exceeded'
                        ? 'bg-[#DC2626]'
                        : cb.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-[#2E9E6B]'
                    }`}
                    style={{ width: `${Math.min(100, cb.percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
