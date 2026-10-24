import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Filter,
  HandCoins,
  Landmark,
  List,
  Plus,
  Receipt,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { BillDetailModal } from '../components/BillDetailModal';
import { RecordBillPaymentModal } from '../components/RecordBillPaymentModal';
import { RecordReceivablePaymentModal } from '../components/RecordReceivablePaymentModal';
import { PayCreditBillModal } from '../components/PayCreditBillModal';
import { RecordLoanPaymentModal } from '../components/RecordLoanPaymentModal';
import { RecordPurchasePaymentModal } from '../components/RecordPurchasePaymentModal';
import { RecordRecurringPaymentModal } from '../components/RecordRecurringPaymentModal';
import { useFinance } from '../context/FinanceContext';
import {
  CalendarEvent,
  CalendarEventStatus,
  CalendarEventType,
  calculateMonthCalendarMetrics,
  getCalendarEventsForMonth,
} from '../utils/calendarEngine';
import { formatMonthLabel, formatPeso, getMonthKey } from '../utils/currency';

type CalendarViewMode = 'month' | 'week' | 'agenda';

export const BillCalendarPage: React.FC = () => {
  const {
    bills,
    monthlyBillEntries,
    reconciledAccounts,
    receivables,
    recurringTransactions,
    revertBillPayment,
    revertAccountPayment,
    revertSalaryDeposit,
    deleteReceivablePayment,
    state,
  } = useFinance();
  const hide = state.settings.hideBalances;

  const [currentMonthKey, setCurrentMonthKey] = useState<string>(getMonthKey());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);

  // Week View: reference date for the active week (defaults to today or 1st of month)
  const [weekReferenceDate, setWeekReferenceDate] = useState<Date>(() => new Date());

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | CalendarEventType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CalendarEventStatus>('all');

  // Action Modals State
  const [billForPayment, setBillForPayment] = useState<CalendarEvent | null>(null);
  const [receivableForPayment, setReceivableForPayment] = useState<CalendarEvent | null>(null);
  const [creditForPayment, setCreditForPayment] = useState<CalendarEvent | null>(null);
  const [loanForPayment, setLoanForPayment] = useState<CalendarEvent | null>(null);
  const [recurringForPayment, setRecurringForPayment] = useState<CalendarEvent | null>(null);

  // Month navigation
  const handlePrevMonth = () => {
    const [y, m] = currentMonthKey.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    const ny = d.getFullYear();
    const nm = String(d.getMonth() + 1).padStart(2, '0');
    setCurrentMonthKey(`${ny}-${nm}`);
    setSelectedDayNumber(null);
    setWeekReferenceDate(new Date(ny, m - 2, 1));
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonthKey.split('-').map(Number);
    const d = new Date(y, m, 1);
    const ny = d.getFullYear();
    const nm = String(d.getMonth() + 1).padStart(2, '0');
    setCurrentMonthKey(`${ny}-${nm}`);
    setSelectedDayNumber(null);
    setWeekReferenceDate(new Date(ny, m, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonthKey(getMonthKey());
    setSelectedDayNumber(today.getDate());
    setWeekReferenceDate(today);
  };

  // Week navigation
  const handlePrevWeek = () => {
    setWeekReferenceDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 7);
      const ym = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
      if (ym !== currentMonthKey) {
        setCurrentMonthKey(ym);
      }
      return next;
    });
  };

  const handleNextWeek = () => {
    setWeekReferenceDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      const ym = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
      if (ym !== currentMonthKey) {
        setCurrentMonthKey(ym);
      }
      return next;
    });
  };

  // 1. Gather all calendar events for the active month
  const allMonthEvents = useMemo(() => {
    return getCalendarEventsForMonth(
      currentMonthKey,
      bills,
      monthlyBillEntries,
      reconciledAccounts,
      receivables,
      recurringTransactions,
      state.transactions
    );
  }, [
    currentMonthKey,
    bills,
    monthlyBillEntries,
    reconciledAccounts,
    receivables,
    recurringTransactions,
    state.transactions,
  ]);

  // 2. Metrics summary
  const metrics = useMemo(() => {
    return calculateMonthCalendarMetrics(allMonthEvents, currentMonthKey);
  }, [allMonthEvents, currentMonthKey]);

  // 3. Filtered events
  const filteredEvents = useMemo(() => {
    return allMonthEvents.filter((e) => {
      if (typeFilter !== 'all' && e.eventType !== typeFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (selectedDayNumber !== null && e.dueDay !== selectedDayNumber) return false;
      return true;
    });
  }, [allMonthEvents, typeFilter, statusFilter, selectedDayNumber]);

  // 4. Month Grid Structure computation
  const monthGridData = useMemo(() => {
    const [year, month] = currentMonthKey.split('-').map(Number);
    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Sun, 1 = Mon ...
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayMonthKey = getMonthKey();
    const todayDayNumber = today.getDate();

    // Map events by dueDay
    const eventsByDay = new Map<number, CalendarEvent[]>();
    for (const e of allMonthEvents) {
      const list = eventsByDay.get(e.dueDay) || [];
      list.push(e);
      eventsByDay.set(e.dueDay, list);
    }

    const cells: {
      dayNumber: number | null;
      isToday: boolean;
      isSelected: boolean;
      events: CalendarEvent[];
      hasOverdue: boolean;
      hasPending: boolean;
      hasPaid: boolean;
      hasCollection: boolean;
    }[] = [];

    // Empty lead cells
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({
        dayNumber: null,
        isToday: false,
        isSelected: false,
        events: [],
        hasOverdue: false,
        hasPending: false,
        hasPaid: false,
        hasCollection: false,
      });
    }

    // Days in current month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayEvents = eventsByDay.get(day) || [];
      const isToday = currentMonthKey === todayMonthKey && day === todayDayNumber;
      const isSelected = selectedDayNumber === day;

      cells.push({
        dayNumber: day,
        isToday,
        isSelected,
        events: dayEvents,
        hasOverdue: dayEvents.some((e) => e.status === 'overdue'),
        hasPending: dayEvents.some((e) => e.status === 'unpaid' || e.status === 'partially_paid'),
        hasPaid: dayEvents.some((e) => e.status === 'paid'),
        hasCollection: dayEvents.some((e) => e.isCollection),
      });
    }

    return cells;
  }, [currentMonthKey, allMonthEvents, selectedDayNumber]);

  // 5. Week View Computation (7 days Sun-Sat for the week containing weekReferenceDate)
  const weekData = useMemo(() => {
    const ref = new Date(weekReferenceDate);
    const dayOfWeek = ref.getDay(); // 0 = Sun
    const startOfWeek = new Date(ref);
    startOfWeek.setDate(ref.getDate() - dayOfWeek);

    const days = [];
    const today = new Date();
    const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < 7; i++) {
      const current = new Date(startOfWeek);
      current.setDate(startOfWeek.getDate() + i);

      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const isToday = dateStr === todayYMD;

      // Filter events matching this date
      const dayEvents = allMonthEvents.filter((ev) => {
        if (ev.dueDate === dateStr) return true;
        // Also match if dueDay matches and month matches
        const evMonthKey = ev.dueDate.slice(0, 7);
        return evMonthKey === `${y}-${m}` && ev.dueDay === current.getDate();
      });

      const dayTotalDues = dayEvents
        .filter((e) => !e.isCollection && e.status !== 'paid')
        .reduce((sum, e) => sum + e.amount, 0);

      const dayTotalCollections = dayEvents
        .filter((e) => e.isCollection)
        .reduce((sum, e) => sum + e.amount, 0);

      days.push({
        date: current,
        dateStr,
        dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
        dayNumber: current.getDate(),
        monthLabel: current.toLocaleString('default', { month: 'short' }),
        isToday,
        events: dayEvents,
        totalDues: dayTotalDues,
        totalCollections: dayTotalCollections,
      });
    }

    return {
      days,
      startLabel: `${days[0].monthLabel} ${days[0].dayNumber}`,
      endLabel: `${days[6].monthLabel} ${days[6].dayNumber}, ${days[6].date.getFullYear()}`,
    };
  }, [weekReferenceDate, allMonthEvents]);

  // Handle Event Tap
  const handleEventClick = (event: CalendarEvent) => {
    if (event.eventType === 'bill') {
      setBillForPayment(event);
    } else if (event.eventType === 'receivable') {
      setReceivableForPayment(event);
    } else if (event.eventType === 'credit') {
      setCreditForPayment(event);
    } else if (event.eventType === 'loan') {
      setLoanForPayment(event);
    } else if (event.eventType === 'recurring') {
      setRecurringForPayment(event);
    }
  };

  const handleRevertEvent = (ev: CalendarEvent) => {
    if (ev.eventType === 'bill') {
      if (
        window.confirm(
          `Undo payment for "${ev.title}" for ${formatMonthLabel(
            ev.monthKey
          )}? This will revert this bill to unsettled and restore your wallet balance.`
        )
      ) {
        revertBillPayment(ev.sourceId, ev.monthKey);
      }
    } else if (ev.eventType === 'credit' || ev.eventType === 'loan') {
      const lastPayId =
        ev.purchaseData?.payments && ev.purchaseData.payments.length > 0
          ? ev.purchaseData.payments[ev.purchaseData.payments.length - 1].id
          : undefined;

      if (
        window.confirm(
          `Undo repayment for "${ev.title}"? This will revert your ${
            ev.eventType === 'credit' ? 'credit' : 'loan'
          } to unsettled and refund your wallet.`
        )
      ) {
        revertAccountPayment(ev.sourceId, lastPayId);
      }
    } else if (ev.eventType === 'recurring') {
      if (
        window.confirm(
          `Undo recorded ${
            ev.isCollection || ev.recurringData?.type === 'income' ? 'deposit' : 'payment'
          } for "${ev.title}" for ${formatMonthLabel(
            ev.monthKey
          )}? This will mark it as unsettled and update your wallet balance.`
        )
      ) {
        revertSalaryDeposit(ev.sourceId, ev.monthKey);
      }
    } else if (ev.eventType === 'receivable' && ev.receivableData) {
      const lastPay =
        ev.receivableData.payments && ev.receivableData.payments.length > 0
          ? ev.receivableData.payments[ev.receivableData.payments.length - 1]
          : null;
      if (lastPay) {
        if (
          window.confirm(
            `Undo payment collection of ${formatPeso(lastPay.amount)} from ${
              ev.receivableData.personName
            }? This will revert it to unsettled.`
          )
        ) {
          deleteReceivablePayment(ev.receivableData.id, lastPay.id);
        }
      }
    }
  };

  return (
    <div className="space-y-4 pb-12 w-full max-w-full min-w-0 overflow-hidden">
      {/* 1. Header & Month Navigator */}
      <div className="bg-white dark:bg-[#15221B] rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-[#252923] dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#174F32] dark:text-[#83C95B]" />
            <span>Bill & Debt Calendar</span>
          </h1>
          <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
            Unified schedule of bills, credit cards, loans, and collections
          </p>
        </div>

        {/* View Switcher & Month Navigation Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Month Jump Controls */}
          <div className="flex items-center bg-[#E8E4DA] dark:bg-[#16241C] rounded-2xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-white dark:hover:bg-[#1E2E23] text-[#61685D] dark:text-[#9EA59B] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-extrabold text-[#252923] dark:text-white hover:opacity-80 transition-opacity whitespace-nowrap"
            >
              {formatMonthLabel(currentMonthKey)}
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-white dark:hover:bg-[#1E2E23] text-[#61685D] dark:text-[#9EA59B] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View Mode Switcher: Month, Week, Agenda */}
          <div className="flex items-center bg-[#E8E4DA] dark:bg-[#16241C] rounded-2xl p-1 shadow-2xs">
            {(
              [
                { id: 'month', label: 'Month' },
                { id: 'week', label: 'Week' },
                { id: 'agenda', label: 'Agenda' },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewMode(v.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  viewMode === v.id
                    ? 'bg-[#174F32] text-white shadow-2xs'
                    : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Responsive Calendar KPI Summary Cards (2 cols on mobile/tablet, 4 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="p-3.5 sm:p-4 rounded-[22px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] font-semibold text-[#777D75] dark:text-[#8FA095] truncate">
            Total Bills Due
          </div>
          <div className="text-base sm:text-lg font-black tabular-nums text-[#252923] dark:text-white mt-0.5">
            {formatPeso(metrics.totalBillsDue, { hide })}
          </div>
          <div className="text-[10px] text-[#777D75] mt-1 truncate">
            Paid: {formatPeso(metrics.totalBillsPaid, { hide })}
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-[22px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] font-semibold text-[#777D75] dark:text-[#8FA095] truncate">
            Credit & Loan Dues
          </div>
          <div className="text-base sm:text-lg font-black tabular-nums text-[#174F32] dark:text-[#83C95B] mt-0.5">
            {formatPeso(metrics.upcomingCreditAndLoans, { hide })}
          </div>
          <div className="text-[10px] text-[#777D75] mt-1 truncate">
            Active credit cards & loans
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-[22px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] font-semibold text-[#777D75] dark:text-[#8FA095] truncate">
            Overdue Payments
          </div>
          <div
            className={`text-base sm:text-lg font-black tabular-nums mt-0.5 ${
              metrics.overdueCount > 0 ? 'text-[#DC2626]' : 'text-[#777D75]'
            }`}
          >
            {metrics.overdueCount > 0
              ? formatPeso(metrics.overdueAmount, { hide })
              : 'None'}
          </div>
          <div className="text-[10px] text-[#777D75] mt-1 truncate">
            {metrics.overdueCount} {metrics.overdueCount === 1 ? 'obligation' : 'obligations'} past due
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-[22px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[11px] font-semibold text-[#777D75] dark:text-[#8FA095] truncate">
            Expected Collections
          </div>
          <div className="text-base sm:text-lg font-black tabular-nums text-[#16A34A] dark:text-[#83C95B] mt-0.5">
            {formatPeso(metrics.expectedCollections, { hide })}
          </div>
          <div className="text-[10px] text-[#777D75] mt-1 truncate">
            Collected: {formatPeso(metrics.collectedAmount, { hide })}
          </div>
        </div>
      </div>

      {/* 3. Category & Status Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Type Filter Buttons */}
        <div className="bg-[#E8E4DA] dark:bg-[#16241C] p-1 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar shadow-2xs">
          {(
            [
              { id: 'all', label: 'All Items' },
              { id: 'bill', label: 'Bills' },
              { id: 'credit', label: 'Credit Cards' },
              { id: 'loan', label: 'Loans' },
              { id: 'receivable', label: 'Receivables' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeFilter(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                typeFilter === t.id
                  ? 'bg-[#174F32] text-white shadow-2xs'
                  : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'unpaid', label: 'Pending' },
              { id: 'paid', label: 'Paid' },
              { id: 'overdue', label: 'Overdue' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === s.id
                  ? 'bg-[#174F32] text-white dark:bg-[#83C95B] dark:text-[#174F32] shadow-2xs'
                  : 'bg-white dark:bg-[#15221B] text-[#61685D] dark:text-[#9EA59B] border border-[#E5E1D8] dark:border-[#223528]'
              }`}
            >
              {s.label}
            </button>
          ))}

          {selectedDayNumber !== null && (
            <button
              type="button"
              onClick={() => setSelectedDayNumber(null)}
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 whitespace-nowrap"
            >
              Day {selectedDayNumber} ✕
            </button>
          )}
        </div>
      </div>

      {/* 4. VIEW: MONTH VIEW GRID */}
      {viewMode === 'month' && (
        <div className="bg-white dark:bg-[#15221B] rounded-[24px] p-3 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] overflow-hidden">
          {/* Weekday Labels Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-[#777D75] dark:text-[#8FA095] pb-2 border-b border-[#E5E1D8] dark:border-[#223528]">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 pt-2">
            {monthGridData.map((cell, idx) => {
              if (cell.dayNumber === null) {
                return (
                  <div
                    key={`empty_${idx}`}
                    className="h-14 sm:h-20 lg:h-24 rounded-xl bg-transparent"
                  />
                );
              }

              const hasEvents = cell.events.length > 0;
              const isSelected = cell.isSelected;

              return (
                <button
                  key={`day_${cell.dayNumber}`}
                  type="button"
                  onClick={() => {
                    setSelectedDayNumber(
                      selectedDayNumber === cell.dayNumber ? null : cell.dayNumber
                    );
                  }}
                  className={`h-14 sm:h-20 lg:h-24 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl flex flex-col justify-between text-left transition-all relative ${
                    isSelected
                      ? 'bg-[#174F32] text-white shadow-md ring-2 ring-[#174F32] dark:ring-[#83C95B]'
                      : cell.isToday
                      ? 'bg-[#E8E4DA] dark:bg-[#1E2E23] font-bold text-[#252923] dark:text-white'
                      : 'hover:bg-[#F6F4EE] dark:hover:bg-[#1A2A20] text-[#252923] dark:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs sm:text-sm font-bold tabular-nums ${
                        cell.isToday && !isSelected
                          ? 'w-5 h-5 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center text-[10px]'
                          : ''
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Indicator dots */}
                    {hasEvents && (
                      <div className="flex items-center gap-0.5">
                        {cell.hasOverdue && <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />}
                        {cell.hasPending && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                        {cell.hasPaid && <span className="w-1.5 h-1.5 rounded-full bg-[#2E9E6B]" />}
                        {cell.hasCollection && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                      </div>
                    )}
                  </div>

                  {/* Day mini badges preview on tablet/desktop */}
                  <div className="hidden sm:flex flex-col gap-0.5 w-full overflow-hidden mt-0.5">
                    {cell.events.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className={`text-[9px] font-semibold truncate px-1 py-0.5 rounded-sm ${
                          isSelected
                            ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                            : ev.status === 'paid'
                            ? 'bg-emerald-500/15 text-[#2E9E6B]'
                            : ev.status === 'overdue'
                            ? 'bg-red-500/15 text-[#DC2626]'
                            : ev.isCollection
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {cell.events.length > 2 && (
                      <span className="text-[8px] text-neutral-400 font-bold truncate">
                        +{cell.events.length - 2} more
                      </span>
                    )}
                  </div>

                  {/* Mobile badge count */}
                  <div className="sm:hidden flex items-center justify-end w-full">
                    {hasEvents && (
                      <span className="text-[9px] font-bold text-neutral-400">
                        {cell.events.length}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. VIEW: WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="bg-white dark:bg-[#15221B] rounded-[24px] p-3 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] border border-[#E5E1D8] dark:border-[#223528] space-y-4 overflow-hidden">
          {/* Week Header Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D8] dark:border-[#223528]">
            <div>
              <span className="text-xs font-bold text-[#777D75] dark:text-[#8FA095] uppercase tracking-wider">
                Week Range
              </span>
              <div className="text-sm sm:text-base font-black text-[#252923] dark:text-white">
                {weekData.startLabel} – {weekData.endLabel}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevWeek}
                aria-label="Previous week"
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#F6F4EE] dark:bg-[#1A2A20] hover:bg-[#E8E4DA] dark:hover:bg-[#223528] text-[#252923] dark:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setWeekReferenceDate(new Date())}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#F6F4EE] dark:bg-[#1A2A20] text-[#252923] dark:text-white hover:bg-[#E8E4DA] dark:hover:bg-[#223528] transition-colors"
              >
                This Week
              </button>
              <button
                type="button"
                onClick={handleNextWeek}
                aria-label="Next week"
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#F6F4EE] dark:bg-[#1A2A20] hover:bg-[#E8E4DA] dark:hover:bg-[#223528] text-[#252923] dark:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Desktop & Tablet 7-column Week Grid */}
          <div className="hidden md:grid grid-cols-7 gap-2.5">
            {weekData.days.map((day) => (
              <div
                key={day.dateStr}
                className={`flex flex-col min-h-[220px] rounded-2xl p-2.5 border transition-all ${
                  day.isToday
                    ? 'bg-[#F6F4EE]/80 dark:bg-[#1A2A20]/60 border-[#174F32]/40 dark:border-[#83C95B]/40'
                    : 'bg-white dark:bg-[#15221B] border-[#E5E1D8] dark:border-[#223528]'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E1D8] dark:border-[#223528]">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-neutral-400">
                      {day.dayName}
                    </span>
                    <div
                      className={`text-sm font-extrabold tabular-nums ${
                        day.isToday
                          ? 'w-6 h-6 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center text-xs'
                          : 'text-neutral-900 dark:text-neutral-100'
                      }`}
                    >
                      {day.dayNumber}
                    </div>
                  </div>

                  {day.events.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 tabular-nums">
                      {day.events.length}
                    </span>
                  )}
                </div>

                {/* Day Events Column */}
                <div className="flex-1 py-2 space-y-1.5 overflow-y-auto no-scrollbar max-h-[300px]">
                  {day.events.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[10px] text-neutral-400 font-medium py-4">
                      No dues
                    </div>
                  ) : (
                    day.events.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => handleEventClick(ev)}
                        className="w-full text-left p-2 rounded-xl bg-white dark:bg-neutral-800 border border-black/[0.05] dark:border-white/[0.06] hover:border-black/20 dark:hover:border-white/20 transition-all shadow-2xs group"
                      >
                        <div className="text-[11px] font-bold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {ev.title}
                        </div>
                        <div className="text-[10px] font-semibold text-neutral-400 truncate mt-0.5">
                          {ev.category}
                        </div>
                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-black/[0.03] dark:border-white/[0.03]">
                          <span
                            className={`text-xs font-bold tabular-nums ${
                              ev.isCollection
                                ? 'text-[#2E9E6B]'
                                : ev.status === 'paid'
                                ? 'text-neutral-400 line-through'
                                : 'text-neutral-900 dark:text-neutral-100'
                            }`}
                          >
                            {ev.isCollection ? '+' : ''}
                            {formatPeso(ev.amount, { hide })}
                          </span>
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              ev.status === 'paid'
                                ? 'bg-[#2E9E6B]'
                                : ev.status === 'overdue'
                                ? 'bg-[#DC2626]'
                                : 'bg-amber-500'
                            }`}
                          />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Stacked Week View */}
          <div className="md:hidden space-y-2">
            {weekData.days.map((day) => (
              <div
                key={`mobile_${day.dateStr}`}
                className={`p-3 rounded-2xl border transition-all ${
                  day.isToday
                    ? 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-300 dark:border-neutral-700'
                    : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        day.isToday
                          ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      {day.dayName} {day.dayNumber}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {day.monthLabel}
                    </span>
                  </div>

                  {day.events.length > 0 ? (
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 tabular-nums">
                      {day.events.length} {day.events.length === 1 ? 'item' : 'items'}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-400">No items</span>
                  )}
                </div>

                {day.events.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    {day.events.map((ev) => (
                      <div
                        key={`m_ev_${ev.id}`}
                        onClick={() => handleEventClick(ev)}
                        className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-neutral-950 dark:text-white truncate">
                            {ev.title}
                          </div>
                          <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                            <span>{ev.category}</span>
                            <span>•</span>
                            <span
                              className={
                                ev.status === 'paid'
                                  ? 'text-[#2E9E6B]'
                                  : ev.status === 'overdue'
                                  ? 'text-[#DC2626]'
                                  : 'text-amber-500'
                              }
                            >
                              {ev.status}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs sm:text-sm font-bold tabular-nums ${
                              ev.isCollection
                                ? 'text-[#2E9E6B]'
                                : ev.status === 'paid'
                                ? 'text-neutral-400 line-through'
                                : 'text-neutral-900 dark:text-neutral-100'
                            }`}
                          >
                            {ev.isCollection ? '+' : ''}
                            {formatPeso(ev.amount, { hide })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Chronological Agenda View & Selected Day Obligations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-black dark:text-white">
            {selectedDayNumber !== null
              ? `Obligations & Collections for Day ${selectedDayNumber}`
              : `All Scheduled Obligations (${filteredEvents.length})`}
          </h2>
          {selectedDayNumber !== null && (
            <button
              type="button"
              onClick={() => setSelectedDayNumber(null)}
              className="text-xs font-semibold text-neutral-500 hover:text-black dark:hover:text-white"
            >
              Show All Month
            </button>
          )}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-8 rounded-[24px] bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] text-center text-xs sm:text-sm text-[#777D75] dark:text-[#8FA095]">
            No scheduled bills, debt payments, or collections found for this selection.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => handleEventClick(ev)}
                className="bg-white dark:bg-[#15221B] rounded-[22px] p-3.5 sm:p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E5E1D8] dark:border-[#223528] flex items-center justify-between gap-3 hover:border-[#174F32]/30 dark:hover:border-[#83C95B]/30 cursor-pointer transition-all active:scale-[0.99]"
              >
                {/* Left: Icon & Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] text-[#174F32] dark:text-[#83C95B] flex items-center justify-center shrink-0">
                    {ev.eventType === 'bill' ? (
                      ev.category === 'Electricity' ? (
                        <Zap className="w-5 h-5 text-amber-500" />
                      ) : (
                        <Receipt className="w-5 h-5 text-[#174F32] dark:text-[#83C95B]" />
                      )
                    ) : ev.eventType === 'credit' ? (
                      <CreditCard className="w-5 h-5 text-emerald-600 dark:text-[#83C95B]" />
                    ) : ev.eventType === 'loan' ? (
                      <Landmark className="w-5 h-5 text-[#174F32] dark:text-[#83C95B]" />
                    ) : (
                      <HandCoins className="w-5 h-5 text-[#16A34A] dark:text-[#83C95B]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-[#252923] dark:text-white truncate">
                        {ev.title}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#F6F4EE] dark:bg-[#1A2A20] text-[#61685D] dark:text-[#9EA59B] border border-[#E5E1D8] dark:border-[#243A2C] uppercase tracking-wider">
                        {ev.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#777D75] dark:text-[#8FA095] mt-0.5 flex items-center gap-1 truncate">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>Due {ev.dueDate}</span>
                      {ev.notes && <span className="truncate">• {ev.notes}</span>}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Status Badge */}
                <div className="text-right shrink-0">
                  <div
                    className={`text-sm sm:text-base font-extrabold tabular-nums ${
                      ev.isCollection
                        ? 'text-[#16A34A] dark:text-[#83C95B]'
                        : ev.status === 'paid'
                        ? 'text-[#777D75] line-through'
                        : 'text-[#252923] dark:text-white'
                    }`}
                  >
                    {ev.isCollection ? '+' : ''}
                    {formatPeso(ev.amount, { hide })}
                  </div>

                  <div className="mt-1 flex items-center justify-end gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ev.status === 'paid'
                          ? 'bg-emerald-500/15 text-[#16A34A] dark:text-[#83C95B]'
                          : ev.status === 'overdue'
                          ? 'bg-red-500/15 text-[#DC2626]'
                          : ev.status === 'partially_paid'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-[#E8E4DA] dark:bg-[#1E2E23] text-[#61685D] dark:text-[#9EA59B]'
                      }`}
                    >
                      {ev.status === 'paid'
                        ? 'Paid'
                        : ev.status === 'overdue'
                        ? 'Overdue'
                        : ev.status === 'partially_paid'
                        ? 'Partially Paid'
                        : 'Unpaid'}
                    </span>

                    {ev.status === 'paid' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevertEvent(ev);
                        }}
                        className="px-2 py-0.5 rounded-lg border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1 text-[10px] font-bold shrink-0"
                        title="Bawiin / Revert to unsettled"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span className="hidden sm:inline">Undo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Modals */}
      {billForPayment?.billData && (
        <BillDetailModal
          isOpen={!!billForPayment}
          onClose={() => setBillForPayment(null)}
          bill={billForPayment.billData.bill}
          monthKey={currentMonthKey}
          entry={billForPayment.billData.entry}
        />
      )}

      {receivableForPayment?.receivableData && (
        <RecordReceivablePaymentModal
          isOpen={!!receivableForPayment}
          onClose={() => setReceivableForPayment(null)}
          receivable={receivableForPayment.receivableData}
        />
      )}

      {creditForPayment && (
        creditForPayment.purchaseData ? (
          <RecordPurchasePaymentModal
            isOpen={!!creditForPayment}
            onClose={() => setCreditForPayment(null)}
            purchase={
              (reconciledAccounts
                .find((a) => a.id === creditForPayment.sourceId)
                ?.creditInfo?.purchases?.find((p) => p.id === creditForPayment.purchaseData!.id)) ||
              creditForPayment.purchaseData
            }
            accountId={creditForPayment.sourceId}
            accountName={
              reconciledAccounts.find((a) => a.id === creditForPayment.sourceId)?.name ||
              creditForPayment.accountData?.name
            }
            providerId={
              reconciledAccounts.find((a) => a.id === creditForPayment.sourceId)?.providerId ||
              creditForPayment.providerId
            }
            customColor={
              reconciledAccounts.find((a) => a.id === creditForPayment.sourceId)?.customColor ||
              creditForPayment.customColor
            }
            category="Credit"
            initialAmount={creditForPayment.amount}
            dueDate={creditForPayment.dueDate}
            installmentNumber={creditForPayment.installmentIndex}
            totalInstallments={creditForPayment.totalInstallments}
          />
        ) : (
          creditForPayment.accountData && (
            <PayCreditBillModal
              isOpen={!!creditForPayment}
              onClose={() => setCreditForPayment(null)}
              account={
                reconciledAccounts.find((a) => a.id === creditForPayment.sourceId) ||
                creditForPayment.accountData
              }
            />
          )
        )
      )}

      {loanForPayment && loanForPayment.accountData && (
        <RecordLoanPaymentModal
          isOpen={!!loanForPayment}
          onClose={() => setLoanForPayment(null)}
          account={
            reconciledAccounts.find((a) => a.id === loanForPayment.sourceId) ||
            loanForPayment.accountData
          }
          targetPurchase={
            loanForPayment.purchaseData
              ? (reconciledAccounts
                  .find((a) => a.id === loanForPayment.sourceId)
                  ?.loanInfo?.drawdowns?.find((d) => d.id === loanForPayment.purchaseData!.id) ||
                loanForPayment.purchaseData)
              : undefined
          }
          initialAmount={loanForPayment.amount}
          dueDate={loanForPayment.dueDate}
          installmentNumber={loanForPayment.installmentIndex}
          totalInstallments={loanForPayment.totalInstallments}
        />
      )}

      {recurringForPayment && recurringForPayment.recurringData && (
        <RecordRecurringPaymentModal
          isOpen={!!recurringForPayment}
          onClose={() => setRecurringForPayment(null)}
          recurring={recurringForPayment.recurringData}
          monthKey={recurringForPayment.monthKey}
          dueDate={recurringForPayment.dueDate}
          amount={recurringForPayment.amount}
          amountPaid={recurringForPayment.amountPaid}
          remainingAmount={recurringForPayment.remainingAmount}
          status={recurringForPayment.status}
          isCollection={recurringForPayment.isCollection}
        />
      )}
    </div>
  );
};
