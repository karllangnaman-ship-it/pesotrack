import React, { useMemo, useState } from 'react';
import {
  Archive,
  Calculator,
  Calendar,
  Clock,
  CreditCard,
  Edit3,
  Plus,
  Target,
  Trash2,
  RotateCcw,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { TransactionRecord, TransactionType } from '../types/finance';
import {
  formatPeso,
  formatShortDate,
  formatTransactionDateTime,
  subPHP,
} from '../utils/currency';
import { ReconciledAccount } from '../utils/financeEngine';
import {
  calculateRepaymentDetails,
  formatFriendlyDate,
} from '../utils/loanCalculations';
import { ProviderLogo } from './ProviderLogo';
import { AccountMultipleInstallments } from './AccountMultipleInstallments';
import { PayCreditBillModal } from './PayCreditBillModal';
import { RecordLoanPaymentModal } from './RecordLoanPaymentModal';

interface AccountDetailModalProps {
  accountId: string | null;
  onClose: () => void;
  onEditAccount: (acc: ReconciledAccount) => void;
  onOpenAddTransaction: (
    type: TransactionType,
    accountId: string,
    destinationAccountId?: string
  ) => void;
  onSelectTransaction: (tx: TransactionRecord) => void;
}

export const AccountDetailModal: React.FC<AccountDetailModalProps> = ({
  accountId,
  onClose,
  onEditAccount,
  onOpenAddTransaction,
  onSelectTransaction,
}) => {
  const {
    reconciledAccounts,
    state,
    deleteAccount,
    toggleArchiveAccount,
    revertAccountPayment,
    enableMultipleTransactionsForAccount,
  } = useFinance();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPayCreditBillOpen, setIsPayCreditBillOpen] = useState(false);
  const [isRecordLoanPaymentOpen, setIsRecordLoanPaymentOpen] = useState(false);

  const account = accountId
    ? reconciledAccounts.find((a) => a.id === accountId)
    : undefined;

  const hide = state.settings.hideBalances;

  const accountTransactions = useMemo(() => {
    if (!account) return [];
    return state.transactions
      .filter(
        (tx) =>
          tx.accountId === account.id || tx.destinationAccountId === account.id
      )
      .sort(
        (a, b) =>
          new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
      );
  }, [account, state.transactions]);

  const paymentOrContributionHistory = useMemo(() => {
    if (!account) return [];
    return accountTransactions.filter((tx) => {
      if (account.category === 'Savings') {
        return (
          tx.type === 'income' ||
          (tx.type === 'transfer' && tx.destinationAccountId === account.id) ||
          (tx.type === 'adjustment' && tx.adjustmentSign !== 'negative')
        );
      }
      if (account.category === 'Credit' || account.category === 'Loans') {
        return tx.type === 'transfer' && tx.destinationAccountId === account.id;
      }
      return false;
    });
  }, [account, accountTransactions]);

  const firstWalletAccount = useMemo(() => {
    if (!account) return undefined;
    return reconciledAccounts.find(
      (a) => !a.isLiability && a.id !== account.id && !a.archived
    );
  }, [account, reconciledAccounts]);

  const loanRepayment = useMemo(() => {
    if (!account || account.category !== 'Loans' || !account.loanInfo) return null;
    return calculateRepaymentDetails(
      {
        principal: account.loanInfo.originalPrincipal,
        totalRepayment:
          account.loanInfo.totalRepayment ??
          account.totalRepayment ??
          account.startingBalance,
        termMonths: account.loanInfo.termMonths || 12,
        interestRate:
          account.loanInfo.interestRate ??
          account.loanInfo.interestRateAnnual ??
          0,
        interestRateType: account.loanInfo.interestRateType || 'annual',
        repaymentModel: account.loanInfo.repaymentModel || 'flat_rate',
        customMonthlyPayment: account.loanInfo.isManualPayment
          ? account.loanInfo.customMonthlyPayment
          : undefined,
        startDate: account.loanInfo.startDate,
        dueDay: account.loanInfo.dueDay,
      },
      account.currentBalance,
      state.transactions,
      account.id
    );
  }, [account, state.transactions]);

  const creditRepayment = useMemo(() => {
    if (!account || account.category !== 'Credit' || !account.creditInfo) return null;
    if (!account.creditInfo.hasInstallmentPlan && !account.creditInfo.termMonths) {
      return null;
    }
    const principal =
      account.creditInfo.installmentPrincipal ||
      account.startingBalance ||
      account.currentBalance;
    const termMonths = account.creditInfo.termMonths || 12;
    return calculateRepaymentDetails(
      {
        principal,
        totalRepayment:
          account.creditInfo.totalRepayment ??
          account.totalRepayment ??
          account.startingBalance,
        termMonths,
        interestRate: account.creditInfo.interestRate ?? 0,
        interestRateType: account.creditInfo.interestRateType || 'monthly',
        repaymentModel: 'flat_rate',
        customMonthlyPayment: account.creditInfo.isManualPayment
          ? account.creditInfo.customMonthlyPayment
          : undefined,
        startDate: account.creditInfo.startDate,
        dueDay: account.creditInfo.dueDay,
      },
      account.currentBalance,
      state.transactions,
      account.id
    );
  }, [account, state.transactions]);

  if (!accountId || !account) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-[#FAF9FB] dark:bg-neutral-900 w-full max-w-lg rounded-[24px] sm:rounded-[28px] flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4 shrink-0 border-b border-black/[0.04] dark:border-white/[0.06]">
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
            <ProviderLogo
              providerId={account.providerId}
              name={account.name}
              customColor={account.customColor}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold text-black dark:text-white truncate">
                {account.name}
              </h2>
              <div className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 truncate">
                <span>{account.category}</span>
                {account.accountNumberMasked && (
                  <>
                    <span>·</span>
                    <span className="truncate">{account.accountNumberMasked}</span>
                  </>
                )}
                {account.archived && (
                  <>
                    <span>·</span>
                    <span className="text-amber-600 font-medium">Archived</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close account details"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-black dark:text-white" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          {/* Primary Balance Card */}
          <div className="bg-white dark:bg-neutral-800 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 shadow-2xs">
            <div className="text-[11px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {account.category === 'Credit'
                ? 'Outstanding Credit Balance'
                : account.category === 'Loans'
                ? 'Remaining Loan Balance'
                : 'Current Available Balance'}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white tabular-nums mt-1 break-words">
              {formatPeso(account.currentBalance, { hide })}
            </div>
            {account.description && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 break-words">
                {account.description}
              </p>
            )}

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
              {!account.isLiability ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAddTransaction('income', account.id);
                    }}
                    className="py-2.5 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#2E9E6B] text-xs font-bold flex items-center justify-center gap-1 hover:bg-emerald-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Income</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAddTransaction('expense', account.id);
                    }}
                    className="py-2.5 px-2 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#DC2626] text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Expense</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAddTransaction('transfer', account.id);
                    }}
                    className="col-span-2 sm:col-span-1 py-2.5 px-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold flex items-center justify-center gap-1 hover:bg-neutral-800 transition-colors"
                  >
                    <span>Transfer</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (account.category === 'Credit') {
                        setIsPayCreditBillOpen(true);
                      } else {
                        setIsRecordLoanPaymentOpen(true);
                      }
                    }}
                    className="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-neutral-800 transition-colors shadow-xs"
                  >
                    <CreditCard className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {account.category === 'Credit'
                        ? 'Pay Credit Bill'
                        : 'Record Payment'}
                    </span>
                  </button>
                  {account.category === 'Credit' && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAddTransaction('expense', account.id);
                      }}
                      className="col-span-2 sm:col-span-2 py-2.5 px-3 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#DC2626] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-red-100 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 shrink-0" />
                      <span>Credit Purchase</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* SAVINGS SPECIALIZED PANEL */}
          {account.category === 'Savings' && (
            <div className="bg-white dark:bg-neutral-800 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#2E9E6B] shrink-0" />
                  <h3 className="text-xs sm:text-sm font-bold text-black dark:text-white truncate">
                    {account.savingsGoal
                      ? account.savingsGoal.goalName
                      : 'Savings Goal'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditAccount(account);
                  }}
                  className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-black shrink-0"
                >
                  {account.savingsGoal ? 'Edit Goal' : 'Set Goal'}
                </button>
              </div>

              {account.savingsGoal && account.savingsGoal.targetAmount > 0 ? (
                <>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-neutral-500 truncate mr-2">
                      Saved: {formatPeso(account.currentBalance, { hide })} of{' '}
                      {formatPeso(account.savingsGoal.targetAmount, { hide })}
                    </span>
                    <span className="font-bold text-[#2E9E6B] tabular-nums shrink-0">
                      {(account.savingsProgressPercent || 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2E9E6B] rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          account.savingsProgressPercent || 0
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs text-neutral-500 pt-1">
                    <span>
                      Remaining:{' '}
                      <strong className="text-neutral-800 dark:text-neutral-200 tabular-nums">
                        {formatPeso(
                          Math.max(
                            0,
                            subPHP(
                              account.savingsGoal.targetAmount,
                              account.currentBalance
                            )
                          ),
                          { hide }
                        )}
                      </strong>
                    </span>
                    <span>Target: {formatShortDate(account.savingsGoal.targetDate)}</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-neutral-500">
                  Set a target amount and date to track savings goals.
                </p>
              )}

              {paymentOrContributionHistory.length > 0 && (
                <div className="pt-2.5 border-t border-neutral-100 dark:border-neutral-700">
                  <div className="text-xs font-semibold text-neutral-500 mb-1.5">
                    Recent Contributions ({paymentOrContributionHistory.length})
                  </div>
                  <div className="space-y-1.5">
                    {paymentOrContributionHistory.slice(0, 3).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-neutral-600 dark:text-neutral-300 truncate">
                          {tx.merchantOrTitle} · {formatShortDate(tx.dateTime)}
                        </span>
                        <span className="font-semibold text-[#2E9E6B] tabular-nums shrink-0">
                          +{formatPeso(tx.amount, { hide })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CREDIT SPECIALIZED PANEL */}
          {account.category === 'Credit' && account.creditInfo && (
            account.creditInfo.enableMultipleInstallments ? (
              <AccountMultipleInstallments account={account} hide={hide} />
            ) : (
              <div className="space-y-3 sm:space-y-3.5">
                {/* Credit Card Utilization Card */}
                <div className="bg-white dark:bg-neutral-800 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-bold text-black dark:text-white">
                      Credit Utilization
                    </h3>
                    <span className="text-xs text-neutral-500 tabular-nums">
                      {(account.creditUtilizationPercent || 0).toFixed(1)}% used
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        (account.creditUtilizationPercent || 0) >= 80
                          ? 'bg-[#DC2626]'
                          : (account.creditUtilizationPercent || 0) >= 50
                          ? 'bg-amber-500'
                          : 'bg-[#2E9E6B]'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          account.creditUtilizationPercent || 0
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] sm:text-xs">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900">
                      <div className="text-neutral-500">Limit</div>
                      <div className="font-bold text-black dark:text-white tabular-nums mt-0.5 truncate">
                        {formatPeso(account.creditInfo.creditLimit, { hide, compact: true })}
                      </div>
                    </div>
                    <div className="p-2 sm:p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900">
                      <div className="text-neutral-500">Available</div>
                      <div className="font-bold text-[#2E9E6B] tabular-nums mt-0.5 truncate">
                        {formatPeso(account.availableCredit || 0, { hide, compact: true })}
                      </div>
                    </div>
                    <div className="p-2 sm:p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900">
                      <div className="text-neutral-500">Total Repayment</div>
                      <div className="font-bold text-black dark:text-white tabular-nums mt-0.5 truncate">
                        {formatPeso(
                          account.creditInfo.totalRepayment ??
                            account.totalRepayment ??
                            account.startingBalance,
                          { hide, compact: true }
                        )}
                      </div>
                    </div>
                    <div className="p-2 sm:p-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900">
                      <div className="text-neutral-500">Due Day</div>
                      <div className="font-bold text-black dark:text-white mt-0.5 truncate">
                        Day {account.creditInfo.dueDay}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Credit Installment / Repayment Plan Summary */}
                {creditRepayment ? (
                  <div className="space-y-3 sm:space-y-3.5">
                    {/* Credit Installment Progress Card */}
                    <div className="bg-white dark:bg-neutral-800 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#2E9E6B] shrink-0" />
                          <h3 className="text-xs sm:text-sm font-bold text-black dark:text-white">
                            Installment Progress
                          </h3>
                        </div>
                        <span className="text-xs font-bold text-[#2E9E6B] tabular-nums">
                          {creditRepayment.progressPercent.toFixed(1)}% repaid
                        </span>
                      </div>

                      <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2E9E6B] rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(0, creditRepayment.progressPercent))}%`,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                        <span>
                          Payments Made:{' '}
                          <strong className="text-black dark:text-white font-semibold tabular-nums">
                            {creditRepayment.paymentsMade} of {creditRepayment.termMonths}
                          </strong>
                        </span>
                        <span>
                          {creditRepayment.remainingPayments === 0 ? (
                            <span className="text-[#2E9E6B] font-semibold">Fully Repaid</span>
                          ) : (
                            <span className="tabular-nums">
                              {creditRepayment.remainingPayments} payment{creditRepayment.remainingPayments === 1 ? '' : 's'} left
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Credit Repayment Summary Card */}
                    <div className="bg-white dark:bg-neutral-800 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 space-y-3.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calculator className="w-4 h-4 text-neutral-700 dark:text-neutral-300 shrink-0" />
                          <h3 className="text-xs sm:text-sm font-bold text-black dark:text-white">
                            Installment Repayment Summary
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {creditRepayment.paymentsMade > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                revertAccountPayment(account.id);
                              }}
                              className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                              title="Undo last repayment"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Undo Repayment</span>
                            </button>
                          )}
                          {creditRepayment.isManualPayment ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                              Fixed by Bank
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                              Estimated
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 text-[11px] sm:text-xs">
                        {/* Monthly Payment */}
                        <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.03] dark:border-white/[0.04]">
                          <div className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px]">
                            Monthly Payment
                          </div>
                          <div className="text-sm sm:text-base font-extrabold text-black dark:text-white tabular-nums mt-0.5 truncate">
                            {formatPeso(creditRepayment.monthlyPayment, { hide })}
                          </div>
                          <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                            {creditRepayment.isManualPayment ? 'Fixed monthly installment' : 'Calculated installment'}
                          </div>
                        </div>

                        {/* Repayment Term */}
                        <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.03] dark:border-white/[0.04]">
                          <div className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px]">
                            Repayment Term
                          </div>
                          <div className="text-sm sm:text-base font-extrabold text-black dark:text-white tabular-nums mt-0.5 truncate">
                            {creditRepayment.termMonths} Months
                          </div>
                          <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                            {(account.creditInfo.interestRate ?? 0) === 0 ? '0% Interest Promo' : `${account.creditInfo.interestRate}% ${account.creditInfo.interestRateType === 'annual' ? 'p.a.' : '/mo'}`}
                          </div>
                        </div>

                        {/* Payments Made */}
                        <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.03] dark:border-white/[0.04]">
                          <div className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px]">
                            Payments Made
                          </div>
                          <div className="text-sm sm:text-base font-extrabold text-black dark:text-white tabular-nums mt-0.5 truncate">
                            {creditRepayment.paymentsMade} of {creditRepayment.termMonths}
                          </div>
                          <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                            {creditRepayment.remainingPayments} remaining
                          </div>
                        </div>

                        {/* Next Payment Due */}
                        <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.03] dark:border-white/[0.04]">
                          <div className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px]">
                            Next Payment Due
                          </div>
                          <div className="text-sm sm:text-base font-extrabold text-black dark:text-white mt-0.5 truncate">
                            {creditRepayment.nextPaymentDue}
                          </div>
                          <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                            Day {account.creditInfo.dueDay} of month
                          </div>
                        </div>

                        {/* Expected Payoff Date */}
                        <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.03] dark:border-white/[0.04]">
                          <div className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px]">
                            Expected Payoff Date
                          </div>
                          <div className="text-sm sm:text-base font-extrabold text-black dark:text-white mt-0.5 truncate">
                            {creditRepayment.expectedPayoffDate}
                          </div>
                          <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                            Start: {formatFriendlyDate(creditRepayment.startDate)}
                          </div>
                        </div>

                        {/* Total Repayment */}
                        <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.03] dark:border-white/[0.04]">
                          <div className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px]">
                            Total Repayment
                          </div>
                          <div className="text-sm sm:text-base font-extrabold text-black dark:text-white tabular-nums mt-0.5 truncate">
                            {formatPeso(
                              account.creditInfo.totalRepayment !== undefined
                                ? account.creditInfo.totalRepayment
                                : account.totalRepayment !== undefined
                                ? account.totalRepayment
                                : creditRepayment.totalRepayment,
                              { hide }
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                            Interest: {formatPeso(
                              account.creditInfo.totalRepayment !== undefined && account.creditInfo.installmentPrincipal
                                ? Math.max(0, subPHP(account.creditInfo.totalRepayment, account.creditInfo.installmentPrincipal))
                                : creditRepayment.totalInterest,
                              { hide }
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Additional Credit Details line */}
                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex flex-wrap items-center justify-between text-[11px] text-neutral-500 gap-2">
                        {account.creditInfo.installmentPrincipal !== undefined && (
                          <span>Installment Principal: <strong className="text-black dark:text-white">{formatPeso(account.creditInfo.installmentPrincipal, { hide })}</strong></span>
                        )}
                        <span>Remaining Balance: <strong className="text-black dark:text-white tabular-nums">{formatPeso(account.currentBalance, { hide })}</strong></span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 sm:p-4 rounded-[20px] sm:rounded-[24px] bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-black dark:text-white">
                        Track Installment Plan
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                        Add repayment terms, 0% promo, or monthly payoff dates
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onEditAccount(account);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold shrink-0 hover:bg-neutral-800 transition-colors"
                    >
                      Set Terms
                    </button>
                  </div>
                )}

                {/* Optional Enable Multiple Purchases Prompt */}
                <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-black dark:text-white">
                      Multiple Purchases & Installments
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Enable tracking for multiple separate credit purchases on different dates with independent monthly schedules under this shared credit limit.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      enableMultipleTransactionsForAccount(account.id);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold shrink-0 hover:bg-neutral-800 transition-colors self-start sm:self-auto"
                  >
                    Enable Feature
                  </button>
                </div>
              </div>
            )
          )}

          {/* LOANS SPECIALIZED PANEL */}
          {account.category === 'Loans' && account.loanInfo && (
            account.loanInfo.enableMultipleInstallments ? (
              <AccountMultipleInstallments account={account} hide={hide} />
            ) : loanRepayment ? (
              <div className="space-y-3 sm:space-y-3.5">
                {/* Loan Progress Card */}
                <div className="bg-white dark:bg-neutral-800 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#2E9E6B] shrink-0" />
                      <h3 className="text-xs sm:text-sm font-bold text-black dark:text-white">
                        Loan Progress
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-[#2E9E6B] tabular-nums">
                      {loanRepayment.progressPercent.toFixed(1)}% repaid
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2E9E6B] rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, loanRepayment.progressPercent))}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                    <span>
                      Payments Made:{' '}
                      <strong className="text-black dark:text-white font-semibold tabular-nums">
                        {loanRepayment.paymentsMade} of {loanRepayment.termMonths}
                      </strong>
                    </span>
                    <span>
                      {loanRepayment.remainingPayments === 0 ? (
                        <span className="text-[#2E9E6B] font-semibold">Fully Repaid</span>
                      ) : (
                        <span className="tabular-nums">
                          {loanRepayment.remainingPayments} payment{loanRepayment.remainingPayments === 1 ? '' : 's'} left
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Clear Repayment Summary Card */}
                <div className="bg-white dark:bg-neutral-800 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-neutral-700 dark:text-neutral-300 shrink-0" />
                      <h3 className="text-xs sm:text-sm font-bold text-black dark:text-white">
                        Repayment Summary
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {loanRepayment.paymentsMade > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            revertAccountPayment(account.id);
                          }}
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                          title="Undo last repayment"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Undo Repayment</span>
                        </button>
                      )}
                      {loanRepayment.isManualPayment ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                          Fixed by Lender
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                          Estimated
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2-column key metrics grid */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5 text-[11px] sm:text-xs">
                    {/* Monthly Payment */}
                    <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.03] dark:border-white/[0.04]">
                      <div className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px]">
                        Monthly Payment
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-black dark:text-white tabular-nums mt-0.5 truncate">
                        {formatPeso(loanRepayment.monthlyPayment, { hide })}
                      </div>
                      <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                        {loanRepayment.isManualPayment ? 'Lender required' : 'Calculated estimate'}
                      </div>
                    </div>

                    {/* Repayment Term */}
                    <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.03] dark:border-white/[0.04]">
                      <div className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px]">
                        Repayment Term
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-black dark:text-white tabular-nums mt-0.5 truncate">
                        {loanRepayment.termMonths} Months
                      </div>
                      <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                        {(account.loanInfo.interestRate ?? account.loanInfo.interestRateAnnual) === 0 ? '0% Interest' : `${account.loanInfo.interestRate ?? account.loanInfo.interestRateAnnual}% ${account.loanInfo.interestRateType === 'monthly' ? '/mo' : 'p.a.'}`}
                      </div>
                    </div>

                    {/* Payments Made */}
                    <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.03] dark:border-white/[0.04]">
                      <div className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px]">
                        Payments Made
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-black dark:text-white tabular-nums mt-0.5 truncate">
                        {loanRepayment.paymentsMade} of {loanRepayment.termMonths}
                      </div>
                      <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                        {loanRepayment.remainingPayments} remaining
                      </div>
                    </div>

                    {/* Next Payment Due */}
                    <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.03] dark:border-white/[0.04]">
                      <div className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px]">
                        Next Payment Due
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-black dark:text-white mt-0.5 truncate">
                        {loanRepayment.nextPaymentDue}
                      </div>
                      <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                        Day {account.loanInfo.dueDay} of month
                      </div>
                    </div>

                    {/* Expected Payoff Date */}
                    <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.03] dark:border-white/[0.04]">
                      <div className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px]">
                        Expected Payoff Date
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-black dark:text-white mt-0.5 truncate">
                        {loanRepayment.expectedPayoffDate}
                      </div>
                      <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                        Start: {formatFriendlyDate(loanRepayment.startDate)}
                      </div>
                    </div>

                    {/* Total Repayment */}
                    <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F5F8] dark:bg-neutral-900 border border-black/[0.03] dark:border-white/[0.04]">
                      <div className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px]">
                        Total Repayment
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-black dark:text-white tabular-nums mt-0.5 truncate">
                        {formatPeso(
                          account.loanInfo.totalRepayment !== undefined
                            ? account.loanInfo.totalRepayment
                            : account.totalRepayment !== undefined
                            ? account.totalRepayment
                            : loanRepayment.totalRepayment,
                          { hide }
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                        Interest: {formatPeso(
                          account.loanInfo.totalRepayment !== undefined
                            ? Math.max(0, subPHP(account.loanInfo.totalRepayment, account.loanInfo.originalPrincipal))
                            : loanRepayment.totalInterest,
                          { hide }
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional Loan Details line */}
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex flex-wrap items-center justify-between text-[11px] text-neutral-500 gap-2">
                    <span>Original Principal: <strong className="text-black dark:text-white">{formatPeso(account.loanInfo.originalPrincipal, { hide })}</strong></span>
                    <span>Remaining Balance: <strong className="text-black dark:text-white tabular-nums">{formatPeso(account.currentBalance, { hide })}</strong></span>
                    <span>Model: <strong className="text-black dark:text-white capitalize">{account.loanInfo.repaymentModel?.replace('_', ' ') || 'Flat rate'}</strong></span>
                  </div>
                </div>

                {/* Optional Enable Multiple Borrowings Prompt */}
                <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-black dark:text-white">
                      Multiple Loan Borrowings / Drawdowns
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Track multiple borrowings under this loan account on different dates with independent repayment schedules.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      enableMultipleTransactionsForAccount(account.id);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold shrink-0 hover:bg-neutral-800 transition-colors self-start sm:self-auto"
                  >
                    Enable Feature
                  </button>
                </div>
              </div>
            ) : null
          )}

          {/* Account Transactions Ledger */}
          <div className="bg-white dark:bg-neutral-800 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5">
            <h3 className="text-xs sm:text-sm font-bold text-black dark:text-white mb-2.5">
              Account Transactions ({accountTransactions.length})
            </h3>

            {accountTransactions.length === 0 ? (
              <p className="text-xs text-neutral-500 py-3 text-center">
                No transactions recorded for this account yet.
              </p>
            ) : (
              <div className="divide-y divide-neutral-200/80 dark:divide-neutral-700/70">
                {accountTransactions.map((tx) => {
                  const isIncomingTransfer =
                    tx.type === 'transfer' &&
                    tx.destinationAccountId === account.id;
                  const isPositiveForThisAccount = !account.isLiability
                    ? tx.type === 'income' ||
                      isIncomingTransfer ||
                      (tx.type === 'adjustment' &&
                        tx.adjustmentSign !== 'negative')
                    : isIncomingTransfer ||
                      tx.type === 'income' ||
                      (tx.type === 'adjustment' &&
                        tx.adjustmentSign === 'negative');

                  return (
                    <div
                      key={tx.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        onClose();
                        onSelectTransaction(tx);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onClose();
                          onSelectTransaction(tx);
                        }
                      }}
                      className="w-full py-2.5 text-left flex items-center justify-between gap-2 sm:gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/40 rounded-lg px-1 transition-colors cursor-pointer select-none"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400">
                          {formatTransactionDateTime(tx.dateTime)}
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-black dark:text-white truncate mt-0.5">
                          {tx.merchantOrTitle}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div
                          className={`text-xs sm:text-sm font-semibold tabular-nums ${
                            isPositiveForThisAccount
                              ? 'text-[#2E9E6B]'
                              : 'text-[#DC2626]'
                          }`}
                        >
                          {isPositiveForThisAccount ? '+' : '-'}
                          {formatPeso(tx.amount, { hide })}
                        </div>

                        {account.isLiability &&
                          (isIncomingTransfer ||
                            tx.category === 'Loan Payment' ||
                            tx.category === 'Credit Payment' ||
                            tx.category === 'Credit Card Payment') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                revertAccountPayment(account.id, tx.id);
                              }}
                              className="p-1 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-500/10 active:scale-90 transition-all cursor-pointer"
                              title="Undo repayment / Ibalik sa unsettled"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Account Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditAccount(account);
              }}
              className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-center gap-1.5 hover:bg-neutral-100 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Account</span>
            </button>

            <button
              type="button"
              onClick={() => toggleArchiveAccount(account.id)}
              className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-center gap-1.5 hover:bg-neutral-100 transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{account.archived ? 'Unarchive' : 'Archive'}</span>
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full sm:w-auto py-2.5 px-3 rounded-xl bg-red-50 dark:bg-red-950/50 text-xs font-semibold text-red-600 flex items-center justify-center gap-1.5 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  deleteAccount(account.id);
                  onClose();
                }}
                className="w-full sm:w-auto py-2.5 px-3 rounded-xl bg-red-600 text-xs font-bold text-white hover:bg-red-700 transition-colors"
              >
                Confirm Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dedicated Modals for Pay Credit Bill & Record Loan Payment */}
      {isPayCreditBillOpen && account.category === 'Credit' && (
        <PayCreditBillModal
          isOpen={isPayCreditBillOpen}
          onClose={() => setIsPayCreditBillOpen(false)}
          account={account}
        />
      )}

      {isRecordLoanPaymentOpen && account.category === 'Loans' && (
        <RecordLoanPaymentModal
          isOpen={isRecordLoanPaymentOpen}
          onClose={() => setIsRecordLoanPaymentOpen(false)}
          account={account}
        />
      )}
    </div>
  );
};
