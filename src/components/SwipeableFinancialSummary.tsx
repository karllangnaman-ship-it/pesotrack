import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  PiggyBank,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatPeso } from '../utils/currency';

interface SwipeableFinancialSummaryProps {
  className?: string;
  onOpenAddAccount?: () => void;
}

export const SwipeableFinancialSummary: React.FC<SwipeableFinancialSummaryProps> = ({
  className = '',
  onOpenAddAccount,
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

    // If vertical scrolling is dominant, abort horizontal swipe so page scroll is buttery smooth
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
      isDragging.current = false;
      setDragOffset(0);
      return;
    }

    // Dampen resistance when dragging past boundaries
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

    // Threshold of 45px to trigger slide transition
    if (dragOffset < -45 && activeSlide === 0) {
      setActiveSlide(1);
    } else if (dragOffset > 45 && activeSlide === 1) {
      setActiveSlide(0);
    }
    setDragOffset(0);
  };

  // Pointer / Mouse drag handlers for desktop / mouse interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag with primary mouse click
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    touchStartX.current = e.clientX;
    touchStartY.current = e.clientY;
    isDragging.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || touchStartX.current === null) return;
    const deltaX = e.clientX - touchStartX.current;
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
      className={`relative w-full max-w-full min-w-0 select-none overflow-hidden rounded-[22px] sm:rounded-[24px] bg-white dark:bg-neutral-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.025)] focus:outline-none focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10 ${className}`}
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
                <button
                  type="button"
                  onClick={toggleHideBalances}
                  aria-label={hide ? 'Show balances' : 'Hide balances'}
                  className="p-1 sm:p-1.5 rounded-full text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
                >
                  {hide ? (
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="View Total Debt"
                  className="p-1 sm:p-1.5 rounded-full text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0 flex items-center justify-center"
                  title="Next: Total Debt"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Primary Big Number */}
            <div className="mt-1.5 sm:mt-2">
              <div className="text-2xl sm:text-[30px] md:text-[34px] font-extrabold tracking-tight text-black dark:text-white tabular-nums leading-tight truncate">
                {formatPeso(netWorthSummary.totalAssets, { hide })}
              </div>
            </div>
          </div>

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
          </div>
        </div>

        {/* ========================================================= */}
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
                  Liabilities
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleHideBalances}
                  aria-label={hide ? 'Show balances' : 'Hide balances'}
                  className="p-1 sm:p-1.5 rounded-full text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
                >
                  {hide ? (
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="View Total Assets"
                  className="p-1 sm:p-1.5 rounded-full text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0 flex items-center justify-center"
                  title="Previous: Total Assets"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Primary Big Number in Debt Red */}
            <div className="mt-1.5 sm:mt-2">
              <div
                className={`text-2xl sm:text-[30px] md:text-[34px] font-extrabold tracking-tight tabular-nums leading-tight truncate ${
                  netWorthSummary.totalDebt > 0 ? 'text-[#DC2626]' : 'text-black dark:text-white'
                }`}
              >
                {formatPeso(netWorthSummary.totalDebt, { hide })}
              </div>
            </div>
          </div>

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
          </div>
        </div>
      </div>

      {/* Subtle Carousel Pagination Dots (tap to switch) */}
      <div className="absolute top-4 sm:top-5 right-14 sm:right-16 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveSlide(0)}
          aria-label="Switch to Total Assets card"
          className={`h-1.5 rounded-full transition-all duration-300 ${
            activeSlide === 0
              ? 'w-5 bg-neutral-900 dark:bg-white'
              : 'w-1.5 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400'
          }`}
        />
        <button
          type="button"
          onClick={() => setActiveSlide(1)}
          aria-label="Switch to Total Debt card"
          className={`h-1.5 rounded-full transition-all duration-300 ${
            activeSlide === 1
              ? 'w-5 bg-[#DC2626]'
              : 'w-1.5 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400'
          }`}
        />
      </div>
    </div>
  );
};
