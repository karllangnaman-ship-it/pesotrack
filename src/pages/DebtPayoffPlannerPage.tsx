import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  DollarSign,
  Flame,
  Info,
  Landmark,
  Mountain,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  compareDebtStrategies,
  extractDebtsFromAccounts,
  PlannerDebtItem,
  simulateDebtPayoff,
} from '../utils/debtPlannerEngine';
import { formatMonthLabel, formatPeso } from '../utils/currency';

export const DebtPayoffPlannerPage: React.FC = () => {
  const { reconciledAccounts, state } = useFinance();
  const hide = state.settings.hideBalances;

  // Selected strategy: 'snowball' or 'avalanche'
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('snowball');
  // Extra monthly repayment budget simulation
  const [extraMonthlyBudget, setExtraMonthlyBudget] = useState<number>(2000);
  const [customInput, setCustomInput] = useState<string>('2000');

  // Extract all real debts preserving purchases & drawdowns
  const debts: PlannerDebtItem[] = useMemo(() => {
    return extractDebtsFromAccounts(reconciledAccounts);
  }, [reconciledAccounts]);

  // Overall totals
  const totalCreditDebt = useMemo(() => {
    return debts
      .filter((d) => d.category === 'Credit')
      .reduce((sum, d) => sum + d.currentBalance, 0);
  }, [debts]);

  const totalLoanDebt = useMemo(() => {
    return debts
      .filter((d) => d.category === 'Loans')
      .reduce((sum, d) => sum + d.currentBalance, 0);
  }, [debts]);

  const combinedDebt = totalCreditDebt + totalLoanDebt;
  const totalScheduledMinimums = useMemo(() => {
    return debts.reduce((sum, d) => sum + d.minPayment, 0);
  }, [debts]);

  // Compare strategies
  const comparison = useMemo(() => {
    return compareDebtStrategies(debts, extraMonthlyBudget);
  }, [debts, extraMonthlyBudget]);

  const activePlan = strategy === 'snowball' ? comparison.snowball : comparison.avalanche;

  // Quick preset extra budget buttons
  const presetAmounts = [0, 1000, 2500, 5000, 10000];

  const handlePresetClick = (amt: number) => {
    setExtraMonthlyBudget(amt);
    setCustomInput(amt.toString());
  };

  const handleCustomChange = (val: string) => {
    setCustomInput(val);
    const parsed = parseFloat(val);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      setExtraMonthlyBudget(parsed);
    } else if (val === '') {
      setExtraMonthlyBudget(0);
    }
  };

  return (
    <div className="space-y-4 pb-12 w-full max-w-full min-w-0 overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-black dark:text-white flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Debt Payoff Planner & Simulator</span>
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Simulate Debt Snowball vs. Avalanche strategies to become debt-free faster
            </p>
          </div>

          <div className="px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-bold self-start sm:self-auto flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulation Mode (Safe)</span>
          </div>
        </div>

        {/* Safety Disclaimer Banner */}
        <div className="mt-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 flex items-start gap-2.5 text-xs text-neutral-600 dark:text-neutral-400">
          <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
          <span>
            This planner is an interactive simulation that projects your payoff timeline. It does
            not modify your balances, make payments, or alter live records.
          </span>
        </div>
      </div>

      {/* 2. Debt Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Total Credit Debt</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-black dark:text-white mt-1">
            {formatPeso(totalCreditDebt, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            Credit cards & lines
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Total Loan Debt</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-black dark:text-white mt-1">
            {formatPeso(totalLoanDebt, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            Personal & cash loans
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Combined Total Debt</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-[#DC2626] mt-1">
            {formatPeso(combinedDebt, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            {debts.length} active debt obligations
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Scheduled Monthly Min.</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400 mt-1">
            {formatPeso(totalScheduledMinimums, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            Baseline required/month
          </div>
        </div>
      </div>

      {debts.length === 0 ? (
        <div className="p-10 rounded-[24px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-[#2E9E6B] mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-black dark:text-white">
            You Are 100% Debt-Free!
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            You have no active credit card balances or outstanding loans. Add accounts under Accounts to start tracking or simulating payoff strategies.
          </p>
        </div>
      ) : (
        <>
          {/* 3. Strategy Switcher & Comparison */}
          <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-black dark:text-white">
                  Choose Payoff Strategy
                </h2>
                <p className="text-xs text-neutral-500">
                  Select between psychological momentum (Snowball) or mathematical optimization (Avalanche)
                </p>
              </div>

              {/* Strategy Switch Pills */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setStrategy('snowball')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    strategy === 'snowball'
                      ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Debt Snowball</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStrategy('avalanche')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    strategy === 'avalanche'
                      ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Mountain className="w-3.5 h-3.5 text-blue-500" />
                  <span>Debt Avalanche</span>
                </button>
              </div>
            </div>

            {/* Strategy Explanations */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 text-xs">
              {strategy === 'snowball' ? (
                <div>
                  <strong className="text-neutral-900 dark:text-neutral-100">
                    Debt Snowball Rule:
                  </strong>{' '}
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Pay minimum payments on all debts, and throw all extra cash at the{' '}
                    <strong>smallest balance first</strong>. When that debt is cleared, roll its
                    entire payment over to the next smallest debt for quick psychological wins.
                  </span>
                </div>
              ) : (
                <div>
                  <strong className="text-neutral-900 dark:text-neutral-100">
                    Debt Avalanche Rule:
                  </strong>{' '}
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Pay minimum payments on all debts, and throw all extra cash at the debt with the{' '}
                    <strong>highest interest rate first</strong>. This saves the maximum money in
                    compounding interest fees over time.
                  </span>
                </div>
              )}
            </div>

            {/* 4. Extra Monthly Repayment Budget Simulator */}
            <div className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Extra Monthly Budget Simulator
                  </label>
                  <p className="text-[11px] text-neutral-500">
                    Additional cash applied to your priority debt each month above scheduled minimums
                  </p>
                </div>

                <div className="relative w-44">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                    +₱
                  </span>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    value={customInput}
                    onChange={(e) => handleCustomChange(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold tabular-nums text-black dark:text-white"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-neutral-400 mr-1">Quick Select:</span>
                {presetAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handlePresetClick(amt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      extraMonthlyBudget === amt
                        ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {amt === 0 ? '₱0 (Baseline)' : `+${formatPeso(amt)}/mo`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Projected Payoff Timeline & Comparison Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Active Plan Results Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    {strategy === 'snowball' ? 'Snowball Projection' : 'Avalanche Projection'}
                  </div>
                  <h3 className="text-lg font-bold text-black dark:text-white mt-0.5">
                    Debt-Free in {activePlan.monthsToDebtFree} Months
                  </h3>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-[#2E9E6B] text-xs font-bold">
                  {formatMonthLabel(activePlan.debtFreeDate)}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 space-y-2 text-xs">
                <div className="flex justify-between items-center text-neutral-500">
                  <span>Total Monthly Payment:</span>
                  <span className="font-bold tabular-nums text-black dark:text-white">
                    {formatPeso(activePlan.totalMonthlyPayment)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-500">
                  <span>Baseline Minimums:</span>
                  <span className="tabular-nums">{formatPeso(activePlan.totalBaselinePayment)}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-500">
                  <span>Simulated Extra:</span>
                  <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    +{formatPeso(activePlan.extraMonthlyBudget)}
                  </span>
                </div>
                {activePlan.hasReliableInterest && (
                  <div className="flex justify-between items-center pt-1 border-t border-neutral-200/60 dark:border-neutral-700/60">
                    <span className="text-neutral-500">Est. Total Interest Paid:</span>
                    <span className="font-bold tabular-nums text-[#DC2626]">
                      {formatPeso(activePlan.totalInterestPaid)}
                    </span>
                  </div>
                )}
              </div>

              {activePlan.isMissingTerms && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Some accounts do not have an annual interest rate configured; projections for those accounts use scheduled installment estimates.
                  </span>
                </div>
              )}
            </div>

            {/* Side-by-Side Comparison Box */}
            <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] space-y-3.5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-black dark:text-white">
                  Strategy Comparison (Snowball vs. Avalanche)
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  How the two methods compare given your ₱{extraMonthlyBudget.toLocaleString()}/mo extra budget:
                </p>

                <div className="grid grid-cols-2 gap-2 pt-3">
                  <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60">
                    <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      ⚡ Snowball
                    </div>
                    <div className="text-sm font-bold tabular-nums text-black dark:text-white mt-0.5">
                      {comparison.snowball.monthsToDebtFree} mos
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {formatMonthLabel(comparison.snowball.debtFreeDate)}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60">
                    <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      🏔️ Avalanche
                    </div>
                    <div className="text-sm font-bold tabular-nums text-black dark:text-white mt-0.5">
                      {comparison.avalanche.monthsToDebtFree} mos
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {formatMonthLabel(comparison.avalanche.debtFreeDate)}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 text-xs text-neutral-600 dark:text-neutral-300 mt-3">
                  {comparison.recommendationReason}
                </div>
              </div>

              <div className="text-[11px] text-neutral-400">
                Tip: When one debt finishes, keep paying the same monthly total by rolling over that freed cash!
              </div>
            </div>
          </div>

          {/* 6. Step-by-Step Priority Payoff Order */}
          <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] space-y-3">
            <div>
              <h2 className="text-base font-bold text-black dark:text-white">
                Suggested Payoff Order & Allocation ({strategy === 'snowball' ? 'Snowball' : 'Avalanche'})
              </h2>
              <p className="text-xs text-neutral-500">
                Step-by-step priority queue showing projected payoff date for each debt
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {activePlan.steps.map((step) => (
                <div
                  key={step.debtId}
                  className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold flex items-center justify-center shrink-0">
                      #{step.order}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-black dark:text-white truncate">
                          {step.debtName}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                          {step.category}
                        </span>
                        {step.hasInterestRate ? (
                          <span className="text-[10px] font-semibold text-neutral-500">
                            {step.annualInterestRate.toFixed(1)}% p.a.
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400">
                            No interest specified
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        Initial balance: {formatPeso(step.initialBalance, { hide })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Target: {formatMonthLabel(step.payoffDate)}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      in ~{step.payoffMonthCount} {step.payoffMonthCount === 1 ? 'month' : 'months'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
