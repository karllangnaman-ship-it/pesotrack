import { ReconciledAccount } from './financeEngine';
import { roundPHP, subPHP, addPHP } from './currency';

export interface PlannerDebtItem {
  id: string;
  name: string;
  accountId: string;
  category: 'Credit' | 'Loans';
  providerId: string;
  currentBalance: number;
  annualInterestRate: number; // in percent (e.g. 24 for 24%)
  hasInterestRate: boolean;
  minPayment: number; // Scheduled monthly installment or minimum required payment
  dueDay: number;
  isInstallmentOrPurchase?: boolean;
  notes?: string;
}

export interface PayoffStep {
  debtId: string;
  debtName: string;
  category: 'Credit' | 'Loans';
  initialBalance: number;
  annualInterestRate: number;
  hasInterestRate: boolean;
  monthlyAllocation: number; // baseline min + extra applied
  payoffMonthCount: number; // months from today
  payoffDate: string; // YYYY-MM
  totalInterestPaid: number;
  order: number;
}

export interface PayoffSimulationResult {
  strategy: 'snowball' | 'avalanche';
  extraMonthlyBudget: number;
  totalDebt: number;
  totalBaselinePayment: number;
  totalMonthlyPayment: number;
  monthsToDebtFree: number;
  debtFreeDate: string;
  totalInterestPaid: number;
  hasReliableInterest: boolean;
  isMissingTerms: boolean;
  steps: PayoffStep[];
}

export interface DebtComparisonSummary {
  snowball: PayoffSimulationResult;
  avalanche: PayoffSimulationResult;
  interestSavedDifference: number; // Avalanche vs Snowball savings
  monthsSavedDifference: number;
  recommendationReason: string;
}

/**
 * Extracts all individual debts from active credit and loan accounts,
 * preserving individual repayment schedules for multiple purchases/drawdowns.
 */
export function extractDebtsFromAccounts(
  reconciledAccounts: ReconciledAccount[]
): PlannerDebtItem[] {
  const items: PlannerDebtItem[] = [];

  for (const acc of reconciledAccounts) {
    if (acc.archived) continue;

    // 1. Credit accounts
    if (acc.category === 'Credit' && acc.currentBalance > 0) {
      if (
        acc.creditInfo?.enableMultipleInstallments &&
        acc.creditInfo.purchases &&
        acc.creditInfo.purchases.length > 0
      ) {
        // Individual credit purchases/installments
        for (const p of acc.creditInfo.purchases) {
          if (p.remainingBalance > 0) {
            let annualRate = 0;
            let hasRate = false;
            if (typeof p.interestRate === 'number' && p.interestRate > 0) {
              hasRate = true;
              annualRate = p.interestRateType === 'monthly' ? p.interestRate * 12 : p.interestRate;
            } else if (typeof acc.creditInfo.interestRate === 'number' && acc.creditInfo.interestRate > 0) {
              hasRate = true;
              annualRate = acc.creditInfo.interestRateType === 'monthly'
                ? acc.creditInfo.interestRate * 12
                : acc.creditInfo.interestRate;
            }

            const minPay = p.customMonthlyPayment || p.monthlyPayment || Math.max(500, roundPHP(p.remainingBalance / Math.max(1, p.termMonths || 12)));

            items.push({
              id: `debt_purchase_${p.id}`,
              name: `${acc.name} — ${p.name}`,
              accountId: acc.id,
              category: 'Credit',
              providerId: acc.providerId,
              currentBalance: p.remainingBalance,
              annualInterestRate: annualRate,
              hasInterestRate: hasRate,
              minPayment: minPay,
              dueDay: p.dueDay || acc.creditInfo.dueDay || 15,
              isInstallmentOrPurchase: true,
              notes: `${p.termMonths || 12}-month purchase`,
            });
          }
        }
      } else {
        // Single revolving card / credit balance
        let annualRate = 0;
        let hasRate = false;
        if (typeof acc.creditInfo?.interestRate === 'number' && acc.creditInfo.interestRate > 0) {
          hasRate = true;
          annualRate = acc.creditInfo.interestRateType === 'monthly'
            ? acc.creditInfo.interestRate * 12
            : acc.creditInfo.interestRate;
        }

        // Standard card minimum is typically 3-5% or ₱500, whichever is higher, or installment estimate
        const minPay = acc.creditInfo?.monthlyInstallmentEstimate ||
          acc.creditInfo?.customMonthlyPayment ||
          Math.max(500, roundPHP(acc.currentBalance * 0.05));

        items.push({
          id: `debt_credit_${acc.id}`,
          name: acc.name,
          accountId: acc.id,
          category: 'Credit',
          providerId: acc.providerId,
          currentBalance: acc.currentBalance,
          annualInterestRate: annualRate,
          hasInterestRate: hasRate,
          minPayment: minPay,
          dueDay: acc.creditInfo?.dueDay || 15,
        });
      }
    }

    // 2. Loan accounts
    if (acc.category === 'Loans' && acc.currentBalance > 0) {
      if (
        acc.loanInfo?.enableMultipleInstallments &&
        acc.loanInfo.drawdowns &&
        acc.loanInfo.drawdowns.length > 0
      ) {
        // Individual loan drawdowns
        for (const d of acc.loanInfo.drawdowns) {
          if (d.remainingBalance > 0) {
            let annualRate = 0;
            let hasRate = false;
            if (typeof d.interestRate === 'number' && d.interestRate > 0) {
              hasRate = true;
              annualRate = d.interestRateType === 'monthly' ? d.interestRate * 12 : d.interestRate;
            } else if (typeof acc.loanInfo.interestRateAnnual === 'number' && acc.loanInfo.interestRateAnnual > 0) {
              hasRate = true;
              annualRate = acc.loanInfo.interestRateAnnual;
            }

            const minPay = d.customMonthlyPayment || d.monthlyPayment || Math.max(500, roundPHP(d.remainingBalance / Math.max(1, d.termMonths || 12)));

            items.push({
              id: `debt_drawdown_${d.id}`,
              name: `${acc.name} — ${d.name}`,
              accountId: acc.id,
              category: 'Loans',
              providerId: acc.providerId,
              currentBalance: d.remainingBalance,
              annualInterestRate: annualRate,
              hasInterestRate: hasRate,
              minPayment: minPay,
              dueDay: d.dueDay || acc.loanInfo.dueDay || 15,
              isInstallmentOrPurchase: true,
              notes: `${d.termMonths || 12}-month drawdown`,
            });
          }
        }
      } else {
        // Single loan account
        let annualRate = 0;
        let hasRate = false;
        if (typeof acc.loanInfo?.interestRateAnnual === 'number' && acc.loanInfo.interestRateAnnual > 0) {
          hasRate = true;
          annualRate = acc.loanInfo.interestRateAnnual;
        } else if (typeof acc.loanInfo?.interestRate === 'number' && acc.loanInfo.interestRate > 0) {
          hasRate = true;
          annualRate = acc.loanInfo.interestRateType === 'monthly' ? acc.loanInfo.interestRate * 12 : acc.loanInfo.interestRate;
        }

        const minPay = acc.loanInfo?.monthlyInstallmentEstimate ||
          acc.loanInfo?.customMonthlyPayment ||
          Math.max(500, roundPHP(acc.currentBalance / Math.max(1, acc.loanInfo?.termMonths || 12)));

        items.push({
          id: `debt_loan_${acc.id}`,
          name: acc.name,
          accountId: acc.id,
          category: 'Loans',
          providerId: acc.providerId,
          currentBalance: acc.currentBalance,
          annualInterestRate: annualRate,
          hasInterestRate: hasRate,
          minPayment: minPay,
          dueDay: acc.loanInfo?.dueDay || 15,
        });
      }
    }
  }

  return items;
}

/**
 * Computes projected debt-free month date string YYYY-MM given months from now.
 */
function getFutureMonthDate(monthsFromNow: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsFromNow);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Simulates repayment using Snowball (smallest balance first) or Avalanche (highest interest rate first).
 * Completely safe simulation, does NOT modify any live data.
 */
export function simulateDebtPayoff(
  debts: PlannerDebtItem[],
  strategy: 'snowball' | 'avalanche',
  extraMonthlyBudget: number = 0
): PayoffSimulationResult {
  const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0);
  const totalBaselinePayment = debts.reduce((sum, d) => sum + d.minPayment, 0);
  const totalMonthlyPayment = totalBaselinePayment + Math.max(0, extraMonthlyBudget);

  if (debts.length === 0 || totalDebt <= 0) {
    return {
      strategy,
      extraMonthlyBudget,
      totalDebt: 0,
      totalBaselinePayment: 0,
      totalMonthlyPayment: 0,
      monthsToDebtFree: 0,
      debtFreeDate: getFutureMonthDate(0),
      totalInterestPaid: 0,
      hasReliableInterest: true,
      isMissingTerms: false,
      steps: [],
    };
  }

  // Clone debts for month-by-month simulation
  const workingDebts = debts.map((d) => ({
    ...d,
    balance: d.currentBalance,
    accumulatedInterest: 0,
    paidOffMonth: 0,
    peakMonthlyPayment: d.minPayment,
  }));

  // Sort according to strategy:
  // Snowball: smallest balance first
  // Avalanche: highest annual interest rate first (ties broken by smaller balance)
  if (strategy === 'snowball') {
    workingDebts.sort((a, b) => a.balance - b.balance);
  } else {
    workingDebts.sort((a, b) => {
      if (b.annualInterestRate !== a.annualInterestRate) {
        return b.annualInterestRate - a.annualInterestRate;
      }
      return a.balance - b.balance;
    });
  }

  let monthCount = 0;
  const maxMonths = 360; // 30 years cap to guard against infinite loops
  let extraCashPool = Math.max(0, extraMonthlyBudget);
  let totalInterestPaidAll = 0;
  let allPaid = false;

  const stepsMap = new Map<string, PayoffStep>();

  while (monthCount < maxMonths && !allPaid) {
    monthCount++;
    let monthlyFreedCash = 0;

    // 1. Accrue monthly interest on all active debts
    for (const d of workingDebts) {
      if (d.balance > 0) {
        const monthlyRate = (d.annualInterestRate / 100) / 12;
        const interest = d.balance * monthlyRate;
        d.accumulatedInterest += interest;
        totalInterestPaidAll += interest;
        d.balance += interest;
      }
    }

    // 2. Pay baseline minimums on all active debts
    for (const d of workingDebts) {
      if (d.balance > 0) {
        const payment = Math.min(d.balance, d.minPayment);
        d.balance -= payment;
        if (d.balance <= 0.01) {
          d.balance = 0;
          if (d.paidOffMonth === 0) {
            d.paidOffMonth = monthCount;
            monthlyFreedCash += d.minPayment; // Rollover freed payment
          }
        }
      }
    }

    // 3. Apply available extra cash pool (extra budget + freed up minimum payments) to the priority active debt
    let availableExtra = extraCashPool;

    for (const d of workingDebts) {
      if (d.balance > 0 && availableExtra > 0) {
        d.peakMonthlyPayment = Math.max(d.peakMonthlyPayment, d.minPayment + availableExtra);
        const extraPayment = Math.min(d.balance, availableExtra);
        d.balance -= extraPayment;
        availableExtra -= extraPayment;

        if (d.balance <= 0.01) {
          d.balance = 0;
          if (d.paidOffMonth === 0) {
            d.paidOffMonth = monthCount;
            monthlyFreedCash += d.minPayment;
          }
        }
      }
      if (availableExtra <= 0) break;
    }

    // Snowball / Avalanche rollover: any newly freed minimums get permanently added to the monthly extra pool!
    extraCashPool += monthlyFreedCash;

    // Check if all debts are extinguished
    allPaid = workingDebts.every((d) => d.balance <= 0.01);
  }

  const steps: PayoffStep[] = workingDebts.map((d, index) => {
    const payoffMonths = d.paidOffMonth > 0 ? d.paidOffMonth : monthCount;
    return {
      debtId: d.id,
      debtName: d.name,
      category: d.category,
      initialBalance: d.currentBalance,
      annualInterestRate: d.annualInterestRate,
      hasInterestRate: d.hasInterestRate,
      monthlyAllocation: roundPHP(d.peakMonthlyPayment),
      payoffMonthCount: payoffMonths,
      payoffDate: getFutureMonthDate(payoffMonths),
      totalInterestPaid: roundPHP(d.accumulatedInterest),
      order: index + 1,
    };
  });

  const hasReliableInterest = debts.some((d) => d.hasInterestRate);
  const isMissingTerms = debts.some((d) => !d.hasInterestRate || d.minPayment <= 0);

  return {
    strategy,
    extraMonthlyBudget,
    totalDebt: roundPHP(totalDebt),
    totalBaselinePayment: roundPHP(totalBaselinePayment),
    totalMonthlyPayment: roundPHP(totalMonthlyPayment),
    monthsToDebtFree: monthCount,
    debtFreeDate: getFutureMonthDate(monthCount),
    totalInterestPaid: roundPHP(totalInterestPaidAll),
    hasReliableInterest,
    isMissingTerms,
    steps,
  };
}

/**
 * Generates a full comparison between Snowball and Avalanche strategies.
 */
export function compareDebtStrategies(
  debts: PlannerDebtItem[],
  extraMonthlyBudget: number = 0
): DebtComparisonSummary {
  const snowball = simulateDebtPayoff(debts, 'snowball', extraMonthlyBudget);
  const avalanche = simulateDebtPayoff(debts, 'avalanche', extraMonthlyBudget);

  const interestSavedDifference = Math.max(0, roundPHP(snowball.totalInterestPaid - avalanche.totalInterestPaid));
  const monthsSavedDifference = Math.max(0, snowball.monthsToDebtFree - avalanche.monthsToDebtFree);

  let recommendationReason = '';
  if (debts.length <= 1) {
    recommendationReason = 'You have a single active debt. Both Snowball and Avalanche follow the identical accelerated payoff route.';
  } else if (interestSavedDifference > 200) {
    recommendationReason = `Avalanche is mathematically optimal, saving you approximately ₱${interestSavedDifference.toLocaleString('en-PH', { minimumFractionDigits: 2 })} in interest payments compared to Snowball.`;
  } else {
    recommendationReason = 'Snowball provides rapid psychological momentum by clearing smaller balances first, while keeping interest costs very comparable.';
  }

  return {
    snowball,
    avalanche,
    interestSavedDifference,
    monthsSavedDifference,
    recommendationReason,
  };
}
