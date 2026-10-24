import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { BillDefinition, MonthlyBillEntry } from '../types/finance';
import {
  formatMonthLabel,
  formatPeso,
  formatTransactionDateTime,
} from '../utils/currency';
import { RecordBillPaymentModal } from './RecordBillPaymentModal';

interface BillDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: BillDefinition;
  monthKey: string;
  entry?: MonthlyBillEntry;
}

export const BillDetailModal: React.FC<BillDetailModalProps> = ({
  isOpen,
  onClose,
  bill,
  monthKey,
  entry,
}) => {
  const {
    deleteBill,
    updateMonthlyBillEntry,
    deleteBillPayment,
    revertBillPayment,
    monthlyBillEntries,
  } = useFinance();

  const entryKey = `${bill.id}_${monthKey}`;
  const liveEntry = monthlyBillEntries[entryKey] || entry;

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [editAmountValue, setEditAmountValue] = useState<string>(
    (liveEntry?.actualAmount ?? bill.defaultAmount).toString()
  );
  const [editDueDayValue, setEditDueDayValue] = useState<number>(
    liveEntry?.dueDay ?? bill.dueDay
  );

  if (!isOpen) return null;

  const billedAmount = liveEntry?.actualAmount ?? bill.defaultAmount;
  const payments = liveEntry?.payments || [];
  const totalPaid = liveEntry?.isPaidManually
    ? billedAmount
    : payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, billedAmount - totalPaid);

  const [year, month] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const effectiveDueDay = Math.min(liveEntry?.dueDay ?? bill.dueDay, daysInMonth);
  const dueDateStr = `${monthKey}-${String(effectiveDueDay).padStart(2, '0')}`;
  const todayStr = new Date().toISOString().slice(0, 10);
  const isOverdue = remaining > 0 && dueDateStr < todayStr;
  const isPaid = remaining <= 0;

  const displayName =
    bill.category === 'Other' && bill.customCategoryName
      ? bill.customCategoryName
      : bill.name;

  const handleSaveMonthOverride = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(editAmountValue);
    if (!Number.isNaN(parsed) && parsed > 0) {
      updateMonthlyBillEntry(bill.id, monthKey, {
        actualAmount: parsed,
        dueDay: editDueDayValue,
        dueDate: `${monthKey}-${String(editDueDayValue).padStart(2, '0')}`,
      });
      setIsEditingAmount(false);
    }
  };

  const handleDeleteBill = () => {
    if (
      window.confirm(
        `Are you sure you want to delete the bill "${displayName}"? Existing payment records will remain in your transaction history.`
      )
    ) {
      deleteBill(bill.id);
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-[28px] shadow-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                  {bill.category}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                  {bill.type === 'variable' ? 'Variable' : 'Fixed'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-black dark:text-white truncate">
                {displayName}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Status & Month Card */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">
                  Billing Period:
                </span>
                <span className="font-bold text-black dark:text-white">
                  {formatMonthLabel(monthKey)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Due Date:</span>
                <span className="font-semibold text-black dark:text-white flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  {dueDateStr} (Day {effectiveDueDay})
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-xs text-neutral-500">Payment Status:</span>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    isPaid
                      ? 'bg-emerald-500/10 text-[#2E9E6B]'
                      : isOverdue
                      ? 'bg-red-500/10 text-[#DC2626]'
                      : totalPaid > 0
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {isPaid
                    ? 'Paid'
                    : isOverdue
                    ? 'Overdue'
                    : totalPaid > 0
                    ? 'Partially Paid'
                    : 'Unpaid'}
                </span>
              </div>
            </div>

            {/* Financial Overview & Edit Amount for This Month */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Billed This Month:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold tabular-nums text-black dark:text-white">
                    {formatPeso(billedAmount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingAmount(!isEditingAmount)}
                    className="p-1 rounded-md text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    title="Change billed amount for this specific month"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isEditingAmount && (
                <form
                  onSubmit={handleSaveMonthOverride}
                  className="pt-2 pb-1 space-y-2 border-t border-neutral-100 dark:border-neutral-700"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-500">
                        Month Amount (₱)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={editAmountValue}
                        onChange={(e) => setEditAmountValue(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-500">
                        Due Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={editDueDayValue}
                        onChange={(e) =>
                          setEditDueDayValue(parseInt(e.target.value, 10) || 1)
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingAmount(false)}
                      className="px-2.5 py-1 text-[11px] rounded-md text-neutral-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-[11px] font-bold rounded-md bg-neutral-950 dark:bg-white text-white dark:text-neutral-950"
                    >
                      Save Override
                    </button>
                  </div>
                </form>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Total Paid:</span>
                <span className="font-bold tabular-nums text-[#2E9E6B]">
                  {formatPeso(totalPaid)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-100 dark:border-neutral-700">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Remaining Balance:
                </span>
                <span className="text-base font-bold tabular-nums text-[#DC2626]">
                  {formatPeso(remaining)}
                </span>
              </div>
            </div>

            {/* Payment History for this Month */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-black dark:text-white">
                Payment History ({formatMonthLabel(monthKey)})
              </h3>
              {payments.length === 0 ? (
                <div className="p-3 text-center rounded-xl bg-neutral-50 dark:bg-neutral-800/40 text-xs text-neutral-400">
                  No payments recorded for this month yet.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 flex items-center justify-between gap-2 bg-neutral-50/50 dark:bg-neutral-800/30 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-black dark:text-white">
                          {formatPeso(p.amount)}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {p.date} • {p.paymentMethod}
                          {p.sourceAccountId ? ' (Deducted from Wallet)' : ''}
                        </div>
                        {p.notes && (
                          <div className="text-[10px] text-neutral-500 italic mt-0.5">
                            {p.notes}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Undo this payment of ${formatPeso(
                                p.amount
                              )} for "${displayName}"? This will revert the payment and restore your wallet balance.`
                            )
                          ) {
                            revertBillPayment(bill.id, monthKey, p.id);
                          }
                        }}
                        className="px-2 py-1 rounded-lg text-neutral-500 hover:text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-1 text-[11px] font-bold shrink-0"
                        title="Bawiin payment / Undo payment"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-red-600 dark:text-red-400">Undo</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bill Details Notes */}
            {bill.notes && (
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 text-xs text-neutral-600 dark:text-neutral-400">
                <span className="font-semibold text-neutral-900 dark:text-neutral-200">
                  Notes:{' '}
                </span>
                {bill.notes}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              {remaining > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsRecordModalOpen(true)}
                    className="w-full py-2.5 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Record Payment for {formatMonthLabel(monthKey)}</span>
                  </button>
                  {totalPaid > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Undo all recorded payments for "${displayName}" for ${formatMonthLabel(
                              monthKey
                            )}? This will revert this bill to completely unsettled and restore your wallet balance.`
                          )
                        ) {
                          revertBillPayment(bill.id, monthKey);
                        }
                      }}
                      className="w-full py-2 rounded-full border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Undo All Payments for this Month</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <div className="p-2.5 rounded-full bg-emerald-500/10 text-[#2E9E6B] text-xs font-bold text-center flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Fully Paid for {formatMonthLabel(monthKey)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Undo payment and revert "${displayName}" to unsettled for ${formatMonthLabel(
                            monthKey
                          )}? This will restore your wallet balance.`
                        )
                      ) {
                        revertBillPayment(bill.id, monthKey);
                      }
                    }}
                    className="w-full py-2.5 rounded-full border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Undo Payment & Revert to Unsettled</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeleteBill}
                  className="flex-1 py-2 rounded-full border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Bill</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isRecordModalOpen && (
        <RecordBillPaymentModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          onSuccess={() => {
            setIsRecordModalOpen(false);
            onClose(); // Automatically close bill detail modal and return to calendar!
          }}
          bill={bill}
          monthKey={monthKey}
          entry={liveEntry}
        />
      )}
    </>
  );
};
