import React, { useState } from 'react';
import { AlertTriangle, ArrowLeft, Edit3, Plus, Trash2, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { GroceryCategory } from '../types/finance';
import { calculateCategorySummaries } from '../utils/groceryEngine';

interface ManageGroceryCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory?: (categoryName: string) => void;
}

export const ManageGroceryCategoriesModal: React.FC<ManageGroceryCategoriesModalProps> = ({
  isOpen,
  onClose,
  onSelectCategory,
}) => {
  const {
    groceryCategories,
    groceryItems,
    addGroceryCategory,
    updateGroceryCategory,
    deleteGroceryCategory,
  } = useFinance();

  const [isAdding, setIsAdding] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('🛍️');
  const [formDesc, setFormDesc] = useState('');

  // Deletion modal state for moving items safely
  const [deletingCat, setDeletingCat] = useState<GroceryCategory | null>(null);
  const [targetCategoryForItems, setTargetCategoryForItems] = useState('Others');

  if (!isOpen) return null;

  const categorySummaries = calculateCategorySummaries(
    groceryCategories,
    groceryItems
  );

  const handleStartAdd = () => {
    setEditingCatId(null);
    setFormName('');
    setFormIcon('🛍️');
    setFormDesc('');
    setIsAdding(true);
  };

  const handleStartEdit = (cat: GroceryCategory) => {
    setIsAdding(false);
    setEditingCatId(cat.id);
    setFormName(cat.name);
    setFormIcon(cat.icon || '🛍️');
    setFormDesc(cat.description || '');
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingCatId) {
      updateGroceryCategory(editingCatId, {
        name: formName.trim(),
        icon: formIcon.trim() || '🛍️',
        description: formDesc.trim() || undefined,
      });
      setEditingCatId(null);
    } else {
      addGroceryCategory({
        name: formName.trim(),
        icon: formIcon.trim() || '🛍️',
        description: formDesc.trim() || undefined,
      });
      setIsAdding(false);
    }
    setFormName('');
    setFormDesc('');
  };

  const handleConfirmDelete = () => {
    if (!deletingCat) return;
    deleteGroceryCategory(deletingCat.id, targetCategoryForItems);
    setDeletingCat(null);
  };

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
        <div className="relative w-full max-w-lg bg-white dark:bg-[#15221B] rounded-3xl shadow-2xl border border-[#E5E1D8] dark:border-[#223528] overflow-hidden flex flex-col max-h-[90vh]">
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
                Grocery Categories
              </h2>
            </div>
            <button
              type="button"
              onClick={handleStartAdd}
              className="px-3 py-1.5 rounded-xl bg-[#174F32] dark:bg-[#1E382A] text-white dark:text-[#83C95B] text-xs font-bold flex items-center gap-1 shadow-2xs hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain">
            {/* Create or Edit Form */}
            {(isAdding || editingCatId) && (
              <form
                onSubmit={handleSaveCategory}
                className="p-4 rounded-2xl bg-[#F6F4EE] dark:bg-[#111A14] border border-[#E5E1D8] dark:border-[#223528] space-y-3 mb-2 animate-in fade-in"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#174F32] dark:text-[#83C95B]">
                    {editingCatId ? 'Edit Category' : 'New Custom Category'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingCatId(null);
                    }}
                    className="text-xs text-[#777D75] hover:text-[#252923] dark:hover:text-white font-semibold"
                  >
                    Cancel
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    title="Emoji Icon"
                    className="w-12 h-10 text-center rounded-xl border border-[#D5D0C3] dark:border-[#2A3E31] bg-white dark:bg-[#15221B] text-lg focus:outline-none focus:ring-2 focus:ring-[#174F32]"
                  />
                  <input
                    type="text"
                    placeholder="Category Name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-[#D5D0C3] dark:border-[#2A3E31] bg-white dark:bg-[#15221B] text-[#252923] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32]"
                    autoFocus
                  />
                </div>

                <input
                  type="text"
                  placeholder="Description / examples (Optional)"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D5D0C3] dark:border-[#2A3E31] bg-white dark:bg-[#15221B] text-[#252923] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#174F32]"
                />

                <button
                  type="submit"
                  disabled={!formName.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#174F32] hover:bg-[#123E27] disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {editingCatId ? 'Save Changes' : 'Create Category'}
                </button>
              </form>
            )}

            {/* Category Cards List */}
            <div className="space-y-2">
              {categorySummaries.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F6F4EE]/50 dark:bg-[#111A14] border border-[#E5E1D8] dark:border-[#223528]"
                >
                  <div
                    onClick={() => {
                      if (onSelectCategory) {
                        onSelectCategory(cat.name);
                        onClose();
                      }
                    }}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#1B2B20] flex items-center justify-center text-xl shrink-0 shadow-2xs border border-[#E5E1D8]/60 dark:border-[#223528]">
                      {cat.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#252923] dark:text-white truncate">
                          {cat.name}
                        </span>
                        {cat.isCustom && (
                          <span className="px-1.5 py-0.5 rounded-md bg-[#174F32]/10 dark:bg-[#1E382A] text-[10px] font-bold text-[#174F32] dark:text-[#83C95B]">
                            Custom
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#777D75] dark:text-[#8FA095]">
                        {cat.itemCount} {cat.itemCount === 1 ? 'item' : 'items'}
                        {cat.totalCost > 0 && ` • ₱${cat.totalCost.toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  {/* Actions for custom categories */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleStartEdit({
                          id: cat.id,
                          name: cat.name,
                          icon: cat.icon,
                          description: cat.description,
                          isCustom: cat.isCustom,
                        })
                      }
                      title="Edit Category"
                      className="p-2 rounded-xl text-[#777D75] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {cat.isCustom && (
                      <button
                        type="button"
                        onClick={() =>
                          setDeletingCat({
                            id: cat.id,
                            name: cat.name,
                            icon: cat.icon,
                            isCustom: true,
                          })
                        }
                        title="Delete Category"
                        className="p-2 rounded-xl text-[#777D75] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Safe Category Deletion Dialog */}
      {deletingCat && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={() => setDeletingCat(null)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#15221B] rounded-3xl p-5 shadow-2xl border border-[#E5E1D8] dark:border-[#223528] space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-extrabold text-[#252923] dark:text-white">
                Delete "{deletingCat.name}"?
              </h3>
            </div>

            <p className="text-xs text-[#555C50] dark:text-[#9EA59B] leading-relaxed">
              To prevent losing any existing groceries, any items currently categorized under "{deletingCat.name}" will be safely reassigned to the selected category below.
            </p>

            <div>
              <label
                htmlFor="reassign-category-select"
                className="block text-xs font-bold text-[#555C50] dark:text-[#9EA59B] mb-1.5"
              >
                Reassign items to:
              </label>
              <select
                id="reassign-category-select"
                value={targetCategoryForItems}
                onChange={(e) => setTargetCategoryForItems(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D0C3] dark:border-[#2A3E31] bg-white dark:bg-[#111A14] text-[#252923] dark:text-white text-xs font-bold"
              >
                {groceryCategories
                  .filter((c) => c.id !== deletingCat.id)
                  .map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.icon || '📦'} {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Delete Category
              </button>
              <button
                type="button"
                onClick={() => setDeletingCat(null)}
                className="flex-1 py-2.5 rounded-xl bg-white dark:bg-[#111A14] border border-[#D5D0C3] dark:border-[#2A3E31] text-xs font-semibold text-[#252923] dark:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
