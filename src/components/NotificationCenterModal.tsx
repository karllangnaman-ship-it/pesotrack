import React, { useState, useMemo } from 'react';
import {
  Bell,
  BellOff,
  Calendar,
  Check,
  CheckCheck,
  CreditCard,
  DollarSign,
  Info,
  Layers,
  Receipt,
  ShoppingCart,
  Trash2,
  TrendingDown,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { AppNotification, NotificationScope, NotificationType } from '../types/finance';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string, mode?: 'personal' | 'joint') => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const {
    allNotifications,
    personalNotifications,
    jointNotifications,
    unreadNotificationsCount,
    personalUnreadCount,
    jointUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    accountMode,
    setAccountMode,
    activeJointWorkspace,
  } = useFinance();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'personal' | 'joint'>('all');

  // Filtered list
  const filteredNotifications = useMemo(() => {
    let list = allNotifications;
    if (activeFilter === 'unread') {
      list = list.filter((n) => !n.isRead);
    } else if (activeFilter === 'personal') {
      list = list.filter((n) => n.scope === 'personal');
    } else if (activeFilter === 'joint') {
      list = list.filter((n) => n.scope === 'joint');
    }
    return list;
  }, [allNotifications, activeFilter]);

  if (!isOpen) return null;

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id, notif.scope);
    }

    if (notif.scope === 'joint') {
      if (accountMode !== 'joint') {
        setAccountMode('joint');
      }
      if (notif.targetTab) {
        onNavigateTab?.(notif.targetTab, 'joint');
      } else {
        onNavigateTab?.('overview', 'joint');
      }
    } else {
      if (accountMode !== 'personal') {
        setAccountMode('personal');
      }
      if (notif.targetTab) {
        onNavigateTab?.(notif.targetTab, 'personal');
      } else {
        onNavigateTab?.('home', 'personal');
      }
    }

    onClose();
  };

  const renderIcon = (type: NotificationType, scope: NotificationScope) => {
    switch (type) {
      case 'bill_due':
      case 'bill_paid':
        return <Receipt className="w-4 h-4 text-amber-500" />;
      case 'debt_due':
      case 'debt_paid':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'transaction_added':
      case 'transaction_deleted':
        return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case 'grocery_added':
      case 'grocery_purchased':
        return <ShoppingCart className="w-4 h-4 text-teal-500" />;
      case 'member_invited':
      case 'member_joined':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'account_created':
      case 'account_updated':
        return <CreditCard className="w-4 h-4 text-indigo-500" />;
      default:
        return scope === 'joint' ? (
          <Users className="w-4 h-4 text-[#83C95B]" />
        ) : (
          <User className="w-4 h-4 text-emerald-500" />
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
      return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-center-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-[#0F1813] border border-[#23382B] rounded-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#23382B] flex items-center justify-between gap-3 bg-[#132019]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1A3324] border border-[#2A4B37] text-[#86EFAC] flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="notification-center-title" className="text-base sm:text-lg font-extrabold text-white">
                  Notifications
                </h2>
                {unreadNotificationsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-[#86EFAC] border border-emerald-500/30">
                    {unreadNotificationsCount} new
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8FA095]">
                Joint household changes & personal reminders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadNotificationsCount > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsAsRead()}
                className="px-2.5 py-1.5 rounded-xl bg-[#1A3324] hover:bg-[#234230] text-[#86EFAC] text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Read all</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#8FA095] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 py-2.5 border-b border-[#23382B] bg-[#111C16] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#1F3D2B] text-white shadow-xs'
                : 'text-[#8FA095] hover:text-white hover:bg-white/5'
            }`}
          >
            <span>All</span>
            <span className="text-[10px] opacity-75">({allNotifications.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('unread')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeFilter === 'unread'
                ? 'bg-[#1F3D2B] text-white shadow-xs'
                : 'text-[#8FA095] hover:text-white hover:bg-white/5'
            }`}
          >
            <span>Unread</span>
            {unreadNotificationsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-500/25 text-[#86EFAC]">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('joint')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeFilter === 'joint'
                ? 'bg-[#1F3D2B] text-white shadow-xs'
                : 'text-[#8FA095] hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#86EFAC]" />
            <span>Joint</span>
            {jointUnreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-500/25 text-[#86EFAC]">
                {jointUnreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('personal')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeFilter === 'personal'
                ? 'bg-[#1F3D2B] text-white shadow-xs'
                : 'text-[#8FA095] hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span>Personal</span>
            {personalUnreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-500/25 text-blue-300">
                {personalUnreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#17261E] text-[#8FA095] flex items-center justify-center">
                <BellOff className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">All caught up!</p>
                <p className="text-xs text-[#8FA095] max-w-xs mx-auto">
                  {activeFilter === 'unread'
                    ? 'No unread notifications right now.'
                    : activeFilter === 'joint'
                    ? 'No shared household notifications yet.'
                    : activeFilter === 'personal'
                    ? 'No personal bill or account reminders.'
                    : 'You will receive updates here whenever you or your partner make changes.'}
                </p>
              </div>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  notif.isRead
                    ? 'bg-[#121E17]/60 border-[#1F3325]/70 hover:bg-[#15231B] hover:border-[#27402F]'
                    : 'bg-[#15281D] border-[#2A4E38] hover:bg-[#193223] shadow-xs'
                }`}
              >
                {/* Unread indicator dot */}
                {!notif.isRead && (
                  <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                )}

                {/* Leading icon / actor avatar */}
                <div className="w-9 h-9 rounded-xl bg-[#1A3324] border border-[#284B36] flex items-center justify-center shrink-0 mt-0.5">
                  {renderIcon(notif.type, notif.scope)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        notif.scope === 'joint'
                          ? 'bg-emerald-500/20 text-[#86EFAC]'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {notif.scope === 'joint' ? 'Household' : 'Personal'}
                    </span>

                    {notif.actorName && (
                      <span className="text-[11px] font-bold text-white/90">
                        {notif.actorName}
                      </span>
                    )}

                    <span className="text-[10px] text-[#7A8E80]">
                      • {formatRelativeTime(notif.timestamp)}
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-white leading-snug">
                    {notif.title}
                  </h3>

                  <p className="text-xs text-[#9BB1A3] mt-0.5 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                </div>

                {/* Action buttons on hover */}
                <div
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 self-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!notif.isRead && (
                    <button
                      type="button"
                      onClick={() => markNotificationAsRead(notif.id, notif.scope)}
                      className="p-1.5 rounded-lg text-[#8FA095] hover:text-[#86EFAC] hover:bg-white/5 transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteNotification(notif.id, notif.scope)}
                    className="p-1.5 rounded-lg text-[#8FA095] hover:text-red-400 hover:bg-white/5 transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[#23382B] bg-[#101914] text-center">
          <p className="text-[11px] text-[#7A8E80]">
            Dual notification engine active • Personal & Joint notifications persist across mode switches
          </p>
        </div>
      </div>
    </div>
  );
};
