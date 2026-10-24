import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Filter,
  Flame,
  HandCoins,
  Plus,
  Receipt,
  Repeat,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  Wallet,
  Wifi,
  Zap,
} from 'lucide-react';
import { AddBillModal } from '../components/AddBillModal';
import { AddRecurringIncomeModal } from '../components/AddRecurringIncomeModal';
import { BillDetailModal } from '../components/BillDetailModal';
import { RecordBillPaymentModal } from '../components/RecordBillPaymentModal';
import { RecordRecurringPaymentModal } from '../components/RecordRecurringPaymentModal';
import { useFinance } from '../context/FinanceContext';
import {
  BillCategory,
  BillDefinition,
  BillStatus,
  MonthlyBillEntry,
  RecurringTransaction,
} from '../types/finance';
import {
  formatMonthLabel,
  formatPeso,
  getMonthKey,
  roundPHP,
} from '../utils/currency';

interface MonthlyBillsPageProps {
  onOpenCalendar?: () => void;
  onOpenDebtPlanner?: () => void;
}

export const MonthlyBillsPage: React.FC<MonthlyBillsPageProps> = ({
  onOpenCalendar,
  onOpenDebtPlanner,
}) => {
  const {
    bills,
    monthlyBillEntries,
    state,
    reconciledAccounts,
    deleteRecurringTransaction,
    revertBillPayment,
    revertSalaryDeposit,
    showToast,
  } = useFinance();
  const hide = state.settings.hideBalances;

  // Selected Month State
  const [currentMonthKey, setCurrentMonthKey] = useState<string>(getMonthKey());
  const [mainView, setMainView] = useState<'all' | 'bills' | 'salary'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partially_paid' | 'paid' | 'overdue'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [isAddSalaryOpen, setIsAddSalaryOpen] = useState(false);
  const [editingRecurringItem, setEditingRecurringItem] = useState<RecurringTransaction | null>(null);
  const [depositingRecurringItem, setDepositingRecurringItem] = useState<RecurringTransaction | null>(null);
  const [selectedBillForDetail, setSelectedBillForDetail] = useState<BillDefinition | null>(null);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<BillDefinition | null>(null);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = currentMonthKey.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    const ny = d.getFullYear();
    const nm = String(d.getMonth() + 1).padStart(2, '0');
    setCurrentMonthKey(`${ny}-${nm}`);
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonthKey.split('-').map(Number);
    const d = new Date(y, m, 1);
    const ny = d.getFullYear();
    const nm = String(d.getMonth() + 1).padStart(2, '0');
    setCurrentMonthKey(`${ny}-${nm}`);
  };

  const handleTodayMonth = () => {
    setCurrentMonthKey(getMonthKey());
  };

  // Compute month bills instances
  const monthBillsData = useMemo(() => {
    const [targetYear, targetMonth] = currentMonthKey.split('-').map(Number);
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);

    return bills
      .filter((bill) => {
        if (bill.startMonth > currentMonthKey) return false;
        if (bill.endMonth && bill.endMonth < currentMonthKey) return false;

        // Check frequency
        if (bill.frequency === 'quarterly') {
          const [sy, sm] = bill.startMonth.split('-').map(Number);
          const diff = (targetYear - sy) * 12 + (targetMonth - sm);
          if (diff % 3 !== 0) return false;
        } else if (bill.frequency === 'bimonthly') {
          const [sy, sm] = bill.startMonth.split('-').map(Number);
          const diff = (targetYear - sy) * 12 + (targetMonth - sm);
          if (diff % 2 !== 0) return false;
        } else if (bill.frequency === 'annually') {
          const [, sm] = bill.startMonth.split('-').map(Number);
          if (targetMonth !== sm) return false;
        }
        return true;
      })
      .map((bill) => {
        const entryKey = `${bill.id}_${currentMonthKey}`;
        const entry: MonthlyBillEntry | undefined = monthlyBillEntries[entryKey];

        const dueDay = entry?.dueDay ?? bill.dueDay;
        const validDueDay = Math.min(Math.max(1, dueDay), daysInMonth);
        const dueDateStr = `${currentMonthKey}-${String(validDueDay).padStart(2, '0')}`;

        const billedAmount = entry?.actualAmount ?? bill.defaultAmount;
        const totalPaid = entry?.isPaidManually
          ? billedAmount
          : (entry?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0);

        const remaining = Math.max(0, billedAmount - totalPaid);
        const isPast = dueDateStr < todayStr;

        let status: BillStatus = 'unpaid';
        if (totalPaid >= billedAmount && billedAmount > 0) {
          status = 'paid';
        } else if (totalPaid > 0) {
          status = isPast ? 'overdue' : 'partially_paid';
        } else {
          status = isPast ? 'overdue' : 'unpaid';
        }

        const displayName =
          bill.category === 'Other' && bill.customCategoryName
            ? bill.customCategoryName
            : bill.name;

        return {
          bill,
          entry,
          displayName,
          dueDateStr,
          dueDay: validDueDay,
          billedAmount,
          totalPaid,
          remaining,
          status,
          paymentsCount: entry?.payments?.length || 0,
        };
      });
  }, [bills, monthlyBillEntries, currentMonthKey]);

  // Compute recurring salaries & receivables
  const recurringSalariesData = useMemo(() => {
    const allRecurring = state.recurringTransactions || [];
    const incomes = allRecurring.filter((r) => r.type === 'income' && (r.isActive ?? true));
    const [targetYear, targetMonth] = currentMonthKey.split('-').map(Number);
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    return incomes.map((rec) => {
      const targetAcc = reconciledAccounts.find((a) => a.id === rec.accountId);

      // Estimate occurrences and total expected for currentMonthKey
      let occurrencesInMonth = 1;
      let frequencyLabel = 'Monthly';

      if (rec.frequency === 'weekly') {
        occurrencesInMonth = 4; // approximately 4-5 weeks in a month
        frequencyLabel = 'Weekly';
      } else if (rec.frequency === 'biweekly') {
        occurrencesInMonth = 2;
        frequencyLabel = 'Bi-Weekly (Every 2 wks)';
      } else if (rec.frequency === 'semimonthly') {
        occurrencesInMonth = 2;
        frequencyLabel = '15th & 30th (Semi-monthly)';
      } else if (rec.frequency === 'monthly') {
        occurrencesInMonth = 1;
        frequencyLabel = 'Monthly';
      } else if (rec.frequency === 'daily') {
        occurrencesInMonth = daysInMonth;
        frequencyLabel = 'Daily';
      }

      const totalExpectedThisMonth = roundPHP(rec.amount * occurrencesInMonth);

      // Check how much has been recorded as deposit/income this month
      const matchingTxs = state.transactions.filter((t) => {
        if (!t.dateTime.startsWith(currentMonthKey) || t.type !== 'income') return false;
        const matchesName =
          t.merchantOrTitle?.toLowerCase().trim() === rec.name.toLowerCase().trim() ||
          (t.notes && t.notes.toLowerCase().includes(rec.name.toLowerCase()));
        const matchesCategory =
          t.category?.toLowerCase().trim() === rec.category.toLowerCase().trim();
        return matchesName || (matchesCategory && Math.abs(t.amount - rec.amount) < 0.01);
      });

      const totalReceivedThisMonth = roundPHP(
        matchingTxs.reduce((sum, t) => sum + t.amount, 0)
      );

      const isFullyReceived = totalReceivedThisMonth >= totalExpectedThisMonth && totalExpectedThisMonth > 0;
      const remainingExpected = Math.max(0, totalExpectedThisMonth - totalReceivedThisMonth);

      return {
        rec,
        targetAcc,
        frequencyLabel,
        occurrencesInMonth,
        totalExpectedThisMonth,
        totalReceivedThisMonth,
        isFullyReceived,
        remainingExpected,
        recordedCount: matchingTxs.length,
      };
    });
  }, [state.recurringTransactions, state.transactions, reconciledAccounts, currentMonthKey]);

  // High-level Monthly Metrics (Bills & Salaries)
  const summaryMetrics = useMemo(() => {
    let totalBilled = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    for (const item of monthBillsData) {
      totalBilled += item.billedAmount;
      totalPaid += item.totalPaid;
      totalRemaining += item.remaining;
      if (item.status === 'overdue') {
        overdueCount++;
        overdueAmount += item.remaining;
      }
    }

    let totalExpectedSalary = 0;
    let totalReceivedSalary = 0;

    for (const sal of recurringSalariesData) {
      totalExpectedSalary += sal.totalExpectedThisMonth;
      totalReceivedSalary += sal.totalReceivedThisMonth;
    }

    const projectedNet = totalExpectedSalary - totalBilled;

    return {
      totalBilled: roundPHP(totalBilled),
      totalPaid: roundPHP(totalPaid),
      totalRemaining: roundPHP(totalRemaining),
      overdueCount,
      overdueAmount: roundPHP(overdueAmount),
      totalBillsCount: monthBillsData.length,
      paidCount: monthBillsData.filter((i) => i.status === 'paid').length,
      totalExpectedSalary: roundPHP(totalExpectedSalary),
      totalReceivedSalary: roundPHP(totalReceivedSalary),
      incomeStreamsCount: recurringSalariesData.length,
      projectedNet: roundPHP(projectedNet),
    };
  }, [monthBillsData, recurringSalariesData]);

  // Filtered Bills List
  const filteredBills = useMemo(() => {
    return monthBillsData.filter((item) => {
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      // Category filter
      if (categoryFilter !== 'all' && item.bill.category !== categoryFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.displayName.toLowerCase().includes(q);
        const matchesCat = item.bill.category.toLowerCase().includes(q);
        if (!matchesName && !matchesCat) return false;
      }
      return true;
    });
  }, [monthBillsData, statusFilter, categoryFilter, searchQuery]);

  // Filtered Salaries List
  const filteredSalaries = useMemo(() => {
    if (!searchQuery.trim()) return recurringSalariesData;
    const q = searchQuery.toLowerCase();
    return recurringSalariesData.filter((item) => {
      return (
        item.rec.name.toLowerCase().includes(q) ||
        item.rec.category.toLowerCase().includes(q) ||
        (item.targetAcc?.name || '').toLowerCase().includes(q)
      );
    });
  }, [recurringSalariesData, searchQuery]);

  return (
    <div className="space-y-4 pb-12 w-full max-w-full min-w-0 overflow-hidden">
      {/* 1. Header Toolbar with Month Navigator & Dual Add Actions */}
      <div className="bg-white dark:bg-[#15221B] rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-[#252923] dark:text-white tracking-tight flex items-center gap-2">
            <span>Monthly Bills & Salary</span>
          </h1>
          <p className="text-xs text-[#777D75] dark:text-[#8FA095] mt-0.5">
            Fixed and variable expenses, recurring salary, and weekly/monthly receivables
          </p>
        </div>

        {/* Controls: Month Switcher & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          {/* Month Navigator Controls */}
          <div className="flex items-center bg-[#E8E4DA] dark:bg-[#16241C] rounded-2xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-white dark:hover:bg-[#1E2E23] text-[#61685D] dark:text-[#9EA59B] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleTodayMonth}
              className="px-2.5 py-1 text-xs font-extrabold text-[#252923] dark:text-white hover:opacity-80 transition-opacity"
            >
              {formatMonthLabel(currentMonthKey)}
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-white dark:hover:bg-[#1E2E23] text-[#61685D] dark:text-[#9EA59B] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Add Salary / Receivable Button */}
          <button
            type="button"
            onClick={() => {
              setEditingRecurringItem(null);
              setIsAddSalaryOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <HandCoins className="w-3.5 h-3.5 stroke-[2.3]" />
            <span>+ Add Salary</span>
          </button>

          {/* Add Bill Button */}
          <button
            type="button"
            onClick={() => setIsAddBillOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Add Bill</span>
          </button>
        </div>
      </div>

      {/* 2. Monthly Summary Cards Grid (Bills, Salaries, and Net Projected) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Card 1: Total Bills */}
        <div className="p-3.5 sm:p-4 rounded-[22px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] sm:text-xs font-semibold text-[#777D75] dark:text-[#8FA095] truncate flex items-center justify-between">
            <span>Total Bills</span>
            <Receipt className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="text-base sm:text-lg font-black tabular-nums text-[#252923] dark:text-white mt-1">
            {formatPeso(summaryMetrics.totalBilled, { hide })}
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#777D75] dark:text-[#8FA095] mt-0.5 truncate">
            {summaryMetrics.totalBillsCount} active bills ({summaryMetrics.paidCount} paid)
          </div>
        </div>

        {/* Card 2: Expected Salary & Incomes */}
        <div className="p-3.5 sm:p-4 rounded-[22px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] sm:text-xs font-semibold text-[#777D75] dark:text-[#8FA095] truncate flex items-center justify-between">
            <span>Expected Salary</span>
            <HandCoins className="w-3.5 h-3.5 text-emerald-600 dark:text-[#83C95B]" />
          </div>
          <div className="text-base sm:text-lg font-black tabular-nums text-[#16A34A] dark:text-[#83C95B] mt-1">
            {formatPeso(summaryMetrics.totalExpectedSalary, { hide })}
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#777D75] dark:text-[#8FA095] mt-0.5 truncate">
            {summaryMetrics.incomeStreamsCount} scheduled income stream{summaryMetrics.incomeStreamsCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Card 3: Remaining Bills to Pay */}
        <div className="p-3.5 sm:p-4 rounded-[22px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] sm:text-xs font-semibold text-[#777D75] dark:text-[#8FA095] truncate">
            Remaining Bills
          </div>
          <div className="text-base sm:text-lg font-black tabular-nums text-[#DC2626] mt-1">
            {formatPeso(summaryMetrics.totalRemaining, { hide })}
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#777D75] dark:text-[#8FA095] mt-0.5 truncate">
            {summaryMetrics.overdueCount > 0
              ? `${summaryMetrics.overdueCount} bills past due`
              : 'All up to date'}
          </div>
        </div>

        {/* Card 4: Net Cashflow */}
        <div className="p-3.5 sm:p-4 rounded-[22px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] sm:text-xs font-semibold text-[#777D75] dark:text-[#8FA095] truncate">
            Projected Net
          </div>
          <div
            className={`text-base sm:text-lg font-black tabular-nums mt-1 ${
              summaryMetrics.projectedNet >= 0
                ? 'text-[#16A34A] dark:text-[#83C95B]'
                : 'text-[#DC2626]'
            }`}
          >
            {formatPeso(summaryMetrics.projectedNet, { hide })}
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#777D75] dark:text-[#8FA095] mt-0.5 truncate">
            Salary minus Bills
          </div>
        </div>
      </div>

      {/* 3. Segmented View Switcher: All, Bills & Utilities, Salary & Receivables */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Main View Toggle */}
        <div className="bg-[#E8E4DA] dark:bg-[#16241C] p-1 rounded-2xl flex items-center gap-1 shadow-2xs self-start sm:self-auto">
          {(
            [
              { id: 'all', label: 'All Obligations & Incomes' },
              { id: 'bills', label: `Bills (${monthBillsData.length})` },
              { id: 'salary', label: `Salary & Receivables (${recurringSalariesData.length})` },
            ] as const
          ).map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => setMainView(view.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                mainView === view.id
                  ? 'bg-[#174F32] text-white shadow-2xs'
                  : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777D75] dark:text-[#8FA095]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bills, salary, or receivables..."
            className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] text-xs font-semibold text-[#252923] dark:text-white placeholder:text-[#777D75] focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION A: RECURRING SALARY & RECEIVABLES                     */}
      {/* ============================================================== */}
      {(mainView === 'all' || mainView === 'salary') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HandCoins className="w-4 h-4 text-emerald-600 dark:text-[#83C95B]" />
              <h2 className="text-sm font-black text-[#252923] dark:text-white tracking-tight">
                Recurring Salary & Income Streams
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingRecurringItem(null);
                setIsAddSalaryOpen(true);
              }}
              className="text-xs font-bold text-emerald-600 dark:text-[#83C95B] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Income / Salary</span>
            </button>
          </div>

          {filteredSalaries.length === 0 ? (
            <div className="p-6 text-center rounded-[24px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] space-y-2">
              <p className="text-xs font-medium text-[#777D75] dark:text-[#8FA095]">
                No recurring salary or receivables configured yet.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingRecurringItem(null);
                  setIsAddSalaryOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Your Salary (Weekly or Monthly)</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredSalaries.map((sal) => (
                <div
                  key={sal.rec.id}
                  className="bg-white dark:bg-[#15221B] rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] flex flex-col justify-between space-y-3.5 hover:border-emerald-500/40 transition-colors"
                >
                  {/* Top: Name, Frequency Badge & Target Wallet */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-[#16A34A] dark:text-[#83C95B] flex items-center justify-center shrink-0">
                        <HandCoins className="w-5 h-5 stroke-[2.3]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-[#252923] dark:text-white truncate">
                            {sal.rec.name}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-[#16A34A] dark:text-[#83C95B] uppercase tracking-wider">
                            {sal.frequencyLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#777D75] dark:text-[#8FA095] mt-0.5 flex items-center gap-1">
                          <Wallet className="w-3 h-3 text-[#777D75]" />
                          <span>Receiving into: </span>
                          <strong className="text-[#252923] dark:text-neutral-200">
                            {sal.targetAcc?.name || 'Asset Account'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Received status badge */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider shrink-0 ${
                        sal.isFullyReceived
                          ? 'bg-emerald-500/15 text-[#16A34A] dark:text-[#83C95B]'
                          : sal.totalReceivedThisMonth > 0
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-[#E8E4DA] dark:bg-[#1E2E23] text-[#61685D] dark:text-[#9EA59B]'
                      }`}
                    >
                      {sal.isFullyReceived
                        ? 'Deposited'
                        : sal.totalReceivedThisMonth > 0
                        ? 'Partially Received'
                        : 'Scheduled'}
                    </span>
                  </div>

                  {/* Amounts Row */}
                  <div className="p-3 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-[#777D75] dark:text-[#8FA095]">
                        Base Amount:
                      </span>
                      <span className="font-extrabold text-[#252923] dark:text-white tabular-nums text-sm">
                        {formatPeso(sal.rec.amount, { hide })}{' '}
                        <span className="text-[10px] font-medium text-[#777D75]">
                          / {sal.rec.frequency}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-[#777D75] dark:text-[#8FA095]">
                        Expected this Month ({formatMonthLabel(currentMonthKey)}):
                      </span>
                      <span className="font-black text-emerald-600 dark:text-[#83C95B] tabular-nums text-sm">
                        {formatPeso(sal.totalExpectedThisMonth, { hide })}
                      </span>
                    </div>

                    {sal.totalReceivedThisMonth > 0 && (
                      <div className="flex items-baseline justify-between text-xs pt-1 border-t border-[#E5E1D8]/60 dark:border-[#243A2C]/60">
                        <span className="text-[#777D75] dark:text-[#8FA095]">
                          Already Received:
                        </span>
                        <span className="font-bold text-[#16A34A] dark:text-[#83C95B] tabular-nums">
                          {formatPeso(sal.totalReceivedThisMonth, { hide })} ({sal.recordedCount} payout{sal.recordedCount > 1 ? 's' : ''})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[#E5E1D8] dark:border-[#223528] flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRecurringItem(sal.rec);
                        setIsAddSalaryOpen(true);
                      }}
                      className="flex-1 py-2 rounded-xl border border-[#E5E1D8] dark:border-[#243A2C] text-xs font-bold text-[#252923] dark:text-white hover:bg-[#F6F4EE] dark:hover:bg-[#1A2A20] transition-colors text-center min-w-[95px]"
                    >
                      Edit Schedule
                    </button>

                    <button
                      type="button"
                      onClick={() => setDepositingRecurringItem(sal.rec)}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1 min-w-[115px]"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Record Deposit</span>
                    </button>

                    {sal.totalReceivedThisMonth > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Undo recorded deposit for "${sal.rec.name}" for ${formatMonthLabel(
                                currentMonthKey
                              )}? This will mark it as unsettled and deduct the deposit from your receiving account.`
                            )
                          ) {
                            revertSalaryDeposit(sal.rec.id, currentMonthKey);
                          }
                        }}
                        className="py-2 px-3 rounded-xl border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1 shrink-0"
                        title="Bawiin deposit / Ibalik sa unsettled"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Undo Deposit</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION B: MONTHLY BILLS & UTILITIES                          */}
      {/* ============================================================== */}
      {(mainView === 'all' || mainView === 'bills') && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#174F32] dark:text-[#83C95B]" />
              <h2 className="text-sm font-black text-[#252923] dark:text-white tracking-tight">
                Monthly Bills & Obligations
              </h2>
            </div>

            {/* Status Filter Buttons */}
            <div className="bg-[#E8E4DA] dark:bg-[#16241C] p-1 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar shadow-2xs self-start sm:self-auto">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'unpaid', label: 'Unpaid' },
                  { id: 'partially_paid', label: 'Partially Paid' },
                  { id: 'paid', label: 'Paid' },
                  { id: 'overdue', label: 'Overdue' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    statusFilter === st.id
                      ? 'bg-[#174F32] text-white shadow-2xs'
                      : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bills Cards List */}
          {filteredBills.length === 0 ? (
            <div className="p-8 text-center rounded-[24px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] space-y-3">
              <p className="text-xs sm:text-sm text-[#777D75] dark:text-[#8FA095]">
                No bills match your active filters for {formatMonthLabel(currentMonthKey)}.
              </p>
              <button
                type="button"
                onClick={() => setIsAddBillOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Bill for this Month</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredBills.map((item) => {
                const percentPaid =
                  item.billedAmount > 0
                    ? Math.min(100, Math.max(0, (item.totalPaid / item.billedAmount) * 100))
                    : 0;

                return (
                  <div
                    key={item.bill.id}
                    className="bg-white dark:bg-[#15221B] rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] flex flex-col justify-between space-y-3.5 hover:border-[#174F32]/30 dark:hover:border-[#83C95B]/30 transition-colors"
                  >
                    {/* Top Row: Category icon, Name & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] text-[#174F32] dark:text-[#83C95B] border border-[#E5E1D8] dark:border-[#243A2C] flex items-center justify-center shrink-0">
                          {item.bill.category === 'Electricity' ? (
                            <Zap className="w-4 h-4 text-amber-500" />
                          ) : item.bill.category === 'Wi-Fi / Internet' ? (
                            <Wifi className="w-4 h-4 text-emerald-600 dark:text-[#83C95B]" />
                          ) : (
                            <Receipt className="w-4 h-4 text-[#174F32] dark:text-[#83C95B]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-[#252923] dark:text-white truncate">
                              {item.displayName}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#F6F4EE] dark:bg-[#1A2A20] text-[#61685D] dark:text-[#9EA59B] border border-[#E5E1D8] dark:border-[#243A2C] uppercase tracking-wider">
                              {item.bill.type}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#777D75] dark:text-[#8FA095] mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#777D75]" />
                            <span>
                              Due on {item.dueDateStr} (Day {item.dueDay})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider shrink-0 ${
                          item.status === 'paid'
                            ? 'bg-emerald-500/15 text-[#16A34A] dark:text-[#83C95B]'
                            : item.status === 'overdue'
                            ? 'bg-red-500/15 text-[#DC2626]'
                            : item.status === 'partially_paid'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-[#E8E4DA] dark:bg-[#1E2E23] text-[#61685D] dark:text-[#9EA59B]'
                        }`}
                      >
                        {item.status === 'paid'
                          ? 'Paid'
                          : item.status === 'overdue'
                          ? 'Overdue'
                          : item.status === 'partially_paid'
                          ? 'Partially Paid'
                          : 'Unpaid'}
                      </span>
                    </div>

                    {/* Amount Details */}
                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-[#777D75] dark:text-[#8FA095]">
                          Billed:{' '}
                          <strong className="text-[#252923] dark:text-white tabular-nums">
                            {formatPeso(item.billedAmount, { hide })}
                          </strong>
                        </span>
                        <span className="text-xs tabular-nums text-[#777D75] dark:text-[#8FA095]">
                          Paid:{' '}
                          <strong className="text-[#16A34A] dark:text-[#83C95B]">
                            {formatPeso(item.totalPaid, { hide })}
                          </strong>
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-[#E8E4DA] dark:bg-[#1E2E23] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.status === 'paid'
                              ? 'bg-[#174F32] dark:bg-[#83C95B]'
                              : item.status === 'overdue'
                              ? 'bg-[#DC2626]'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${percentPaid}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[11px] pt-0.5">
                        <span className="text-[#777D75] dark:text-[#8FA095]">
                          {item.paymentsCount > 0
                            ? `${item.paymentsCount} recorded payment${item.paymentsCount > 1 ? 's' : ''}`
                            : 'No payments recorded'}
                        </span>
                        <span className="font-bold tabular-nums text-[#DC2626]">
                          {item.remaining > 0
                            ? `₱${item.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} remaining`
                            : 'Settled'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-[#E5E1D8] dark:border-[#223528] flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSelectedBillForDetail(item.bill)}
                        className="flex-1 py-2 rounded-xl border border-[#E5E1D8] dark:border-[#243A2C] text-xs font-bold text-[#252923] dark:text-white hover:bg-[#F6F4EE] dark:hover:bg-[#1A2A20] transition-colors text-center min-w-[90px]"
                      >
                        View Details
                      </button>

                      {item.remaining > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedBillForPayment(item.bill)}
                          className="flex-1 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1 min-w-[110px]"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Record Payment</span>
                        </button>
                      )}

                      {(item.totalPaid > 0 || item.status === 'paid') && (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Undo payment for "${item.displayName}" for ${formatMonthLabel(
                                  currentMonthKey
                                )}? This will revert this bill to unsettled and restore your wallet balance.`
                              )
                            ) {
                              revertBillPayment(item.bill.id, currentMonthKey);
                            }
                          }}
                          className="py-2 px-3 rounded-xl border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1 shrink-0"
                          title="Bawiin payment / Ibalik sa unsettled"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Undo / Unsettle</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {isAddBillOpen && (
        <AddBillModal
          isOpen={isAddBillOpen}
          onClose={() => setIsAddBillOpen(false)}
        />
      )}

      {isAddSalaryOpen && (
        <AddRecurringIncomeModal
          isOpen={isAddSalaryOpen}
          onClose={() => {
            setIsAddSalaryOpen(false);
            setEditingRecurringItem(null);
          }}
          editingItem={editingRecurringItem}
        />
      )}

      {depositingRecurringItem && (
        <RecordRecurringPaymentModal
          isOpen={!!depositingRecurringItem}
          onClose={() => setDepositingRecurringItem(null)}
          recurring={depositingRecurringItem}
          monthKey={currentMonthKey}
          dueDate={depositingRecurringItem.nextDueDate || `${currentMonthKey}-30`}
          amount={depositingRecurringItem.amount}
          status="unpaid"
          isCollection={true}
        />
      )}

      {selectedBillForDetail && (
        <BillDetailModal
          isOpen={!!selectedBillForDetail}
          onClose={() => setSelectedBillForDetail(null)}
          bill={selectedBillForDetail}
          monthKey={currentMonthKey}
          entry={monthlyBillEntries[`${selectedBillForDetail.id}_${currentMonthKey}`]}
        />
      )}

      {selectedBillForPayment && (
        <RecordBillPaymentModal
          isOpen={!!selectedBillForPayment}
          onClose={() => setSelectedBillForPayment(null)}
          bill={selectedBillForPayment}
          monthKey={currentMonthKey}
          entry={monthlyBillEntries[`${selectedBillForPayment.id}_${currentMonthKey}`]}
        />
      )}
    </div>
  );
};
