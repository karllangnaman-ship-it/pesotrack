import React, { useState, useMemo } from 'react';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  CreditCard,
  DollarSign,
  Receipt,
  ShoppingCart,
  Trash2,
  TrendingDown,
  User,
  Users,
  ArrowRight,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { AppNotification, NotificationType, ActiveTab } from '../types/finance';

interface NotificationsPageProps {
  mode: 'personal' | 'joint';
  onNavigate: (tab: ActiveTab) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  mode,
  onNavigate,
}) => {
  const {
    personalNotifications,
    jointNotifications,
    personalUnreadCount,
    jointUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    activeJointWorkspace,
  } = useFinance();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const notifications = useMemo(() => {
    const list = mode === 'joint' ? jointNotifications : personalNotifications;
    if (filter === 'unread') {
      return list.filter((n) => !n.isRead);
    }
    return list;
  }, [mode, jointNotifications, personalNotifications, filter]);

  const unreadCount = mode === 'joint' ? jointUnreadCount : personalUnreadCount;

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id, notif.scope);
    }
    if (notif.targetTab) {
      onNavigate(notif.targetTab as ActiveTab);
    }
  };

  const renderIcon = (type: NotificationType) => {
    switch (type) {
      case 'bill_due':
      case 'bill_paid':
        return <Receipt className="w-5 h-5 text-amber-500" />;
      case 'debt_due':
      case 'debt_paid':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      case 'transaction_added':
      case 'transaction_deleted':
      case 'salary_deposited':
        return <DollarSign className="w-5 h-5 text-emerald-500" />;
      case 'grocery_added':
      case 'grocery_purchased':
        return <ShoppingCart className="w-5 h-5 text-teal-500" />;
      case 'member_invited':
      case 'member_joined':
        return <Users className="w-5 h-5 text-blue-500" />;
      case 'account_created':
      case 'account_updated':
        return <CreditCard className="w-5 h-5 text-indigo-500" />;
      default:
        return mode === 'joint' ? (
          <Users className="w-5 h-5 text-[#83C95B]" />
        ) : (
          <User className="w-5 h-5 text-emerald-500" />
        );
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const now = new Date();
      const past = new Date(isoString);
      const diffMs = now.getTime() - past.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      if (diffDay === 1) return 'Yesterday';
      if (diffDay < 7) return `${diffDay}d ago`;
      return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn max-w-4xl mx-auto w-full">
      {/* 1. Header Card */}
      <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.025)] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#174F32] dark:bg-[#1E382A] text-[#83C95B] flex items-center justify-center shadow-xs shrink-0">
              <Bell className="w-6 h-6 stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-extrabold text-[#252923] dark:text-white tracking-tight">
                  {mode === 'joint' ? 'Joint Notifications' : 'Personal Notifications'}
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#174F32]/10 dark:bg-[#83C95B]/20 text-[#174F32] dark:text-[#86EFAC] border border-[#174F32]/20 dark:border-[#83C95B]/30">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-xs text-[#777D75] dark:text-[#8FA095] mt-0.5">
                {mode === 'joint'
                  ? `Collaborative updates and alerts for ${activeJointWorkspace?.name || 'Shared Finances'}`
                  : 'Reminders, bills due, and activity alerts for your personal vault'}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllNotificationsAsRead(mode)}
              className="px-3.5 py-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] dark:bg-[#1E382A] dark:hover:bg-[#284937] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
            >
              <CheckCheck className="w-4 h-4 text-[#83C95B]" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F6F4EE] dark:bg-[#111C15] rounded-xl w-max border border-[#E5E1D8] dark:border-[#223528]">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-white dark:bg-[#15221B] text-[#174F32] dark:text-[#83C95B] shadow-2xs'
                : 'text-[#777D75] dark:text-[#8FA095] hover:text-[#252923] dark:hover:text-white'
            }`}
          >
            All ({mode === 'joint' ? jointNotifications.length : personalNotifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'unread'
                ? 'bg-white dark:bg-[#15221B] text-[#174F32] dark:text-[#83C95B] shadow-2xs'
                : 'text-[#777D75] dark:text-[#8FA095] hover:text-[#252923] dark:hover:text-white'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {/* 2. Notifications List */}
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] rounded-3xl p-10 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-neutral-100 dark:bg-[#1C2C23] text-neutral-400 dark:text-neutral-500 flex items-center justify-center">
              <BellOff className="w-7 h-7 stroke-[1.8]" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#252923] dark:text-white">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-xs text-[#777D75] dark:text-[#8FA095] max-w-sm mx-auto">
                {mode === 'joint'
                  ? 'Shared notifications from partner transactions, shared bills, and invitations will appear here.'
                  : 'Bill due dates, recorded transactions, and personal budget alerts will appear here.'}
              </p>
            </div>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`group p-4 sm:p-4.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                notif.isRead
                  ? 'bg-white dark:bg-[#15221B] border-[#E5E1D8] dark:border-[#223528] hover:border-[#174F32]/30 dark:hover:border-[#83C95B]/30'
                  : 'bg-[#F2F8F4] dark:bg-[#16271D] border-[#C7E3D1] dark:border-[#284936] shadow-2xs hover:border-[#174F32] dark:hover:border-[#83C95B]'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1A2E22] border border-[#E5E1D8] dark:border-[#284936] flex items-center justify-center shrink-0 shadow-2xs">
                  {renderIcon(notif.type)}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className={`text-sm truncate ${
                        notif.isRead
                          ? 'font-bold text-[#252923] dark:text-white'
                          : 'font-extrabold text-[#174F32] dark:text-[#86EFAC]'
                      }`}
                    >
                      {notif.title}
                    </h3>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </div>

                  <p className="text-xs text-[#555C50] dark:text-[#C5CDC3] leading-relaxed line-clamp-2">
                    {notif.message}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-[#777D75] dark:text-[#8FA095] pt-0.5">
                    <span>{formatRelativeTime(notif.timestamp)}</span>
                    {notif.targetTab && (
                      <span className="inline-flex items-center gap-0.5 text-[#174F32] dark:text-[#83C95B] font-semibold group-hover:underline">
                        <span>View {notif.targetTab}</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                {!notif.isRead && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markNotificationAsRead(notif.id, notif.scope);
                    }}
                    title="Mark as read"
                    className="p-1.5 rounded-lg text-[#777D75] hover:text-[#174F32] dark:hover:text-[#86EFAC] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notif.id, notif.scope);
                  }}
                  title="Delete notification"
                  className="p-1.5 rounded-lg text-[#777D75] hover:text-red-600 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
