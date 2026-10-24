import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  PiggyBank,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { AccountCategory } from '../types/finance';
import { useFinance } from '../context/FinanceContext';
import { formatPeso } from '../utils/currency';

interface SwipeableFinancialSummaryProps {
  className?: string;
  onOpenAddAccount?: () => void;
  onSelectCategory?: (category: AccountCategory) => void;
}

export const SwipeableFinancialSummary: React.FC<SwipeableFinancialSummaryProps> = ({
  className = '',
  onOpenAddAccount,
  onSelectCategory,
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
  const wasSwipedRef = useRef<boolean>(false);
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
    wasSwipedRef.current = false;
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

    if (Math.abs(deltaX) > 8) {
      wasSwipedRef.current = true;
    }

    // If vertical scrolling is dominant, abort horizontal swipe
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
      isDragging.current = false;
      setDragOffset(0);
      return;
    }

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

    if (dragOffset < -45 && activeSlide === 0) {
      setActiveSlide(1);
    } else if (dragOffset > 45 && activeSlide === 1) {
      setActiveSlide(0);
    }
    setDragOffset(0);
    setTimeout(() => {
      wasSwipedRef.current = false;
    }, 120);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    touchStartX.current = e.clientX;
    touchStartY.current = e.clientY;
    isDragging.current = true;
    wasSwipedRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || touchStartX.current === null) return;
    const deltaX = e.clientX - touchStartX.current;
    if (Math.abs(deltaX) > 8) {
      wasSwipedRef.current = true;
    }
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
    setTimeout(() => {
      wasSwipedRef.current = false;
    }, 120);
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
      className={`relative w-full max-w-full min-w-0 select-none overflow-hidden rounded-[24px] sm:rounded-[28px] shadow-[0_4px_24px_rgba(23,79,50,0.12)] border border-[#E5E1D8] dark:border-[#223528] focus:outline-none focus:ring-2 focus:ring-[#174F32]/20 ${className}`}
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
                <button
                  type="button"
                  onClick={toggleHideBalances}
                  aria-label={hide ? 'Show balances' : 'Hide balances'}
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
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="View Total Debt"
                  className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/15 transition-colors shrink-0 flex items-center justify-center"
                  title="Next: Total Debt"
                >
                  <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Primary Big Number */}
            <div className="mt-1.5 sm:mt-2 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <div className="text-2xl sm:text-[32px] md:text-[36px] font-extrabold tracking-tight text-white tabular-nums leading-tight truncate">
                {formatPeso(netWorthSummary.netWorth, { hide })}
              </div>
              <div className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full bg-white/15 text-[#86EFAC] text-[11px] font-semibold backdrop-blur-xs">
                <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                <span>+12.5% this month</span>
              </div>
            </div>
          </div>

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
          </div>
        </div>

        {/* ========================================================= */}
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
                  Liabilities
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleHideBalances}
                  aria-label={hide ? 'Show balances' : 'Hide balances'}
                  className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                >
                  {hide ? (
                    <EyeOff className="w-4 h-4 stroke-[2]" />
                  ) : (
                    <Eye className="w-4 h-4 stroke-[2]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="View Net Worth"
                  className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/15 transition-colors shrink-0 flex items-center justify-center"
                  title="Previous: Net Worth"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Primary Big Number in Debt Red */}
            <div className="mt-1.5 sm:mt-2">
              <div className="text-2xl sm:text-[32px] md:text-[36px] font-extrabold tracking-tight tabular-nums text-[#FCA5A5] leading-tight truncate">
                {formatPeso(netWorthSummary.totalDebt, { hide })}
              </div>
            </div>
          </div>

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
          </div>
        </div>
      </div>

      {/* Subtle Carousel Pagination Dots (tap to switch) */}
      <div className="absolute top-4 sm:top-5 right-12 sm:right-14 flex items-center gap-1.5 z-20">
        <button
          type="button"
          onClick={() => setActiveSlide(0)}
          aria-label="Switch to Net Worth card"
          className={`h-1.5 rounded-full transition-all duration-300 ${
            activeSlide === 0
              ? 'w-5 bg-white'
              : 'w-1.5 bg-white/40 hover:bg-white/70'
          }`}
        />
        <button
          type="button"
          onClick={() => setActiveSlide(1)}
          aria-label="Switch to Total Debt card"
          className={`h-1.5 rounded-full transition-all duration-300 ${
            activeSlide === 1
              ? 'w-5 bg-[#FCA5A5]'
              : 'w-1.5 bg-white/40 hover:bg-white/70'
          }`}
        />
      </div>
    </div>
  );
};
