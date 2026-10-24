import React, { useMemo, useState } from 'react';
import { HandCoins, Search, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { TransactionRecord } from '../types/finance';
import { formatPeso, formatTransactionDateTime } from '../utils/currency';
import { ProviderLogo } from './ProviderLogo';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (accountId: string) => void;
  onSelectTransaction: (tx: TransactionRecord) => void;
  onSelectReceivable?: (receivableId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectAccount,
  onSelectTransaction,
  onSelectReceivable,
}) => {
  const { reconciledAccounts, state, receivables } = useFinance();
  const [query, setQuery] = useState('');

  const hide = state.settings.hideBalances;

  const matchedAccounts = useMemo(() => {
    if (!query.trim()) return reconciledAccounts.slice(0, 4);
    const q = query.toLowerCase();
    return reconciledAccounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
    );
  }, [query, reconciledAccounts]);

  const matchedReceivables = useMemo(() => {
    if (!query.trim()) return (receivables || []).slice(0, 3);
    const q = query.toLowerCase();
    return (receivables || []).filter(
      (r) =>
        r.personName.toLowerCase().includes(q) ||
        (r.contactInfo || '').toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q)
    );
  }, [query, receivables]);

  const matchedTransactions = useMemo(() => {
    if (!query.trim()) return state.transactions.slice(0, 5);
    const q = query.toLowerCase();
    return state.transactions.filter((tx) => {
      const acc = reconciledAccounts.find((a) => a.id === tx.accountId);
      return (
        tx.merchantOrTitle.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        (tx.notes || '').toLowerCase().includes(q) ||
        (acc?.name || '').toLowerCase().includes(q)
      );
    });
  }, [query, state.transactions, reconciledAccounts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 pt-12 sm:pt-20">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-2xl flex flex-col max-h-[82vh]">
        {/* Search Input Header */}
        <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-neutral-100 dark:border-neutral-800">
          <Search className="w-5 h-5 text-neutral-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accounts or transactions..."
            className="w-full text-xs sm:text-sm font-medium text-black dark:text-white bg-transparent focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 shrink-0"
          >
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Accounts Section */}
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-neutral-400 mb-2">
              Accounts ({matchedAccounts.length})
            </div>
            {matchedAccounts.length === 0 ? (
              <p className="text-xs text-neutral-400 py-1">
                No matching accounts.
              </p>
            ) : (
              <div className="space-y-1.5">
                {matchedAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectAccount(acc.id);
                    }}
                    className="w-full p-2.5 rounded-2xl flex items-center justify-between gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <ProviderLogo
                        providerId={acc.providerId}
                        name={acc.name}
                        customColor={acc.customColor}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-semibold text-black dark:text-white truncate">
                          {acc.name}
                        </div>
                        <div className="text-[10px] sm:text-xs text-neutral-500 truncate">
                          {acc.category}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-black dark:text-white tabular-nums shrink-0">
                      {formatPeso(acc.currentBalance, { hide })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Money Owed to Me (Receivables) Section */}
          {matchedReceivables.length > 0 && (
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-neutral-400 mb-2">
                Money Owed to Me ({matchedReceivables.length})
              </div>
              <div className="space-y-1.5">
                {matchedReceivables.map((rec) => (
                  <div
                    key={rec.id}
                    className="w-full p-2.5 rounded-2xl flex items-center justify-between gap-2 bg-[#F6F5F8] dark:bg-neutral-800/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <HandCoins className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-semibold text-black dark:text-white truncate">
                          {rec.personName}
                        </div>
                        <div className="text-[10px] sm:text-xs text-neutral-400 truncate">
                          Due: {rec.dueDate}
                          {rec.notes ? ` · ${rec.notes}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-bold text-[#DC2626] tabular-nums">
                        {formatPeso(rec.remainingBalance, { hide })}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        remaining
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions Section */}
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-neutral-400 mb-2">
              Transactions ({matchedTransactions.length})
            </div>
            {matchedTransactions.length === 0 ? (
              <p className="text-xs text-neutral-400 py-1">
                No matching transactions.
              </p>
            ) : (
              <div className="space-y-1.5">
                {matchedTransactions.map((tx) => {
                  const acc = reconciledAccounts.find(
                    (a) => a.id === tx.accountId
                  );
                  const isPos =
                    tx.type === 'income' ||
                    (tx.type === 'adjustment' &&
                      tx.adjustmentSign !== 'negative');
                  const isNeg =
                    tx.type === 'expense' ||
                    (tx.type === 'adjustment' &&
                      tx.adjustmentSign === 'negative');

                  return (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectTransaction(tx);
                      }}
                      className="w-full p-2.5 rounded-2xl flex items-center justify-between gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <ProviderLogo
                          providerId={acc?.providerId || 'custom'}
                          name={acc?.name || tx.category}
                          customColor={acc?.customColor}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-semibold text-black dark:text-white truncate">
                            {tx.merchantOrTitle}
                          </div>
                          <div className="text-[10px] sm:text-xs text-neutral-500 truncate">
                            {formatTransactionDateTime(tx.dateTime)}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`text-xs sm:text-sm font-semibold tabular-nums shrink-0 ${
                          isPos
                            ? 'text-[#2E9E6B]'
                            : isNeg
                            ? 'text-[#DC2626]'
                            : 'text-black dark:text-white'
                        }`}
                      >
                        {isNeg ? '-' : ''}
                        {formatPeso(tx.amount, { hide })}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
