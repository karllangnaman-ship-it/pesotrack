import React, { useMemo, useState } from 'react';
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
import { formatPeso, roundPHP, subPHP } from '../utils/currency';
import { ReconciledAccount } from '../utils/financeEngine';
import { ProviderLogo } from './ProviderLogo';

import { formatFriendlyDate } from '../utils/loanCalculations';

export interface PayCreditBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: ReconciledAccount;
  initialAmount?: number;
  initialDate?: string;
  dueDate?: string;
}

export const PayCreditBillModal: React.FC<PayCreditBillModalProps> = ({
  isOpen,
  onClose,
  account,
  initialAmount,
  initialDate,
  dueDate,
}) => {
  const { reconciledAccounts, payCreditBill, revertAccountPayment, state, showToast } =
    useFinance();

  const outstandingBalance = Math.max(0, account.currentBalance);
  const creditLimit = account.creditInfo?.creditLimit || 0;
  const availableCredit = account.availableCredit !== undefined
    ? account.availableCredit
    : Math.max(0, subPHP(creditLimit, outstandingBalance));

  const recentPayments = useMemo(() => {
    return state.transactions
      .filter(
        (t) =>
          (t.type === 'transfer' && t.destinationAccountId === account.id) ||
          (t.accountId === account.id &&
            (t.category === 'Credit Card Payment' || t.category === 'Credit Payment')) ||
          (t.accountId === account.id &&
            t.type === 'adjustment' &&
            t.adjustmentSign === 'negative')
      )
      .slice(0, 4);
  }, [state.transactions, account.id]);

  // Minimum or installment estimate
  const installmentEstimate =
    account.creditInfo?.customMonthlyPayment ||
    account.creditInfo?.monthlyInstallmentEstimate ||
    (account.creditInfo?.purchases && account.creditInfo.purchases.length > 0
      ? account.creditInfo.purchases
          .filter((p) => p.status === 'active' && p.remainingBalance > 0)
          .reduce((sum, p) => sum + p.monthlyPayment, 0)
      : undefined);

  const effectiveInstallment =
    initialAmount && initialAmount > 0 && (initialAmount <= outstandingBalance || outstandingBalance === 0)
      ? initialAmount
      : installmentEstimate;

  // Available funding sources (Wallets and Savings)
  const availableSources = reconciledAccounts.filter(
    (a) => !a.isLiability && a.id !== account.id && !a.archived
  );

  const defaultAmountToPrefill =
    effectiveInstallment !== undefined && effectiveInstallment > 0 && (effectiveInstallment <= outstandingBalance || outstandingBalance === 0)
      ? String(effectiveInstallment)
      : outstandingBalance > 0
      ? String(outstandingBalance)
      : '0';

  const [amount, setAmount] = useState<string>(defaultAmountToPrefill);
  const [date, setDate] = useState<string>(
    initialDate || new Date().toISOString().slice(0, 10)
  );
  const [sourceAccountId, setSourceAccountId] = useState<string>(
    availableSources[0]?.id || ''
  );
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [allowAdvancePayment, setAllowAdvancePayment] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      setAmount(defaultAmountToPrefill);
      setDate(initialDate || new Date().toISOString().slice(0, 10));
      setSourceAccountId(availableSources[0]?.id || '');
      setNotes('');
      setError(null);
      setIsSubmitting(false);
      setAllowAdvancePayment(false);
    }
  }, [isOpen, account.id, outstandingBalance, defaultAmountToPrefill, initialDate]);

  if (!isOpen) return null;

  const dueDayText = dueDate
    ? `Due on ${formatFriendlyDate(dueDate)}`
    : account.creditInfo?.dueDay
    ? `Due on day ${account.creditInfo.dueDay} of each month`
    : 'Standard billing cycle';

  const handleSelectAmount = (val: number) => {
    setError(null);
    setAmount(String(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    const numAmount = Number(amount);

    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setError('Please enter a payment amount greater than ₱0.00');
      return;
    }

    if (numAmount > outstandingBalance && outstandingBalance > 0 && !allowAdvancePayment) {
      setError(
        `The payment amount (₱${numAmount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })}) exceeds the current outstanding balance (₱${outstandingBalance.toLocaleString(
          'en-US',
          { minimumFractionDigits: 2 }
        )}). Check "Allow advance payment" below if you want to proceed.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = payCreditBill(account.id, {
        amount: roundPHP(numAmount),
        date,
        sourceAccountId: sourceAccountId || undefined,
        notes: notes.trim() || undefined,
      });

      if (ok) {
        onClose();
      } else {
        setError('Failed to record payment. Please review your account details.');
      }
    } catch (err: unknown) {
      console.error('[PayCreditBillModal] Payment error:', err);
      setError('An unexpected error occurred while processing the payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto border border-black/[0.06] dark:border-white/[0.08]">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5 min-w-0">
            <ProviderLogo
              providerId={account.providerId}
              name={account.name}
              customColor={account.customColor}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-black dark:text-white truncate">
                Pay Credit Bill
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                {account.name} · {dueDayText}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Financial Status Card */}
        <div className="p-3.5 rounded-2xl bg-[#F6F5F8] dark:bg-neutral-800/80 border border-black/[0.03] dark:border-white/[0.04] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              Outstanding Bill:
            </span>
            <strong className="text-base sm:text-lg font-black text-black dark:text-white tabular-nums">
              {formatPeso(outstandingBalance)}
            </strong>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] text-[11px]">
            <div>
              <span className="text-neutral-500 dark:text-neutral-400">Credit Limit:</span>
              <div className="font-bold text-black dark:text-white tabular-nums">
                {formatPeso(creditLimit)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-neutral-500 dark:text-neutral-400">Available Credit:</span>
              <div className="font-bold text-[#2E9E6B] tabular-nums">
                {formatPeso(availableCredit)}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Repayments with Undo / Revert to Unsettled Option */}
        {recentPayments.length > 0 && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
            <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center justify-between">
              <span>Recent Repayments ({recentPayments.length})</span>
              <span className="text-[10px] font-normal">Misclicked? Click Undo to revert</span>
            </div>
            <div className="space-y-1.5">
              {recentPayments.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between text-xs bg-white/70 dark:bg-neutral-800/70 p-2 rounded-xl"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="font-bold text-black dark:text-white tabular-nums">
                      {formatPeso(tx.amount)}
                    </div>
                    <div className="text-[10px] text-neutral-500 truncate">
                      {formatFriendlyDate(tx.dateTime.slice(0, 10))} · {tx.merchantOrTitle}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      revertAccountPayment(account.id, tx.id);
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
          {/* Quick Preset Buttons */}
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
              Quick Select Amount:
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {effectiveInstallment && effectiveInstallment > 0 && effectiveInstallment <= outstandingBalance && (
                <button
                  type="button"
                  onClick={() => handleSelectAmount(effectiveInstallment)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:opacity-90 transition-opacity"
                >
                  Pay Installment / Statement Due ({formatPeso(effectiveInstallment, { compact: true })})
                </button>
              )}

              {outstandingBalance > 0 && (
                <button
                  type="button"
                  onClick={() => handleSelectAmount(outstandingBalance)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 transition-colors"
                >
                  Pay Full Balance ({formatPeso(outstandingBalance, { compact: true })})
                </button>
              )}
            </div>
          </div>

          {/* Payment Amount */}
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
                placeholder="0.00"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold tabular-nums text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            {Number(amount) > outstandingBalance && outstandingBalance > 0 && (
              <label className="mt-2 flex items-center gap-2 cursor-pointer text-xs text-neutral-600 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={allowAdvancePayment}
                  onChange={(e) => {
                    setError(null);
                    setAllowAdvancePayment(e.target.checked);
                  }}
                  className="rounded text-neutral-900 focus:ring-neutral-900 dark:focus:ring-white w-4 h-4 accent-neutral-900 dark:accent-white"
                />
                <span>Allow advance payment exceeding current bill</span>
              </label>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Payment Date *
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              />
            </div>
          </div>

          {/* Payment Method / Source Account */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Payment Method / Source Wallet
            </label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            >
              <option value="">Direct Payment (No wallet balance deduction)</option>
              {availableSources.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatPeso(w.currentBalance)})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-neutral-400 mt-1">
              {sourceAccountId
                ? 'Automatically records a linked payment transfer from this wallet.'
                : 'Direct log: updates credit balance and payment history without altering other wallets.'}
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
              placeholder="e.g. Paid online, Reference #123456"
              className="w-full px-3.5 py-2 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          {/* Actions */}
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
