import React, { useEffect } from 'react';
import {
  Activity,
  ArrowRightLeft,
  BarChart2,
  Bell,
  Calendar,
  Home,
  Layers,
  Leaf,
  LogOut,
  MessageSquare,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Receipt,
  Settings,
  ShoppingCart,
  Sun,
  SunMoon,
  TrendingDown,
  TrendingUp,
  User,
  UserCheck,
  Users,
  Wallet,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { JointActiveTab, ThemeMode } from '../types/finance';

export interface JointNavigationSidebarProps {
  activeTab: JointActiveTab;
  onNavigate: (tab: JointActiveTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsedDesktop: boolean;
  onToggleCollapseDesktop: () => void;
}

export const JOINT_NAV_ITEMS: {
  id: JointActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'accounts', label: 'Accounts', icon: Wallet },
  { id: 'transactions', label: 'Transactions', icon: ArrowRightLeft },
  { id: 'bills', label: 'Bills', icon: Receipt },
  { id: 'debt-planner', label: 'Loans and Credit', icon: TrendingDown },
  { id: 'grocery-list', label: 'Grocery List', icon: ShoppingCart },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const JointNavigationSidebar: React.FC<JointNavigationSidebarProps> = ({
  activeTab,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  isCollapsedDesktop,
  onToggleCollapseDesktop,
}) => {
  const {
    state,
    updateSettings,
    currentUser,
    openAuthModal,
    logout,
    isOnline,
    setAccountMode,
    activeJointWorkspace,
    jointAccounts,
    jointTransactions,
    jointBills,
    jointGroceryItems,
    jointActivities,
    jointInvitations,
    jointPendingMutationCount,
    jointUnreadCount,
    jointUnreadMessagesCount,
  } = useFinance();

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpenMobile) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenMobile, onCloseMobile]);

  // Lock background scroll when mobile drawer is open
  useEffect(() => {
    if (isOpenMobile) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpenMobile]);

  const handleItemClick = (tab: JointActiveTab) => {
    onNavigate(tab);
    onCloseMobile();
  };

  const currentThemeMode: ThemeMode =
    state.settings.themeMode || (state.settings.darkMode ? 'dark' : 'system');

  const cycleTheme = () => {
    const next: ThemeMode =
      currentThemeMode === 'dark'
        ? 'light'
        : currentThemeMode === 'light'
        ? 'system'
        : 'dark';
    updateSettings({ themeMode: next, darkMode: next === 'dark' });
  };

  // Badge counts
  const pendingInvitesCount = jointInvitations.filter((i) => i.status === 'pending').length;
  const unpurchasedGroceriesCount = jointGroceryItems.filter((g) => !g.isPurchased && !g.isDeleted).length;

  // Determine current user's role in active joint workspace
  const myMemberRecord = activeJointWorkspace?.members?.find(
    (m) => m.uid === currentUser?.uid || m.email?.toLowerCase() === currentUser?.email?.toLowerCase()
  );
  const isOwner = activeJointWorkspace?.ownerUid === currentUser?.uid || myMemberRecord?.role === 'owner';
  const roleLabel = isOwner ? 'Owner' : 'Partner';

  const sidebarContent = (
    <div className="flex flex-col h-full h-[100dvh] min-h-0 w-full select-none bg-white dark:bg-[#121C16] text-[#252923] dark:text-[#F3F4F1]">
      {/* 1. Header: Fixed at top */}
      <div className="flex items-center justify-between px-4 sm:px-5 h-16 sm:h-18 border-b border-[#E5E1D8] dark:border-[#1E2E23] shrink-0">
        <button
          type="button"
          onClick={() => handleItemClick('home')}
          className="flex items-center gap-2.5 text-left group transition-opacity"
        >
          <div className="w-8 h-8 rounded-xl bg-[#174F32] dark:bg-[#1E382A] text-[#83C95B] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
            <Users className="w-4.5 h-4.5 stroke-[2.4]" />
          </div>
          {!isCollapsedDesktop && (
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#174F32] dark:text-white leading-none">
                PesoTrack
              </span>
              <span className="text-[10px] font-bold text-[#83C95B] dark:text-[#83C95B] mt-0.5 tracking-wider uppercase">
                Joint Finances
              </span>
            </div>
          )}
        </button>

        {/* Desktop Collapse Toggle / Mobile Close Button */}
        <div className="flex items-center gap-1">
          {/* Mobile close button (X) */}
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="lg:hidden p-2 rounded-xl text-[#777D75] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Rail Collapse Toggle */}
          <button
            type="button"
            onClick={onToggleCollapseDesktop}
            aria-label={isCollapsedDesktop ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsedDesktop ? 'Expand sidebar' : 'Collapse to icon rail'}
            className="hidden lg:flex p-1.5 rounded-xl text-[#777D75] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            {isCollapsedDesktop ? (
              <PanelLeft className="w-4.5 h-4.5" />
            ) : (
              <PanelLeftClose className="w-4.5 h-4.5" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Middle Scrollable Navigation Area */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-3 sm:py-4 px-2 sm:px-3 space-y-1.5 touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Active Workspace Info Pill (When not collapsed) */}
        {!isCollapsedDesktop && activeJointWorkspace && (
          <div className="mb-2 p-3 rounded-2xl bg-[#E8F3EC] dark:bg-[#183023] border border-[#C5E2D1] dark:border-[#264835] space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-[#174F32] dark:text-[#83C95B] truncate">
                {activeJointWorkspace.name}
              </span>
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-[#174F32]/10 dark:bg-[#83C95B]/15 text-[#174F32] dark:text-[#83C95B]">
                {roleLabel}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#777D75] dark:text-[#8FA095]">
              <span className="truncate">
                {activeJointWorkspace.members?.length || 1} / 2 Members
              </span>
              <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {isOnline ? 'Synced' : 'Offline'}
              </span>
            </div>
          </div>
        )}

        {/* Switch Back to Personal Mode Action */}
        <button
          type="button"
          onClick={() => {
            setAccountMode('personal');
            onCloseMobile();
          }}
          title={isCollapsedDesktop ? 'Switch to Personal Account' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 mb-2 rounded-2xl text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
            isCollapsedDesktop ? 'justify-center px-2' : 'justify-start'
          } text-[#555C50] dark:text-[#9EA59B] bg-[#F6F4EE] dark:bg-[#16241C] hover:text-[#174F32] dark:hover:text-white hover:bg-[#EAE6DC] dark:hover:bg-[#1E3025] border border-[#E5E1D8] dark:border-[#203426]`}
        >
          <User className="w-4 h-4 shrink-0 text-[#174F32] dark:text-[#83C95B] stroke-[2.3]" />
          {!isCollapsedDesktop && (
            <div className="flex items-center justify-between flex-1 min-w-0">
              <span className="truncate">Switch to Personal Account</span>
              <span className="text-[10px] text-[#777D75] font-semibold">Vault</span>
            </div>
          )}
        </button>

        <div className="h-[1px] bg-[#E5E1D8]/60 dark:bg-[#1E2E23]/60 my-2" />

        {/* 10 Joint Navigation Items */}
        {JOINT_NAV_ITEMS.map((item) => {
          const isActive =
            activeTab === item.id ||
            (item.id === 'home' && activeTab === 'overview') ||
            (item.id === 'grocery-list' && activeTab === 'groceries') ||
            (item.id === 'debt-planner' && activeTab === 'debt');
          const Icon = item.icon;

          let badgeCount: number | null = null;
          if ((item.id === 'grocery-list' || item.id === 'groceries') && unpurchasedGroceriesCount > 0) {
            badgeCount = unpurchasedGroceriesCount;
          } else if (item.id === 'messages' && jointUnreadMessagesCount > 0) {
            badgeCount = jointUnreadMessagesCount;
          } else if ((item.id === 'settings' || item.id === 'members') && pendingInvitesCount > 0) {
            badgeCount = pendingInvitesCount;
          } else if (item.id === 'notifications' && jointUnreadCount > 0) {
            badgeCount = jointUnreadCount;
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item.id)}
              title={isCollapsedDesktop ? item.label : undefined}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all min-h-[46px] cursor-pointer ${
                isCollapsedDesktop ? 'justify-center px-2' : 'justify-start'
              } ${
                isActive
                  ? 'bg-[#174F32] text-white dark:bg-[#1D3B2B] dark:text-[#86EFAC] font-bold shadow-xs'
                  : 'text-[#555C50] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white hover:bg-[#EDE9DF]/60 dark:hover:bg-white/[0.05]'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'opacity-100 stroke-[2.4]' : 'opacity-80 stroke-[2]'
                }`}
              />
              {!isCollapsedDesktop && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate tracking-tight">{item.label}</span>
                  {badgeCount !== null && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        item.id === 'members'
                          ? 'bg-emerald-500 text-white animate-pulse'
                          : 'bg-[#174F32]/10 dark:bg-[#83C95B]/20 text-[#174F32] dark:text-[#83C95B]'
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Footer Profile & Theme Switcher: Fixed at bottom */}
      <div className="p-3 border-t border-[#E5E1D8] dark:border-[#1E2E23] shrink-0 bg-[#F6F4EE]/60 dark:bg-black/[0.15]">
        <div
          className={`flex items-center ${
            isCollapsedDesktop ? 'justify-center' : 'justify-between'
          } gap-2`}
        >
          {!isCollapsedDesktop && (
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {currentUser ? (
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-[#174F32] text-[#83C95B] font-extrabold text-xs flex items-center justify-center shrink-0">
                    {currentUser.displayName?.charAt(0).toUpperCase() ||
                      currentUser.email?.charAt(0).toUpperCase() ||
                      'U'}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold text-[#252923] dark:text-white truncate">
                      {currentUser.displayName || state.settings.profileName || 'Joint User'}
                    </span>
                    <span className="text-[10px] text-[#777D75] dark:text-[#8FA095] truncate">
                      {currentUser.email || 'Online Account'}
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-2 text-xs font-bold text-[#174F32] dark:text-[#83C95B] hover:underline"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Sign In for Joint Vault</span>
                </button>
              )}
            </div>
          )}

          {/* Theme switcher */}
          <button
            type="button"
            onClick={cycleTheme}
            aria-label={`Current theme: ${currentThemeMode}. Tap to cycle theme.`}
            title={`Theme: ${currentThemeMode}`}
            className="p-2 rounded-xl text-[#777D75] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
          >
            {currentThemeMode === 'dark' ? (
              <Moon className="w-4.5 h-4.5 text-[#83C95B]" />
            ) : currentThemeMode === 'light' ? (
              <Sun className="w-4.5 h-4.5 text-amber-500" />
            ) : (
              <SunMoon className="w-4.5 h-4.5" />
            )}
          </button>

          {/* Logout button (if logged in and not collapsed) */}
          {!isCollapsedDesktop && currentUser && (
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-2 rounded-xl text-[#777D75] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* A. Desktop Sidebar: Persistent or Collapsed Rail */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out border-r border-[#E5E1D8] dark:border-[#1E2E23] z-20 ${
          isCollapsedDesktop ? 'w-20' : 'w-64 xl:w-72'
        }`}
      >
        <div className="sticky top-0 h-screen h-[100dvh]">
          {sidebarContent}
        </div>
      </aside>

      {/* B. Mobile Drawer (Slide-out Overlay with Backdrop) */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-visibility duration-300 ${
          isOpenMobile ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
        }`}
        aria-hidden={!isOpenMobile}
      >
        {/* Backdrop */}
        <div
          onClick={onCloseMobile}
          className={`absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
            isOpenMobile ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Drawer Panel */}
        <div
          className={`absolute top-0 bottom-0 left-0 w-[min(82vw,320px)] max-w-full bg-white dark:bg-[#121C16] shadow-2xl transition-transform duration-300 ease-out transform ${
            isOpenMobile ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
};
