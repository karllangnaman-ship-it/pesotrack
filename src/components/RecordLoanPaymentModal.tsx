import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Coins,
  Wallet,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatPeso, roundPHP } from '../utils/currency';
import { ReconciledAccount } from '../utils/financeEngine';
import { ProviderLogo } from './ProviderLogo';

interface RecordLoanPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: ReconciledAccount;
}

export const RecordLoanPaymentModal: React.FC<RecordLoanPaymentModalProps> = ({
  isOpen,
  onClose,
  account,
}) => {
  const { reconciledAccounts, recordLoanPayment, showToast } = useFinance();

  const remainingBalance = Math.max(0, account.currentBalance);
  const monthlyInstallment =
    account.loanInfo?.customMonthlyPayment ||
    account.loanInfo?.monthlyInstallmentEstimate ||
    (account.loanInfo?.drawdowns && account.loanInfo.drawdowns.length > 0
      ? account.loanInfo.drawdowns
          .filter((d) => d.status === 'active' && d.remainingBalance > 0)
          .reduce((sum, d) => sum + d.monthlyPayment, 0)
      : 0);

  const dueDayText = account.loanInfo?.dueDay
    ? `Due on day ${account.loanInfo.dueDay} of each month`
    : 'Monthly repayment';

  const availableSources = reconciledAccounts.filter(
    (a) => !a.isLiability && a.id !== account.id && !a.archived
  );

  const initialAmount =
    monthlyInstallment > 0 && monthlyInstallment <= remainingBalance
      ? String(monthlyInstallment)
      : String(remainingBalance);

  const [amount, setAmount] = useState<string>(initialAmount);
  const [date, setDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
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
      setAmount(initialAmount);
      setDate(new Date().toISOString().slice(0, 10));
      setSourceAccountId(availableSources[0]?.id || '');
      setNotes('');
      setError(null);
      setIsSubmitting(false);
      setAllowAdvancePayment(false);
    }
  }, [isOpen, account.id, remainingBalance, initialAmount]);

  if (!isOpen) return null;

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

    if (numAmount > remainingBalance && remainingBalance > 0 && !allowAdvancePayment) {
      setError(
        `The payment amount (₱${numAmount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })}) exceeds the remaining balance (₱${remainingBalance.toLocaleString(
          'en-US',
          { minimumFractionDigits: 2 }
        )}). Check "Allow advance / payoff exceeding current balance" below to proceed.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = recordLoanPayment(account.id, {
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
      console.error('[RecordLoanPaymentModal] Payment error:', err);
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
                Record Loan Payment
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

        {/* Loan Balance & Installment Status Card */}
        <div className="p-3.5 rounded-2xl bg-[#F6F5F8] dark:bg-neutral-800/80 border border-black/[0.03] dark:border-white/[0.04] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              Remaining Balance:
            </span>
            <strong className="text-base sm:text-lg font-black text-black dark:text-white tabular-nums">
              {formatPeso(remainingBalance)}
            </strong>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] text-[11px]">
            <div>
              <span className="text-neutral-500 dark:text-neutral-400">Monthly Installment:</span>
              <div className="font-bold text-black dark:text-white tabular-nums">
                {monthlyInstallment > 0 ? formatPeso(monthlyInstallment) : 'Flexible'}
              </div>
            </div>
            <div className="text-right">
              <span className="text-neutral-500 dark:text-neutral-400">Due Day:</span>
              <div className="font-bold text-neutral-800 dark:text-neutral-200">
                {account.loanInfo?.dueDay ? `Day ${account.loanInfo.dueDay}` : 'Not set'}
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
          {/* Quick Preset Buttons */}
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
              Quick Select Amount:
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {monthlyInstallment > 0 && monthlyInstallment <= remainingBalance && (
                <button
                  type="button"
                  onClick={() => handleSelectAmount(monthlyInstallment)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:opacity-90 transition-opacity"
                >
                  Pay Installment ({formatPeso(monthlyInstallment, { compact: true })})
                </button>
              )}

              {remainingBalance > 0 && (
                <button
                  type="button"
                  onClick={() => handleSelectAmount(remainingBalance)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 transition-colors"
                >
                  Pay Full Balance ({formatPeso(remainingBalance, { compact: true })})
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
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold tabular-nums text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              />
            </div>
            {Number(amount) > remainingBalance && remainingBalance > 0 && (
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
                <span>Allow advance / payoff exceeding current balance</span>
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
              className="w-full px-3.5 py-2 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
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
                : 'Direct log: reduces loan liability without altering other wallets.'}
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
              placeholder="e.g. Loan amortization installment #3"
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
