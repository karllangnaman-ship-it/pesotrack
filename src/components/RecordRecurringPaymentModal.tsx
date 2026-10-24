import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  DollarSign,
  Edit3,
  HandCoins,
  Receipt,
  RotateCcw,
  Save,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { RecurrenceFrequency, RecurringTransaction } from '../types/finance';
import { formatMonthLabel, formatPeso, roundPHP } from '../utils/currency';
import { CalendarEventStatus } from '../utils/calendarEngine';

export interface RecordRecurringPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurring: RecurringTransaction;
  monthKey: string;
  dueDate: string;
  amount: number;
  amountPaid?: number;
  remainingAmount?: number;
  status: CalendarEventStatus;
  isCollection?: boolean;
}

export const RecordRecurringPaymentModal: React.FC<RecordRecurringPaymentModalProps> = ({
  isOpen,
  onClose,
  recurring,
  monthKey,
  dueDate,
  amount,
  amountPaid = 0,
  remainingAmount = amount,
  status,
  isCollection,
}) => {
  const {
    reconciledAccounts,
    addTransaction,
    showToast,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    revertSalaryDeposit,
    state,
  } = useFinance();

  const isIncome = recurring.type === 'income' || isCollection;
  const isSettled = status === 'paid' || (amountPaid >= amount && amount > 0);

  // Find transactions recorded for this recurring item in this month
  const matchingTransactions = useMemo(() => {
    return state.transactions.filter((t) => {
      if (!t.dateTime.startsWith(monthKey)) return false;
      const matchesName =
        t.merchantOrTitle?.toLowerCase().trim() === recurring.name.toLowerCase().trim() ||
        (t.notes && t.notes.toLowerCase().includes(recurring.name.toLowerCase()));
      const matchesCategory =
        t.category?.toLowerCase().trim() === recurring.category.toLowerCase().trim();
      return (
        (t.type === recurring.type || (isIncome && t.type === 'income')) &&
        (matchesName || (matchesCategory && Math.abs(t.amount - recurring.amount) < 0.01))
      );
    });
  }, [state.transactions, monthKey, recurring, isIncome]);

  // Available asset wallets & savings
  const assetAccounts = reconciledAccounts.filter(
    (a) => !a.archived && !a.isLiability
  );

  const defaultAccountId =
    recurring.accountId && assetAccounts.some((a) => a.id === recurring.accountId)
      ? recurring.accountId
      : assetAccounts[0]?.id || '';

  const initialAmountToPay =
    remainingAmount > 0 ? remainingAmount : amount;

  const todayStr = new Date().toISOString().slice(0, 10);
  const isCurrentMonth = todayStr.startsWith(monthKey);
  const defaultDate = isCurrentMonth ? todayStr : dueDate;

  // Tabs: 'record' (record deposit/payment) or 'edit' (edit salary / recurring rule)
  const [activeTab, setActiveTab] = useState<'record' | 'edit'>('record');

  // Record Form state
  const [payAmount, setPayAmount] = useState<string>(String(initialAmountToPay));
  const [date, setDate] = useState<string>(defaultDate);
  const [accountId, setAccountId] = useState<string>(defaultAccountId);
  const [notes, setNotes] = useState<string>(recurring.notes || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showOverrideForm, setShowOverrideForm] = useState<boolean>(false);

  // Edit Rule / Salary state
  const [editName, setEditName] = useState<string>(recurring.name);
  const [editAmount, setEditAmount] = useState<string>(String(recurring.amount));
  const [editAccountId, setEditAccountId] = useState<string>(
    recurring.accountId || defaultAccountId
  );
  const [editFrequency, setEditFrequency] = useState<RecurrenceFrequency>(
    recurring.frequency || 'monthly'
  );
  const [editDueDate, setEditDueDate] = useState<string>(
    recurring.nextDueDate || dueDate
  );
  const [editCategory, setEditCategory] = useState<string>(
    recurring.category || (isIncome ? 'Salary' : 'Bills')
  );
  const [editNotes, setEditNotes] = useState<string>(recurring.notes || '');
  const [editIsActive, setEditIsActive] = useState<boolean>(
    recurring.isActive ?? true
  );
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = parseFloat(payAmount);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid amount greater than ₱0.00.');
      return;
    }

    if (!accountId) {
      setError(`Please select an account to ${isIncome ? 'deposit to' : 'deduct from'}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = addTransaction({
        type: recurring.type,
        amount: roundPHP(parsed),
        accountId,
        destinationAccountId: recurring.destinationAccountId,
        category: recurring.category,
        merchantOrTitle: recurring.name,
        dateTime: `${date}T12:00:00.000Z`,
        notes: notes.trim() || `Recurring ${recurring.frequency} (${recurring.name})`,
      });

      if (ok) {
        showToast(
          `Recorded ${formatPeso(roundPHP(parsed))} ${isIncome ? 'income' : 'payment'} for ${recurring.name}`,
          'success'
        );
        onClose();
      } else {
        setError('Failed to record transaction. Please review your account balance.');
      }
    } catch (err: unknown) {
      console.error('[RecordRecurringPaymentModal] Error:', err);
      setError('An unexpected error occurred while processing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(editAmount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid scheduled amount.');
      return;
    }

    if (!editName.trim()) {
      setError('Please provide a name (e.g. Monthly Salary).');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = updateRecurringTransaction(recurring.id, {
        name: editName.trim(),
        amount: roundPHP(parsedAmount),
        accountId: editAccountId,
        category: editCategory.trim() || (isIncome ? 'Salary' : 'Bills'),
        frequency: editFrequency,
        nextDueDate: editDueDate,
        notes: editNotes.trim(),
        isActive: editIsActive,
      });

      if (success) {
        showToast(`Updated recurring rule: ${editName.trim()}`, 'success');
        onClose();
      } else {
        setError('Failed to update recurring activity.');
      }
    } catch (err: unknown) {
      console.error('[RecordRecurringPaymentModal] Error saving rule:', err);
      setError('An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRule = () => {
    try {
      deleteRecurringTransaction(recurring.id);
      showToast(`Removed recurring rule: ${recurring.name}`, 'info');
      onClose();
    } catch (err: unknown) {
      console.error('[RecordRecurringPaymentModal] Error deleting rule:', err);
      setError('Failed to delete recurring activity.');
    }
  };

  const selectedAccount = assetAccounts.find((a) => a.id === accountId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-[28px] shadow-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 mr-2">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                isIncome
                  ? 'bg-emerald-500/15 text-[#16A34A] dark:text-[#83C95B]'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-[#174F32] dark:text-[#83C95B]'
              }`}
            >
              {isIncome ? (
                <HandCoins className="w-5 h-5" />
              ) : (
                <Receipt className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                  {recurring.category}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isIncome
                      ? 'bg-emerald-500/15 text-[#16A34A] dark:text-[#83C95B]'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  {isIncome ? 'Income' : 'Expense'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-black dark:text-white truncate">
                {activeTab === 'edit' ? `Edit ${recurring.name}` : recurring.name}
              </h2>
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

        {/* Tab Switcher */}
        <div className="px-5 sm:px-6 pt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('record');
              setError(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'record'
                ? 'bg-[#174F32] text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isIncome ? 'Record Deposit' : 'Record Payment'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('edit');
              setError(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'edit'
                ? 'bg-[#174F32] text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Rule / Salary</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'edit' ? (
            /* TAB 2: EDIT RECURRING RULE / SALARY */
            <form onSubmit={handleSaveRule} className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
                <span className="font-bold">Editing Recurring Schedule:</span> Changes made here apply to future occurrences of this recurring item (e.g. your monthly salary base amount or pay date).
              </div>

              {/* Title / Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Name / Label *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Monthly Salary"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs sm:text-sm font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Scheduled Amount (₱) *
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
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold tabular-nums text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
                  />
                </div>
              </div>

              {/* Account */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {isIncome ? 'Default Deposit Account' : 'Default Payment Account'}
                </label>
                <select
                  value={editAccountId}
                  onChange={(e) => setEditAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
                >
                  {assetAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatPeso(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Frequency & Next Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Frequency
                  </label>
                  <select
                    value={editFrequency}
                    onChange={(e) => setEditFrequency(e.target.value as RecurrenceFrequency)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly (Every 2 weeks)</option>
                    <option value="semimonthly">Semi-monthly (15th & 30th)</option>
                    <option value="monthly">Monthly</option>
                    <option value="daily">Daily</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60">
                <div>
                  <div className="text-xs font-bold text-black dark:text-white">Active in Calendar</div>
                  <div className="text-[11px] text-neutral-500">Show this recurring activity on schedule</div>
                </div>
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 accent-[#174F32] shrink-0"
                />
              </div>

              {/* Delete confirmation or Action Buttons */}
              {showConfirmDelete ? (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-2">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">
                    Are you sure you want to delete this recurring activity?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(false)}
                      className="flex-1 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300"
                    >
                      No, Keep It
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteRule}
                      className="flex-1 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                    >
                      Yes, Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-3 border-t border-black/[0.04] dark:border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="p-2.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-1.5 text-xs font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('record')}
                      className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-[#174F32] text-white text-xs font-bold hover:bg-[#123E27] disabled:opacity-50 transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          ) : (
            /* TAB 1: RECORD PAYMENT / DEPOSIT */
            <>
              {/* Status & Scheduled Details */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Period / Cycle:</span>
                  <span className="font-bold text-black dark:text-white">
                    {formatMonthLabel(monthKey)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Due Date:</span>
                  <span className="font-semibold text-black dark:text-white flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                    {dueDate}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-xs text-neutral-500">Scheduled Amount:</span>
                  <span
                    className={`text-base font-extrabold tabular-nums ${
                      isIncome
                        ? 'text-[#16A34A] dark:text-[#83C95B]'
                        : 'text-black dark:text-white'
                    }`}
                  >
                    {isIncome ? '+' : ''}
                    {formatPeso(amount)}
                  </span>
                </div>

                {amountPaid > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Recorded this month:</span>
                    <span className="font-bold tabular-nums text-[#2E9E6B]">
                      {formatPeso(amountPaid)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-neutral-500">Status:</span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isSettled
                        ? 'bg-emerald-500/15 text-[#16A34A] dark:text-[#83C95B]'
                        : status === 'overdue'
                        ? 'bg-red-500/15 text-[#DC2626]'
                        : status === 'partially_paid'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {isSettled
                      ? 'Settled / Paid'
                      : status === 'overdue'
                      ? 'Overdue'
                      : status === 'partially_paid'
                      ? 'Partially Paid'
                      : 'Unpaid'}
                  </span>
                </div>
              </div>

              {/* Recorded transactions / Already settled banner with Undo */}
              {matchingTransactions.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                    <span>Recorded This Month ({matchingTransactions.length})</span>
                    <span className="text-[10px] font-normal text-amber-700/80 dark:text-amber-400">
                      Misclick? Click Undo to revert
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {matchingTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between text-xs bg-white/80 dark:bg-neutral-800/80 p-2.5 rounded-xl border border-black/[0.03] dark:border-white/[0.04]"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="font-bold text-black dark:text-white tabular-nums">
                            {formatPeso(tx.amount)}
                          </div>
                          <div className="text-[10px] text-neutral-500 truncate">
                            {tx.dateTime.slice(0, 10)} · {tx.merchantOrTitle}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Undo recorded ${isIncome ? 'deposit' : 'payment'} of ${formatPeso(
                                  tx.amount
                                )} for "${recurring.name}"? This will mark it as unsettled and update your wallet balance.`
                              )
                            ) {
                              revertSalaryDeposit(recurring.id, monthKey, tx.id);
                              onClose();
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg border border-red-500/20 text-red-600 dark:text-red-400 text-[11px] font-bold hover:bg-red-500/10 transition-colors flex items-center gap-1 shrink-0"
                          title="Bawiin deposit / Revert to unsettled"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Undo</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Undo all recorded ${isIncome ? 'deposits' : 'payments'} for "${recurring.name}" for ${formatMonthLabel(
                            monthKey
                          )}? This will revert it completely to unsettled and update your wallet balance.`
                        )
                      ) {
                        revertSalaryDeposit(recurring.id, monthKey);
                        onClose();
                      }
                    }}
                    className="w-full py-2 px-3 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Undo All & Revert to Unsettled</span>
                  </button>
                </div>
              )}

              {/* Already settled banner */}
              {isSettled && !showOverrideForm ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-[#2E9E6B] mx-auto flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      This recurring item is settled for {formatMonthLabel(monthKey)}
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      If you marked this by mistake, tap the Undo button above to restore your balance and revert to unsettled.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowOverrideForm(true)}
                      className="flex-1 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      Record Another Payout
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-2.5 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRecordSubmit} className="space-y-3.5">
                  {/* Amount Input */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      {isIncome ? 'Income Amount (₱) *' : 'Payment Amount (₱) *'}
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
                        value={payAmount}
                        onChange={(e) => {
                          setError(null);
                          setPayAmount(e.target.value);
                        }}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold tabular-nums text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                      />
                    </div>
                  </div>

                  {/* Payment / Deposit Date */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      {isIncome ? 'Credited / Received Date *' : 'Payment Date *'}
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                    />
                  </div>

                  {/* Account Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      {isIncome ? 'Deposit to Wallet / Account *' : 'Pay From Wallet / Account *'}
                    </label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                    >
                      {assetAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatPeso(acc.currentBalance)})
                        </option>
                      ))}
                    </select>
                    {selectedAccount && (
                      <p className="mt-1 text-[11px] text-neutral-500">
                        Available balance: <span className="font-bold">{formatPeso(selectedAccount.currentBalance)}</span>
                      </p>
                    )}
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
                      placeholder={
                        isIncome
                          ? 'e.g. Cut-off salary credited'
                          : 'e.g. Paid via online banking ref #123456'
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                    />
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.04] dark:border-white/[0.06]">
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
                          <span>Recording...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {isIncome
                              ? `Confirm Deposit (${formatPeso(parseFloat(payAmount) || amount, { compact: true })})`
                              : `Confirm Payment (${formatPeso(parseFloat(payAmount) || amount, { compact: true })})`}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
