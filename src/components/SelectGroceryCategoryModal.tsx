import React, { useState } from 'react';
import { ArrowLeft, Check, Plus, Tag, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { GroceryCategory } from '../types/finance';

interface SelectGroceryCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
  onOpenManageCategories?: () => void;
}

export const SelectGroceryCategoryModal: React.FC<SelectGroceryCategoryModalProps> = ({
  isOpen,
  onClose,
  selectedCategory,
  onSelectCategory,
  onOpenManageCategories,
}) => {
  const { groceryCategories, addGroceryCategory } = useFinance();
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState('🛍️');
  const [customDescription, setCustomDescription] = useState('');

  if (!isOpen) return null;

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    const created = addGroceryCategory({
      name: customName.trim(),
      icon: customIcon.trim() || '🛍️',
      description: customDescription.trim() || `${customName.trim()} items`,
    });
    if (created) {
      onSelectCategory(created.name);
      setIsCreatingCustom(false);
      setCustomName('');
      setCustomDescription('');
      onClose();
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
      <div className="relative w-full max-w-md bg-white dark:bg-[#15221B] rounded-3xl shadow-2xl border border-[#E5E1D8] dark:border-[#223528] overflow-hidden flex flex-col max-h-[90vh]">
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
              Select Category
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

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 overscroll-contain">
          {groceryCategories.map((cat) => {
            const isSelected =
              selectedCategory.toLowerCase() === cat.name.toLowerCase();

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onSelectCategory(cat.name);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'border-[#174F32] bg-[#174F32]/5 dark:bg-[#1E382A]/50 dark:border-[#83C95B]/40'
                    : 'border-transparent hover:border-[#E5E1D8] dark:hover:border-[#223528] hover:bg-[#F9F8F5] dark:hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#EDE9DF]/60 dark:bg-[#1B2B20] flex items-center justify-center text-xl shrink-0 shadow-2xs">
                    {cat.icon || '📦'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-[#252923] dark:text-white truncate">
                      {cat.name}
                    </span>
                    {cat.description && (
                      <span className="text-xs text-[#777D75] dark:text-[#8FA095] truncate">
                        {cat.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 ml-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-[#174F32] dark:border-[#83C95B] bg-[#174F32] dark:bg-[#83C95B]'
                        : 'border-[#CCC7BD] dark:border-[#3A4E40]'
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white dark:bg-[#121C16]" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Custom Category Creation Form / Button */}
          {isCreatingCustom ? (
            <form
              onSubmit={handleCreateCustom}
              className="mt-3 p-4 rounded-2xl bg-[#F6F4EE] dark:bg-[#111A14] border border-[#E5E1D8] dark:border-[#223528] space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#174F32] dark:text-[#83C95B]">
                  New Custom Category
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingCustom(false)}
                  className="text-xs text-[#777D75] hover:text-[#252923] dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={4}
                  value={customIcon}
                  onChange={(e) => setCustomIcon(e.target.value)}
                  title="Emoji icon"
                  className="w-12 h-10 text-center rounded-xl border border-[#D5D0C3] dark:border-[#2A3E31] bg-white dark:bg-[#15221B] text-lg focus:outline-none focus:ring-2 focus:ring-[#174F32]"
                />
                <input
                  type="text"
                  placeholder="Category Name (e.g. Frozen Food)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-[#D5D0C3] dark:border-[#2A3E31] bg-white dark:bg-[#15221B] text-[#252923] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32]"
                  autoFocus
                />
              </div>

              <input
                type="text"
                placeholder="Description / examples (Optional)"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#D5D0C3] dark:border-[#2A3E31] bg-white dark:bg-[#15221B] text-[#252923] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32]"
              />

              <button
                type="submit"
                disabled={!customName.trim()}
                className="w-full py-2.5 rounded-xl bg-[#174F32] hover:bg-[#123E27] disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Save Category
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreatingCustom(true)}
              className="w-full mt-2 py-3 px-4 rounded-2xl border border-dashed border-[#C8C2B4] dark:border-[#2E4233] text-xs font-bold text-[#174F32] dark:text-[#83C95B] hover:bg-[#174F32]/5 dark:hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Category</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
