import { Capacitor, registerPlugin } from '@capacitor/core';
import { TransactionRecord } from '../types/finance';
import { formatPeso, getMonthKey } from '../utils/currency';

export interface WidgetFinancialData {
  isLoggedIn: boolean;
  userName?: string;
  currencySymbol?: string;
  incomeAmount: string;
  expenseAmount: string;
  netCashFlow: string;
  incomePercent: string;
  expensePercent: string;
  sparklinePoints?: number[];
  quickExpenseAmount?: string;
  quickExpenseCategory?: string;
}

export interface WidgetActionData {
  action: 'open_action' | 'quick_expense' | 'open_tab' | 'open_app' | string;
  target?: string;
  payload?: {
    amount?: string | number;
    category?: string;
    mode?: string;
    [key: string]: any;
  };
}

interface PesoTrackWidgetNativePlugin {
  updateWidgetData(options: {
    isLoggedIn: boolean;
    userName?: string;
    currencySymbol?: string;
    incomeAmount?: string;
    expenseAmount?: string;
    netCashFlow?: string;
    incomePercent?: string;
    expensePercent?: string;
    sparklinePoints?: string;
    quickExpenseAmount?: string;
    quickExpenseCategory?: string;
  }): Promise<{ success: boolean }>;

  getPendingWidgetAction(): Promise<{
    hasAction: boolean;
    action?: string;
    target?: string;
    payload?: any;
  }>;

  clearPendingWidgetAction(): Promise<{ success: boolean }>;
  clearWidgetData(): Promise<{ success: boolean }>;

  addListener(
    eventName: 'widgetActionReceived',
    listenerFunc: (data: WidgetActionData) => void
  ): Promise<any>;
}

const NativeWidgetPlugin = registerPlugin<PesoTrackWidgetNativePlugin>('PesoTrackWidget');

/**
 * Checks if running on a native Android device with native widget support.
 */
export function isNativeWidgetSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/**
 * Updates the native Android widgets (Quick Actions, Financial Overview, Quick Expense)
 * with real calculated financial data.
 */
export async function syncWidgetFinancialData(data: WidgetFinancialData): Promise<void> {
  if (!isNativeWidgetSupported()) {
    return;
  }

  try {
    await NativeWidgetPlugin.updateWidgetData({
      isLoggedIn: data.isLoggedIn,
      userName: data.userName || '',
      currencySymbol: data.currencySymbol || '₱',
      incomeAmount: data.incomeAmount,
      expenseAmount: data.expenseAmount,
      netCashFlow: data.netCashFlow,
      incomePercent: data.incomePercent,
      expensePercent: data.expensePercent,
      sparklinePoints: data.sparklinePoints ? JSON.stringify(data.sparklinePoints) : undefined,
      quickExpenseAmount: data.quickExpenseAmount || '₱250.00',
      quickExpenseCategory: data.quickExpenseCategory || 'Food',
    });
  } catch (err) {
    // Non-fatal warning if widget provider is not currently bound
    console.warn('[PesoTrack Widget] syncWidgetFinancialData notice:', err);
  }
}

/**
 * Clears cached financial overview data from native widgets (used on logout).
 */
export async function clearNativeWidgetData(): Promise<void> {
  if (!isNativeWidgetSupported()) {
    return;
  }

  try {
    await NativeWidgetPlugin.clearWidgetData();
  } catch (err) {
    console.warn('[PesoTrack Widget] clearNativeWidgetData notice:', err);
  }
}

/**
 * Retrieves any pending widget click action that launched the app from Android launcher.
 */
export async function getPendingWidgetAction(): Promise<WidgetActionData | null> {
  if (!isNativeWidgetSupported()) {
    return null;
  }

  try {
    const res = await NativeWidgetPlugin.getPendingWidgetAction();
    if (res && res.hasAction && res.action) {
      return {
        action: res.action,
        target: res.target,
        payload: res.payload,
      };
    }
    return null;
  } catch (err) {
    console.warn('[PesoTrack Widget] getPendingWidgetAction notice:', err);
    return null;
  }
}

/**
 * Registers a live listener for incoming widget clicks while the app is active in foreground/background.
 */
export function registerWidgetActionListener(
  handler: (actionData: WidgetActionData) => void
): () => void {
  if (!isNativeWidgetSupported()) {
    return () => {};
  }

  let handle: any = null;
  NativeWidgetPlugin.addListener('widgetActionReceived', (data: WidgetActionData) => {
    if (data && data.action) {
      handler(data);
    }
  }).then((h) => {
    handle = h;
  }).catch(() => {});

  return () => {
    if (handle && typeof handle.remove === 'function') {
      handle.remove();
    }
  };
}

/**
 * Computes monthly financial summary and sparkline data points from transaction list
 * strictly using existing financial calculation conventions.
 */
export function computeWidgetMetrics(
  transactions: TransactionRecord[],
  isLoggedIn: boolean,
  userName?: string
): WidgetFinancialData {
  const currentMonthKey = getMonthKey(); // e.g. "2026-10"

  // Compute previous month key (e.g. "2026-09")
  const [currY, currM] = currentMonthKey.split('-').map(Number);
  const prevDate = new Date(currY, currM - 2, 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  let currentIncome = 0;
  let currentExpense = 0;
  let prevIncome = 0;
  let prevExpense = 0;

  // Track daily cumulative net cash flow points for sparkline curve
  const daysInMonth = new Date(currY, currM, 0).getDate();
  const currentDay = Math.min(new Date().getDate(), daysInMonth);
  const dailyCashFlows = new Array<number>(Math.max(currentDay, 7)).fill(0);

  transactions.forEach((tx) => {
    const dt = tx.dateTime || '';
    if (dt.startsWith(currentMonthKey)) {
      const dayNum = parseInt(dt.slice(8, 10), 10);
      const dayIdx = isNaN(dayNum) ? 0 : Math.max(0, Math.min(dayNum - 1, dailyCashFlows.length - 1));

      if (tx.type === 'income' || (tx.type === 'adjustment' && tx.adjustmentSign !== 'negative')) {
        currentIncome += tx.amount;
        dailyCashFlows[dayIdx] += tx.amount;
      } else if (tx.type === 'expense' || (tx.type === 'adjustment' && tx.adjustmentSign === 'negative')) {
        currentExpense += tx.amount;
        dailyCashFlows[dayIdx] -= tx.amount;
      }
    } else if (dt.startsWith(prevMonthKey)) {
      if (tx.type === 'income' || (tx.type === 'adjustment' && tx.adjustmentSign !== 'negative')) {
        prevIncome += tx.amount;
      } else if (tx.type === 'expense' || (tx.type === 'adjustment' && tx.adjustmentSign === 'negative')) {
        prevExpense += tx.amount;
      }
    }
  });

  const netCashFlow = currentIncome - currentExpense;

  // Calculate percentage changes
  const calcPercent = (curr: number, prev: number): string => {
    if (prev <= 0) return curr > 0 ? '+100%' : '0%';
    const pct = Math.round(((curr - prev) / prev) * 100);
    return pct >= 0 ? `↑ ${pct}%` : `↓ ${Math.abs(pct)}%`;
  };

  const incomePercent = calcPercent(currentIncome, prevIncome);
  const expensePercent = calcPercent(currentExpense, prevExpense);

  // Cumulative curve for sparkline
  let cumulative = 0;
  const sparklinePoints: number[] = [];
  dailyCashFlows.forEach((amt) => {
    cumulative += amt;
    sparklinePoints.push(cumulative);
  });

  return {
    isLoggedIn,
    userName,
    currencySymbol: '₱',
    incomeAmount: formatPeso(currentIncome),
    expenseAmount: formatPeso(currentExpense),
    netCashFlow: formatPeso(netCashFlow),
    incomePercent,
    expensePercent,
    sparklinePoints: sparklinePoints.length >= 2 ? sparklinePoints : [0, 5, 12, 18, 22, 28],
    quickExpenseAmount: '₱250.00',
    quickExpenseCategory: 'Food',
  };
}
