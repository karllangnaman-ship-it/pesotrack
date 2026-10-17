import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, DollarSign, Wallet, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { BillDefinition, MonthlyBillEntry } from '../types/finance';
import { formatMonthLabel, formatPeso, fromCentavos, toCentavos } from '../utils/currency';

interface RecordBillPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: BillDefinition;
  monthKey: string; // YYYY-MM
  entry?: MonthlyBillEntry;
}

export const RecordBillPaymentModal: React.FC<RecordBillPaymentModalProps> = ({
  isOpen,
  onClose,
  bill,
  monthKey,
  entry,
}) => {
  const { reconciledAccounts, recordBillPayment } = useFinance();

  const billedAmount = entry?.actualAmount ?? bill.defaultAmount;
  const alreadyPaid = entry?.payments?.reduce((s, p) => s + p.amount, 0) || 0;
  const remaining = Math.max(0, billedAmount - alreadyPaid);

  const [amount, setAmount] = useState<string>(remaining > 0 ? remaining.toString() : billedAmount.toString());
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<
    'Cash' | 'GCash' | 'Maya' | 'Bank Transfer' | 'Other'
  >('GCash');
  const [deductWallet, setDeductWallet] = useState<boolean>(false);
  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Available cash/savings accounts for deduction
  const assetAccounts = reconciledAccounts.filter(
    (a) => !a.archived && (a.category === 'Wallet' || a.category === 'Savings')
  );

  const displayName = bill.category === 'Other' && bill.customCategoryName
    ? bill.customCategoryName
    : bill.name;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payAmt = parseFloat(amount);
    if (Number.isNaN(payAmt) || payAmt <= 0) {
      setError('Please enter a valid payment amount greater than ₱0.00.');
      return;
    }

    if (deductWallet && !sourceAccountId) {
      setError('Please select which wallet or savings account to deduct.');
      return;
    }

    const success = recordBillPayment({
      billId: bill.id,
      monthKey,
      amount: payAmt,
      date,
      paymentMethod,
      sourceAccountId: deductWallet && sourceAccountId ? sourceAccountId : undefined,
      notes: notes.trim() || undefined,
    });

    if (success) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-[28px] shadow-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-black dark:text-white">
              Record Bill Payment
            </h2>
            <p className="text-xs text-neutral-500">
              {displayName} • {formatMonthLabel(monthKey)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount Overview Card */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200/80 dark:border-neutral-700/60 space-y-2">
            <div className="flex justify-between items-center text-xs text-neutral-500">
              <span>Billed Amount:</span>
              <span className="font-bold tabular-nums text-black dark:text-white">
                {formatPeso(billedAmount)}
              </span>
            </div>
            {alreadyPaid > 0 && (
              <div className="flex justify-between items-center text-xs text-neutral-500">
                <span>Already Paid:</span>
                <span className="font-bold tabular-nums text-[#2E9E6B]">
                  {formatPeso(alreadyPaid)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-neutral-200/60 dark:border-neutral-700/60">
              <span className="text-neutral-700 dark:text-neutral-300">Remaining Balance:</span>
              <span className="text-sm tabular-nums text-[#DC2626]">
                {formatPeso(remaining)}
              </span>
            </div>
          </div>

          {/* Payment Amount Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Payment Amount (₱)
              </label>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(remaining.toString())}
                  className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white underline"
                >
                  Pay Remaining ({formatPeso(remaining)})
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">
                ₱
              </span>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 text-sm font-bold tabular-nums text-black dark:text-white focus:outline-hidden focus:ring-2 focus:ring-neutral-950 dark:focus:ring-white"
              />
            </div>
          </div>

          {/* Payment Date & Method */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 text-xs font-medium text-black dark:text-white focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Payment Channel
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 text-xs font-medium text-black dark:text-white focus:outline-hidden"
              >
                <option value="GCash">GCash</option>
                <option value="Maya">Maya</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Optional Wallet Deduction (Strict Rule: Only deducts if explicitly selected and confirmed) */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-neutral-500" />
                <span className="text-xs font-bold text-black dark:text-white">
                  Deduct from My Wallet/Bank
                </span>
              </div>
              <input
                type="checkbox"
                checked={deductWallet}
                onChange={(e) => {
                  setDeductWallet(e.target.checked);
                  if (e.target.checked && !sourceAccountId && assetAccounts.length > 0) {
                    setSourceAccountId(assetAccounts[0].id);
                  }
                }}
                className="w-4 h-4 rounded-sm accent-black dark:accent-white cursor-pointer"
              />
            </div>

            {deductWallet && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                  Select Source Account:
                </label>
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-black dark:text-white"
                >
                  <option value="">-- Choose Account --</option>
                  {assetAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.category}) — {formatPeso(acc.currentBalance)}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-neutral-400">
                  Creates a recorded expense transaction and automatically updates your account balance.
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Reference / Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Reference No., Paid via 7-Eleven or app"
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 text-xs text-black dark:text-white focus:outline-hidden"
            />
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Confirm Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
