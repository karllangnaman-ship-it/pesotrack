import React from 'react';
import { ArrowRight, Edit3, Trash2, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { TransactionRecord } from '../types/finance';
import { formatPeso, formatTransactionDateTime } from '../utils/currency';
import { ProviderLogo } from './ProviderLogo';

interface TransactionDetailModalProps {
  transaction: TransactionRecord | null;
  onClose: () => void;
  onEdit: (tx: TransactionRecord) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
  onEdit,
}) => {
  const { reconciledAccounts, deleteTransaction, state } = useFinance();
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  if (!transaction) return null;

  const sourceAcc = reconciledAccounts.find(
    (a) => a.id === transaction.accountId
  );
  const destAcc = transaction.destinationAccountId
    ? reconciledAccounts.find((a) => a.id === transaction.destinationAccountId)
    : undefined;

  const isPositive =
    transaction.type === 'income' ||
    (transaction.type === 'adjustment' &&
      transaction.adjustmentSign !== 'negative');
  const isNegative =
    transaction.type === 'expense' ||
    (transaction.type === 'adjustment' &&
      transaction.adjustmentSign === 'negative');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Top Row */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            Transaction Details
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transaction details"
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
          </button>
        </div>

        {/* Main Header */}
        <div className="flex flex-col items-center text-center py-1">
          {sourceAcc && (
            <ProviderLogo
              providerId={sourceAcc.providerId}
              name={sourceAcc.name}
              customColor={sourceAcc.customColor}
              size="lg"
              className="mb-2.5"
            />
          )}
          <h3 className="text-base sm:text-lg font-bold text-black dark:text-white break-words max-w-full">
            {transaction.merchantOrTitle}
          </h3>
          <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {formatTransactionDateTime(transaction.dateTime)}
          </p>
          <div
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums mt-2.5 ${
              isPositive
                ? 'text-[#2E9E6B]'
                : isNegative
                ? 'text-[#DC2626]'
                : 'text-black dark:text-white'
            }`}
          >
            {isNegative ? '-' : isPositive ? '+' : ''}
            {formatPeso(transaction.amount, {
              hide: state.settings.hideBalances,
            })}
          </div>
        </div>

        {/* Details Breakdown */}
        <div className="bg-[#F6F5F8] dark:bg-neutral-800/70 rounded-2xl p-3.5 sm:p-4 space-y-2.5 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">Type</span>
            <span className="font-semibold text-black dark:text-white capitalize">
              {transaction.type}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">Category</span>
            <span className="font-semibold text-black dark:text-white">
              {transaction.category}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">
              {transaction.type === 'transfer' ? 'Accounts' : 'Account'}
            </span>
            <div className="flex items-center gap-1.5 font-semibold text-black dark:text-white truncate max-w-[60%] justify-end">
              <span className="truncate">{sourceAcc?.name || 'Deleted Account'}</span>
              {destAcc && (
                <>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="truncate">{destAcc.name}</span>
                </>
              )}
            </div>
          </div>

          {transaction.interestPortion !== undefined &&
            transaction.interestPortion > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-2 border-t border-neutral-200 dark:border-neutral-700 text-xs">
                <span className="text-neutral-500">Loan Repayment Split</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200 tabular-nums">
                  Principal:{' '}
                  {formatPeso(
                    Math.max(0, transaction.amount - transaction.interestPortion),
                    { hide: state.settings.hideBalances }
                  )}{' '}
                  · Interest:{' '}
                  {formatPeso(transaction.interestPortion, {
                    hide: state.settings.hideBalances,
                  })}
                </span>
              </div>
            )}

          {transaction.notes && (
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-0.5">
                Notes
              </div>
              <div className="text-neutral-800 dark:text-neutral-200 text-xs break-words">
                {transaction.notes}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
          {confirmDelete ? (
            <div className="w-full sm:flex-1 flex items-center gap-2 animate-in fade-in">
              <button
                type="button"
                onClick={() => {
                  deleteTransaction(transaction.id);
                  onClose();
                }}
                className="flex-1 py-3 px-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>Yes, Delete & Undo</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="py-3 px-3.5 rounded-2xl bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs sm:text-sm font-semibold hover:bg-neutral-300 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-950/70 active:scale-95 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete / Undo</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const txToEdit = transaction;
              onClose();
              onEdit(txToEdit);
            }}
            className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
