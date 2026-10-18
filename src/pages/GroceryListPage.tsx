import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BarChart2,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  MoreVertical,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Sparkles,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { ActiveTab, GroceryItem } from '../types/finance';
import { formatPeso, getMonthKey } from '../utils/currency';
import {
  calculateCategorySummaries,
  calculateGrocerySummary,
  getCategoryIcon,
} from '../utils/groceryEngine';
import { AddGroceryModal } from '../components/AddGroceryModal';
import { ConvertGroceryExpenseModal } from '../components/ConvertGroceryExpenseModal';
import { GroceryItemDetailModal } from '../components/GroceryItemDetailModal';
import { ManageGroceryCategoriesModal } from '../components/ManageGroceryCategoriesModal';

interface GroceryListPageProps {
  onNavigate?: (tab: ActiveTab) => void;
  onOpenAddTransaction?: (type?: any) => void;
}

type GroceryFilterTab = 'all' | 'to-buy' | 'purchased' | 'categories';

export const GroceryListPage: React.FC<GroceryListPageProps> = ({
  onNavigate,
}) => {
  const {
    groceryItems,
    groceryCategories,
    toggleGroceryPurchased,
    state,
  } = useFinance();

  // Tab & Filter states
  const [activeFilterTab, setActiveFilterTab] = useState<GroceryFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [selectedItemForMenu, setSelectedItemForMenu] = useState<GroceryItem | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  // Calculations
  const summary = useMemo(
    () => calculateGrocerySummary(groceryItems),
    [groceryItems]
  );

  const categorySummaries = useMemo(
    () => calculateCategorySummaries(groceryCategories, groceryItems),
    [groceryCategories, groceryItems]
  );

  // Budget integration: check if current month has a budget for "Groceries" or "Food"
  const currentMonthKey = getMonthKey();
  const currentMonthBudget = state.budgets[currentMonthKey];
  const groceryBudgetConfig = currentMonthBudget?.categoryBudgets.find(
    (b) =>
      b.category.toLowerCase() === 'groceries' ||
      b.category.toLowerCase() === 'food'
  );

  // Actual spent in Groceries/Food this month
  const actualGrocerySpentThisMonth = useMemo(() => {
    return state.transactions
      .filter((tx) => {
        if (tx.type !== 'expense' || tx.isStartingBalance) return false;
        const txMonth = tx.dateTime.slice(0, 7);
        if (txMonth !== currentMonthKey) return false;
        const cat = tx.category.toLowerCase();
        return cat === 'groceries' || cat === 'food';
      })
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [state.transactions, currentMonthKey]);

  // Filtered Items logic
  const filteredItems = useMemo(() => {
    let result = groceryItems.filter((i) => !i.isDeleted);

    // Filter by tab
    if (activeFilterTab === 'to-buy') {
      result = result.filter((i) => !i.isPurchased);
    } else if (activeFilterTab === 'purchased') {
      result = result.filter((i) => i.isPurchased);
    }

    // Filter by category if selected
    if (selectedCategoryFilter) {
      result = result.filter(
        (i) => i.category.toLowerCase() === selectedCategoryFilter.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          (i.notes && i.notes.toLowerCase().includes(q))
      );
    }

    // Sort: unpurchased first in 'all' view, then by createdAt descending
    return result.sort((a, b) => {
      if (activeFilterTab === 'all') {
        if (a.isPurchased !== b.isPurchased) {
          return a.isPurchased ? 1 : -1;
        }
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [groceryItems, activeFilterTab, selectedCategoryFilter, searchQuery]);

  // Handlers
  const handleOpenAdd = (category?: string) => {
    setEditingItem(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (item: GroceryItem) => {
    setSelectedItemForMenu(null);
    setEditingItem(item);
    setIsAddModalOpen(true);
  };

  const handleSelectCategoryFromGrid = (catName: string) => {
    setSelectedCategoryFilter(catName);
    setActiveFilterTab('all');
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 max-w-5xl mx-auto animate-in fade-in duration-150">
      {/* 1. Header with Title & Action CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#174F32] dark:bg-[#1E382A] text-[#83C95B] flex items-center justify-center shadow-xs shrink-0">
            <ShoppingCart className="w-6 h-6 stroke-[2.3]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#252923] dark:text-white tracking-tight">
              Grocery List
            </h1>
            <p className="text-xs sm:text-sm text-[#777D75] dark:text-[#8FA095]">
              Plan your grocery items, track your purchases, and add them to expenses.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {/* Add to Expenses Action Button (Highlighted when unrecorded purchases exist) */}
          {summary.unrecordedPurchasedCount > 0 && (
            <button
              type="button"
              onClick={() => setIsConvertModalOpen(true)}
              className="px-3.5 sm:px-4 py-2.5 rounded-2xl bg-white dark:bg-[#15221B] border border-[#174F32]/30 dark:border-[#83C95B]/40 text-[#174F32] dark:text-[#83C95B] hover:bg-[#174F32]/5 text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              <span>Add to Expenses</span>
              <span className="w-5 h-5 rounded-full bg-[#174F32] dark:bg-[#83C95B] text-white dark:text-[#0D1410] text-[10px] flex items-center justify-center font-bold">
                {summary.unrecordedPurchasedCount}
              </span>
            </button>
          )}

          {/* Primary Inline Add Button */}
          <button
            type="button"
            onClick={() => handleOpenAdd()}
            className="px-4 py-2.5 rounded-2xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs sm:text-sm font-extrabold shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.8]" />
            <span>Add Grocery Item</span>
          </button>
        </div>
      </div>

      {/* 2. Summary Metric Card (Matches Panel 1 of Reference Mockup) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        {/* Left Column: Estimated Total */}
        <div className="flex flex-col justify-center border-b sm:border-b-0 sm:border-r border-[#E5E1D8] dark:border-[#223528] pb-3 sm:pb-0 sm:pr-4">
          <span className="text-xs font-bold text-[#777D75] dark:text-[#8FA095]">
            Estimated Total
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#252923] dark:text-white mt-1 tabular-nums">
            ₱{summary.estimatedTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-[#777D75] dark:text-[#8FA095] mt-0.5">
            {summary.totalCount} {summary.totalCount === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Right Column: Checked / Purchased with Progress Bar */}
        <div className="flex flex-col justify-center sm:pl-4 pt-1 sm:pt-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#777D75] dark:text-[#8FA095]">
              Checked
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-[#252923] dark:text-white tabular-nums">
              {summary.checkedCount} / {summary.totalCount}
            </span>
          </div>

          {/* Green progress bar */}
          <div className="w-full h-2.5 rounded-full bg-[#EDE9DF] dark:bg-[#1F3325] mt-2 overflow-hidden">
            <div
              className="h-full bg-[#174F32] dark:bg-[#4E9D39] transition-all duration-300 rounded-full"
              style={{ width: `${summary.checkedPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#777D75] dark:text-[#8FA095] mt-2">
            <span>Purchased: ₱{summary.purchasedTotal.toFixed(2)}</span>
            <span>Remaining: ₱{summary.remainingEstimatedCost.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 3. Budget Integration Card (Requirement 8) */}
      {groceryBudgetConfig ? (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F6F4EE] dark:bg-[#111A14] border border-[#E5E1D8] dark:border-[#223528] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#174F32]/10 dark:bg-[#1E382A] text-[#174F32] dark:text-[#83C95B] flex items-center justify-center shrink-0">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#252923] dark:text-white">
                Monthly {groceryBudgetConfig.category} Budget
              </span>
              <span className="text-[11px] text-[#777D75] dark:text-[#8FA095]">
                Limit: ₱{groceryBudgetConfig.limit.toLocaleString()} • Recorded Spent: ₱{actualGrocerySpentThisMonth.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[11px] font-bold text-[#174F32] dark:text-[#83C95B]">
              Planned List: ₱{summary.estimatedTotal.toFixed(2)}
            </span>
          </div>
        </div>
      ) : (
        <div className="px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-[#15221B]/70 border border-[#E5E1D8] dark:border-[#223528] flex items-center justify-between text-xs text-[#777D75] dark:text-[#8FA095]">
          <span>💡 Estimated grocery totals are planning values and won't affect financial expenses until recorded.</span>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('budgets')}
              className="font-bold text-[#174F32] dark:text-[#83C95B] hover:underline shrink-0 ml-2"
            >
              Set Budget
            </button>
          )}
        </div>
      )}

      {/* 4. Filter Tabs & Search Bar */}
      <div className="space-y-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_1px_6px_rgba(0,0,0,0.02)] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveFilterTab('all')}
            className={`flex-1 min-w-[70px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center whitespace-nowrap cursor-pointer ${
              activeFilterTab === 'all'
                ? 'bg-[#174F32] text-white dark:bg-[#1E382A] dark:text-[#86EFAC] shadow-xs'
                : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveFilterTab('to-buy')}
            className={`flex-1 min-w-[70px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center whitespace-nowrap cursor-pointer ${
              activeFilterTab === 'to-buy'
                ? 'bg-[#174F32] text-white dark:bg-[#1E382A] dark:text-[#86EFAC] shadow-xs'
                : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
            }`}
          >
            To Buy
          </button>
          <button
            type="button"
            onClick={() => setActiveFilterTab('purchased')}
            className={`flex-1 min-w-[70px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center whitespace-nowrap cursor-pointer ${
              activeFilterTab === 'purchased'
                ? 'bg-[#174F32] text-white dark:bg-[#1E382A] dark:text-[#86EFAC] shadow-xs'
                : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
            }`}
          >
            Purchased
          </button>
          <button
            type="button"
            onClick={() => setActiveFilterTab('categories')}
            className={`flex-1 min-w-[70px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center whitespace-nowrap cursor-pointer ${
              activeFilterTab === 'categories'
                ? 'bg-[#174F32] text-white dark:bg-[#1E382A] dark:text-[#86EFAC] shadow-xs'
                : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
            }`}
          >
            Categories
          </button>
        </div>

        {/* Search & Active Category Filter indicator */}
        {activeFilterTab !== 'categories' && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#777D75] dark:text-[#8FA095] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search grocery items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] text-xs sm:text-sm font-medium text-[#252923] dark:text-white placeholder-[#777D75] focus:outline-none focus:ring-2 focus:ring-[#174F32]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777D75] hover:text-[#252923] dark:hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {selectedCategoryFilter && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#174F32]/10 dark:bg-[#1E382A] text-[#174F32] dark:text-[#83C95B] text-xs font-bold shrink-0">
                <span>{getCategoryIcon(selectedCategoryFilter)}</span>
                <span>{selectedCategoryFilter}</span>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter(null)}
                  className="ml-1 hover:opacity-75"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Main View: Categories Grid (Panel 6) or Items List (Panel 1/5) */}
      {activeFilterTab === 'categories' ? (
        /* Categories Grid View (Matches Panel 6) */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-[#555C50] dark:text-[#9EA59B] uppercase tracking-wider">
              Grocery Categories
            </h3>
            <button
              type="button"
              onClick={() => setIsManageCategoriesOpen(true)}
              className="text-xs font-bold text-[#174F32] dark:text-[#83C95B] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manage / Add Category</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {categorySummaries.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategoryFromGrid(cat.name)}
                className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#174F32]/40 dark:hover:border-[#83C95B]/40 hover:scale-[1.02] transition-all text-center cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#F6F4EE] dark:bg-[#1B2B20] flex items-center justify-center text-3xl mb-2.5 shadow-2xs group-hover:scale-110 transition-transform">
                  {cat.icon}
                </div>
                <span className="text-sm font-bold text-[#252923] dark:text-white">
                  {cat.name}
                </span>
                <span className="text-xs text-[#777D75] dark:text-[#8FA095] mt-0.5">
                  {cat.itemCount} {cat.itemCount === 1 ? 'item' : 'items'}
                </span>
                {cat.totalCost > 0 && (
                  <span className="text-[11px] font-mono font-bold text-[#174F32] dark:text-[#83C95B] mt-1">
                    ₱{cat.totalCost.toFixed(2)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Items List View (Matches Panel 1 & 5) */
        <div className="space-y-2">
          {filteredItems.length === 0 ? (
            /* Empty State */
            <div className="p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-xs flex flex-col items-center justify-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#174F32]/10 dark:bg-[#1E382A] text-[#174F32] dark:text-[#83C95B] flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 opacity-75" />
              </div>
              <div className="max-w-sm">
                <h4 className="text-base font-extrabold text-[#252923] dark:text-white">
                  {searchQuery
                    ? 'No matching grocery items'
                    : activeFilterTab === 'purchased'
                    ? 'No purchased items yet'
                    : activeFilterTab === 'to-buy'
                    ? 'All items purchased!'
                    : 'Your grocery list is empty'}
                </h4>
                <p className="text-xs text-[#777D75] dark:text-[#8FA095] mt-1">
                  {searchQuery
                    ? `No groceries found matching "${searchQuery}". Try a different keyword.`
                    : activeFilterTab === 'purchased'
                    ? 'Items marked as purchased will appear here.'
                    : activeFilterTab === 'to-buy'
                    ? 'Great job! You have purchased everything on your grocery list.'
                    : 'Add fruits, vegetables, meat, grains, and pantry supplies to start planning.'}
                </p>
              </div>

              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => handleOpenAdd()}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  + Add First Grocery Item
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#15221B] rounded-3xl border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_8px_rgba(0,0,0,0.02)] divide-y divide-[#E5E1D8]/60 dark:divide-[#223528] overflow-hidden">
              {filteredItems.map((item) => {
                const icon = getCategoryIcon(item.category);

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3.5 sm:p-4 hover:bg-[#F9F8F5] dark:hover:bg-[#17251E] transition-colors ${
                      item.isPurchased && activeFilterTab === 'purchased'
                        ? 'bg-[#174F32]/[0.02] dark:bg-[#1E382A]/10'
                        : ''
                    }`}
                  >
                    {/* Left: Checkbox + Icon + Name & Category */}
                    <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleGroceryPurchased(item.id)}
                        aria-label={
                          item.isPurchased
                            ? `Mark ${item.name} as unpurchased`
                            : `Mark ${item.name} as purchased`
                        }
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                          item.isPurchased
                            ? 'border-[#174F32] bg-[#174F32] dark:border-[#83C95B] dark:bg-[#83C95B] text-white dark:text-[#0D1410]'
                            : 'border-[#CCC7BD] dark:border-[#3A4E40] hover:border-[#174F32]'
                        }`}
                      >
                        {item.isPurchased && (
                          <Check className="w-4 h-4 stroke-[3]" />
                        )}
                      </button>

                      {/* Category Icon */}
                      <div className="w-10 h-10 rounded-2xl bg-[#EDE9DF]/60 dark:bg-[#1B2B20] flex items-center justify-center text-xl shrink-0 shadow-2xs">
                        {icon}
                      </div>

                      {/* Text info */}
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm sm:text-base font-bold truncate ${
                              item.isPurchased && activeFilterTab === 'purchased'
                                ? 'text-[#252923] dark:text-white'
                                : item.isPurchased
                                ? 'text-[#777D75] dark:text-[#8FA095] line-through'
                                : 'text-[#252923] dark:text-white'
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.isRecordedAsExpense && (
                            <span className="px-1.5 py-0.5 rounded-md bg-[#4E9D39]/15 text-[#4E9D39] text-[10px] font-bold shrink-0">
                              Recorded
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-[#777D75] dark:text-[#8FA095] mt-0.5">
                          <span>{item.category}</span>
                          {item.isPurchased && item.purchasedDate && (
                            <span className="flex items-center gap-1 text-[11px] text-[#4E9D39] font-medium">
                              <Clock className="w-3 h-3" />
                              <span>{item.purchasedDate}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Price + Quantity/Unit + More Options Menu */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-3">
                      <div className="flex flex-col items-end">
                        <span
                          className={`font-mono text-sm sm:text-base font-extrabold tabular-nums ${
                            item.isPurchased && activeFilterTab === 'purchased'
                              ? 'text-[#252923] dark:text-white'
                              : item.isPurchased
                              ? 'text-[#777D75] dark:text-[#8FA095]'
                              : 'text-[#252923] dark:text-white'
                          }`}
                        >
                          ₱{item.estimatedTotal.toFixed(2)}
                        </span>
                        <span className="text-xs text-[#777D75] dark:text-[#8FA095]">
                          {item.quantity} {item.unit}
                        </span>
                      </div>

                      {/* Options Menu Button (...) */}
                      <button
                        type="button"
                        onClick={() => setSelectedItemForMenu(item)}
                        aria-label={`Options for ${item.name}`}
                        className="p-1.5 sm:p-2 rounded-xl text-[#777D75] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Floating Action Button (+) at bottom right (Panel 1 & 5) */}
      <button
        type="button"
        onClick={() => handleOpenAdd()}
        aria-label="Add grocery item"
        className="fixed bottom-[max(env(safe-area-inset-bottom,0px),1.25rem)] right-4 sm:right-6 md:right-8 z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#174F32] hover:bg-[#123E27] text-white shadow-[0_8px_24px_rgba(23,79,50,0.38)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
      >
        <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.8]" />
      </button>

      {/* 7. All Modals */}
      <AddGroceryModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        editingItem={editingItem}
        initialCategory={selectedCategoryFilter || undefined}
      />

      <GroceryItemDetailModal
        item={selectedItemForMenu}
        onClose={() => setSelectedItemForMenu(null)}
        onEdit={handleOpenEdit}
      />

      <ConvertGroceryExpenseModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        onSuccess={() => {
          setActiveFilterTab('purchased');
        }}
      />

      <ManageGroceryCategoriesModal
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        onSelectCategory={handleSelectCategoryFromGrid}
      />
    </div>
  );
};
