import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Plus,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { CategoryBudget, EXPENSE_CATEGORIES, MonthlyBudget } from '../types/finance';
import {
  formatMonthLabel,
  formatPeso,
  getMonthKey,
} from '../utils/currency';
import { calculateMonthlyBudgetSummary } from '../utils/financeEngine';

export const BudgetsPage: React.FC = () => {
  const { state, saveMonthlyBudget } = useFinance();
  const hide = state.settings.hideBalances;

  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    getMonthKey()
  );
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);

  const [draftTotalBudget, setDraftTotalBudget] = useState('');
  const [draftThreshold, setDraftThreshold] = useState('80');
  const [draftCategories, setDraftCategories] = useState<CategoryBudget[]>([]);
  const [newCategoryName, setNewCategoryName] = useState<string>(
    EXPENSE_CATEGORIES[0]
  );
  const [newCategoryLimit, setNewCategoryLimit] = useState('');

  const summary = useMemo(
    () =>
      calculateMonthlyBudgetSummary(
        selectedMonth,
        state.budgets,
        state.transactions
      ),
    [selectedMonth, state.budgets, state.transactions]
  );

  const shiftMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    );
  };

  const openBudgetEditor = () => {
    const existing = state.budgets[selectedMonth];
    if (existing) {
      setDraftTotalBudget(String(existing.totalBudget));
      setDraftThreshold(String(existing.alertThresholdPercent || 80));
      setDraftCategories([...existing.categoryBudgets]);
    } else {
      setDraftTotalBudget('25000');
      setDraftThreshold('80');
      setDraftCategories([
        { category: 'Food', limit: 8000 },
        { category: 'Bills', limit: 6000 },
        { category: 'Transportation', limit: 3500 },
        { category: 'Shopping', limit: 4000 },
      ]);
    }
    setIsEditingModalOpen(true);
  };

  const handleUpdateCategoryLimit = (category: string, val: string) => {
    const limit = Math.max(0, Number(val) || 0);
    setDraftCategories((prev) =>
      prev.map((c) => (c.category === category ? { ...c, limit } : c))
    );
  };

  const handleRemoveCategoryBudget = (category: string) => {
    setDraftCategories((prev) => prev.filter((c) => c.category !== category));
  };

  const handleAddCategoryToDraft = () => {
    if (!newCategoryName) return;
    const limit = Math.max(0, Number(newCategoryLimit) || 0);
    if (limit <= 0) return;

    setDraftCategories((prev) => {
      const exists = prev.some((c) => c.category === newCategoryName);
      if (exists) {
        return prev.map((c) =>
          c.category === newCategoryName ? { ...c, limit } : c
        );
      }
      return [...prev, { category: newCategoryName, limit }];
    });
    setNewCategoryLimit('');
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const total = Math.max(0, Number(draftTotalBudget) || 0);
    const threshold = Math.min(100, Math.max(50, Number(draftThreshold) || 80));

    const payload: MonthlyBudget = {
      monthKey: selectedMonth,
      totalBudget: total,
      alertThresholdPercent: threshold,
      categoryBudgets: draftCategories.filter((c) => c.limit > 0),
    };
    saveMonthlyBudget(selectedMonth, payload);
    setIsEditingModalOpen(false);
  };

  const warningCategories = summary.categoryBreakdown.filter(
    (c) => c.status === 'warning' || c.status === 'exceeded'
  );

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-8 w-full max-w-full min-w-0 overflow-hidden">
      {/* Month Selector */}
      <div className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.025)] flex items-center justify-between w-full max-w-full min-w-0 overflow-hidden">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-black dark:text-white" />
        </button>

        <div className="text-center px-2">
          <div className="text-[11px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Monthly Budget Period
          </div>
          <div className="text-base sm:text-lg font-bold text-black dark:text-white truncate">
            {formatMonthLabel(selectedMonth)}
          </div>
        </div>

        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-black dark:text-white" />
        </button>
      </div>

      {/* Warning Alert Banner */}
      {(summary.overallStatus === 'warning' ||
        summary.overallStatus === 'exceeded' ||
        warningCategories.length > 0) && (
        <div
          className={`rounded-[20px] sm:rounded-[22px] p-3.5 sm:p-4 flex items-start gap-2.5 sm:gap-3 border ${
            summary.overallStatus === 'exceeded' ||
            warningCategories.some((c) => c.status === 'exceeded')
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold">
              {summary.overallStatus === 'exceeded'
                ? 'Monthly Budget Limit Exceeded'
                : 'Budget Spending Alert'}
            </div>
            <p className="break-words">
              {summary.overallStatus === 'exceeded'
                ? `You spent ${formatPeso(summary.totalSpent, { hide })} of your ${formatPeso(summary.totalBudget, { hide })} budget.`
                : warningCategories.length > 0
                ? `${warningCategories.map((c) => `${c.category} (${c.percent.toFixed(0)}%)`).join(', ')}`
                : `You used ${summary.overallPercent.toFixed(0)}% of your monthly budget.`}
            </p>
          </div>
        </div>
      )}

      {/* Monthly Budget Overview */}
      <div className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-4 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.025)] space-y-3.5 sm:space-y-4 w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              Remaining Budget
            </div>
            <div
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums mt-0.5 truncate ${
                summary.remainingBudget < 0
                  ? 'text-[#DC2626]'
                  : 'text-black dark:text-white'
              }`}
            >
              {formatPeso(summary.remainingBudget, { hide })}
            </div>
          </div>

          <button
            type="button"
            onClick={openBudgetEditor}
            className="self-start sm:self-auto px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>
              {summary.totalBudget > 0 ? 'Edit Budget' : 'Set Budget'}
            </span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
            <span className="text-neutral-500 truncate mr-2">
              Spent:{' '}
              <strong className="text-black dark:text-white tabular-nums">
                {formatPeso(summary.totalSpent, { hide })}
              </strong>{' '}
              of{' '}
              <strong className="text-black dark:text-white tabular-nums">
                {formatPeso(summary.totalBudget, { hide })}
              </strong>
            </span>
            <span className="font-bold tabular-nums text-neutral-700 dark:text-neutral-300 shrink-0">
              {summary.totalBudget > 0
                ? `${summary.overallPercent.toFixed(1)}%`
                : '0%'}
            </span>
          </div>

          <div className="w-full h-2.5 sm:h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                summary.overallStatus === 'exceeded'
                  ? 'bg-[#DC2626]'
                  : summary.overallStatus === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-[#2E9E6B]'
              }`}
              style={{
                width: `${Math.min(100, Math.max(0, summary.overallPercent))}%`,
              }}
            />
          </div>
        </div>

        {/* 3 Metrics: stacks cleanly or grid-cols-3 */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px] sm:text-xs">
          <div className="p-2 sm:p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/60 min-w-0">
            <div className="text-neutral-500 truncate">Total Budget</div>
            <div className="font-bold text-black dark:text-white tabular-nums mt-0.5 truncate">
              {formatPeso(summary.totalBudget, { hide, compact: true })}
            </div>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/60 min-w-0">
            <div className="text-neutral-500 truncate">Total Spent</div>
            <div className="font-bold text-[#DC2626] tabular-nums mt-0.5 truncate">
              {formatPeso(summary.totalSpent, { hide, compact: true })}
            </div>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/60 min-w-0">
            <div className="text-neutral-500 truncate">Status</div>
            <div className="font-bold mt-0.5 truncate">
              {summary.overallStatus === 'exceeded' ? (
                <span className="text-[#DC2626]">Over Limit</span>
              ) : summary.overallStatus === 'warning' ? (
                <span className="text-amber-600">Near Limit</span>
              ) : summary.overallStatus === 'normal' ? (
                <span className="text-[#2E9E6B] flex items-center gap-1 truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">On Track</span>
                </span>
              ) : (
                <span className="text-neutral-400">Not Set</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category-Level Budgets */}
      <div className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-black dark:text-white">
              Category Budgets
            </h2>
            <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
              Calculated from actual expense transactions
            </p>
          </div>
          <button
            type="button"
            onClick={openBudgetEditor}
            className="text-xs font-semibold text-black dark:text-white hover:underline shrink-0"
          >
            Manage Limits
          </button>
        </div>

        {summary.categoryBreakdown.length === 0 ? (
          <div className="py-6 text-center space-y-2.5">
            <p className="text-xs sm:text-sm text-neutral-500">
              No category budgets set for {formatMonthLabel(selectedMonth)}.
            </p>
            <button
              type="button"
              onClick={openBudgetEditor}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Set Category Limits</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-3.5">
            {summary.categoryBreakdown.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                    <span className="font-semibold text-black dark:text-white truncate">
                      {item.category}
                    </span>
                    {item.status === 'exceeded' && (
                      <span className="text-[10px] font-bold text-[#DC2626] shrink-0">
                        · Over
                      </span>
                    )}
                    {item.status === 'warning' && (
                      <span className="text-[10px] font-bold text-amber-600 shrink-0">
                        · Warning
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold tabular-nums text-neutral-700 dark:text-neutral-300 shrink-0">
                    {formatPeso(item.spent, { hide, compact: true })} /{' '}
                    {formatPeso(item.limit, { hide, compact: true })}
                  </div>
                </div>

                <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      item.status === 'exceeded'
                        ? 'bg-[#DC2626]'
                        : item.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-[#2E9E6B]'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(0, item.percent))}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-neutral-500 tabular-nums">
                  <span>{item.percent.toFixed(0)}% used</span>
                  <span className="truncate ml-1">
                    {item.remaining >= 0
                      ? `${formatPeso(item.remaining, { hide, compact: true })} left`
                      : `${formatPeso(Math.abs(item.remaining), { hide, compact: true })} over`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {summary.unbudgetedCategories.length > 0 && (
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
            <div className="text-xs font-semibold text-neutral-500">
              Other Expenses This Month (Unbudgeted)
            </div>
            {summary.unbudgetedCategories.map((u) => (
              <div
                key={u.category}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-neutral-700 dark:text-neutral-300 truncate">
                  {u.category}
                </span>
                <span className="font-semibold text-[#DC2626] tabular-nums shrink-0 ml-2">
                  {formatPeso(u.spent, { hide })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Budget Modal */}
      {isEditingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4">
          <div className="bg-[#FAF9FB] dark:bg-neutral-900 w-full max-w-lg rounded-[24px] sm:rounded-[28px] flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4 shrink-0 border-b border-black/[0.04] dark:border-white/[0.06]">
              <h3 className="text-base sm:text-lg font-bold text-black dark:text-white truncate">
                Budget — {formatMonthLabel(selectedMonth)}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-200/70 dark:hover:bg-neutral-800"
              >
                <X className="w-5 h-5 text-black dark:text-white" />
              </button>
            </div>

            <form
              onSubmit={handleSaveBudget}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Monthly Budget (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={draftTotalBudget}
                    onChange={(e) => setDraftTotalBudget(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-black dark:text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Alert Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={draftThreshold}
                    onChange={(e) => setDraftThreshold(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-black dark:text-white tabular-nums"
                  />
                </div>
              </div>

              {/* Category Limits */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Category Spending Limits
                </div>
                {draftCategories.map((cb) => (
                  <div
                    key={cb.category}
                    className="flex items-center gap-2 bg-white dark:bg-neutral-800 p-2 sm:p-2.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700"
                  >
                    <span className="text-xs font-semibold text-black dark:text-white flex-1 truncate">
                      {cb.category}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cb.limit}
                      onChange={(e) =>
                        handleUpdateCategoryLimit(cb.category, e.target.value)
                      }
                      className="w-24 sm:w-28 px-2 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-xs font-bold text-right tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCategoryBudget(cb.category)}
                      className="p-1.5 text-neutral-400 hover:text-red-600"
                      aria-label={`Remove ${cb.category}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Category */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 space-y-2">
                <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  Add Category Limit
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-xs font-medium text-black dark:text-white"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Limit ₱"
                      value={newCategoryLimit}
                      onChange={(e) => setNewCategoryLimit(e.target.value)}
                      className="flex-1 sm:w-28 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-xs font-semibold tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategoryToDraft}
                      className="px-3.5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold whitespace-nowrap"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="w-full sm:flex-1 py-3 rounded-2xl bg-neutral-200/80 dark:bg-neutral-800 text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 py-3 rounded-2xl bg-neutral-950 dark:bg-white text-xs sm:text-sm font-semibold text-white dark:text-neutral-950"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
