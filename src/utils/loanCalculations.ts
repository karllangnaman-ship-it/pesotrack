import {
  InterestRateType,
  ReceivableInstallmentItem,
  ReceivablePaymentSchedule,
  ReceivableRecord,
  RepaymentModel,
  TransactionRecord,
} from '../types/finance';
import { addPHP, roundPHP, subPHP } from './currency';

export interface RepaymentCalculationInput {
  principal: number;
  totalRepayment?: number;
  termMonths: number;
  interestRate: number; // percentage, e.g. 2.5 or 12
  interestRateType?: InterestRateType; // 'monthly' | 'annual'
  repaymentModel?: RepaymentModel;
  customMonthlyPayment?: number;
  startDate?: string; // YYYY-MM-DD
  dueDay?: number;
}

export interface RepaymentCalculationResult {
  monthlyPayment: number;
  isManualPayment: boolean;
  termMonths: number;
  totalRepayment: number;
  totalInterest: number;
  startDate: string;
  expectedPayoffDate: string;
  nextPaymentDue: string;
  paymentsMade: number;
  remainingPayments: number;
  progressPercent: number;
  totalPaid: number;
  remainingBalance: number;
}

/**
 * Add months to a YYYY-MM-DD date safely
 */
export function addMonthsToDate(dateStr: string, monthsToAdd: number): string {
  if (!dateStr) {
    const today = new Date();
    dateStr = today.toISOString().split('T')[0];
  }

  const parts = dateStr.slice(0, 10).split('-');
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const month = parseInt(parts[1], 10) || 1;
  const day = parseInt(parts[2], 10) || 1;

  const targetDate = new Date(year, month - 1 + monthsToAdd, day);
  // Handle edge cases where day exceeds month length (e.g. Feb 30 -> Mar 2)
  if (targetDate.getDate() !== day) {
    targetDate.setDate(0); // set to last day of previous month
  }

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatFriendlyDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const COMMON_REPAYMENT_TERMS = [3, 6, 9, 12, 18, 24, 36];

/**
 * Core calculation of repayment installment, total interest, and payoff
 */
export function calculateRepaymentDetails(
  input: RepaymentCalculationInput,
  currentBalance: number,
  transactions: TransactionRecord[] = [],
  accountId?: string
): RepaymentCalculationResult {
  const principal = Math.max(0, input.principal || 0);
  const termMonths = Math.max(1, Math.round(input.termMonths || 12));
  const interestRate = Math.max(0, input.interestRate || 0);
  const interestRateType = input.interestRateType || 'annual';
  const repaymentModel = input.repaymentModel || 'flat_rate';
  const customMonthlyPayment = input.customMonthlyPayment;

  let monthlyPayment = 0;
  let totalInterest = 0;
  let totalRepayment = 0;
  let isManualPayment = false;

  // 1. Manual Fixed Installment Override (lender-required payment entered by user)
  if (customMonthlyPayment && customMonthlyPayment > 0) {
    monthlyPayment = roundPHP(customMonthlyPayment);
    totalRepayment = roundPHP(monthlyPayment * termMonths);
    totalInterest = Math.max(0, roundPHP(totalRepayment - principal));
    isManualPayment = true;
  }
  // 2. Zero-Interest Loan / 0% Installment Promo
  else if (interestRate === 0) {
    monthlyPayment = roundPHP(principal / termMonths);
    totalInterest = 0;
    totalRepayment = principal;
    isManualPayment = false;
  }
  // 3. Interest-Bearing Loan
  else {
    isManualPayment = false;
    if (interestRateType === 'monthly') {
      // Monthly Add-on / Flat rate (standard in Philippine digital & consumer loans e.g. GLoan, Maya, SLoan, Salmon)
      if (repaymentModel === 'flat_rate' || repaymentModel === 'principal_first') {
        const monthlyInterest = principal * (interestRate / 100);
        totalInterest = roundPHP(monthlyInterest * termMonths);
        totalRepayment = roundPHP(principal + totalInterest);
        monthlyPayment = roundPHP(totalRepayment / termMonths);
      } else {
        // Amortized reducing balance with monthly rate
        const r = interestRate / 100;
        const n = termMonths;
        const factor = Math.pow(1 + r, n);
        monthlyPayment = roundPHP((principal * r * factor) / (factor - 1));
        totalRepayment = roundPHP(monthlyPayment * n);
        totalInterest = Math.max(0, roundPHP(totalRepayment - principal));
      }
    } else {
      // Annual rate
      if (repaymentModel === 'flat_rate') {
        totalInterest = roundPHP(principal * (interestRate / 100) * (termMonths / 12));
        totalRepayment = roundPHP(principal + totalInterest);
        monthlyPayment = roundPHP(totalRepayment / termMonths);
      } else {
        // Standard amortization p.a.
        const monthlyRate = (interestRate / 100) / 12;
        const n = termMonths;
        if (monthlyRate === 0) {
          monthlyPayment = roundPHP(principal / n);
        } else {
          const factor = Math.pow(1 + monthlyRate, n);
          monthlyPayment = roundPHP((principal * monthlyRate * factor) / (factor - 1));
        }
        totalRepayment = roundPHP(monthlyPayment * n);
        totalInterest = Math.max(0, roundPHP(totalRepayment - principal));
      }
    }
  }

  // 4. Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const startDate = input.startDate || todayStr;
  const rawPayoffDate = addMonthsToDate(startDate, termMonths);
  const expectedPayoffDate = formatFriendlyDate(rawPayoffDate);

  // 5. Track payments made from transaction history
  let paymentsCount = 0;
  let totalPaid = 0;

  if (accountId && transactions.length > 0) {
    for (const tx of transactions) {
      if (tx.isStartingBalance) continue;
      // Transfer to this liability account counts as payment
      const isTransferPayment = tx.type === 'transfer' && tx.destinationAccountId === accountId;
      // Direct payment to liability account
      const isDirectPayment =
        (tx.type === 'income' || tx.category === 'Loan Payment' || tx.category === 'Credit Payment') &&
        tx.accountId === accountId;

      if (isTransferPayment || isDirectPayment) {
        paymentsCount += 1;
        totalPaid = addPHP(totalPaid, tx.amount);
      }
    }
  }

  const debtBaseline =
    input.totalRepayment && input.totalRepayment > 0
      ? input.totalRepayment
      : totalRepayment > 0
      ? totalRepayment
      : principal;

  // If no transactions or additional balance paydown was done
  if (totalPaid === 0 && currentBalance < debtBaseline && debtBaseline > 0) {
    totalPaid = Math.max(0, subPHP(debtBaseline, currentBalance));
  }

  // Calculate payments made
  let paymentsMade = 0;
  if (currentBalance <= 0 && debtBaseline > 0) {
    paymentsMade = termMonths;
  } else if (totalPaid > 0) {
    const paymentsFromAmount = monthlyPayment > 0 ? Math.floor((totalPaid + 0.5) / monthlyPayment) : 0;
    paymentsMade = Math.max(paymentsCount, paymentsFromAmount);
  } else if (currentBalance < debtBaseline && debtBaseline > 0 && monthlyPayment > 0) {
    paymentsMade = Math.round(subPHP(debtBaseline, currentBalance) / monthlyPayment);
  }
  paymentsMade = Math.min(termMonths, Math.max(0, paymentsMade));
  const remainingPayments = Math.max(0, termMonths - paymentsMade);

  // Next payment due date
  let nextPaymentDue = 'Fully Paid';
  if (currentBalance > 0 && remainingPayments > 0) {
    const rawNextDate = addMonthsToDate(startDate, paymentsMade);
    let finalNextDate = rawNextDate;
    if (input.dueDay && input.dueDay >= 1 && input.dueDay <= 31) {
      const [ny, nm] = rawNextDate.split('-').map(Number);
      const maxDays = new Date(ny, nm, 0).getDate();
      const clampedDay = Math.min(maxDays, input.dueDay);
      finalNextDate = `${ny}-${String(nm).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
    }
    nextPaymentDue = formatFriendlyDate(finalNextDate);
  }

  // Progress percentage based on actual repayments
  let progressPercent = 0;
  if (currentBalance <= 0 && debtBaseline > 0) {
    progressPercent = 100;
  } else if (debtBaseline > 0) {
    const actualRepaid = Math.max(totalPaid, Math.max(0, subPHP(debtBaseline, currentBalance)));
    const progressFromAmount = (actualRepaid / debtBaseline) * 100;
    const progressFromTerms = (paymentsMade / termMonths) * 100;
    progressPercent = Math.min(100, Math.max(0, Math.max(progressFromAmount, progressFromTerms)));
  }

  return {
    monthlyPayment,
    isManualPayment,
    termMonths,
    totalRepayment,
    totalInterest,
    startDate,
    expectedPayoffDate,
    nextPaymentDue,
    paymentsMade,
    remainingPayments,
    progressPercent,
    totalPaid,
    remainingBalance: currentBalance,
  };
}

export interface MonthInstallmentDue {
  purchaseId: string;
  purchaseName: string;
  installmentIndex: number; // 1-indexed (e.g. 2 of 6)
  totalInstallments: number;
  amountDue: number;
  dueDay: number;
  dueDate: string; // YYYY-MM-DD
  isPaid: boolean;
}

export interface MonthlyRepaymentSummaryMonth {
  monthKey: string; // "2026-05"
  monthLabel: string; // "May 2026"
  totalDue: number; // Combined amount due for this calendar month
  totalPaid: number;
  items: MonthInstallmentDue[];
  isFullyPaid: boolean;
  isCurrentOrPast: boolean;
}

/**
 * Generates an aggregated calendar-month repayment schedule across all purchases/drawdowns.
 * Example:
 *  Purchase A: ₱6,000 starting Jan (6 mos) -> ₱1,000/mo Jan-Jun
 *  Purchase B: ₱3,000 starting Mar (3 mos) -> ₱1,000/mo Mar-May
 *  Purchase C: ₱2,000 starting May (4 mos) -> ₱500/mo May-Aug
 * Correctly combines amounts due for each calendar month while preserving individual schedules.
 */
export function generateMonthlyRepaymentSummary(
  purchases: import('../types/finance').CreditPurchaseOrDrawdown[]
): MonthlyRepaymentSummaryMonth[] {
  if (!purchases || purchases.length === 0) return [];

  const monthsMap = new Map<string, MonthlyRepaymentSummaryMonth>();
  const currentMonthKey = new Date().toISOString().slice(0, 7);

  for (const p of purchases) {
    const terms = Math.max(1, p.termMonths || 1);
    const totalRepay = p.totalRepayment > 0 ? p.totalRepayment : p.principal;
    const baseMonthly = p.monthlyPayment > 0 ? p.monthlyPayment : roundPHP(totalRepay / terms);

    // Determine initial payment base date
    const startBase = p.firstPaymentDate || p.startDate || new Date().toISOString().slice(0, 10);
    const dueDay = p.dueDay >= 1 && p.dueDay <= 31 ? p.dueDay : 15;

    let cumulativeDue = 0;

    for (let i = 0; i < terms; i++) {
      const isLast = i === terms - 1;
      // Adjust final installment for rounding
      const installmentAmount = isLast
        ? roundPHP(totalRepay - cumulativeDue)
        : baseMonthly;
      cumulativeDue += installmentAmount;

      // Calculate month date
      const rawMonthDate = addMonthsToDate(startBase, i);
      const [y, m] = rawMonthDate.split('-').map(Number);
      const maxDays = new Date(y, m, 0).getDate();
      const clampedDay = Math.min(maxDays, dueDay);
      const dueDate = `${y}-${String(m).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
      const monthKey = `${y}-${String(m).padStart(2, '0')}`;

      // Check if this specific installment is paid
      // If purchase remainingBalance is 0, or totalPaid covers up to this installment
      const isPaid =
        p.remainingBalance <= 0 ||
        p.status === 'completed' ||
        p.totalPaid >= cumulativeDue;

      if (!monthsMap.has(monthKey)) {
        const dObj = new Date(y, m - 1, 1);
        const monthLabel = dObj.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        });
        monthsMap.set(monthKey, {
          monthKey,
          monthLabel,
          totalDue: 0,
          totalPaid: 0,
          items: [],
          isFullyPaid: true,
          isCurrentOrPast: monthKey <= currentMonthKey,
        });
      }

      const summaryMonth = monthsMap.get(monthKey)!;
      summaryMonth.totalDue = roundPHP(summaryMonth.totalDue + installmentAmount);
      if (isPaid) {
        summaryMonth.totalPaid = roundPHP(summaryMonth.totalPaid + installmentAmount);
      } else {
        summaryMonth.isFullyPaid = false;
      }

      summaryMonth.items.push({
        purchaseId: p.id,
        purchaseName: p.name,
        installmentIndex: i + 1,
        totalInstallments: terms,
        amountDue: installmentAmount,
        dueDay: clampedDay,
        dueDate,
        isPaid,
      });
    }
  }

  // Sort chronologically by monthKey
  const sortedMonths = Array.from(monthsMap.values()).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey)
  );

  return sortedMonths;
}

/**
 * Computes upcoming payment details across multiple purchases.
 */
export function getUpcomingMultiPaymentInfo(
  purchases: import('../types/finance').CreditPurchaseOrDrawdown[]
): { nextPaymentDate: string; nextMonthlyAmount: number; totalActiveCount: number; totalCompletedCount: number } {
  const activePurchases = purchases.filter(
    (p) => p.status === 'active' && p.remainingBalance > 0
  );
  const completedPurchases = purchases.filter(
    (p) => p.status === 'completed' || p.remainingBalance <= 0
  );

  if (activePurchases.length === 0) {
    return {
      nextPaymentDate: 'Fully Paid',
      nextMonthlyAmount: 0,
      totalActiveCount: 0,
      totalCompletedCount: completedPurchases.length,
    };
  }

  const summary = generateMonthlyRepaymentSummary(activePurchases);
  const currentMonthKey = new Date().toISOString().slice(0, 7);

  // Find first upcoming or current month with unpaid installments
  const nextMonth = summary.find(
    (m) => (!m.isFullyPaid || m.monthKey >= currentMonthKey) && m.items.some((it) => !it.isPaid)
  ) || summary.find((m) => !m.isFullyPaid);

  let nextPaymentDate = 'N/A';
  let nextMonthlyAmount = 0;

  if (nextMonth) {
    const unpaidItems = nextMonth.items.filter((it) => !it.isPaid);
    // Find the earliest due date in this month
    const earliestDueDate = unpaidItems.reduce((earliest, cur) => {
      return !earliest || cur.dueDate < earliest ? cur.dueDate : earliest;
    }, '');
    nextPaymentDate = formatFriendlyDate(earliestDueDate);
    nextMonthlyAmount = unpaidItems.reduce((sum, cur) => sum + cur.amountDue, 0);
  }

  return {
    nextPaymentDate,
    nextMonthlyAmount: roundPHP(nextMonthlyAmount),
    totalActiveCount: activePurchases.length,
    totalCompletedCount: completedPurchases.length,
  };
}

export interface IndividualInstallmentItem {
  installmentIndex: number;
  totalInstallments: number;
  dueDate: string;
  amountDue: number;
  cumulativeDue: number;
  isPaid: boolean;
}

export function generateTransactionSchedule(
  p: import('../types/finance').CreditPurchaseOrDrawdown
): IndividualInstallmentItem[] {
  const terms = Math.max(1, p.termMonths || 1);
  const totalRepay = p.totalRepayment > 0 ? p.totalRepayment : p.principal;
  const baseMonthly = p.monthlyPayment > 0 ? p.monthlyPayment : roundPHP(totalRepay / terms);
  const startBase = p.firstPaymentDate || p.startDate || new Date().toISOString().slice(0, 10);
  const dueDay = p.dueDay >= 1 && p.dueDay <= 31 ? p.dueDay : 15;

  const schedule: IndividualInstallmentItem[] = [];
  let cumulativeDue = 0;

  for (let i = 0; i < terms; i++) {
    const isLast = i === terms - 1;
    const installmentAmount = isLast
      ? roundPHP(totalRepay - cumulativeDue)
      : baseMonthly;
    cumulativeDue = roundPHP(cumulativeDue + installmentAmount);

    const rawMonthDate = addMonthsToDate(startBase, i);
    const [y, m] = rawMonthDate.split('-').map(Number);
    const maxDays = new Date(y, m, 0).getDate();
    const clampedDay = Math.min(maxDays, dueDay);
    const dueDate = `${y}-${String(m).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;

    const isPaid =
      p.remainingBalance <= 0 ||
      p.status === 'completed' ||
      (p.totalPaid || 0) >= cumulativeDue;

    schedule.push({
      installmentIndex: i + 1,
      totalInstallments: terms,
      dueDate,
      amountDue: installmentAmount,
      cumulativeDue,
      isPaid,
    });
  }

  return schedule;
}

// ==========================================
// Money Owed to Me (Receivables) Calculator
// ==========================================

export interface ReceivableCalculationInput {
  principal: number;
  termMonths: number;
  interestRate: number; // percentage, e.g. 1.99 or 0
  interestRateType?: InterestRateType; // 'annual' | 'monthly'
  repaymentModel?: RepaymentModel; // 'amortized' | 'flat_rate' | 'principal_first'
  isFixedMonthlyPayment?: boolean;
  fixedMonthlyPayment?: number;
  scheduleStartDate: string; // YYYY-MM-DD
  paymentSchedule?: ReceivablePaymentSchedule;
}

export interface ReceivableCalculationOutput {
  monthlyPayment: number;
  termMonths: number;
  totalRepayment: number;
  totalInterest: number;
  scheduleStartDate: string;
  finalDueDate: string;
  schedule: ReceivableInstallmentItem[];
  isInsufficientPayment?: boolean;
  warning?: string;
}

/**
 * Computes lending repayment amounts and generates the installment collection schedule.
 * Reuses core loan calculation formulas to guarantee consistent calculation across the app.
 */
export function calculateReceivableTermsAndSchedule(
  input: ReceivableCalculationInput
): ReceivableCalculationOutput {
  const principal = Math.max(0, input.principal || 0);
  const rawStartDate = input.scheduleStartDate || new Date().toISOString().slice(0, 10);
  const scheduleStartDate = rawStartDate.length === 10 ? rawStartDate : rawStartDate.slice(0, 10);
  const interestRate = Math.max(0, input.interestRate || 0);
  const interestRateType: InterestRateType = input.interestRateType || 'annual';
  const repaymentModel: RepaymentModel = input.repaymentModel || 'amortized';
  const paymentSchedule: ReceivablePaymentSchedule = input.paymentSchedule || 'monthly';
  const isFixedMonthlyPayment = !!input.isFixedMonthlyPayment;
  const fixedMonthlyPayment = input.fixedMonthlyPayment;

  // Handle zero principal edge case
  if (principal <= 0) {
    return {
      monthlyPayment: 0,
      termMonths: Math.max(1, input.termMonths || 12),
      totalRepayment: 0,
      totalInterest: 0,
      scheduleStartDate,
      finalDueDate: scheduleStartDate,
      schedule: [],
    };
  }

  // 1. One-time payment schedule
  if (paymentSchedule === 'one_time') {
    let totalInterest = 0;
    if (interestRate > 0) {
      if (interestRateType === 'monthly') {
        totalInterest = roundPHP(principal * (interestRate / 100) * (input.termMonths || 1));
      } else {
        totalInterest = roundPHP(principal * (interestRate / 100) * ((input.termMonths || 12) / 12));
      }
    }
    const totalRepayment = roundPHP(principal + totalInterest);
    const item: ReceivableInstallmentItem = {
      installmentNumber: 1,
      dueDate: scheduleStartDate,
      collectionAmount: totalRepayment,
      principalPortion: principal,
      interestPortion: totalInterest,
      remainingBalance: 0,
      isPaid: false,
    };
    return {
      monthlyPayment: totalRepayment,
      termMonths: 1,
      totalRepayment,
      totalInterest,
      scheduleStartDate,
      finalDueDate: scheduleStartDate,
      schedule: [item],
    };
  }

  // 2. Fixed monthly collection amount agreed with borrower
  if (isFixedMonthlyPayment && fixedMonthlyPayment && fixedMonthlyPayment > 0) {
    const M = roundPHP(fixedMonthlyPayment);

    // Case 2a: Zero-interest fixed monthly payment
    if (interestRate === 0) {
      const projectedMonths = Math.max(1, Math.ceil(principal / M));
      let curBal = principal;
      const schedule: ReceivableInstallmentItem[] = [];

      for (let k = 1; k <= projectedMonths; k++) {
        const dueDate = addMonthsToDate(scheduleStartDate, k - 1);
        const isLast = k === projectedMonths || curBal <= M;
        const coll = isLast ? curBal : M;
        curBal = isLast ? 0 : roundPHP(curBal - coll);

        schedule.push({
          installmentNumber: k,
          dueDate,
          collectionAmount: coll,
          principalPortion: coll,
          interestPortion: 0,
          remainingBalance: curBal,
          isPaid: false,
        });

        if (isLast) break;
      }

      const finalDueDate = schedule[schedule.length - 1]?.dueDate || scheduleStartDate;
      return {
        monthlyPayment: M,
        termMonths: schedule.length,
        totalRepayment: principal,
        totalInterest: 0,
        scheduleStartDate,
        finalDueDate,
        schedule,
      };
    }

    // Case 2b: Interest-bearing fixed monthly payment
    const monthlyRate =
      interestRateType === 'monthly' ? interestRate / 100 : interestRate / 100 / 12;
    const firstMonthInterest = roundPHP(principal * monthlyRate);

    // Validate if monthly payment covers at least initial monthly interest
    if (M <= firstMonthInterest) {
      return {
        monthlyPayment: M,
        termMonths: input.termMonths || 12,
        totalRepayment: 0,
        totalInterest: 0,
        scheduleStartDate,
        finalDueDate: scheduleStartDate,
        schedule: [],
        isInsufficientPayment: true,
        warning: `Agreed monthly collection of ₱${M.toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })} is less than or equal to the monthly interest (₱${firstMonthInterest.toLocaleString(
          'en-US',
          { minimumFractionDigits: 2 }
        )}). The principal balance will never be repaid.`,
      };
    }

    // Amortized simulation month-by-month
    if (repaymentModel === 'amortized') {
      let curBal = principal;
      let totInterest = 0;
      let totRepay = 0;
      const schedule: ReceivableInstallmentItem[] = [];
      let k = 1;

      while (curBal > 0.005 && k <= 360) {
        const dueDate = addMonthsToDate(scheduleStartDate, k - 1);
        const intr = roundPHP(curBal * monthlyRate);
        totInterest = addPHP(totInterest, intr);

        if (curBal + intr <= M) {
          const finalPay = roundPHP(curBal + intr);
          totRepay = addPHP(totRepay, finalPay);
          schedule.push({
            installmentNumber: k,
            dueDate,
            collectionAmount: finalPay,
            principalPortion: curBal,
            interestPortion: intr,
            remainingBalance: 0,
            isPaid: false,
          });
          curBal = 0;
          break;
        } else {
          const prinPaid = roundPHP(M - intr);
          curBal = roundPHP(curBal - prinPaid);
          totRepay = addPHP(totRepay, M);
          schedule.push({
            installmentNumber: k,
            dueDate,
            collectionAmount: M,
            principalPortion: prinPaid,
            interestPortion: intr,
            remainingBalance: curBal,
            isPaid: false,
          });
        }
        k++;
      }

      const finalDueDate = schedule[schedule.length - 1]?.dueDate || scheduleStartDate;
      return {
        monthlyPayment: M,
        termMonths: schedule.length,
        totalRepayment: totRepay,
        totalInterest: totInterest,
        scheduleStartDate,
        finalDueDate,
        schedule,
      };
    } else {
      // Flat Rate or Principal First with fixed payment
      const monthlyInterest = roundPHP(principal * monthlyRate);
      if (M <= monthlyInterest) {
        return {
          monthlyPayment: M,
          termMonths: input.termMonths || 12,
          totalRepayment: 0,
          totalInterest: 0,
          scheduleStartDate,
          finalDueDate: scheduleStartDate,
          schedule: [],
          isInsufficientPayment: true,
          warning: `Agreed monthly collection of ₱${M.toLocaleString('en-US', {
            minimumFractionDigits: 2,
          })} is less than or equal to monthly interest (₱${monthlyInterest.toLocaleString(
            'en-US',
            { minimumFractionDigits: 2 }
          )}).`,
        };
      }

      let curBal = principal;
      let totInterest = 0;
      let totRepay = 0;
      const schedule: ReceivableInstallmentItem[] = [];
      let k = 1;

      while (curBal > 0.005 && k <= 360) {
        const dueDate = addMonthsToDate(scheduleStartDate, k - 1);
        const intr = monthlyInterest;
        totInterest = addPHP(totInterest, intr);

        if (curBal + intr <= M) {
          const finalPay = roundPHP(curBal + intr);
          totRepay = addPHP(totRepay, finalPay);
          schedule.push({
            installmentNumber: k,
            dueDate,
            collectionAmount: finalPay,
            principalPortion: curBal,
            interestPortion: intr,
            remainingBalance: 0,
            isPaid: false,
          });
          curBal = 0;
          break;
        } else {
          const prinPaid = roundPHP(M - intr);
          curBal = roundPHP(curBal - prinPaid);
          totRepay = addPHP(totRepay, M);
          schedule.push({
            installmentNumber: k,
            dueDate,
            collectionAmount: M,
            principalPortion: prinPaid,
            interestPortion: intr,
            remainingBalance: curBal,
            isPaid: false,
          });
        }
        k++;
      }

      const finalDueDate = schedule[schedule.length - 1]?.dueDate || scheduleStartDate;
      return {
        monthlyPayment: M,
        termMonths: schedule.length,
        totalRepayment: totRepay,
        totalInterest: totInterest,
        scheduleStartDate,
        finalDueDate,
        schedule,
      };
    }
  }

  // 3. Standard Repayment Calculation based on Repayment Term (Months)
  const n = Math.max(1, Math.round(input.termMonths || 12));

  // Case 3a: 0% Zero-Interest
  if (interestRate === 0) {
    const monthlyPayment = roundPHP(principal / n);
    const totalRepayment = principal;
    const totalInterest = 0;

    let curBal = principal;
    const schedule: ReceivableInstallmentItem[] = [];

    for (let k = 1; k <= n; k++) {
      const dueDate = addMonthsToDate(scheduleStartDate, k - 1);
      const isLast = k === n;
      const prin = isLast ? curBal : monthlyPayment;
      curBal = isLast ? 0 : roundPHP(curBal - prin);

      schedule.push({
        installmentNumber: k,
        dueDate,
        collectionAmount: prin,
        principalPortion: prin,
        interestPortion: 0,
        remainingBalance: curBal,
        isPaid: false,
      });
    }

    const finalDueDate = schedule[schedule.length - 1]?.dueDate || scheduleStartDate;
    return {
      monthlyPayment,
      termMonths: n,
      totalRepayment,
      totalInterest,
      scheduleStartDate,
      finalDueDate,
      schedule,
    };
  }

  // Case 3b: Amortized (Reducing balance)
  if (repaymentModel === 'amortized') {
    const monthlyRate =
      interestRateType === 'monthly' ? interestRate / 100 : interestRate / 100 / 12;
    const factor = Math.pow(1 + monthlyRate, n);
    const monthlyPayment = roundPHP((principal * monthlyRate * factor) / (factor - 1));
    const totalRepayment = roundPHP(monthlyPayment * n);
    const totalInterest = Math.max(0, roundPHP(totalRepayment - principal));

    let curBal = principal;
    const schedule: ReceivableInstallmentItem[] = [];

    for (let k = 1; k <= n; k++) {
      const dueDate = addMonthsToDate(scheduleStartDate, k - 1);
      const intr = roundPHP(curBal * monthlyRate);
      const isLast = k === n;
      let prin = 0;
      let coll = 0;

      if (isLast) {
        prin = curBal;
        coll = roundPHP(curBal + intr);
        curBal = 0;
      } else {
        prin = Math.min(curBal, roundPHP(monthlyPayment - intr));
        coll = roundPHP(prin + intr);
        curBal = roundPHP(curBal - prin);
      }

      schedule.push({
        installmentNumber: k,
        dueDate,
        collectionAmount: coll,
        principalPortion: prin,
        interestPortion: intr,
        remainingBalance: curBal,
        isPaid: false,
      });
    }

    const finalDueDate = schedule[schedule.length - 1]?.dueDate || scheduleStartDate;
    return {
      monthlyPayment,
      termMonths: n,
      totalRepayment,
      totalInterest,
      scheduleStartDate,
      finalDueDate,
      schedule,
    };
  }

  // Case 3c: Flat Rate / Add-on / Principal First
  let totalInterest = 0;
  if (interestRateType === 'monthly') {
    totalInterest = roundPHP(principal * (interestRate / 100) * n);
  } else {
    totalInterest = roundPHP(principal * (interestRate / 100) * (n / 12));
  }

  const totalRepayment = roundPHP(principal + totalInterest);
  const monthlyPayment = roundPHP(totalRepayment / n);
  const baseMonthlyPrincipal = roundPHP(principal / n);
  const baseMonthlyInterest = roundPHP(totalInterest / n);

  let curBal = principal;
  let accPrin = 0;
  let accIntr = 0;
  const schedule: ReceivableInstallmentItem[] = [];

  for (let k = 1; k <= n; k++) {
    const dueDate = addMonthsToDate(scheduleStartDate, k - 1);
    const isLast = k === n;
    const prin = isLast ? roundPHP(principal - accPrin) : baseMonthlyPrincipal;
    const intr = isLast ? roundPHP(totalInterest - accIntr) : baseMonthlyInterest;

    accPrin = addPHP(accPrin, prin);
    accIntr = addPHP(accIntr, intr);
    const coll = addPHP(prin, intr);
    curBal = isLast ? 0 : Math.max(0, roundPHP(curBal - prin));

    schedule.push({
      installmentNumber: k,
      dueDate,
      collectionAmount: coll,
      principalPortion: prin,
      interestPortion: intr,
      remainingBalance: curBal,
      isPaid: false,
    });
  }

  const finalDueDate = schedule[schedule.length - 1]?.dueDate || scheduleStartDate;
  return {
    monthlyPayment,
    termMonths: n,
    totalRepayment,
    totalInterest,
    scheduleStartDate,
    finalDueDate,
    schedule,
  };
}

// ==========================================
// Money Owed to Me (Receivables) Repayment Helpers
// ==========================================

export interface ScheduledRepaymentInfo {
  amount: number; // Prefilled amount (scheduled installment or actual due)
  scheduledInstallmentAmount: number; // Stated scheduled collection amount
  isInstallment: boolean;
  installmentNumber?: number;
  totalInstallments?: number;
  dueDate?: string;
  isFinalInstallment?: boolean;
  isPartialPaymentSoFar?: boolean;
  alreadyPaidTowardInstallment?: number;
  remainingAmountOwed: number;
}

/**
 * Accurately determines the scheduled repayment amount and installment context for a lending record.
 * 1. For one-time repayment: returns the remaining balance owed.
 * 2. For installment schedules: finds the current scheduled installment and prefills the actual amount due
 *    for that installment, capped at the remaining balance. If it's a final payment with a different amount,
 *    uses that installment's specific amount.
 * 3. Fallback: if no schedule can be generated, prefills remaining balance while allowing editing.
 */
export function getScheduledRepaymentInfo(receivable: ReceivableRecord): ScheduledRepaymentInfo {
  const remaining = roundPHP(Math.max(0, receivable.remainingBalance || 0));

  if (!receivable || remaining <= 0) {
    return {
      amount: 0,
      scheduledInstallmentAmount: 0,
      isInstallment: false,
      remainingAmountOwed: 0,
    };
  }

  // 1. One-time repayment: use the remaining amount owed
  if (receivable.paymentSchedule === 'one_time') {
    return {
      amount: remaining,
      scheduledInstallmentAmount: remaining,
      isInstallment: false,
      dueDate: receivable.dueDate,
      remainingAmountOwed: remaining,
    };
  }

  // 2. Obtain schedule items (use saved schedule, or dynamically recalculate with existing engine)
  let schedule = receivable.schedule;
  if (!schedule || schedule.length === 0) {
    const calc = calculateReceivableTermsAndSchedule({
      principal: receivable.principal,
      termMonths: receivable.termMonths || 12,
      interestRate: receivable.interestRate ?? 0,
      interestRateType: receivable.interestRateType || 'annual',
      repaymentModel: receivable.repaymentModel || 'amortized',
      isFixedMonthlyPayment: receivable.isFixedMonthlyPayment,
      fixedMonthlyPayment: receivable.fixedMonthlyPayment,
      scheduleStartDate:
        receivable.scheduleStartDate ||
        receivable.lentDate ||
        new Date().toISOString().slice(0, 10),
      paymentSchedule: receivable.paymentSchedule || 'monthly',
    });
    schedule = calc.schedule;
  }

  // 3. Fallback when no schedule items exist
  if (!schedule || schedule.length === 0) {
    let fallbackAmount = remaining;
    if (receivable.fixedMonthlyPayment && receivable.fixedMonthlyPayment > 0) {
      fallbackAmount = Math.min(roundPHP(receivable.fixedMonthlyPayment), remaining);
    } else if (receivable.monthlyCollectionEstimate && receivable.monthlyCollectionEstimate > 0) {
      fallbackAmount = Math.min(roundPHP(receivable.monthlyCollectionEstimate), remaining);
    }
    return {
      amount: fallbackAmount,
      scheduledInstallmentAmount: fallbackAmount,
      isInstallment: fallbackAmount < remaining,
      remainingAmountOwed: remaining,
    };
  }

  // 4. Find the current scheduled installment based on total collected so far
  const totalCollected = receivable.totalCollected || 0;
  let cumDue = 0;

  for (let i = 0; i < schedule.length; i++) {
    const item = schedule[i];
    cumDue = addPHP(cumDue, item.collectionAmount);

    // If totalCollected hasn't fully covered this installment (using small cents tolerance)
    if (totalCollected < cumDue - 0.009) {
      const prevCumDue = roundPHP(cumDue - item.collectionAmount);
      const paidTowardThis = Math.max(0, roundPHP(totalCollected - prevCumDue));
      const remainingDueForInstallment = Math.max(0, roundPHP(item.collectionAmount - paidTowardThis));
      const isFinal = i === schedule.length - 1;
      const isPartial = paidTowardThis > 0.01;

      // Prefill actual amount due for that installment, capped at remaining balance
      const actualAmountDue = Math.min(
        remainingDueForInstallment > 0 ? remainingDueForInstallment : item.collectionAmount,
        remaining
      );

      return {
        amount: roundPHP(actualAmountDue),
        scheduledInstallmentAmount: item.collectionAmount,
        isInstallment: true,
        installmentNumber: item.installmentNumber || i + 1,
        totalInstallments: schedule.length,
        dueDate: item.dueDate,
        isFinalInstallment: isFinal,
        isPartialPaymentSoFar: isPartial,
        alreadyPaidTowardInstallment: paidTowardThis,
        remainingAmountOwed: remaining,
      };
    }
  }

  // 5. If all installments in the schedule are covered but remaining balance > 0
  return {
    amount: remaining,
    scheduledInstallmentAmount: remaining,
    isInstallment: true,
    installmentNumber: schedule.length,
    totalInstallments: schedule.length,
    isFinalInstallment: true,
    isPartialPaymentSoFar: false,
    remainingAmountOwed: remaining,
  };
}

export function getScheduledRepaymentAmount(receivable: ReceivableRecord): number {
  return getScheduledRepaymentInfo(receivable).amount;
}

