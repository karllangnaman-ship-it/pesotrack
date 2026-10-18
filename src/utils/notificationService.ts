import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
  ScheduleOptions,
  PermissionStatus,
  Channel,
} from '@capacitor/local-notifications';
import {
  BillDefinition,
  MonthlyBillEntry,
  NotificationSettings,
  PesoTrackState,
  ReceivableRecord,
} from '../types/finance';
import { ReconciledAccount } from './financeEngine';
import { formatPeso } from './currency';

export const NOTIFICATION_CHANNEL_ID = 'pesotrack_reminders_channel';
export const NOTIFICATION_CHANNEL_NAME = 'PesoTrack Financial Reminders';

/**
 * Creates a unique positive 32-bit integer ID for a notification
 * to prevent duplicates and collisions across items and reminder days.
 */
function createNotificationId(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash % 2147483647) || 1;
}

/**
 * Initializes Android notification channels on native devices.
 */
export async function initNotificationChannel(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const channel: Channel = {
      id: NOTIFICATION_CHANNEL_ID,
      name: NOTIFICATION_CHANNEL_NAME,
      description: 'Local offline reminders for due bills, credit dues, loan installments, and receivables.',
      importance: 4, // HIGH
      visibility: 1, // PUBLIC
      vibration: true,
      lights: true,
    };
    await LocalNotifications.createChannel(channel);
  } catch (err) {
    console.warn('[Notifications] Failed to create notification channel:', err);
  }
}

/**
 * Checks current notification permission status.
 */
export async function checkNotificationPermission(): Promise<{
  granted: boolean;
  status: string;
}> {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm: PermissionStatus = await LocalNotifications.checkPermissions();
      return {
        granted: perm.display === 'granted',
        status: perm.display,
      };
    } catch (err) {
      console.warn('[Notifications] Check permission error:', err);
      return { granted: false, status: 'error' };
    }
  }

  // Web fallback check
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return {
      granted: Notification.permission === 'granted',
      status: Notification.permission,
    };
  }

  return { granted: false, status: 'unsupported' };
}

/**
 * Requests notification permission from user (Android 13+ POST_NOTIFICATIONS or browser).
 */
export async function requestNotificationPermission(): Promise<{
  granted: boolean;
  status: string;
}> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res: PermissionStatus = await LocalNotifications.requestPermissions();
      return {
        granted: res.display === 'granted',
        status: res.display,
      };
    } catch (err) {
      console.error('[Notifications] Request permission error:', err);
      return { granted: false, status: 'denied' };
    }
  }

  // Web fallback request
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const res = await Notification.requestPermission();
      return {
        granted: res === 'granted',
        status: res,
      };
    } catch (err) {
      return { granted: false, status: 'denied' };
    }
  }

  return { granted: false, status: 'unsupported' };
}

export interface ScheduledReminderItem {
  id: number;
  title: string;
  body: string;
  scheduleAt: Date;
  extra?: Record<string, string>;
}

/**
 * Helper to compute notification target Date given a due date YYYY-MM-DD,
 * reminder time "HH:mm", and days before (e.g. 0, 1, 3, 7).
 */
export function calculateReminderDate(
  dueDateStr: string,
  reminderTimeStr: string = '09:00',
  daysBefore: number = 0
): Date | null {
  try {
    const parts = dueDateStr.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const timeParts = reminderTimeStr.split(':');
    const hours = parseInt(timeParts[0], 10) || 9;
    const minutes = parseInt(timeParts[1], 10) || 0;

    const targetDate = new Date(year, month, day, hours, minutes, 0, 0);
    if (daysBefore > 0) {
      targetDate.setDate(targetDate.getDate() - daysBefore);
    }
    return targetDate;
  } catch {
    return null;
  }
}

/**
 * Sends an immediate test notification to verify device sound, banner, and offline delivery.
 */
export async function sendImmediateTestNotification(): Promise<{
  ok: boolean;
  message: string;
}> {
  const perm = await checkNotificationPermission();
  if (!perm.granted) {
    const req = await requestNotificationPermission();
    if (!req.granted) {
      return {
        ok: false,
        message: 'Notification permission is disabled. Please enable notifications in your phone Settings.',
      };
    }
  }

  const title = '🔔 PesoTrack Reminder Test';
  const body = 'Your offline notifications are working! Reminders for bills and payments will sound at your scheduled time without internet.';

  if (Capacitor.isNativePlatform()) {
    try {
      await initNotificationChannel();
      const testId = 999991;
      const fireAt = new Date(Date.now() + 2000); // 2 seconds from now

      await LocalNotifications.schedule({
        notifications: [
          {
            id: testId,
            title,
            body,
            schedule: { at: fireAt, allowWhileIdle: true },
            channelId: NOTIFICATION_CHANNEL_ID,
            sound: 'beep.wav',
            extra: { type: 'test' },
          },
        ],
      });
      return {
        ok: true,
        message: 'Test reminder scheduled! Watch your notification bar in 2 seconds.',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, message: `Failed to schedule test notification: ${msg}` };
    }
  }

  // Web Browser environment
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/favicon.ico' });
      return {
        ok: true,
        message: 'Test notification triggered in your browser.',
      };
    } catch {
      // Fallback message
    }
  }

  return {
    ok: true,
    message: 'Test alert simulated. Native Android local notifications run offline on your APK.',
  };
}

/**
<<<<<<< HEAD
 * Sanitizes and normalizes notification settings, ensuring:
 * - 3 valid reminder times exist (defaulting to 09:00, 13:00, 19:00)
 * - "1 Day Before" (1) is completely removed from remindDaysBeforeList
 * - remindEveryDay is a boolean
 */
export function sanitizeNotificationSettings(
  raw?: Partial<NotificationSettings>
): NotificationSettings {
  const base = raw || {};
  const reminderTime = base.reminderTime || '09:00';

  let reminderTimes: string[] = Array.isArray(base.reminderTimes)
    ? [...base.reminderTimes]
    : [];

  const defaultSlots = ['09:00', '13:00', '19:00'];
  if (reminderTimes.length === 0) {
    reminderTimes = [reminderTime, '13:00', '19:00'];
  } else {
    while (reminderTimes.length < 3) {
      reminderTimes.push(defaultSlots[reminderTimes.length] || '09:00');
    }
  }

  // Ensure valid "HH:mm" strings
  reminderTimes = reminderTimes.slice(0, 3).map((t, idx) => {
    if (typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t.trim())) {
      const parts = t.trim().split(':');
      const h = String(parseInt(parts[0], 10) || 0).padStart(2, '0');
      const m = String(parseInt(parts[1], 10) || 0).padStart(2, '0');
      return `${h}:${m}`;
    }
    return defaultSlots[idx] || '09:00';
  });

  // Completely filter out 1 ("1 Day Before")
  let list = Array.isArray(base.remindDaysBeforeList)
    ? base.remindDaysBeforeList.filter((d) => d !== 1 && typeof d === 'number')
    : [0, 3];

  if (list.length === 0 && !base.remindEveryDay) {
    list = [0];
  }

  const remindEveryDay = Boolean(base.remindEveryDay);
  const remindOnDueDate = list.includes(0);

  return {
    enabled: base.enabled ?? true,
    reminderTime: reminderTimes[0],
    reminderTimes,
    remindOnDueDate,
    remindDaysBeforeList: list,
    remindEveryDay,
    billsEnabled: base.billsEnabled ?? true,
    creditEnabled: base.creditEnabled ?? true,
    loanEnabled: base.loanEnabled ?? true,
    receivablesEnabled: base.receivablesEnabled ?? true,
    overdueEnabled: base.overdueEnabled ?? true,
  };
}

export interface ReminderTargetDate {
  targetDateStr: string; // YYYY-MM-DD
  daysBefore: number;
}

/**
 * Calculates all eligible calendar notification dates for an obligation:
 * - On Due Date (0 days before)
 * - 3 Days Before (3 days before)
 * - 7 Days Before (7 days before)
 * - Every Day (every upcoming day from today until the due date, capped at 14 days)
 * Automatically deduplicates dates.
 */
export function getEligibleTargetDates(
  dueDateStr: string,
  now: Date,
  remindDaysBeforeList: number[],
  remindEveryDay: boolean
): ReminderTargetDate[] {
  const parts = dueDateStr.split('-');
  if (parts.length !== 3) return [];
  const dueYear = parseInt(parts[0], 10);
  const dueMonth = parseInt(parts[1], 10) - 1;
  const dueDay = parseInt(parts[2], 10);
  const dueDate = new Date(dueYear, dueMonth, dueDay, 0, 0, 0, 0);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // If due date has passed by more than 1 day, skip upcoming reminders
  if (diffDays < 0) return [];

  const targetsMap = new Map<string, ReminderTargetDate>();

  // 1. Explicit milestone days: 0 (On Due Date), 3 (3 Days Before), 7 (7 Days Before)
  const allowedMilestones = [0, 3, 7];
  for (const daysBefore of remindDaysBeforeList) {
    if (!allowedMilestones.includes(daysBefore)) continue;
    const targetDate = new Date(dueYear, dueMonth, dueDay, 0, 0, 0, 0);
    targetDate.setDate(targetDate.getDate() - daysBefore);

    if (targetDate >= today) {
      const y = targetDate.getFullYear();
      const m = String(targetDate.getMonth() + 1).padStart(2, '0');
      const d = String(targetDate.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${d}`;
      targetsMap.set(dateKey, { targetDateStr: dateKey, daysBefore });
    }
  }

  // 2. "Every Day" option: trigger daily reminders for upcoming obligations
  if (remindEveryDay) {
    const maxDaysAhead = Math.min(diffDays, 14);
    for (let dayOffset = 0; dayOffset <= maxDaysAhead; dayOffset++) {
      const curDate = new Date(today);
      curDate.setDate(curDate.getDate() + dayOffset);

      if (curDate <= dueDate) {
        const y = curDate.getFullYear();
        const m = String(curDate.getMonth() + 1).padStart(2, '0');
        const d = String(curDate.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${d}`;

        const currentDaysBefore = Math.round((dueDate.getTime() - curDate.getTime()) / (1000 * 60 * 60 * 24));

        if (!targetsMap.has(dateKey)) {
          targetsMap.set(dateKey, {
            targetDateStr: dateKey,
            daysBefore: currentDaysBefore,
          });
        }
      }
    }
  }

  return Array.from(targetsMap.values());
}

/**
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
 * Reconciles and schedules all active obligations and collections
 * based on user settings and saved data.
 * Purely local, offline, and idempotent.
 */
export async function reconcileAllLocalReminders(
  state: PesoTrackState,
  reconciledAccounts: ReconciledAccount[],
  receivables: ReceivableRecord[]
): Promise<number> {
<<<<<<< HEAD
  const settings = sanitizeNotificationSettings(state.settings.notificationSettings);
=======
  const settings: NotificationSettings = state.settings.notificationSettings || {
    enabled: true,
    reminderTime: '09:00',
    remindOnDueDate: true,
    remindDaysBeforeList: [0, 1],
    billsEnabled: true,
    creditEnabled: true,
    loanEnabled: true,
    receivablesEnabled: true,
    overdueEnabled: true,
  };
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce

  if (!settings.enabled) {
    if (Capacitor.isNativePlatform()) {
      try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({ notifications: pending.notifications });
        }
      } catch (e) {
        console.warn('Error clearing notifications:', e);
      }
    }
    return 0;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;
<<<<<<< HEAD

=======
  
  // Also check next month for upcoming scheduled reminders
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  const nextMonthDate = new Date(currentYear, currentMonthNum, 1);
  const nextMonthKey = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const targetMonths = [currentMonthKey, nextMonthKey];

  const remindersToSchedule: ScheduledReminderItem[] = [];
<<<<<<< HEAD
  const scheduledKeys = new Set<string>();

  const activeReminderTimes = Array.from(new Set(settings.reminderTimes));

  // Helper to schedule for an item across its eligible target dates and all 3 configured times
  const scheduleItemReminders = (
    itemType: 'bill' | 'credit' | 'loan' | 'receivable',
    itemId: string,
    itemName: string,
    amountText: string,
    dueDateStr: string,
    titleTemplate: (timeLabel: string) => string,
    bodyTemplate: (timeLabel: string) => string
  ) => {
    const targetDates = getEligibleTargetDates(
      dueDateStr,
      now,
      settings.remindDaysBeforeList,
      settings.remindEveryDay
    );

    for (const target of targetDates) {
      const [y, m, d] = target.targetDateStr.split('-').map(Number);
      const timeLabel =
        target.daysBefore === 0
          ? 'today'
          : target.daysBefore === 1
          ? 'tomorrow'
          : `in ${target.daysBefore} days`;

      for (const timeStr of activeReminderTimes) {
        const [hrs, mins] = timeStr.split(':').map(Number);
        const scheduleAt = new Date(y, m - 1, d, hrs, mins, 0, 0);

        if (scheduleAt > now) {
          // Unique key to prevent duplicates: same item on the same calendar date at the same time
          const uniqueKey = `${itemType}_${itemId}_${target.targetDateStr}_${timeStr}`;
          if (!scheduledKeys.has(uniqueKey)) {
            scheduledKeys.add(uniqueKey);
            remindersToSchedule.push({
              id: createNotificationId(uniqueKey),
              title: titleTemplate(timeLabel),
              body: bodyTemplate(timeLabel),
              scheduleAt,
              extra: { type: itemType, id: itemId, dueDate: dueDateStr, time: timeStr },
            });
          }
        }
      }
    }
  };
=======
  const reminderDays = settings.remindDaysBeforeList && settings.remindDaysBeforeList.length > 0
    ? settings.remindDaysBeforeList
    : (settings.remindOnDueDate ? [0] : [1]);
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce

  // 1. BILLS REMINDERS
  if (settings.billsEnabled && state.bills && state.bills.length > 0) {
    for (const bill of state.bills) {
      if (bill.reminderEnabled === false) continue;

      for (const mKey of targetMonths) {
        const entryKey = `${bill.id}_${mKey}`;
        const entry: MonthlyBillEntry | undefined = state.monthlyBillEntries?.[entryKey];
<<<<<<< HEAD
        const isPaid =
          entry?.isPaidManually ||
          (entry?.payments &&
            entry.payments.reduce((s, p) => s + p.amount, 0) >=
              (entry?.actualAmount ?? bill.defaultAmount));
=======
        const isPaid = entry?.isPaidManually || (entry?.payments && entry.payments.reduce((s, p) => s + p.amount, 0) >= (entry?.actualAmount ?? bill.defaultAmount));
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
        if (isPaid) continue; // Already paid, no notification

        const dueDay = entry?.dueDay ?? bill.dueDay;
        const [y, m] = mKey.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        const validDueDay = Math.min(dueDay, daysInMonth);
        const dueDateStr = `${mKey}-${String(validDueDay).padStart(2, '0')}`;
        const amount = entry?.actualAmount ?? bill.defaultAmount;

<<<<<<< HEAD
        const billName =
          bill.category === 'Other' && bill.customCategoryName
            ? bill.customCategoryName
            : bill.name;

        scheduleItemReminders(
          'bill',
          bill.id,
          billName,
          formatPeso(amount),
          dueDateStr,
          () => `📅 Bill Due: ${billName}`,
          (timeLabel) => `${billName} bill of ${formatPeso(amount)} is due ${timeLabel} (${dueDateStr}).`
        );
=======
        const billName = bill.category === 'Other' && bill.customCategoryName
          ? bill.customCategoryName
          : bill.name;

        for (const daysBefore of reminderDays) {
          const scheduleAt = calculateReminderDate(dueDateStr, settings.reminderTime, daysBefore);
          if (scheduleAt && scheduleAt > now) {
            const timeLabel = daysBefore === 0 ? 'today' : `in ${daysBefore} ${daysBefore === 1 ? 'day' : 'days'}`;
            remindersToSchedule.push({
              id: createNotificationId(`bill_${bill.id}_${dueDateStr}_${daysBefore}`),
              title: `📅 Bill Due: ${billName}`,
              body: `${billName} bill of ${formatPeso(amount)} is due ${timeLabel} (${dueDateStr}).`,
              scheduleAt,
              extra: { type: 'bill', billId: bill.id, dueDate: dueDateStr },
            });
          }
        }
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
      }
    }
  }

<<<<<<< HEAD
  // 2. CREDIT CARD REMINDERS
  if (settings.creditEnabled) {
    const creditAccounts = reconciledAccounts.filter(
      (a) => !a.archived && a.category === 'Credit' && a.currentBalance > 0
    );
=======
  // 2. CREDIT CARD & REVOLVING CREDIT REMINDERS
  if (settings.creditEnabled) {
    const creditAccounts = reconciledAccounts.filter((a) => !a.archived && a.category === 'Credit' && a.currentBalance > 0);
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
    for (const acc of creditAccounts) {
      const dueDay = acc.creditInfo?.dueDay;
      if (!dueDay) continue;

      for (const mKey of targetMonths) {
        const [y, m] = mKey.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        const validDueDay = Math.min(dueDay, daysInMonth);
        const dueDateStr = `${mKey}-${String(validDueDay).padStart(2, '0')}`;

<<<<<<< HEAD
        scheduleItemReminders(
          'credit',
          acc.id,
          acc.name,
          formatPeso(acc.currentBalance),
          dueDateStr,
          () => `💳 Credit Payment Due: ${acc.name}`,
          (timeLabel) => `Payment for ${acc.name} (${formatPeso(acc.currentBalance)}) is due ${timeLabel} (${dueDateStr}).`
        );
=======
        for (const daysBefore of reminderDays) {
          const scheduleAt = calculateReminderDate(dueDateStr, settings.reminderTime, daysBefore);
          if (scheduleAt && scheduleAt > now) {
            const timeLabel = daysBefore === 0 ? 'today' : `in ${daysBefore} ${daysBefore === 1 ? 'day' : 'days'}`;
            remindersToSchedule.push({
              id: createNotificationId(`credit_${acc.id}_${dueDateStr}_${daysBefore}`),
              title: `💳 Credit Payment Due: ${acc.name}`,
              body: `Payment for ${acc.name} (${formatPeso(acc.currentBalance)}) is due ${timeLabel} (${dueDateStr}).`,
              scheduleAt,
              extra: { type: 'credit', accountId: acc.id, dueDate: dueDateStr },
            });
          }
        }
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
      }
    }
  }

  // 3. LOAN INSTALLMENT REMINDERS
  if (settings.loanEnabled) {
<<<<<<< HEAD
    const loanAccounts = reconciledAccounts.filter(
      (a) => !a.archived && a.category === 'Loans' && a.currentBalance > 0
    );
=======
    const loanAccounts = reconciledAccounts.filter((a) => !a.archived && a.category === 'Loans' && a.currentBalance > 0);
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
    for (const acc of loanAccounts) {
      const dueDay = acc.loanInfo?.dueDay;
      if (!dueDay) continue;

<<<<<<< HEAD
      const monthlyInstallment =
        acc.loanInfo?.monthlyInstallmentEstimate ||
        acc.loanInfo?.customMonthlyPayment ||
        0;
      const amountText =
        monthlyInstallment > 0
          ? formatPeso(monthlyInstallment)
          : formatPeso(acc.currentBalance);
=======
      const monthlyInstallment = acc.loanInfo?.monthlyInstallmentEstimate || (acc.loanInfo?.customMonthlyPayment) || 0;
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce

      for (const mKey of targetMonths) {
        const [y, m] = mKey.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        const validDueDay = Math.min(dueDay, daysInMonth);
        const dueDateStr = `${mKey}-${String(validDueDay).padStart(2, '0')}`;

<<<<<<< HEAD
        scheduleItemReminders(
          'loan',
          acc.id,
          acc.name,
          amountText,
          dueDateStr,
          () => `🏦 Loan Installment Due: ${acc.name}`,
          (timeLabel) => `Monthly installment of ${amountText} for ${acc.name} is due ${timeLabel} (${dueDateStr}).`
        );
=======
        for (const daysBefore of reminderDays) {
          const scheduleAt = calculateReminderDate(dueDateStr, settings.reminderTime, daysBefore);
          if (scheduleAt && scheduleAt > now) {
            const timeLabel = daysBefore === 0 ? 'today' : `in ${daysBefore} ${daysBefore === 1 ? 'day' : 'days'}`;
            const amountText = monthlyInstallment > 0 ? formatPeso(monthlyInstallment) : formatPeso(acc.currentBalance);
            remindersToSchedule.push({
              id: createNotificationId(`loan_${acc.id}_${dueDateStr}_${daysBefore}`),
              title: `🏦 Loan Installment Due: ${acc.name}`,
              body: `Monthly installment of ${amountText} for ${acc.name} is due ${timeLabel} (${dueDateStr}).`,
              scheduleAt,
              extra: { type: 'loan', accountId: acc.id, dueDate: dueDateStr },
            });
          }
        }
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
      }
    }
  }

  // 4. RECEIVABLES (EXPECTED COLLECTIONS) REMINDERS
  if (settings.receivablesEnabled && receivables && receivables.length > 0) {
    for (const r of receivables) {
      if (r.remainingBalance <= 0) continue;

      let dueDateStr = r.dueDate;
      let amountDue = r.remainingBalance;
      if (r.schedule && r.schedule.length > 0) {
        const todayStr = now.toISOString().slice(0, 10);
        const nextItem =
          r.schedule.find((it) => it.dueDate >= todayStr && !it.isPaid) ||
          r.schedule.find((it) => !it.isPaid) ||
          r.schedule[0];
        if (nextItem) {
          dueDateStr = nextItem.dueDate;
          amountDue = nextItem.collectionAmount;
        }
      }

      if (!dueDateStr) continue;

<<<<<<< HEAD
      scheduleItemReminders(
        'receivable',
        r.id,
        r.personName,
        formatPeso(amountDue),
        dueDateStr,
        () => `💰 Expected Collection: ${r.personName}`,
        (timeLabel) => `${r.personName} is scheduled to pay you ${formatPeso(amountDue)} ${timeLabel} (${dueDateStr}).`
      );
=======
      for (const daysBefore of reminderDays) {
        const scheduleAt = calculateReminderDate(dueDateStr, settings.reminderTime, daysBefore);
        if (scheduleAt && scheduleAt > now) {
          const timeLabel = daysBefore === 0 ? 'today' : `in ${daysBefore} ${daysBefore === 1 ? 'day' : 'days'}`;
          remindersToSchedule.push({
            id: createNotificationId(`receivable_${r.id}_${dueDateStr}_${daysBefore}`),
            title: `💰 Expected Collection: ${r.personName}`,
            body: `${r.personName} is scheduled to pay you ${formatPeso(amountDue)} ${timeLabel} (${dueDateStr}).`,
            scheduleAt,
            extra: { type: 'receivable', receivableId: r.id, dueDate: dueDateStr },
          });
        }
      }
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
    }
  }

  // 5. SCHEDULE ON CAPACITOR NATIVE ANDROID
  if (Capacitor.isNativePlatform()) {
    try {
      await initNotificationChannel();

      // Cancel existing scheduled notifications to avoid duplicates and refresh schedule
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }

<<<<<<< HEAD
      // Prioritize the soonest upcoming reminders (up to 60 notifications)
      const batch = remindersToSchedule
        .sort((a, b) => a.scheduleAt.getTime() - b.scheduleAt.getTime())
        .slice(0, 60)
        .map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          schedule: { at: item.scheduleAt, allowWhileIdle: true },
          channelId: NOTIFICATION_CHANNEL_ID,
          sound: 'beep.wav',
          extra: item.extra,
        }));
=======
      // Limit to 50 local notifications (Android system limit per app is 500, 50 is fast and reliable)
      const batch = remindersToSchedule.slice(0, 50).map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        schedule: { at: item.scheduleAt, allowWhileIdle: true },
        channelId: NOTIFICATION_CHANNEL_ID,
        sound: 'beep.wav',
        extra: item.extra,
      }));
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce

      if (batch.length > 0) {
        await LocalNotifications.schedule({ notifications: batch });
      }
      return batch.length;
    } catch (err) {
      console.warn('[Notifications] Failed to schedule native notifications:', err);
      return 0;
    }
  }

  return remindersToSchedule.length;
}
