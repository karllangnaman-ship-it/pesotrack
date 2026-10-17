import {
  BillDefinition,
  MonthlyBillEntry,
  ReceivableRecord,
  RecurringTransaction,
  TransactionRecord,
} from '../types/finance';
import { ReconciledAccount } from './financeEngine';
import { roundPHP, subPHP } from './currency';

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
    if (acc.currentBalance <= 0) continue;

    // Multiple installments support
    if (
      acc.creditInfo?.enableMultipleInstallments &&
      acc.creditInfo.purchases &&
      acc.creditInfo.purchases.length > 0
    ) {
      for (const p of acc.creditInfo.purchases) {
        if (p.remainingBalance <= 0) continue;
        const dueDay = p.dueDay || acc.creditInfo.dueDay || 15;
        const validDueDay = Math.min(Math.max(1, dueDay), daysInMonth);
        const dueDateStr = `${monthKey}-${String(validDueDay).padStart(2, '0')}`;
        const installmentAmt = p.customMonthlyPayment || p.monthlyPayment || roundPHP(p.remainingBalance / Math.max(1, p.termMonths || 12));

        // Check if any payment was made this month for this purchase
        const monthPaid = p.payments
          ?.filter((pm) => pm.date.startsWith(monthKey))
          .reduce((sum, pm) => sum + pm.amount, 0) || 0;

        const remainingAmt = Math.max(0, subPHP(installmentAmt, monthPaid));
        const status = determineEventStatus(dueDateStr, installmentAmt, monthPaid);

        events.push({
          id: `cal_credit_${acc.id}_p_${p.id}_${monthKey}`,
          eventType: 'credit',
          sourceId: acc.id,
          title: `${acc.name} — ${p.name}`,
          subtitle: `Installment Due • ${acc.name}`,
          category: 'Credit Card',
          dueDate: dueDateStr,
          dueDay: validDueDay,
          monthKey,
          amount: installmentAmt,
          amountPaid: monthPaid,
          remainingAmount: remainingAmt,
          status,
          isCollection: false,
          providerId: acc.providerId,
          customColor: acc.customColor,
          accountData: acc,
        });
      }
    } else {
      const dueDay = acc.creditInfo?.dueDay || 15;
      const validDueDay = Math.min(Math.max(1, dueDay), daysInMonth);
      const dueDateStr = `${monthKey}-${String(validDueDay).padStart(2, '0')}`;

      // Calculate amount due (monthly installment estimate or card balance)
      const dueAmount = acc.creditInfo?.monthlyInstallmentEstimate ||
        acc.creditInfo?.customMonthlyPayment ||
        acc.currentBalance;

      // Check payments made to this credit account in this month
      const monthPaid = transactions
        .filter((tx) => tx.type === 'transfer' && tx.destinationAccountId === acc.id && tx.dateTime.startsWith(monthKey))
        .reduce((sum, tx) => sum + tx.amount, 0);

      const remainingAmt = Math.max(0, subPHP(dueAmount, monthPaid));
      const status = determineEventStatus(dueDateStr, dueAmount, monthPaid);

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
        amount: dueAmount,
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

  // 3. LOAN INSTALLMENTS
  const loanAccounts = reconciledAccounts.filter((a) => !a.archived && a.category === 'Loans');
  for (const acc of loanAccounts) {
    if (acc.currentBalance <= 0) continue;

    if (
      acc.loanInfo?.enableMultipleInstallments &&
      acc.loanInfo.drawdowns &&
      acc.loanInfo.drawdowns.length > 0
    ) {
      for (const d of acc.loanInfo.drawdowns) {
        if (d.remainingBalance <= 0) continue;
        const dueDay = d.dueDay || acc.loanInfo.dueDay || 15;
        const validDueDay = Math.min(Math.max(1, dueDay), daysInMonth);
        const dueDateStr = `${monthKey}-${String(validDueDay).padStart(2, '0')}`;
        const installmentAmt = d.customMonthlyPayment || d.monthlyPayment || roundPHP(d.remainingBalance / Math.max(1, d.termMonths || 12));

        const monthPaid = d.payments
          ?.filter((pm) => pm.date.startsWith(monthKey))
          .reduce((sum, pm) => sum + pm.amount, 0) || 0;

        const remainingAmt = Math.max(0, subPHP(installmentAmt, monthPaid));
        const status = determineEventStatus(dueDateStr, installmentAmt, monthPaid);

        events.push({
          id: `cal_loan_${acc.id}_d_${d.id}_${monthKey}`,
          eventType: 'loan',
          sourceId: acc.id,
          title: `${acc.name} — ${d.name}`,
          subtitle: `Loan Installment Due`,
          category: 'Personal Loan',
          dueDate: dueDateStr,
          dueDay: validDueDay,
          monthKey,
          amount: installmentAmt,
          amountPaid: monthPaid,
          remainingAmount: remainingAmt,
          status,
          isCollection: false,
          providerId: acc.providerId,
          customColor: acc.customColor,
          accountData: acc,
        });
      }
    } else {
      const dueDay = acc.loanInfo?.dueDay || 15;
      const validDueDay = Math.min(Math.max(1, dueDay), daysInMonth);
      const dueDateStr = `${monthKey}-${String(validDueDay).padStart(2, '0')}`;
      const installmentAmt = acc.loanInfo?.monthlyInstallmentEstimate ||
        acc.loanInfo?.customMonthlyPayment ||
        acc.currentBalance;

      const monthPaid = transactions
        .filter((tx) => tx.type === 'transfer' && tx.destinationAccountId === acc.id && tx.dateTime.startsWith(monthKey))
        .reduce((sum, tx) => sum + tx.amount, 0);

      const remainingAmt = Math.max(0, subPHP(installmentAmt, monthPaid));
      const status = determineEventStatus(dueDateStr, installmentAmt, monthPaid);

      events.push({
        id: `cal_loan_${acc.id}_${monthKey}`,
        eventType: 'loan',
        sourceId: acc.id,
        title: acc.name,
        subtitle: `Monthly Installment Due`,
        category: 'Personal Loan',
        dueDate: dueDateStr,
        dueDay: validDueDay,
        monthKey,
        amount: installmentAmt,
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

    const dueDay = parseInt(rec.nextDueDate.slice(8, 10), 10) || 1;
    const validDueDay = Math.min(Math.max(1, dueDay), daysInMonth);
    const dueDateStr = `${monthKey}-${String(validDueDay).padStart(2, '0')}`;

    // Check if recorded this month
    const isRecorded = transactions.some((t) =>
      t.merchantOrTitle === rec.name &&
      t.category === rec.category &&
      t.dateTime.startsWith(monthKey)
    );

    const amountPaid = isRecorded ? rec.amount : 0;
    const remainingAmount = isRecorded ? 0 : rec.amount;
    const status = isRecorded ? 'paid' : determineEventStatus(dueDateStr, rec.amount, 0);

    events.push({
      id: `cal_rec_tx_${rec.id}_${monthKey}`,
      eventType: 'recurring',
      sourceId: rec.id,
      title: rec.name,
      subtitle: `Subscription • ${rec.category}`,
      category: rec.category,
      dueDate: dueDateStr,
      dueDay: validDueDay,
      monthKey,
      amount: rec.amount,
      amountPaid,
      remainingAmount,
      status,
      isCollection: rec.type === 'income',
      notes: rec.notes,
      recurringData: rec,
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
