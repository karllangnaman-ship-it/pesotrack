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
    <div className="space-y-3.5 sm:space-y-4 pb-8 w-full max-w-full min-w-0 overflow-hidden">
      {/* Top Segmented Tab Switcher: "My Accounts" vs "Money Owed to Me" */}
      <div className="flex items-center justify-center w-full">
        <div className="bg-[#E6E5EA] dark:bg-neutral-800/80 p-1 rounded-2xl flex items-center gap-1 w-full max-w-md shadow-2xs">
          <button
            type="button"
            onClick={() => setViewTab('accounts')}
            className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              viewTab === 'accounts'
                ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4 shrink-0" />
            <span>My Accounts</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 tabular-nums">
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewTab('receivables')}
            className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              viewTab === 'receivables'
                ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <HandCoins className="w-4 h-4 shrink-0" />
            <span>Money Owed</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full tabular-nums ${
                receivablesSummary.overdueCount > 0
                  ? 'bg-red-500/15 text-red-600 dark:text-red-400 font-bold'
                  : 'bg-black/5 dark:bg-white/10'
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
        <div className="space-y-3.5 sm:space-y-4">
          {/* Swipeable Summary Card (Slide 1: Total Assets, Slide 2: Total Debt) */}
          <SwipeableFinancialSummary
            onOpenAddAccount={() => onOpenAddAccount('Wallet')}
          />

          {/* Search & Filter Bar */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search accounts..."
                className="w-full pl-9 pr-4 py-2.5 sm:py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-xs sm:text-sm text-black dark:text-white placeholder:text-neutral-400 shadow-[0_2px_10px_rgba(0,0,0,0.02)] focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              />
            </div>

            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
              <div className="bg-[#E6E5EA] dark:bg-neutral-800 p-1 rounded-[14px] sm:rounded-[16px] flex items-center gap-1 shrink-0">
                {FILTER_TABS.map((tab) => {
                  const active = categoryFilter === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setCategoryFilter(tab)}
                      className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-[11px] sm:rounded-[12px] text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-2xs'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {archivedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowArchived(!showArchived)}
                  className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white whitespace-nowrap shrink-0 px-2"
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
            <div className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-6 sm:p-8 text-center space-y-3 border border-black/[0.04] dark:border-white/[0.06]">
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold shadow-xs"
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
                  className={`bg-white dark:bg-neutral-900 rounded-[20px] sm:rounded-[22px] p-3 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] text-left flex flex-col justify-between min-h-[140px] sm:min-h-[148px] hover:bg-neutral-50/70 dark:hover:bg-neutral-800/80 transition-all min-w-0 w-full ${
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
                      <div className="text-sm sm:text-[15px] font-semibold text-neutral-900 dark:text-white truncate">
                        {acc.name}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        {acc.accountNumberMasked || acc.category}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 sm:mt-4 w-full min-w-0">
                    <div
                      className={`text-[17px] sm:text-[19px] font-bold tabular-nums tracking-tight truncate ${
                        acc.isLiability && acc.currentBalance > 0
                          ? 'text-[#DC2626]'
                          : 'text-black dark:text-white'
                      }`}
                    >
                      {formatPeso(acc.currentBalance, { hide })}
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-[13px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      <span className="truncate">
                        {acc.category}
                        {acc.isLiability ? ' · Liability' : ''}
                      </span>
                      {acc.category === 'Savings' &&
                        acc.savingsProgressPercent !== undefined && (
                          <span className="text-[10px] sm:text-[11px] font-semibold text-[#2E9E6B] tabular-nums shrink-0 ml-1">
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
                          <span className="text-[10px] sm:text-[11px] font-semibold text-[#2E9E6B] tabular-nums shrink-0 ml-1">
                            {acc.loanProgressPercent.toFixed(0)}% paid
                          </span>
                        )}
                    </div>

                    {(acc.savingsProgressPercent !== undefined ||
                      acc.creditUtilizationPercent !== undefined ||
                      acc.loanProgressPercent !== undefined) && (
                      <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-2">
                        <div
                          className={`h-full rounded-full ${
                            acc.category === 'Credit'
                              ? (acc.creditUtilizationPercent || 0) > 80
                                ? 'bg-[#DC2626]'
                                : 'bg-neutral-900 dark:bg-white'
                              : 'bg-[#2E9E6B]'
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
