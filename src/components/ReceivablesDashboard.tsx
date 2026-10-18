import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  HandCoins,
  History,
  Layers,
  Plus,
  Search,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { ReceivableRecord, ReceivableStatus } from '../types/finance';
import {
  formatMonthLabel,
  formatPeso,
  formatShortDate,
  fromCentavos,
  getMonthKey,
  toCentavos,
} from '../utils/currency';
import {
  BorrowerSummary,
  getReceivableStatus,
  groupReceivablesByBorrower,
} from '../utils/financeEngine';
import { AddReceivableModal } from './AddReceivableModal';
import { ReceivableDetailModal } from './ReceivableDetailModal';
import { RecordReceivablePaymentModal } from './RecordReceivablePaymentModal';

interface ReceivablesDashboardProps {
  onBackToAccounts?: () => void;
}

type FilterStatus = 'All' | ReceivableStatus;
type ViewMode = 'records' | 'borrowers';

export const ReceivablesDashboard: React.FC<ReceivablesDashboardProps> = ({
  onBackToAccounts,
}) => {
  const { receivables, receivablesSummary, state } = useFinance();
  const hide = state.settings.hideBalances;

  const [viewMode, setViewMode] = useState<ViewMode>('records');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('All');
  const [sortBy, setSortBy] = useState<'due_soon' | 'highest' | 'name' | 'newest'>('due_soon');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [initialPersonName, setInitialPersonName] = useState<string>('');
  const [editingReceivable, setEditingReceivable] = useState<ReceivableRecord | null>(null);
  const [selectedReceivable, setSelectedReceivable] = useState<ReceivableRecord | null>(null);
  const [paymentModalReceivable, setPaymentModalReceivable] = useState<ReceivableRecord | null>(null);

  // Filtered and sorted lending records
  const filteredReceivables = useMemo(() => {
    return receivables
      .filter((rec) => {
        const status = getReceivableStatus(rec);
        if (statusFilter !== 'All' && status !== statusFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            rec.personName.toLowerCase().includes(q) ||
            (rec.notes || '').toLowerCase().includes(q) ||
            (rec.contactInfo || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'highest') {
          return b.remainingBalance - a.remainingBalance;
        }
        if (sortBy === 'name') {
          return a.personName.localeCompare(b.personName);
        }
        if (sortBy === 'newest') {
          return new Date(b.lentDate).getTime() - new Date(a.lentDate).getTime();
        }
        // 'due_soon' default: unpaid/overdue first, sorted by due date
        if (a.remainingBalance <= 0 && b.remainingBalance > 0) return 1;
        if (b.remainingBalance <= 0 && a.remainingBalance > 0) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [receivables, statusFilter, searchQuery, sortBy]);

  // Grouped by Borrower summaries (tracking total outstanding amount owed by each person)
  const borrowerSummaries: BorrowerSummary[] = useMemo(() => {
    const list = groupReceivablesByBorrower(receivables);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((b) => b.personName.toLowerCase().includes(q));
  }, [receivables, searchQuery]);

  // Monthly Collection Summary: groups expected and actual collections by month
  const monthlyCollectionData = useMemo(() => {
    const monthMap = new Map<
      string,
      { monthKey: string; expected: number; collected: number }
    >();

    // 1. Calculate expected collections by due month
    for (const r of receivables) {
      if (!r.dueDate) continue;
      const mk = r.dueDate.slice(0, 7); // YYYY-MM
      const current = monthMap.get(mk) || { monthKey: mk, expected: 0, collected: 0 };
      current.expected += toCentavos(r.totalExpected);
      monthMap.set(mk, current);
    }

    // 2. Calculate actual collections by payment date
    for (const r of receivables) {
      for (const p of r.payments) {
        if (!p.date) continue;
        const mk = p.date.slice(0, 7);
        const current = monthMap.get(mk) || { monthKey: mk, expected: 0, collected: 0 };
        current.collected += toCentavos(p.amount);
        monthMap.set(mk, current);
      }
    }

    const list = Array.from(monthMap.values()).map((item) => ({
      monthKey: item.monthKey,
      expected: fromCentavos(item.expected),
      collected: fromCentavos(item.collected),
    }));

    list.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    return list.slice(0, 6);
  }, [receivables]);

  // Find updated selected receivable if state changes
  const activeSelectedReceivable = useMemo(() => {
    if (!selectedReceivable) return null;
    return receivables.find((r) => r.id === selectedReceivable.id) || null;
  }, [selectedReceivable, receivables]);

  const handleOpenAdd = (namePrefill?: string) => {
    setEditingReceivable(null);
    setInitialPersonName(namePrefill || '');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (rec: ReceivableRecord) => {
    setSelectedReceivable(null);
    setEditingReceivable(rec);
    setIsAddOpen(true);
  };

  const handleOpenRecordPayment = (rec: ReceivableRecord) => {
    setPaymentModalReceivable(rec);
  };

  return (
    <div className="space-y-4 pb-12 w-full max-w-full min-w-0">
      {/* Top Banner / Summary Header */}
<<<<<<< HEAD
      <div className="bg-white dark:bg-[#15221B] rounded-[24px] p-4.5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] w-full max-w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-[#777D75] dark:text-[#8FA095]">
                Money Owed to Me
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#174F32]/10 dark:bg-[#83C95B]/20 text-[#174F32] dark:text-[#83C95B]">
                Receivables
              </span>
            </div>
            <div className="text-2xl sm:text-[32px] md:text-[36px] font-extrabold tracking-tight text-[#252923] dark:text-white tabular-nums mt-0.5">
              {formatPeso(receivablesSummary.totalOutstanding, { hide })}
            </div>
            <p className="text-[11px] sm:text-xs text-[#777D75] dark:text-[#8FA095] mt-1">
=======
      <div className="bg-white dark:bg-[#121318] rounded-[22px] sm:rounded-[24px] p-4.5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.08] w-full max-w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                Money Owed to Me
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#10B981]/15 text-[#10B981]">
                Receivables
              </span>
            </div>
            <div className="text-2xl sm:text-[32px] md:text-[36px] font-extrabold tracking-tight text-black dark:text-white tabular-nums mt-0.5">
              {formatPeso(receivablesSummary.totalOutstanding, { hide })}
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-1">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              Independent ledger of money lent to others with no lending limits & separate collection schedules
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAdd()}
<<<<<<< HEAD
            className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
=======
            className="self-start sm:self-center px-4 py-2.5 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs hover:opacity-90 transition-opacity shrink-0"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Lend Money</span>
          </button>
        </div>

        {/* 4 Stats Cards Grid */}
<<<<<<< HEAD
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4 pt-3.5 border-t border-[#E5E1D8] dark:border-[#223528] text-xs">
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C]">
            <div className="text-[#777D75] dark:text-[#8FA095] text-[11px]">Total Principal Lent</div>
            <div className="font-bold text-[#252923] dark:text-white tabular-nums mt-0.5 truncate">
=======
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4 pt-3.5 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-[#191A20] border border-black/[0.02] dark:border-white/5">
            <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">Total Principal Lent</div>
            <div className="font-bold text-black dark:text-white tabular-nums mt-0.5 truncate">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              {formatPeso(receivablesSummary.totalPrincipalLent, { hide, compact: true })}
            </div>
          </div>

<<<<<<< HEAD
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C]">
            <div className="text-[#777D75] dark:text-[#8FA095] text-[11px]">Amount Collected</div>
            <div className="font-bold text-[#16A34A] dark:text-[#83C95B] tabular-nums mt-0.5 truncate">
=======
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-[#191A20] border border-black/[0.02] dark:border-white/5">
            <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">Amount Collected</div>
            <div className="font-bold text-[#10B981] tabular-nums mt-0.5 truncate">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              {formatPeso(receivablesSummary.totalCollected, { hide, compact: true })}
            </div>
          </div>

<<<<<<< HEAD
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C]">
            <div className="text-[#777D75] dark:text-[#8FA095] text-[11px]">Overdue Amount</div>
=======
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-[#191A20] border border-black/[0.02] dark:border-white/5">
            <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">Overdue Amount</div>
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
            <div className="font-bold text-[#DC2626] tabular-nums mt-0.5 truncate">
              {formatPeso(receivablesSummary.overdueAmount, { hide, compact: true })}
              {receivablesSummary.overdueCount > 0 && ` (${receivablesSummary.overdueCount})`}
            </div>
          </div>

<<<<<<< HEAD
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C]">
            <div className="text-[#777D75] dark:text-[#8FA095] text-[11px]">People Owing Me</div>
            <div className="font-bold text-[#252923] dark:text-white tabular-nums mt-0.5 truncate">
=======
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-[#191A20] border border-black/[0.02] dark:border-white/5">
            <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">People Owing Me</div>
            <div className="font-bold text-black dark:text-white tabular-nums mt-0.5 truncate">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              {receivablesSummary.debtorsCount} {receivablesSummary.debtorsCount === 1 ? 'person' : 'people'}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Collection Summary Card */}
      {monthlyCollectionData.length > 0 && (
<<<<<<< HEAD
        <div className="bg-white dark:bg-[#15221B] rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#174F32] dark:text-[#83C95B]" />
              <h3 className="text-xs sm:text-sm font-bold text-[#252923] dark:text-white">
                Monthly Collection Summary
              </h3>
            </div>
            <span className="text-[11px] text-[#777D75] dark:text-[#8FA095]">
=======
        <div className="bg-white dark:bg-[#121318] rounded-[22px] sm:rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#10B981]" />
              <h3 className="text-xs sm:text-sm font-bold text-black dark:text-white">
                Monthly Collection Summary
              </h3>
            </div>
            <span className="text-[11px] text-neutral-400">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              Expected vs Actual Collected
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 text-xs">
            {monthlyCollectionData.map((item) => {
              const percent =
                item.expected > 0
                  ? Math.min(100, Math.round((item.collected / item.expected) * 100))
                  : item.collected > 0
                  ? 100
                  : 0;

              return (
                <div
                  key={item.monthKey}
<<<<<<< HEAD
                  className="p-2.5 sm:p-3 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] flex flex-col justify-between space-y-1.5"
                >
                  <div className="font-bold text-[#252923] dark:text-white text-[11px] sm:text-xs">
                    {formatMonthLabel(item.monthKey)}
                  </div>
                  <div className="space-y-0.5 tabular-nums text-[11px]">
                    <div className="text-[#777D75] dark:text-[#8FA095]">
                      Exp: <span className="text-[#252923] dark:text-white font-medium">{formatPeso(item.expected, { compact: true })}</span>
                    </div>
                    <div className="text-[#16A34A] dark:text-[#83C95B] font-bold">
                      Col: {formatPeso(item.collected, { compact: true })} ({percent}%)
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-[#E8E4DA] dark:bg-[#1E2E23] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        percent >= 100 ? 'bg-[#4E9D39]' : 'bg-blue-500'
=======
                  className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-[#191A20] border border-black/[0.02] dark:border-white/5 flex flex-col justify-between space-y-1.5"
                >
                  <div className="font-bold text-black dark:text-white text-[11px] sm:text-xs">
                    {formatMonthLabel(item.monthKey)}
                  </div>
                  <div className="space-y-0.5 tabular-nums text-[11px]">
                    <div className="text-neutral-500">
                      Exp: <span className="text-black dark:text-white font-medium">{formatPeso(item.expected, { compact: true })}</span>
                    </div>
                    <div className="text-[#10B981] font-bold">
                      Col: {formatPeso(item.collected, { compact: true })} ({percent}%)
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        percent >= 100 ? 'bg-[#10B981]' : 'bg-blue-500'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View Switcher: Individual Loans vs By Borrower */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
<<<<<<< HEAD
        <div className="inline-flex items-center p-1 rounded-2xl bg-[#E8E4DA] dark:bg-[#16241C] shadow-2xs self-start text-xs font-bold">
=======
        <div className="inline-flex items-center p-1 rounded-2xl bg-white dark:bg-[#191A20] border border-black/[0.04] dark:border-white/[0.08] shadow-2xs self-start text-xs font-bold">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          <button
            type="button"
            onClick={() => setViewMode('records')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              viewMode === 'records'
<<<<<<< HEAD
                ? 'bg-[#174F32] text-white shadow-xs'
                : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
=======
                ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                : 'text-neutral-500 hover:text-black dark:hover:text-white'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
            }`}
          >
            Lending Records ({receivables.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('borrowers')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              viewMode === 'borrowers'
<<<<<<< HEAD
                ? 'bg-[#174F32] text-white shadow-xs'
                : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
=======
                ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                : 'text-neutral-500 hover:text-black dark:hover:text-white'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>By Borrower ({borrowerSummaries.length})</span>
          </button>
        </div>

        {/* Status Filter Chips for Records view */}
        {viewMode === 'records' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {(['All', 'unpaid', 'partially_paid', 'overdue', 'fully_paid'] as const).map(
              (tab) => {
                const active = statusFilter === tab;
                const label =
                  tab === 'All'
                    ? 'All Records'
                    : tab === 'unpaid'
                    ? 'Unpaid'
                    : tab === 'partially_paid'
                    ? 'Partially'
                    : tab === 'overdue'
                    ? 'Overdue'
                    : 'Fully Paid';

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                        : 'bg-white dark:bg-[#191A20] border border-neutral-200/80 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* Search & Sort Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by borrower name, contact, notes..."
            className="w-full pl-9 pr-4 py-2.5 sm:py-3 rounded-2xl bg-white dark:bg-[#191A20] border border-neutral-200/80 dark:border-white/[0.08] text-xs sm:text-sm text-black dark:text-white placeholder:text-neutral-400 shadow-[0_2px_10px_rgba(0,0,0,0.02)] focus:outline-none focus:ring-1 focus:ring-[#10B981]"
          />
        </div>

        {viewMode === 'records' && (
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as 'due_soon' | 'highest' | 'name' | 'newest'
              )
            }
            aria-label="Sort lending records"
            className="px-3 py-2.5 sm:py-3 rounded-2xl bg-white dark:bg-[#191A20] border border-neutral-200/80 dark:border-white/[0.08] text-xs sm:text-sm text-black dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-[#10B981] shrink-0"
          >
            <option value="due_soon">Due Soonest</option>
            <option value="highest">Highest Balance</option>
            <option value="name">Borrower Name (A-Z)</option>
            <option value="newest">Lent Date (Newest)</option>
          </select>
        )}
      </div>

      {/* VIEW 1: BY BORROWER (Grouped Portfolios with total outstanding owed by each person) */}
      {viewMode === 'borrowers' && (
        <div className="space-y-3">
          {borrowerSummaries.length === 0 ? (
<<<<<<< HEAD
            <div className="bg-white dark:bg-[#15221B] rounded-[24px] p-6 sm:p-8 text-center space-y-3 border border-[#E5E1D8] dark:border-[#223528]">
              <Users className="w-10 h-10 text-[#777D75] dark:text-[#8FA095] mx-auto stroke-[1.5]" />
              <p className="text-xs sm:text-sm text-[#777D75] dark:text-[#8FA095]">
=======
            <div className="bg-white dark:bg-[#121318] rounded-[22px] sm:rounded-[24px] p-6 sm:p-8 text-center space-y-3 border border-black/[0.04] dark:border-white/[0.08]">
              <Users className="w-10 h-10 text-neutral-400 mx-auto stroke-[1.5]" />
              <p className="text-xs sm:text-sm text-neutral-500">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                No borrowers recorded yet. Record money you lent to someone to start tracking.
              </p>
              <button
                type="button"
                onClick={() => handleOpenAdd()}
<<<<<<< HEAD
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold transition-colors shadow-xs"
=======
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#10B981] text-black text-xs font-bold shadow-xs"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Lend Money</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {borrowerSummaries.map((b) => {
                const progress =
                  b.totalExpected > 0
                    ? Math.min(100, Math.round((b.totalCollected / b.totalExpected) * 100))
                    : 0;

                return (
                  <div
                    key={b.personName}
<<<<<<< HEAD
                    className="bg-white dark:bg-[#15221B] rounded-[22px] p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] flex flex-col justify-between space-y-3.5"
=======
                    className="bg-white dark:bg-[#191A20] rounded-[22px] p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.08] flex flex-col justify-between space-y-3.5"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                  >
                    <div>
                      {/* Borrower Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
<<<<<<< HEAD
                          <div className="w-9 h-9 rounded-full bg-[#174F32] text-[#83C95B] flex items-center justify-center font-extrabold text-xs shrink-0">
                            {b.personName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-[#252923] dark:text-white text-sm sm:text-base truncate">
                              {b.personName}
                            </h4>
                            <div className="text-[11px] text-[#777D75] dark:text-[#8FA095] mt-0.5">
=======
                          <div className="w-9 h-9 rounded-full bg-[#10B981] text-black flex items-center justify-center font-extrabold text-xs shrink-0">
                            {b.personName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-black dark:text-white text-sm sm:text-base truncate">
                              {b.personName}
                            </h4>
                            <div className="text-[11px] text-neutral-400 mt-0.5">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                              {b.recordsCount} lending transaction{b.recordsCount > 1 ? 's' : ''} · {b.activeCount} active
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenAdd(b.personName)}
<<<<<<< HEAD
                          className="px-2.5 py-1 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] hover:bg-[#EFECE3] text-xs font-bold text-[#174F32] dark:text-[#83C95B] transition-colors shrink-0 flex items-center gap-1 border border-[#E5E1D8] dark:border-[#243A2C]"
                        >
                          <Plus className="w-3.5 h-3.5" />
=======
                          className="px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold text-black dark:text-white transition-colors shrink-0 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#10B981]" />
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                          <span>Lend More</span>
                        </button>
                      </div>

                      {/* Total Outstanding for this Person */}
<<<<<<< HEAD
                      <div className="mt-3 p-3 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-[#777D75] dark:text-[#8FA095]">
=======
                      <div className="mt-3 p-3 rounded-xl bg-[#F6F5F8] dark:bg-[#14151B] border border-black/[0.02] dark:border-white/5 flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                            Total Outstanding Owed
                          </div>
                          <div
                            className={`text-lg sm:text-xl font-extrabold tabular-nums ${
                              b.remainingBalance > 0
                                ? 'text-[#DC2626]'
<<<<<<< HEAD
                                : 'text-[#16A34A] dark:text-[#83C95B]'
=======
                                : 'text-[#10B981]'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                            }`}
                          >
                            {formatPeso(b.remainingBalance, { hide })}
                          </div>
                        </div>

                        <div className="text-right text-[11px]">
                          <div className="text-neutral-400">Collected</div>
                          <div className="font-bold text-[#10B981] tabular-nums">
                            {formatPeso(b.totalCollected, { hide })} ({progress}%)
                          </div>
                        </div>
                      </div>

                      {/* Independent Loans List for this Person */}
                      <div className="space-y-1.5 mt-3">
                        <div className="text-[11px] font-semibold text-neutral-400">
                          Independent Loans ({b.records.length}):
                        </div>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                          {b.records.map((r, idx) => (
                            <div
                              key={r.id}
                              onClick={() => setSelectedReceivable(r)}
                              className="p-2 rounded-xl bg-white dark:bg-[#202128] border border-black/[0.03] dark:border-white/5 hover:border-[#10B981]/50 flex items-center justify-between text-xs cursor-pointer transition-colors"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="font-semibold text-black dark:text-white truncate">
                                  Loan #{idx + 1}: {formatPeso(r.principal)}
                                  {r.termMonths ? ` · ${r.termMonths} mo` : ''}
                                </div>
                                <div className="text-[10px] text-neutral-400">
                                  Lent {formatShortDate(r.lentDate)} · Due {formatShortDate(r.dueDate)}
                                </div>
                              </div>
                              <div className="text-right shrink-0 flex items-center gap-2">
                                <div>
                                  <div className="font-bold tabular-nums text-black dark:text-white">
                                    {formatPeso(r.remainingBalance)}
                                  </div>
                                  <div className="text-[10px] text-neutral-400">
                                    {r.remainingBalance <= 0 ? 'Settled' : 'Owed'}
                                  </div>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: INDIVIDUAL LENDING RECORDS */}
      {viewMode === 'records' && (
        <>
          {filteredReceivables.length === 0 ? (
            <div className="bg-white dark:bg-[#121318] rounded-[22px] sm:rounded-[24px] p-6 sm:p-8 text-center space-y-3 border border-black/[0.04] dark:border-white/[0.08]">
              <HandCoins className="w-10 h-10 text-neutral-400 mx-auto stroke-[1.5]" />
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                {receivables.length === 0
                  ? 'No lending records added yet. Record money you lent to friends, family, or colleagues.'
                  : 'No lending records match the selected filters.'}
              </p>
              <button
                type="button"
                onClick={() => handleOpenAdd()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Lend Money</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredReceivables.map((rec) => {
                const status = getReceivableStatus(rec);
                const progress =
                  rec.totalExpected > 0
                    ? Math.min(
                        100,
                        Math.round((rec.totalCollected / rec.totalExpected) * 100)
                      )
                    : 0;

                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedReceivable(rec)}
                    className="bg-white dark:bg-[#191A20] rounded-[20px] sm:rounded-[22px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.08] flex flex-col justify-between hover:border-[#10B981]/50 transition-all cursor-pointer group"
                  >
                    <div>
                      {/* Borrower Name & Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-full bg-[#10B981] text-black flex items-center justify-center font-bold text-xs shrink-0">
                            {rec.personName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-black dark:text-white text-sm truncate">
                            {rec.personName}
                          </span>
                        </div>

                        {status === 'fully_paid' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981]">
                            Fully Paid
                          </span>
                        ) : status === 'overdue' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DC2626]/15 text-[#DC2626]">
                            Overdue
                          </span>
                        ) : status === 'partially_paid' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
                            Partially Paid
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
                            Unpaid
                          </span>
                        )}
                      </div>

                      {/* Remaining Amount */}
                      <div className="mt-3">
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
                          <span>Remaining Balance</span>
                          {rec.termMonths && (
                            <span className="text-neutral-400">{rec.termMonths} mo term</span>
                          )}
                        </div>
                        <div
                          className={`text-xl sm:text-2xl font-extrabold tabular-nums tracking-tight ${
                            rec.remainingBalance > 0
                              ? 'text-[#DC2626]'
                              : 'text-[#10B981]'
                          }`}
                        >
                          {formatPeso(rec.remainingBalance, { hide })}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2.5 space-y-1">
                        <div className="flex justify-between text-[10px] text-neutral-400 tabular-nums">
                          <span>Collected: {formatPeso(rec.totalCollected, { hide, compact: true })}</span>
                          <span>Total: {formatPeso(rec.totalExpected, { hide, compact: true })}</span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              status === 'fully_paid' ? 'bg-[#10B981]' : 'bg-[#10B981]'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Dates & Quick Payment button */}
                    <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between gap-2 text-[11px]">
                      <div className="text-neutral-500 dark:text-neutral-400 truncate min-w-0 flex-1">
                        <div>
                          Due: <strong className="text-black dark:text-white font-medium">{formatShortDate(rec.dueDate)}</strong>
                          {rec.monthlyCollectionEstimate && rec.monthlyCollectionEstimate > 0 && (
                            <span className="text-[10px] ml-1.5 text-neutral-400">({formatPeso(rec.monthlyCollectionEstimate)}/mo)</span>
                          )}
                        </div>
                        {rec.scheduleStartDate && rec.scheduleStartDate !== rec.lentDate && (
                          <div className="text-[10px] text-neutral-400 truncate">
                            Starts {formatShortDate(rec.scheduleStartDate)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {rec.remainingBalance > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRecordPayment(rec);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#10B981] text-black font-bold hover:bg-[#05DF72] transition-colors"
                          >
                            + Pay
                          </button>
                        )}
                        <span className="text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add / Edit Receivable Modal */}
      <AddReceivableModal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setInitialPersonName('');
        }}
        editingReceivable={editingReceivable}
        initialPersonName={initialPersonName}
      />

      {/* Receivable Details & Payment History Modal */}
      <ReceivableDetailModal
        receivable={activeSelectedReceivable}
        isOpen={!!activeSelectedReceivable}
        onClose={() => setSelectedReceivable(null)}
        onOpenRecordPayment={(r) => {
          setSelectedReceivable(null);
          handleOpenRecordPayment(r);
        }}
        onOpenEdit={handleOpenEdit}
        onOpenAddForPerson={(pName) => {
          setSelectedReceivable(null);
          handleOpenAdd(pName);
        }}
        onSelectReceivable={(rec) => {
          setSelectedReceivable(rec);
        }}
      />

      {/* Record Repayment Modal */}
      <RecordReceivablePaymentModal
        isOpen={!!paymentModalReceivable}
        onClose={() => setPaymentModalReceivable(null)}
        receivable={paymentModalReceivable}
      />
    </div>
  );
};
