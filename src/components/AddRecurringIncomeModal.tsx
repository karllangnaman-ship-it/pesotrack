import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Briefcase,
  Building,
  Calendar,
  DollarSign,
  HandCoins,
  Repeat,
  Save,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { RecurrenceFrequency, RecurringTransaction } from '../types/finance';
import { formatPeso, roundPHP } from '../utils/currency';
import { ProviderLogo } from './ProviderLogo';

export interface AddRecurringIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: RecurringTransaction | null;
  defaultFrequency?: RecurrenceFrequency;
}

const PRESET_TITLES = [
  'Monthly Salary',
  '15/30 Salary Cutoff',
  'Weekly Salary',
  'Weekly Allowance',
  'Freelance Retainer',
  'Store Sales',
  'Rental Income',
  'Debt Collection',
];

const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Allowance',
  'Rental',
  'Investment',
  'Receivable',
  'Other',
];

export const AddRecurringIncomeModal: React.FC<AddRecurringIncomeModalProps> = ({
  isOpen,
  onClose,
  editingItem,
  defaultFrequency = 'monthly',
}) => {
  const {
    reconciledAccounts,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    showToast,
  } = useFinance();

  // Filter asset accounts (non-liability, non-archived)
  const assetAccounts = reconciledAccounts.filter(
    (a) => !a.archived && !a.isLiability
  );

  const defaultAccountId = assetAccounts[0]?.id || '';

  // Form State
  const [name, setName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('Salary');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(defaultFrequency);
  const [accountId, setAccountId] = useState<string>(defaultAccountId);
  const [startDate, setStartDate] = useState<string>('');
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setShowConfirmDelete(false);

      if (editingItem) {
        setName(editingItem.name || '');
        setAmount(editingItem.amount ? String(editingItem.amount) : '');
        setCategory(editingItem.category || 'Salary');
        setFrequency(editingItem.frequency || 'monthly');
        setAccountId(
          editingItem.accountId && assetAccounts.some((a) => a.id === editingItem.accountId)
            ? editingItem.accountId
            : defaultAccountId
        );
        setStartDate(editingItem.nextDueDate || editingItem.startDate || '');
        setReminderEnabled(editingItem.reminderEnabled ?? true);
        setNotes(editingItem.notes || '');
      } else {
        setName('');
        setAmount('');
        setCategory('Salary');
        setFrequency(defaultFrequency);
        setAccountId(defaultAccountId);
        const todayStr = new Date().toISOString().slice(0, 10);
        setStartDate(todayStr);
        setReminderEnabled(true);
        setNotes('');
      }
    }
  }, [isOpen, editingItem, defaultFrequency, defaultAccountId]);

  if (!isOpen) return null;

  const parsedAmount = parseFloat(amount);
  const validAmount = !Number.isNaN(parsedAmount) && parsedAmount > 0;

  // Monthly estimate helper calculation
  const getMonthlyEstimate = (): number => {
    if (!validAmount) return 0;
    if (frequency === 'weekly') return parsedAmount * 4.33;
    if (frequency === 'biweekly') return parsedAmount * 2.16;
    if (frequency === 'semimonthly') return parsedAmount * 2;
    if (frequency === 'monthly') return parsedAmount;
    if (frequency === 'daily') return parsedAmount * 30;
    if (frequency === 'annually') return parsedAmount / 12;
    return parsedAmount;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please provide a name or title for this recurring salary or receivable.');
      return;
    }

    if (!validAmount) {
      setError('Please enter a valid amount greater than ₱0.00.');
      return;
    }

    if (!accountId) {
      setError('Please select a receiving wallet or bank account.');
      return;
    }

    if (!startDate) {
      setError('Please choose a start date or next payout date.');
      return;
    }

    const rounded = roundPHP(parsedAmount);

    if (editingItem) {
      updateRecurringTransaction(editingItem.id, {
        name: trimmedName,
        amount: rounded,
        category,
        frequency,
        accountId,
        startDate,
        nextDueDate: startDate,
        reminderEnabled,
        notes: notes.trim(),
        updatedAt: new Date().toISOString(),
      });
      showToast(`Updated schedule: ${trimmedName} (${formatPeso(rounded)})`, 'success');
    } else {
      addRecurringTransaction({
        name: trimmedName,
        amount: rounded,
        type: 'income',
        category,
        frequency,
        accountId,
        startDate,
        nextDueDate: startDate,
        reminderEnabled,
        notes: notes.trim(),
        isActive: true,
      });
      showToast(
        `Added recurring ${frequency} ${category.toLowerCase()}: ${trimmedName} (${formatPeso(rounded)})`,
        'success'
      );
    }

    onClose();
  };

  const handleDelete = () => {
    if (!editingItem) return;
    deleteRecurringTransaction(editingItem.id);
    showToast(`Removed recurring schedule: ${editingItem.name}`, 'info');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-[28px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E1D8] dark:border-[#223528] flex items-center justify-between gap-3 bg-[#FBF9F4] dark:bg-[#18281F]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-[#16A34A] dark:text-[#83C95B] flex items-center justify-center shrink-0">
              <HandCoins className="w-5 h-5 stroke-[2.3]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-[#252923] dark:text-white truncate">
                {editingItem ? 'Edit Salary / Receivable' : 'Add Salary or Receivable'}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#777D75] dark:text-[#8FA095] truncate">
                Set up recurring weekly, bi-weekly, or monthly income
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#777D75] hover:text-[#252923] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Preset Names */}
          {!editingItem && (
            <div>
              <label className="block text-[11px] font-bold text-[#777D75] dark:text-[#8FA095] uppercase tracking-wider mb-1.5">
                Quick Presets
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {PRESET_TITLES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setName(preset);
                      if (preset.toLowerCase().includes('weekly')) {
                        setFrequency('weekly');
                      } else if (preset.includes('15/30')) {
                        setFrequency('semimonthly');
                      } else if (preset.toLowerCase().includes('freelance')) {
                        setCategory('Freelance');
                      } else if (preset.toLowerCase().includes('rental')) {
                        setCategory('Rental');
                      } else if (preset.toLowerCase().includes('debt')) {
                        setCategory('Receivable');
                      } else {
                        setFrequency('monthly');
                      }
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                      name === preset
                        ? 'bg-[#174F32] text-white border-[#174F32] shadow-2xs'
                        : 'bg-[#F6F4EE] dark:bg-[#1A2A20] text-[#252923] dark:text-neutral-200 border-[#E5E1D8] dark:border-[#223528] hover:border-[#174F32]/40'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name & Title */}
          <div>
            <label className="block text-xs font-bold text-[#252923] dark:text-neutral-200 mb-1">
              Source Name / Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly Salary (Company A), Weekly Freelance Retainer"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] text-xs sm:text-sm font-semibold text-[#252923] dark:text-white placeholder:text-[#777D75] focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
            />
          </div>

          {/* Amount and Frequency Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#252923] dark:text-neutral-200 mb-1">
                Amount (₱) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-[#174F32] dark:text-[#83C95B]">
                  ₱
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] text-xs sm:text-sm font-black tabular-nums text-[#252923] dark:text-white placeholder:text-[#777D75] focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#252923] dark:text-neutral-200 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] text-xs sm:text-sm font-semibold text-[#252923] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
              >
                {INCOME_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Frequency Selector: Weekly, Bi-weekly, Semi-monthly, Monthly */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#252923] dark:text-neutral-200 flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-[#174F32] dark:text-[#83C95B]" />
                <span>Payout Frequency</span>
              </label>
              {validAmount && frequency !== 'monthly' && (
                <span className="text-[11px] font-bold text-[#16A34A] dark:text-[#83C95B]">
                  ~{formatPeso(getMonthlyEstimate())} / mo
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  {
                    id: 'weekly',
                    label: 'Weekly',
                    desc: 'Every 7 days',
                  },
                  {
                    id: 'biweekly',
                    label: 'Bi-Weekly',
                    desc: 'Every 2 weeks',
                  },
                  {
                    id: 'semimonthly',
                    label: '15th & 30th',
                    desc: '2x per month',
                  },
                  {
                    id: 'monthly',
                    label: 'Monthly',
                    desc: 'Once a month',
                  },
                ] as const
              ).map((f) => {
                const isSelected = frequency === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFrequency(f.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-[#174F32] dark:bg-[#1E3B2B] text-white border-[#174F32] shadow-2xs'
                        : 'bg-[#F6F4EE] dark:bg-[#1A2A20] text-[#252923] dark:text-neutral-200 border-[#E5E1D8] dark:border-[#243A2C] hover:border-black/20 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="text-xs font-bold">{f.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        isSelected ? 'text-white/80' : 'text-[#777D75] dark:text-[#8FA095]'
                      }`}
                    >
                      {f.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Receiving Wallet & Next Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#252923] dark:text-neutral-200 mb-1">
                Receiving Wallet / Account <span className="text-red-500">*</span>
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] text-xs sm:text-sm font-semibold text-[#252923] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
              >
                {assetAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#252923] dark:text-neutral-200 mb-1">
                First Pay Date / Next Due <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] text-xs sm:text-sm font-semibold text-[#252923] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
              />
            </div>
          </div>

          {/* Reminders Toggle */}
          <div className="p-3.5 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-[#174F32] dark:text-[#83C95B] shrink-0" />
              <div>
                <div className="text-xs font-bold text-[#252923] dark:text-white">
                  Remind on Payout Date
                </div>
                <div className="text-[11px] text-[#777D75] dark:text-[#8FA095]">
                  Receive an offline reminder notification on scheduled pay days
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={(e) => setReminderEnabled(e.target.checked)}
              className="w-4 h-4 accent-[#174F32] rounded cursor-pointer"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[#252923] dark:text-neutral-200 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cutoff every 10th and 25th, net of tax"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] text-xs sm:text-sm text-[#252923] dark:text-white placeholder:text-[#777D75] focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
            />
          </div>

          {/* Delete confirmation if editing */}
          {editingItem && showConfirmDelete && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-2">
              <p className="text-xs font-bold text-red-600 dark:text-red-400">
                Are you sure you want to delete this recurring salary schedule?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-[#E5E1D8] dark:border-[#223528]">
            {editingItem ? (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#E5E1D8] dark:border-[#243A2C] text-xs font-bold text-[#61685D] dark:text-[#9EA59B] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-black shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{editingItem ? 'Save Changes' : 'Save Salary Schedule'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
