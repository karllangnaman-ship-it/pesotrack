import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  ShoppingCart,
  Wallet,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { GroceryItem } from '../types/finance';
import { formatPeso } from '../utils/currency';
import { getCategoryIcon } from '../utils/groceryEngine';

interface ConvertGroceryExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialItems?: GroceryItem[];
}

export const ConvertGroceryExpenseModal: React.FC<ConvertGroceryExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialItems,
}) => {
  const {
    groceryItems,
    reconciledAccounts,
    convertGroceriesToExpense,
    customCategories,
  } = useFinance();

  // Find all purchased items that are NOT yet recorded as expense
  const availablePurchasedItems = useMemo(() => {
    const list = initialItems || groceryItems;
    return list.filter((i) => i.isPurchased && !i.isRecordedAsExpense && !i.isDeleted);
  }, [initialItems, groceryItems]);

  // Selected item IDs state (default all available checked items selected)
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    availablePurchasedItems.map((i) => i.id)
  );

  // Form states
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState(() => {
    const defaultAcc =
      reconciledAccounts.find((a) => a.category === 'Wallet') ||
      reconciledAccounts.find((a) => a.category === 'Savings') ||
      reconciledAccounts[0];
    return defaultAcc?.id || '';
  });
  const [category, setCategory] = useState('Groceries');
  const [description, setDescription] = useState('Grocery shopping at SM');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync selectedIds if availablePurchasedItems change
  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(availablePurchasedItems.map((i) => i.id));
      setError(null);
      if (availablePurchasedItems.length > 0) {
        setDescription(`Grocery shopping (${availablePurchasedItems.length} items)`);
      }
    }
  }, [isOpen, availablePurchasedItems.length]);

  if (!isOpen) return null;

  const toggleItemSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(availablePurchasedItems.map((i) => i.id));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  // Selected items subset
  const selectedItems = availablePurchasedItems.filter((i) =>
    selectedIds.includes(i.id)
  );

  // Total amount of selected items
  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + (item.estimatedTotal || 0),
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setError('Please select at least one grocery item to record.');
      return;
    }
    if (!accountId) {
      setError('Please select a payment account.');
      return;
    }
    if (totalAmount <= 0) {
      setError('Total amount must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = convertGroceriesToExpense({
        itemIds: selectedIds,
        accountId,
        date,
        category,
        description: description.trim() || `Grocery shopping (${selectedIds.length} items)`,
      });

      if (res.success) {
        onSuccess?.();
        onClose();
      } else {
        setError(res.message || 'Failed to convert groceries to expense.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#15221B] rounded-3xl shadow-2xl border border-[#E5E1D8] dark:border-[#223528] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E1D8] dark:border-[#223528] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#174F32]/10 dark:bg-[#1E382A] text-[#174F32] dark:text-[#83C95B] flex items-center justify-center shadow-2xs">
              <ShoppingCart className="w-5 h-5 stroke-[2.3]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#252923] dark:text-white leading-tight">
                Add to Expenses
              </h2>
              <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
                Convert checked items to an expense record.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-xl text-[#777D75] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain"
        >
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section: Selected Items List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#555C50] dark:text-[#9EA59B]">
                Selected Items ({selectedItems.length})
              </span>
              <div className="flex items-center gap-2 text-xs">
                {selectedIds.length === availablePurchasedItems.length ? (
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-[#777D75] hover:text-[#174F32] dark:hover:text-white font-medium"
                  >
                    Deselect All
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-[#174F32] dark:text-[#83C95B] font-bold"
                  >
                    Select All
                  </button>
                )}
              </div>
            </div>

            {availablePurchasedItems.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#F6F4EE]/60 dark:bg-[#111A14] border border-[#E5E1D8] dark:border-[#223528] text-center text-xs text-[#777D75]">
                No purchased grocery items found to convert. Please mark items as purchased first.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-2xl border border-[#E5E1D8] dark:border-[#223528] divide-y divide-[#E5E1D8] dark:divide-[#223528] bg-[#F6F4EE]/30 dark:bg-[#111A14]">
                {availablePurchasedItems.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  const icon = getCategoryIcon(item.category);

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItemSelection(item.id)}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-[#174F32]/5 dark:bg-[#1E382A]/30'
                          : 'opacity-60 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                            isChecked
                              ? 'border-[#174F32] bg-[#174F32] dark:border-[#83C95B] dark:bg-[#83C95B] text-white dark:text-[#0D1410]'
                              : 'border-[#CCC7BD] dark:border-[#3A4E40]'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-base shrink-0">{icon}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs sm:text-sm font-bold text-[#252923] dark:text-white truncate">
                            {item.name}
                          </span>
                          <span className="text-[11px] text-[#777D75] dark:text-[#8FA095]">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      </div>

                      <div className="font-mono text-xs sm:text-sm font-bold text-[#252923] dark:text-white shrink-0 ml-2">
                        ₱{item.estimatedTotal.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Total Amount Card */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#174F32]/10 dark:bg-[#1E382A]/40 border border-[#174F32]/20 dark:border-[#83C95B]/30">
            <span className="text-xs sm:text-sm font-bold text-[#174F32] dark:text-[#83C95B]">
              Total Amount
            </span>
            <span className="text-lg sm:text-xl font-extrabold font-mono text-[#174F32] dark:text-white tabular-nums">
              ₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Form Fields */}
          <div className="space-y-3 pt-1">
            {/* Date Input */}
            <div>
              <label
                htmlFor="convert-expense-date"
                className="block text-xs font-bold text-[#555C50] dark:text-[#9EA59B] mb-1.5"
              >
                Date
              </label>
              <div className="relative">
                <input
                  id="convert-expense-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#D5D0C3] dark:border-[#2A3E31] bg-white dark:bg-[#111A14] text-[#252923] dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#174F32]"
                  required
                />
              </div>
            </div>

            {/* Source Account (Where did you pay from?) */}
            <div>
              <label
                htmlFor="convert-expense-account"
                className="block text-xs font-bold text-[#555C50] dark:text-[#9EA59B] mb-1.5"
              >
                Paid With (Account)
              </label>
              <select
                id="convert-expense-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#D5D0C3] dark:border-[#2A3E31] bg-white dark:bg-[#111A14] text-[#252923] dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#174F32]"
                required
              >
                {reconciledAccounts
                  .filter((a) => !a.archived)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.category}) • ₱{acc.currentBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="convert-expense-cat"
                className="block text-xs font-bold text-[#555C50] dark:text-[#9EA59B] mb-1.5"
              >
                Expense Category
              </label>
              <select
                id="convert-expense-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#D5D0C3] dark:border-[#2A3E31] bg-white dark:bg-[#111A14] text-[#252923] dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#174F32]"
              >
                <option value="Groceries">🛒 Groceries</option>
                <option value="Food">🍽️ Food</option>
                {customCategories.expense
                  .filter((c) => c !== 'Groceries' && c !== 'Food')
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="convert-expense-desc"
                className="block text-xs font-bold text-[#555C50] dark:text-[#9EA59B] mb-1.5"
              >
                Description
              </label>
              <input
                id="convert-expense-desc"
                type="text"
                placeholder="e.g. Grocery shopping at SM Hypermarket"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#D5D0C3] dark:border-[#2A3E31] bg-white dark:bg-[#111A14] text-[#252923] dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#174F32]"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || selectedIds.length === 0}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#174F32] hover:bg-[#123E27] disabled:opacity-50 text-white text-sm font-extrabold shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer min-h-[48px] flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Recording Expense...'
                  : `Add as Expense (₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
