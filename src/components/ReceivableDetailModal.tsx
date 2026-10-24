import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  History,
  Layers,
  Phone,
  Plus,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { ReceivableRecord, ReceivableStatus } from '../types/finance';
import { formatPeso, formatShortDate } from '../utils/currency';
import { getReceivableStatus } from '../utils/financeEngine';
import {
  calculateReceivableTermsAndSchedule,
  formatFriendlyDate,
} from '../utils/loanCalculations';

interface ReceivableDetailModalProps {
  receivable: ReceivableRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenRecordPayment: (receivable: ReceivableRecord) => void;
  onOpenEdit: (receivable: ReceivableRecord) => void;
  onOpenAddForPerson?: (personName: string) => void;
  onSelectReceivable?: (receivable: ReceivableRecord) => void;
}

export const ReceivableDetailModal: React.FC<ReceivableDetailModalProps> = ({
  receivable,
  isOpen,
  onClose,
  onOpenRecordPayment,
  onOpenEdit,
  onOpenAddForPerson,
  onSelectReceivable,
}) => {
  const { deleteReceivable, deleteReceivablePayment, reconciledAccounts, receivables } =
    useFinance();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showSchedule, setShowSchedule] = useState(true);

  // Compute or format the collection schedule items
  const scheduleItems = useMemo(() => {
    if (!receivable) return [];
    if (receivable.schedule && receivable.schedule.length > 0) {
      let cumulativePaid = receivable.totalCollected || 0;
      let cumDue = 0;
      return receivable.schedule.map((item) => {
        cumDue += item.collectionAmount;
        const isPaid =
          receivable.remainingBalance <= 0 || cumulativePaid >= cumDue - 0.05;
        return {
          ...item,
          isPaid,
        };
      });
    }

    // Dynamic fallback calculation if older record has no saved schedule
    const calc = calculateReceivableTermsAndSchedule({
      principal: receivable.principal,
      termMonths: receivable.termMonths || 12,
      interestRate: receivable.interestRate ?? 0,
      interestRateType: receivable.interestRateType || 'annual',
      repaymentModel: receivable.repaymentModel || 'amortized',
      isFixedMonthlyPayment: receivable.isFixedMonthlyPayment,
      fixedMonthlyPayment: receivable.fixedMonthlyPayment,
      scheduleStartDate:
        receivable.scheduleStartDate ||
        receivable.lentDate ||
        new Date().toISOString().slice(0, 10),
      paymentSchedule: receivable.paymentSchedule || 'monthly',
    });

    let cumulativePaid = receivable.totalCollected || 0;
    let cumDue = 0;
    return calc.schedule.map((item) => {
      cumDue += item.collectionAmount;
      const isPaid =
        receivable.remainingBalance <= 0 || cumulativePaid >= cumDue - 0.05;
      return {
        ...item,
        isPaid,
      };
    });
  }, [receivable]);

  // Find all lending records for THIS person (never combining with another person)
  const personRecords = useMemo(() => {
    if (!receivable) return [];
    const targetName = receivable.personName.trim().toLowerCase();
    return receivables.filter(
      (r) => r.personName.trim().toLowerCase() === targetName
    );
  }, [receivable, receivables]);

  // Aggregate stats for this specific borrower
  const personSummary = useMemo(() => {
    let totalLent = 0;
    let totalExpected = 0;
    let totalCollected = 0;
    let totalRemaining = 0;
    for (const r of personRecords) {
      totalLent += r.principal || 0;
      totalExpected += r.totalExpected || 0;
      totalCollected += r.totalCollected || 0;
      totalRemaining += r.remainingBalance || 0;
    }
    return {
      totalLent,
      totalExpected,
      totalCollected,
      totalRemaining,
      recordsCount: personRecords.length,
    };
  }, [personRecords]);

  if (!isOpen || !receivable) return null;

  const status: ReceivableStatus = getReceivableStatus(receivable);

  const getStatusBadge = () => {
    switch (status) {
      case 'fully_paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#10B981]/15 text-[#10B981] dark:bg-[#10B981]/25">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Fully Paid
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#DC2626]/15 text-[#DC2626] dark:bg-[#DC2626]/25">
            <AlertTriangle className="w-3.5 h-3.5" />
            Overdue
          </span>
        );
      case 'partially_paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 dark:bg-blue-500/25">
            <Clock className="w-3.5 h-3.5" />
            Partially Paid
          </span>
        );
      case 'unpaid':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 dark:bg-amber-500/25">
            <Clock className="w-3.5 h-3.5" />
            Unpaid
          </span>
        );
    }
  };

  const progressPercent =
    receivable.totalExpected > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (receivable.totalCollected / receivable.totalExpected) * 100
          )
        )
      : 0;

  const handleDeleteReceivable = () => {
    deleteReceivable(receivable.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-[#FAF9FB] dark:bg-[#121318] text-neutral-900 dark:text-white w-full max-w-lg rounded-[24px] sm:rounded-[28px] flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden shadow-2xl border border-black/[0.06] dark:border-white/10 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4 border-b border-black/[0.04] dark:border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
            <div className="w-10 h-10 rounded-full bg-[#10B981] text-black flex items-center justify-center font-extrabold text-sm shrink-0 shadow-xs">
              {receivable.personName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white truncate">
                  {receivable.personName}
                </h2>
                {getStatusBadge()}
              </div>
              <div className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate">
                Lent on {formatShortDate(receivable.lentDate)} · Due {formatShortDate(receivable.dueDate)}
                {receivable.collectionDueDay && (
                  <span> · Due Day {receivable.collectionDueDay}</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-200/60 dark:hover:bg-white/10 transition-colors shrink-0 text-neutral-400 hover:text-black dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {/* Main Balance Display */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#191A20] border border-neutral-200/80 dark:border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Remaining Balance for this Loan
                </div>
                <div
                  className={`text-2xl sm:text-3xl font-extrabold tabular-nums mt-0.5 ${
                    receivable.remainingBalance > 0
                      ? 'text-[#DC2626]'
                      : 'text-[#10B981]'
                  }`}
                >
                  {formatPeso(receivable.remainingBalance)}
                </div>
              </div>

              {receivable.remainingBalance > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenRecordPayment(receivable)}
                  className="px-4 py-2 rounded-xl bg-[#10B981] text-black text-xs font-bold hover:bg-[#05DF72] transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Record Payment</span>
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                <span>Collected: {formatPeso(receivable.totalCollected)}</span>
                <span>Total Expected: {formatPeso(receivable.totalExpected)}</span>
              </div>
              <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    status === 'fully_paid' ? 'bg-[#10B981]' : 'bg-[#10B981]'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Terms Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-[#191A20] border border-neutral-200/80 dark:border-white/[0.08]">
              <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">Principal Lent</div>
              <div className="font-bold text-neutral-900 dark:text-white tabular-nums mt-0.5 truncate">
                {formatPeso(receivable.principal)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-[#191A20] border border-neutral-200/80 dark:border-white/[0.08]">
              <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">Monthly Collection</div>
              <div className="font-bold text-neutral-900 dark:text-white tabular-nums mt-0.5 truncate">
                {formatPeso(
                  receivable.monthlyCollectionEstimate ||
                    scheduleItems[0]?.collectionAmount ||
                    0
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-[#191A20] border border-neutral-200/80 dark:border-white/[0.08]">
              <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">Interest Rate & Period</div>
              <div className="font-bold text-neutral-900 dark:text-white tabular-nums mt-0.5 truncate">
                {receivable.interestRate !== undefined && receivable.interestRate > 0
                  ? `${receivable.interestRate}% ${
                      receivable.interestRateType === 'monthly' ? 'p.m.' : 'p.a.'
                    }`
                  : '0% Zero-Interest'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-[#191A20] border border-neutral-200/80 dark:border-white/[0.08]">
              <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">Repayment Model</div>
              <div className="font-bold text-neutral-900 dark:text-white capitalize mt-0.5 truncate">
                {receivable.repaymentModel === 'amortized'
                  ? 'Amortized (Reducing)'
                  : receivable.repaymentModel === 'flat_rate'
                  ? 'Flat Rate / Add-on'
                  : receivable.repaymentModel === 'principal_first'
                  ? 'Principal First'
                  : 'Amortized'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-[#191A20] border border-neutral-200/80 dark:border-white/[0.08]">
              <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">Schedule Start Date</div>
              <div className="font-bold text-neutral-900 dark:text-white tabular-nums mt-0.5 truncate">
                {formatShortDate(
                  receivable.scheduleStartDate || receivable.lentDate
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-[#191A20] border border-neutral-200/80 dark:border-white/[0.08]">
              <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">Final Due Date</div>
              <div className="font-bold text-neutral-900 dark:text-white tabular-nums mt-0.5 truncate">
                {formatShortDate(receivable.dueDate)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-[#191A20] border border-neutral-200/80 dark:border-white/[0.08]">
              <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">Total Interest</div>
              <div className="font-bold text-neutral-900 dark:text-white tabular-nums mt-0.5 truncate">
                {formatPeso(receivable.interestAmount || 0)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-[#191A20] border border-neutral-200/80 dark:border-white/[0.08]">
              <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">Total Repayment</div>
              <div className="font-bold text-neutral-900 dark:text-white tabular-nums mt-0.5 truncate">
                {formatPeso(receivable.totalExpected)}
              </div>
            </div>
          </div>

          {/* COLLECTION SCHEDULE BREAKDOWN */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#191A20] border border-neutral-200/80 dark:border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-700 dark:text-white shrink-0" />
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                  Collection Schedule ({scheduleItems.length} Installments)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSchedule(!showSchedule)}
                className="text-xs font-semibold text-[#4F46E5] hover:text-[#6366F1] dark:hover:text-[#818CF8] flex items-center gap-1 transition-colors"
              >
                <span>{showSchedule ? 'Hide' : 'Show Schedule'}</span>
                {showSchedule ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {showSchedule && (
              <div className="space-y-2 pt-1 border-t border-black/[0.04] dark:border-white/5">
                <div className="max-h-56 overflow-y-auto rounded-xl border border-neutral-200/80 dark:border-white/5 bg-[#F6F5F8] dark:bg-[#14151B]">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-neutral-100 dark:bg-[#1C1D24] text-neutral-600 dark:text-neutral-400 sticky top-0 font-semibold border-b border-neutral-200/80 dark:border-white/5">
                      <tr>
                        <th className="py-2 px-2.5">#</th>
                        <th className="py-2 px-2.5">Due Date</th>
                        <th className="py-2 px-2.5 text-right">Principal</th>
                        <th className="py-2 px-2.5 text-right">Interest</th>
                        <th className="py-2 px-2.5 text-right">Collection</th>
                        <th className="py-2 px-2.5 text-right">Balance</th>
                        <th className="py-2 px-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/80 dark:divide-white/5 text-neutral-700 dark:text-neutral-300">
                      {scheduleItems.map((item) => (
                        <tr
                          key={item.installmentNumber}
                          className={`hover:bg-black/[0.02] dark:hover:bg-white/[0.02] ${
                            item.isPaid ? 'opacity-70 bg-[#10B981]/5' : ''
                          }`}
                        >
                          <td className="py-2 px-2.5 font-bold text-neutral-500 dark:text-neutral-400">
                            {item.installmentNumber}
                          </td>
                          <td className="py-2 px-2.5 font-medium whitespace-nowrap text-neutral-800 dark:text-neutral-200">
                            {formatFriendlyDate(item.dueDate)}
                          </td>
                          <td className="py-2 px-2.5 text-right tabular-nums text-neutral-900 dark:text-white font-medium">
                            {formatPeso(item.principalPortion)}
                          </td>
                          <td className="py-2 px-2.5 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                            {formatPeso(item.interestPortion)}
                          </td>
                          <td className="py-2 px-2.5 text-right tabular-nums font-bold text-neutral-900 dark:text-white">
                            {formatPeso(item.collectionAmount)}
                          </td>
                          <td className="py-2 px-2.5 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                            {formatPeso(item.remainingBalance)}
                          </td>
                          <td className="py-2 px-2.5 text-center">
                            {item.isPaid ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#10B981] bg-[#10B981]/15 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Paid
                              </span>
                            ) : (
                              <span className="text-[10px] text-neutral-500 font-medium">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 px-1 pt-1">
                  <span>
                    Schedule starts on{' '}
                    <strong className="text-neutral-900 dark:text-white">
                      {formatFriendlyDate(
                        receivable.scheduleStartDate || receivable.lentDate
                      )}
                    </strong>
                  </span>
                  <span>
                    Payoff date:{' '}
                    <strong className="text-neutral-900 dark:text-white">
                      {formatFriendlyDate(receivable.dueDate)}
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* BORROWER PORTFOLIO: Total Outstanding Across All Loans for this Person */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#191A20] border border-neutral-200/80 dark:border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#10B981]" />
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                  Borrower Portfolio: {receivable.personName}
                </h3>
              </div>
              {onOpenAddForPerson && (
                <button
                  type="button"
                  onClick={() => onOpenAddForPerson(receivable.personName)}
                  className="text-xs font-bold text-[#10B981] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Lend Again</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-[#14151B] border border-black/[0.03] dark:border-white/5">
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Total Loans</div>
                <div className="font-bold text-neutral-900 dark:text-white tabular-nums mt-0.5">
                  {personSummary.recordsCount} record{personSummary.recordsCount > 1 ? 's' : ''}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-[#14151B] border border-black/[0.03] dark:border-white/5">
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Total Collected</div>
                <div className="font-bold text-[#10B981] tabular-nums mt-0.5 truncate">
                  {formatPeso(personSummary.totalCollected, { compact: true })}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-[#14151B] border border-black/[0.03] dark:border-white/5">
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Total Outstanding</div>
                <div className="font-extrabold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5 truncate">
                  {formatPeso(personSummary.totalRemaining, { compact: true })}
                </div>
              </div>
            </div>

            {/* List of other independent loans for this person */}
            {personRecords.length > 1 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                  All Loans for {receivable.personName}:
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {personRecords.map((r, idx) => {
                    const isCurrent = r.id === receivable.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          if (!isCurrent && onSelectReceivable) {
                            onSelectReceivable(r);
                          }
                        }}
                        className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left text-xs transition-colors ${
                          isCurrent
                            ? 'bg-neutral-100 dark:bg-neutral-800 border border-[#10B981]/50'
                            : 'bg-[#F6F5F8] dark:bg-[#14151B] hover:bg-neutral-200/60 dark:hover:bg-neutral-800/80 border border-neutral-200/60 dark:border-white/5'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            <span>Loan #{idx + 1}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#10B981] text-black font-extrabold">
                                Viewing
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Lent {formatShortDate(r.lentDate)} · Due {formatShortDate(r.dueDate)}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold tabular-nums text-neutral-900 dark:text-white">
                            {formatPeso(r.remainingBalance)}
                          </div>
                          <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                            {r.remainingBalance <= 0 ? 'Settled' : 'Remaining'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Contact & Notes */}
          {(receivable.contactInfo || receivable.notes) && (
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#191A20] border border-neutral-200/80 dark:border-white/[0.08] space-y-2 text-xs">
              {receivable.contactInfo && (
                <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                  <Phone className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                  <span className="font-medium">{receivable.contactInfo}</span>
                </div>
              )}
              {receivable.notes && (
                <p className="text-neutral-600 dark:text-neutral-400 italic">"{receivable.notes}"</p>
              )}
            </div>
          )}

          {/* Payment History Timeline for this specific loan */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <History className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                <span>Payment History for this Loan ({receivable.payments.length})</span>
              </h3>
            </div>

            {receivable.payments.length === 0 ? (
              <div className="p-4 rounded-xl bg-white dark:bg-[#191A20] border border-neutral-200/80 dark:border-white/[0.08] text-center text-xs text-neutral-500 dark:text-neutral-400">
                No repayments recorded yet for this lending record. Use the "Record Payment" button when money is collected.
              </div>
            ) : (
              <div className="divide-y divide-neutral-200/80 dark:divide-white/[0.06] rounded-2xl bg-white dark:bg-[#191A20] border border-neutral-200/80 dark:border-white/[0.08] overflow-hidden">
                {receivable.payments
                  .slice()
                  .reverse()
                  .map((payment) => {
                    const depositAcc = payment.destinationAccountId
                      ? reconciledAccounts.find(
                          (a) => a.id === payment.destinationAccountId
                        )
                      : null;

                    return (
                      <div
                        key={payment.id}
                        className="p-3 sm:p-3.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#10B981] tabular-nums">
                              +{formatPeso(payment.amount)}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
                              {payment.paymentMethod}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {formatShortDate(payment.date)}
                            {depositAcc && ` · Deposited to ${depositAcc.name}`}
                            {payment.notes && ` · ${payment.notes}`}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            deleteReceivablePayment(receivable.id, payment.id)
                          }
                          aria-label="Delete repayment record"
                          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0"
                          title="Delete payment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Actions: Edit & Delete */}
          <div className="pt-3 border-t border-black/[0.04] dark:border-white/[0.08] flex items-center justify-between gap-2">
            {confirmDelete ? (
              <div className="flex items-center gap-2 w-full justify-between">
                <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
                  Confirm delete record?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-300/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteReceivable}
                    className="px-3.5 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Record</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenEdit(receivable)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-200/80 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold hover:bg-neutral-300/80 dark:hover:bg-neutral-700 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
