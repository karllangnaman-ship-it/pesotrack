import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, Trash2, X } from 'lucide-react';
import { ProviderLogo } from './ProviderLogo';
import { useFinance } from '../context/FinanceContext';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TransactionRecord,
  TransactionType,
} from '../types/finance';
import {
  formatPeso,
  toLocalDatetimeInputValue,
} from '../utils/currency';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TransactionType;
  initialAccountId?: string;
  initialDestinationAccountId?: string;
  initialAmount?: number | string;
  initialCategory?: string;
  editingTransaction?: TransactionRecord | null;
}

const TX_TYPES: { id: TransactionType; label: string }[] = [
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'adjustment', label: 'Adjust' },
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  initialType = 'expense',
  initialAccountId,
  initialDestinationAccountId,
  initialAmount,
  initialCategory,
  editingTransaction = null,
}) => {
  const {
    reconciledAccounts,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    state,
  } = useFinance();

  const activeAccounts = reconciledAccounts.filter((a) => !a.archived);

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [category, setCategory] = useState<string>(initialCategory || EXPENSE_CATEGORIES[0]);
  const [merchantOrTitle, setMerchantOrTitle] = useState('');
  const [dateTime, setDateTime] = useState(toLocalDatetimeInputValue());
  const [notes, setNotes] = useState('');
  const [adjustmentSign, setAdjustmentSign] = useState<'positive' | 'negative'>(
    'positive'
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);

    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(String(editingTransaction.amount));
      setAccountId(editingTransaction.accountId);
      setDestinationAccountId(editingTransaction.destinationAccountId || '');
      setCategory(editingTransaction.category);
      setMerchantOrTitle(editingTransaction.merchantOrTitle);
      setDateTime(toLocalDatetimeInputValue(editingTransaction.dateTime));
      setNotes(editingTransaction.notes || '');
      setAdjustmentSign(editingTransaction.adjustmentSign || 'positive');
    } else {
      setType(initialType);
      setAmount(initialAmount ? String(initialAmount) : '');
      const defaultSource =
        initialAccountId || activeAccounts[0]?.id || reconciledAccounts[0]?.id || '';
      setAccountId(defaultSource);

      const defaultDest =
        initialDestinationAccountId ||
        activeAccounts.find((a) => a.id !== defaultSource)?.id ||
        '';
      setDestinationAccountId(defaultDest);

      if (initialCategory) {
        setCategory(initialCategory);
      } else if (initialType === 'income') {
        setCategory(INCOME_CATEGORIES[0]);
      } else if (initialType === 'transfer') {
        const destAcc = reconciledAccounts.find((a) => a.id === defaultDest);
        if (destAcc?.category === 'Credit') setCategory('Credit Payment');
        else if (destAcc?.category === 'Loans') setCategory('Loan Payment');
        else setCategory('Transfer');
      } else if (initialType === 'adjustment') {
        setCategory('Balance Adjustment');
      } else {
        setCategory(EXPENSE_CATEGORIES[0]);
      }

      setMerchantOrTitle('');
      setDateTime(toLocalDatetimeInputValue());
      setNotes('');
      setAdjustmentSign('positive');
    }
  }, [
    isOpen,
    initialType,
    initialAccountId,
    initialDestinationAccountId,
    initialAmount,
    initialCategory,
    editingTransaction,
  ]);

  if (!isOpen) return null;

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    if (nextType === 'income') {
      setCategory(INCOME_CATEGORIES[0]);
    } else if (nextType === 'expense') {
      setCategory(EXPENSE_CATEGORIES[0]);
    } else if (nextType === 'transfer') {
      const destAcc = reconciledAccounts.find((a) => a.id === destinationAccountId);
      if (destAcc?.category === 'Credit') setCategory('Credit Payment');
      else if (destAcc?.category === 'Loans') setCategory('Loan Payment');
      else setCategory('Transfer');
      if (!destinationAccountId || destinationAccountId === accountId) {
        const other = reconciledAccounts.find((a) => a.id !== accountId);
        if (other) setDestinationAccountId(other.id);
      }
    } else {
      setCategory('Balance Adjustment');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter an amount greater than ₱0.00.');
      return;
    }

    if (!accountId) {
      setFormError('Please select an account.');
      return;
    }

    if (type === 'transfer') {
      if (!destinationAccountId) {
        setFormError('Please select a destination account.');
        return;
      }
      if (accountId === destinationAccountId) {
        setFormError('Source and destination accounts must be different.');
        return;
      }
    }

    const defaultTitle =
      merchantOrTitle.trim() ||
      (type === 'transfer'
        ? (() => {
            const dest = reconciledAccounts.find(
              (a) => a.id === destinationAccountId
            );
            if (dest?.category === 'Credit') return `Payment to ${dest.name}`;
            if (dest?.category === 'Loans') return `Loan Payment - ${dest.name}`;
            return `Transfer to ${dest?.name || 'Account'}`;
          })()
        : category);

    const payload = {
      type,
      amount: parsedAmount,
      accountId,
      destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
      category,
      merchantOrTitle: defaultTitle,
      dateTime: new Date(dateTime).toISOString(),
      notes,
      adjustmentSign: type === 'adjustment' ? adjustmentSign : undefined,
    };

    if (editingTransaction) {
      const ok = updateTransaction(editingTransaction.id, payload);
      if (ok) onClose();
    } else {
      const created = addTransaction(payload);
      if (created) onClose();
    }
  };

  const selectedSourceAcc = reconciledAccounts.find((a) => a.id === accountId);
  const selectedDestAcc = reconciledAccounts.find(
    (a) => a.id === destinationAccountId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-[#FAF9F5] dark:bg-[#15221B] w-full max-w-lg rounded-[24px] sm:rounded-[28px] flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden shadow-2xl border border-[#E5E1D8] dark:border-[#223528]">
        {/* Header */}
        <div className="relative flex items-center justify-center px-4 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4 shrink-0 border-b border-[#E5E1D8] dark:border-[#223528]">
          <h2 className="text-lg sm:text-[20px] font-bold text-[#252923] dark:text-[#E8EFE9]">
            {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 sm:right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-[#EAE6DD] dark:hover:bg-[#1D2D24] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-[#252923] dark:text-[#E8EFE9]" strokeWidth={2.5} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4"
        >
          {/* Transaction Type Tabs */}
          <div className="bg-[#EAE6DD] dark:bg-[#1D2D24] p-1 sm:p-1.5 rounded-[16px] sm:rounded-[18px] grid grid-cols-4 gap-1">
            {TX_TYPES.map((t) => {
              const active = type === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTypeChange(t.id)}
                  className={`py-2 px-1 rounded-[12px] sm:rounded-[13px] text-xs sm:text-[13px] font-bold transition-all text-center truncate cursor-pointer ${
                    active
                      ? 'bg-[#174F32] text-white dark:bg-[#83C95B] dark:text-[#0C1510] shadow-2xs'
                      : 'text-[#777D75] dark:text-[#8FA095] hover:text-[#252923] dark:hover:text-[#E8EFE9]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs font-medium text-red-700 dark:text-red-300">
              {formError}
            </div>
          )}

          {/* Amount Card */}
          <div className="bg-white dark:bg-[#1D2D24] rounded-[20px] sm:rounded-[22px] p-3.5 sm:p-4 border border-[#E5E1D8] dark:border-[#223528]">
            <label className="block text-[11px] sm:text-xs font-semibold text-[#777D75] dark:text-[#8FA095] mb-1">
              Amount (PHP)
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`text-2xl sm:text-3xl font-extrabold ${
                  type === 'income' ||
                  (type === 'adjustment' && adjustmentSign === 'positive')
                    ? 'text-[#174F32] dark:text-[#83C95B]'
                    : type === 'expense' ||
                      (type === 'adjustment' && adjustmentSign === 'negative')
                    ? 'text-[#DC2626]'
                    : 'text-[#252923] dark:text-[#E8EFE9]'
                }`}
              >
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full text-2xl sm:text-3xl font-extrabold text-[#252923] dark:text-[#E8EFE9] bg-transparent focus:outline-none tabular-nums"
              />
            </div>
          </div>

          {/* Adjustment Sign Toggle */}
          {type === 'adjustment' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentSign('positive')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-colors ${
                  adjustmentSign === 'positive'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 text-emerald-700 dark:text-emerald-300'
                    : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600'
                }`}
              >
                + Add / Inflow
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentSign('negative')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-colors ${
                  adjustmentSign === 'negative'
                    ? 'bg-red-50 dark:bg-red-950/50 border-red-600 text-red-700 dark:text-red-300'
                    : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600'
                }`}
              >
                − Deduct / Outflow
              </button>
            </div>
          )}

          {/* Account Selector(s) */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                {type === 'transfer' ? 'From Source Account *' : 'Account *'}
              </label>
              <div className="flex items-center gap-2">
                {selectedSourceAcc && (
                  <ProviderLogo
                    providerId={selectedSourceAcc.providerId}
                    name={selectedSourceAcc.name}
                    customColor={selectedSourceAcc.customColor}
                    size="sm"
                  />
                )}
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs sm:text-sm font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                >
                  {reconciledAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.category}) —{' '}
                      {formatPeso(acc.currentBalance, {
                        hide: state.settings.hideBalances,
                      })}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {type === 'transfer' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                    To Destination Account *
                  </label>
                  <ArrowRightLeft className="w-3.5 h-3.5 text-neutral-400" />
                </div>
                <div className="flex items-center gap-2">
                  {selectedDestAcc && (
                    <ProviderLogo
                      providerId={selectedDestAcc.providerId}
                      name={selectedDestAcc.name}
                      customColor={selectedDestAcc.customColor}
                      size="sm"
                    />
                  )}
                  <select
                    value={destinationAccountId}
                    onChange={(e) => {
                      const nextDestId = e.target.value;
                      setDestinationAccountId(nextDestId);
                      const dest = reconciledAccounts.find(
                        (a) => a.id === nextDestId
                      );
                      if (dest?.category === 'Credit') setCategory('Credit Payment');
                      else if (dest?.category === 'Loans') setCategory('Loan Payment');
                      else if (dest?.category === 'Savings')
                        setCategory('Savings Contribution');
                      else setCategory('Transfer');
                    }}
                    className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs sm:text-sm font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                  >
                    <option value="">Select destination account...</option>
                    {reconciledAccounts
                      .filter((acc) => acc.id !== accountId)
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.category}) —{' '}
                          {acc.isLiability ? 'Owed: ' : ''}
                          {formatPeso(acc.currentBalance, {
                            hide: state.settings.hideBalances,
                          })}
                        </option>
                      ))}
                  </select>
                </div>

                {selectedSourceAcc && selectedDestAcc && (
                  <div className="mt-2 p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/70 text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-300">
                    {selectedDestAcc.category === 'Credit' ? (
                      <span>
                        Paying <strong>{selectedDestAcc.name}</strong> from{' '}
                        <strong>{selectedSourceAcc.name}</strong> reduces liability
                        without inflating expenses.
                      </span>
                    ) : selectedDestAcc.category === 'Loans' ? (
                      <span>
                        Recording loan repayment to{' '}
                        <strong>{selectedDestAcc.name}</strong> from{' '}
                        <strong>{selectedSourceAcc.name}</strong>.
                      </span>
                    ) : (
                      <span>
                        Moving funds from <strong>{selectedSourceAcc.name}</strong>{' '}
                        to <strong>{selectedDestAcc.name}</strong>.
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Category Chips */}
          {(type === 'expense' || type === 'income') && (
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-0.5">
                {(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(
                  (cat) => {
                    const isSelected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                            : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* Description & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                Merchant / Description
              </label>
              <input
                type="text"
                value={merchantOrTitle}
                onChange={(e) => setMerchantOrTitle(e.target.value)}
                placeholder="e.g. Jollibee, Salary"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs sm:text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                Date & Time
              </label>
              <input
                type="datetime-local"
                required
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1D2D24] border border-[#E5E1D8] dark:border-[#223528] text-xs sm:text-sm text-[#252923] dark:text-[#E8EFE9] focus:outline-none focus:ring-2 focus:ring-[#174F32]"
              />
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#777D75] dark:text-[#8FA095] mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reference, receipt info, memo..."
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#1D2D24] border border-[#E5E1D8] dark:border-[#223528] text-xs sm:text-sm text-[#252923] dark:text-[#E8EFE9] focus:outline-none focus:ring-2 focus:ring-[#174F32]"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 pt-2">
            {editingTransaction && (
              <button
                type="button"
                onClick={() => {
                  deleteTransaction(editingTransaction.id);
                  onClose();
                }}
                aria-label="Delete transaction"
                className="w-full sm:w-auto p-3 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span className="sm:hidden text-xs font-bold">Delete Transaction</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-[#EAE6DD] dark:bg-[#1D2D24] text-xs sm:text-sm font-semibold text-[#777D75] dark:text-[#8FA095] hover:bg-[#DDD8CD] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-[#174F32] hover:bg-[#123E27] dark:bg-[#83C95B] dark:text-[#0C1510] text-xs sm:text-sm font-bold text-white transition-colors cursor-pointer shadow-xs"
            >
              {editingTransaction ? 'Update' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
