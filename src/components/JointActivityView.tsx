import React, { useState, useMemo } from 'react';
import {
  Activity,
  ArrowRightLeft,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  HandCoins,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { JointActivityItem, JointWorkspace } from '../types/finance';
import { formatPeso } from '../utils/currency';
import { useFinance } from '../context/FinanceContext';

export interface JointActivityViewProps {
  mode?: 'personal' | 'joint';
  title?: string;
  subtitle?: string;
  workspace?: JointWorkspace | null;
  activities?: JointActivityItem[];
  isRealtimeActive?: boolean;
  isOnline?: boolean;
  lastSyncTime?: string | null;
  currentUserId?: string;
  onRefresh?: () => void;
}

function getLocalDateKey(dateObj: Date): string {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseActivityDateKey(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    return getLocalDateKey(d);
  } catch {
    return '';
  }
}

function formatDisplayDate(dateKey: string): string {
  const todayKey = getLocalDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);

  if (dateKey === todayKey) {
    return `Today — ${new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  }
  if (dateKey === yesterdayKey) {
    return `Yesterday — ${yesterday.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  }

  const [y, m, d] = dateKey.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  return target.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeTime(timestamp: string): string {
  try {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diffSec = Math.floor((now - then) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function formatClockTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export const JointActivityView: React.FC<JointActivityViewProps> = ({
  mode,
  title,
  subtitle,
  workspace: propWorkspace,
  activities: propActivities,
  isRealtimeActive: propIsRealtimeActive,
  isOnline: propIsOnline,
  lastSyncTime: propLastSyncTime,
  currentUserId: propCurrentUserId,
  onRefresh: propOnRefresh,
}) => {
  const finance = useFinance();
  const effectiveMode = mode ?? (finance.accountMode === 'personal' ? 'personal' : 'joint');
  const workspace = propWorkspace ?? (effectiveMode === 'joint' ? finance.activeJointWorkspace : null);
  const activities =
    propActivities ??
    (effectiveMode === 'personal' ? finance.personalActivities : finance.jointActivities);
  const isRealtimeActive =
    propIsRealtimeActive ?? (effectiveMode === 'joint' ? finance.isJointRealtimeActive : true);
  const isOnline = propIsOnline ?? finance.isOnline;
  const lastSyncTime =
    propLastSyncTime ?? (effectiveMode === 'joint' ? finance.jointLastSyncTime : finance.lastSyncTime);
  const currentUserId = propCurrentUserId ?? finance.currentUser?.uid ?? '';
  const onRefresh =
    propOnRefresh ?? (effectiveMode === 'joint' ? finance.refreshJointData : undefined);
  const todayKey = getLocalDateKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterdayDate);

  // Calendar navigation state
  const [displayedYear, setDisplayedYear] = useState<number>(() => new Date().getFullYear());
  const [displayedMonth, setDisplayedMonth] = useState<number>(() => new Date().getMonth()); // 0-indexed
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCalendarExpanded, setIsCalendarExpanded] = useState<boolean>(true);

  // Group all activities by local date key for the red-dot calendar
  const activityCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const act of activities) {
      const key = parseActivityDateKey(act.timestamp);
      if (key) {
        map[key] = (map[key] || 0) + 1;
      }
    }
    return map;
  }, [activities]);

  // Calendar calculations
  const monthStart = new Date(displayedYear, displayedMonth, 1);
  const daysInMonth = new Date(displayedYear, displayedMonth + 1, 0).getDate();
  const startDayOfWeek = monthStart.getDay(); // 0 = Sunday

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (displayedMonth === 0) {
      setDisplayedYear((prev) => prev - 1);
      setDisplayedMonth(11);
    } else {
      setDisplayedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (displayedMonth === 11) {
      setDisplayedYear((prev) => prev + 1);
      setDisplayedMonth(0);
    } else {
      setDisplayedMonth((prev) => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setDisplayedYear(now.getFullYear());
    setDisplayedMonth(now.getMonth());
    setSelectedDateKey(todayKey);
  };

  const displayedMonthName = new Date(displayedYear, displayedMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Filter activities for the selected date and search
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // 1. Match selected date
      if (selectedDateKey !== 'all') {
        const key = parseActivityDateKey(act.timestamp);
        if (key !== selectedDateKey) return false;
      }

      // 2. Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = (act.description || '').toLowerCase().includes(q);
        const matchesActor = (act.actorName || '').toLowerCase().includes(q);
        const matchesCategory = (act.category || '').toLowerCase().includes(q);
        const matchesEntity = (act.entityName || '').toLowerCase().includes(q);
        return matchesDesc || matchesActor || matchesCategory || matchesEntity;
      }

      return true;
    });
  }, [activities, selectedDateKey, searchQuery]);

  const selectedDateActivityTotal = activityCountByDate[selectedDateKey] || 0;

  // Render individual action icon with consistent semantic coloring
  const renderActionBadge = (act: JointActivityItem) => {
    const type = act.actionType;

    if (type === 'bill_paid') {
      return (
        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4.5 h-4.5 stroke-[2.4]" />
        </div>
      );
    }
    if (type === 'bill_created') {
      return (
        <div className="w-8 h-8 rounded-xl bg-[#174F32]/10 dark:bg-[#83C95B]/15 text-[#174F32] dark:text-[#83C95B] flex items-center justify-center shrink-0">
          <Receipt className="w-4.5 h-4.5 stroke-[2.4]" />
        </div>
      );
    }
    if (type === 'grocery_added') {
      return (
        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <ShoppingCart className="w-4.5 h-4.5 stroke-[2.4]" />
        </div>
      );
    }
    if (type === 'grocery_purchased') {
      return (
        <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
          <Check className="w-4.5 h-4.5 stroke-[2.6]" />
        </div>
      );
    }
    if (type === 'grocery_to_expense') {
      return (
        <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Receipt className="w-4.5 h-4.5 stroke-[2.4]" />
        </div>
      );
    }
    if (type === 'transaction_added') {
      if (act.description.toLowerCase().includes('income')) {
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4.5 h-4.5 stroke-[2.4]" />
          </div>
        );
      }
      return (
        <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <TrendingDown className="w-4.5 h-4.5 stroke-[2.4]" />
        </div>
      );
    }
    if (type === 'transaction_deleted') {
      return (
        <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
          <Trash2 className="w-4.5 h-4.5 stroke-[2.4]" />
        </div>
      );
    }
    if (type === 'account_created' || type === 'account_updated') {
      return (
        <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Wallet className="w-4.5 h-4.5 stroke-[2.4]" />
        </div>
      );
    }
    if (type === 'salary_added' || type === 'salary_deposited') {
      return (
        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <HandCoins className="w-4.5 h-4.5 stroke-[2.4]" />
        </div>
      );
    }
    if (type === 'member_joined' || type === 'member_invited') {
      return (
        <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <UserPlus className="w-4.5 h-4.5 stroke-[2.4]" />
        </div>
      );
    }
    if (type === 'member_removed' || type === 'member_left') {
      return (
        <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <UserMinus className="w-4.5 h-4.5 stroke-[2.4]" />
        </div>
      );
    }
    if (type === 'settings_updated') {
      return (
        <div className="w-8 h-8 rounded-xl bg-slate-500/15 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
          <Settings className="w-4.5 h-4.5 stroke-[2.4]" />
        </div>
      );
    }

    return (
      <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
        <Activity className="w-4.5 h-4.5 stroke-[2.4]" />
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn max-w-5xl mx-auto w-full">
      {/* 1. Header Bar: Shared Activity & Summary */}
      <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-4.5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.025)] space-y-3.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#174F32] dark:bg-[#1E382A] text-[#83C95B] flex items-center justify-center shadow-xs shrink-0">
              <Activity className="w-6 h-6 stroke-[2.4]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#252923] dark:text-white tracking-tight flex items-center gap-2">
                <span>{effectiveMode === 'personal' ? 'Personal Activity' : (title || 'Shared Activity')}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#174F32]/10 dark:bg-[#83C95B]/15 text-[#174F32] dark:text-[#83C95B] uppercase tracking-wider">
                  Audit Trail
                </span>
              </h2>
              <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
                {effectiveMode === 'personal'
                  ? 'Your private audit trail of financial actions, transactions, and account changes.'
                  : (subtitle || 'See what everyone has added, changed, and paid in real time.')}
              </p>
            </div>
          </div>

          {/* Quick Actions & Sync Status */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title="Refresh Activity"
                className="p-2 rounded-xl bg-[#F6F4EE] dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#283C2F] text-[#777D75] hover:text-[#174F32] dark:hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
              className="px-3 py-1.5 rounded-xl bg-[#F6F4EE] dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#283C2F] text-xs font-bold text-[#252923] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#174F32] dark:text-[#83C95B]" />
              <span>{isCalendarExpanded ? 'Hide Calendar' : 'Show Calendar'}</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Pill Row */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-[#E5E1D8]/60 dark:border-[#223528]/60">
          <button
            type="button"
            onClick={handleJumpToToday}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedDateKey === todayKey
                ? 'bg-[#174F32] text-white dark:bg-[#1E3B2B] dark:text-[#86EFAC] shadow-2xs'
                : 'bg-[#F6F4EE] dark:bg-[#1C2C23] text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white border border-[#E5E1D8] dark:border-[#283C2F]'
            }`}
          >
            Today ({activityCountByDate[todayKey] || 0})
          </button>

          <button
            type="button"
            onClick={() => setSelectedDateKey(yesterdayKey)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedDateKey === yesterdayKey
                ? 'bg-[#174F32] text-white dark:bg-[#1E3B2B] dark:text-[#86EFAC] shadow-2xs'
                : 'bg-[#F6F4EE] dark:bg-[#1C2C23] text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white border border-[#E5E1D8] dark:border-[#283C2F]'
            }`}
          >
            Yesterday ({activityCountByDate[yesterdayKey] || 0})
          </button>

          <button
            type="button"
            onClick={() => setSelectedDateKey('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedDateKey === 'all'
                ? 'bg-[#174F32] text-white dark:bg-[#1E3B2B] dark:text-[#86EFAC] shadow-2xs'
                : 'bg-[#F6F4EE] dark:bg-[#1C2C23] text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white border border-[#E5E1D8] dark:border-[#283C2F]'
            }`}
          >
            All Activity ({activities.length})
          </button>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[160px] sm:min-w-[220px] ml-auto">
            <Search className="w-3.5 h-3.5 text-[#777D75] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={effectiveMode === 'personal' ? 'Search personal record, bill, item...' : 'Search member, bill, item...'}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-[#F6F4EE] dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#283C2F] text-[#252923] dark:text-white placeholder-[#777D75] focus:outline-none focus:border-[#174F32] dark:focus:border-[#83C95B]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#777D75] hover:text-[#252923] dark:hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Interactive Activity Calendar (with Red Dots on dates with events) */}
      {isCalendarExpanded && (
        <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] space-y-3.5">
          {/* Calendar Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#174F32] dark:text-[#83C95B]" />
              <span className="text-sm font-extrabold text-[#252923] dark:text-white tracking-tight">
                {displayedMonthName}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous Month"
                className="p-1.5 rounded-lg text-[#777D75] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleJumpToToday}
                className="px-2 py-1 rounded-lg text-[11px] font-bold text-[#174F32] dark:text-[#83C95B] hover:bg-[#174F32]/10 dark:hover:bg-[#83C95B]/15 transition-colors cursor-pointer"
              >
                Today
              </button>

              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next Month"
                className="p-1.5 rounded-lg text-[#777D75] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 7-Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-center select-none">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <span key={d} className="text-[10px] sm:text-[11px] font-bold text-[#777D75] uppercase py-1">
                {d}
              </span>
            ))}

            {/* Empty slots for month start alignment */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10 sm:h-12" />
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${displayedYear}-${String(displayedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const count = activityCountByDate[dateStr] || 0;
              const isSelected = selectedDateKey === dateStr;
              const isToday = dateStr === todayKey;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDateKey(dateStr)}
                  className={`h-10 sm:h-12 rounded-2xl flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#174F32] text-white dark:bg-[#1E3B2B] dark:text-[#86EFAC] font-black shadow-xs scale-105 z-10'
                      : isToday
                      ? 'bg-[#E8F3EC] dark:bg-[#183023] text-[#174F32] dark:text-[#83C95B] font-extrabold border border-[#C5E2D1] dark:border-[#264835]'
                      : 'text-[#252923] dark:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5 font-semibold'
                  }`}
                >
                  <span className="text-xs sm:text-sm leading-none">{dayNum}</span>

                  {/* Red dot indicator for actual changes */}
                  {count > 0 && (
                    <div className="flex items-center gap-0.5 mt-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-[#83C95B]' : 'bg-red-500 animate-pulse'
                        }`}
                        title={`${count} event${count === 1 ? '' : 's'} on this date`}
                      />
                      {count > 1 && (
                        <span
                          className={`text-[8px] font-black leading-none ${
                            isSelected ? 'text-[#83C95B]' : 'text-red-500 dark:text-red-400'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="flex items-center justify-between pt-2 border-t border-[#E5E1D8]/60 dark:border-[#223528]/60 text-[11px] text-[#777D75] dark:text-[#8FA095]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>
                {effectiveMode === 'personal'
                  ? 'Red dot indicates dates with recorded personal transactions, payments, or changes.'
                  : 'Red dot indicates dates with actual member changes or transactions.'}
              </span>
            </div>
            <span className="hidden sm:inline font-semibold">
              Tap any date to inspect historical events
            </span>
          </div>
        </div>
      )}

      {/* 3. Selected Date Heading & Timeline Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#174F32] dark:text-[#83C95B]" />
            <h3 className="text-sm font-extrabold text-[#252923] dark:text-white">
              {selectedDateKey === 'all'
                ? (effectiveMode === 'personal' ? 'All Personal Activity' : 'All Activity Feed')
                : formatDisplayDate(selectedDateKey)}
            </h3>
          </div>

          <span className="text-xs font-bold text-[#777D75] dark:text-[#8FA095]">
            {filteredActivities.length} {filteredActivities.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        {/* Timeline Container */}
        {filteredActivities.length === 0 ? (
          <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-8 sm:p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.025)] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F6F4EE] dark:bg-[#1C2C23] text-[#777D75] flex items-center justify-center mx-auto opacity-70">
              <Activity className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-extrabold text-[#252923] dark:text-white">
                {effectiveMode === 'personal' ? 'No personal activity on this date' : 'No activity on this date'}
              </p>
              <p className="text-xs text-[#777D75] dark:text-[#8FA095] max-w-sm mx-auto">
                {effectiveMode === 'personal'
                  ? 'No personal financial changes, transactions, or bill payments were logged on this day.'
                  : 'No financial changes or records were logged on this day. Select a date marked with a red dot to view events.'}
              </p>
            </div>
            {selectedDateKey !== todayKey && (
              <button
                type="button"
                onClick={handleJumpToToday}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#174F32] text-white text-xs font-bold hover:bg-[#123E27] transition-colors shadow-2xs cursor-pointer"
              >
                <span>Jump to Today's Activity</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-4 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.025)] space-y-4">
            <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E1D8] dark:before:bg-[#223528]">
              {filteredActivities.map((act) => {
                const isCurrentUser = currentUserId && act.actorUid === currentUserId;
                const actorInitial = (act.actorName || 'User').charAt(0).toUpperCase();

                return (
                  <div key={act.id} className="relative flex items-start justify-between gap-3 group">
                    {/* Timeline Node Icon */}
                    <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full bg-white dark:bg-[#15221B] border-2 border-[#174F32] dark:border-[#83C95B] flex items-center justify-center shadow-xs">
                      <div className="w-2 h-2 rounded-full bg-[#174F32] dark:bg-[#83C95B]" />
                    </div>

                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Action Type Icon Badge */}
                      {renderActionBadge(act)}

                      <div className="min-w-0 flex-1 space-y-1">
                        {/* Actor Name & Metadata */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div
                            className="w-5 h-5 rounded-full text-white text-[9px] font-black flex items-center justify-center shrink-0"
                            style={{ backgroundColor: act.actorAvatarColor || '#174F32' }}
                          >
                            {actorInitial}
                          </div>
                          <span className="text-xs sm:text-sm font-extrabold text-[#252923] dark:text-white truncate">
                            {act.actorName}
                          </span>
                          {isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-[#E8F3EC] dark:bg-[#183023] text-[#174F32] dark:text-[#83C95B]">
                              You
                            </span>
                          )}
                          <span className="text-[11px] text-[#777D75] dark:text-[#8FA095]">
                            • {formatRelativeTime(act.timestamp)} ({formatClockTime(act.timestamp)})
                          </span>
                        </div>

                        {/* Action Description */}
                        <p className="text-xs sm:text-sm font-semibold text-[#3A4036] dark:text-neutral-200 leading-snug break-words">
                          {act.description}
                        </p>

                        {/* Additional Entity Tags */}
                        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                          {act.category && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F6F4EE] dark:bg-[#1C2C23] text-[#61685D] dark:text-[#9EA59B] border border-[#E5E1D8] dark:border-[#283C2F]">
                              {act.category}
                            </span>
                          )}
                          {act.entityType && (
                            <span className="text-[10px] font-semibold text-[#777D75] uppercase tracking-wider">
                              {act.entityType}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount Pill (if monetary) */}
                    {act.amount !== undefined && (
                      <div className="shrink-0 text-right">
                        <span className="text-xs sm:text-sm font-black tabular-nums text-[#174F32] dark:text-[#83C95B] bg-emerald-500/10 dark:bg-emerald-500/15 px-2.5 py-1 rounded-xl">
                          {formatPeso(act.amount)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
