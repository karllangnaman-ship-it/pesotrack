import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CreditCard,
  RotateCcw,
  Wallet,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { CreditPurchaseOrDrawdown } from '../types/finance';
import { formatPeso, roundPHP } from '../utils/currency';
import { ReconciledAccount } from '../utils/financeEngine';
import { formatFriendlyDate } from '../utils/loanCalculations';
import { ProviderLogo } from './ProviderLogo';

export interface RecordPurchasePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: CreditPurchaseOrDrawdown;
  accountId: string;
  accountName?: string;
  providerId?: string;
  customColor?: string;
  category?: 'Credit' | 'Loans';
  initialAmount?: number;
  initialDate?: string;
  dueDate?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  wallets?: ReconciledAccount[];
  onRecord?: (pay: {
    amount: number;
    date: string;
    notes?: string;
    sourceAccountId?: string;
  }) => void;
}

export const RecordPurchasePaymentModal: React.FC<RecordPurchasePaymentModalProps> = ({
  isOpen,
  onClose,
  purchase,
  accountId,
  accountName,
  providerId,
  customColor,
  category = 'Credit',
  initialAmount,
  initialDate,
  dueDate,
  installmentNumber,
  totalInstallments,
  wallets: propWallets,
  onRecord,
}) => {
  const { reconciledAccounts, recordPurchasePayment, revertAccountPayment } = useFinance();

  const availableWallets =
    propWallets ||
    reconciledAccounts.filter(
      (a) => !a.isLiability && a.id !== accountId && !a.archived
    );

  const installmentAmount =
    initialAmount && initialAmount > 0 && initialAmount <= (purchase.remainingBalance || initialAmount)
      ? initialAmount
      : purchase.monthlyPayment > 0
      ? purchase.monthlyPayment
      : Math.round(purchase.totalRepayment / Math.max(1, purchase.termMonths || 1));

  const defaultAmountToPrefill =
    initialAmount !== undefined && initialAmount > 0 && (initialAmount <= purchase.remainingBalance || purchase.remainingBalance === 0)
      ? String(initialAmount)
      : installmentAmount > 0 && installmentAmount <= purchase.remainingBalance
      ? String(installmentAmount)
      : String(purchase.remainingBalance > 0 ? purchase.remainingBalance : 0);

  const [amount, setAmount] = useState<string>(defaultAmountToPrefill);
  const [date, setDate] = useState<string>(
    initialDate || new Date().toISOString().slice(0, 10)
  );
  const [sourceAccountId, setSourceAccountId] = useState<string>(
    availableWallets[0]?.id || ''
  );
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [allowOverpay, setAllowOverpay] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(defaultAmountToPrefill);
      setDate(initialDate || new Date().toISOString().slice(0, 10));
      setSourceAccountId(availableWallets[0]?.id || '');
      setNotes('');
      setError(null);
      setIsSubmitting(false);
      setAllowOverpay(false);
    }
  }, [isOpen, purchase.id, purchase.remainingBalance, defaultAmountToPrefill, initialDate]);

  if (!isOpen) return null;

  const handleSelectAmount = (val: number) => {
    setError(null);
    setAmount(String(val));
  };

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
      const payData = {
        amount: roundPHP(num),
        date,
        notes: notes.trim() || undefined,
        sourceAccountId: sourceAccountId || undefined,
      };

      if (onRecord) {
        onRecord(payData);
      } else {
        recordPurchasePayment(accountId, purchase.id, payData);
      }
      onClose();
    } catch (err) {
      console.error('[RecordPurchasePaymentModal] submit error:', err);
      setError('Failed to record payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoan = category === 'Loans';
  const modalTitle = isLoan ? 'Record Loan Installment' : 'Record Credit Installment';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-[24px] max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-black/[0.06] dark:border-white/[0.08] max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5 min-w-0 mr-2">
            <ProviderLogo
              providerId={providerId || ''}
              name={accountName || purchase.name}
              customColor={customColor}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold text-black dark:text-white truncate">
                {modalTitle}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                {purchase.name}
                {accountName ? ` · ${accountName}` : ''}
                {installmentNumber
                  ? ` · #${installmentNumber}${totalInstallments ? ' of ' + totalInstallments : ''}`
                  : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
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
              <span className="text-neutral-500 dark:text-neutral-400">Monthly Installment:</span>
              <div className="font-bold text-black dark:text-white tabular-nums">
                {installmentAmount > 0 ? `${formatPeso(installmentAmount)} / mo` : 'Flexible'}
              </div>
            </div>
            <div className="text-right">
              <span className="text-neutral-500 dark:text-neutral-400">
                {dueDate ? 'Due Date:' : 'Due Day:'}
              </span>
              <div className="font-bold text-neutral-800 dark:text-neutral-200">
                {dueDate
                  ? formatFriendlyDate(dueDate)
                  : `Day ${purchase.dueDay || 15} of month`}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Payments with Undo / Revert to Unsettled Option */}
        {purchase.payments && purchase.payments.length > 0 && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
            <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center justify-between">
              <span>Recent Payments ({purchase.payments.length})</span>
              <span className="text-[10px] font-normal">Misclicked? Click Undo to revert</span>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {purchase.payments.slice(-3).reverse().map((pay) => (
                <div
                  key={pay.id}
                  className="flex items-center justify-between text-xs bg-white/70 dark:bg-neutral-800/70 p-2 rounded-xl"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="font-bold text-black dark:text-white tabular-nums">
                      {formatPeso(pay.amount)}
                    </div>
                    <div className="text-[10px] text-neutral-500 truncate">
                      {formatFriendlyDate(pay.date)} {pay.notes ? `· ${pay.notes}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      revertAccountPayment(accountId, pay.id, purchase.id);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-lg border border-red-500/20 text-red-600 dark:text-red-400 text-[11px] font-bold hover:bg-red-500/10 active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                    title="Bawiin payment / Revert to unsettled"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Undo</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  onClick={() => handleSelectAmount(installmentAmount)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:opacity-90 transition-opacity"
                >
                  Pay Installment ({formatPeso(installmentAmount, { compact: true })})
                </button>
              )}

              {purchase.remainingBalance > 0 && (
                <button
                  type="button"
                  onClick={() => handleSelectAmount(purchase.remainingBalance)}
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
              {availableWallets.map((w) => (
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
              placeholder="e.g. October installment payment"
              className="w-full px-3.5 py-2 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-black/[0.04] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#174F32] hover:bg-[#123E27] dark:bg-[#83C95B] dark:hover:bg-[#72B44E] text-white dark:text-[#174F32] transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
