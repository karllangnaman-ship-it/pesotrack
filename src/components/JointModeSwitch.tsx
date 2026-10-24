import React from 'react';
import { User, Users } from 'lucide-react';
import { AccountMode } from '../types/finance';

interface JointModeSwitchProps {
  mode: AccountMode;
  onChangeMode: (mode: AccountMode) => void;
  pendingInvitationsCount?: number;
}

export const JointModeSwitch: React.FC<JointModeSwitchProps> = ({
  mode,
  onChangeMode,
  pendingInvitationsCount = 0,
}) => {
  return (
    <div
      role="group"
      aria-label="Application account mode"
      className="inline-flex items-center bg-[#E8E4DA] dark:bg-[#16241C] p-0.5 sm:p-1 rounded-xl sm:rounded-2xl shadow-2xs border border-[#DFDAD0]/80 dark:border-[#203426]/80 transition-colors shrink-0"
    >
      {/* 1. Personal Account Mode Button */}
      <button
        type="button"
        onClick={() => onChangeMode('personal')}
        aria-pressed={mode === 'personal'}
        title="Switch to Personal Account"
        className={`relative flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 select-none cursor-pointer min-h-[36px] sm:min-h-[40px] ${
          mode === 'personal'
            ? 'bg-[#174F32] dark:bg-[#1E382A] text-white shadow-xs border border-[#83C95B]/20'
            : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
        }`}
      >
        <User
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
            mode === 'personal' ? 'stroke-[2.6] text-[#83C95B]' : 'stroke-2'
          }`}
        />
        <span className="whitespace-nowrap">
          <span className="hidden sm:inline">Personal Account</span>
          <span className="sm:hidden">Personal</span>
        </span>
      </button>

      {/* 2. Joint Finances Mode Button */}
      <button
        type="button"
        onClick={() => onChangeMode('joint')}
        aria-pressed={mode === 'joint'}
        title="Switch to Joint Finances"
        className={`relative flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 select-none cursor-pointer min-h-[36px] sm:min-h-[40px] ${
          mode === 'joint'
            ? 'bg-[#174F32] dark:bg-[#1E382A] text-white shadow-xs border border-[#83C95B]/40 ring-1 ring-[#83C95B]/30'
            : 'text-[#61685D] dark:text-[#9EA59B] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
        }`}
      >
        <Users
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
            mode === 'joint' ? 'stroke-[2.6] text-[#83C95B]' : 'stroke-2'
          }`}
        />
        <span className="whitespace-nowrap">
          <span className="hidden xs:inline sm:inline">Joint Finances</span>
          <span className="xs:hidden sm:hidden">Joint</span>
        </span>

        {/* Pending invitations notification badge */}
        {pendingInvitationsCount > 0 && (
          <span
            title={`${pendingInvitationsCount} pending joint invitation${pendingInvitationsCount > 1 ? 's' : ''}`}
            className="flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-black rounded-full bg-emerald-500 text-white animate-pulse shrink-0 ml-0.5"
          >
            {pendingInvitationsCount}
          </span>
        )}
      </button>
    </div>
  );
};
