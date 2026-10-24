import {
  BillDefinition,
  CreditPurchaseOrDrawdown,
  MonthlyBillEntry,
  ReceivableRecord,
  RecurringTransaction,
  TransactionRecord,
} from '../types/finance';
import { ReconciledAccount } from './financeEngine';
import { addPHP, formatPeso, roundPHP, subPHP } from './currency';
import {
  addMonthsToDate,
  calculateRepaymentDetails,
  generatePurchaseInstallmentSchedule,
  generateSingleLoanSchedule,
  generateSingleCreditSchedule,
} from './loanCalculations';

export type CalendarEventType =
  | 'bill'
  | 'credit'
  | 'loan'
  | 'receivable'
  | 'recurring';

export type CalendarEventStatus =
  | 'paid'
  | 'partially_paid'
  | 'unpaid'
  | 'overdue';

export interface CalendarEvent {
  id: string;
  eventType: CalendarEventType;
  sourceId: string;
  title: string;
  subtitle: string;
  category: string;
  dueDate: string; // YYYY-MM-DD
  dueDay: number; // 1-31
  monthKey: string; // YYYY-MM
  amount: number;
  amountPaid: number;
  remainingAmount: number;
  status: CalendarEventStatus;
  isCollection: boolean; // True for money owed to me (receivables)
  providerId?: string;
  customColor?: string;
  notes?: string;
  // Metadata for action modal
  billData?: {
    bill: BillDefinition;
    entry?: MonthlyBillEntry;
  };
  receivableData?: ReceivableRecord;
  accountData?: ReconciledAccount;
  purchaseData?: CreditPurchaseOrDrawdown;
  installmentIndex?: number;
  totalInstallments?: number;
  recurringData?: RecurringTransaction;
}

export interface DayCalendarSummary {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isToday: boolean;
  isCurrentMonth: boolean;
  events: CalendarEvent[];
  totalDue: number;
  totalCollections: number;
  hasOverdue: boolean;
}

export interface MonthCalendarMetrics {
  monthKey: string;
  totalBillsDue: number;
  totalBillsPaid: number;
  remainingBillsToPay: number;
  upcomingCreditAndLoans: number;
  creditAndLoansPaid?: number;
  overdueCount: number;
  overdueAmount: number;
  expectedCollections: number;
  collectedAmount: number;
  remainingCollections: number;
  eventsCount: number;
}

/**
 * Calculates calendar event status based on amounts and due date comparison with today.
 */
export function determineEventStatus(
  dueDateStr: string,
  amount: number,
  amountPaid: number
): CalendarEventStatus {
  if (amountPaid >= amount && amount > 0) {
    return 'paid';
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const isPast = dueDateStr < todayStr;

  if (amountPaid > 0 && amountPaid < amount) {
    return isPast ? 'overdue' : 'partially_paid';
  }

  return isPast ? 'overdue' : 'unpaid';
}

/**
 * Helper to gather all repayments (transfers in or direct adjustment payments) for a liability account.
 */
function getAccountPayments(
  accountId: string,
  transactions: TransactionRecord[],
  monthKey?: string
): TransactionRecord[] {
  return transactions.filter((tx) => {
    if (tx.isStartingBalance) return false;
    if (monthKey && !tx.dateTime.startsWith(monthKey)) return false;

    // 1. Transfer into this liability account
    if (tx.type === 'transfer' && tx.destinationAccountId === accountId) return true;

    // 2. Direct payment or adjustment on this account
    if (
      tx.accountId === accountId &&
      (tx.category === 'Loan Payment' ||
        tx.category === 'Credit Payment' ||
        (tx.type === 'adjustment' && tx.adjustmentSign === 'negative') ||
        tx.type === 'income')
    ) {
      return true;
    }

    return false;
  });
}

/**
 * Builds all unified calendar events for a specific monthKey (YYYY-MM).
 */
export function getCalendarEventsForMonth(
  monthKey: string,
  bills: BillDefinition[] = [],
  monthlyBillEntries: Record<string, MonthlyBillEntry> = {},
  reconciledAccounts: ReconciledAccount[] = [],
  receivables: ReceivableRecord[] = [],
  recurringTransactions: RecurringTransaction[] = [],
  transactions: TransactionRecord[] = []
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const [targetYear, targetMonth] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const currentMonthKey = new Date().toISOString().slice(0, 7);

  // 1. MONTHLY BILLS (Fixed & Variable)
  for (const bill of bills) {
    // Check if bill is active in this month
    if (bill.startMonth > monthKey) continue;
    if (bill.endMonth && bill.endMonth < monthKey) continue;

    // Check frequency: bimonthly, quarterly, annually
    if (bill.frequency === 'quarterly') {
      const [sy, sm] = bill.startMonth.split('-').map(Number);
      const diffMonths = (targetYear - sy) * 12 + (targetMonth - sm);
      if (diffMonths % 3 !== 0) continue;
    } else if (bill.frequency === 'bimonthly') {
      const [sy, sm] = bill.startMonth.split('-').map(Number);
      const diffMonths = (targetYear - sy) * 12 + (targetMonth - sm);
      if (diffMonths % 2 !== 0) continue;
    } else if (bill.frequency === 'annually') {
      const [, sm] = bill.startMonth.split('-').map(Number);
      if (targetMonth !== sm) continue;
    }

    const entryKey = `${bill.id}_${monthKey}`;
    const entry: MonthlyBillEntry | undefined = monthlyBillEntries[entryKey];

    const dueDay = entry?.dueDay ?? bill.dueDay;
    const validDueDay = Math.min(Math.max(1, dueDay), daysInMonth);
    const dueDateStr = `${monthKey}-${String(validDueDay).padStart(2, '0')}`;

    const billedAmount = entry?.actualAmount ?? bill.defaultAmount;
    const amountPaid = entry?.isPaidManually
      ? billedAmount
      : (entry?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0);

    const remainingAmount = Math.max(0, subPHP(billedAmount, amountPaid));
    const status = determineEventStatus(dueDateStr, billedAmount, amountPaid);

    const displayName = bill.category === 'Other' && bill.customCategoryName
      ? bill.customCategoryName
      : bill.name;

    events.push({
      id: `cal_bill_${bill.id}_${monthKey}`,
      eventType: 'bill',
      sourceId: bill.id,
      title: displayName,
      subtitle: `${bill.category} • ${bill.type === 'variable' ? 'Variable' : 'Fixed'}`,
      category: bill.category,
      dueDate: dueDateStr,
      dueDay: validDueDay,
      monthKey,
      amount: billedAmount,
      amountPaid,
      remainingAmount,
      status,
      isCollection: false,
      notes: entry?.notes || bill.notes,
      billData: { bill, entry },
    });
  }

  // 2. CREDIT CARDS & CREDIT ACCOUNTS
  const creditAccounts = reconciledAccounts.filter((a) => !a.archived && a.category === 'Credit');
  for (const acc of creditAccounts) {
    // Case 2A: Multiple Installments / Purchases on this credit card
    if (
      acc.creditInfo?.enableMultipleInstallments &&
      acc.creditInfo.purchases &&
      acc.creditInfo.purchases.length > 0
    ) {
      for (const p of acc.creditInfo.purchases) {
        const schedule = generatePurchaseInstallmentSchedule(p);
        const matchingItem = schedule.find((it) => it.monthKey === monthKey);
        const isCurrentMonth = monthKey === currentMonthKey;
        const lastItem = schedule[schedule.length - 1];
        const isPastSchedule = lastItem && monthKey > lastItem.monthKey;

        if (matchingItem) {
          events.push({
            id: `cal_credit_${acc.id}_p_${p.id}_${monthKey}`,
            eventType: 'credit',
            sourceId: acc.id,
            title: `${acc.name} — ${p.name}`,
            subtitle: `Installment ${matchingItem.installmentIndex} of ${matchingItem.totalInstallments} • ${acc.name}`,
            category: 'Credit Card',
            dueDate: matchingItem.dueDate,
            dueDay: matchingItem.dueDay,
            monthKey,
            amount: matchingItem.amountDue,
            amountPaid: matchingItem.amountPaid,
            remainingAmount: matchingItem.remainingAmount,
            status: matchingItem.status,
            isCollection: false,
            providerId: acc.providerId,
            customColor: acc.customColor,
            accountData: acc,
            purchaseData: p,
            installmentIndex: matchingItem.installmentIndex,
            totalInstallments: matchingItem.totalInstallments,
          });
        } else if (isPastSchedule && isCurrentMonth && p.remainingBalance > 0) {
          const overdueAmt = Math.min(p.monthlyPayment || p.remainingBalance, p.remainingBalance);
          events.push({
            id: `cal_credit_${acc.id}_p_${p.id}_overdue_${monthKey}`,
            eventType: 'credit',
            sourceId: acc.id,
            title: `${acc.name} — ${p.name} (Overdue Balance)`,
            subtitle: `Past schedule • Remaining balance due: ${formatPeso(p.remainingBalance)}`,
            category: 'Credit Card',
            dueDate: `${monthKey}-01`,
            dueDay: 1,
            monthKey,
            amount: overdueAmt,
            amountPaid: 0,
            remainingAmount: overdueAmt,
            status: 'overdue',
            isCollection: false,
            providerId: acc.providerId,
            customColor: acc.customColor,
            accountData: acc,
            purchaseData: p,
            installmentIndex: p.termMonths || 1,
            totalInstallments: p.termMonths || 1,
          });
        }
      }
    } else if (
      acc.creditInfo?.hasInstallmentPlan ||
      (acc.creditInfo?.termMonths && acc.creditInfo.termMonths > 0)
    ) {
      // Case 2B: Single credit card with installment plan
      const schedule = generateSingleCreditSchedule(acc, transactions);
      const matchingItem = schedule.find((it) => it.monthKey === monthKey);
      const isCurrentMonth = monthKey === currentMonthKey;
      const lastItem = schedule[schedule.length - 1];
      const isPastSchedule = lastItem && monthKey > lastItem.monthKey;

      if (matchingItem) {
        events.push({
          id: `cal_credit_${acc.id}_${monthKey}`,
          eventType: 'credit',
          sourceId: acc.id,
          title: acc.name,
          subtitle: `Installment ${matchingItem.installmentIndex} of ${matchingItem.totalInstallments} • ${acc.name}`,
          category: 'Credit Card',
          dueDate: matchingItem.dueDate,
          dueDay: matchingItem.dueDay,
          monthKey,
          amount: matchingItem.amountDue,
          amountPaid: matchingItem.amountPaid,
          remainingAmount: matchingItem.remainingAmount,
          status: matchingItem.status,
          isCollection: false,
          providerId: acc.providerId,
          customColor: acc.customColor,
          accountData: acc,
          installmentIndex: matchingItem.installmentIndex,
          totalInstallments: matchingItem.totalInstallments,
        });
      } else if (isPastSchedule && isCurrentMonth && acc.currentBalance > 0) {
        const terms = acc.creditInfo?.termMonths || 12;
        const totalRepay = acc.creditInfo?.totalRepayment ?? acc.totalRepayment ?? acc.currentBalance;
        const baseMonthly = acc.creditInfo?.customMonthlyPayment || roundPHP(totalRepay / terms);
        const overdueAmt = Math.min(baseMonthly, acc.currentBalance);
        events.push({
          id: `cal_credit_${acc.id}_overdue_${monthKey}`,
          eventType: 'credit',
          sourceId: acc.id,
          title: `${acc.name} (Overdue Balance)`,
          subtitle: `Past schedule • Remaining balance due: ${formatPeso(acc.currentBalance)}`,
          category: 'Credit Card',
          dueDate: `${monthKey}-01`,
          dueDay: 1,
          monthKey,
          amount: overdueAmt,
          amountPaid: 0,
          remainingAmount: overdueAmt,
          status: 'overdue',
          isCollection: false,
          providerId: acc.providerId,
          customColor: acc.customColor,
          accountData: acc,
          installmentIndex: terms,
          totalInstallments: terms,
        });
      }
    } else {
      // Case 2C: Standard revolving credit card statement cycle
      const dueDay = acc.creditInfo?.dueDay || 15;
      const validDueDay = Math.min(Math.max(1, dueDay), daysInMonth);
      const dueDateStr = `${monthKey}-${String(validDueDay).padStart(2, '0')}`;

      // Check payments made to this account for this month
      const monthPayments = getAccountPayments(acc.id, transactions, monthKey);
      const monthPaid = monthPayments.reduce((sum, tx) => sum + tx.amount, 0);

      const dueAmount =
        acc.creditInfo?.customMonthlyPayment ||
        acc.creditInfo?.monthlyInstallmentEstimate ||
        (acc.currentBalance > 0 ? acc.currentBalance : 0);

      // Only display if there was a balance or a payment was made
      if (acc.currentBalance > 0 || monthPaid > 0) {
        const effectiveDue = dueAmount > 0 ? dueAmount : monthPaid;
        let status: CalendarEventStatus = 'unpaid';
        let remainingAmt = Math.max(0, subPHP(effectiveDue, monthPaid));

        if (acc.currentBalance <= 0 && monthPaid > 0) {
          status = 'paid';
          remainingAmt = 0;
        } else if (monthPaid >= effectiveDue && effectiveDue > 0) {
          status = 'paid';
          remainingAmt = 0;
        } else if (monthPaid > 0) {
          status = determineEventStatus(dueDateStr, effectiveDue, monthPaid);
        } else {
          status = determineEventStatus(dueDateStr, effectiveDue, 0);
        }

        events.push({
          id: `cal_credit_${acc.id}_${monthKey}`,
          eventType: 'credit',
          sourceId: acc.id,
          title: acc.name,
          subtitle: `Credit Bill Due (Statement day: ${acc.creditInfo?.statementDay || dueDay})`,
          category: 'Credit Card',
          dueDate: dueDateStr,
          dueDay: validDueDay,
          monthKey,
          amount: effectiveDue,
          amountPaid: monthPaid,
          remainingAmount: remainingAmt,
          status,
          isCollection: false,
          providerId: acc.providerId,
          customColor: acc.customColor,
          accountData: acc,
        });
      }
    }
  }

  // 3. LOAN INSTALLMENTS
  const loanAccounts = reconciledAccounts.filter((a) => !a.archived && a.category === 'Loans');
  for (const acc of loanAccounts) {
    // Case 3A: Multiple Drawdowns / Borrowings on this loan facility
    if (
      acc.loanInfo?.enableMultipleInstallments &&
      acc.loanInfo.drawdowns &&
      acc.loanInfo.drawdowns.length > 0
    ) {
      for (const d of acc.loanInfo.drawdowns) {
        const terms = Math.max(1, d.termMonths || 1);
        const totalRepay = d.totalRepayment > 0 ? d.totalRepayment : d.principal;
        const baseMonthly = d.monthlyPayment > 0 ? d.monthlyPayment : roundPHP(totalRepay / terms);
        const startBase =
          d.firstPaymentDate || d.startDate || d.createdAt?.slice(0, 10) || `${monthKey}-01`;
        const dueDay =
          d.dueDay >= 1 && d.dueDay <= 31 ? d.dueDay : (acc.loanInfo?.dueDay || 15);

        let matchingInstallmentIndex: number | null = null;
        for (let i = 0; i < terms; i++) {
          const rawDate = addMonthsToDate(startBase, i);
          if (rawDate.slice(0, 7) === monthKey) {
            matchingInstallmentIndex = i;
            break;
          }
        }

        const isCurrentMonth = monthKey === currentMonthKey;
        const lastInstallmentDate = addMonthsToDate(startBase, terms - 1);
        const isPastSchedule = monthKey > lastInstallmentDate.slice(0, 7);

        if (matchingInstallmentIndex === null && !(isPastSchedule && isCurrentMonth && d.remainingBalance > 0)) {
          continue;
        }

        const i = matchingInstallmentIndex !== null ? matchingInstallmentIndex : terms - 1;
        const isLast = i === terms - 1;
        const installmentAmt =
          isPastSchedule && d.remainingBalance > 0
            ? Math.min(baseMonthly, d.remainingBalance)
            : isLast
            ? roundPHP(totalRepay - baseMonthly * (terms - 1))
            : baseMonthly;

        const cumulativeDue = isLast ? totalRepay : roundPHP(baseMonthly * (i + 1));
        const prevCumulativeDue = roundPHP(cumulativeDue - installmentAmt);

        const clampedDay = Math.min(daysInMonth, dueDay);
        const dueDateStr = `${monthKey}-${String(clampedDay).padStart(2, '0')}`;

        // Shared settlement calculation matching Loans tab
        let status: CalendarEventStatus = 'unpaid';
        let amountPaid = 0;
        let remainingAmt = installmentAmt;

        if (d.remainingBalance <= 0 || d.status === 'completed') {
          status = 'paid';
          amountPaid = installmentAmt;
          remainingAmt = 0;
        } else if (d.totalPaid >= cumulativeDue - 0.009) {
          status = 'paid';
          amountPaid = installmentAmt;
          remainingAmt = 0;
        } else if (d.totalPaid > prevCumulativeDue) {
          amountPaid = roundPHP(d.totalPaid - prevCumulativeDue);
          remainingAmt = Math.max(0, roundPHP(installmentAmt - amountPaid));
          status = determineEventStatus(dueDateStr, installmentAmt, amountPaid);
        } else {
          amountPaid = 0;
          remainingAmt = installmentAmt;
          status = determineEventStatus(dueDateStr, installmentAmt, 0);
        }

        events.push({
          id: `cal_loan_${acc.id}_d_${d.id}_${monthKey}`,
          eventType: 'loan',
          sourceId: acc.id,
          title: `${acc.name} — ${d.name}`,
          subtitle: `Installment ${i + 1} of ${terms} • ${acc.name}`,
          category: 'Personal Loan',
          dueDate: dueDateStr,
          dueDay: clampedDay,
          monthKey,
          amount: installmentAmt,
          amountPaid,
          remainingAmount: remainingAmt,
          status,
          isCollection: false,
          providerId: acc.providerId,
          customColor: acc.customColor,
          accountData: acc,
          purchaseData: d,
          installmentIndex: i + 1,
          totalInstallments: terms,
        });
      }
    } else {
      // Case 3B: Single loan account
      const terms = Math.max(1, acc.loanInfo?.termMonths || 12);
      const principal =
        acc.loanInfo?.originalPrincipal ||
        acc.startingBalance ||
        acc.currentBalance;
      const totalRepay = acc.loanInfo?.totalRepayment ?? acc.totalRepayment ?? principal;
      const baseMonthly =
        acc.loanInfo?.customMonthlyPayment ||
        acc.loanInfo?.monthlyInstallmentEstimate ||
        roundPHP(totalRepay / terms);
      const startBase =
        acc.loanInfo?.startDate || acc.createdAt?.slice(0, 10) || `${monthKey}-01`;
      const dueDay = acc.loanInfo?.dueDay || 15;

      let matchingInstallmentIndex: number | null = null;
      for (let i = 0; i < terms; i++) {
        const rawDate = addMonthsToDate(startBase, i);
        if (rawDate.slice(0, 7) === monthKey) {
          matchingInstallmentIndex = i;
          break;
        }
      }

      const isCurrentMonth = monthKey === currentMonthKey;
      const lastInstallmentDate = addMonthsToDate(startBase, terms - 1);
      const isPastSchedule = monthKey > lastInstallmentDate.slice(0, 7);

      if (matchingInstallmentIndex === null && !(isPastSchedule && isCurrentMonth && acc.currentBalance > 0)) {
        continue;
      }

      const i = matchingInstallmentIndex !== null ? matchingInstallmentIndex : terms - 1;
      const isLast = i === terms - 1;
      const installmentAmt =
        isPastSchedule && acc.currentBalance > 0
          ? Math.min(baseMonthly, acc.currentBalance)
          : isLast
          ? roundPHP(totalRepay - baseMonthly * (terms - 1))
          : baseMonthly;

      const cumulativeDue = isLast ? totalRepay : roundPHP(baseMonthly * (i + 1));
      const prevCumulativeDue = roundPHP(cumulativeDue - installmentAmt);

      const clampedDay = Math.min(daysInMonth, dueDay);
      const dueDateStr = `${monthKey}-${String(clampedDay).padStart(2, '0')}`;

      // Calculate total payments made on this loan
      const allTxPayments = getAccountPayments(acc.id, transactions);
      const totalTxPaid = allTxPayments.reduce((sum, tx) => sum + tx.amount, 0);
      const totalPaid = Math.max(totalTxPaid, Math.max(0, subPHP(totalRepay, acc.currentBalance)));

      const repayment = calculateRepaymentDetails(
        {
          principal,
          totalRepayment: totalRepay,
          termMonths: terms,
          interestRate: acc.loanInfo?.interestRate ?? acc.loanInfo?.interestRateAnnual ?? 0,
          interestRateType: acc.loanInfo?.interestRateType || 'annual',
          repaymentModel: acc.loanInfo?.repaymentModel || 'flat_rate',
          customMonthlyPayment: acc.loanInfo?.isManualPayment
            ? acc.loanInfo.customMonthlyPayment
            : undefined,
          startDate: acc.loanInfo?.startDate,
          dueDay: acc.loanInfo?.dueDay,
        },
        acc.currentBalance,
        transactions,
        acc.id
      );

      let status: CalendarEventStatus = 'unpaid';
      let amountPaid = 0;
      let remainingAmt = installmentAmt;

      if (acc.currentBalance <= 0) {
        status = 'paid';
        amountPaid = installmentAmt;
        remainingAmt = 0;
      } else if (i + 1 <= repayment.paymentsMade || totalPaid >= cumulativeDue - 0.009) {
        status = 'paid';
        amountPaid = installmentAmt;
        remainingAmt = 0;
      } else if (totalPaid > prevCumulativeDue) {
        amountPaid = roundPHP(totalPaid - prevCumulativeDue);
        remainingAmt = Math.max(0, roundPHP(installmentAmt - amountPaid));
        status = determineEventStatus(dueDateStr, installmentAmt, amountPaid);
      } else {
        amountPaid = 0;
        remainingAmt = installmentAmt;
        status = determineEventStatus(dueDateStr, installmentAmt, 0);
      }

      events.push({
        id: `cal_loan_${acc.id}_${monthKey}`,
        eventType: 'loan',
        sourceId: acc.id,
        title: acc.name,
        subtitle: `Installment ${i + 1} of ${terms} • ${acc.name}`,
        category: 'Personal Loan',
        dueDate: dueDateStr,
        dueDay: clampedDay,
        monthKey,
        amount: installmentAmt,
        amountPaid,
        remainingAmount: remainingAmt,
        status,
        isCollection: false,
        providerId: acc.providerId,
        customColor: acc.customColor,
        accountData: acc,
        installmentIndex: i + 1,
        totalInstallments: terms,
      });
    }
  }

  // 4. RECEIVABLES (Money Owed to Me / Expected Collections)
  for (const r of receivables) {
    if (r.schedule && r.schedule.length > 0) {
      const scheduledInMonth = r.schedule.filter((it) => it.dueDate.startsWith(monthKey));
      for (const item of scheduledInMonth) {
        const rawDay = parseInt(item.dueDate.slice(8, 10), 10) || 1;
        const validDueDay = Math.min(Math.max(1, rawDay), daysInMonth);
        const dueDateStr = item.dueDate;

        // Check payments recorded in this month
        const monthCollected =
          r.payments
            ?.filter((p) => p.date.startsWith(monthKey))
            .reduce((sum, p) => sum + p.amount, 0) || 0;

        const status = determineEventStatus(
          dueDateStr,
          item.collectionAmount,
          item.isPaid ? item.collectionAmount : monthCollected
        );

        events.push({
          id: `cal_rec_${r.id}_inst_${item.installmentNumber}_${monthKey}`,
          eventType: 'receivable',
          sourceId: r.id,
          title: `${r.personName} (#${item.installmentNumber})`,
          subtitle: `Scheduled Collection (${item.installmentNumber} of ${r.schedule.length}) • Money Owed to You`,
          category: 'Receivable',
          dueDate: dueDateStr,
          dueDay: validDueDay,
          monthKey,
          amount: item.collectionAmount,
          amountPaid: item.isPaid ? item.collectionAmount : monthCollected,
          remainingAmount: item.isPaid ? 0 : item.collectionAmount,
          status,
          isCollection: true,
          notes: r.notes,
          receivableData: r,
        });
      }
    } else {
      if (!r.dueDate || !r.dueDate.startsWith(monthKey)) continue;

      const dueDay = parseInt(r.dueDate.slice(8, 10), 10) || 1;
      const validDueDay = Math.min(Math.max(1, dueDay), daysInMonth);
      const dueDateStr = `${monthKey}-${String(validDueDay).padStart(2, '0')}`;

      // Look at payments recorded for this receivable in this month
      const monthCollected =
        r.payments
          ?.filter((p) => p.date.startsWith(monthKey))
          .reduce((sum, p) => sum + p.amount, 0) || 0;

      const totalCollected = r.totalCollected;
      const remainingAmt = r.remainingBalance;
      const status = determineEventStatus(dueDateStr, r.totalExpected, totalCollected);

      events.push({
        id: `cal_rec_${r.id}_${monthKey}`,
        eventType: 'receivable',
        sourceId: r.id,
        title: r.personName,
        subtitle: `Expected Collection • Money Owed to You`,
        category: 'Receivable',
        dueDate: dueDateStr,
        dueDay: validDueDay,
        monthKey,
        amount: r.totalExpected,
        amountPaid: monthCollected,
        remainingAmount: remainingAmt,
        status,
        isCollection: true,
        notes: r.notes,
        receivableData: r,
      });
    }
  }

  // 5. RECURRING SUBSCRIPTIONS / TRANSACTIONS
  for (const rec of recurringTransactions) {
    if (!rec.isActive) continue;
    if (rec.startDate > `${monthKey}-31`) continue;
    if (rec.endDate && rec.endDate < `${monthKey}-01`) continue;

    // Calculate all occurrence days for this month
    const [targetY, targetM] = monthKey.split('-').map(Number);
    const monthStart = new Date(Date.UTC(targetY, targetM - 1, 1));
    const monthEnd = new Date(Date.UTC(targetY, targetM - 1, daysInMonth));
    const startDate = new Date((rec.startDate || `${monthKey}-01`) + 'T00:00:00Z');
    const endDate = rec.endDate ? new Date(rec.endDate + 'T23:59:59Z') : null;

    const dueDaysForMonth: number[] = [];

    if (rec.frequency === 'weekly' || rec.frequency === 'biweekly') {
      const stepDays = rec.frequency === 'weekly' ? 7 : 14;
      let curr = new Date(startDate.getTime());
      if (curr < monthStart) {
        const diffMs = monthStart.getTime() - curr.getTime();
        const diffDays = Math.floor(diffMs / 86400000);
        const steps = Math.floor(diffDays / stepDays);
        curr = new Date(curr.getTime() + steps * stepDays * 86400000);
      }
      while (curr <= monthEnd) {
        if (curr >= monthStart && (!endDate || curr <= endDate)) {
          dueDaysForMonth.push(curr.getUTCDate());
        }
        curr = new Date(curr.getTime() + stepDays * 86400000);
      }
    } else if (rec.frequency === 'semimonthly') {
      // 15th and end of month (e.g. 15th and 30th/31st)
      [15, daysInMonth].forEach((day) => {
        const occDate = new Date(Date.UTC(targetY, targetM - 1, day));
        if (occDate >= startDate && (!endDate || occDate <= endDate)) {
          dueDaysForMonth.push(day);
        }
      });
    } else if (rec.frequency === 'monthly') {
      const rawDay = parseInt(rec.nextDueDate?.slice(8, 10) || rec.startDate?.slice(8, 10) || '1', 10);
      const validDay = Math.min(Math.max(1, rawDay), daysInMonth);
      const occDate = new Date(Date.UTC(targetY, targetM - 1, validDay));
      if (occDate >= startDate && (!endDate || occDate <= endDate)) {
        dueDaysForMonth.push(validDay);
      }
    } else {
      const rawDay = parseInt(rec.nextDueDate?.slice(8, 10) || '1', 10);
      dueDaysForMonth.push(Math.min(Math.max(1, rawDay), daysInMonth));
    }

    // Deduplicate and sort
    const uniqueDays = Array.from(new Set(dueDaysForMonth)).sort((a, b) => a - b);

    // Matching transactions for this recurring rule in the month
    const matchingTxs = transactions.filter((t) => {
      if (!t.dateTime.startsWith(monthKey)) return false;
      const titleMatch =
        t.merchantOrTitle?.toLowerCase().trim() === rec.name.toLowerCase().trim() ||
        (t.notes && t.notes.toLowerCase().includes(rec.name.toLowerCase()));
      const categoryMatch =
        t.category?.toLowerCase().trim() === rec.category.toLowerCase().trim();
      return titleMatch || (categoryMatch && Math.abs(t.amount - rec.amount) < 0.01);
    });

    const isIncome = rec.type === 'income';
    const subtitle = isIncome
      ? `Recurring Income • ${rec.category}`
      : `Recurring Bill • ${rec.category}`;

    uniqueDays.forEach((validDueDay, idx) => {
      const dueDateStr = `${monthKey}-${String(validDueDay).padStart(2, '0')}`;
      
      // Check if a transaction exists around this due date
      const txForThisOccurrence = matchingTxs.find((t) => {
        const tDate = t.dateTime.slice(0, 10);
        const dayDiff = Math.abs(
          (new Date(tDate).getTime() - new Date(dueDateStr).getTime()) / 86400000
        );
        return dayDiff <= 3;
      });

      const amountPaid = txForThisOccurrence ? txForThisOccurrence.amount : 0;
      const isRecorded = amountPaid >= rec.amount - 0.01 && rec.amount > 0;
      const remainingAmount = Math.max(0, rec.amount - amountPaid);
      const status = isRecorded
        ? 'paid'
        : determineEventStatus(dueDateStr, rec.amount, amountPaid);

      events.push({
        id: `cal_rec_tx_${rec.id}_${monthKey}_${validDueDay}`,
        eventType: 'recurring',
        sourceId: rec.id,
        title: rec.name,
        subtitle,
        category: rec.category,
        dueDate: dueDateStr,
        dueDay: validDueDay,
        monthKey,
        amount: rec.amount,
        amountPaid,
        remainingAmount,
        status,
        isCollection: isIncome,
        notes: rec.notes,
        recurringData: rec,
      });
    });
  }

  // Sort events chronologically by dueDay
  return events.sort((a, b) => a.dueDay - b.dueDay);
}

/**
 * Calculates monthly high-level metrics for dashboard cards and summary headers.
 */
export function calculateMonthCalendarMetrics(
  events: CalendarEvent[],
  monthKey: string
): MonthCalendarMetrics {
  let totalBillsDue = 0;
  let totalBillsPaid = 0;
  let remainingBillsToPay = 0;
  let upcomingCreditAndLoans = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  let expectedCollections = 0;
  let collectedAmount = 0;
  let remainingCollections = 0;

  for (const e of events) {
    if (e.isCollection) {
      expectedCollections += e.amount;
      collectedAmount += e.amountPaid;
      remainingCollections += e.remainingAmount;
    } else {
      if (e.eventType === 'bill' || e.eventType === 'recurring') {
        totalBillsDue += e.amount;
        totalBillsPaid += e.amountPaid;
        remainingBillsToPay += e.remainingAmount;
      } else if (e.eventType === 'credit' || e.eventType === 'loan') {
        upcomingCreditAndLoans += e.remainingAmount;
      }

      if (e.status === 'overdue') {
        overdueCount++;
        overdueAmount += e.remainingAmount;
      }
    }
  }

  return {
    monthKey,
    totalBillsDue: roundPHP(totalBillsDue),
    totalBillsPaid: roundPHP(totalBillsPaid),
    remainingBillsToPay: roundPHP(remainingBillsToPay),
    upcomingCreditAndLoans: roundPHP(upcomingCreditAndLoans),
    overdueCount,
    overdueAmount: roundPHP(overdueAmount),
    expectedCollections: roundPHP(expectedCollections),
    collectedAmount: roundPHP(collectedAmount),
    remainingCollections: roundPHP(remainingCollections),
    eventsCount: events.length,
  };
}
