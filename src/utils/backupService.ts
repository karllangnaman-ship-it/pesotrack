import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { PesoTrackState, TransactionRecord } from '../types/finance';
import { ReconciledAccount } from './financeEngine';

export interface BackupSummary {
  accountsCount: number;
  transactionsCount: number;
  budgetsCount: number;
  recurringCount: number;
  customCategoriesCount: number;
  receivablesCount?: number;
  billsCount?: number;
  billEntriesCount?: number;
  profileName?: string;
  version: number;
  updatedAt?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  summary?: BackupSummary;
  data?: PesoTrackState;
}

/**
 * Validates a JSON string as a valid PesoTrack backup without applying changes.
 * Preserves all existing data until explicitly confirmed.
 */
export function validateBackupJSON(rawJson: string): ValidationResult {
  if (!rawJson || typeof rawJson !== 'string' || !rawJson.trim()) {
    return {
      valid: false,
      error: 'The provided file is empty. Please select a valid PesoTrack backup file.',
    };
  }

  try {
    const parsed = JSON.parse(rawJson);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        valid: false,
        error: 'Invalid file format: root content must be a JSON object.',
      };
    }

    if (!Array.isArray(parsed.accounts)) {
      return {
        valid: false,
        error: 'Invalid backup structure: "accounts" list is missing or invalid.',
      };
    }

    if (!Array.isArray(parsed.transactions)) {
      return {
        valid: false,
        error: 'Invalid backup structure: "transactions" list is missing or invalid.',
      };
    }

    const budgetsCount =
      parsed.budgets && typeof parsed.budgets === 'object'
        ? Object.keys(parsed.budgets).length
        : 0;

    const recurringCount = Array.isArray(parsed.recurringTransactions)
      ? parsed.recurringTransactions.length
      : 0;

    const expenseCatCount = Array.isArray(parsed.customCategories?.expense)
      ? parsed.customCategories.expense.length
      : 0;
    const incomeCatCount = Array.isArray(parsed.customCategories?.income)
      ? parsed.customCategories.income.length
      : 0;

    const receivablesCount = Array.isArray(parsed.receivables)
      ? parsed.receivables.length
      : 0;

    const billsCount = Array.isArray(parsed.bills) ? parsed.bills.length : 0;
    const billEntriesCount =
      parsed.monthlyBillEntries && typeof parsed.monthlyBillEntries === 'object'
        ? Object.keys(parsed.monthlyBillEntries).length
        : 0;

    const summary: BackupSummary = {
      accountsCount: parsed.accounts.length,
      transactionsCount: parsed.transactions.length,
      budgetsCount,
      recurringCount,
      customCategoriesCount: expenseCatCount + incomeCatCount,
      receivablesCount,
      billsCount,
      billEntriesCount,
      profileName: parsed.settings?.profileName,
      version: parsed.version || 1,
      updatedAt: parsed.updatedAt,
    };

    return {
      valid: true,
      summary,
      data: parsed as PesoTrackState,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown JSON parse error';
    return {
      valid: false,
      error: `Could not parse JSON file: ${msg}. Make sure the file is not corrupted.`,
    };
  }
}

/**
 * Exports full backup JSON.
 * On Android APK (Capacitor native), writes to local device storage and launches
 * native Android Share sheet allowing the user to Save to Downloads/Files or share offline.
 * On web browser, initiates standard file download.
 */
export async function exportBackupJSON(
  state: PesoTrackState
): Promise<{ ok: boolean; message: string }> {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `pesotrack-backup-${dateStamp}.json`;
  const jsonString = JSON.stringify(state, null, 2);

  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Write file to Cache directory for instant URI sharing
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: jsonString,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      // 2. Also try writing a copy to Documents directory for permanent local storage
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
      } catch {
        // Non-critical if Documents directory write is blocked by scoped storage
      }

      // 3. Open native Android system share dialog (allows "Save to Downloads", Drive, Files, etc.)
      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title: 'PesoTrack Backup',
          text: `PesoTrack offline backup created on ${dateStamp}`,
          url: writeResult.uri,
          dialogTitle: 'Save or Share PesoTrack Backup',
        });
        return {
          ok: true,
          message: 'Backup ready: choose "Save to Downloads" or your preferred location.',
        };
      }

      return {
        ok: true,
        message: `Backup saved to app Documents/${fileName}`,
      };
    } catch (err: unknown) {
      console.error('[BackupService] Native file export failed:', err);
      // Fallback to web download in case native plugin fails
      triggerWebDownload(fileName, jsonString, 'application/json');
      return {
        ok: true,
        message: 'Backup downloaded via browser fallback.',
      };
    }
  }

  // Web Browser environment
  triggerWebDownload(fileName, jsonString, 'application/json');
  return {
    ok: true,
    message: 'Backup JSON downloaded.',
  };
}

/**
 * Exports transaction ledger as CSV.
 * Supports both Android APK native sharing and web browser download.
 */
export async function exportLedgerCSV(
  reconciledAccounts: ReconciledAccount[],
  transactions: TransactionRecord[]
): Promise<{ ok: boolean; message: string }> {
  const headers = [
    'ID',
    'Date & Time',
    'Type',
    'Category',
    'Description / Merchant',
    'Account',
    'Destination Account',
    'Amount (PHP)',
    'Notes',
  ];

  const rows = transactions.map((tx) => {
    const source =
      reconciledAccounts.find((a) => a.id === tx.accountId)?.name || tx.accountId;
    const dest = tx.destinationAccountId
      ? reconciledAccounts.find((a) => a.id === tx.destinationAccountId)?.name ||
        tx.destinationAccountId
      : '';
    return [
      tx.id,
      tx.dateTime,
      tx.type,
      tx.category,
      `"${(tx.merchantOrTitle || '').replace(/"/g, '""')}"`,
      `"${source.replace(/"/g, '""')}"`,
      `"${dest.replace(/"/g, '""')}"`,
      tx.amount.toFixed(2),
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `pesotrack-transactions-${dateStamp}.csv`;

  if (Capacitor.isNativePlatform()) {
    try {
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: csvContent,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title: 'PesoTrack Ledger CSV',
          text: `PesoTrack transaction ledger exported on ${dateStamp}`,
          url: writeResult.uri,
          dialogTitle: 'Save or Share Transactions CSV',
        });
        return {
          ok: true,
          message: 'Transactions CSV ready: select save location or share.',
        };
      }
    } catch (err: unknown) {
      console.error('[BackupService] Native CSV export failed:', err);
      triggerWebDownload(fileName, csvContent, 'text/csv;charset=utf-8;');
      return {
        ok: true,
        message: 'Transactions CSV downloaded via browser fallback.',
      };
    }
  }

  triggerWebDownload(fileName, csvContent, 'text/csv;charset=utf-8;');
  return {
    ok: true,
    message: 'Transactions CSV downloaded.',
  };
}

export interface AnalyticsExportData {
  periodLabel: string;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
  monthlyBillsPaid: number;
  creditRepayments: number;
  loanRepayments: number;
  receivablesCollected: number;
  receivablesOutstanding: number;
  categoryBreakdown: { category: string; amount: number; percent: number }[];
  transactions: TransactionRecord[];
}

/**
 * Exports comprehensive Spending Analytics Report as CSV.
 * Purely local, offline, works without internet on Android and browser.
 */
export async function exportAnalyticsCSV(
  data: AnalyticsExportData
): Promise<{ ok: boolean; message: string }> {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `pesotrack-spending-analytics-${dateStamp}.csv`;

  const lines: string[] = [
    '=== PESOTRACK OFFLINE SPENDING ANALYTICS REPORT ===',
    `Generated Date,${dateStamp}`,
    `Filter Period,${data.periodLabel}`,
    '',
    '=== SUMMARY FINANCIAL KPIS (PHP) ===',
    `Total Income,${data.totalIncome.toFixed(2)}`,
    `Total Expenses,${data.totalExpense.toFixed(2)}`,
    `Net Cash Flow,${data.netCashFlow.toFixed(2)}`,
    `Total Assets (Wallets + Savings),${data.totalAssets.toFixed(2)}`,
    `Total Debt (Credit + Loans),${data.totalDebt.toFixed(2)}`,
    `Net Worth,${data.netWorth.toFixed(2)}`,
    `Monthly Bills Paid,${data.monthlyBillsPaid.toFixed(2)}`,
    `Credit Repayments,${data.creditRepayments.toFixed(2)}`,
    `Loan Repayments,${data.loanRepayments.toFixed(2)}`,
    `Receivables Collected,${data.receivablesCollected.toFixed(2)}`,
    `Receivables Outstanding,${data.receivablesOutstanding.toFixed(2)}`,
    '',
    '=== SPENDING BREAKDOWN BY CATEGORY ===',
    'Category,Amount (PHP),Percentage of Total (%)',
    ...data.categoryBreakdown.map(
      (c) => `"${c.category.replace(/"/g, '""')}",${c.amount.toFixed(2)},${c.percent.toFixed(1)}%`
    ),
    '',
    '=== ITEMISED TRANSACTIONS IN PERIOD ===',
    'Date,Type,Category,Merchant / Description,Amount (PHP),Notes',
    ...data.transactions.map((t) =>
      [
        t.dateTime,
        t.type,
        `"${(t.category || '').replace(/"/g, '""')}"`,
        `"${(t.merchantOrTitle || '').replace(/"/g, '""')}"`,
        t.amount.toFixed(2),
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ].join(',')
    ),
  ];

  const csvContent = lines.join('\n');

  if (Capacitor.isNativePlatform()) {
    try {
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: csvContent,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title: 'PesoTrack Spending Analytics CSV',
          text: `Spending analytics report for ${data.periodLabel} generated offline on ${dateStamp}`,
          url: writeResult.uri,
          dialogTitle: 'Save or Share Analytics CSV',
        });
        return {
          ok: true,
          message: 'Analytics CSV ready: select save location or share.',
        };
      }
    } catch (err) {
      console.error('[BackupService] Native analytics CSV export failed:', err);
      triggerWebDownload(fileName, csvContent, 'text/csv;charset=utf-8;');
      return {
        ok: true,
        message: 'Analytics CSV downloaded via browser fallback.',
      };
    }
  }

  triggerWebDownload(fileName, csvContent, 'text/csv;charset=utf-8;');
  return {
    ok: true,
    message: 'Spending Analytics CSV downloaded.',
  };
}

function triggerWebDownload(fileName: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
