import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit2,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface SmartCategorySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'expense' | 'income';
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export const SmartCategorySelectorModal: React.FC<SmartCategorySelectorModalProps> = ({
  isOpen,
  onClose,
  type,
  selectedCategory,
  onSelectCategory,
}) => {
  const {
    customCategories,
    addCustomCategory,
    renameCustomCategory,
    deleteCustomCategory,
    reorderCustomCategories,
    resetCategoriesToDefault,
  } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [isManageMode, setIsManageMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  if (!isOpen) return null;

  const categories = customCategories[type] || [];

  const filteredCategories = categories.filter((cat) =>
    cat.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const ok = addCustomCategory(type, newCategoryName.trim());
    if (ok) {
      onSelectCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsAddingNew(false);
    }
  };

  const handleSaveRename = (oldName: string) => {
    if (!editingValue.trim() || editingValue.trim() === oldName) {
      setEditingCategory(null);
      return;
    }
    const ok = renameCustomCategory(type, oldName, editingValue.trim());
    if (ok) {
      if (selectedCategory === oldName) {
        onSelectCategory(editingValue.trim());
      }
      setEditingCategory(null);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const nextList = [...categories];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= nextList.length) return;
    const [removed] = nextList.splice(index, 1);
    nextList.splice(targetIdx, 0, removed);
    reorderCustomCategories(type, nextList);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-[#FAF9FB] dark:bg-neutral-900 w-full max-w-md rounded-[24px] sm:rounded-[28px] flex flex-col max-h-[85vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.04] dark:border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
            <h3 className="text-base font-bold text-black dark:text-white capitalize">
              Select {type} Category
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIsManageMode(!isManageMode);
                setIsAddingNew(false);
                setEditingCategory(null);
              }}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                isManageMode
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>{isManageMode ? 'Done' : 'Manage'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-full hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            </button>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 space-y-2.5 shrink-0 border-b border-black/[0.04] dark:border-white/[0.06]">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs sm:text-sm text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          {/* New Category Toggle or Form */}
          {!isAddingNew ? (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-neutral-900 dark:text-white hover:opacity-80"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add Custom Category</span>
              </button>

              {isManageMode && (
                <button
                  type="button"
                  onClick={resetCategoriesToDefault}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 hover:text-red-600"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Defaults</span>
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleAdd} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                autoFocus
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name (e.g. Pet Care, Coffee)"
                className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold shrink-0 hover:opacity-90"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-2.5 py-2 rounded-xl bg-neutral-200/80 dark:bg-neutral-700 text-xs text-neutral-700 dark:text-neutral-300"
              >
                Cancel
              </button>
            </form>
          )}
        </div>

        {/* Category List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-black/[0.03] dark:divide-white/[0.04]">
          {filteredCategories.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              No categories found matching &quot;{searchQuery}&quot;.
            </div>
          ) : (
            filteredCategories.map((category, index) => {
              const isSelected = selectedCategory === category;
              const isEditingThis = editingCategory === category;

              if (isEditingThis) {
                return (
                  <div key={category} className="flex items-center gap-2 py-2 px-1">
                    <input
                      type="text"
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 text-xs text-black dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRename(category)}
                      className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCategory(null)}
                      className="p-2 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={category}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                    isSelected
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs font-bold'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!isManageMode) {
                        onSelectCategory(category);
                        onClose();
                      }
                    }}
                    className="flex-1 text-left flex items-center gap-2.5 min-w-0"
                  >
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isSelected
                          ? type === 'income'
                            ? 'bg-[#2E9E6B]'
                            : 'bg-[#DC2626]'
                          : 'bg-neutral-400 dark:bg-neutral-500'
                      }`}
                    />
                    <span className="text-xs sm:text-sm font-medium truncate">
                      {category}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 ml-auto stroke-[2.5] shrink-0" />
                    )}
                  </button>

                  {isManageMode && (
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMove(index, 'up')}
                        title="Move up"
                        className="p-1 rounded text-neutral-400 hover:text-black dark:hover:text-white disabled:opacity-20"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === categories.length - 1}
                        onClick={() => handleMove(index, 'down')}
                        title="Move down"
                        className="p-1 rounded text-neutral-400 hover:text-black dark:hover:text-white disabled:opacity-20"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(category);
                          setEditingValue(category);
                        }}
                        title="Rename"
                        className="p-1 rounded text-neutral-500 hover:text-black dark:hover:text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCustomCategory(type, category)}
                        title="Delete"
                        className="p-1 rounded text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
