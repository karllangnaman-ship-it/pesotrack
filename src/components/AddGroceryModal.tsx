import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, Sparkles, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { GROCERY_UNITS, GroceryItem } from '../types/finance';
import { getCategoryIcon } from '../utils/groceryEngine';
import { SelectGroceryCategoryModal } from './SelectGroceryCategoryModal';

interface AddGroceryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: GroceryItem | null;
  initialCategory?: string;
}

export const AddGroceryModal: React.FC<AddGroceryModalProps> = ({
  isOpen,
  onClose,
  editingItem,
  initialCategory,
}) => {
  const { addGroceryItem, updateGroceryItem, groceryCategories } = useFinance();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Meat');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<string>('kg');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [isPurchased, setIsPurchased] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSelectCategoryOpen, setIsSelectCategoryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when editing or opening fresh
  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setCategory(editingItem.category || 'Meat');
      setQuantity(String(editingItem.quantity));
      setUnit(editingItem.unit || 'piece');
      setEstimatedPrice(
        editingItem.estimatedPrice > 0 ? String(editingItem.estimatedPrice) : ''
      );
      setIsPurchased(Boolean(editingItem.isPurchased));
      setNotes(editingItem.notes || '');
      setError(null);
    } else {
      setName('');
      setCategory(initialCategory || 'Meat');
      setQuantity('1');
      setUnit('kg');
      setEstimatedPrice('');
      setIsPurchased(false);
      setNotes('');
      setError(null);
    }
  }, [editingItem, initialCategory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please provide an item name.');
      return;
    }

    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    const parsedPrice = estimatedPrice ? parseFloat(estimatedPrice) : 0;
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Estimated price cannot be negative.');
      return;
    }

    if (editingItem) {
      const ok = updateGroceryItem(editingItem.id, {
        name: trimmedName,
        category,
        quantity: parsedQty,
        unit,
        estimatedPrice: parsedPrice,
        isPurchased,
        notes: notes.trim() || undefined,
      });
      if (ok) onClose();
    } else {
      const created = addGroceryItem({
        name: trimmedName,
        category,
        quantity: parsedQty,
        unit,
        estimatedPrice: parsedPrice,
        isPurchased,
        notes: notes.trim() || undefined,
      });
      if (created) onClose();
    }
  };

  const categoryIcon = getCategoryIcon(category, groceryCategories);
  const calculatedTotal =
    (parseFloat(quantity) || 0) * (parseFloat(estimatedPrice) || 0);

  return (
    <>
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
        <div className="relative w-full max-w-md bg-white dark:bg-[#15221B] rounded-3xl shadow-2xl border border-[#E5E1D8] dark:border-[#223528] overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E1D8] dark:border-[#223528] shrink-0">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                aria-label="Back"
                className="p-1.5 -ml-1 rounded-xl text-[#777D75] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-base sm:text-lg font-extrabold text-[#252923] dark:text-white">
                {editingItem ? 'Edit Grocery Item' : 'Add Grocery Item'}
              </h2>
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

          {/* Form Content */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain"
          >
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* 1. Item Name */}
            <div>
              <label
                htmlFor="grocery-item-name"
                className="block text-xs font-bold text-[#555C50] dark:text-[#9EA59B] mb-1.5"
              >
                Item Name
              </label>
              <input
                id="grocery-item-name"
                type="text"
                placeholder="e.g. Pork, Rice, Apples, Milk"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                className="w-full px-4 py-3 rounded-2xl border border-[#D5D0C3] dark:border-[#2A3E31] bg-white dark:bg-[#111A14] text-[#252923] dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#174F32] placeholder-[#A09D95] dark:placeholder-[#647468]"
                required
                autoFocus
              />
            </div>

            {/* 2. Category Selector */}
            <div>
              <label
                htmlFor="grocery-category-btn"
                className="block text-xs font-bold text-[#555C50] dark:text-[#9EA59B] mb-1.5"
              >
                Category
              </label>
              <button
                id="grocery-category-btn"
                type="button"
                onClick={() => setIsSelectCategoryOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-[#D5D0C3] dark:border-[#2A3E31] bg-white dark:bg-[#111A14] text-[#252923] dark:text-white text-sm font-semibold hover:border-[#174F32]/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{categoryIcon}</span>
                  <span className="font-bold">{category}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-[#777D75]" />
              </button>
            </div>

            {/* 3. Quantity & Unit (Side by side) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="grocery-quantity"
                  className="block text-xs font-bold text-[#555C50] dark:text-[#9EA59B] mb-1.5"
                >
                  Quantity
                </label>
                <input
                  id="grocery-quantity"
                  type="number"
                  step="any"
                  min="0.001"
                  placeholder="1"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-4 py-3 rounded-2xl border border-[#D5D0C3] dark:border-[#2A3E31] bg-white dark:bg-[#111A14] text-[#252923] dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#174F32]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="grocery-unit"
                  className="block text-xs font-bold text-[#555C50] dark:text-[#9EA59B] mb-1.5"
                >
                  Unit
                </label>
                <select
                  id="grocery-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-2xl border border-[#D5D0C3] dark:border-[#2A3E31] bg-white dark:bg-[#111A14] text-[#252923] dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#174F32]"
                >
                  {GROCERY_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                  {!GROCERY_UNITS.includes(unit as any) && (
                    <option value={unit}>{unit}</option>
                  )}
                </select>
              </div>
            </div>

            {/* 4. Estimated Unit Price */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="grocery-price"
                  className="text-xs font-bold text-[#555C50] dark:text-[#9EA59B]"
                >
                  Estimated Unit Price
                </label>
                {calculatedTotal > 0 && (
                  <span className="text-[11px] font-bold text-[#174F32] dark:text-[#83C95B]">
                    Item Total: ₱{calculatedTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#777D75]">
                  ₱
                </span>
                <input
                  id="grocery-price"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={estimatedPrice}
                  onChange={(e) => {
                    setEstimatedPrice(e.target.value);
                    setError(null);
                  }}
                  className="w-full pl-9 pr-4 py-3 rounded-2xl border border-[#D5D0C3] dark:border-[#2A3E31] bg-white dark:bg-[#111A14] text-[#252923] dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#174F32]"
                />
              </div>
            </div>

            {/* 5. Mark as purchased Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F6F4EE]/70 dark:bg-[#111A14] border border-[#E5E1D8] dark:border-[#223528]">
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm font-bold text-[#252923] dark:text-white">
                  Mark as purchased
                </span>
                <span className="text-[11px] text-[#777D75] dark:text-[#8FA095]">
                  Already bought or in your shopping basket
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPurchased}
                  onChange={(e) => setIsPurchased(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#D5D0C3] dark:bg-[#2A3E31] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#174F32] dark:peer-checked:bg-[#83C95B]" />
              </label>
            </div>

            {/* 6. Notes (Optional) */}
            <div>
              <label
                htmlFor="grocery-notes"
                className="block text-xs font-bold text-[#555C50] dark:text-[#9EA59B] mb-1.5"
              >
                Notes (Optional)
              </label>
              <textarea
                id="grocery-notes"
                rows={2}
                placeholder="e.g. Pork belly for adobo, brand preference, recipe notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-[#D5D0C3] dark:border-[#2A3E31] bg-white dark:bg-[#111A14] text-[#252923] dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#174F32] placeholder-[#A09D95] dark:placeholder-[#647468]"
              />
            </div>

            {/* 7. Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-[#174F32] hover:bg-[#123E27] text-white text-sm font-extrabold shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer min-h-[48px]"
              >
                {editingItem ? 'Save Changes' : 'Add to Grocery List'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Nested Category Picker Modal */}
      <SelectGroceryCategoryModal
        isOpen={isSelectCategoryOpen}
        onClose={() => setIsSelectCategoryOpen(false)}
        selectedCategory={category}
        onSelectCategory={(newCat) => setCategory(newCat)}
      />
    </>
  );
};
