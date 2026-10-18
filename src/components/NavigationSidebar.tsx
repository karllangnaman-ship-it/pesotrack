import React, { useEffect } from 'react';
import {
  ArrowRightLeft,
  BarChart2,
  Calendar,
  Home,
<<<<<<< HEAD
  Leaf,
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  Moon,
  PanelLeft,
  PanelLeftClose,
  Receipt,
  Settings,
<<<<<<< HEAD
  ShoppingCart,
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  Sun,
  SunMoon,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { ActiveTab, ThemeMode } from '../types/finance';

export interface NavigationSidebarProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsedDesktop: boolean;
  onToggleCollapseDesktop: () => void;
}

export const PRIMARY_NAV_ITEMS: {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'bills', label: 'Bills', icon: Receipt },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'debt-planner', label: 'Debt Planner', icon: TrendingDown },
  { id: 'transactions', label: 'Transactions', icon: ArrowRightLeft },
  { id: 'budgets', label: 'Budgets', icon: BarChart2 },
  { id: 'accounts', label: 'Accounts', icon: Wallet },
  { id: 'reports', label: 'Reports', icon: TrendingUp },
<<<<<<< HEAD
  { id: 'grocery-list', label: 'Grocery List', icon: ShoppingCart },
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
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
    isDarkMode,
    currentUser,
    openAuthModal,
    isOnline,
    syncStatus,
    pendingSyncCount,
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

  const handleItemClick = (tab: ActiveTab) => {
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

  const sidebarContent = (
<<<<<<< HEAD
    <div className="flex flex-col h-full h-[100dvh] min-h-0 w-full select-none bg-white dark:bg-[#121C16] text-[#252923] dark:text-[#F3F4F1]">
      {/* 1. Header: Fixed at top */}
      <div className="flex items-center justify-between px-4 sm:px-5 h-16 sm:h-18 border-b border-[#E5E1D8] dark:border-[#1E2E23] shrink-0">
=======
    <div className="flex flex-col h-full h-[100dvh] min-h-0 w-full select-none bg-white dark:bg-[#0E0F14] text-neutral-900 dark:text-neutral-100">
      {/* 1. Header: Fixed at top */}
      <div className="flex items-center justify-between px-4 sm:px-5 h-16 sm:h-18 border-b border-black/[0.05] dark:border-white/[0.08] shrink-0">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
        <button
          type="button"
          onClick={() => handleItemClick('home')}
          className="flex items-center gap-2.5 text-left group transition-opacity"
        >
<<<<<<< HEAD
          <div className="w-8 h-8 rounded-xl bg-[#174F32] dark:bg-[#1E382A] text-[#83C95B] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
            <Leaf className="w-4.5 h-4.5 fill-[#83C95B]/30 stroke-[2.4]" />
          </div>
          {!isCollapsedDesktop && (
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#174F32] dark:text-white leading-none">
                PesoTrack
              </span>
              <span className="text-[10px] font-semibold text-[#777D75] dark:text-[#8FA095] mt-0.5 tracking-wider uppercase">
                Philippine Finance
=======
          <div className="w-8 h-8 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center font-black text-sm shadow-xs group-hover:scale-105 transition-transform shrink-0">
            ₱
          </div>
          {!isCollapsedDesktop && (
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-neutral-950 dark:text-white leading-none">
                PesoTrack
              </span>
              <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5 tracking-wider uppercase">
                Offline Finance
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
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
<<<<<<< HEAD
            className="lg:hidden p-2 rounded-xl text-[#777D75] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
=======
            className="lg:hidden p-2 rounded-xl text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Rail Collapse Toggle */}
          <button
            type="button"
            onClick={onToggleCollapseDesktop}
            aria-label={isCollapsedDesktop ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsedDesktop ? 'Expand sidebar' : 'Collapse to icon rail'}
<<<<<<< HEAD
            className="hidden lg:flex p-1.5 rounded-xl text-[#777D75] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
=======
            className="hidden lg:flex p-1.5 rounded-xl text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          >
            {isCollapsedDesktop ? (
              <PanelLeft className="w-4.5 h-4.5" />
            ) : (
              <PanelLeftClose className="w-4.5 h-4.5" />
            )}
          </button>
        </div>
      </div>

<<<<<<< HEAD
      {/* 2. Middle Scrollable Navigation Area: Supports smooth vertical scrolling */}
=======
      {/* 2. Middle Scrollable Navigation Area: Supports smooth vertical scrolling both upward and downward */}
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-3 sm:py-4 px-2 sm:px-3 space-y-1 touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {PRIMARY_NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item.id)}
              title={isCollapsedDesktop ? item.label : undefined}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all min-h-[48px] ${
                isCollapsedDesktop ? 'justify-center px-2' : 'justify-start'
              } ${
                isActive
<<<<<<< HEAD
                  ? 'bg-[#174F32] text-white dark:bg-[#1D3B2B] dark:text-[#86EFAC] font-bold shadow-xs'
                  : 'text-[#555C50] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white hover:bg-[#EDE9DF]/60 dark:hover:bg-white/[0.05]'
=======
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'opacity-100 stroke-[2.4]' : 'opacity-80 stroke-[2]'
                }`}
              />
              {!isCollapsedDesktop && (
                <span className="truncate tracking-tight">{item.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Footer Profile & Theme Switcher: Fixed at bottom */}
<<<<<<< HEAD
      <div className="p-3 border-t border-[#E5E1D8] dark:border-[#1E2E23] shrink-0 bg-[#F6F4EE]/60 dark:bg-black/[0.15]">
=======
      <div className="p-3 border-t border-black/[0.05] dark:border-white/[0.08] shrink-0 bg-black/[0.015] dark:bg-white/[0.015]">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
        <div
          className={`flex items-center ${
            isCollapsedDesktop ? 'justify-center' : 'justify-between'
          } gap-2`}
        >
          {!isCollapsedDesktop && (
            <button
              type="button"
              onClick={() => {
                if (currentUser) {
                  handleItemClick('settings');
                } else {
                  openAuthModal('login');
                }
              }}
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left hover:opacity-85 transition-opacity"
            >
<<<<<<< HEAD
              <div className="w-8 h-8 rounded-full bg-[#E3DFD4] dark:bg-[#1B2B20] text-[#174F32] dark:text-[#86EFAC] border border-[#D5D0C3] dark:border-[#2A3E31] flex items-center justify-center text-xs font-black shrink-0">
=======
              <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center text-xs font-bold shrink-0">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                {currentUser?.displayName
                  ? currentUser.displayName[0].toUpperCase()
                  : currentUser?.email
                  ? currentUser.email[0].toUpperCase()
<<<<<<< HEAD
                  : (state.settings.profileName || 'K')[0].toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#252923] dark:text-neutral-100 truncate">
                  {currentUser?.displayName || currentUser?.email?.split('@')[0] || state.settings.profileName || 'Karl'}
                </span>
                <span className="text-[10px] text-[#777D75] dark:text-[#8FA095] flex items-center gap-1 truncate">
=======
                  : (state.settings.profileName || 'P')[0].toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {currentUser?.displayName || currentUser?.email || state.settings.profileName || 'PesoTrack User'}
                </span>
                <span className="text-[10px] text-neutral-400 flex items-center gap-1 truncate">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      !isOnline || syncStatus === 'offline'
                        ? 'bg-neutral-400'
                        : pendingSyncCount > 0
                        ? 'bg-amber-500 animate-pulse'
                        : syncStatus === 'synced'
<<<<<<< HEAD
                        ? 'bg-[#4E9D39]'
=======
                        ? 'bg-[#2E9E6B]'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                        : syncStatus === 'syncing'
                        ? 'bg-blue-500 animate-pulse'
                        : 'bg-amber-500'
                    }`}
                  />
                  {currentUser
                    ? !isOnline || syncStatus === 'offline'
                      ? pendingSyncCount > 0
                        ? `Offline (${pendingSyncCount} pending)`
                        : 'Offline Mode'
                      : pendingSyncCount > 0
                      ? `${pendingSyncCount} Pending Sync`
                      : syncStatus === 'syncing'
                      ? 'Syncing...'
                      : 'Cloud Synced'
<<<<<<< HEAD
                    : 'Personal'}
=======
                    : 'Sign in to sync'}
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                </span>
              </div>
            </button>
          )}

          {/* Theme mode toggle */}
          <button
            type="button"
            onClick={cycleTheme}
            title={`Current theme: ${currentThemeMode}. Click to switch.`}
<<<<<<< HEAD
            className="p-2 rounded-xl text-[#777D75] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
          >
            {currentThemeMode === 'dark' ? (
              <Moon className="w-4 h-4 text-emerald-400" />
            ) : currentThemeMode === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <SunMoon className="w-4 h-4 text-[#777D75]" />
=======
            className="p-2 rounded-xl text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
          >
            {currentThemeMode === 'dark' ? (
              <Moon className="w-4 h-4 text-indigo-400" />
            ) : currentThemeMode === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <SunMoon className="w-4 h-4 text-neutral-400" />
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop & Tablet Permanent / Rail Sidebar (Visible on lg: >= 1024px) */}
      <aside
<<<<<<< HEAD
        className={`hidden lg:flex flex-col sticky top-0 h-screen h-[100dvh] min-h-0 bg-white dark:bg-[#121C16] border-r border-[#E5E1D8] dark:border-[#1E2E23] z-20 transition-all duration-200 ${
=======
        className={`hidden lg:flex flex-col sticky top-0 h-screen h-[100dvh] min-h-0 bg-white dark:bg-[#0E0F14] border-r border-black/[0.05] dark:border-white/[0.08] z-20 transition-all duration-200 ${
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          isCollapsedDesktop ? 'w-[72px]' : 'w-64 xl:w-72'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* 2. Mobile & Tablet Slide-out Drawer (< 1024px) */}
      {isOpenMobile && (
        <div
          role="dialog"
          aria-modal="true"
          className="lg:hidden fixed inset-0 z-50 flex"
        >
          {/* Dimmed backdrop overlay */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
          />

          {/* Drawer Canvas */}
<<<<<<< HEAD
          <div className="relative w-72 sm:w-80 max-w-[85vw] h-full h-[100dvh] min-h-0 bg-white dark:bg-[#121C16] border-r border-[#E5E1D8] dark:border-[#1E2E23] shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
=======
          <div className="relative w-72 sm:w-80 max-w-[85vw] h-full h-[100dvh] min-h-0 bg-white dark:bg-[#0E0F14] border-r border-black/[0.08] dark:border-white/[0.08] shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
