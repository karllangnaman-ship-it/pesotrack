import {
  AccountCategory,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  FinancialAccount,
  MonthlyBudget,
  PesoTrackState,
  ReceivableRecord,
  ReceivableStatus,
  RecurringTransaction,
  TransactionRecord,
} from '../types/finance';
import { addPHP, fromCentavos, getMonthKey, roundPHP, subPHP, toCentavos } from './currency';

export function isLiabilityCategory(category: AccountCategory): boolean {
  return category === 'Credit' || category === 'Loans';
}

export function calculateAccountBalance(
  account: FinancialAccount,
  transactions: TransactionRecord[]
): number {
  // If account has multiple installments/drawdowns enabled with records, sum their remaining balances
  if (
    account.category === 'Credit' &&
    account.creditInfo?.enableMultipleInstallments &&
    account.creditInfo.purchases &&
    account.creditInfo.purchases.length > 0
  ) {
    const totalRemaining = account.creditInfo.purchases.reduce(
      (sum, p) => sum + (p.remainingBalance || 0),
      0
    );
    return roundPHP(totalRemaining);
  }

  if (
    account.category === 'Loans' &&
    account.loanInfo?.enableMultipleInstallments &&
    account.loanInfo.drawdowns &&
    account.loanInfo.drawdowns.length > 0
  ) {
    const totalRemaining = account.loanInfo.drawdowns.reduce(
      (sum, d) => sum + (d.remainingBalance || 0),
      0
    );
    return roundPHP(totalRemaining);
  }

  const isLiability = isLiabilityCategory(account.category);
  const hasStartingTx = transactions.some(
    (t) => t.accountId === account.id && t.isStartingBalance
  );

  let centavos = hasStartingTx ? 0 : toCentavos(account.startingBalance || 0);

  for (const tx of transactions) {
    const amountCentavos = toCentavos(tx.amount);

    if (!isLiability) {
      if (tx.accountId === account.id) {
        if (tx.type === 'income') {
          centavos += amountCentavos;
        } else if (tx.type === 'expense') {
          centavos -= amountCentavos;
        } else if (tx.type === 'adjustment') {
          if (tx.adjustmentSign === 'negative') {
            centavos -= amountCentavos;
          } else {
            centavos += amountCentavos;
          }
        } else if (tx.type === 'transfer') {
          centavos -= amountCentavos;
        }
      }

      if (tx.type === 'transfer' && tx.destinationAccountId === account.id) {
        centavos += amountCentavos;
      }
    } else {
      if (tx.accountId === account.id) {
        if (tx.type === 'expense') {
          centavos += amountCentavos;
        } else if (tx.type === 'income') {
          centavos -= amountCentavos;
        } else if (tx.type === 'adjustment') {
          if (tx.adjustmentSign === 'negative') {
            centavos -= amountCentavos;
          } else {
            centavos += amountCentavos;
          }
        } else if (tx.type === 'transfer') {
          centavos += amountCentavos;
        }
      }

      if (tx.type === 'transfer' && tx.destinationAccountId === account.id) {
        const interestCentavos = toCentavos(tx.interestPortion || 0);
        const principalReduction = Math.max(0, amountCentavos - interestCentavos);
        centavos -= principalReduction;
      }
    }
  }

  return fromCentavos(centavos);
}

export interface ReconciledAccount extends FinancialAccount {
  currentBalance: number;
  isLiability: boolean;
  availableCredit?: number;
  creditUtilizationPercent?: number;
  creditInstallmentProgressPercent?: number;
  savingsProgressPercent?: number;
  loanProgressPercent?: number;
}

export function reconcileAllAccounts(
  accounts: FinancialAccount[],
  transactions: TransactionRecord[]
): ReconciledAccount[] {
  return accounts.map((acc) => {
    const currentBalance = calculateAccountBalance(acc, transactions);
    const isLiability = isLiabilityCategory(acc.category);

    let availableCredit: number | undefined;
    let creditUtilizationPercent: number | undefined;
    let creditInstallmentProgressPercent: number | undefined;
    if (acc.category === 'Credit' && acc.creditInfo) {
      const limit = acc.creditInfo.creditLimit || 0;

      if (
        acc.creditInfo.enableMultipleInstallments &&
        acc.creditInfo.purchases &&
        acc.creditInfo.purchases.length > 0
      ) {
        const totalUsed = acc.creditInfo.purchases.reduce(
          (sum, p) => sum + (p.remainingBalance > 0 ? p.remainingBalance : 0),
          0
        );
        availableCredit = Math.max(0, subPHP(limit, totalUsed));
        creditUtilizationPercent =
          limit > 0 ? Math.min(100, Math.max(0, (totalUsed / limit) * 100)) : 0;

        const totalRepay = acc.creditInfo.purchases.reduce(
          (s, p) => s + p.totalRepayment,
          0
        );
        const totalPaid = acc.creditInfo.purchases.reduce(
          (s, p) => s + p.totalPaid,
          0
        );
        creditInstallmentProgressPercent =
          totalRepay > 0
            ? Math.min(100, Math.max(0, (totalPaid / totalRepay) * 100))
            : 0;
      } else {
        availableCredit = Math.max(0, subPHP(limit, currentBalance));
        creditUtilizationPercent =
          limit > 0 ? Math.min(100, Math.max(0, (currentBalance / limit) * 100)) : 0;

        if (
          acc.creditInfo.hasInstallmentPlan &&
          (acc.creditInfo.installmentPrincipal || 0) > 0
        ) {
          const debtBaseline =
            acc.creditInfo.totalRepayment ||
            acc.totalRepayment ||
            acc.startingBalance ||
            acc.creditInfo.installmentPrincipal ||
            0;
          const paid = Math.max(0, subPHP(debtBaseline, currentBalance));
          creditInstallmentProgressPercent = Math.min(
            100,
            Math.max(0, (paid / debtBaseline) * 100)
          );
        }
      }
    }

    let savingsProgressPercent: number | undefined;
    if (acc.category === 'Savings' && acc.savingsGoal && acc.savingsGoal.targetAmount > 0) {
      savingsProgressPercent = Math.min(
        100,
        Math.max(0, (currentBalance / acc.savingsGoal.targetAmount) * 100)
      );
    }

    let loanProgressPercent: number | undefined;
    if (acc.category === 'Loans' && acc.loanInfo) {
      const loanLimit = acc.loanInfo.creditLimit || acc.loanInfo.originalPrincipal || 0;
      if (loanLimit > 0) {
        availableCredit = Math.max(
          0,
          subPHP(loanLimit, currentBalance)
        );
        creditUtilizationPercent = Math.min(
          100,
          Math.max(0, (currentBalance / loanLimit) * 100)
        );
      }

      if (
        acc.loanInfo.enableMultipleInstallments &&
        acc.loanInfo.drawdowns &&
        acc.loanInfo.drawdowns.length > 0
      ) {
        const totalRepay = acc.loanInfo.drawdowns.reduce(
          (s, d) => s + d.totalRepayment,
          0
        );
        const totalPaid = acc.loanInfo.drawdowns.reduce(
          (s, d) => s + d.totalPaid,
          0
        );
        loanProgressPercent =
          totalRepay > 0
            ? Math.min(100, Math.max(0, (totalPaid / totalRepay) * 100))
            : 0;
      } else if (acc.loanInfo.originalPrincipal > 0) {
        const debtBaseline =
          acc.loanInfo.totalRepayment ||
          acc.totalRepayment ||
          acc.startingBalance ||
          acc.loanInfo.originalPrincipal;
        const paid = Math.max(0, subPHP(debtBaseline, currentBalance));
        loanProgressPercent = Math.min(
          100,
          Math.max(0, (paid / debtBaseline) * 100)
        );
      }
    }

    return {
      ...acc,
      currentBalance,
      isLiability,
      availableCredit,
      creditUtilizationPercent,
      creditInstallmentProgressPercent,
      savingsProgressPercent,
      loanProgressPercent,
    };
  });
}

export interface NetWorthSummary {
  totalAssets: number; // Total Wallet Balances + Total Savings Balances ONLY
  totalDebt: number; // Outstanding Credit Debt + Outstanding Loan Debt ONLY
  totalLiabilities: number; // Alias for totalDebt for backwards compatibility
  netWorth: number; // Total Assets - Total Debt (Net Financial Position)
  walletTotal: number;
  savingsTotal: number;
  creditTotal: number;
  loansTotal: number;
}

export function calculateNetWorthSummary(
  reconciledAccounts: ReconciledAccount[]
): NetWorthSummary {
  const activeAccounts = reconciledAccounts.filter((a) => !a.archived);

  let walletCentavos = 0;
  let savingsCentavos = 0;
  let creditCentavos = 0;
  let loansCentavos = 0;

  for (const acc of activeAccounts) {
    const bal = toCentavos(acc.currentBalance);
    if (acc.category === 'Wallet') walletCentavos += bal;
    else if (acc.category === 'Savings') savingsCentavos += bal;
    else if (acc.category === 'Credit') creditCentavos += bal;
    else if (acc.category === 'Loans') loansCentavos += bal;
  }

  // 1. Total Assets: Wallet balances + Savings balances ONLY (excludes credit limits, credit purchases, loans, receivables)
  const totalAssetsCentavos = walletCentavos + savingsCentavos;
  // 2. Total Debt: Outstanding credit debt + Outstanding loan debt ONLY (actual obligations, excludes unused credit limits)
  const totalDebtCentavos = creditCentavos + loansCentavos;
  // 3. Net Financial Position
  const netWorthCentavos = totalAssetsCentavos - totalDebtCentavos;

  const totalAssets = fromCentavos(totalAssetsCentavos);
  const totalDebt = fromCentavos(totalDebtCentavos);

  return {
    totalAssets,
    totalDebt,
    totalLiabilities: totalDebt,
    netWorth: fromCentavos(netWorthCentavos),
    walletTotal: fromCentavos(walletCentavos),
    savingsTotal: fromCentavos(savingsCentavos),
    creditTotal: fromCentavos(creditCentavos),
    loansTotal: fromCentavos(loansCentavos),
  };
}

// ==========================================
// Money Owed to Me (Receivables) Calculations
// ==========================================
export function getReceivableStatus(
  rec: Pick<ReceivableRecord, 'remainingBalance' | 'dueDate' | 'totalCollected'>
): ReceivableStatus {
  if (rec.remainingBalance <= 0) return 'fully_paid';
  const today = new Date().toISOString().slice(0, 10);
  if (rec.dueDate && rec.dueDate < today) return 'overdue';
  if (rec.totalCollected > 0) return 'partially_paid';
  return 'unpaid';
}

export interface ReceivablesSummary {
  totalOutstanding: number; // Total Money Owed to Me (remaining balance sum)
  totalPrincipalLent: number;
  totalCollected: number;
  totalExpected: number;
  debtorsCount: number; // Unique borrowers with balance > 0
  overdueCount: number;
  overdueAmount: number;
  upcomingCount: number;
  upcomingAmount: number;
}

export function calculateReceivablesSummary(
  receivables: ReceivableRecord[] = []
): ReceivablesSummary {
  let outstandingCentavos = 0;
  let principalCentavos = 0;
  let collectedCentavos = 0;
  let expectedCentavos = 0;
  let overdueCentavos = 0;
  let overdueCount = 0;
  let upcomingCentavos = 0;
  let upcomingCount = 0;

  const activeDebtors = new Set<string>();
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAhead = new Date();
  thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);
  const thirtyDaysStr = thirtyDaysAhead.toISOString().slice(0, 10);

  for (const r of receivables) {
    const rem = toCentavos(r.remainingBalance);
    const princ = toCentavos(r.principal);
    const col = toCentavos(r.totalCollected);
    const exp = toCentavos(r.totalExpected);

    outstandingCentavos += rem;
    principalCentavos += princ;
    collectedCentavos += col;
    expectedCentavos += exp;

    if (rem > 0) {
      activeDebtors.add(r.personName.trim().toLowerCase());

      if (r.dueDate && r.dueDate < today) {
        overdueCentavos += rem;
        overdueCount++;
      } else if (r.dueDate && r.dueDate >= today && r.dueDate <= thirtyDaysStr) {
        upcomingCentavos += rem;
        upcomingCount++;
      }
    }
  }

  return {
    totalOutstanding: fromCentavos(outstandingCentavos),
    totalPrincipalLent: fromCentavos(principalCentavos),
    totalCollected: fromCentavos(collectedCentavos),
    totalExpected: fromCentavos(expectedCentavos),
    debtorsCount: activeDebtors.size,
    overdueCount,
    overdueAmount: fromCentavos(overdueCentavos),
    upcomingCount,
    upcomingAmount: fromCentavos(upcomingCentavos),
  };
}

export interface BorrowerSummary {
  personName: string;
  totalPrincipalLent: number;
  totalExpected: number;
  totalCollected: number;
  remainingBalance: number;
  recordsCount: number;
  activeCount: number;
  overdueCount: number;
  lastLentDate: string;
  nextDueDate?: string;
  records: ReceivableRecord[];
}

export function groupReceivablesByBorrower(
  receivables: ReceivableRecord[] = []
): BorrowerSummary[] {
  const map = new Map<string, ReceivableRecord[]>();
  for (const r of receivables) {
    const key = r.personName.trim().toLowerCase();
    const existing = map.get(key) || [];
    existing.push(r);
    map.set(key, existing);
  }

  const summaries: BorrowerSummary[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const records of map.values()) {
    if (records.length === 0) continue;
    const sorted = [...records].sort(
      (a, b) =>
        new Date(b.lentDate || b.createdAt).getTime() -
        new Date(a.lentDate || a.createdAt).getTime()
    );
    const personName = sorted[0].personName;

    let totalPrincipalCentavos = 0;
    let totalExpectedCentavos = 0;
    let totalCollectedCentavos = 0;
    let remainingCentavos = 0;
    let activeCount = 0;
    let overdueCount = 0;
    let nextDueDate: string | undefined = undefined;

    for (const r of records) {
      totalPrincipalCentavos += toCentavos(r.principal);
      totalExpectedCentavos += toCentavos(r.totalExpected);
      totalCollectedCentavos += toCentavos(r.totalCollected);
      remainingCentavos += toCentavos(r.remainingBalance);

      if (r.remainingBalance > 0) {
        activeCount++;
        if (r.dueDate && r.dueDate < today) {
          overdueCount++;
        }
        if (r.dueDate && (!nextDueDate || r.dueDate < nextDueDate)) {
          nextDueDate = r.dueDate;
        }
      }
    }

    summaries.push({
      personName,
      totalPrincipalLent: fromCentavos(totalPrincipalCentavos),
      totalExpected: fromCentavos(totalExpectedCentavos),
      totalCollected: fromCentavos(totalCollectedCentavos),
      remainingBalance: fromCentavos(remainingCentavos),
      recordsCount: records.length,
      activeCount,
      overdueCount,
      lastLentDate: sorted[0].lentDate,
      nextDueDate,
      records: sorted,
    });
  }

  // Sort by highest remaining balance first, then by name
  return summaries.sort((a, b) => {
    if (b.remainingBalance !== a.remainingBalance) {
      return b.remainingBalance - a.remainingBalance;
    }
    return a.personName.localeCompare(b.personName);
  });
}

export interface CategoryBudgetProgress {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  percent: number;
  status: 'normal' | 'warning' | 'exceeded';
}

export interface MonthlyBudgetSummary {
  monthKey: string;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  overallPercent: number;
  overallStatus: 'unconfigured' | 'normal' | 'warning' | 'exceeded';
  categoryBreakdown: CategoryBudgetProgress[];
  unbudgetedCategories: { category: string; spent: number }[];
}

export function calculateMonthlyBudgetSummary(
  monthKey: string,
  budgets: Record<string, MonthlyBudget>,
  transactions: TransactionRecord[]
): MonthlyBudgetSummary {
  const budgetConfig = budgets[monthKey] || {
    monthKey,
    totalBudget: 0,
    categoryBudgets: [],
    alertThresholdPercent: 80,
  };

  const monthExpenses = transactions.filter((tx) => {
    if (tx.type !== 'expense' || tx.isStartingBalance) return false;
    return getMonthKey(tx.dateTime) === monthKey;
  });

  const spentByCategory = new Map<string, number>();
  let totalSpentCentavos = 0;

  for (const tx of monthExpenses) {
    const c = toCentavos(tx.amount);
    totalSpentCentavos += c;
    spentByCategory.set(tx.category, (spentByCategory.get(tx.category) || 0) + c);
  }

  const totalSpent = fromCentavos(totalSpentCentavos);
  const threshold = budgetConfig.alertThresholdPercent || 80;

  const sumCategoryLimits = addPHP(
    ...budgetConfig.categoryBudgets.map((cb) => cb.limit)
  );
  const effectiveTotalBudget =
    budgetConfig.totalBudget > 0 ? budgetConfig.totalBudget : sumCategoryLimits;

  const remainingBudget = subPHP(effectiveTotalBudget, totalSpent);
  const overallPercent =
    effectiveTotalBudget > 0 ? (totalSpent / effectiveTotalBudget) * 100 : 0;

  let overallStatus: 'unconfigured' | 'normal' | 'warning' | 'exceeded' = 'unconfigured';
  if (effectiveTotalBudget > 0) {
    if (totalSpent > effectiveTotalBudget || overallPercent >= 100) {
      overallStatus = 'exceeded';
    } else if (overallPercent >= threshold) {
      overallStatus = 'warning';
    } else {
      overallStatus = 'normal';
    }
  }

  const budgetedSet = new Set<string>();
  const categoryBreakdown: CategoryBudgetProgress[] = budgetConfig.categoryBudgets.map(
    (cb) => {
      budgetedSet.add(cb.category);
      const spent = fromCentavos(spentByCategory.get(cb.category) || 0);
      const remaining = subPHP(cb.limit, spent);
      const percent = cb.limit > 0 ? (spent / cb.limit) * 100 : 0;
      let status: 'normal' | 'warning' | 'exceeded' = 'normal';
      if (cb.limit > 0) {
        if (spent > cb.limit || percent >= 100) status = 'exceeded';
        else if (percent >= threshold) status = 'warning';
      }
      return {
        category: cb.category,
        limit: cb.limit,
        spent,
        remaining,
        percent,
        status,
      };
    }
  );

  const unbudgetedCategories: { category: string; spent: number }[] = [];
  for (const [cat, centavos] of spentByCategory.entries()) {
    if (!budgetedSet.has(cat) && centavos > 0) {
      unbudgetedCategories.push({
        category: cat,
        spent: fromCentavos(centavos),
      });
    }
  }
  unbudgetedCategories.sort((a, b) => b.spent - a.spent);

  return {
    monthKey,
    totalBudget: effectiveTotalBudget,
    totalSpent,
    remainingBudget,
    overallPercent,
    overallStatus,
    categoryBreakdown,
    unbudgetedCategories,
  };
}

export function createInitialPesoTrackState(): PesoTrackState {
  const accounts: FinancialAccount[] = [
    {
      id: 'acc_gcash',
      providerId: 'gcash',
      name: 'Gcash',
      category: 'Wallet',
      startingBalance: 20000,
      description: 'Primary GCash e-wallet',
      accountNumberMasked: '0917 •••• 4821',
      createdAt: '2026-07-19T21:24:00.000Z',
    },
    {
      id: 'acc_maya',
      providerId: 'maya',
      name: 'Maya',
      category: 'Wallet',
      startingBalance: 15000,
      description: 'Maya digital wallet',
      accountNumberMasked: '0918 •••• 9104',
      createdAt: '2026-07-19T21:25:00.000Z',
    },
    {
      id: 'acc_gotyme',
      providerId: 'gotyme_wallet',
      name: 'GT',
      category: 'Wallet',
      startingBalance: 2000,
      description: 'GoTyme everyday wallet',
      accountNumberMasked: '•••• 3319',
      createdAt: '2026-07-19T21:25:10.000Z',
    },
    {
      id: 'acc_lazwallet',
      providerId: 'lazada',
      name: 'LazWallet',
      category: 'Wallet',
      startingBalance: 6000,
      description: 'Lazada shopping wallet',
      createdAt: '2026-07-19T21:25:20.000Z',
    },
  ];

  const transactions: TransactionRecord[] = [
    {
      id: 'tx_start_lazwallet',
      type: 'adjustment',
      adjustmentSign: 'positive',
      amount: 6000,
      accountId: 'acc_lazwallet',
      category: 'Starting Balance',
      merchantOrTitle: 'Starting Balance',
      dateTime: '2026-07-19T21:25:30',
      notes: 'Initial wallet balance',
      isStartingBalance: true,
    },
    {
      id: 'tx_start_gotyme',
      type: 'adjustment',
      adjustmentSign: 'positive',
      amount: 2000,
      accountId: 'acc_gotyme',
      category: 'Starting Balance',
      merchantOrTitle: 'Starting Balance',
      dateTime: '2026-07-19T21:25:20',
      notes: 'Initial wallet balance',
      isStartingBalance: true,
    },
    {
      id: 'tx_start_maya',
      type: 'adjustment',
      adjustmentSign: 'positive',
      amount: 15000,
      accountId: 'acc_maya',
      category: 'Starting Balance',
      merchantOrTitle: 'Starting Balance',
      dateTime: '2026-07-19T21:25:10',
      notes: 'Initial wallet balance',
      isStartingBalance: true,
    },
    {
      id: 'tx_start_gcash',
      type: 'adjustment',
      adjustmentSign: 'positive',
      amount: 20000,
      accountId: 'acc_gcash',
      category: 'Starting Balance',
      merchantOrTitle: 'Starting Balance',
      dateTime: '2026-07-19T21:24:50',
      notes: 'Initial wallet balance',
      isStartingBalance: true,
    },
  ];

  const currentMonth = getMonthKey();

  return {
    version: 1,
    accounts,
    transactions,
    budgets: {
      [currentMonth]: {
        monthKey: currentMonth,
        totalBudget: 25000,
        alertThresholdPercent: 80,
        categoryBudgets: [
          { category: 'Food', limit: 8000 },
          { category: 'Bills', limit: 6000 },
          { category: 'Transportation', limit: 3500 },
          { category: 'Shopping', limit: 4000 },
          { category: 'Subscriptions', limit: 1500 },
          { category: 'Entertainment', limit: 2000 },
        ],
      },
      '2026-07': {
        monthKey: '2026-07',
        totalBudget: 25000,
        alertThresholdPercent: 80,
        categoryBudgets: [
          { category: 'Food', limit: 8000 },
          { category: 'Bills', limit: 6000 },
          { category: 'Transportation', limit: 3500 },
          { category: 'Shopping', limit: 4000 },
          { category: 'Subscriptions', limit: 1500 },
          { category: 'Entertainment', limit: 2000 },
        ],
      },
    },
    customCategories: {
      expense: DEFAULT_EXPENSE_CATEGORIES,
      income: DEFAULT_INCOME_CATEGORIES,
    },
    recurringTransactions: [
      {
        id: 'rec_salary',
        name: 'Monthly Salary',
        amount: 35000,
        type: 'income',
        category: 'Salary',
        accountId: 'acc_gcash',
        startDate: '2026-07-30',
        nextDueDate: '2026-10-30',
        frequency: 'monthly',
        reminderEnabled: true,
        isActive: true,
        createdAt: '2026-07-19T21:24:00.000Z',
      },
      {
        id: 'rec_wifi',
        name: 'Fiber Internet Bill',
        amount: 1699,
        type: 'expense',
        category: 'Bills',
        accountId: 'acc_gcash',
        startDate: '2026-07-20',
        nextDueDate: '2026-10-20',
        frequency: 'monthly',
        reminderEnabled: true,
        isActive: true,
        createdAt: '2026-07-19T21:24:00.000Z',
      },
    ],
    bills: [
      {
        id: 'bill_meralco',
        name: 'Meralco Electricity',
        category: 'Electricity',
        type: 'variable',
        defaultAmount: 3450,
        dueDay: 18,
        startMonth: '2026-01',
        frequency: 'monthly',
        reminderEnabled: true,
        reminderDaysBefore: 3,
        notes: 'Monthly power consumption bill',
        createdAt: '2026-07-19T21:24:00.000Z',
        updatedAt: '2026-07-19T21:24:00.000Z',
      },
      {
        id: 'bill_maynilad',
        name: 'Maynilad Water',
        category: 'Water',
        type: 'variable',
        defaultAmount: 680,
        dueDay: 22,
        startMonth: '2026-01',
        frequency: 'monthly',
        reminderEnabled: true,
        reminderDaysBefore: 1,
        notes: 'Residential water service',
        createdAt: '2026-07-19T21:24:00.000Z',
        updatedAt: '2026-07-19T21:24:00.000Z',
      },
      {
        id: 'bill_pldt',
        name: 'PLDT Home Fiber',
        category: 'Wi-Fi / Internet',
        type: 'fixed',
        defaultAmount: 1699,
        dueDay: 20,
        startMonth: '2026-01',
        frequency: 'monthly',
        reminderEnabled: true,
        reminderDaysBefore: 1,
        notes: 'Fiber 200 Mbps plan',
        createdAt: '2026-07-19T21:24:00.000Z',
        updatedAt: '2026-07-19T21:24:00.000Z',
      },
      {
        id: 'bill_mobile_load',
        name: 'Globe Postpaid / Data',
        category: 'Mobile Data',
        type: 'variable',
        defaultAmount: 599,
        dueDay: 15,
        startMonth: '2026-01',
        frequency: 'monthly',
        reminderEnabled: true,
        reminderDaysBefore: 1,
        notes: 'GPlan Plus mobile plan',
        createdAt: '2026-07-19T21:24:00.000Z',
        updatedAt: '2026-07-19T21:24:00.000Z',
      },
      {
        id: 'bill_netflix',
        name: 'Netflix 4K Ultra',
        category: 'Subscriptions',
        type: 'fixed',
        defaultAmount: 549,
        dueDay: 25,
        startMonth: '2026-01',
        frequency: 'monthly',
        reminderEnabled: true,
        reminderDaysBefore: 1,
        notes: 'Family entertainment subscription',
        createdAt: '2026-07-19T21:24:00.000Z',
        updatedAt: '2026-07-19T21:24:00.000Z',
      },
    ],
    monthlyBillEntries: {},
    customBillNames: [
      'Condo Dues',
      'Tuition Fee',
      'Groceries',
      'Car Maintenance',
      'Gym Membership',
      'Pet Care',
    ],
    settings: {
      profileName: 'Juan Dela Cruz',
      profileEmail: 'juan@pesotrack.ph',
      currency: 'PHP',
      currencySymbol: '₱',
      hideBalances: false,
      darkMode: false,
      startOfMonthDay: 1,
      budgetReminders: true,
      dueReminders: true,
      numberFormat: 'standard',
      notificationSettings: {
        enabled: true,
        reminderTime: '09:00',
        remindOnDueDate: true,
        remindDaysBeforeList: [0, 1],
        billsEnabled: true,
        creditEnabled: true,
        loanEnabled: true,
        receivablesEnabled: true,
        overdueEnabled: true,
      },
    },
    updatedAt: new Date().toISOString(),
  };
}
