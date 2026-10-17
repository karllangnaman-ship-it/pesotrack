import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Filter,
  Flame,
  Plus,
  Search,
  Sparkles,
  Wifi,
  Zap,
} from 'lucide-react';
import { AddBillModal } from '../components/AddBillModal';
import { BillDetailModal } from '../components/BillDetailModal';
import { RecordBillPaymentModal } from '../components/RecordBillPaymentModal';
import { useFinance } from '../context/FinanceContext';
import { BillCategory, BillDefinition, BillStatus, MonthlyBillEntry } from '../types/finance';
import {
  formatMonthLabel,
  formatPeso,
  getMonthKey,
} from '../utils/currency';

interface MonthlyBillsPageProps {
  onOpenCalendar?: () => void;
  onOpenDebtPlanner?: () => void;
}

export const MonthlyBillsPage: React.FC<MonthlyBillsPageProps> = ({
  onOpenCalendar,
  onOpenDebtPlanner,
}) => {
  const { bills, monthlyBillEntries, state } = useFinance();
  const hide = state.settings.hideBalances;

  // Selected Month State
  const [currentMonthKey, setCurrentMonthKey] = useState<string>(getMonthKey());
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partially_paid' | 'paid' | 'overdue'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
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

  // High-level Monthly Metrics
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

    return {
      totalBilled,
      totalPaid,
      totalRemaining,
      overdueCount,
      overdueAmount,
      totalBillsCount: monthBillsData.length,
      paidCount: monthBillsData.filter((i) => i.status === 'paid').length,
    };
  }, [monthBillsData]);

  // Filtered List
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

  return (
    <div className="space-y-4 pb-12 w-full max-w-full min-w-0 overflow-hidden">
      {/* 1. Header Toolbar with Month Navigator & Add Bill */}
      <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-black dark:text-white">
            Monthly Bills & Utilities
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Fixed and variable expenses tracked offline with local reminders
          </p>
        </div>

        {/* Month Navigator Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-[#EFECEF] dark:bg-neutral-800 rounded-full p-1 border border-black/[0.04] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleTodayMonth}
              className="px-2.5 py-1 text-xs font-bold text-black dark:text-white hover:opacity-80 transition-opacity"
            >
              {formatMonthLabel(currentMonthKey)}
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAddBillOpen(true)}
            className="px-3.5 py-2 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold flex items-center gap-1.5 shadow-xs hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Bill</span>
          </button>
        </div>
      </div>

      {/* 2. Monthly Summary Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] sm:text-xs text-neutral-500 truncate">
            Total Billed ({formatMonthLabel(currentMonthKey)})
          </div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-black dark:text-white mt-1">
            {formatPeso(summaryMetrics.totalBilled, { hide })}
          </div>
          <div className="text-[10px] sm:text-[11px] text-neutral-400 mt-0.5">
            {summaryMetrics.totalBillsCount} active bills
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] sm:text-xs text-neutral-500 truncate">
            Total Paid
          </div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-[#2E9E6B] mt-1">
            {formatPeso(summaryMetrics.totalPaid, { hide })}
          </div>
          <div className="text-[10px] sm:text-[11px] text-neutral-400 mt-0.5">
            {summaryMetrics.paidCount} of {summaryMetrics.totalBillsCount} fully paid
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] sm:text-xs text-neutral-500 truncate">
            Remaining to Pay
          </div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-[#DC2626] mt-1">
            {formatPeso(summaryMetrics.totalRemaining, { hide })}
          </div>
          <div className="text-[10px] sm:text-[11px] text-neutral-400 mt-0.5">
            Balance due
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] sm:text-xs text-neutral-500 truncate">
            Overdue Obligations
          </div>
          <div
            className={`text-base sm:text-lg font-bold tabular-nums mt-1 ${
              summaryMetrics.overdueCount > 0 ? 'text-[#DC2626]' : 'text-neutral-400'
            }`}
          >
            {summaryMetrics.overdueCount > 0
              ? formatPeso(summaryMetrics.overdueAmount, { hide })
              : 'None'}
          </div>
          <div className="text-[10px] sm:text-[11px] text-neutral-400 mt-0.5">
            {summaryMetrics.overdueCount} bills past due date
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bills by name or category..."
              className="w-full pl-9 pr-3.5 py-2 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-xs sm:text-sm text-black dark:text-white focus:outline-hidden"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
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
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === st.id
                    ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                    : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Bills Cards List */}
      {filteredBills.length === 0 ? (
        <div className="p-8 text-center rounded-[24px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] space-y-3">
          <p className="text-xs sm:text-sm text-neutral-500">
            No bills match your active filters for {formatMonthLabel(currentMonthKey)}.
          </p>
          <button
            type="button"
            onClick={() => setIsAddBillOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold"
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
                className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] flex flex-col justify-between space-y-3.5 hover:border-black/10 dark:hover:border-white/10 transition-colors"
              >
                {/* Top Row: Category icon, Name & Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white flex items-center justify-center shrink-0">
                      {item.bill.category === 'Electricity' ? (
                        <Zap className="w-4 h-4 text-amber-500" />
                      ) : item.bill.category === 'Wi-Fi / Internet' ? (
                        <Wifi className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Calendar className="w-4 h-4 text-neutral-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-black dark:text-white truncate">
                          {item.displayName}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 uppercase tracking-wider">
                          {item.bill.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-400" />
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
                        ? 'bg-emerald-500/10 text-[#2E9E6B]'
                        : item.status === 'overdue'
                        ? 'bg-red-500/10 text-[#DC2626]'
                        : item.status === 'partially_paid'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
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
                    <span className="text-neutral-500">
                      Billed:{' '}
                      <strong className="text-black dark:text-white tabular-nums">
                        {formatPeso(item.billedAmount, { hide })}
                      </strong>
                    </span>
                    <span className="text-xs tabular-nums text-neutral-500">
                      Paid:{' '}
                      <strong className="text-[#2E9E6B]">
                        {formatPeso(item.totalPaid, { hide })}
                      </strong>
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.status === 'paid'
                          ? 'bg-[#2E9E6B]'
                          : item.status === 'overdue'
                          ? 'bg-[#DC2626]'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${percentPaid}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] pt-0.5">
                    <span className="text-neutral-400">
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
                <div className="flex items-center gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setSelectedBillForDetail(item.bill)}
                    className="flex-1 py-2 rounded-full border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-center"
                  >
                    View Details
                  </button>

                  {item.remaining > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedBillForPayment(item.bill)}
                      className="flex-1 py-2 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {isAddBillOpen && (
        <AddBillModal
          isOpen={isAddBillOpen}
          onClose={() => setIsAddBillOpen(false)}
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
