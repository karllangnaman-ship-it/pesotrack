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
      <div className="bg-white dark:bg-[#15221B] rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] space-y-3.5 w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0">
          <div className="min-w-0 shrink">
            <h1 className="text-xl sm:text-2xl font-black text-[#252923] dark:text-white tracking-tight truncate">
              Transactions
            </h1>
            <p className="text-xs sm:text-sm text-[#777D75] dark:text-[#8FA095] mt-0.5">
              {filteredTransactions.length === state.transactions.length
                ? 'View and manage all your financial activity.'
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
              className="flex-1 min-w-0 py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-xl bg-[#E8F5E9] dark:bg-[#193B28] text-[#16A34A] dark:text-[#83C95B] text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap min-h-[38px]"
            >
              <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>Income</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenAddTransaction('expense')}
              className="flex-1 min-w-0 py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-xl bg-[#FEE2E2] dark:bg-[#3D1A18] text-[#DC2626] dark:text-[#FCA5A5] text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap min-h-[38px]"
            >
              <Minus className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>Expense</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenAddTransaction('transfer')}
              className="w-full py-2 sm:py-2.5 px-4 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] text-[#252923] dark:text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-[#EFECE3] border border-[#E5E1D8] dark:border-[#243A2C] transition-colors whitespace-nowrap min-h-[38px]"
            >
              <ArrowRightLeft className="w-4 h-4 stroke-[2] shrink-0 text-[#174F32] dark:text-[#83C95B]" />
              <span>Transfer</span>
            </button>
          </div>
        </div>

        {/* Responsive Summary Cards: 3 columns on tablet/desktop, cleanly formatted on mobile */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 pt-2.5 border-t border-[#E5E1D8] dark:border-[#223528] text-[11px] sm:text-xs w-full min-w-0">
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] min-w-0">
            <div className="text-[#777D75] dark:text-[#8FA095] truncate">Income</div>
            <div className="font-extrabold text-[#16A34A] dark:text-[#83C95B] tabular-nums mt-0.5 truncate">
              +{formatPeso(summary.totalIncome, { hide, compact: true })}
            </div>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] min-w-0">
            <div className="text-[#777D75] dark:text-[#8FA095] truncate">Expenses</div>
            <div className="font-extrabold text-[#DC2626] tabular-nums mt-0.5 truncate">
              -{formatPeso(summary.totalExpense, { hide, compact: true })}
            </div>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] min-w-0">
            <div className="text-[#777D75] dark:text-[#8FA095] truncate">Net Flow</div>
            <div
              className={`font-extrabold tabular-nums mt-0.5 truncate ${
                summary.netFlow >= 0
                  ? 'text-[#16A34A] dark:text-[#83C95B]'
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
            <Search className="w-4 h-4 text-[#777D75] dark:text-[#8FA095] absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              className="w-full min-w-0 pl-9 pr-3 py-2.5 sm:py-3 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] text-xs sm:text-sm text-[#252923] dark:text-white placeholder:text-[#777D75] shadow-[0_2px_10px_rgba(0,0,0,0.02)] focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3.5 py-2.5 sm:py-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 border transition-all whitespace-nowrap shrink-0 ${
              showFilters
                ? 'bg-[#174F32] text-white border-[#174F32] dark:bg-[#83C95B] dark:text-[#174F32]'
                : 'bg-white dark:bg-[#15221B] text-[#61685D] dark:text-[#9EA59B] border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-[#174F32]/30'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Type Segmented Control */}
        <div className="bg-[#E8E4DA] dark:bg-[#16241C] p-1 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar w-full max-w-full min-w-0 shadow-2xs">
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
                className={`flex-1 py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 text-center ${
                  active
                    ? 'bg-[#174F32] text-white shadow-2xs'
                    : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filters Drawer */}
        {showFilters && (
          <div className="bg-white dark:bg-[#15221B] rounded-[22px] p-3.5 sm:p-4 border border-[#E5E1D8] dark:border-[#223528] shadow-xs space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[#777D75] dark:text-[#8FA095] mb-1 font-semibold">
                  Account
                </label>
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] text-[#252923] dark:text-white border border-[#E5E1D8] dark:border-[#243A2C] font-medium focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
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
                <label className="block text-[#777D75] dark:text-[#8FA095] mb-1 font-semibold">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] text-[#252923] dark:text-white border border-[#E5E1D8] dark:border-[#243A2C] font-medium focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
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
                <label className="block text-[#777D75] dark:text-[#8FA095] mb-1 font-semibold">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] text-[#252923] dark:text-white border border-[#E5E1D8] dark:border-[#243A2C] font-medium focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="highest">Amount: High to Low</option>
                  <option value="lowest">Amount: Low to High</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E5E1D8] dark:border-[#223528]">
              <label className="block text-[#777D75] dark:text-[#8FA095] mb-1.5 font-semibold">
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      datePreset === d.id
                        ? 'bg-[#174F32] text-white shadow-2xs'
                        : 'bg-[#F6F4EE] dark:bg-[#1A2A20] text-[#61685D] dark:text-[#9EA59B] border border-[#E5E1D8] dark:border-[#243A2C] hover:text-[#174F32]'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {datePreset === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-[10px] text-[#777D75] mb-0.5">
                      From
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] text-[#252923] dark:text-white border border-[#E5E1D8] dark:border-[#243A2C]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#777D75] mb-0.5">
                      To
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] text-[#252923] dark:text-white border border-[#E5E1D8] dark:border-[#243A2C]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-[#15221B] rounded-[24px] p-3.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] w-full max-w-full min-w-0 overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="py-8 sm:py-10 text-center space-y-3">
            <p className="text-xs sm:text-sm text-[#777D75] dark:text-[#8FA095]">
              No transactions match your current filters.
            </p>
            <button
              type="button"
              onClick={() => onOpenAddTransaction('expense')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Transaction</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#EAE7DF] dark:divide-[#1E2E23] w-full min-w-0">
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
                  className="w-full py-3 sm:py-3.5 first:pt-1 last:pb-1 text-left hover:bg-[#F6F4EE]/70 dark:hover:bg-[#1A2A20]/60 rounded-xl transition-colors min-w-0 overflow-hidden block"
                >
                  <div className="flex items-center justify-between text-[11px] sm:text-[12px] text-[#777D75] dark:text-[#8FA095] mb-1">
                    <span>{formatTransactionDateTime(tx.dateTime)}</span>
                    <span className="truncate ml-2 max-w-[50%] text-right font-medium">
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
                        <div className="text-xs sm:text-[15px] font-bold text-[#252923] dark:text-white truncate">
                          {tx.merchantOrTitle}
                        </div>
                        {tx.notes && (
                          <div className="text-[10px] sm:text-xs text-[#777D75] dark:text-[#8FA095] truncate">
                            {tx.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className={`text-xs sm:text-[15px] font-extrabold tabular-nums shrink-0 ${
                        isPositive
                          ? 'text-[#16A34A] dark:text-[#83C95B]'
                          : isNegative
                          ? 'text-[#DC2626]'
                          : 'text-[#252923] dark:text-white'
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
