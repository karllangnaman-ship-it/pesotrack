import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  PiggyBank,
<<<<<<< HEAD
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { AccountCategory } from '../types/finance';
=======
  ShieldAlert,
  Wallet,
} from 'lucide-react';
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
import { useFinance } from '../context/FinanceContext';
import { formatPeso } from '../utils/currency';

interface SwipeableFinancialSummaryProps {
  className?: string;
  onOpenAddAccount?: () => void;
<<<<<<< HEAD
  onSelectCategory?: (category: AccountCategory) => void;
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
}

export const SwipeableFinancialSummary: React.FC<SwipeableFinancialSummaryProps> = ({
  className = '',
  onOpenAddAccount,
<<<<<<< HEAD
  onSelectCategory,
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
}) => {
  const {
    netWorthSummary,
    reconciledAccounts,
    state,
    toggleHideBalances,
  } = useFinance();

  const hide = state.settings.hideBalances;
  const [activeSlide, setActiveSlide] = useState<0 | 1>(0);

  // Swipe & drag state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);
<<<<<<< HEAD
  const wasSwipedRef = useRef<boolean>(false);
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  const [dragOffset, setDragOffset] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeAccounts = reconciledAccounts.filter((a) => !a.archived);
  const assetAccountsCount = activeAccounts.filter(
    (a) => a.category === 'Wallet' || a.category === 'Savings'
  ).length;
  const debtAccountsCount = activeAccounts.filter(
    (a) => (a.category === 'Credit' || a.category === 'Loans') && a.currentBalance > 0
  ).length;

  const handleNext = useCallback(() => {
    setActiveSlide((prev) => (prev === 0 ? 1 : 0));
  }, []);

  const handlePrev = useCallback(() => {
    setActiveSlide((prev) => (prev === 1 ? 0 : 1));
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      setActiveSlide(1);
    } else if (e.key === 'ArrowLeft') {
      setActiveSlide(0);
    }
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
<<<<<<< HEAD
    wasSwipedRef.current = false;
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || touchStartX.current === null || touchStartY.current === null) {
      return;
    }
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;

<<<<<<< HEAD
    if (Math.abs(deltaX) > 8) {
      wasSwipedRef.current = true;
    }

    // If vertical scrolling is dominant, abort horizontal swipe
=======
    // If vertical scrolling is dominant, abort horizontal swipe so page scroll is buttery smooth
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
      isDragging.current = false;
      setDragOffset(0);
      return;
    }

<<<<<<< HEAD
=======
    // Dampen resistance when dragging past boundaries
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
    if ((activeSlide === 0 && deltaX > 0) || (activeSlide === 1 && deltaX < 0)) {
      setDragOffset(deltaX * 0.28);
    } else {
      setDragOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) {
      setDragOffset(0);
      return;
    }
    isDragging.current = false;

<<<<<<< HEAD
=======
    // Threshold of 45px to trigger slide transition
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
    if (dragOffset < -45 && activeSlide === 0) {
      setActiveSlide(1);
    } else if (dragOffset > 45 && activeSlide === 1) {
      setActiveSlide(0);
    }
    setDragOffset(0);
<<<<<<< HEAD
    setTimeout(() => {
      wasSwipedRef.current = false;
    }, 120);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
=======
  };

  // Pointer / Mouse drag handlers for desktop / mouse interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag with primary mouse click
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    touchStartX.current = e.clientX;
    touchStartY.current = e.clientY;
    isDragging.current = true;
<<<<<<< HEAD
    wasSwipedRef.current = false;
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || touchStartX.current === null) return;
    const deltaX = e.clientX - touchStartX.current;
<<<<<<< HEAD
    if (Math.abs(deltaX) > 8) {
      wasSwipedRef.current = true;
    }
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
    if ((activeSlide === 0 && deltaX > 0) || (activeSlide === 1 && deltaX < 0)) {
      setDragOffset(deltaX * 0.25);
    } else {
      setDragOffset(deltaX);
    }
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (dragOffset < -50 && activeSlide === 0) {
      setActiveSlide(1);
    } else if (dragOffset > 50 && activeSlide === 1) {
      setActiveSlide(0);
    }
    setDragOffset(0);
<<<<<<< HEAD
    setTimeout(() => {
      wasSwipedRef.current = false;
    }, 120);
=======
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
  };

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Financial Summary Carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
<<<<<<< HEAD
      className={`relative w-full max-w-full min-w-0 select-none overflow-hidden rounded-[24px] sm:rounded-[28px] shadow-[0_4px_24px_rgba(23,79,50,0.12)] border border-[#E5E1D8] dark:border-[#223528] focus:outline-none focus:ring-2 focus:ring-[#174F32]/20 ${className}`}
=======
      className={`relative w-full max-w-full min-w-0 select-none overflow-hidden rounded-[22px] sm:rounded-[24px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.025)] focus:outline-none focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10 ${className}`}
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
    >
      {/* Horizontally sliding container */}
      <div
        className="flex w-[200%] transition-transform duration-300 ease-out touch-pan-y"
        style={{
          transform: `translateX(calc(-${activeSlide * 50}% + ${dragOffset}px))`,
          transition: isDragging.current ? 'none' : 'transform 280ms cubic-bezier(0.2, 0.9, 0.3, 1)',
        }}
      >
        {/* ========================================================= */}
<<<<<<< HEAD
        {/* SLIDE 1: NET WORTH (Wallet + Savings)                     */}
        {/* ========================================================= */}
        <div className="relative w-1/2 flex-shrink-0 px-4 sm:px-6 py-5 sm:py-6 flex flex-col justify-between min-h-[200px] sm:min-h-[215px] theme-card-gradient bg-gradient-to-br from-[#174F32] via-[#14472D] to-[#0E3420] text-white overflow-hidden">
          {/* Subtle botanical leaf watermark in top right corner */}
          <div className="absolute -top-3 -right-3 text-white/[0.08] pointer-events-none transform rotate-12">
            <svg width="180" height="180" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
            </svg>
          </div>

          <div className="relative z-10">
            {/* Header: Title, Net Worth label, Eye & Nav Arrow */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[13px] sm:text-[15px] font-medium text-white/80 tracking-wide">
                  Net Worth
                </span>
=======
        {/* SLIDE 1: TOTAL ASSETS (Wallets + Savings ONLY)            */}
        {/* ========================================================= */}
        <div className="w-1/2 flex-shrink-0 px-4 sm:px-6 py-5 sm:py-6 flex flex-col justify-between min-h-[178px] sm:min-h-[190px]">
          <div>
            {/* Header: Title, Category Badge, Eye & Nav Arrow */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[14px] sm:text-[16px] font-semibold text-neutral-800 dark:text-neutral-200">
                  Total Assets
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#2E9E6B]/10 text-[#2E9E6B] dark:bg-[#2E9E6B]/20">
                  Assets
                </span>
              </div>

              <div className="flex items-center gap-1">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                <button
                  type="button"
                  onClick={toggleHideBalances}
                  aria-label={hide ? 'Show balances' : 'Hide balances'}
<<<<<<< HEAD
                  className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                >
                  {hide ? (
                    <EyeOff className="w-4 h-4 stroke-[2]" />
                  ) : (
                    <Eye className="w-4 h-4 stroke-[2]" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
=======
                  className="p-1 sm:p-1.5 rounded-full text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
                >
                  {hide ? (
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
                  )}
                </button>

>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="View Total Debt"
<<<<<<< HEAD
                  className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/15 transition-colors shrink-0 flex items-center justify-center"
                  title="Next: Total Debt"
                >
                  <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
=======
                  className="p-1 sm:p-1.5 rounded-full text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0 flex items-center justify-center"
                  title="Next: Total Debt"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                </button>
              </div>
            </div>

            {/* Primary Big Number */}
<<<<<<< HEAD
            <div className="mt-1.5 sm:mt-2 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <div className="text-2xl sm:text-[32px] md:text-[36px] font-extrabold tracking-tight text-white tabular-nums leading-tight truncate">
                {formatPeso(netWorthSummary.netWorth, { hide })}
              </div>
              <div className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full bg-white/15 text-[#86EFAC] text-[11px] font-semibold backdrop-blur-xs">
                <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                <span>+12.5% this month</span>
=======
            <div className="mt-1.5 sm:mt-2">
              <div className="text-2xl sm:text-[30px] md:text-[34px] font-extrabold tracking-tight text-black dark:text-white tabular-nums leading-tight truncate">
                {formatPeso(netWorthSummary.totalAssets, { hide })}
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
              </div>
            </div>
          </div>

<<<<<<< HEAD
          {/* Sub-cards: Wallet vs Savings */}
          <div className="relative z-10 mt-4 grid grid-cols-2 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                if (wasSwipedRef.current) return;
                onSelectCategory?.('Wallet');
              }}
              aria-label="View Wallet accounts"
              className="p-2.5 sm:p-3 rounded-2xl bg-black/20 hover:bg-black/35 active:scale-[0.98] backdrop-blur-xs border border-white/10 hover:border-white/25 flex items-center justify-between gap-2 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#83C95B]/20 text-[#86EFAC] group-hover:bg-[#83C95B]/30 flex items-center justify-center shrink-0 transition-colors">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] sm:text-[11px] text-white/70 group-hover:text-white uppercase tracking-wider font-semibold truncate transition-colors">
                    Wallet
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white tabular-nums truncate">
                    {formatPeso(netWorthSummary.walletTotal, { hide })}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (wasSwipedRef.current) return;
                onSelectCategory?.('Savings');
              }}
              aria-label="View Savings accounts"
              className="p-2.5 sm:p-3 rounded-2xl bg-black/20 hover:bg-black/35 active:scale-[0.98] backdrop-blur-xs border border-white/10 hover:border-white/25 flex items-center justify-between gap-2 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-400/20 text-emerald-300 group-hover:bg-emerald-400/30 flex items-center justify-center shrink-0 transition-colors">
                  <PiggyBank className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] sm:text-[11px] text-white/70 group-hover:text-white uppercase tracking-wider font-semibold truncate transition-colors">
                    Savings
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white tabular-nums truncate">
                    {formatPeso(netWorthSummary.savingsTotal, { hide })}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
=======
          {/* Breakdown Row: Wallets + Savings ONLY */}
          <div className="mt-3.5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-[13px]">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap tabular-nums">
              <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                <Wallet className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                <span>Wallets:</span>
                <strong className="text-black dark:text-white font-semibold">
                  {formatPeso(netWorthSummary.walletTotal, { hide })}
                </strong>
              </div>

              <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                <PiggyBank className="w-3.5 h-3.5 text-[#2E9E6B] shrink-0" />
                <span>Savings:</span>
                <strong className="text-[#2E9E6B] font-semibold">
                  {formatPeso(netWorthSummary.savingsTotal, { hide })}
                </strong>
              </div>
            </div>

            <div className="text-[11px] sm:text-xs text-neutral-400 dark:text-neutral-400 tabular-nums">
              {assetAccountsCount} account{assetAccountsCount === 1 ? '' : 's'}
            </div>
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          </div>
        </div>

        {/* ========================================================= */}
<<<<<<< HEAD
        {/* SLIDE 2: TOTAL DEBT (Credit + Loans Actual Debt)          */}
        {/* ========================================================= */}
        <div className="relative w-1/2 flex-shrink-0 px-4 sm:px-6 py-5 sm:py-6 flex flex-col justify-between min-h-[200px] sm:min-h-[215px] bg-gradient-to-br from-[#241715] via-[#2D1B18] to-[#1C1210] text-white overflow-hidden">
          {/* Subtle watermark */}
          <div className="absolute -top-3 -right-3 text-white/[0.06] pointer-events-none transform rotate-12">
            <svg width="180" height="180" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </div>

          <div className="relative z-10">
            {/* Header: Title, Category Badge, Eye & Nav Arrow */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[13px] sm:text-[15px] font-medium text-white/80 tracking-wide">
                  Total Debt
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DC2626]/20 text-[#FCA5A5] border border-red-500/20">
=======
        {/* SLIDE 2: TOTAL DEBT (Credit + Loans actual debt ONLY)     */}
        {/* ========================================================= */}
        <div className="w-1/2 flex-shrink-0 px-4 sm:px-6 py-5 sm:py-6 flex flex-col justify-between min-h-[178px] sm:min-h-[190px]">
          <div>
            {/* Header: Title, Category Badge, Eye & Nav Arrow */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[14px] sm:text-[16px] font-semibold text-neutral-800 dark:text-neutral-200">
                  Total Debt
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#DC2626]/10 text-[#DC2626] dark:bg-[#DC2626]/20">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                  Liabilities
                </span>
              </div>

<<<<<<< HEAD
              <div className="flex items-center gap-1.5">
=======
              <div className="flex items-center gap-1">
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                <button
                  type="button"
                  onClick={toggleHideBalances}
                  aria-label={hide ? 'Show balances' : 'Hide balances'}
<<<<<<< HEAD
                  className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                >
                  {hide ? (
                    <EyeOff className="w-4 h-4 stroke-[2]" />
                  ) : (
                    <Eye className="w-4 h-4 stroke-[2]" />
=======
                  className="p-1 sm:p-1.5 rounded-full text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
                >
                  {hide ? (
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrev}
<<<<<<< HEAD
                  aria-label="View Net Worth"
                  className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/15 transition-colors shrink-0 flex items-center justify-center"
                  title="Previous: Net Worth"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
=======
                  aria-label="View Total Assets"
                  className="p-1 sm:p-1.5 rounded-full text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0 flex items-center justify-center"
                  title="Previous: Total Assets"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                </button>
              </div>
            </div>

            {/* Primary Big Number in Debt Red */}
            <div className="mt-1.5 sm:mt-2">
<<<<<<< HEAD
              <div className="text-2xl sm:text-[32px] md:text-[36px] font-extrabold tracking-tight tabular-nums text-[#FCA5A5] leading-tight truncate">
=======
              <div
                className={`text-2xl sm:text-[30px] md:text-[34px] font-extrabold tracking-tight tabular-nums leading-tight truncate ${
                  netWorthSummary.totalDebt > 0 ? 'text-[#DC2626]' : 'text-black dark:text-white'
                }`}
              >
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
                {formatPeso(netWorthSummary.totalDebt, { hide })}
              </div>
            </div>
          </div>

<<<<<<< HEAD
          {/* Breakdown Sub-cards: Outstanding Credit + Outstanding Loans */}
          <div className="relative z-10 mt-4 grid grid-cols-2 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                if (wasSwipedRef.current) return;
                onSelectCategory?.('Credit');
              }}
              aria-label="View Credit accounts"
              className="p-2.5 sm:p-3 rounded-2xl bg-black/25 hover:bg-black/40 active:scale-[0.98] backdrop-blur-xs border border-white/10 hover:border-white/25 flex items-center justify-between gap-2 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-red-400/20 text-[#FCA5A5] group-hover:bg-red-400/30 flex items-center justify-center shrink-0 transition-colors">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] sm:text-[11px] text-white/70 group-hover:text-white uppercase tracking-wider font-semibold truncate transition-colors">
                    Credit Cards
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white tabular-nums truncate">
                    {formatPeso(netWorthSummary.creditTotal, { hide })}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (wasSwipedRef.current) return;
                onSelectCategory?.('Loans');
              }}
              aria-label="View Loan accounts"
              className="p-2.5 sm:p-3 rounded-2xl bg-black/25 hover:bg-black/40 active:scale-[0.98] backdrop-blur-xs border border-white/10 hover:border-white/25 flex items-center justify-between gap-2 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-400/20 text-amber-300 group-hover:bg-amber-400/30 flex items-center justify-center shrink-0 transition-colors">
                  <Landmark className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] sm:text-[11px] text-white/70 group-hover:text-white uppercase tracking-wider font-semibold truncate transition-colors">
                    Active Loans
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white tabular-nums truncate">
                    {formatPeso(netWorthSummary.loansTotal, { hide })}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
=======
          {/* Breakdown Row: Outstanding Credit + Outstanding Loans */}
          <div className="mt-3.5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-[13px]">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap tabular-nums">
              <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                <CreditCard className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                <span>Outstanding Credit:</span>
                <strong className="text-[#DC2626] font-semibold">
                  {formatPeso(netWorthSummary.creditTotal, { hide })}
                </strong>
              </div>

              <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                <Landmark className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                <span>Outstanding Loans:</span>
                <strong className="text-[#DC2626] font-semibold">
                  {formatPeso(netWorthSummary.loansTotal, { hide })}
                </strong>
              </div>
            </div>

            <div className="text-[11px] sm:text-xs text-neutral-400 dark:text-neutral-400 tabular-nums">
              {debtAccountsCount} obligation{debtAccountsCount === 1 ? '' : 's'}
            </div>
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          </div>
        </div>
      </div>

      {/* Subtle Carousel Pagination Dots (tap to switch) */}
<<<<<<< HEAD
      <div className="absolute top-4 sm:top-5 right-12 sm:right-14 flex items-center gap-1.5 z-20">
        <button
          type="button"
          onClick={() => setActiveSlide(0)}
          aria-label="Switch to Net Worth card"
          className={`h-1.5 rounded-full transition-all duration-300 ${
            activeSlide === 0
              ? 'w-5 bg-white'
              : 'w-1.5 bg-white/40 hover:bg-white/70'
=======
      <div className="absolute top-4 sm:top-5 right-14 sm:right-16 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveSlide(0)}
          aria-label="Switch to Total Assets card"
          className={`h-1.5 rounded-full transition-all duration-300 ${
            activeSlide === 0
              ? 'w-5 bg-neutral-900 dark:bg-white'
              : 'w-1.5 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          }`}
        />
        <button
          type="button"
          onClick={() => setActiveSlide(1)}
          aria-label="Switch to Total Debt card"
          className={`h-1.5 rounded-full transition-all duration-300 ${
            activeSlide === 1
<<<<<<< HEAD
              ? 'w-5 bg-[#FCA5A5]'
              : 'w-1.5 bg-white/40 hover:bg-white/70'
=======
              ? 'w-5 bg-[#DC2626]'
              : 'w-1.5 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400'
>>>>>>> 90065d3217f1c06a23bd91165016176faa350fce
          }`}
        />
      </div>
    </div>
  );
};
