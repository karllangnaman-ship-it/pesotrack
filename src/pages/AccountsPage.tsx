import React, { useState } from 'react';
import { HandCoins, Plus, Search, Wallet } from 'lucide-react';
import { ProviderLogo } from '../components/ProviderLogo';
import { ReceivablesDashboard } from '../components/ReceivablesDashboard';
import { SwipeableFinancialSummary } from '../components/SwipeableFinancialSummary';
import { useFinance } from '../context/FinanceContext';
import { AccountCategory } from '../types/finance';
import { formatPeso } from '../utils/currency';

interface AccountsPageProps {
  onOpenAddAccount: (category?: AccountCategory) => void;
  onSelectAccount: (accountId: string) => void;
  initialSubTab?: 'accounts' | 'receivables';
  initialCategoryFilter?: 'All' | AccountCategory;
}

const FILTER_TABS: ('All' | AccountCategory)[] = [
  'All',
  'Wallet',
  'Savings',
  'Credit',
  'Loans',
];

export const AccountsPage: React.FC<AccountsPageProps> = ({
  onOpenAddAccount,
  onSelectAccount,
  initialSubTab = 'accounts',
  initialCategoryFilter = 'All',
}) => {
  const {
    reconciledAccounts,
    receivables,
    receivablesSummary,
    state,
  } = useFinance();

  const [viewTab, setViewTab] = useState<'accounts' | 'receivables'>(initialSubTab);
  const [categoryFilter, setCategoryFilter] = useState<'All' | AccountCategory>(initialCategoryFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  React.useEffect(() => {
    if (initialSubTab) setViewTab(initialSubTab);
  }, [initialSubTab]);

  React.useEffect(() => {
    if (initialCategoryFilter) setCategoryFilter(initialCategoryFilter);
  }, [initialCategoryFilter]);

  const hide = state.settings.hideBalances;

  const filteredAccounts = reconciledAccounts.filter((acc) => {
    if (!showArchived && acc.archived) return false;
    if (categoryFilter !== 'All' && acc.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        acc.name.toLowerCase().includes(q) ||
        acc.category.toLowerCase().includes(q) ||
        (acc.description || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const archivedCount = reconciledAccounts.filter((a) => a.archived).length;
  const activeCount = reconciledAccounts.filter((a) => !a.archived).length;

  return (
<<<<<<< HEAD
    <div className="space-y-4 sm:space-y-5 pb-8 w-full max-w-full min-w-0 overflow-hidden">
      {/* Top Segmented Tab Switcher: "My Accounts" vs "Money Owed to Me" */}
      <div className="flex items-center justify-center w-full">
        <div className="bg-[#E8E4DA] dark:bg-[#16241C] p-1 rounded-2xl flex items-center gap-1 w-full max-w-md shadow-2xs">
=======
    <div className="space-y-3.5 sm:space-y-4 pb-8 w-full max-w-full min-w-0 overflow-hidden">
      {/* Top Segmented Tab Switcher: "My Accounts" vs "Money Owed to Me" */}
      <div className="flex items-center justify-center w-full">
        <div className="bg-[#E6E5EA] dark:bg-neutral-800/80 p-1 rounded-2xl flex items-center gap-1 w-full max-w-md shadow-2xs">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          <button
            type="button"
            onClick={() => setViewTab('accounts')}
            className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              viewTab === 'accounts'
<<<<<<< HEAD
                ? 'bg-[#174F32] text-white shadow-xs'
                : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
=======
                ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
            }`}
          >
            <Wallet className="w-4 h-4 shrink-0" />
            <span>My Accounts</span>
<<<<<<< HEAD
            <span className={`text-[11px] px-2 py-0.5 rounded-full tabular-nums ${viewTab === 'accounts' ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10'}`}>
=======
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 tabular-nums">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewTab('receivables')}
            className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              viewTab === 'receivables'
<<<<<<< HEAD
                ? 'bg-[#174F32] text-white shadow-xs'
                : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
=======
                ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
            }`}
          >
            <HandCoins className="w-4 h-4 shrink-0" />
            <span>Money Owed</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full tabular-nums ${
                receivablesSummary.overdueCount > 0
<<<<<<< HEAD
                  ? 'bg-red-500/20 text-red-600 dark:text-red-400 font-bold'
                  : viewTab === 'receivables' ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10'
=======
                  ? 'bg-red-500/15 text-red-600 dark:text-red-400 font-bold'
                  : 'bg-black/5 dark:bg-white/10'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              }`}
            >
              {receivables.length}
            </span>
          </button>
        </div>
      </div>

      {/* VIEW: MONEY OWED TO ME (RECEIVABLES) */}
      {viewTab === 'receivables' ? (
        <ReceivablesDashboard />
      ) : (
        /* VIEW: MY ACCOUNTS */
<<<<<<< HEAD
        <div className="space-y-4 sm:space-y-5">
          {/* Swipeable Summary Card */}
          <SwipeableFinancialSummary
            onOpenAddAccount={() => onOpenAddAccount('Wallet')}
            onSelectCategory={(cat) => {
              setViewTab('accounts');
              setCategoryFilter(cat);
            }}
=======
        <div className="space-y-3.5 sm:space-y-4">
          {/* Swipeable Summary Card (Slide 1: Total Assets, Slide 2: Total Debt) */}
          <SwipeableFinancialSummary
            onOpenAddAccount={() => onOpenAddAccount('Wallet')}
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          />

          {/* Search & Filter Bar */}
          <div className="space-y-2.5">
            <div className="relative">
<<<<<<< HEAD
              <Search className="w-4 h-4 text-[#777D75] dark:text-[#8FA095] absolute left-3.5 top-1/2 -translate-y-1/2" />
=======
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
<<<<<<< HEAD
                placeholder="Search wallets, banks, or accounts..."
                className="w-full pl-9 pr-4 py-2.5 sm:py-3 rounded-2xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] text-xs sm:text-sm text-[#252923] dark:text-white placeholder:text-[#777D75] shadow-[0_2px_10px_rgba(0,0,0,0.02)] focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B]"
=======
                placeholder="Search accounts..."
                className="w-full pl-9 pr-4 py-2.5 sm:py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-xs sm:text-sm text-black dark:text-white placeholder:text-neutral-400 shadow-[0_2px_10px_rgba(0,0,0,0.02)] focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              />
            </div>

            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
<<<<<<< HEAD
              <div className="bg-[#E8E4DA] dark:bg-[#16241C] p-1 rounded-2xl flex items-center gap-1 shrink-0">
                {FILTER_TABS.map((tab) => {
                  const active = categoryFilter === tab;
                  const count =
                    tab === 'All'
                      ? activeCount
                      : reconciledAccounts.filter((a) => !a.archived && a.category === tab).length;

=======
              <div className="bg-[#E6E5EA] dark:bg-neutral-800 p-1 rounded-[14px] sm:rounded-[16px] flex items-center gap-1 shrink-0">
                {FILTER_TABS.map((tab) => {
                  const active = categoryFilter === tab;
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setCategoryFilter(tab)}
<<<<<<< HEAD
                      className={`px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                        active
                          ? 'bg-[#174F32] text-white shadow-2xs'
                          : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
                      }`}
                    >
                      <span>{tab}</span>
                      <span className={`text-[10px] tabular-nums ${active ? 'text-white/80' : 'text-[#777D75]'}`}>
                        ({count})
                      </span>
=======
                      className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-[11px] sm:rounded-[12px] text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-2xs'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {tab}
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                    </button>
                  );
                })}
              </div>

              {archivedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowArchived(!showArchived)}
<<<<<<< HEAD
                  className="text-xs font-semibold text-[#777D75] hover:text-[#174F32] dark:hover:text-white whitespace-nowrap shrink-0 px-2"
=======
                  className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white whitespace-nowrap shrink-0 px-2"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                >
                  {showArchived
                    ? 'Hide Archived'
                    : `Archived (${archivedCount})`}
                </button>
              )}
            </div>
          </div>

          {/* Responsive Accounts Grid */}
          {filteredAccounts.length === 0 ? (
<<<<<<< HEAD
            <div className="bg-white dark:bg-[#15221B] rounded-[24px] p-6 sm:p-8 text-center space-y-3 border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <p className="text-xs sm:text-sm text-[#777D75] dark:text-[#8FA095]">
=======
            <div className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-6 sm:p-8 text-center space-y-3 border border-black/[0.04] dark:border-white/[0.06]">
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                No {categoryFilter !== 'All' ? categoryFilter.toLowerCase() : ''}{' '}
                accounts found.
              </p>
              <button
                type="button"
                onClick={() =>
                  onOpenAddAccount(
                    categoryFilter === 'All' ? 'Wallet' : categoryFilter
                  )
                }
<<<<<<< HEAD
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold transition-colors shadow-xs"
=======
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold shadow-xs"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              >
                <Plus className="w-4 h-4" />
                <span>
                  Add {categoryFilter === 'All' ? 'Account' : categoryFilter}
                </span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
              {filteredAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => onSelectAccount(acc.id)}
<<<<<<< HEAD
                  className={`bg-white dark:bg-[#15221B] rounded-[22px] p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] text-left flex flex-col justify-between min-h-[142px] sm:min-h-[150px] hover:border-[#174F32]/30 dark:hover:border-[#83C95B]/30 hover:bg-[#F9F8F5] dark:hover:bg-[#1A2A20] active:scale-[0.99] transition-all min-w-0 w-full ${
=======
                  className={`bg-white dark:bg-neutral-900 rounded-[20px] sm:rounded-[22px] p-3 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] text-left flex flex-col justify-between min-h-[140px] sm:min-h-[148px] hover:bg-neutral-50/70 dark:hover:bg-neutral-800/80 transition-all min-w-0 w-full ${
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                    acc.archived ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <ProviderLogo
                      providerId={acc.providerId}
                      name={acc.name}
                      customColor={acc.customColor}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
<<<<<<< HEAD
                      <div className="text-sm sm:text-[15px] font-bold text-[#252923] dark:text-white truncate">
                        {acc.name}
                      </div>
                      <div className="text-[11px] text-[#777D75] dark:text-[#8FA095] truncate">
=======
                      <div className="text-sm sm:text-[15px] font-semibold text-neutral-900 dark:text-white truncate">
                        {acc.name}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                        {acc.accountNumberMasked || acc.category}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 sm:mt-4 w-full min-w-0">
                    <div
<<<<<<< HEAD
                      className={`text-[17px] sm:text-[19px] font-extrabold tabular-nums tracking-tight truncate ${
                        acc.isLiability && acc.currentBalance > 0
                          ? 'text-[#DC2626]'
                          : 'text-[#252923] dark:text-white'
=======
                      className={`text-[17px] sm:text-[19px] font-bold tabular-nums tracking-tight truncate ${
                        acc.isLiability && acc.currentBalance > 0
                          ? 'text-[#DC2626]'
                          : 'text-black dark:text-white'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                      }`}
                    >
                      {formatPeso(acc.currentBalance, { hide })}
                    </div>
<<<<<<< HEAD
                    <div className="flex items-center justify-between text-xs sm:text-[13px] text-[#777D75] dark:text-[#8FA095] mt-0.5">
=======
                    <div className="flex items-center justify-between text-xs sm:text-[13px] text-neutral-500 dark:text-neutral-400 mt-0.5">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                      <span className="truncate">
                        {acc.category}
                        {acc.isLiability ? ' · Liability' : ''}
                      </span>
                      {acc.category === 'Savings' &&
                        acc.savingsProgressPercent !== undefined && (
<<<<<<< HEAD
                          <span className="text-[10px] sm:text-[11px] font-bold text-[#16A34A] dark:text-[#83C95B] tabular-nums shrink-0 ml-1">
=======
                          <span className="text-[10px] sm:text-[11px] font-semibold text-[#2E9E6B] tabular-nums shrink-0 ml-1">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                            {acc.savingsProgressPercent.toFixed(0)}% goal
                          </span>
                        )}
                      {acc.category === 'Credit' &&
                        acc.availableCredit !== undefined && (
                          <span className="text-[10px] sm:text-[11px] tabular-nums shrink-0 ml-1">
                            Avail: {formatPeso(acc.availableCredit, { hide, compact: true })}
                          </span>
                        )}
                      {acc.category === 'Loans' &&
                        acc.loanProgressPercent !== undefined && (
<<<<<<< HEAD
                          <span className="text-[10px] sm:text-[11px] font-bold text-[#16A34A] dark:text-[#83C95B] tabular-nums shrink-0 ml-1">
=======
                          <span className="text-[10px] sm:text-[11px] font-semibold text-[#2E9E6B] tabular-nums shrink-0 ml-1">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                            {acc.loanProgressPercent.toFixed(0)}% paid
                          </span>
                        )}
                    </div>

                    {(acc.savingsProgressPercent !== undefined ||
                      acc.creditUtilizationPercent !== undefined ||
                      acc.loanProgressPercent !== undefined) && (
<<<<<<< HEAD
                      <div className="w-full h-1.5 bg-[#E8E4DA] dark:bg-[#1E2E23] rounded-full overflow-hidden mt-2">
=======
                      <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-2">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                        <div
                          className={`h-full rounded-full ${
                            acc.category === 'Credit'
                              ? (acc.creditUtilizationPercent || 0) > 80
                                ? 'bg-[#DC2626]'
<<<<<<< HEAD
                                : 'bg-[#174F32] dark:bg-white'
                              : 'bg-[#4E9D39]'
=======
                                : 'bg-neutral-900 dark:bg-white'
                              : 'bg-[#2E9E6B]'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              acc.savingsProgressPercent ??
                                acc.creditUtilizationPercent ??
                                acc.loanProgressPercent ??
                                0
                            )}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
