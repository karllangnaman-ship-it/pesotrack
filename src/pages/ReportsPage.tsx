import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
<<<<<<< HEAD
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  Calendar,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
=======
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  CreditCard,
  DollarSign,
  Download,
  Filter,
<<<<<<< HEAD
  GraduationCap,
  HandCoins,
  HeartPulse,
  Home,
  Info,
  Landmark,
  PieChart,
  PiggyBank,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  TrendingDown,
  TrendingUp,
  Tv,
  Utensils,
  Wallet,
  Zap,
=======
  HandCoins,
  Landmark,
  PieChart,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
} from 'lucide-react';
import { ProviderLogo } from '../components/ProviderLogo';
import { useFinance } from '../context/FinanceContext';
import {
<<<<<<< HEAD
  ActiveTab,
  BillDefinition,
  MonthlyBillEntry,
  TransactionRecord,
  TransactionType,
} from '../types/finance';
import {
  addPHP,
  formatMonthLabel,
  formatPeso,
  formatTransactionDateTime,
=======
  addPHP,
  formatMonthLabel,
  formatPeso,
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  fromCentavos,
  getMonthKey,
  subPHP,
  toCentavos,
} from '../utils/currency';
import { exportAnalyticsCSV } from '../utils/backupService';
import { calculateMonthlyBudgetSummary } from '../utils/financeEngine';

<<<<<<< HEAD
export type DateRangePreset =
=======
type DateRangePreset =
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
<<<<<<< HEAD
  | 'custom';

export interface ReportsPageProps {
  initialSection?: 'analytics' | 'cashflow' | 'breakdown';
  onNavigate?: (tab: ActiveTab) => void;
  onOpenAddTransaction?: (type?: TransactionType) => void;
  onSelectTransaction?: (tx: TransactionRecord) => void;
}

// Harmonious category palette tailored to PesoTrack's forest aesthetic
const CATEGORY_PALETTE = [
  '#16A34A', // Vibrant Emerald
  '#0D9488', // Forest Teal
  '#2563EB', // Sapphire Blue
  '#F59E0B', // Warm Amber
  '#E11D48', // Coral Rose
  '#7C3AED', // Royal Violet
  '#059669', // Mint Jade
  '#EA580C', // Tangerine
  '#0891B2', // Cyan
  '#65A30D', // Lime Green
  '#D97706', // Ocher
  '#475569', // Slate
];

// Helper to resolve an intuitive Lucide icon for categories
function getCategoryIcon(categoryName: string) {
  const c = (categoryName || '').toLowerCase();
  if (c.includes('food') || c.includes('dining') || c.includes('grocer') || c.includes('restaurant')) {
    return <Utensils className="w-4 h-4 shrink-0" />;
  }
  if (c.includes('bill') || c.includes('utility') || c.includes('electric') || c.includes('water')) {
    return <Zap className="w-4 h-4 shrink-0" />;
  }
  if (c.includes('trans') || c.includes('gas') || c.includes('fuel') || c.includes('car') || c.includes('commute')) {
    return <Car className="w-4 h-4 shrink-0" />;
  }
  if (c.includes('shop') || c.includes('cloth') || c.includes('retail') || c.includes('online')) {
    return <ShoppingBag className="w-4 h-4 shrink-0" />;
  }
  if (c.includes('sub') || c.includes('stream') || c.includes('entertain') || c.includes('game') || c.includes('tv')) {
    return <Tv className="w-4 h-4 shrink-0" />;
  }
  if (c.includes('health') || c.includes('med') || c.includes('pharm') || c.includes('doctor')) {
    return <HeartPulse className="w-4 h-4 shrink-0" />;
  }
  if (c.includes('educ') || c.includes('school') || c.includes('course') || c.includes('tuition')) {
    return <GraduationCap className="w-4 h-4 shrink-0" />;
  }
  if (c.includes('home') || c.includes('rent') || c.includes('mortgage') || c.includes('repair')) {
    return <Home className="w-4 h-4 shrink-0" />;
  }
  if (c.includes('salary') || c.includes('pay') || c.includes('wage') || c.includes('job')) {
    return <Briefcase className="w-4 h-4 shrink-0" />;
  }
  if (c.includes('loan') || c.includes('lend') || c.includes('borrow')) {
    return <HandCoins className="w-4 h-4 shrink-0" />;
  }
  if (c.includes('credit') || c.includes('card')) {
    return <CreditCard className="w-4 h-4 shrink-0" />;
  }
  if (c.includes('invest') || c.includes('saving') || c.includes('interest')) {
    return <PiggyBank className="w-4 h-4 shrink-0" />;
  }
  if (c.includes('business') || c.includes('freelance') || c.includes('profit')) {
    return <TrendingUp className="w-4 h-4 shrink-0" />;
  }
  return <Tag className="w-4 h-4 shrink-0" />;
}

// Generate Month/Year selector options (24 past months + current + 6 future)
function generateMonthOptions() {
  const options: { key: string; label: string }[] = [];
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth();

  for (let i = -24; i <= 6; i++) {
    const d = new Date(curY, curM + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
    options.push({ key, label });
  }
  return options;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  initialSection,
  onNavigate,
  onOpenAddTransaction,
  onSelectTransaction,
}) => {
=======
  | 'all_time'
  | 'custom';

interface ReportsPageProps {
  initialSection?: 'analytics' | 'cashflow' | 'breakdown';
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ initialSection }) => {
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  const {
    state,
    reconciledAccounts,
    netWorthSummary,
<<<<<<< HEAD
    receivables,
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
    receivablesSummary,
    monthlyBillEntries,
    bills,
    showToast,
  } = useFinance();
  const hide = state.settings.hideBalances;

<<<<<<< HEAD
  // Selected Month Anchor (Default: Current Month)
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(getMonthKey());
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  // Preset filter state
  const [rangePreset, setRangePreset] = useState<DateRangePreset>('this_month');

  // Custom date range state
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Hovered bucket for monthly trend chart
  const [hoveredBucketIndex, setHoveredBucketIndex] = useState<number | null>(null);

  // Doughnut chart slice hover state
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Top categories expand toggle
  const [showAllTopCategories, setShowAllTopCategories] = useState<boolean>(false);

  // CSV export state
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Handle deep-linked scroll navigation
=======
  // Filter state
  const [rangePreset, setRangePreset] = useState<DateRangePreset>('this_month');

>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  React.useEffect(() => {
    if (initialSection) {
      const el = document.getElementById(`section-${initialSection}`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
    }
  }, [initialSection]);
<<<<<<< HEAD

  // Compute Current and Previous Equivalent Date Ranges
  const {
    startDateStr,
    endDateStr,
    periodLabel,
    prevStartDateStr,
    prevEndDateStr,
    prevPeriodLabel,
    isCustom,
  } = useMemo(() => {
    const [anchorYear, anchorMonth] = selectedMonthKey.split('-').map(Number);
    // anchorMonth is 1-indexed (1-12), convert to 0-indexed for Date
    const mIdx = anchorMonth - 1;

    let start: Date;
    let end: Date;
    let label = 'This Month';

    let prevStart: Date;
    let prevEnd: Date;
    let prevLabel = 'Previous Month';

    if (rangePreset === 'this_month') {
      start = new Date(anchorYear, mIdx, 1);
      end = new Date(anchorYear, mIdx + 1, 0, 23, 59, 59, 999);
      label = formatMonthLabel(selectedMonthKey);

      prevStart = new Date(anchorYear, mIdx - 1, 1);
      prevEnd = new Date(anchorYear, mIdx, 0, 23, 59, 59, 999);
      const prevKey = `${prevStart.getFullYear()}-${String(prevStart.getMonth() + 1).padStart(2, '0')}`;
      prevLabel = formatMonthLabel(prevKey);
    } else if (rangePreset === 'last_month') {
      start = new Date(anchorYear, mIdx - 1, 1);
      end = new Date(anchorYear, mIdx, 0, 23, 59, 59, 999);
      const startKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      label = `Last Month (${formatMonthLabel(startKey)})`;

      prevStart = new Date(anchorYear, mIdx - 2, 1);
      prevEnd = new Date(anchorYear, mIdx - 1, 0, 23, 59, 59, 999);
      const prevKey = `${prevStart.getFullYear()}-${String(prevStart.getMonth() + 1).padStart(2, '0')}`;
      prevLabel = formatMonthLabel(prevKey);
    } else if (rangePreset === 'last_3_months') {
      start = new Date(anchorYear, mIdx - 2, 1);
      end = new Date(anchorYear, mIdx + 1, 0, 23, 59, 59, 999);
      label = 'Last 3 Months';

      prevStart = new Date(anchorYear, mIdx - 5, 1);
      prevEnd = new Date(anchorYear, mIdx - 2, 0, 23, 59, 59, 999);
      prevLabel = 'Prior 3 Months';
    } else if (rangePreset === 'last_6_months') {
      start = new Date(anchorYear, mIdx - 5, 1);
      end = new Date(anchorYear, mIdx + 1, 0, 23, 59, 59, 999);
      label = 'Last 6 Months';

      prevStart = new Date(anchorYear, mIdx - 11, 1);
      prevEnd = new Date(anchorYear, mIdx - 5, 0, 23, 59, 59, 999);
      prevLabel = 'Prior 6 Months';
    } else if (rangePreset === 'this_year') {
      start = new Date(anchorYear, 0, 1);
      end = new Date(anchorYear, 11, 31, 23, 59, 59, 999);
      label = `${anchorYear} Full Year`;

      prevStart = new Date(anchorYear - 1, 0, 1);
      prevEnd = new Date(anchorYear - 1, 11, 31, 23, 59, 59, 999);
      prevLabel = `${anchorYear - 1} Full Year`;
    } else {
      // Custom Range
      const s = customStartDate ? new Date(customStartDate) : new Date(anchorYear, mIdx, 1);
      const e = customEndDate ? new Date(customEndDate) : new Date();
      start = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
      end = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
      label = `${customStartDate} to ${customEndDate}`;

      const durationMs = Math.max(86400000, end.getTime() - start.getTime());
      prevEnd = new Date(start.getTime() - 1000);
      prevStart = new Date(prevEnd.getTime() - durationMs);
      prevLabel = 'Prior Period';
=======
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10)
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [isExporting, setIsExporting] = useState(false);

  // Compute effective date range boundaries
  const { startDateStr, endDateStr, periodLabel } = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-indexed

    let start = new Date(curYear, curMonth, 1);
    let end = new Date(curYear, curMonth + 1, 0, 23, 59, 59);
    let label = 'This Month';

    if (rangePreset === 'last_month') {
      start = new Date(curYear, curMonth - 1, 1);
      end = new Date(curYear, curMonth, 0, 23, 59, 59);
      label = 'Last Month';
    } else if (rangePreset === 'last_3_months') {
      start = new Date(curYear, curMonth - 2, 1);
      end = new Date(curYear, curMonth + 1, 0, 23, 59, 59);
      label = 'Last 3 Months';
    } else if (rangePreset === 'last_6_months') {
      start = new Date(curYear, curMonth - 5, 1);
      end = new Date(curYear, curMonth + 1, 0, 23, 59, 59);
      label = 'Last 6 Months';
    } else if (rangePreset === 'this_year') {
      start = new Date(curYear, 0, 1);
      end = new Date(curYear, 11, 31, 23, 59, 59);
      label = `${curYear} Full Year`;
    } else if (rangePreset === 'all_time') {
      start = new Date(2000, 0, 1);
      end = new Date(2100, 11, 31, 23, 59, 59);
      label = 'All Time';
    } else if (rangePreset === 'custom') {
      const s = customStartDate ? new Date(customStartDate) : new Date(curYear, curMonth, 1);
      const e = customEndDate ? new Date(customEndDate) : new Date();
      start = s;
      end = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59);
      label = `${customStartDate} to ${customEndDate}`;
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
    }

    return {
      startDateStr: start.toISOString().slice(0, 10),
      endDateStr: end.toISOString().slice(0, 10),
      periodLabel: label,
<<<<<<< HEAD
      prevStartDateStr: prevStart.toISOString().slice(0, 10),
      prevEndDateStr: prevEnd.toISOString().slice(0, 10),
      prevPeriodLabel: prevLabel,
      isCustom: rangePreset === 'custom',
    };
  }, [selectedMonthKey, rangePreset, customStartDate, customEndDate]);

  // When user selects a month from the Month/Year dropdown, sync anchor and preset
  const handleSelectMonth = (newMonthKey: string) => {
    setSelectedMonthKey(newMonthKey);
    setRangePreset('this_month');
  };

  // Filter transactions within current period
  // EXCLUSIONS: Transfers between own accounts are neither income nor expense!
=======
    };
  }, [rangePreset, customStartDate, customEndDate]);

  // Filter transactions within range
  // CRITICAL RULE: Transfers between user's own accounts are NOT income or expenses
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  const transactionsInPeriod = useMemo(() => {
    return state.transactions.filter((tx) => {
      if (tx.isStartingBalance) return false;
      const dateStr = tx.dateTime.slice(0, 10);
      return dateStr >= startDateStr && dateStr <= endDateStr;
    });
  }, [state.transactions, startDateStr, endDateStr]);

<<<<<<< HEAD
  // Filter transactions within previous equivalent period
  const transactionsInPrevPeriod = useMemo(() => {
    return state.transactions.filter((tx) => {
      if (tx.isStartingBalance) return false;
      const dateStr = tx.dateTime.slice(0, 10);
      return dateStr >= prevStartDateStr && dateStr <= prevEndDateStr;
    });
  }, [state.transactions, prevStartDateStr, prevEndDateStr]);

  // Aggregate Financial Cash Flows for Current Period
  const currentCashFlow = useMemo(() => {
    let incomeCentavos = 0;
    let expenseCentavos = 0;
    let loanRepaymentsCentavos = 0;
    let creditRepaymentsCentavos = 0;
=======
  // Cash Flow Calculations adhering strictly to accounting rules
  const cashFlowMetrics = useMemo(() => {
    let incomeCentavos = 0;
    let expenseCentavos = 0;
    let creditRepaymentCentavos = 0;
    let loanRepaymentCentavos = 0;
    let billExpenseCentavos = 0;
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce

    for (const tx of transactionsInPeriod) {
      const c = toCentavos(tx.amount);

<<<<<<< HEAD
      // Account Transfers
      if (tx.type === 'transfer') {
        const destAcc = reconciledAccounts.find((a) => a.id === tx.destinationAccountId);
        if (destAcc?.category === 'Loans') {
          loanRepaymentsCentavos += c;
        } else if (destAcc?.category === 'Credit') {
          creditRepaymentsCentavos += c;
        }
        // Transfers between user's own liquid wallets do not alter net cash flow
=======
      // Transfers between accounts:
      if (tx.type === 'transfer') {
        const destAcc = reconciledAccounts.find((a) => a.id === tx.destinationAccountId);
        if (destAcc?.category === 'Credit') {
          creditRepaymentCentavos += c;
        } else if (destAcc?.category === 'Loans') {
          loanRepaymentCentavos += c;
        }
        // Transfers between user's own wallets are neither income nor expense!
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
        continue;
      }

      if (tx.type === 'income') {
        incomeCentavos += c;
      } else if (tx.type === 'expense') {
        expenseCentavos += c;
<<<<<<< HEAD
        if (tx.category === 'Loan Payment' || tx.merchantOrTitle?.toLowerCase().includes('loan payment')) {
          loanRepaymentsCentavos += c;
        } else if (tx.category === 'Credit Payment' || tx.merchantOrTitle?.toLowerCase().includes('credit card payment')) {
          creditRepaymentsCentavos += c;
=======
        if (tx.category === 'Bills' || tx.merchantOrTitle?.toLowerCase().includes('bill')) {
          billExpenseCentavos += c;
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
        }
      } else if (tx.type === 'adjustment') {
        if (tx.adjustmentSign === 'negative') {
          expenseCentavos += c;
        } else {
          incomeCentavos += c;
        }
      }
    }

    const totalIncome = fromCentavos(incomeCentavos);
    const totalExpense = fromCentavos(expenseCentavos);
    const netCashFlow = subPHP(totalIncome, totalExpense);

    return {
      totalIncome,
      totalExpense,
      netCashFlow,
<<<<<<< HEAD
      loanRepayments: fromCentavos(loanRepaymentsCentavos),
      creditRepayments: fromCentavos(creditRepaymentsCentavos),
    };
  }, [transactionsInPeriod, reconciledAccounts]);

  // Aggregate Financial Cash Flows for Previous Period
  const prevCashFlow = useMemo(() => {
    let incomeCentavos = 0;
    let expenseCentavos = 0;

    for (const tx of transactionsInPrevPeriod) {
      const c = toCentavos(tx.amount);
      if (tx.type === 'transfer') continue;

      if (tx.type === 'income') {
        incomeCentavos += c;
      } else if (tx.type === 'expense') {
        expenseCentavos += c;
      } else if (tx.type === 'adjustment') {
        if (tx.adjustmentSign === 'negative') {
          expenseCentavos += c;
        } else {
          incomeCentavos += c;
        }
      }
    }

    const totalIncome = fromCentavos(incomeCentavos);
    const totalExpense = fromCentavos(expenseCentavos);
    const netCashFlow = subPHP(totalIncome, totalExpense);

    return {
      totalIncome,
      totalExpense,
      netCashFlow,
    };
  }, [transactionsInPrevPeriod]);

  // Helper for Percentage Change Calculations
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) {
      if (current === 0) return { pct: 0, label: '0.0%', isPositive: true, hasPrior: false };
      return { pct: 100, label: '+100%', isPositive: current > 0, hasPrior: false };
    }
    const delta = current - previous;
    const pct = (delta / Math.abs(previous)) * 100;
    const sign = pct > 0 ? '+' : '';
    return {
      pct,
      label: `${sign}${pct.toFixed(1)}%`,
      isPositive: pct >= 0,
      hasPrior: true,
      delta,
    };
  };

  const incomeComparison = useMemo(() => {
    return calculateChange(currentCashFlow.totalIncome, prevCashFlow.totalIncome);
  }, [currentCashFlow.totalIncome, prevCashFlow.totalIncome]);

  const expenseComparison = useMemo(() => {
    return calculateChange(currentCashFlow.totalExpense, prevCashFlow.totalExpense);
  }, [currentCashFlow.totalExpense, prevCashFlow.totalExpense]);

  const netCashFlowComparison = useMemo(() => {
    const delta = subPHP(currentCashFlow.netCashFlow, prevCashFlow.netCashFlow);
    const improved = delta >= 0;
    const sign = delta > 0 ? '+' : '';
    return {
      delta,
      improved,
      label: `${sign}${formatPeso(delta, { hide })}`,
    };
  }, [currentCashFlow.netCashFlow, prevCashFlow.netCashFlow]);

  // Aggregate Monthly Bills for the Period
  const billsSummary = useMemo(() => {
    // Collect all monthKeys that touch [startDateStr, endDateStr]
    const startM = startDateStr.slice(0, 7);
    const endM = endDateStr.slice(0, 7);

    let billedCentavos = 0;
    let paidCentavos = 0;
    let paidCount = 0;
    let totalCount = 0;

    // Iterate through months in range
    const [sy, sm] = startM.split('-').map(Number);
    const [ey, em] = endM.split('-').map(Number);

    const activeMonths: string[] = [];
    let curY = sy;
    let curM = sm;
    while (curY < ey || (curY === ey && curM <= em)) {
      activeMonths.push(`${curY}-${String(curM).padStart(2, '0')}`);
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }

    for (const mKey of activeMonths) {
      for (const bill of bills) {
        if (bill.startMonth > mKey) continue;
        if (bill.endMonth && bill.endMonth < mKey) continue;

        totalCount++;
        const entryKey = `${bill.id}_${mKey}`;
        const entry: MonthlyBillEntry | undefined = monthlyBillEntries[entryKey];

        const billed = entry?.actualAmount ?? bill.defaultAmount;
        billedCentavos += toCentavos(billed);

        const paid = entry?.isPaidManually
          ? billed
          : (entry?.payments?.reduce((s, p) => s + p.amount, 0) || 0);
        paidCentavos += toCentavos(paid);

        if (paid >= billed && billed > 0) {
          paidCount++;
        }
      }
    }

    const billedTotal = fromCentavos(billedCentavos);
    const paidTotal = fromCentavos(paidCentavos);
    const unpaidTotal = Math.max(0, subPHP(billedTotal, paidTotal));
    const paidPercent = billedTotal > 0 ? (paidTotal / billedTotal) * 100 : 0;

    return {
      billedTotal,
      paidTotal,
      unpaidTotal,
      paidCount,
      totalCount,
      paidPercent,
    };
  }, [startDateStr, endDateStr, bills, monthlyBillEntries]);

  // Aggregate Receivables in the Period
  const receivablesInPeriod = useMemo(() => {
    let collectedInPeriodCentavos = 0;
    for (const r of receivables) {
      if (!r.payments) continue;
      for (const p of r.payments) {
        if (p.date >= startDateStr && p.date <= endDateStr) {
          collectedInPeriodCentavos += toCentavos(p.amount);
        }
      }
    }

    return {
      totalOutstanding: receivablesSummary.totalOutstanding,
      collectedInPeriod: fromCentavos(collectedInPeriodCentavos),
      activeCount: receivablesSummary.debtorsCount,
      overdueCount: receivablesSummary.overdueCount,
    };
  }, [receivables, receivablesSummary, startDateStr, endDateStr]);

  // Spending Breakdown by Category
=======
      monthlyBillExpenses: fromCentavos(billExpenseCentavos),
      creditRepayments: fromCentavos(creditRepaymentCentavos),
      loanRepayments: fromCentavos(loanRepaymentCentavos),
    };
  }, [transactionsInPeriod, reconciledAccounts]);

  // Spending by Category
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    let totalCentavos = 0;

    for (const tx of transactionsInPeriod) {
      if (tx.type !== 'expense' && !(tx.type === 'adjustment' && tx.adjustmentSign === 'negative')) {
        continue;
      }
      const c = toCentavos(tx.amount);
      totalCentavos += c;
      const cat = tx.category || 'Other';
      map.set(cat, (map.get(cat) || 0) + c);
    }

    const total = fromCentavos(totalCentavos);
<<<<<<< HEAD
    const sortedCategories = Array.from(map.entries())
      .map(([category, centavos], idx) => {
        const amount = fromCentavos(centavos);
        const percent = total > 0 ? (amount / total) * 100 : 0;
        const color = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
        return { category, amount, percent, color };
      })
      .sort((a, b) => b.amount - a.amount);

    return { items: sortedCategories, total };
  }, [transactionsInPeriod]);

  // Top Spending Categories
  const topCategories = useMemo(() => {
    if (showAllTopCategories) return categoryBreakdown.items;
    return categoryBreakdown.items.slice(0, 5);
  }, [categoryBreakdown.items, showAllTopCategories]);

  // Income vs. Expenses Time Series Chart Buckets (Monthly)
  const timeSeriesData = useMemo(() => {
    const bucketMap = new Map<
      string,
      { key: string; label: string; date: string; income: number; expense: number }
    >();

    // Monthly buckets across selected period
    const [sy, sm] = startDateStr.slice(0, 7).split('-').map(Number);
    const [ey, em] = endDateStr.slice(0, 7).split('-').map(Number);
    let curY = sy;
    let curM = sm;
    while (curY < ey || (curY === ey && curM <= em)) {
      const key = `${curY}-${String(curM).padStart(2, '0')}`;
      const d = new Date(curY, curM - 1, 1);
      const label = d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
      bucketMap.set(key, { key, label, date: key, income: 0, expense: 0 });
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }

    // Populate transaction amounts grouped by month
    for (const tx of transactionsInPeriod) {
      if (tx.type === 'transfer') continue;

      const key = tx.dateTime.slice(0, 7);
      const bucket = bucketMap.get(key);
      if (!bucket) continue;

      if (tx.type === 'income' || (tx.type === 'adjustment' && tx.adjustmentSign !== 'negative')) {
        bucket.income = addPHP(bucket.income, tx.amount);
      } else if (tx.type === 'expense' || (tx.type === 'adjustment' && tx.adjustmentSign === 'negative')) {
        bucket.expense = addPHP(bucket.expense, tx.amount);
      }
    }

    const list = Array.from(bucketMap.values());
    let max = 1;
    for (const b of list) {
      if (b.income > max) max = b.income;
      if (b.expense > max) max = b.expense;
    }

    return { buckets: list, maxVal: max };
  }, [transactionsInPeriod, startDateStr, endDateStr]);

  // Budget vs Actual Spending for Active Anchor Month
  const activeBudgetMonthKey = selectedMonthKey;
  const budgetSummary = useMemo(() => {
    return calculateMonthlyBudgetSummary(activeBudgetMonthKey, state.budgets, state.transactions);
  }, [activeBudgetMonthKey, state.budgets, state.transactions]);

  // Recent Transactions in Selected Period (newest first, limit 8)
  const recentTransactionsInPeriod = useMemo(() => {
    return [...transactionsInPeriod]
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
      .slice(0, 8);
  }, [transactionsInPeriod]);

  // CSV Report Export Handler
=======
    const items = Array.from(map.entries()).map(([category, centavos]) => {
      const amount = fromCentavos(centavos);
      const percent = total > 0 ? (amount / total) * 100 : 0;
      return { category, amount, percent };
    });

    items.sort((a, b) => b.amount - a.amount);
    return { items, total };
  }, [transactionsInPeriod]);

  // Top 5 spending categories
  const topCategories = useMemo(() => {
    return categoryBreakdown.items.slice(0, 5);
  }, [categoryBreakdown.items]);

  // Monthly Time Series for chart
  const timeSeriesBuckets = useMemo(() => {
    const bucketMap = new Map<
      string,
      { key: string; label: string; income: number; expense: number }
    >();

    for (const tx of transactionsInPeriod) {
      const d = new Date(tx.dateTime);
      if (Number.isNaN(d.getTime())) continue;

      let key: string;
      let label: string;

      if (rangePreset === 'this_month' || rangePreset === 'last_month') {
        // Group by day
        key = tx.dateTime.slice(0, 10);
        label = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
      } else {
        // Group by month
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        label = d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
      }

      const existing = bucketMap.get(key) || { key, label, income: 0, expense: 0 };
      if (tx.type === 'income' || (tx.type === 'adjustment' && tx.adjustmentSign !== 'negative')) {
        existing.income = addPHP(existing.income, tx.amount);
      } else if (tx.type === 'expense' || (tx.type === 'adjustment' && tx.adjustmentSign === 'negative')) {
        existing.expense = addPHP(existing.expense, tx.amount);
      }
      bucketMap.set(key, existing);
    }

    return Array.from(bucketMap.entries())
      .sort(([k1], [k2]) => k1.localeCompare(k2))
      .slice(-8)
      .map(([, val]) => val);
  }, [transactionsInPeriod, rangePreset]);

  const maxBucketValue = useMemo(() => {
    let max = 1;
    for (const b of timeSeriesBuckets) {
      if (b.income > max) max = b.income;
      if (b.expense > max) max = b.expense;
    }
    return max;
  }, [timeSeriesBuckets]);

  // Month-to-Month comparison: current month vs previous month
  const monthComparison = useMemo(() => {
    const curMonthKey = getMonthKey();
    const [y, m] = curMonthKey.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    let curIncome = 0;
    let curExpense = 0;
    let prevIncome = 0;
    let prevExpense = 0;

    for (const tx of state.transactions) {
      if (tx.isStartingBalance || tx.type === 'transfer') continue;
      const mKey = tx.dateTime.slice(0, 7);

      if (mKey === curMonthKey) {
        if (tx.type === 'income') curIncome = addPHP(curIncome, tx.amount);
        if (tx.type === 'expense') curExpense = addPHP(curExpense, tx.amount);
      } else if (mKey === prevMonthKey) {
        if (tx.type === 'income') prevIncome = addPHP(prevIncome, tx.amount);
        if (tx.type === 'expense') prevExpense = addPHP(prevExpense, tx.amount);
      }
    }

    const expenseDelta = subPHP(curExpense, prevExpense);
    const incomeDelta = subPHP(curIncome, prevIncome);

    return {
      curMonthKey,
      prevMonthKey,
      curIncome,
      curExpense,
      prevIncome,
      prevExpense,
      expenseDelta,
      incomeDelta,
    };
  }, [state.transactions]);

  // Budget vs Actual for the current selected month
  const activeMonthKey = rangePreset === 'last_month' ? monthComparison.prevMonthKey : getMonthKey();
  const budgetSummary = useMemo(() => {
    return calculateMonthlyBudgetSummary(activeMonthKey, state.budgets, state.transactions);
  }, [activeMonthKey, state.budgets, state.transactions]);

  // CSV Report Export Trigger (Offline Local)
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const res = await exportAnalyticsCSV({
        periodLabel,
<<<<<<< HEAD
        totalIncome: currentCashFlow.totalIncome,
        totalExpense: currentCashFlow.totalExpense,
        netCashFlow: currentCashFlow.netCashFlow,
        totalAssets: netWorthSummary.totalAssets,
        totalDebt: netWorthSummary.totalDebt,
        netWorth: netWorthSummary.netWorth,
        monthlyBillsPaid: billsSummary.paidTotal,
        creditRepayments: currentCashFlow.creditRepayments,
        loanRepayments: currentCashFlow.loanRepayments,
        receivablesCollected: receivablesInPeriod.collectedInPeriod,
        receivablesOutstanding: receivablesInPeriod.totalOutstanding,
=======
        totalIncome: cashFlowMetrics.totalIncome,
        totalExpense: cashFlowMetrics.totalExpense,
        netCashFlow: cashFlowMetrics.netCashFlow,
        totalAssets: netWorthSummary.totalAssets,
        totalDebt: netWorthSummary.totalDebt,
        netWorth: netWorthSummary.netWorth,
        monthlyBillsPaid: cashFlowMetrics.monthlyBillExpenses,
        creditRepayments: cashFlowMetrics.creditRepayments,
        loanRepayments: cashFlowMetrics.loanRepayments,
        receivablesCollected: receivablesSummary.totalCollected,
        receivablesOutstanding: receivablesSummary.totalOutstanding,
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
        categoryBreakdown: categoryBreakdown.items,
        transactions: transactionsInPeriod,
      });
      showToast(res.message, res.ok ? 'success' : 'error');
<<<<<<< HEAD
    } catch {
=======
    } catch (err) {
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
      showToast('Failed to export CSV report.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

<<<<<<< HEAD
  // Helper for Doughnut Chart SVG Arcs
  const doughnutSlices = useMemo(() => {
    const total = categoryBreakdown.total;
    if (total <= 0 || categoryBreakdown.items.length === 0) return [];

    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    return categoryBreakdown.items.map((item) => {
      const sliceLength = (item.amount / total) * circumference;
      const strokeDasharray = `${sliceLength} ${circumference}`;
      const strokeDashoffset = -accumulatedOffset;
      accumulatedOffset += sliceLength;

      return {
        ...item,
        radius,
        circumference,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [categoryBreakdown]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-16 w-full max-w-full min-w-0 overflow-hidden text-[#252923] dark:text-[#F3F4F1]">
      {/* =========================================================================
          1. Reports Header Card & Period Filtering
          ========================================================================= */}
      <div
        id="section-analytics"
        className="bg-white dark:bg-[#15221B] rounded-[24px] p-4 sm:p-5 lg:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] space-y-4 scroll-mt-20"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#174F32]/10 dark:bg-[#83C95B]/15 text-[#174F32] dark:text-[#83C95B] flex items-center justify-center shrink-0">
                <BarChart3 className="w-4.5 h-4.5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#252923] dark:text-white tracking-tight">
                Reports & Analytics
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#777D75] dark:text-[#8FA095] mt-1">
              Financial intelligence summarizing transactions, bills, loans, and spending habits.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Month/Year Selector Dropdown */}
            <div className="relative">
              <select
                aria-label="Select report month"
                value={selectedMonthKey}
                onChange={(e) => handleSelectMonth(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] text-[#252923] dark:text-white border border-[#E5E1D8] dark:border-[#243A2C] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#174F32] dark:focus:ring-[#83C95B] cursor-pointer"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#777D75] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Export CSV Report Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting}
              className="px-3.5 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer shrink-0"
              title="Download detailed CSV report of this period"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>
        </div>

        {/* Date-Range Segmented Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-[#F6F4EE] dark:bg-[#131C16] rounded-2xl border border-[#E5E1D8] dark:border-[#223528] overflow-x-auto no-scrollbar">
=======
  return (
    <div className="space-y-4 pb-12 w-full max-w-full min-w-0 overflow-hidden">
      {/* 1. Header & Date Range Filter Toolbar */}
      <div id="section-analytics" className="bg-white dark:bg-neutral-900 rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] space-y-3.5 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-black dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
              <span>Spending Analytics & Reports</span>
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Offline financial intelligence reconciled from your actual transactions
            </p>
          </div>

          {/* Export Report CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold flex items-center gap-1.5 shadow-xs hover:opacity-90 transition-opacity self-start sm:self-auto disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV Report'}</span>
          </button>
        </div>

        {/* Date Range Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          {(
            [
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
<<<<<<< HEAD
              { id: 'last_3_months', label: 'Last 3 Months' },
              { id: 'last_6_months', label: 'Last 6 Months' },
              { id: 'this_year', label: 'This Year' },
              { id: 'custom', label: 'Custom' },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setRangePreset(preset.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                rangePreset === preset.id
                  ? 'bg-[#174F32] text-white shadow-xs'
                  : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
              }`}
            >
              {preset.label}
=======
              { id: 'last_3_months', label: 'Last 3 Mos' },
              { id: 'last_6_months', label: 'Last 6 Mos' },
              { id: 'this_year', label: 'This Year' },
              { id: 'all_time', label: 'All Time' },
              { id: 'custom', label: 'Custom Range' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setRangePreset(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                rangePreset === p.id
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/80 dark:hover:bg-neutral-700'
              }`}
            >
              {p.label}
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
            </button>
          ))}
        </div>

<<<<<<< HEAD
        {/* Custom Start & End Date Inputs */}
        {rangePreset === 'custom' && (
          <div className="p-3.5 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
            <div>
              <label className="block text-[11px] font-bold text-[#61685D] dark:text-[#9EA59B] mb-1">
=======
        {/* Custom Start & End Date Pickers */}
        {rangePreset === 'custom' && (
          <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
<<<<<<< HEAD
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#243A2C] text-xs text-[#252923] dark:text-white font-medium focus:ring-2 focus:ring-[#174F32]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#61685D] dark:text-[#9EA59B] mb-1">
=======
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs text-black dark:text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
<<<<<<< HEAD
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#243A2C] text-xs text-[#252923] dark:text-white font-medium focus:ring-2 focus:ring-[#174F32]"
=======
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs text-black dark:text-white"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              />
            </div>
          </div>
        )}
      </div>

<<<<<<< HEAD
      {/* =========================================================================
          2. Primary Financial Summary Cards (Income, Expenses, Net Cash Flow)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Total Income */}
        <div
          onClick={() => onNavigate?.('transactions')}
          className="group p-4 sm:p-5 rounded-[24px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-[#16A34A]/40 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-[#777D75] dark:text-[#8FA095]">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Total Income</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-[#16A34A] dark:text-[#83C95B] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black tabular-nums text-[#16A34A] dark:text-[#83C95B] mt-2">
              {formatPeso(currentCashFlow.totalIncome, { hide })}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F0ECE1] dark:border-[#1E2E23] flex items-center justify-between text-xs">
            <span className="text-[#777D75] dark:text-[#8FA095] truncate">vs {prevPeriodLabel}</span>
            <span
              className={`font-bold tabular-nums flex items-center gap-0.5 ${
                incomeComparison.isPositive
                  ? 'text-[#16A34A] dark:text-[#83C95B]'
                  : 'text-[#DC2626]'
              }`}
            >
              {incomeComparison.isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {incomeComparison.label}
            </span>
          </div>
        </div>

        {/* Card 2: Total Expenses */}
        <div
          onClick={() => onNavigate?.('transactions')}
          className="group p-4 sm:p-5 rounded-[24px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-red-500/40 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-[#777D75] dark:text-[#8FA095]">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Total Expenses</span>
              <div className="w-7 h-7 rounded-lg bg-red-500/10 text-[#DC2626] flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black tabular-nums text-[#DC2626] mt-2">
              {formatPeso(currentCashFlow.totalExpense, { hide })}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F0ECE1] dark:border-[#1E2E23] flex items-center justify-between text-xs">
            <span className="text-[#777D75] dark:text-[#8FA095] truncate">vs {prevPeriodLabel}</span>
            <span
              className={`font-bold tabular-nums flex items-center gap-0.5 ${
                expenseComparison.pct <= 0
                  ? 'text-[#16A34A] dark:text-[#83C95B]'
                  : 'text-[#DC2626]'
              }`}
            >
              {expenseComparison.pct <= 0 ? (
                <ArrowDownRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowUpRight className="w-3.5 h-3.5" />
              )}
              {expenseComparison.label}
            </span>
          </div>
        </div>

        {/* Card 3: Net Cash Flow */}
        <div
          onClick={() => onNavigate?.('transactions')}
          className="group p-4 sm:p-5 rounded-[24px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-[#174F32]/40 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-[#777D75] dark:text-[#8FA095]">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Net Cash Flow</span>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  currentCashFlow.netCashFlow >= 0
                    ? 'bg-emerald-500/10 text-[#16A34A] dark:text-[#83C95B]'
                    : 'bg-red-500/10 text-[#DC2626]'
                }`}
              >
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-xl sm:text-2xl font-black tabular-nums mt-2 ${
                currentCashFlow.netCashFlow >= 0
                  ? 'text-[#16A34A] dark:text-[#83C95B]'
                  : 'text-[#DC2626]'
              }`}
            >
              {formatPeso(currentCashFlow.netCashFlow, { hide, showPlus: true })}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F0ECE1] dark:border-[#1E2E23] flex items-center justify-between text-xs">
            <span className="text-[#777D75] dark:text-[#8FA095] truncate">Net change</span>
            <span
              className={`font-bold tabular-nums flex items-center gap-0.5 ${
                netCashFlowComparison.improved
                  ? 'text-[#16A34A] dark:text-[#83C95B]'
                  : 'text-[#DC2626]'
              }`}
            >
              {netCashFlowComparison.improved ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {netCashFlowComparison.label}
            </span>
=======
      {/* 2. Primary 9 Summary Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Total Income */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Total Income</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-[#2E9E6B] mt-1 truncate">
            {formatPeso(cashFlowMetrics.totalIncome, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Inflows ({periodLabel})
          </div>
        </div>

        {/* Total Expenses */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Total Expenses</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-[#DC2626] mt-1 truncate">
            {formatPeso(cashFlowMetrics.totalExpense, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Outflows ({periodLabel})
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Net Cash Flow</div>
          <div
            className={`text-base sm:text-lg font-bold tabular-nums mt-1 truncate ${
              cashFlowMetrics.netCashFlow >= 0 ? 'text-[#2E9E6B]' : 'text-[#DC2626]'
            }`}
          >
            {formatPeso(cashFlowMetrics.netCashFlow, { hide, showPlus: true })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Income minus expenses
          </div>
        </div>

        {/* Monthly Bills Expenses */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Monthly Bills Expenses</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-black dark:text-white mt-1 truncate">
            {formatPeso(cashFlowMetrics.monthlyBillExpenses, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Utilities & subscriptions
          </div>
        </div>

        {/* Credit Repayments */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Credit Repayments</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400 mt-1 truncate">
            {formatPeso(cashFlowMetrics.creditRepayments, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Paid towards cards
          </div>
        </div>

        {/* Loan Repayments */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Loan Repayments</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400 mt-1 truncate">
            {formatPeso(cashFlowMetrics.loanRepayments, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Principal & interest paid
          </div>
        </div>

        {/* Outstanding Credit & Loan Balances (Debt) */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Outstanding Total Debt</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-[#DC2626] mt-1 truncate">
            {formatPeso(netWorthSummary.totalDebt, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Credit ({formatPeso(netWorthSummary.creditTotal, { hide, compact: true })}) + Loans ({formatPeso(netWorthSummary.loansTotal, { hide, compact: true })})
          </div>
        </div>

        {/* Receivables Collected */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Receivables Collected</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-[#2E9E6B] mt-1 truncate">
            {formatPeso(receivablesSummary.totalCollected, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Repaid by debtors
          </div>
        </div>

        {/* Receivables Outstanding */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] text-neutral-500 truncate">Receivables Outstanding</div>
          <div className="text-base sm:text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400 mt-1 truncate">
            {formatPeso(receivablesSummary.totalOutstanding, { hide })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Money owed to you
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          </div>
        </div>
      </div>

<<<<<<< HEAD
      {/* =========================================================================
          3. Secondary Financial Summary Cards (Bills, Loans, Debt, Receivables)
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Card A: Monthly Bills */}
        <div
          onClick={() => onNavigate?.('bills')}
          className="p-3.5 sm:p-4 rounded-[22px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#174F32]/40 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-[#777D75] dark:text-[#8FA095] text-[11px] font-semibold">
              <span className="truncate">Monthly Bills</span>
              <Receipt className="w-3.5 h-3.5 text-[#174F32] dark:text-[#83C95B] shrink-0" />
            </div>
            <div className="text-base sm:text-lg font-black tabular-nums text-[#252923] dark:text-white mt-1">
              {formatPeso(billsSummary.billedTotal, { hide })}
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095] mt-0.5 truncate">
              {formatPeso(billsSummary.paidTotal, { hide })} paid · {formatPeso(billsSummary.unpaidTotal, { hide })} unpaid
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#F0ECE1] dark:border-[#1E2E23]">
            <div className="flex justify-between items-center text-[10px] mb-1">
              <span className="text-[#777D75]">{billsSummary.paidCount} of {billsSummary.totalCount} settled</span>
              <span className="font-bold text-[#16A34A] dark:text-[#83C95B]">{billsSummary.paidPercent.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#E8E4DA] dark:bg-[#1E2E23] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#16A34A] dark:bg-[#83C95B] rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, billsSummary.paidPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card B: Loan Repayments */}
        <div
          onClick={() => onNavigate?.('debt-planner')}
          className="p-3.5 sm:p-4 rounded-[22px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#174F32]/40 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-[#777D75] dark:text-[#8FA095] text-[11px] font-semibold">
              <span className="truncate">Loan Repayments</span>
              <HandCoins className="w-3.5 h-3.5 text-[#174F32] dark:text-[#83C95B] shrink-0" />
            </div>
            <div className="text-base sm:text-lg font-black tabular-nums text-[#174F32] dark:text-[#83C95B] mt-1">
              {formatPeso(currentCashFlow.loanRepayments, { hide })}
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095] mt-0.5 truncate">
              Paid in period ({periodLabel})
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#F0ECE1] dark:border-[#1E2E23] text-[10px] flex items-center justify-between">
            <span className="text-[#777D75]">Remaining balance:</span>
            <span className="font-bold tabular-nums text-[#252923] dark:text-white">
              {formatPeso(netWorthSummary.loansTotal, { hide, compact: true })}
            </span>
          </div>
        </div>

        {/* Card C: Outstanding Total Debt */}
        <div
          onClick={() => onNavigate?.('debt-planner')}
          className="p-3.5 sm:p-4 rounded-[22px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-red-500/40 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-[#777D75] dark:text-[#8FA095] text-[11px] font-semibold">
              <span className="truncate">Outstanding Debt</span>
              <CreditCard className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
            </div>
            <div className="text-base sm:text-lg font-black tabular-nums text-[#DC2626] mt-1">
              {formatPeso(netWorthSummary.totalDebt, { hide })}
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095] mt-0.5 truncate">
              Cards: {formatPeso(netWorthSummary.creditTotal, { hide, compact: true })} · Loans: {formatPeso(netWorthSummary.loansTotal, { hide, compact: true })}
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#F0ECE1] dark:border-[#1E2E23] text-[10px] flex items-center justify-between">
            <span className="text-[#777D75]">Status:</span>
            <span className={`font-bold ${netWorthSummary.totalDebt === 0 ? 'text-[#16A34A]' : 'text-amber-600 dark:text-amber-400'}`}>
              {netWorthSummary.totalDebt === 0 ? 'Debt Free' : 'Active Obligations'}
            </span>
          </div>
        </div>

        {/* Card D: Receivables (Money Owed) */}
        <div
          onClick={() => onNavigate?.('accounts')}
          className="p-3.5 sm:p-4 rounded-[22px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#174F32]/40 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-[#777D75] dark:text-[#8FA095] text-[11px] font-semibold">
              <span className="truncate">Receivables</span>
              <PiggyBank className="w-3.5 h-3.5 text-[#174F32] dark:text-[#83C95B] shrink-0" />
            </div>
            <div className="text-base sm:text-lg font-black tabular-nums text-[#174F32] dark:text-[#83C95B] mt-1">
              {formatPeso(receivablesInPeriod.totalOutstanding, { hide })}
            </div>
            <div className="text-[10px] text-[#777D75] dark:text-[#8FA095] mt-0.5 truncate">
              Owed by {receivablesInPeriod.activeCount} debtors
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#F0ECE1] dark:border-[#1E2E23] text-[10px] flex items-center justify-between">
            <span className="text-[#777D75]">Collected in period:</span>
            <span className="font-bold tabular-nums text-[#16A34A] dark:text-[#83C95B]">
              {formatPeso(receivablesInPeriod.collectedInPeriod, { hide, compact: true })}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. Income vs. Expenses Trend Chart
          ========================================================================= */}
      <div
        id="section-cashflow"
        className="bg-white dark:bg-[#15221B] rounded-[24px] p-4.5 sm:p-5 lg:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] space-y-4 scroll-mt-20"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#252923] dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-[#174F32] dark:text-[#83C95B]" />
              <span>Income vs. Expenses Trend</span>
            </h2>
            <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
              Cash inflows compared with cash outflows in {periodLabel}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto text-xs">
            {/* Monthly View Badge */}
            <div className="flex items-center p-0.5 bg-[#F6F4EE] dark:bg-[#131C16] rounded-xl border border-[#E5E1D8] dark:border-[#223528]">
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#174F32] dark:bg-[#1E382A] text-white dark:text-[#83C95B] shadow-2xs">
                Monthly
              </span>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-medium text-[#252923] dark:text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] dark:bg-[#83C95B] inline-block shrink-0" />
                Income
              </span>
              <span className="flex items-center gap-1.5 font-medium text-[#252923] dark:text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] inline-block shrink-0" />
                Expenses
              </span>
            </div>
          </div>
        </div>

        {/* Bar Chart Visualization */}
        {timeSeriesData.buckets.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#777D75] dark:text-[#8FA095] space-y-2">
            <BarChart3 className="w-8 h-8 mx-auto text-[#777D75]/40" />
            <p>No transaction activity recorded for this period.</p>
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            {/* Hover Tooltip Card if hovering */}
            {hoveredBucketIndex !== null && timeSeriesData.buckets[hoveredBucketIndex] && (
              <div className="p-2.5 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] flex items-center justify-between text-xs animate-fadeIn">
                <div className="font-bold text-[#252923] dark:text-white">
                  {timeSeriesData.buckets[hoveredBucketIndex].label}
                </div>
                <div className="flex items-center gap-4 tabular-nums text-xs">
                  <span className="text-[#16A34A] dark:text-[#83C95B]">
                    + {formatPeso(timeSeriesData.buckets[hoveredBucketIndex].income, { hide })}
                  </span>
                  <span className="text-[#DC2626]">
                    - {formatPeso(timeSeriesData.buckets[hoveredBucketIndex].expense, { hide })}
                  </span>
                  <span className="font-bold text-[#252923] dark:text-white">
                    Net: {formatPeso(subPHP(timeSeriesData.buckets[hoveredBucketIndex].income, timeSeriesData.buckets[hoveredBucketIndex].expense), { hide, showPlus: true })}
                  </span>
                </div>
              </div>
            )}

            {/* Bars Area with Y-Axis Gridlines */}
            <div className="relative h-44 w-full flex items-end pt-4 pb-1 border-b border-[#E5E1D8] dark:border-[#223528]">
              {/* Horizontal Background Guides */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-30">
                <div className="border-b border-dashed border-[#777D75]/40 w-full" />
                <div className="border-b border-dashed border-[#777D75]/40 w-full" />
                <div className="border-b border-dashed border-[#777D75]/40 w-full" />
                <div className="w-full" />
              </div>

              {/* Bar Columns Container */}
              <div
                className={`relative z-10 w-full h-full flex items-end ${
                  timeSeriesData.buckets.length <= 1 ? 'justify-center' : 'justify-between'
                } gap-1 sm:gap-2 px-1`}
              >
                {timeSeriesData.buckets.map((b, idx) => {
                  const incH = Math.max(
                    b.income > 0 ? 8 : 2,
                    Math.round((b.income / timeSeriesData.maxVal) * 135)
                  );
                  const expH = Math.max(
                    b.expense > 0 ? 8 : 2,
                    Math.round((b.expense / timeSeriesData.maxVal) * 135)
                  );
                  const isHovered = hoveredBucketIndex === idx;

                  return (
                    <div
                      key={`bucket_${b.key}_${idx}`}
                      onMouseEnter={() => setHoveredBucketIndex(idx)}
                      onMouseLeave={() => setHoveredBucketIndex(null)}
                      className={`flex-1 ${
                        timeSeriesData.buckets.length <= 1 ? 'max-w-[72px]' : ''
                      } flex flex-col items-center justify-end h-full min-w-0 transition-opacity cursor-pointer ${
                        hoveredBucketIndex !== null && !isHovered ? 'opacity-40' : 'opacity-100'
                      }`}
                    >
                      <div className="flex items-end gap-1 sm:gap-1.5 h-36">
                        {/* Income Bar */}
                        <div
                          className="w-2 sm:w-3.5 bg-[#16A34A] dark:bg-[#83C95B] rounded-t-sm sm:rounded-t-md transition-all duration-300 hover:brightness-110"
                          style={{ height: `${incH}px` }}
                          title={`Inflow: ${formatPeso(b.income, { hide })}`}
                        />
                        {/* Expense Bar */}
                        <div
                          className="w-2 sm:w-3.5 bg-[#DC2626] rounded-t-sm sm:rounded-t-md transition-all duration-300 hover:brightness-110"
                          style={{ height: `${expH}px` }}
                          title={`Outflow: ${formatPeso(b.expense, { hide })}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-Axis Labels */}
            <div
              className={`flex ${
                timeSeriesData.buckets.length <= 1 ? 'justify-center' : 'justify-between'
              } gap-1 px-1 pt-1 text-center`}
            >
              {timeSeriesData.buckets.map((b, idx) => {
                // Show fewer labels on narrow screens to prevent overlap
                const shouldShow =
                  timeSeriesData.buckets.length <= 12 ||
                  idx === 0 ||
                  idx === timeSeriesData.buckets.length - 1 ||
                  idx % Math.ceil(timeSeriesData.buckets.length / 8) === 0;

                return (
                  <div
                    key={`label_${b.key}_${idx}`}
                    className={`flex-1 ${
                      timeSeriesData.buckets.length <= 1 ? 'max-w-[72px]' : ''
                    } text-[10px] font-medium text-[#777D75] dark:text-[#8FA095] truncate`}
                  >
                    {shouldShow ? b.label : ''}
=======
      {/* 3. Cash Flow Chart: Inflow vs Outflow */}
      <div id="section-cashflow" className="bg-white dark:bg-neutral-900 rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] space-y-3.5 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-black dark:text-white">
              Income vs. Expenses Trend
            </h2>
            <p className="text-xs text-neutral-500">
              Inflows vs Outflows in {periodLabel}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#2E9E6B] inline-block shrink-0" />
              Inflow
            </span>
            <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#DC2626] inline-block shrink-0" />
              Outflow
            </span>
          </div>
        </div>

        {timeSeriesBuckets.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400">
            No transactions found for this date range.
          </div>
        ) : (
          <div className="pt-2 w-full overflow-hidden">
            <div className="flex items-end justify-between gap-1 sm:gap-2 h-36 pt-4 px-1 sm:px-2 border-b border-neutral-100 dark:border-neutral-800">
              {timeSeriesBuckets.map((bucket, idx) => {
                const incHeight = Math.max(
                  bucket.income > 0 ? 8 : 2,
                  Math.round((bucket.income / maxBucketValue) * 110)
                );
                const expHeight = Math.max(
                  bucket.expense > 0 ? 8 : 2,
                  Math.round((bucket.expense / maxBucketValue) * 110)
                );
                return (
                  <div
                    key={`${bucket.label}_${idx}`}
                    className="flex-1 flex flex-col items-center justify-end h-full min-w-0"
                  >
                    <div className="flex items-end gap-1 sm:gap-1.5 h-28">
                      <div
                        className="w-2.5 sm:w-4 bg-[#2E9E6B] rounded-t-sm sm:rounded-t-md transition-all duration-300"
                        style={{ height: `${incHeight}px` }}
                        title={`Inflow: ${formatPeso(bucket.income, { hide })}`}
                      />
                      <div
                        className="w-2.5 sm:w-4 bg-[#DC2626] rounded-t-sm sm:rounded-t-md transition-all duration-300"
                        style={{ height: `${expHeight}px` }}
                        title={`Outflow: ${formatPeso(bucket.expense, { hide })}`}
                      />
                    </div>
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                  </div>
                );
              })}
            </div>
<<<<<<< HEAD
=======
            <div className="flex justify-between gap-1 sm:gap-2 pt-2 px-1 text-center">
              {timeSeriesBuckets.map((bucket, idx) => (
                <div
                  key={`lbl_${bucket.label}_${idx}`}
                  className="flex-1 text-[10px] sm:text-[11px] font-medium text-neutral-500 truncate"
                >
                  {bucket.label}
                </div>
              ))}
            </div>
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          </div>
        )}
      </div>

<<<<<<< HEAD
      {/* =========================================================================
          5. Spending Breakdown by Category (Doughnut) & Top Categories
          ========================================================================= */}
      <div id="section-breakdown" className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 scroll-mt-20">
        {/* Doughnut Chart Card (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#15221B] rounded-[24px] p-4.5 sm:p-5 lg:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#252923] dark:text-white flex items-center gap-2">
                <PieChart className="w-4.5 h-4.5 text-[#174F32] dark:text-[#83C95B]" />
                <span>Spending Breakdown by Category</span>
              </h2>
              <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
                Total spent: {formatPeso(categoryBreakdown.total, { hide })}
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#F6F4EE] dark:bg-[#1A2A20] text-[#777D75] dark:text-[#8FA095]">
=======
      {/* 4. Spending Breakdown by Category & Top Categories */}
      <div id="section-breakdown" className="grid grid-cols-1 md:grid-cols-12 gap-3.5 scroll-mt-20">
        {/* Category Breakdown (md:col-span-7) */}
        <div className="md:col-span-7 bg-white dark:bg-neutral-900 rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-black dark:text-white">
                Spending Breakdown by Category
              </h2>
              <p className="text-xs text-neutral-500">
                Total spent: {formatPeso(categoryBreakdown.total, { hide })}
              </p>
            </div>
            <span className="text-xs font-bold text-neutral-400">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              {categoryBreakdown.items.length} categories
            </span>
          </div>

          {categoryBreakdown.items.length === 0 ? (
<<<<<<< HEAD
            <div className="py-12 text-center text-xs text-[#777D75] dark:text-[#8FA095] space-y-2">
              <PieChart className="w-8 h-8 mx-auto text-[#777D75]/40" />
              <p>No expenses recorded in this period.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center pt-2">
              {/* Left Zone: SVG Doughnut Visual with Total in Center */}
              <div className="md:col-span-5 flex flex-col items-center justify-center">
                <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 180 180">
                    {/* Background Track */}
                    <circle
                      cx="90"
                      cy="90"
                      r="70"
                      className="stroke-[#E8E4DA] dark:stroke-[#1E2E23]"
                      strokeWidth="20"
                      fill="transparent"
                    />
                    {/* Colored Category Slices */}
                    {doughnutSlices.map((slice) => {
                      const isHovered = hoveredCategory === slice.category;
                      return (
                        <circle
                          key={slice.category}
                          cx="90"
                          cy="90"
                          r="70"
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth={isHovered ? 24 : 20}
                          strokeDasharray={slice.strokeDasharray}
                          strokeDashoffset={slice.strokeDashoffset}
                          strokeLinecap="butt"
                          className="transition-all duration-300 cursor-pointer"
                          onMouseEnter={() => setHoveredCategory(slice.category)}
                          onMouseLeave={() => setHoveredCategory(null)}
                        />
                      );
                    })}
                  </svg>

                  {/* Center Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
                    <span className="text-[10px] uppercase font-bold text-[#777D75] dark:text-[#8FA095] tracking-wider truncate max-w-[110px]">
                      {hoveredCategory || 'Total Spent'}
                    </span>
                    <span className="text-sm sm:text-base font-black tabular-nums text-[#252923] dark:text-white truncate max-w-[120px] mt-0.5">
                      {formatPeso(
                        hoveredCategory
                          ? categoryBreakdown.items.find((i) => i.category === hoveredCategory)?.amount || 0
                          : categoryBreakdown.total,
                        { hide }
                      )}
                    </span>
                    {hoveredCategory && (
                      <span className="text-[10px] font-bold text-[#174F32] dark:text-[#83C95B]">
                        {(
                          categoryBreakdown.items.find((i) => i.category === hoveredCategory)?.percent || 0
                        ).toFixed(1)}
                        %
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Zone: Category Breakdown Progress Rows */}
              <div className="md:col-span-7 space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {categoryBreakdown.items.map((item) => {
                  const isHovered = hoveredCategory === item.category;
                  return (
                    <div
                      key={item.category}
                      onMouseEnter={() => setHoveredCategory(item.category)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        isHovered ? 'bg-[#F6F4EE] dark:bg-[#1A2A20]' : 'hover:bg-[#F9F8F5] dark:hover:bg-[#16241C]'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-semibold text-[#252923] dark:text-white truncate">
                            {item.category}
                          </span>
                        </div>
                        <div className="tabular-nums font-bold text-[#252923] dark:text-white shrink-0 ml-2">
                          {formatPeso(item.amount, { hide })}
                          <span className="text-[11px] text-[#777D75] dark:text-[#8FA095] font-normal ml-1.5">
                            ({item.percent.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-[#E8E4DA] dark:bg-[#1E2E23] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, item.percent)}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Top Spending Categories Card (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#15221B] rounded-[24px] p-4.5 sm:p-5 lg:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#252923] dark:text-white">
                  Top Spending Categories
                </h3>
                <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
                  Ranked by highest actual expenses
                </p>
              </div>
            </div>

            {topCategories.length === 0 ? (
              <p className="text-xs text-[#777D75] py-8 text-center">No expenses recorded.</p>
            ) : (
              <div className="space-y-2 mt-3.5">
                {topCategories.map((c, idx) => (
                  <div
                    key={c.category}
                    className="p-2.5 rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-[#174F32] dark:bg-[#1E3B2B] text-white dark:text-[#86EFAC] text-[10px] font-bold flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="text-[#174F32] dark:text-[#83C95B]">
                        {getCategoryIcon(c.category)}
                      </div>
                      <span className="font-semibold text-[#252923] dark:text-white truncate">
                        {c.category}
                      </span>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <div className="font-bold tabular-nums text-[#252923] dark:text-white">
                        {formatPeso(c.amount, { hide })}
                      </div>
                      <div className="text-[10px] text-[#777D75] dark:text-[#8FA095]">
                        {c.percent.toFixed(1)}% of expenses
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {categoryBreakdown.items.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllTopCategories((prev) => !prev)}
              className="w-full py-2 text-center text-xs font-bold text-[#174F32] dark:text-[#83C95B] hover:underline cursor-pointer pt-2"
            >
              {showAllTopCategories
                ? 'Show Top 5 Only'
                : `View All ${categoryBreakdown.items.length} Categories`}
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          6. Monthly Comparison & Budget vs Actual Spending
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
        {/* Monthly Comparison Card (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#15221B] rounded-[24px] p-4.5 sm:p-5 lg:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] space-y-3.5">
          <div>
            <h3 className="text-base font-bold text-[#252923] dark:text-white">
              Monthly Comparison
            </h3>
            <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
              {periodLabel} vs. {prevPeriodLabel}
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {/* Comparison Row 1: Expenses */}
            <div className="p-3 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-[#777D75] dark:text-[#8FA095]">
                <span className="font-semibold">Expenses</span>
                <span
                  className={`font-bold tabular-nums flex items-center gap-0.5 ${
                    expenseComparison.pct <= 0
                      ? 'text-[#16A34A] dark:text-[#83C95B]'
                      : 'text-[#DC2626]'
                  }`}
                >
                  {expenseComparison.pct <= 0 ? (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  )}
                  {expenseComparison.label}
                </span>
              </div>
              <div className="flex justify-between items-center tabular-nums">
                <span className="text-[#252923] dark:text-white font-bold">
                  {formatPeso(currentCashFlow.totalExpense, { hide })}
                </span>
                <span className="text-[#777D75] text-[11px]">
                  Prev: {formatPeso(prevCashFlow.totalExpense, { hide })}
                </span>
              </div>
            </div>

            {/* Comparison Row 2: Income */}
            <div className="p-3 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-[#777D75] dark:text-[#8FA095]">
                <span className="font-semibold">Income</span>
                <span
                  className={`font-bold tabular-nums flex items-center gap-0.5 ${
                    incomeComparison.isPositive
                      ? 'text-[#16A34A] dark:text-[#83C95B]'
                      : 'text-[#DC2626]'
                  }`}
                >
                  {incomeComparison.isPositive ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {incomeComparison.label}
                </span>
              </div>
              <div className="flex justify-between items-center tabular-nums">
                <span className="text-[#16A34A] dark:text-[#83C95B] font-bold">
                  {formatPeso(currentCashFlow.totalIncome, { hide })}
                </span>
                <span className="text-[#777D75] text-[11px]">
                  Prev: {formatPeso(prevCashFlow.totalIncome, { hide })}
                </span>
              </div>
            </div>

            {/* Comparison Row 3: Net Cash Flow */}
            <div className="p-3 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-[#777D75] dark:text-[#8FA095]">
                <span className="font-semibold">Net Cash Flow Delta</span>
                <span
                  className={`font-bold tabular-nums flex items-center gap-0.5 ${
                    netCashFlowComparison.improved
                      ? 'text-[#16A34A] dark:text-[#83C95B]'
                      : 'text-[#DC2626]'
                  }`}
                >
                  {netCashFlowComparison.improved ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {netCashFlowComparison.label}
                </span>
              </div>
              <div className="flex justify-between items-center tabular-nums">
                <span
                  className={`font-bold ${
                    currentCashFlow.netCashFlow >= 0
                      ? 'text-[#16A34A] dark:text-[#83C95B]'
                      : 'text-[#DC2626]'
                  }`}
                >
                  {formatPeso(currentCashFlow.netCashFlow, { hide, showPlus: true })}
                </span>
                <span className="text-[#777D75] text-[11px]">
                  Prev: {formatPeso(prevCashFlow.netCashFlow, { hide, showPlus: true })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Budget vs. Actual Spending Card (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#15221B] rounded-[24px] p-4.5 sm:p-5 lg:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#252923] dark:text-white flex items-center gap-2">
                <PieChart className="w-4.5 h-4.5 text-[#174F32] dark:text-[#83C95B]" />
                <span>Budget vs. Actual Spending</span>
              </h3>
              <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
                Allocated for {formatMonthLabel(activeBudgetMonthKey)}: {formatPeso(budgetSummary.totalBudget, { hide })}
              </p>
            </div>

            {budgetSummary.totalBudget > 0 && (
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold tabular-nums ${
                  budgetSummary.overallStatus === 'exceeded'
                    ? 'bg-red-500/15 text-[#DC2626]'
                    : budgetSummary.overallStatus === 'warning'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-500/15 text-[#16A34A] dark:text-[#83C95B]'
                }`}
              >
                {budgetSummary.overallPercent.toFixed(0)}% utilized
              </span>
            )}
          </div>

          {budgetSummary.categoryBreakdown.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#777D75] dark:text-[#8FA095] space-y-2.5">
              <p>No budget limits configured for {formatMonthLabel(activeBudgetMonthKey)}.</p>
              <button
                type="button"
                onClick={() => onNavigate?.('budgets')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <span>Configure Monthly Budgets</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {budgetSummary.categoryBreakdown.map((cb) => (
                <div
                  key={cb.category}
                  className="p-3 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] space-y-1.5"
                >
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="text-[#174F32] dark:text-[#83C95B]">
                        {getCategoryIcon(cb.category)}
                      </div>
                      <span className="font-bold text-[#252923] dark:text-white truncate">
                        {cb.category}
                      </span>
                    </div>
                    <span className="tabular-nums font-semibold text-[#61685D] dark:text-[#9EA59B] shrink-0 ml-1">
                      {formatPeso(cb.spent, { hide })} / {formatPeso(cb.limit, { hide })}
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-[#E8E4DA] dark:bg-[#1E2E23] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        cb.status === 'exceeded'
                          ? 'bg-[#DC2626]'
                          : cb.status === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-[#16A34A] dark:bg-[#83C95B]'
                      }`}
                      style={{ width: `${Math.min(100, cb.percent)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-[#777D75] dark:text-[#8FA095]">
                    <span>
                      {cb.remaining >= 0 ? `${formatPeso(cb.remaining, { hide })} left` : `${formatPeso(Math.abs(cb.remaining), { hide })} over`}
                    </span>
                    <span
                      className={`font-bold tabular-nums ${
                        cb.status === 'exceeded'
                          ? 'text-[#DC2626]'
                          : cb.status === 'warning'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-[#16A34A] dark:text-[#83C95B]'
                      }`}
                    >
                      {cb.percent.toFixed(0)}%
                    </span>
                  </div>
=======
            <p className="text-xs text-neutral-400 py-6 text-center">
              No expenses recorded in this period.
            </p>
          ) : (
            <div className="space-y-2.5 pt-1">
              {categoryBreakdown.items.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-black dark:text-white">
                      {item.category}
                    </span>
                    <span className="font-bold tabular-nums text-black dark:text-white">
                      {formatPeso(item.amount, { hide })}
                      <span className="text-[11px] text-neutral-400 font-normal ml-1.5">
                        ({item.percent.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neutral-950 dark:bg-white rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, item.percent)}%` }}
                    />
                  </div>
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                </div>
              ))}
            </div>
          )}
        </div>
<<<<<<< HEAD
      </div>

      {/* =========================================================================
          7. Recent Transactions in Period
          ========================================================================= */}
      <div className="bg-white dark:bg-[#15221B] rounded-[24px] p-4.5 sm:p-5 lg:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#252923] dark:text-white flex items-center gap-2">
              <Receipt className="w-4.5 h-4.5 text-[#174F32] dark:text-[#83C95B]" />
              <span>Recent Transactions</span>
            </h3>
            <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
              Latest transaction records in {periodLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate?.('transactions')}
            className="text-xs font-bold text-[#174F32] dark:text-[#83C95B] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactionsInPeriod.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#777D75] dark:text-[#8FA095] space-y-2">
            <Receipt className="w-8 h-8 mx-auto text-[#777D75]/40" />
            <p>No transactions found for this date range.</p>
            {onOpenAddTransaction && (
              <button
                type="button"
                onClick={() => onOpenAddTransaction('expense')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Record</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#EAE7DF] dark:divide-[#1E2E23]">
            {recentTransactionsInPeriod.map((tx) => {
              const acc = reconciledAccounts.find((a) => a.id === tx.accountId);
              const destAcc = tx.destinationAccountId
                ? reconciledAccounts.find((a) => a.id === tx.destinationAccountId)
                : undefined;

              const isPositive =
                tx.type === 'income' ||
                (tx.type === 'adjustment' && tx.adjustmentSign !== 'negative');
              const isNegative =
                tx.type === 'expense' ||
                (tx.type === 'adjustment' && tx.adjustmentSign === 'negative');

              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => onSelectTransaction?.(tx)}
                  className="w-full py-3 first:pt-1 last:pb-1 text-left hover:bg-[#F6F4EE]/70 dark:hover:bg-[#1A2A20]/60 rounded-xl transition-colors min-w-0 overflow-hidden block cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[11px] text-[#777D75] dark:text-[#8FA095] mb-1">
                    <span>{formatTransactionDateTime(tx.dateTime)}</span>
                    <span className="truncate ml-2 max-w-[50%] text-right font-medium">
                      {acc?.name}
                      {destAcc ? ` → ${destAcc.name}` : ` · ${tx.category}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <ProviderLogo
                        providerId={acc?.providerId || 'custom'}
                        name={acc?.name || tx.category}
                        customColor={acc?.customColor}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-bold text-[#252923] dark:text-white truncate">
                          {tx.merchantOrTitle}
                        </div>
                        {tx.notes && (
                          <div className="text-[10px] text-[#777D75] dark:text-[#8FA095] truncate">
                            {tx.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className={`text-xs sm:text-sm font-extrabold tabular-nums shrink-0 ${
                        isPositive
                          ? 'text-[#16A34A] dark:text-[#83C95B]'
                          : isNegative
                          ? 'text-[#DC2626]'
                          : 'text-[#252923] dark:text-white'
                      }`}
                    >
                      {isPositive ? '+' : isNegative ? '-' : ''}
                      {formatPeso(tx.amount, { hide })}
                    </div>
                  </div>
                </button>
              );
            })}
=======

        {/* Top 5 Categories & Month Comparison (md:col-span-5) */}
        <div className="md:col-span-5 space-y-3.5">
          {/* Top Categories Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] space-y-3">
            <h3 className="text-sm font-bold text-black dark:text-white">
              Top Spending Categories
            </h3>
            {topCategories.length === 0 ? (
              <p className="text-xs text-neutral-400 py-2">No expenses recorded.</p>
            ) : (
              <div className="space-y-2">
                {topCategories.map((c, idx) => (
                  <div
                    key={c.category}
                    className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-black dark:text-white">
                        {c.category}
                      </span>
                    </div>
                    <span className="font-bold tabular-nums text-black dark:text-white">
                      {formatPeso(c.amount, { hide })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Month-to-Month Comparison Delta Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] space-y-2.5">
            <h3 className="text-sm font-bold text-black dark:text-white">
              Month-to-Month Comparison
            </h3>
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 space-y-2 text-xs">
              <div className="flex justify-between items-center text-neutral-500">
                <span>
                  Expenses ({formatMonthLabel(monthComparison.curMonthKey)} vs{' '}
                  {formatMonthLabel(monthComparison.prevMonthKey)}):
                </span>
                <span
                  className={`font-bold tabular-nums flex items-center gap-0.5 ${
                    monthComparison.expenseDelta <= 0
                      ? 'text-[#2E9E6B]'
                      : 'text-[#DC2626]'
                  }`}
                >
                  {monthComparison.expenseDelta <= 0 ? (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  )}
                  {formatPeso(Math.abs(monthComparison.expenseDelta), { hide })}
                </span>
              </div>

              <div className="flex justify-between items-center text-neutral-500">
                <span>Income Delta:</span>
                <span
                  className={`font-bold tabular-nums flex items-center gap-0.5 ${
                    monthComparison.incomeDelta >= 0
                      ? 'text-[#2E9E6B]'
                      : 'text-[#DC2626]'
                  }`}
                >
                  {formatPeso(monthComparison.incomeDelta, { hide, showPlus: true })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Budget vs Actual Spending Comparison */}
      <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-black/[0.04] dark:border-white/[0.06] space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-black dark:text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-neutral-500" />
              <span>Budget vs. Actual Spending ({formatMonthLabel(activeMonthKey)})</span>
            </h2>
            <p className="text-xs text-neutral-500">
              Total Budget: {formatPeso(budgetSummary.totalBudget, { hide })} • Spent:{' '}
              {formatPeso(budgetSummary.totalSpent, { hide })}
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              budgetSummary.overallStatus === 'exceeded'
                ? 'bg-red-500/10 text-[#DC2626]'
                : budgetSummary.overallStatus === 'warning'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 text-[#2E9E6B]'
            }`}
          >
            {budgetSummary.overallPercent.toFixed(0)}% utilized
          </span>
        </div>

        {budgetSummary.categoryBreakdown.length === 0 ? (
          <p className="text-xs text-neutral-400 py-3">
            No category limits configured for {formatMonthLabel(activeMonthKey)}. Go to Budgets tab to set up spending limits.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {budgetSummary.categoryBreakdown.map((cb) => (
              <div
                key={cb.category}
                className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1.5"
              >
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-black dark:text-white">
                    {cb.category}
                  </span>
                  <span className="tabular-nums text-neutral-600 dark:text-neutral-300">
                    {formatPeso(cb.spent, { hide })} / {formatPeso(cb.limit, { hide })}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      cb.status === 'exceeded'
                        ? 'bg-[#DC2626]'
                        : cb.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-[#2E9E6B]'
                    }`}
                    style={{ width: `${Math.min(100, cb.percent)}%` }}
                  />
                </div>
              </div>
            ))}
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          </div>
        )}
      </div>
    </div>
  );
};
