import React, { useState } from 'react';
import { AlertCircle, Calendar, Check, DollarSign, Sparkles, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  AddBillInput,
  BillCategory,
  BillRecurrence,
  BillType,
  DEFAULT_BILL_CATEGORIES,
} from '../types/finance';
import { getMonthKey } from '../utils/currency';

interface AddBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: BillCategory;
}

export const AddBillModal: React.FC<AddBillModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'Electricity',
}) => {
  const { addBill, customBillNames, saveCustomBillName } = useFinance();

  const currentMonth = getMonthKey();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<BillCategory>(initialCategory);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [type, setType] = useState<BillType>('fixed');
  const [defaultAmount, setDefaultAmount] = useState<string>('');
  const [dueDay, setDueDay] = useState<number>(15);
  const [startMonth, setStartMonth] = useState<string>(currentMonth);
  const [endMonth, setEndMonth] = useState<string>('');
  const [hasEndDate, setHasEndDate] = useState<boolean>(false);
  const [frequency, setFrequency] = useState<BillRecurrence>('monthly');
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Auto-switch type default: utility categories default to 'variable'
  const handleCategoryChange = (newCat: BillCategory) => {
    setCategory(newCat);
    if (['Electricity', 'Water', 'Mobile Load', 'Mobile Data'].includes(newCat)) {
      setType('variable');
    } else {
      setType('fixed');
    }

    // Default suggestions
    if (newCat === 'Electricity' && !name) setName('Meralco Electricity');
    if (newCat === 'Water' && !name) setName('Maynilad Water');
    if (newCat === 'Wi-Fi / Internet' && !name) setName('PLDT Home Fiber');
    if (newCat === 'Rent' && !name) setName('Apartment / House Rent');
    if (newCat === 'Subscriptions' && !name) setName('Netflix / Spotify');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const effectiveName = category === 'Other'
      ? customCategoryName.trim()
      : name.trim();

    if (!effectiveName) {
      setError(category === 'Other' ? 'Please enter a custom Bill Name.' : 'Please enter a bill name.');
      return;
    }

    const amt = parseFloat(defaultAmount);
    if (Number.isNaN(amt) || amt <= 0) {
      setError('Please enter a valid bill amount greater than ₱0.00.');
      return;
    }

    if (category === 'Other' && customCategoryName.trim()) {
      saveCustomBillName(customCategoryName.trim());
    }

    const input: AddBillInput = {
      name: effectiveName,
      category,
      customCategoryName: category === 'Other' ? customCategoryName.trim() : undefined,
      type,
      defaultAmount: amt,
      dueDay: Math.min(31, Math.max(1, Number(dueDay) || 1)),
      startMonth: startMonth || currentMonth,
      endMonth: hasEndDate && endMonth ? endMonth : undefined,
      frequency,
      reminderEnabled,
      reminderDaysBefore,
      notes: notes.trim() || undefined,
    };

    const res = addBill(input);
    if (res) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-[28px] shadow-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-black dark:text-white">
              Add Monthly Bill
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Track recurring fixed or variable expenses offline
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

          {/* 1. Category Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Bill Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/60">
              {DEFAULT_BILL_CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all truncate flex items-center justify-between ${
                      isSelected
                        ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {isSelected && <Check className="w-3 h-3 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Custom Bill Name (Mandatory & Prominent when 'Other' is selected) */}
          {category === 'Other' ? (
            <div className="space-y-1.5 p-3 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20">
              <label className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Bill Name (Required)</span>
              </label>
              <input
                type="text"
                required
                value={customCategoryName}
                onChange={(e) => setCustomCategoryName(e.target.value)}
                placeholder="e.g. Condo Dues, Tuition Fee, Groceries, Pet Care"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-black dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />

              {customBillNames.length > 0 && (
                <div className="pt-1.5">
                  <div className="text-[11px] font-medium text-neutral-500 mb-1">
                    Previous custom names (tap to reuse):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {customBillNames.map((cName) => (
                      <button
                        key={cName}
                        type="button"
                        onClick={() => setCustomCategoryName(cName)}
                        className="px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:border-amber-500 text-neutral-700 dark:text-neutral-300 transition-colors"
                      >
                        {cName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Bill / Biller Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Meralco, Manila Water, PLDT Fiber"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 text-sm font-medium text-black dark:text-white focus:outline-hidden focus:ring-2 focus:ring-neutral-950 dark:focus:ring-white"
              />
            </div>
          )}

          {/* 3. Fixed vs Variable Amount Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Bill Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setType('fixed')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
                  type === 'fixed'
                    ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Fixed Amount
              </button>
              <button
                type="button"
                onClick={() => setType('variable')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
                  type === 'variable'
                    ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Variable (Varies monthly)
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {type === 'fixed'
                ? 'Fixed bills have an identical charge every billing cycle (e.g. Wi-Fi, Rent, Netflix).'
                : 'Variable bills let you update the exact monthly billed amount (e.g. Electricity, Water, Mobile Data).'}
            </p>
          </div>

          {/* 4. Amount and Due Day in Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                {type === 'variable' ? 'Est. Amount (₱)' : 'Monthly Amount (₱)'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">
                  ₱
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={defaultAmount}
                  onChange={(e) => setDefaultAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 text-sm font-bold tabular-nums text-black dark:text-white focus:outline-hidden focus:ring-2 focus:ring-neutral-950 dark:focus:ring-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Due Day of Month
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={dueDay}
                  onChange={(e) => setDueDay(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 text-sm font-bold tabular-nums text-black dark:text-white focus:outline-hidden focus:ring-2 focus:ring-neutral-950 dark:focus:ring-white"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                  Every {dueDay || 1}th
                </span>
              </div>
            </div>
          </div>

          {/* 5. Start Month & Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Start Month
              </label>
              <input
                type="month"
                required
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 text-xs font-medium text-black dark:text-white focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Recurrence Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as BillRecurrence)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 text-xs font-medium text-black dark:text-white focus:outline-hidden"
              >
                <option value="monthly">Monthly</option>
                <option value="bimonthly">Every 2 Months</option>
                <option value="quarterly">Quarterly (3 Months)</option>
                <option value="annually">Annually (Yearly)</option>
              </select>
            </div>
          </div>

          {/* Optional End Date */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Has Specific End Date?
              </label>
              <input
                type="checkbox"
                checked={hasEndDate}
                onChange={(e) => setHasEndDate(e.target.checked)}
                className="w-4 h-4 rounded-sm accent-black dark:accent-white"
              />
            </div>
            {hasEndDate && (
              <input
                type="month"
                value={endMonth}
                onChange={(e) => setEndMonth(e.target.value)}
                placeholder="End Month (YYYY-MM)"
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 text-xs text-black dark:text-white"
              />
            )}
          </div>

          {/* 6. Offline Local Reminders */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-500" />
                <span className="text-xs font-bold text-black dark:text-white">
                  Offline Device Reminder
                </span>
              </div>
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="w-4 h-4 rounded-sm accent-black dark:accent-white cursor-pointer"
              />
            </div>

            {reminderEnabled && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-neutral-500">Notify me:</span>
                <div className="flex items-center gap-1">
                  {[0, 1, 3, 7].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setReminderDaysBefore(days)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                        reminderDaysBefore === days
                          ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                          : 'bg-neutral-200/60 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      {days === 0 ? 'On Due Date' : `${days}d before`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 7. Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Account number, payment method, contract details"
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 text-xs text-black dark:text-white focus:outline-hidden"
            />
          </div>

          {/* Footer CTAs */}
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
              Save Bill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
