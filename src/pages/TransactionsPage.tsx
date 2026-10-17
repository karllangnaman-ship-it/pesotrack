import React, { useMemo, useState } from 'react';
import { ArrowRightLeft, Filter, Minus, Plus, Search } from 'lucide-react';
import { ProviderLogo } from '../components/ProviderLogo';
import { useFinance } from '../context/FinanceContext';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TransactionRecord,
  TransactionType,
} from '../types/finance';
import {
  addPHP,
  formatPeso,
  formatTransactionDateTime,
  subPHP,
} from '../utils/currency';

interface TransactionsPageProps {
  onOpenAddTransaction: (type?: TransactionType) => void;
  onSelectTransaction: (tx: TransactionRecord) => void;
}

type DateFilterPreset = 'all' | 'this_month' | 'jul_2026' | 'custom';
type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  onOpenAddTransaction,
  onSelectTransaction,
}) => {
  const { state, reconciledAccounts } = useFinance();
  const hide = state.settings.hideBalances;

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);

  const allCategories = useMemo(() => {
    const set = new Set<string>([
      'Starting Balance',
      'Transfer',
      'Credit Payment',
      'Loan Payment',
      ...INCOME_CATEGORIES,
      ...EXPENSE_CATEGORIES,
    ]);
    state.transactions.forEach((t) => set.add(t.category));
    return Array.from(set);
  }, [state.transactions]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;

    return state.transactions
      .filter((tx) => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (
          accountFilter !== 'all' &&
          tx.accountId !== accountFilter &&
          tx.destinationAccountId !== accountFilter
        ) {
          return false;
        }
        if (categoryFilter !== 'all' && tx.category !== categoryFilter) {
          return false;
        }

        if (datePreset === 'this_month') {
          if (!tx.dateTime.startsWith(currentMonthPrefix)) return false;
        } else if (datePreset === 'jul_2026') {
          if (!tx.dateTime.startsWith('2026-07')) return false;
        } else if (datePreset === 'custom') {
          const txDate = tx.dateTime.slice(0, 10);
          if (customStartDate && txDate < customStartDate) return false;
          if (customEndDate && txDate > customEndDate) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const sourceAcc = reconciledAccounts.find(
            (a) => a.id === tx.accountId
          );
          const destAcc = tx.destinationAccountId
            ? reconciledAccounts.find((a) => a.id === tx.destinationAccountId)
            : undefined;
          const matchTitle = tx.merchantOrTitle.toLowerCase().includes(q);
          const matchCat = tx.category.toLowerCase().includes(q);
          const matchNotes = (tx.notes || '').toLowerCase().includes(q);
          const matchAcc =
            (sourceAcc?.name || '').toLowerCase().includes(q) ||
            (destAcc?.name || '').toLowerCase().includes(q);
          if (!matchTitle && !matchCat && !matchNotes && !matchAcc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return (
            new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
          );
        }
        if (sortBy === 'oldest') {
          return (
            new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
          );
        }
        if (sortBy === 'highest') {
          return b.amount - a.amount;
        }
        return a.amount - b.amount;
      });
  }, [
    state.transactions,
    reconciledAccounts,
    typeFilter,
    accountFilter,
    categoryFilter,
    datePreset,
    customStartDate,
    customEndDate,
    searchQuery,
    sortBy,
  ]);

  const summary = useMemo(() => {
    const incomeList = filteredTransactions
      .filter((t) => t.type === 'income')
      .map((t) => t.amount);
    const expenseList = filteredTransactions
      .filter((t) => t.type === 'expense')
      .map((t) => t.amount);

    const totalIncome = addPHP(...incomeList);
    const totalExpense = addPHP(...expenseList);
    const netFlow = subPHP(totalIncome, totalExpense);
    return { totalIncome, totalExpense, netFlow };
  }, [filteredTransactions]);

  return (
    <div className="transactions-page-container space-y-3.5 sm:space-y-4 pb-8 w-full max-w-full min-w-0 overflow-hidden">
      {/* Header & Quick Add */}
      <div className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] space-y-3.5 w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0">
          <div className="min-w-0 shrink">
            <h1 className="text-xl sm:text-2xl font-bold text-black dark:text-white tracking-tight truncate">
              Transactions
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {filteredTransactions.length === state.transactions.length
                ? 'All records shown'
                : `${filteredTransactions.length} record${
                    filteredTransactions.length === 1 ? '' : 's'
                  } shown`}
            </p>
          </div>

          {/* Transaction Controls Area: flex-wrap layout */}
          <div className="transaction-controls-area flex flex-wrap items-center gap-2 w-full sm:w-[260px] md:w-[280px] shrink-0">
            <button
              type="button"
              onClick={() => onOpenAddTransaction('income')}
              className="flex-1 min-w-0 py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-full bg-[#E8F8F0] dark:bg-[#073623] text-[#059669] dark:text-[#34D399] text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap min-h-[38px]"
            >
              <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>Income</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenAddTransaction('expense')}
              className="flex-1 min-w-0 py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-full bg-[#FEECEC] dark:bg-[#431418] text-[#DC2626] dark:text-[#F87171] text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap min-h-[38px]"
            >
              <Minus className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>Expense</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenAddTransaction('transfer')}
              className="w-full py-2 sm:py-2.5 px-4 rounded-full bg-[#EAE8ED] dark:bg-[#27272a] text-black dark:text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap min-h-[38px]"
            >
              <ArrowRightLeft className="w-4 h-4 stroke-[2] shrink-0" />
              <span>Transfer</span>
            </button>
          </div>
        </div>

        {/* Responsive Summary Cards: 3 columns on tablet/desktop, cleanly formatted on mobile */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 text-[11px] sm:text-xs w-full min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/70 min-w-0">
            <div className="text-neutral-500 truncate">Income</div>
            <div className="font-bold text-[#2E9E6B] tabular-nums mt-0.5 truncate">
              +{formatPeso(summary.totalIncome, { hide, compact: true })}
            </div>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/70 min-w-0">
            <div className="text-neutral-500 truncate">Expenses</div>
            <div className="font-bold text-[#DC2626] tabular-nums mt-0.5 truncate">
              -{formatPeso(summary.totalExpense, { hide, compact: true })}
            </div>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800/70 min-w-0">
            <div className="text-neutral-500 truncate">Net Flow</div>
            <div
              className={`font-bold tabular-nums mt-0.5 truncate ${
                summary.netFlow >= 0
                  ? 'text-[#2E9E6B]'
                  : 'text-[#DC2626]'
              }`}
            >
              {formatPeso(summary.netFlow, { hide, showPlus: true, compact: true })}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-2 w-full max-w-full min-w-0">
        <div className="flex items-center gap-2 w-full max-w-full min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              className="w-full min-w-0 pl-9 pr-3 py-2.5 sm:py-3 rounded-2xl bg-white dark:bg-neutral-900 text-xs sm:text-sm text-black dark:text-white placeholder:text-neutral-400 shadow-[0_2px_10px_rgba(0,0,0,0.02)] focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2.5 sm:py-3 rounded-2xl text-xs font-semibold flex items-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 ${
              showFilters
                ? 'bg-neutral-950 text-white border-neutral-950 dark:bg-white dark:text-neutral-950'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-transparent shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Type Segmented Control */}
        <div className="bg-[#E6E5EA] dark:bg-neutral-800 p-1 rounded-[14px] sm:rounded-[16px] flex items-center gap-1 overflow-x-auto no-scrollbar w-full max-w-full min-w-0">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'expense', label: 'Expenses' },
              { id: 'income', label: 'Income' },
              { id: 'transfer', label: 'Transfers' },
              { id: 'adjustment', label: 'Adjustments' },
            ] as const
          ).map((tab) => {
            const active = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={`flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-[11px] sm:rounded-[12px] text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap shrink-0 text-center ${
                  active
                    ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filters Drawer */}
        {showFilters && (
          <div className="bg-white dark:bg-neutral-900 rounded-[20px] sm:rounded-[22px] p-3.5 sm:p-4 shadow-2xs space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-neutral-500 mb-1 font-medium">
                  Account
                </label>
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 text-black dark:text-white font-medium"
                >
                  <option value="all">All Accounts</option>
                  {reconciledAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-500 mb-1 font-medium">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 text-black dark:text-white font-medium"
                >
                  <option value="all">All Categories</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-500 mb-1 font-medium">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 text-black dark:text-white font-medium"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="highest">Amount: High to Low</option>
                  <option value="lowest">Amount: Low to High</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <label className="block text-neutral-500 mb-1 font-medium">
                Date Range
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'all', label: 'All Time' },
                    { id: 'this_month', label: 'This Month' },
                    { id: 'jul_2026', label: 'Jul 2026' },
                    { id: 'custom', label: 'Custom' },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDatePreset(d.id)}
                    className={`px-2.5 py-1.5 rounded-xl font-semibold transition-colors ${
                      datePreset === d.id
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'bg-[#F6F5F8] dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {datePreset === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-0.5">
                      From
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 text-black dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-0.5">
                      To
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 text-black dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-3.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] w-full max-w-full min-w-0 overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="py-8 sm:py-10 text-center space-y-3">
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              No transactions match your current filters.
            </p>
            <button
              type="button"
              onClick={() => onOpenAddTransaction('expense')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Add Transaction</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200/90 dark:divide-neutral-800 w-full min-w-0">
            {filteredTransactions.map((tx) => {
              const acc = reconciledAccounts.find((a) => a.id === tx.accountId);
              const destAcc = tx.destinationAccountId
                ? reconciledAccounts.find(
                    (a) => a.id === tx.destinationAccountId
                  )
                : undefined;

              const isPositive =
                tx.type === 'income' ||
                (tx.type === 'adjustment' && tx.adjustmentSign !== 'negative');
              const isNegative =
                tx.type === 'expense' ||
                (tx.type === 'adjustment' && tx.adjustmentSign === 'negative');

              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => onSelectTransaction(tx)}
                  className="w-full py-3 sm:py-3.5 first:pt-1 last:pb-1 text-left hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 rounded-xl transition-colors min-w-0 overflow-hidden block"
                >
                  <div className="flex items-center justify-between text-[11px] sm:text-[12px] text-neutral-500 dark:text-neutral-400 mb-1">
                    <span>{formatTransactionDateTime(tx.dateTime)}</span>
                    <span className="truncate ml-2 max-w-[50%] text-right">
                      {acc?.name}
                      {destAcc ? ` → ${destAcc.name}` : ` · ${tx.category}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <ProviderLogo
                        providerId={acc?.providerId || 'custom'}
                        name={acc?.name || tx.category}
                        customColor={acc?.customColor}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-[15px] font-medium text-black dark:text-white truncate">
                          {tx.merchantOrTitle}
                        </div>
                        {tx.notes && (
                          <div className="text-[10px] sm:text-xs text-neutral-400 truncate">
                            {tx.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className={`text-xs sm:text-[15px] font-medium tabular-nums shrink-0 ${
                        isPositive
                          ? 'text-[#2E9E6B]'
                          : isNegative
                          ? 'text-[#DC2626]'
                          : 'text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      {isNegative ? '-' : ''}
                      {formatPeso(tx.amount, { hide })}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
