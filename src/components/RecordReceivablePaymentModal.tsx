import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, DollarSign, Wallet, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { ReceivableRecord } from '../types/finance';
import { formatPeso, fromCentavos, toCentavos } from '../utils/currency';
import {
  getScheduledRepaymentInfo,
  ScheduledRepaymentInfo,
} from '../utils/loanCalculations';

interface RecordReceivablePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  receivable: ReceivableRecord | null;
}

const PAYMENT_METHODS = [
  'Cash',
  'GCash',
  'Maya',
  'Bank Transfer',
  'Other',
] as const;

export const RecordReceivablePaymentModal: React.FC<
  RecordReceivablePaymentModalProps
> = ({ isOpen, onClose, receivable }) => {
  const { recordReceivablePayment, reconciledAccounts } = useFinance();

  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<
    'Cash' | 'GCash' | 'Maya' | 'Bank Transfer' | 'Other'
  >('Cash');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter to active asset accounts (Wallets & Savings)
  const depositAccounts = reconciledAccounts.filter(
    (a) => !a.archived && (a.category === 'Wallet' || a.category === 'Savings')
  );

  // Compute scheduled repayment details from the selected lending transaction
  const scheduledInfo: ScheduledRepaymentInfo | null = useMemo(() => {
    if (!receivable) return null;
    return getScheduledRepaymentInfo(receivable);
  }, [receivable]);

  // When form opens, automatically prefill with scheduled monthly collection amount
  // Do NOT automatically record or save; wait for explicit user submission.
  useEffect(() => {
    if (receivable && isOpen) {
      const info = getScheduledRepaymentInfo(receivable);
      setAmount(info.amount > 0 ? String(info.amount) : '');
      setDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('Cash');
      setDestinationAccountId('');
      setNotes('');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [receivable, isOpen]);

  if (!isOpen || !receivable) return null;

  const parsedAmount = Math.max(0, parseFloat(amount) || 0);

  const handlePayFull = () => {
    setAmount(String(receivable.remainingBalance));
    setErrorMessage(null);
  };

  const handleUseScheduled = () => {
    if (!scheduledInfo || scheduledInfo.amount <= 0) return;
    setAmount(String(scheduledInfo.amount));
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    if (parsedAmount <= 0) {
      setErrorMessage('Please enter a payment amount greater than ₱0.00.');
      return;
    }

    if (parsedAmount > receivable.remainingBalance + 0.05) {
      setErrorMessage(
        `Amount cannot exceed remaining balance of ${formatPeso(
          receivable.remainingBalance
        )}.`
      );
      return;
    }

    setIsSubmitting(true);
    const ok = recordReceivablePayment({
      receivableId: receivable.id,
      amount: parsedAmount,
      date: date || new Date().toISOString().slice(0, 10),
      paymentMethod,
      destinationAccountId: destinationAccountId || undefined,
      notes: notes.trim() || undefined,
    });

    if (ok) {
      onClose();
    } else {
      setIsSubmitting(false);
    }
  };

  const isFullPayment = Math.abs(parsedAmount - receivable.remainingBalance) < 0.01;
  const isScheduledAmount =
    scheduledInfo &&
    scheduledInfo.amount > 0 &&
    Math.abs(parsedAmount - scheduledInfo.amount) < 0.01;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-[#FAF9FB] dark:bg-neutral-900 w-full max-w-md rounded-[24px] sm:rounded-[28px] flex flex-col max-h-[92vh] overflow-hidden shadow-2xl border border-black/[0.04] dark:border-white/[0.06]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4 border-b border-black/[0.04] dark:border-white/[0.06] shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-black dark:text-white">
              Record Repayment
            </h2>
            <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              From {receivable.personName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors shrink-0 text-black dark:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-xs text-red-700 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          {/* Balance Context Pill */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-800/70 border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-between text-xs gap-2">
            <div>
              <div className="text-neutral-500 dark:text-neutral-400">Remaining Amount Owed:</div>
              <div className="text-base sm:text-lg font-extrabold text-[#DC2626] tabular-nums mt-0.5">
                {formatPeso(receivable.remainingBalance)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {scheduledInfo &&
                scheduledInfo.isInstallment &&
                scheduledInfo.amount > 0 &&
                !isScheduledAmount && (
                  <button
                    type="button"
                    onClick={handleUseScheduled}
                    className="px-2.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
                  >
                    Scheduled ({formatPeso(scheduledInfo.amount)})
                  </button>
                )}
              <button
                type="button"
                onClick={handlePayFull}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  isFullPayment
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                    : 'bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200'
                }`}
              >
                Pay Full
              </button>
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Repayment Amount (₱) <span className="text-red-500">*</span>
              </label>
              {scheduledInfo && scheduledInfo.isInstallment && (
                <span className="text-[11px] font-semibold text-[#10B981] dark:text-[#34D399] truncate">
                  Installment #{scheduledInfo.installmentNumber} of {scheduledInfo.totalInstallments}
                  {scheduledInfo.isFinalInstallment ? ' (Final)' : ''}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="text-sm font-bold text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2">
                ₱
              </span>
              <input
                type="number"
                step="any"
                min="0.01"
                max={receivable.remainingBalance}
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full pl-8 pr-4 py-2.5 sm:py-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 text-xs sm:text-sm font-bold text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white tabular-nums"
              />
            </div>
            {scheduledInfo?.isPartialPaymentSoFar && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                ₱{scheduledInfo.alreadyPaidTowardInstallment?.toFixed(2)} previously paid toward this installment. ₱{scheduledInfo.amount.toFixed(2)} remaining due.
              </p>
            )}
            {scheduledInfo && !scheduledInfo.isInstallment && receivable.paymentSchedule === 'one_time' && (
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                One-time repayment schedule.
              </p>
            )}
          </div>

          {/* Payment Date & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Date Received
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 text-xs sm:text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value as 'Cash' | 'GCash' | 'Maya' | 'Bank Transfer' | 'Other'
                  )
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 text-xs sm:text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Deposit into Account */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-800/70 border border-neutral-200/80 dark:border-neutral-700/80 space-y-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-neutral-500" />
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Deposit to Account (Optional)
              </label>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Only deposits into your wallet or savings if selected. Leave empty to keep as an external/cash repayment.
            </p>
            <select
              value={destinationAccountId}
              onChange={(e) => setDestinationAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9FB] dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs sm:text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            >
              <option value="">None (External repayment / Cash kept in hand)</option>
              {depositAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.category}) — Balance: {formatPeso(acc.currentBalance)}
                </option>
              ))}
            </select>
            {destinationAccountId && (
              <div className="text-[11px] text-[#2E9E6B] font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Will add ₱{parsedAmount.toFixed(2)} to {depositAccounts.find(a => a.id === destinationAccountId)?.name}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 1st installment, handed cash personally"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 text-xs sm:text-sm text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-300/80 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#2E9E6B] text-white text-xs font-bold hover:bg-[#25855A] disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {isSubmitting ? 'Saving...' : 'Save Repayment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
