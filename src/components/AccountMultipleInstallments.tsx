import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  CreditCard,
  Edit3,
  History,
  Plus,
  Receipt,
  Sliders,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  CreditPurchaseOrDrawdown,
  InterestRateType,
} from '../types/finance';
import { formatPeso, roundPHP, subPHP } from '../utils/currency';
import { ReconciledAccount } from '../utils/financeEngine';
import {
  addMonthsToDate,
  COMMON_REPAYMENT_TERMS,
  formatFriendlyDate,
  generateMonthlyRepaymentSummary,
  getUpcomingMultiPaymentInfo,
  MonthlyRepaymentSummaryMonth,
} from '../utils/loanCalculations';

interface AccountMultipleInstallmentsProps {
  account: ReconciledAccount;
  hide: boolean;
}

export const AccountMultipleInstallments: React.FC<
  AccountMultipleInstallmentsProps
> = ({ account, hide }) => {
  const {
    addAccountPurchase,
    updateAccountPurchase,
    deleteAccountPurchase,
    recordPurchasePayment,
    recordBatchAccountPayment,
    reconciledAccounts,
  } = useFinance();

  const isCredit = account.category === 'Credit';
  const isLoan = account.category === 'Loans';

  const purchases: CreditPurchaseOrDrawdown[] = useMemo(() => {
    if (isCredit) {
      return account.creditInfo?.purchases || [];
    }
    if (isLoan) {
      return account.loanInfo?.drawdowns || [];
    }
    return [];
  }, [account, isCredit, isLoan]);

  // Totals across all purchases
  const totalPrincipal = useMemo(
    () => purchases.reduce((sum, p) => sum + (p.principal || 0), 0),
    [purchases]
  );
  const totalRepayment = useMemo(
    () => purchases.reduce((sum, p) => sum + (p.totalRepayment || 0), 0),
    [purchases]
  );
  const totalPaid = useMemo(
    () => purchases.reduce((sum, p) => sum + (p.totalPaid || 0), 0),
    [purchases]
  );
  const totalRemaining = useMemo(
    () => purchases.reduce((sum, p) => sum + (p.remainingBalance || 0), 0),
    [purchases]
  );

  // Account Limit & Utilization (For Credit or Loans)
  const accountLimit = isCredit
    ? account.creditInfo?.creditLimit || 0
    : account.loanInfo?.creditLimit || account.loanInfo?.originalPrincipal || 0;
  const usedLimit = totalRemaining;
  const availableLimit = Math.max(0, subPHP(accountLimit, usedLimit));
  const limitUtilization =
    accountLimit > 0
      ? Math.min(100, Math.max(0, (usedLimit / accountLimit) * 100))
      : 0;

  // Next payment info
  const upcomingInfo = useMemo(
    () => getUpcomingMultiPaymentInfo(purchases),
    [purchases]
  );

  // Aggregated calendar schedule
  const monthlySummary = useMemo(
    () => generateMonthlyRepaymentSummary(purchases),
    [purchases]
  );

  // UI state
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [isMonthlySummaryOpen, setIsMonthlySummaryOpen] = useState(true);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');
  const [expandedMonthKeys, setExpandedMonthKeys] = useState<Record<string, boolean>>(
    {}
  );

  // Auto-select the current/first pending month for the selected month summary
  React.useEffect(() => {
    if (monthlySummary.length > 0) {
      if (!selectedMonthKey || !monthlySummary.some((m) => m.monthKey === selectedMonthKey)) {
        const firstPending = monthlySummary.find((m) => !m.isFullyPaid);
        setSelectedMonthKey(firstPending ? firstPending.monthKey : monthlySummary[0].monthKey);
      }
    }
  }, [monthlySummary, selectedMonthKey]);

  const currentSelectedMonth = useMemo(() => {
    if (!monthlySummary.length) return null;
    return monthlySummary.find((m) => m.monthKey === selectedMonthKey) || monthlySummary[0];
  }, [monthlySummary, selectedMonthKey]);

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] =
    useState<CreditPurchaseOrDrawdown | null>(null);

  const [paymentTargetPurchase, setPaymentTargetPurchase] =
    useState<CreditPurchaseOrDrawdown | null>(null);

  const [historyTargetPurchase, setHistoryTargetPurchase] =
    useState<CreditPurchaseOrDrawdown | null>(null);

  const [isGeneralPaymentModalOpen, setIsGeneralPaymentModalOpen] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredPurchases = useMemo(() => {
    if (filter === 'active') {
      return purchases.filter((p) => p.status === 'active' && p.remainingBalance > 0);
    }
    if (filter === 'completed') {
      return purchases.filter((p) => p.status === 'completed' || p.remainingBalance <= 0);
    }
    return purchases;
  }, [purchases, filter]);

  const toggleMonthExpansion = (monthKey: string) => {
    setExpandedMonthKeys((prev) => ({
      ...prev,
      [monthKey]: !prev[monthKey],
    }));
  };

  const handleOpenAdd = () => {
    setEditingPurchase(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (p: CreditPurchaseOrDrawdown) => {
    setEditingPurchase(p);
    setIsAddEditModalOpen(true);
  };

  const handleConfirmDelete = (purchaseId: string) => {
    deleteAccountPurchase(account.id, purchaseId);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP METRICS DASHBOARD */}
      <div className="bg-white dark:bg-neutral-800 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 space-y-3.5 shadow-2xs border border-black/[0.03] dark:border-white/[0.04]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#2E9E6B] shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-black dark:text-white">
              {isCredit ? 'Credit Portfolio Summary' : 'Loan Borrowings Summary'}
            </h3>
          </div>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium tabular-nums">
            {upcomingInfo.totalActiveCount} Active · {upcomingInfo.totalCompletedCount} Paid Off
          </div>
        </div>

        {/* Primary KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] sm:text-xs">
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.03] dark:border-white/[0.04]">
            <div className="text-neutral-500 dark:text-neutral-400 text-[10px]">
              Total Borrowed / Purchases
            </div>
            <div className="text-sm sm:text-base font-extrabold text-black dark:text-white tabular-nums mt-0.5 truncate">
              {formatPeso(totalPrincipal, { hide })}
            </div>
            <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
              Original principal
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.03] dark:border-white/[0.04]">
            <div className="text-neutral-500 dark:text-neutral-400 text-[10px]">
              Total Repayment
            </div>
            <div className="text-sm sm:text-base font-extrabold text-black dark:text-white tabular-nums mt-0.5 truncate">
              {formatPeso(totalRepayment, { hide })}
            </div>
            <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
              Principal + agreed terms
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.03] dark:border-white/[0.04]">
            <div className="text-neutral-500 dark:text-neutral-400 text-[10px]">
              Total Paid
            </div>
            <div className="text-sm sm:text-base font-extrabold text-[#2E9E6B] tabular-nums mt-0.5 truncate">
              {formatPeso(totalPaid, { hide })}
            </div>
            <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
              {totalRepayment > 0
                ? `${((totalPaid / totalRepayment) * 100).toFixed(0)}% paid`
                : 'No debt'}
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.03] dark:border-white/[0.04]">
            <div className="text-neutral-500 dark:text-neutral-400 text-[10px]">
              Remaining Balance
            </div>
            <div className="text-sm sm:text-base font-extrabold text-black dark:text-white tabular-nums mt-0.5 truncate">
              {formatPeso(totalRemaining, { hide })}
            </div>
            <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
              Current combined debt
            </div>
          </div>
        </div>

        {/* Credit / Loan Limit & Next Payment Strip */}
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {accountLimit > 0 && (
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  {isCredit ? 'Account Credit Limit' : 'Approved Loan Limit'}
                </div>
                <div className="font-bold text-black dark:text-white tabular-nums">
                  {formatPeso(accountLimit, { hide })}
                </div>
                <div className="text-[10px] text-neutral-400">
                  Used: {formatPeso(usedLimit, { hide })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  Available Limit
                </div>
                <div className="font-extrabold text-[#2E9E6B] tabular-nums">
                  {formatPeso(availableLimit, { hide })}
                  <span className="text-[10px] text-neutral-400 font-normal ml-1">
                    ({limitUtilization.toFixed(0)}% used)
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                Next Monthly Due
              </div>
              <div className="font-extrabold text-black dark:text-white tabular-nums">
                {formatPeso(upcomingInfo.nextMonthlyAmount, { hide })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                Next Due Date
              </div>
              <div className="font-bold text-black dark:text-white">
                {upcomingInfo.nextPaymentDate}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Add Transaction & General Account Payment */}
        <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="py-2.5 px-3 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>
              {isCredit ? 'Add Transaction (Purchase)' : 'Add Transaction (Borrowing)'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsGeneralPaymentModalOpen(true)}
            disabled={upcomingInfo.totalActiveCount === 0 || totalRemaining <= 0}
            className="py-2.5 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
          >
            <Coins className="w-4 h-4 text-[#2E9E6B]" />
            <span>General Account Payment</span>
          </button>
        </div>
      </div>

      {/* 2. MONTHLY REPAYMENT SUMMARY (COMBINED MONTH VIEW & TIMELINE) */}
      <div className="bg-white dark:bg-neutral-800 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 space-y-3.5 shadow-2xs border border-black/[0.03] dark:border-white/[0.04]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-700 dark:text-neutral-300 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-black dark:text-white">
              Monthly Repayment Summary
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsMonthlySummaryOpen(!isMonthlySummaryOpen)}
            className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
          >
            <span>{monthlySummary.length} Months Scheduled</span>
            {isMonthlySummaryOpen ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>
        </div>

        {isMonthlySummaryOpen && (
          <div className="space-y-3 pt-1">
            {monthlySummary.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
                No active repayment schedules. Add a transaction to view monthly summary.
              </div>
            ) : (
              <>
                {/* Month Selector Pills */}
                <div>
                  <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Select Month to View Combined Summary:
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {monthlySummary.map((m) => {
                      const isSelected = (currentSelectedMonth?.monthKey === m.monthKey);
                      return (
                        <button
                          key={m.monthKey}
                          type="button"
                          onClick={() => setSelectedMonthKey(m.monthKey)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                            isSelected
                              ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 shadow-xs'
                              : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <span>{m.monthLabel}</span>
                          {m.isFullyPaid && (
                            <span className="ml-1 text-[10px] text-[#2E9E6B]">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* FEATURED: COMBINED MONTHLY SUMMARY CARD FOR SELECTED MONTH */}
                {currentSelectedMonth && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200/90 dark:border-neutral-700/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          Selected Month Summary
                        </div>
                        <div className="text-sm sm:text-base font-extrabold text-black dark:text-white">
                          {currentSelectedMonth.monthLabel}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-neutral-400">
                          Combined Total Due
                        </div>
                        <div className="text-base sm:text-lg font-black text-black dark:text-white tabular-nums">
                          {formatPeso(currentSelectedMonth.totalDue, { hide })}
                        </div>
                      </div>
                    </div>

                    {/* Individual Installment Details for All Transactions in this Selected Month */}
                    <div className="space-y-1.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
                      <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                        Individual Installment Details ({currentSelectedMonth.items.length}{' '}
                        transaction{currentSelectedMonth.items.length === 1 ? '' : 's'} due):
                      </div>
                      {currentSelectedMonth.items.map((it, idx) => (
                        <div
                          key={`${it.purchaseId}_${idx}`}
                          className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-black/[0.03] dark:border-white/[0.04]"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="font-bold text-black dark:text-white truncate">
                              {it.purchaseName}
                            </div>
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              Installment {it.installmentIndex} of {it.totalInstallments} · Due{' '}
                              <strong className="text-neutral-700 dark:text-neutral-300 font-semibold">
                                {formatFriendlyDate(it.dueDate)}
                              </strong>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-extrabold text-black dark:text-white tabular-nums">
                              {formatPeso(it.amountDue, { hide })}
                            </div>
                            <div className="text-[10px] font-semibold">
                              {it.isPaid ? (
                                <span className="text-[#2E9E6B] flex items-center justify-end gap-0.5">
                                  <CheckCircle2 className="w-3 h-3" /> Settled
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400">Pending</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collapsible Multi-Month Calendar Timeline */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                    Full Repayment Timeline:
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-0.5">
                    {monthlySummary.map((m) => {
                      const isExpanded = !!expandedMonthKeys[m.monthKey];
                      const isCurrent = m.monthKey === currentSelectedMonth?.monthKey;
                      return (
                        <div
                          key={m.monthKey}
                          className={`rounded-xl border transition-colors overflow-hidden ${
                            isCurrent
                              ? 'border-neutral-400 dark:border-neutral-500 bg-[#F5F4F8] dark:bg-neutral-900'
                              : 'border-neutral-200/80 dark:border-neutral-700/80 bg-[#F9F8FA] dark:bg-neutral-900/70'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMonthKey(m.monthKey);
                              toggleMonthExpansion(m.monthKey);
                            }}
                            className="w-full p-2.5 sm:p-3 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-bold text-black dark:text-white">
                                {m.monthLabel}
                              </span>
                              {m.isFullyPaid ? (
                                <span className="text-[10px] text-[#2E9E6B] font-semibold flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Paid</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-neutral-500">
                                  {m.items.length} payment{m.items.length === 1 ? '' : 's'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <span className="text-xs sm:text-sm font-extrabold text-black dark:text-white tabular-nums">
                                  {formatPeso(m.totalDue, { hide })}
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                              )}
                            </div>
                          </button>

                          {/* Expandable Breakdown of Individual Payments */}
                          {isExpanded && (
                            <div className="px-3 pb-3 pt-1 border-t border-black/[0.04] dark:border-white/[0.06] space-y-1.5 bg-white/60 dark:bg-neutral-900/90">
                              {m.items.map((it, idx) => (
                                <div
                                  key={`${it.purchaseId}_${idx}`}
                                  className="flex items-center justify-between text-[11px] py-1 border-b border-black/[0.02] dark:border-white/[0.02] last:border-0"
                                >
                                  <div className="min-w-0 flex-1 pr-2">
                                    <div className="font-semibold text-black dark:text-white truncate">
                                      {it.purchaseName}
                                    </div>
                                    <div className="text-[10px] text-neutral-400">
                                      Installment {it.installmentIndex} of {it.totalInstallments} · Due{' '}
                                      {formatFriendlyDate(it.dueDate)}
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="font-bold text-black dark:text-white tabular-nums">
                                      {formatPeso(it.amountDue, { hide })}
                                    </div>
                                    <div className="text-[10px]">
                                      {it.isPaid ? (
                                        <span className="text-[#2E9E6B] font-semibold">Settled</span>
                                      ) : (
                                        <span className="text-neutral-500">Pending</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 3. PURCHASES & BORROWINGS LIST */}
      <div className="bg-white dark:bg-neutral-800 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 space-y-3.5 shadow-2xs border border-black/[0.03] dark:border-white/[0.04]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-neutral-700 dark:text-neutral-300 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-black dark:text-white">
              {isCredit ? 'Credit Purchases & Installments' : 'Loan Borrowings & Drawdowns'}
            </h3>
          </div>

          {/* Segmented Filter Buttons */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-900 self-start sm:self-auto text-xs">
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                filter === 'active'
                  ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-black dark:hover:text-white'
              }`}
            >
              Active ({upcomingInfo.totalActiveCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                filter === 'completed'
                  ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-black dark:hover:text-white'
              }`}
            >
              Paid Off ({upcomingInfo.totalCompletedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                filter === 'all'
                  ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-black dark:hover:text-white'
              }`}
            >
              All ({purchases.length})
            </button>
          </div>
        </div>

        {/* List of Cards */}
        <div className="space-y-3 pt-1">
          {filteredPurchases.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <div className="text-xs text-neutral-400 dark:text-neutral-500">
                {filter === 'active'
                  ? 'No active purchases in this account.'
                  : filter === 'completed'
                  ? 'No completed purchases yet.'
                  : 'No purchases or borrowings recorded yet.'}
              </div>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-3.5 py-1.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First {isCredit ? 'Purchase' : 'Borrowing'}</span>
              </button>
            </div>
          ) : (
            filteredPurchases.map((p) => {
              const totalRepay = p.totalRepayment > 0 ? p.totalRepayment : p.principal;
              const paid = p.totalPaid || 0;
              const remaining = p.remainingBalance;
              const progress =
                totalRepay > 0 ? Math.min(100, Math.max(0, (paid / totalRepay) * 100)) : 0;
              const isCompleted = p.status === 'completed' || remaining <= 0;

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 p-3.5 sm:p-4 bg-[#FAF9FB] dark:bg-neutral-900/60 space-y-3 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-black dark:text-white truncate">
                          {p.name}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isCompleted
                              ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                              : 'bg-emerald-50 dark:bg-emerald-950/50 text-[#2E9E6B]'
                          }`}
                        >
                          {isCompleted ? 'Paid Off' : 'Active'}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        Purchased: {formatFriendlyDate(p.startDate)} · {p.termMonths} Months
                        {p.interestRate !== undefined && p.interestRate > 0 && (
                          <span> · {p.interestRate}% {p.interestRateType === 'annual' ? 'p.a.' : '/mo'}</span>
                        )}
                        {p.interestRate === 0 && <span> · 0% Promo</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs text-neutral-400">Remaining</div>
                      <div className="text-sm sm:text-base font-extrabold text-black dark:text-white tabular-nums">
                        {formatPeso(remaining, { hide })}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-neutral-200/80 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCompleted ? 'bg-neutral-400 dark:bg-neutral-500' : 'bg-[#2E9E6B]'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 tabular-nums">
                      <span>{progress.toFixed(0)}% paid</span>
                      <span>
                        Paid: {formatPeso(paid, { hide })} / Total: {formatPeso(totalRepay, { hide })}
                      </span>
                    </div>
                  </div>

                  {/* Financial Breakdown Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded-xl bg-white dark:bg-neutral-800/80 border border-black/[0.02] dark:border-white/[0.03]">
                      <div className="text-[10px] text-neutral-400">Principal</div>
                      <div className="font-bold text-black dark:text-white tabular-nums">
                        {formatPeso(p.principal, { hide })}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-white dark:bg-neutral-800/80 border border-black/[0.02] dark:border-white/[0.03]">
                      <div className="text-[10px] text-neutral-400">Monthly Installment</div>
                      <div className="font-bold text-black dark:text-white tabular-nums">
                        {formatPeso(p.monthlyPayment, { hide })} / mo
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-white dark:bg-neutral-800/80 border border-black/[0.02] dark:border-white/[0.03] col-span-2 sm:col-span-1">
                      <div className="text-[10px] text-neutral-400">Monthly Due Day</div>
                      <div className="font-bold text-black dark:text-white">
                        Day {p.dueDay} of month
                      </div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setHistoryTargetPurchase(p)}
                        className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1"
                      >
                        <History className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Schedule & History</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        title="Edit purchase"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(p.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="Delete purchase"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => setPaymentTargetPurchase(p)}
                        className="px-3.5 py-1.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 transition-opacity"
                      >
                        Record Payment
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT PURCHASE MODAL */}
      {isAddEditModalOpen && (
        <AddEditPurchaseModal
          isOpen={isAddEditModalOpen}
          onClose={() => {
            setIsAddEditModalOpen(false);
            setEditingPurchase(null);
          }}
          editingPurchase={editingPurchase}
          accountId={account.id}
          isCredit={isCredit}
          availableAccountLimit={availableLimit}
          onSave={(data) => {
            if (editingPurchase) {
              updateAccountPurchase(account.id, editingPurchase.id, data);
            } else {
              addAccountPurchase(account.id, data);
            }
            setIsAddEditModalOpen(false);
            setEditingPurchase(null);
          }}
        />
      )}

      {/* MODAL 2: RECORD PAYMENT MODAL */}
      {paymentTargetPurchase && (
        <RecordPurchasePaymentModal
          isOpen={!!paymentTargetPurchase}
          onClose={() => setPaymentTargetPurchase(null)}
          purchase={paymentTargetPurchase}
          accountId={account.id}
          wallets={reconciledAccounts.filter(
            (a) => !a.isLiability && a.id !== account.id && !a.archived
          )}
          onRecord={(pay) => {
            recordPurchasePayment(account.id, paymentTargetPurchase.id, pay);
            setPaymentTargetPurchase(null);
          }}
        />
      )}

      {/* MODAL 3: SCHEDULE & HISTORY MODAL */}
      {historyTargetPurchase && (
        <PurchaseHistoryModal
          isOpen={!!historyTargetPurchase}
          onClose={() => setHistoryTargetPurchase(null)}
          purchase={historyTargetPurchase}
          hide={hide}
        />
      )}

      {/* MODAL 4: GENERAL ACCOUNT PAYMENT & ALLOCATION */}
      {isGeneralPaymentModalOpen && (
        <GeneralAccountPaymentModal
          isOpen={isGeneralPaymentModalOpen}
          onClose={() => setIsGeneralPaymentModalOpen(false)}
          account={account}
          activePurchases={purchases.filter(
            (p) => p.status === 'active' && p.remainingBalance > 0
          )}
          wallets={reconciledAccounts.filter(
            (a) => !a.isLiability && a.id !== account.id && !a.archived
          )}
          nextMonthlyCommitment={upcomingInfo.nextMonthlyAmount}
          onConfirm={(allocations, paymentDetails) => {
            recordBatchAccountPayment(account.id, allocations, paymentDetails);
            setIsGeneralPaymentModalOpen(false);
          }}
          hide={hide}
        />
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-2xl">
            <h4 className="text-sm font-bold text-black dark:text-white">
              Delete this borrowing/purchase?
            </h4>
            <p className="text-xs text-neutral-500">
              This will remove this transaction and its repayment schedule from the account.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-600 dark:text-neutral-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(deleteConfirmId)}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// SUB-MODAL 1: ADD / EDIT PURCHASE
// ==========================================

interface AddEditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPurchase: CreditPurchaseOrDrawdown | null;
  accountId: string;
  isCredit: boolean;
  availableAccountLimit?: number;
  onSave: (data: {
    name: string;
    principal: number;
    totalRepayment: number;
    termMonths: number;
    startDate: string;
    firstPaymentDate?: string;
    dueDay: number;
    interestRate?: number;
    interestAmount?: number;
    interestRateType?: InterestRateType;
    customMonthlyPayment?: number;
    isManualPayment?: boolean;
    monthlyPayment: number;
  }) => void;
}

const AddEditPurchaseModal: React.FC<AddEditPurchaseModalProps> = ({
  isOpen,
  onClose,
  editingPurchase,
  isCredit,
  availableAccountLimit,
  onSave,
}) => {
  const [name, setName] = useState(editingPurchase?.name || '');
  const [principal, setPrincipal] = useState(
    editingPurchase ? String(editingPurchase.principal) : ''
  );
  const [totalRepayment, setTotalRepayment] = useState(
    editingPurchase ? String(editingPurchase.totalRepayment) : ''
  );
  const [termMonths, setTermMonths] = useState(
    editingPurchase ? String(editingPurchase.termMonths) : '12'
  );
  const [startDate, setStartDate] = useState(
    editingPurchase?.startDate || new Date().toISOString().slice(0, 10)
  );
  const [firstPaymentDate, setFirstPaymentDate] = useState(
    editingPurchase?.firstPaymentDate ||
      editingPurchase?.startDate ||
      new Date().toISOString().slice(0, 10)
  );
  const [dueDay, setDueDay] = useState(
    editingPurchase ? String(editingPurchase.dueDay) : '15'
  );
  const [interestMode, setInterestMode] = useState<'rate' | 'amount'>(
    editingPurchase?.interestAmount ? 'amount' : 'rate'
  );
  const [interestRate, setInterestRate] = useState(
    editingPurchase?.interestRate !== undefined ? String(editingPurchase.interestRate) : '0'
  );
  const [interestAmount, setInterestAmount] = useState(
    editingPurchase?.interestAmount !== undefined ? String(editingPurchase.interestAmount) : ''
  );
  const [interestRateType, setInterestRateType] = useState<InterestRateType>(
    editingPurchase?.interestRateType || 'monthly'
  );
  const [isManualPayment, setIsManualPayment] = useState(
    !!editingPurchase?.isManualPayment
  );
  const [customMonthlyPayment, setCustomMonthlyPayment] = useState(
    editingPurchase?.customMonthlyPayment
      ? String(editingPurchase.customMonthlyPayment)
      : ''
  );
  const [error, setError] = useState<string | null>(null);

  // Auto-calculated monthly payment & estimated total repayment
  const calculatedEstimate = useMemo(() => {
    const p = Math.max(0, Number(principal) || 0);
    const n = Math.max(1, Number(termMonths) || 12);

    if (isManualPayment && Number(customMonthlyPayment) > 0) {
      const fixedMonthly = roundPHP(Number(customMonthlyPayment));
      const estTotal = roundPHP(fixedMonthly * n);
      return {
        monthly: fixedMonthly,
        estTotal,
        interest: Math.max(0, roundPHP(estTotal - p)),
      };
    }

    if (interestMode === 'amount') {
      const intAmt = Math.max(0, Number(interestAmount) || 0);
      const estTotal = roundPHP(p + intAmt);
      const monthly = roundPHP(estTotal / n);
      return {
        monthly,
        estTotal,
        interest: intAmt,
      };
    }

    const rate = Math.max(0, Number(interestRate) || 0);
    if (rate === 0) {
      const monthly = roundPHP(p / n);
      return {
        monthly,
        estTotal: p,
        interest: 0,
      };
    }

    if (interestRateType === 'monthly') {
      const monthlyInt = p * (rate / 100);
      const estTotal = roundPHP(p + monthlyInt * n);
      const monthly = roundPHP(estTotal / n);
      return {
        monthly,
        estTotal,
        interest: roundPHP(estTotal - p),
      };
    } else {
      const totalInt = roundPHP(p * (rate / 100) * (n / 12));
      const estTotal = roundPHP(p + totalInt);
      const monthly = roundPHP(estTotal / n);
      return {
        monthly,
        estTotal,
        interest: totalInt,
      };
    }
  }, [
    principal,
    termMonths,
    interestMode,
    interestRate,
    interestAmount,
    interestRateType,
    isManualPayment,
    customMonthlyPayment,
  ]);

  // When principal or interest changes, if totalRepayment hasn't been locked
  const handlePrincipalChange = (val: string) => {
    setPrincipal(val);
    if (!editingPurchase && (!totalRepayment || totalRepayment === '0')) {
      const pNum = Number(val) || 0;
      setTotalRepayment(String(pNum));
    }
  };

  const handleUseEstimate = () => {
    setTotalRepayment(String(calculatedEstimate.estTotal));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please enter a transaction description.');
      return;
    }

    const pNum = Number(principal);
    if (!Number.isFinite(pNum) || pNum <= 0) {
      setError('Please enter a valid amount greater than ₱0.00.');
      return;
    }

    // Account limit validation: prevent transaction from exceeding this account's available limit
    if (availableAccountLimit !== undefined && availableAccountLimit >= 0) {
      const effectiveAvailable = editingPurchase
        ? availableAccountLimit + editingPurchase.remainingBalance
        : availableAccountLimit;
      if (pNum > effectiveAvailable) {
        setError(
          `Amount (₱${pNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}) exceeds this account's available limit of ${formatPeso(effectiveAvailable)}.`
        );
        return;
      }
    }

    const tMonths = Math.max(1, Number(termMonths) || 12);
    const dDay = Math.min(31, Math.max(1, Number(dueDay) || 15));

    const enteredTotalRepay = Number(totalRepayment);
    const finalTotalRepay =
      Number.isFinite(enteredTotalRepay) && enteredTotalRepay > 0
        ? roundPHP(enteredTotalRepay)
        : calculatedEstimate.estTotal;

    const monthlyPayment =
      isManualPayment && Number(customMonthlyPayment) > 0
        ? roundPHP(Number(customMonthlyPayment))
        : roundPHP(finalTotalRepay / tMonths);

    onSave({
      name: cleanName,
      principal: roundPHP(pNum),
      totalRepayment: finalTotalRepay,
      termMonths: tMonths,
      startDate: startDate || new Date().toISOString().slice(0, 10),
      firstPaymentDate: firstPaymentDate || startDate,
      dueDay: dDay,
      interestRate: interestMode === 'rate' ? Number(interestRate) || 0 : undefined,
      interestAmount: interestMode === 'amount' ? Number(interestAmount) || 0 : undefined,
      interestRateType: interestMode === 'rate' ? interestRateType : undefined,
      customMonthlyPayment: isManualPayment ? Number(customMonthlyPayment) || undefined : undefined,
      isManualPayment,
      monthlyPayment,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-[24px] max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.08]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-black dark:text-white">
              {editingPurchase
                ? isCredit
                  ? 'Edit Credit Purchase'
                  : 'Edit Borrowing'
                : isCredit
                ? 'Add Credit Purchase'
                : 'Add Loan Borrowing / Drawdown'}
            </h3>
            <p className="text-[11px] text-neutral-400">
              Transaction will deduct from this account's established limit
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Transaction Name / Description *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isCredit ? 'e.g. Laptop, Appliances, Groceries' : 'e.g. Tuition fee, Capital advance, Hospital'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white font-medium"
            />
          </div>

          {/* Principal & Available Limit Check */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Amount Deducted from Limit (₱) *
              </label>
              {availableAccountLimit !== undefined && (
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                  Available Limit:{' '}
                  <strong className="text-[#2E9E6B]">
                    {formatPeso(availableAccountLimit)}
                  </strong>
                </span>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={principal}
              onChange={(e) => handlePrincipalChange(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white font-bold tabular-nums"
            />
          </div>

          {/* Repayment Term in Months */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Installment Duration (Months) *
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_REPAYMENT_TERMS.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setTermMonths(String(term))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    termMonths === String(term)
                      ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
                  }`}
                >
                  {term} mo
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max="360"
              value={termMonths}
              onChange={(e) => setTermMonths(e.target.value)}
              placeholder="Or enter custom months"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white tabular-nums"
            />
          </div>

          {/* Dates: Transaction Date & First Payment Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Transaction Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-black dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                First Payment Date
              </label>
              <input
                type="date"
                value={firstPaymentDate}
                onChange={(e) => setFirstPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-black dark:text-white"
              />
            </div>
          </div>

          {/* Monthly Due Day */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Monthly Due Day (1–31)
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-black dark:text-white tabular-nums"
            />
          </div>

          {/* Interest Option: Rate or Amount */}
          <div className="space-y-2 p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/60 border border-black/[0.03] dark:border-white/[0.04]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Interest Calculation
              </label>
              <div className="flex items-center gap-1 bg-neutral-200/70 dark:bg-neutral-900 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setInterestMode('rate')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                    interestMode === 'rate'
                      ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-2xs'
                      : 'text-neutral-500 hover:text-black dark:hover:text-white'
                  }`}
                >
                  Rate (%)
                </button>
                <button
                  type="button"
                  onClick={() => setInterestMode('amount')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                    interestMode === 'amount'
                      ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-2xs'
                      : 'text-neutral-500 hover:text-black dark:hover:text-white'
                  }`}
                >
                  Amount (₱)
                </button>
              </div>
            </div>

            {interestMode === 'rate' ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-neutral-500">
                    Interest Percentage
                  </span>
                  <button
                    type="button"
                    onClick={() => setInterestRate('0')}
                    className="text-[11px] font-semibold text-[#2E9E6B] hover:underline"
                  >
                    0% Promo / Zero Interest
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="0 for 0% promo"
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm tabular-nums text-black dark:text-white"
                  />
                  <select
                    value={interestRateType}
                    onChange={(e) => setInterestRateType(e.target.value as InterestRateType)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs text-black dark:text-white"
                  >
                    <option value="monthly">Monthly (% / mo)</option>
                    <option value="annual">Annual (% p.a.)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-neutral-500">
                    Direct Total Interest Fee (₱)
                  </span>
                  <button
                    type="button"
                    onClick={() => setInterestAmount('0')}
                    className="text-[11px] font-semibold text-[#2E9E6B] hover:underline"
                  >
                    ₱0.00 (Zero Interest)
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={interestAmount}
                  onChange={(e) => setInterestAmount(e.target.value)}
                  placeholder="e.g. 500.00"
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm tabular-nums text-black dark:text-white font-medium"
                />
              </div>
            )}
          </div>

          {/* Optional Fixed Monthly Payment Override */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Fixed monthly payment from lender / bank
              </span>
              <input
                type="checkbox"
                checked={isManualPayment}
                onChange={(e) => setIsManualPayment(e.target.checked)}
                className="w-4 h-4 accent-neutral-900 rounded cursor-pointer"
              />
            </div>
            {isManualPayment && (
              <div className="pt-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={customMonthlyPayment}
                  onChange={(e) => setCustomMonthlyPayment(e.target.value)}
                  placeholder="e.g. 1500.00"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm tabular-nums text-black dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Independent Total Repayment Field */}
          <div className="p-3.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-black/[0.04] dark:border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-black dark:text-white">
                Total Repayment Amount (₱) *
              </label>
              <button
                type="button"
                onClick={handleUseEstimate}
                className="text-[11px] font-semibold text-[#2E9E6B] hover:underline"
              >
                Use Estimate ({formatPeso(calculatedEstimate.estTotal)})
              </button>
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={totalRepayment}
              onChange={(e) => setTotalRepayment(e.target.value)}
              placeholder={String(calculatedEstimate.estTotal)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm font-bold tabular-nums text-black dark:text-white"
            />
            <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
              <span>
                Monthly Installment:{' '}
                <strong className="text-black dark:text-white tabular-nums">
                  {formatPeso(calculatedEstimate.monthly)}
                </strong>
              </span>
              <span>
                Total Interest:{' '}
                <strong className="text-black dark:text-white tabular-nums">
                  {formatPeso(calculatedEstimate.interest)}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold hover:opacity-90"
            >
              {editingPurchase ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// SUB-MODAL 2: RECORD PAYMENT ON PURCHASE
// ==========================================

interface RecordPurchasePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: CreditPurchaseOrDrawdown;
  accountId: string;
  wallets: ReconciledAccount[];
  onRecord: (pay: {
    amount: number;
    date: string;
    notes?: string;
    sourceAccountId?: string;
  }) => void;
}

const RecordPurchasePaymentModal: React.FC<RecordPurchasePaymentModalProps> = ({
  isOpen,
  onClose,
  purchase,
  wallets,
  onRecord,
}) => {
  const installmentAmount =
    purchase.monthlyPayment > 0
      ? purchase.monthlyPayment
      : Math.round(purchase.totalRepayment / Math.max(1, purchase.termMonths || 1));

  const [amount, setAmount] = useState(
    String(
      Math.min(
        purchase.remainingBalance,
        installmentAmount > 0 ? installmentAmount : purchase.remainingBalance
      )
    )
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sourceAccountId, setSourceAccountId] = useState<string>(
    wallets[0]?.id || ''
  );
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [allowOverpay, setAllowOverpay] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      setError('Please enter a payment amount greater than ₱0.00');
      return;
    }

    if (num > purchase.remainingBalance && purchase.remainingBalance > 0 && !allowOverpay) {
      setError(
        `The entered amount (₱${num.toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })}) exceeds the remaining balance (₱${purchase.remainingBalance.toLocaleString(
          'en-US',
          { minimumFractionDigits: 2 }
        )}). Check "Allow excess payment" below to proceed.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      onRecord({
        amount: roundPHP(num),
        date,
        notes: notes.trim() || undefined,
        sourceAccountId: sourceAccountId || undefined,
      });
      onClose();
    } catch (err) {
      console.error('[RecordPurchasePaymentModal] submit error:', err);
      setError('Failed to record payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-[24px] max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-black/[0.06] dark:border-white/[0.08] max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] dark:border-white/[0.06]">
          <div className="min-w-0 flex-1 mr-2">
            <h3 className="text-sm sm:text-base font-bold text-black dark:text-white truncate">
              Record Payment
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
              {purchase.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transaction Status Card */}
        <div className="p-3.5 rounded-2xl bg-[#F6F5F8] dark:bg-neutral-800/80 border border-black/[0.03] dark:border-white/[0.04] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500 dark:text-neutral-400">Remaining Balance:</span>
            <strong className="text-base font-extrabold text-black dark:text-white tabular-nums">
              {formatPeso(purchase.remainingBalance)}
            </strong>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] text-[11px]">
            <div>
              <span className="text-neutral-500 dark:text-neutral-400">Installment Amount:</span>
              <div className="font-bold text-black dark:text-white tabular-nums">
                {installmentAmount > 0 ? `${formatPeso(installmentAmount)} / mo` : 'Flexible'}
              </div>
            </div>
            <div className="text-right">
              <span className="text-neutral-500 dark:text-neutral-400">Due Day:</span>
              <div className="font-bold text-neutral-800 dark:text-neutral-200">
                Day {purchase.dueDay || 15} of month
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Quick Select Buttons */}
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
              Quick Select Amount:
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {installmentAmount > 0 && installmentAmount <= purchase.remainingBalance && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setAmount(String(installmentAmount));
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:opacity-90 transition-opacity"
                >
                  Pay Installment ({formatPeso(installmentAmount, { compact: true })})
                </button>
              )}

              {purchase.remainingBalance > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setAmount(String(purchase.remainingBalance));
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 transition-colors"
                >
                  Pay Full Balance ({formatPeso(purchase.remainingBalance, { compact: true })})
                </button>
              )}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Payment Amount (₱) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => {
                  setError(null);
                  setAmount(e.target.value);
                }}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold tabular-nums text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              />
            </div>
            {Number(amount) > purchase.remainingBalance && purchase.remainingBalance > 0 && (
              <label className="mt-2 flex items-center gap-2 cursor-pointer text-xs text-neutral-600 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={allowOverpay}
                  onChange={(e) => {
                    setError(null);
                    setAllowOverpay(e.target.checked);
                  }}
                  className="rounded text-neutral-900 focus:ring-neutral-900 dark:focus:ring-white w-4 h-4 accent-neutral-900 dark:accent-white"
                />
                <span>Allow excess payment exceeding remaining balance</span>
              </label>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Payment Date *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          {/* Source Account (Cash / Bank / E-Wallet) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Deduct Payment From (Optional)
            </label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            >
              <option value="">Do not link to another account (Direct Log)</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatPeso(w.currentBalance)})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-neutral-400 mt-1">
              {sourceAccountId
                ? 'Automatically records a linked payment transfer from this wallet.'
                : 'Direct log: updates this purchase and account balance without altering other wallets.'}
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid via GCash ref #123456"
              className="w-full px-3.5 py-2 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// SUB-MODAL 3: SCHEDULE & HISTORY
// ==========================================

interface PurchaseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: CreditPurchaseOrDrawdown;
  hide: boolean;
}

const PurchaseHistoryModal: React.FC<PurchaseHistoryModalProps> = ({
  isOpen,
  onClose,
  purchase,
  hide,
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');

  // Independent schedule for this single purchase
  const schedule = useMemo(() => {
    const terms = Math.max(1, purchase.termMonths || 1);
    const totalRepay = purchase.totalRepayment > 0 ? purchase.totalRepayment : purchase.principal;
    const baseMonthly =
      purchase.monthlyPayment > 0
        ? purchase.monthlyPayment
        : roundPHP(totalRepay / terms);
    const startBase =
      purchase.firstPaymentDate || purchase.startDate || new Date().toISOString().slice(0, 10);
    const dueDay = purchase.dueDay || 15;

    let cumulativeDue = 0;
    const items = [];

    for (let i = 0; i < terms; i++) {
      const isLast = i === terms - 1;
      const amount = isLast ? roundPHP(totalRepay - cumulativeDue) : baseMonthly;
      cumulativeDue += amount;

      const rawMonthDate = addMonthsToDate(startBase, i);
      const [y, m] = rawMonthDate.split('-').map(Number);
      const maxDays = new Date(y, m, 0).getDate();
      const clampedDay = Math.min(maxDays, dueDay);
      const dueDate = `${y}-${String(m).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;

      const isPaid =
        purchase.remainingBalance <= 0 ||
        purchase.status === 'completed' ||
        purchase.totalPaid >= cumulativeDue;

      items.push({
        index: i + 1,
        dueDate,
        amount,
        isPaid,
      });
    }

    return items;
  }, [purchase]);

  const payments = purchase.payments || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-[24px] max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.08]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-black dark:text-white">
              {purchase.name}
            </h3>
            <div className="text-[11px] text-neutral-400">
              {purchase.termMonths} Months · Remaining: {formatPeso(purchase.remainingBalance, { hide })}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-black/[0.04] dark:border-white/[0.06] px-5 pt-2 gap-4 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`pb-2.5 transition-colors ${
              activeTab === 'schedule'
                ? 'border-b-2 border-black dark:border-white text-black dark:text-white'
                : 'text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            Repayment Schedule ({schedule.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 transition-colors ${
              activeTab === 'history'
                ? 'border-b-2 border-black dark:border-white text-black dark:text-white'
                : 'text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            Payment History ({payments.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-2">
          {activeTab === 'schedule' ? (
            <div className="space-y-2">
              {schedule.map((item) => (
                <div
                  key={item.index}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[10px] font-bold">
                      {item.index}
                    </span>
                    <div>
                      <div className="font-semibold text-black dark:text-white">
                        Installment #{item.index}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        Due: {formatFriendlyDate(item.dueDate)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-black dark:text-white tabular-nums">
                      {formatPeso(item.amount, { hide })}
                    </div>
                    <div className="text-[10px]">
                      {item.isPaid ? (
                        <span className="text-[#2E9E6B] font-semibold">Settled</span>
                      ) : (
                        <span className="text-neutral-500">Pending</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {payments.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No payments recorded for this transaction yet.
                </div>
              ) : (
                payments.map((pay) => (
                  <div
                    key={pay.id}
                    className="p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#2E9E6B] tabular-nums">
                        {formatPeso(pay.amount, { hide })}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        Date: {formatFriendlyDate(pay.date)}
                        {pay.notes && <span> · {pay.notes}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {pay.id.slice(0, 10)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// SUB-MODAL 4: GENERAL ACCOUNT PAYMENT & ALLOCATION
// ==========================================

interface GeneralAccountPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: ReconciledAccount;
  activePurchases: CreditPurchaseOrDrawdown[];
  wallets: ReconciledAccount[];
  nextMonthlyCommitment: number;
  onConfirm: (
    allocations: { purchaseId: string; amount: number }[],
    paymentDetails: {
      totalAmount: number;
      date?: string;
      notes?: string;
      sourceAccountId?: string;
    }
  ) => void;
  hide: boolean;
}

type AllocationStrategy = 'oldest' | 'lowest_balance' | 'highest_balance' | 'custom';

const GeneralAccountPaymentModal: React.FC<GeneralAccountPaymentModalProps> = ({
  isOpen,
  onClose,
  account,
  activePurchases,
  wallets,
  nextMonthlyCommitment,
  onConfirm,
  hide,
}) => {
  const totalOutstanding = useMemo(
    () => activePurchases.reduce((sum, p) => sum + p.remainingBalance, 0),
    [activePurchases]
  );

  const [totalAmount, setTotalAmount] = useState<string>(
    nextMonthlyCommitment > 0 ? String(nextMonthlyCommitment) : ''
  );
  const [strategy, setStrategy] = useState<AllocationStrategy>('oldest');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Compute allocated amounts per purchase based on strategy
  const computedAllocations = useMemo(() => {
    const pool = Math.max(0, Number(totalAmount) || 0);
    const result: Record<string, number> = {};

    if (strategy === 'custom') {
      for (const p of activePurchases) {
        const val = Math.max(0, Number(customAmounts[p.id]) || 0);
        result[p.id] = Math.min(p.remainingBalance, roundPHP(val));
      }
      return result;
    }

    // Auto-strategies
    let sorted = [...activePurchases];
    if (strategy === 'oldest') {
      sorted.sort((a, b) => {
        const dateA = a.startDate || a.firstPaymentDate || '';
        const dateB = b.startDate || b.firstPaymentDate || '';
        return dateA.localeCompare(dateB);
      });
    } else if (strategy === 'lowest_balance') {
      sorted.sort((a, b) => a.remainingBalance - b.remainingBalance);
    } else if (strategy === 'highest_balance') {
      sorted.sort((a, b) => b.remainingBalance - a.remainingBalance);
    }

    let remainingPool = pool;
    for (const p of sorted) {
      if (remainingPool <= 0) {
        result[p.id] = 0;
      } else {
        const alloc = Math.min(p.remainingBalance, remainingPool);
        result[p.id] = roundPHP(alloc);
        remainingPool = roundPHP(remainingPool - alloc);
      }
    }

    return result;
  }, [activePurchases, totalAmount, strategy, customAmounts]);

  const totalAllocated = useMemo(() => {
    return Object.values(computedAllocations).reduce((sum, amt) => sum + amt, 0);
  }, [computedAllocations]);

  const handleQuickPreset = (amount: number) => {
    const clamped = Math.min(totalOutstanding, Math.max(0, amount));
    setTotalAmount(String(roundPHP(clamped)));
    if (strategy === 'custom') {
      // Initialize custom values equally or proportional
      const init: Record<string, string> = {};
      let remaining = clamped;
      for (const p of activePurchases) {
        const alloc = Math.min(p.remainingBalance, remaining);
        init[p.id] = alloc > 0 ? String(roundPHP(alloc)) : '0';
        remaining = roundPHP(remaining - alloc);
      }
      setCustomAmounts(init);
    }
  };

  const handleCustomChange = (id: string, val: string) => {
    setCustomAmounts((prev) => ({
      ...prev,
      [id]: val,
    }));
  };

  const handleFillMax = (id: string, maxAmt: number) => {
    setCustomAmounts((prev) => ({
      ...prev,
      [id]: String(maxAmt),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const enteredTotal = Number(totalAmount);
    if (!Number.isFinite(enteredTotal) || enteredTotal <= 0) {
      setError('Please enter a valid payment amount greater than ₱0.00.');
      return;
    }

    if (totalAllocated <= 0) {
      setError('Please allocate payment to at least one active purchase/borrowing.');
      return;
    }

    const allocationsList: { purchaseId: string; amount: number }[] = [];
    for (const p of activePurchases) {
      const amt = computedAllocations[p.id] || 0;
      if (amt > 0) {
        allocationsList.push({ purchaseId: p.id, amount: amt });
      }
    }

    if (allocationsList.length === 0) {
      setError('No items received an allocation.');
      return;
    }

    const defaultNotes =
      notes.trim() ||
      `General payment allocated across ${allocationsList.length} items (${
        strategy === 'oldest'
          ? 'Oldest Due First'
          : strategy === 'lowest_balance'
          ? 'Lowest Balance First'
          : strategy === 'highest_balance'
          ? 'Highest Balance First'
          : 'Custom Allocation'
      })`;

    onConfirm(allocationsList, {
      totalAmount: totalAllocated,
      date,
      notes: defaultNotes,
      sourceAccountId: sourceAccountId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-[24px] max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.08]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between shrink-0">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#2E9E6B] shrink-0" />
              <h3 className="text-sm sm:text-base font-bold text-black dark:text-white truncate">
                General Account Payment & Allocation
              </h3>
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              {account.name} · Outstanding Debt:{' '}
              <strong className="text-black dark:text-white font-bold tabular-nums">
                {formatPeso(totalOutstanding, { hide })}
              </strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Payment Amount Input with Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-black dark:text-white">
                Payment Amount (₱) *
              </label>
              <span className="text-[11px] text-neutral-400">
                Max Debt: {formatPeso(totalOutstanding, { hide })}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-base font-extrabold tabular-nums text-black dark:text-white"
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {totalOutstanding > 0 && (
                <button
                  type="button"
                  onClick={() => handleQuickPreset(totalOutstanding)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px] font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700"
                >
                  Pay Full Balance ({formatPeso(totalOutstanding, { compact: true })})
                </button>
              )}
              {nextMonthlyCommitment > 0 && nextMonthlyCommitment < totalOutstanding && (
                <button
                  type="button"
                  onClick={() => handleQuickPreset(nextMonthlyCommitment)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-[#2E9E6B] text-[11px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                >
                  Next Due ({formatPeso(nextMonthlyCommitment, { compact: true })})
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  handleQuickPreset((Number(totalAmount) || 0) + 1000)
                }
                className="px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[11px] hover:bg-neutral-200"
              >
                +₱1,000
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickPreset((Number(totalAmount) || 0) + 5000)
                }
                className="px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[11px] hover:bg-neutral-200"
              >
                +₱5,000
              </button>
            </div>
          </div>

          {/* 2. Allocation Strategy Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-black dark:text-white flex items-center justify-between">
              <span>Allocation Strategy</span>
              <span className="text-[10px] text-neutral-400 font-normal">
                Choose how payment distributes
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setStrategy('oldest')}
                className={`p-2 rounded-xl text-left border transition-all ${
                  strategy === 'oldest'
                    ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 text-black dark:text-white font-bold'
                    : 'border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                <div className="text-[11px] leading-tight">Oldest Due</div>
                <div className="text-[9px] text-neutral-400 mt-0.5">FIFO order</div>
              </button>

              <button
                type="button"
                onClick={() => setStrategy('lowest_balance')}
                className={`p-2 rounded-xl text-left border transition-all ${
                  strategy === 'lowest_balance'
                    ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 text-black dark:text-white font-bold'
                    : 'border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                <div className="text-[11px] leading-tight">Lowest Balance</div>
                <div className="text-[9px] text-neutral-400 mt-0.5">Snowball</div>
              </button>

              <button
                type="button"
                onClick={() => setStrategy('highest_balance')}
                className={`p-2 rounded-xl text-left border transition-all ${
                  strategy === 'highest_balance'
                    ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 text-black dark:text-white font-bold'
                    : 'border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                <div className="text-[11px] leading-tight">Highest Debt</div>
                <div className="text-[9px] text-neutral-400 mt-0.5">Avalanche</div>
              </button>

              <button
                type="button"
                onClick={() => setStrategy('custom')}
                className={`p-2 rounded-xl text-left border transition-all ${
                  strategy === 'custom'
                    ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 text-black dark:text-white font-bold'
                    : 'border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                <div className="text-[11px] leading-tight">Custom</div>
                <div className="text-[9px] text-neutral-400 mt-0.5">Manual input</div>
              </button>
            </div>
          </div>

          {/* 3. Live Allocation Preview List */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-black dark:text-white">
                Allocated to {activePurchases.length} Items
              </span>
              <span className="text-[11px] text-neutral-500 tabular-nums">
                Total Allocated:{' '}
                <strong className="text-black dark:text-white font-bold">
                  {formatPeso(totalAllocated, { hide })}
                </strong>
              </span>
            </div>

            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-0.5">
              {activePurchases.map((p) => {
                const allocated = computedAllocations[p.id] || 0;
                const remainingAfter = Math.max(0, roundPHP(p.remainingBalance - allocated));
                const willPayOff = allocated > 0 && remainingAfter === 0;

                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-[#FAF9FB] dark:bg-neutral-900/60 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs text-black dark:text-white truncate">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          Date: {formatFriendlyDate(p.startDate)} · Day {p.dueDay} of mo
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-neutral-400">Remaining Balance</div>
                        <div className="text-xs font-bold text-black dark:text-white tabular-nums">
                          {formatPeso(p.remainingBalance, { hide })}
                        </div>
                      </div>
                    </div>

                    {/* Allocation Input / Display */}
                    <div className="pt-1.5 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-neutral-500">Allocated:</span>
                        {strategy === 'custom' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={p.remainingBalance}
                              value={customAmounts[p.id] || ''}
                              onChange={(e) => handleCustomChange(p.id, e.target.value)}
                              placeholder="0.00"
                              className="w-24 px-2 py-1 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 text-xs font-bold tabular-nums text-black dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleFillMax(p.id, p.remainingBalance)}
                              className="px-1.5 py-1 rounded text-[10px] bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold"
                            >
                              Max
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`font-bold tabular-nums ${
                              allocated > 0
                                ? 'text-[#2E9E6B]'
                                : 'text-neutral-400 dark:text-neutral-500'
                            }`}
                          >
                            +{formatPeso(allocated, { hide })}
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        {willPayOff ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-[#2E9E6B]">
                            Will Pay Off!
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-400 tabular-nums">
                            New Bal: {formatPeso(remainingAfter, { hide })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Payment Details: Date, Source Account, Notes */}
          <div className="space-y-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-black dark:text-white"
                />
              </div>

              {wallets.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Deduct From (Source Wallet)
                  </label>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-black dark:text-white"
                  >
                    <option value="">Do not link (Direct Log)</option>
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({formatPeso(w.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Monthly batch allocation payment"
                className="w-full px-3 py-2 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-black dark:text-white"
              />
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={totalAllocated <= 0}
              className="px-5 py-2.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Confirm {formatPeso(totalAllocated)} Allocation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

