import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Edit3,
  FolderInput,
  Receipt,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { GroceryItem } from '../types/finance';
import { getCategoryIcon } from '../utils/groceryEngine';
import { SelectGroceryCategoryModal } from './SelectGroceryCategoryModal';

interface GroceryItemDetailModalProps {
  item: GroceryItem | null;
  onClose: () => void;
  onEdit: (item: GroceryItem) => void;
}

export const GroceryItemDetailModal: React.FC<GroceryItemDetailModalProps> = ({
  item,
  onClose,
  onEdit,
}) => {
  const {
    toggleGroceryPurchased,
    deleteGroceryItem,
    duplicateGroceryItem,
    moveGroceryItemCategory,
  } = useFinance();

  const [isMoveCategoryOpen, setIsMoveCategoryOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!item) return null;

  const icon = getCategoryIcon(item.category);

  const handleToggle = () => {
    toggleGroceryPurchased(item.id);
    onClose();
  };

  const handleDuplicate = () => {
    duplicateGroceryItem(item.id);
    onClose();
  };

  const handleDelete = () => {
    deleteGroceryItem(item.id);
    onClose();
  };

  const handleSelectNewCategory = (catName: string) => {
    moveGroceryItemCategory(item.id, catName);
    setIsMoveCategoryOpen(false);
    onClose();
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      >
        {/* Backdrop */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        />

        {/* Modal / Action Sheet Canvas */}
        <div className="relative w-full sm:max-w-md bg-white dark:bg-[#15221B] rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-[#E5E1D8] dark:border-[#223528] overflow-hidden flex flex-col z-10 pb-safe">
          {/* Grab handle on mobile */}
          <div className="sm:hidden w-12 h-1.5 bg-[#D5D0C3] dark:bg-[#2A3E31] rounded-full mx-auto mt-3" />

          {/* Item Highlight Header Card */}
          <div className="p-4 sm:p-5 border-b border-[#E5E1D8] dark:border-[#223528] flex items-center justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE9DF]/60 dark:bg-[#1B2B20] flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                {icon}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-base sm:text-lg font-extrabold text-[#252923] dark:text-white truncate">
                  {item.name}
                </span>
                <span className="text-xs text-[#777D75] dark:text-[#8FA095] flex items-center gap-1.5">
                  <span>
                    {item.quantity} {item.unit}
                  </span>
                  <span>•</span>
                  <span className="font-mono font-bold text-[#174F32] dark:text-[#83C95B]">
                    ₱{item.estimatedTotal.toFixed(2)}
                  </span>
                </span>
                {item.notes && (
                  <span className="text-[11px] text-[#777D75] dark:text-[#8FA095] italic mt-0.5 truncate">
                    "{item.notes}"
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#777D75] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action List */}
          <div className="p-2 sm:p-3 space-y-1">
            {/* 1. Edit Item */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(item);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left hover:bg-[#F9F8F5] dark:hover:bg-white/[0.04] text-xs sm:text-sm font-bold text-[#252923] dark:text-white transition-colors"
            >
              <Edit3 className="w-4.5 h-4.5 text-[#555C50] dark:text-[#9EA59B]" />
              <span>Edit Item</span>
            </button>

            {/* 2. Mark as Purchased / Mark as Unpurchased */}
            <button
              type="button"
              onClick={handleToggle}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left hover:bg-[#F9F8F5] dark:hover:bg-white/[0.04] text-xs sm:text-sm font-bold text-[#252923] dark:text-white transition-colors"
            >
              {item.isPurchased ? (
                <>
                  <XCircle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                  <span>Mark as Unpurchased</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4.5 h-4.5 text-[#174F32] dark:text-[#83C95B]" />
                  <span>Mark as Purchased</span>
                </>
              )}
            </button>

            {/* 3. Move to Category */}
            <button
              type="button"
              onClick={() => setIsMoveCategoryOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left hover:bg-[#F9F8F5] dark:hover:bg-white/[0.04] text-xs sm:text-sm font-bold text-[#252923] dark:text-white transition-colors"
            >
              <FolderInput className="w-4.5 h-4.5 text-[#555C50] dark:text-[#9EA59B]" />
              <span>Move to Category ({item.category})</span>
            </button>

            {/* 4. Duplicate */}
            <button
              type="button"
              onClick={handleDuplicate}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left hover:bg-[#F9F8F5] dark:hover:bg-white/[0.04] text-xs sm:text-sm font-bold text-[#252923] dark:text-white transition-colors"
            >
              <Copy className="w-4.5 h-4.5 text-[#555C50] dark:text-[#9EA59B]" />
              <span>Duplicate</span>
            </button>

            {/* Status indicator if already recorded */}
            {item.isRecordedAsExpense && (
              <div className="px-4 py-2 text-[11px] text-[#4E9D39] font-semibold flex items-center gap-1.5 bg-[#4E9D39]/10 rounded-xl">
                <Receipt className="w-3.5 h-3.5" />
                <span>Recorded as an expense record in transactions</span>
              </div>
            )}

            {/* 5. Delete Item */}
            {confirmDelete ? (
              <div className="p-3 mt-1 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">
                  Are you sure you want to delete "{item.name}"?
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2 rounded-xl bg-white dark:bg-[#1B2B20] border border-[#D5D0C3] dark:border-[#2A3E31] text-xs font-semibold text-[#252923] dark:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left hover:bg-rose-500/10 text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 transition-colors"
              >
                <Trash2 className="w-4.5 h-4.5" />
                <span>Delete Item</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Move Category Selector Modal */}
      <SelectGroceryCategoryModal
        isOpen={isMoveCategoryOpen}
        onClose={() => setIsMoveCategoryOpen(false)}
        selectedCategory={item.category}
        onSelectCategory={handleSelectNewCategory}
      />
    </>
  );
};
