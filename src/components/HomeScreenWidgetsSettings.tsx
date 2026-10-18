import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  ExternalLink,
  HelpCircle,
  Info,
  Landmark,
  Layers,
  Leaf,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Utensils,
  Wallet,
  Wifi,
  Zap,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  computeWidgetMetrics,
  isNativeWidgetSupported,
  pinWidgetToHomeScreen,
  WidgetType,
} from '../services/widgetBridgeService';
import { formatPeso } from '../utils/currency';

interface HomeScreenWidgetsSettingsProps {
  onNavigateTab?: (tab: any) => void;
}

export const HomeScreenWidgetsSettings: React.FC<HomeScreenWidgetsSettingsProps> = () => {
  const { state, currentUser, showToast } = useFinance();
  const [pinningWidget, setPinningWidget] = useState<WidgetType | null>(null);
  const [activeManualModal, setActiveManualModal] = useState<WidgetType | null>(null);
  const [showWebNoticeModal, setShowWebNoticeModal] = useState(false);

  const isAndroid = isNativeWidgetSupported();

  // Compute live financial summary using user's actual transactions
  const liveMetrics = computeWidgetMetrics(
    state.transactions || [],
    Boolean(currentUser),
    currentUser?.displayName || state.settings?.profileName || 'User'
  );

  const handleAddWidget = async (type: WidgetType) => {
    if (!isAndroid) {
      setShowWebNoticeModal(true);
      return;
    }

    setPinningWidget(type);
    try {
      const res = await pinWidgetToHomeScreen(type);

      if (res.supported && res.success) {
        showToast(
          'Widget placement initiated! Tap "Add" in the Android prompt to place it on your home screen.',
          'success'
        );
      } else if (!res.supported) {
        // Fallback: launcher does not allow direct programmatic pinning
        setActiveManualModal(type);
      } else {
        showToast(res.message || 'Could not initiate widget placement.', 'info');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to place widget.', 'error');
    } finally {
      setPinningWidget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Platform & Status Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#174F32]/10 via-[#174F32]/5 to-transparent dark:from-[#174F32]/25 dark:via-[#174F32]/10 dark:to-transparent border border-[#174F32]/20 dark:border-[#83C95B]/20 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#174F32] dark:bg-[#83C95B] text-white dark:text-[#0D1410] flex items-center justify-center shrink-0 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-[#252923] dark:text-white text-base">
                  Android Home-Screen Widgets
                </h3>
                {isAndroid ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#16A34A]/15 text-[#16A34A] dark:bg-[#83C95B]/20 dark:text-[#83C95B] flex items-center gap-1 border border-[#16A34A]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-[#83C95B] animate-pulse" />
                    Native Android Active
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center gap-1 border border-amber-500/30">
                    <Info className="w-3 h-3" />
                    Web View · Android APK Required
                  </span>
                )}
              </div>
              <p className="text-xs text-[#777D75] dark:text-[#8FA095] mt-0.5">
                Quickly add transactions, monitor balances, and launch actions directly from your Android phone's home screen.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveManualModal('quick_actions')}
            className="px-3.5 py-2 rounded-xl border border-[#174F32]/30 dark:border-[#83C95B]/30 hover:bg-[#174F32]/10 dark:hover:bg-[#83C95B]/10 text-xs font-bold text-[#174F32] dark:text-[#83C95B] transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How to Add Manually</span>
          </button>
        </div>
      </div>

      {/* 3 Native Widget Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ======================================================== */}
        {/* WIDGET A: QUICK ACTIONS                                  */}
        {/* ======================================================== */}
        <div className="rounded-3xl p-4 sm:p-5 bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#243A2C] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#174F32]/40 dark:hover:border-[#83C95B]/40 transition-all">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#174F32]/10 dark:bg-[#1E382A] text-[#174F32] dark:text-[#83C95B] text-xs font-extrabold flex items-center justify-center">
                  A
                </span>
                <span className="text-sm font-bold text-[#252923] dark:text-white">
                  Quick Actions Widget
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F6F4EE] dark:bg-[#1E3025] text-[#777D75] dark:text-[#8FA095] border border-[#E5E1D8] dark:border-[#243A2C]">
                4 × 2 Grid
              </span>
            </div>

            {/* Visual Pixel-Perfect Widget Preview (Matching Prototype) */}
            <div className="relative rounded-2xl p-3.5 bg-gradient-to-b from-[#0F241A] via-[#0B1C14] to-[#08160F] text-white border border-[#244432] shadow-md select-none">
              {/* Widget Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#163826] border border-[#265239] flex items-center justify-center text-[#83C95B]">
                    <Leaf className="w-3.5 h-3.5" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-xs font-extrabold text-white tracking-tight">PesoTrack</div>
                    <div className="text-[9.5px] font-bold text-[#8FA095]">Quick Actions</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-white/60">
                  <div className="w-5 h-5 rounded-full bg-[#142B20] border border-[#1D3E2F] flex items-center justify-center">
                    <RefreshCw className="w-2.5 h-2.5 text-[#83C95B]" />
                  </div>
                  <div className="w-5 h-5 rounded-full bg-[#142B20] border border-[#1D3E2F] flex items-center justify-center">
                    <ChevronRight className="w-3 h-3 text-white/70" />
                  </div>
                </div>
              </div>

              {/* 6 Action Tiles (Row 1: Expense, Income, Transfer; Row 2: Loan, Card, Grocery) */}
              <div className="grid grid-cols-3 gap-1.5 pt-2.5">
                {/* 1. Expense */}
                <div className="p-2 rounded-xl bg-[#142B20] border border-[#1D3E2F] flex flex-col items-center justify-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-[#361919] flex items-center justify-center">
                    <ArrowDown className="w-3 h-3 text-[#F87171] stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-bold text-[#EFEFED]">Expense</span>
                </div>

                {/* 2. Income */}
                <div className="p-2 rounded-xl bg-[#142B20] border border-[#1D3E2F] flex flex-col items-center justify-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-[#153322] flex items-center justify-center">
                    <ArrowUp className="w-3 h-3 text-[#4ADE80] stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-bold text-[#EFEFED]">Income</span>
                </div>

                {/* 3. Transfer */}
                <div className="p-2 rounded-xl bg-[#142B20] border border-[#1D3E2F] flex flex-col items-center justify-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-[#142B3D] flex items-center justify-center">
                    <ArrowLeftRight className="w-3 h-3 text-[#60A5FA] stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-bold text-[#EFEFED]">Transfer</span>
                </div>

                {/* 4. Loan */}
                <div className="p-2 rounded-xl bg-[#142B20] border border-[#1D3E2F] flex flex-col items-center justify-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-[#362B16] flex items-center justify-center">
                    <Landmark className="w-3 h-3 text-[#FBBF24] stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-bold text-[#EFEFED]">Loan</span>
                </div>

                {/* 5. Card */}
                <div className="p-2 rounded-xl bg-[#142B20] border border-[#1D3E2F] flex flex-col items-center justify-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-[#301B3B] flex items-center justify-center">
                    <CreditCard className="w-3 h-3 text-[#C084FC] stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-bold text-[#EFEFED]">Card</span>
                </div>

                {/* 6. Grocery */}
                <div className="p-2 rounded-xl bg-[#142B20] border border-[#1D3E2F] flex flex-col items-center justify-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-[#183622] flex items-center justify-center">
                    <ShoppingCart className="w-3 h-3 text-[#4ADE80] stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-bold text-[#EFEFED]">Grocery</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#777D75] dark:text-[#8FA095] leading-relaxed">
              Quickly open common PesoTrack actions from the Android home screen: Expense form, Income form, Transfer, Loans, Credit Cards, or Grocery list with a single tap.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleAddWidget('quick_actions')}
            disabled={pinningWidget === 'quick_actions'}
            className="w-full py-2.5 px-4 rounded-xl bg-[#174F32] hover:bg-[#123E27] active:bg-[#0E2E1D] dark:bg-[#83C95B] dark:hover:bg-[#72B44C] dark:text-[#0D1410] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
          >
            {pinningWidget === 'quick_actions' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Launching Placement...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add Quick Actions to Home Screen</span>
              </>
            )}
          </button>
        </div>

        {/* ======================================================== */}
        {/* WIDGET B: QUICK EXPENSE                                  */}
        {/* ======================================================== */}
        <div className="rounded-3xl p-4 sm:p-5 bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#243A2C] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#174F32]/40 dark:hover:border-[#83C95B]/40 transition-all">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#174F32]/10 dark:bg-[#1E382A] text-[#174F32] dark:text-[#83C95B] text-xs font-extrabold flex items-center justify-center">
                  B
                </span>
                <span className="text-sm font-bold text-[#252923] dark:text-white">
                  Quick Expense Widget
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F6F4EE] dark:bg-[#1E3025] text-[#777D75] dark:text-[#8FA095] border border-[#E5E1D8] dark:border-[#243A2C]">
                3 × 2 Grid
              </span>
            </div>

            {/* Visual Pixel-Perfect Widget Preview (Matching Prototype) */}
            <div className="relative rounded-2xl p-4 bg-gradient-to-b from-[#0F241A] via-[#0B1C14] to-[#08160F] text-white border border-[#244432] shadow-md select-none space-y-3">
              {/* Widget Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#163826] border border-[#265239] flex items-center justify-center text-[#83C95B]">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-xs font-extrabold text-white tracking-tight">PesoTrack</div>
                    <div className="text-[9.5px] font-bold text-[#8FA095]">Quick Expense</div>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full bg-[#142B20] border border-[#1D3E2F] flex items-center justify-center">
                  <RefreshCw className="w-2.5 h-2.5 text-[#83C95B]" />
                </div>
              </div>

              {/* Amount Display */}
              <div className="text-center py-0.5">
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
                  ₱250.00
                </div>
              </div>

              {/* Meta Row: Category + Date */}
              <div className="flex items-center justify-center gap-4 text-[11px] text-[#A3B3A9] font-medium">
                <div className="flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-[#4ADE80]" />
                  <span>Food</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#4ADE80]" />
                  <span>Today</span>
                </div>
              </div>

              {/* CTA Button: Save Expense */}
              <div className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white text-xs font-bold text-center shadow-xs">
                Save Expense
              </div>
            </div>

            <p className="text-xs text-[#777D75] dark:text-[#8FA095] leading-relaxed">
              Start an expense entry directly from your home screen with preselected amount and category, ready for safe confirmation without duplicate submissions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleAddWidget('quick_expense')}
            disabled={pinningWidget === 'quick_expense'}
            className="w-full py-2.5 px-4 rounded-xl bg-[#174F32] hover:bg-[#123E27] active:bg-[#0E2E1D] dark:bg-[#83C95B] dark:hover:bg-[#72B44C] dark:text-[#0D1410] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
          >
            {pinningWidget === 'quick_expense' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Launching Placement...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add Quick Expense to Home Screen</span>
              </>
            )}
          </button>
        </div>

        {/* ======================================================== */}
        {/* WIDGET C: FINANCIAL OVERVIEW                             */}
        {/* ======================================================== */}
        <div className="rounded-3xl p-4 sm:p-5 bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#243A2C] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#174F32]/40 dark:hover:border-[#83C95B]/40 transition-all">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#174F32]/10 dark:bg-[#1E382A] text-[#174F32] dark:text-[#83C95B] text-xs font-extrabold flex items-center justify-center">
                  C
                </span>
                <span className="text-sm font-bold text-[#252923] dark:text-white">
                  Financial Overview Widget
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F6F4EE] dark:bg-[#1E3025] text-[#777D75] dark:text-[#8FA095] border border-[#E5E1D8] dark:border-[#243A2C]">
                4 × 2 Grid
              </span>
            </div>

            {/* Visual Pixel-Perfect Widget Preview (Matching Prototype) */}
            <div className="relative rounded-2xl p-3.5 bg-gradient-to-b from-[#0F241A] via-[#0B1C14] to-[#08160F] text-white border border-[#244432] shadow-md select-none space-y-2.5">
              {/* Widget Header */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#163826] border border-[#265239] flex items-center justify-center text-[#83C95B]">
                    <Leaf className="w-3.5 h-3.5" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-xs font-extrabold text-white tracking-tight">PesoTrack</div>
                    <div className="text-[9.5px] font-bold text-[#8FA095]">Financial Overview</div>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full bg-[#142B20] border border-[#1D3E2F] flex items-center justify-center">
                  <RefreshCw className="w-2.5 h-2.5 text-[#83C95B]" />
                </div>
              </div>

              {/* Two Stats Cards */}
              <div className="grid grid-cols-2 gap-2">
                {/* Income Card */}
                <div className="p-2.5 rounded-xl bg-[#142B20] border border-[#1D3E2F]">
                  <div className="text-[9.5px] font-bold text-[#8FA095] uppercase tracking-wider">
                    Income
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-white font-mono mt-0.5 truncate">
                    {liveMetrics.incomeAmount !== '₱0.00' ? liveMetrics.incomeAmount : '₱25,000.00'}
                  </div>
                  <div className="text-[10px] font-bold text-[#4ADE80] mt-0.5 flex items-center gap-0.5">
                    <span>↑ 12%</span>
                  </div>
                </div>

                {/* Expenses Card */}
                <div className="p-2.5 rounded-xl bg-[#142B20] border border-[#1D3E2F]">
                  <div className="text-[9.5px] font-bold text-[#8FA095] uppercase tracking-wider">
                    Expenses
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-white font-mono mt-0.5 truncate">
                    {liveMetrics.expenseAmount !== '₱0.00' ? liveMetrics.expenseAmount : '₱18,450.00'}
                  </div>
                  <div className="text-[10px] font-bold text-[#F87171] mt-0.5 flex items-center gap-0.5">
                    <span>↑ 8%</span>
                  </div>
                </div>
              </div>

              {/* Net Cash Flow with Sparkline Waveform */}
              <div className="p-2.5 rounded-xl bg-[#142B20] border border-[#1D3E2F] flex items-center justify-between gap-2 overflow-hidden">
                <div className="min-w-0">
                  <div className="text-[9.5px] font-bold text-[#8FA095] uppercase tracking-wider">
                    Net Cash Flow
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-white font-mono mt-0.5 truncate">
                    {liveMetrics.netCashFlow !== '₱0.00' ? liveMetrics.netCashFlow : '₱6,550.00'}
                  </div>
                </div>

                {/* Aesthetic Smooth Waveform SVG */}
                <div className="w-24 h-8 shrink-0">
                  <svg viewBox="0 0 100 36" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#4ADE80" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0,30 Q 20,24 35,28 T 65,16 T 90,8 L 98,6"
                      fill="none"
                      stroke="#4ADE80"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 0,30 Q 20,24 35,28 T 65,16 T 90,8 L 98,6 L 98,36 L 0,36 Z"
                      fill="url(#sparklineGrad)"
                    />
                    <circle cx="98" cy="6" r="2.5" fill="#83C95B" />
                  </svg>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#777D75] dark:text-[#8FA095] leading-relaxed">
              View a concise summary based on your actual PesoTrack financial records: monthly income, total expenses, and net cash flow with real-time updates.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleAddWidget('financial_overview')}
            disabled={pinningWidget === 'financial_overview'}
            className="w-full py-2.5 px-4 rounded-xl bg-[#174F32] hover:bg-[#123E27] active:bg-[#0E2E1D] dark:bg-[#83C95B] dark:hover:bg-[#72B44C] dark:text-[#0D1410] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
          >
            {pinningWidget === 'financial_overview' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Launching Placement...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add Overview to Home Screen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4 Feature Badges (Matching Prototype Bottom Strip) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#243A2C]">
        {/* Feature 1 */}
        <div className="flex items-start gap-3 p-2">
          <div className="w-8 h-8 rounded-xl bg-[#174F32]/10 dark:bg-[#1E382A] text-[#174F32] dark:text-[#83C95B] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#252923] dark:text-white">Quick Actions</div>
            <p className="text-[11px] text-[#777D75] dark:text-[#8FA095] mt-0.5">
              Instant access to Expense, Income, Transfer, Loan, Card, and Grocery.
            </p>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="flex items-start gap-3 p-2">
          <div className="w-8 h-8 rounded-xl bg-[#174F32]/10 dark:bg-[#1E382A] text-[#174F32] dark:text-[#83C95B] flex items-center justify-center shrink-0">
            <Wifi className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#252923] dark:text-white">Online &amp; Offline</div>
            <p className="text-[11px] text-[#777D75] dark:text-[#8FA095] mt-0.5">
              Works even without internet, syncs automatically when online.
            </p>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="flex items-start gap-3 p-2">
          <div className="w-8 h-8 rounded-xl bg-[#174F32]/10 dark:bg-[#1E382A] text-[#174F32] dark:text-[#83C95B] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#252923] dark:text-white">Secure &amp; Reliable</div>
            <p className="text-[11px] text-[#777D75] dark:text-[#8FA095] mt-0.5">
              Uses your existing PesoTrack authentication and private device data.
            </p>
          </div>
        </div>

        {/* Feature 4 */}
        <div className="flex items-start gap-3 p-2">
          <div className="w-8 h-8 rounded-xl bg-[#174F32]/10 dark:bg-[#1E382A] text-[#174F32] dark:text-[#83C95B] flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#252923] dark:text-white">Always Updated</div>
            <p className="text-[11px] text-[#777D75] dark:text-[#8FA095] mt-0.5">
              Real-time calculation and seamless widget-to-app bridge integration.
            </p>
          </div>
        </div>
      </div>

      {/* Manual Android Launcher Instructions Modal */}
      {activeManualModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#15221B] rounded-3xl max-w-md w-full p-5 sm:p-6 border border-[#E5E1D8] dark:border-[#243A2C] shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#174F32]/10 dark:bg-[#1E382A] text-[#174F32] dark:text-[#83C95B] flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-[#252923] dark:text-white">
                  Add Widget from Launcher
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveManualModal(null)}
                className="w-7 h-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
              To add the <strong>{activeManualModal === 'quick_actions' ? 'Quick Actions' : activeManualModal === 'quick_expense' ? 'Quick Expense' : 'Financial Overview'}</strong> widget to your Android home screen:
            </p>

            <ol className="space-y-2.5 text-xs text-[#252923] dark:text-[#E8EFE9] list-decimal list-inside">
              <li className="pl-1">
                Go to your Android phone's <strong>Home Screen</strong>.
              </li>
              <li className="pl-1">
                <strong>Long-press</strong> (touch and hold) on any empty space.
              </li>
              <li className="pl-1">
                Tap <strong>Widgets</strong> in the pop-up menu.
              </li>
              <li className="pl-1">
                Scroll down or search for <strong>PesoTrack</strong>.
              </li>
              <li className="pl-1">
                Touch and hold the widget and <strong>drag it onto your home screen</strong>.
              </li>
            </ol>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveManualModal(null)}
                className="w-full py-2.5 rounded-xl bg-[#174F32] dark:bg-[#83C95B] text-white dark:text-[#0D1410] font-bold text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Web Browser Notice Modal */}
      {showWebNoticeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#15221B] rounded-3xl max-w-md w-full p-5 sm:p-6 border border-[#E5E1D8] dark:border-[#243A2C] shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                  <Info className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-[#252923] dark:text-white">
                  Android App Required
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWebNoticeModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#777D75] dark:text-[#8FA095] leading-relaxed">
              You are currently viewing PesoTrack in a <strong>web browser</strong>. Android home-screen widgets are native system components built into the <strong>PesoTrack Android APK</strong>.
            </p>

            <div className="p-3.5 rounded-2xl bg-[#F6F4EE] dark:bg-[#1A2A20] border border-[#E5E1D8] dark:border-[#243A2C] text-xs space-y-1.5">
              <span className="font-bold text-[#252923] dark:text-white">How to use widgets on your phone:</span>
              <p className="text-[11px] text-[#777D75] dark:text-[#8FA095]">
                1. Build and install the PesoTrack APK on your phone (using <code>build-apk.bat</code> or Android Studio).
              </p>
              <p className="text-[11px] text-[#777D75] dark:text-[#8FA095]">
                2. Open PesoTrack on your phone and go to Settings &gt; Home-Screen Widgets.
              </p>
              <p className="text-[11px] text-[#777D75] dark:text-[#8FA095]">
                3. Tap <strong>Add to Home Screen</strong> to automatically place any widget!
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowWebNoticeModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#174F32] dark:bg-[#83C95B] text-white dark:text-[#0D1410] font-bold text-xs"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
