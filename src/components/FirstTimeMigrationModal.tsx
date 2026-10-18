import React from 'react';
import { Cloud, Database, HardDrive, ShieldCheck, Sparkles, X } from 'lucide-react';
import { FinancialAccount, TransactionRecord } from '../types/finance';

interface FirstTimeMigrationModalProps {
  isOpen: boolean;
  userEmail: string;
  localAccountsCount: number;
  localTransactionsCount: number;
  localBillsCount: number;
  onAssociateLocalData: () => void;
  onStartFreshWorkspace: () => void;
}

export const FirstTimeMigrationModal: React.FC<FirstTimeMigrationModalProps> = ({
  isOpen,
  userEmail,
  localAccountsCount,
  localTransactionsCount,
  localBillsCount,
  onAssociateLocalData,
  onStartFreshWorkspace,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-[#12131A] rounded-[24px] sm:rounded-[28px] shadow-2xl border border-black/[0.06] dark:border-white/[0.08] p-5 sm:p-6 text-neutral-900 dark:text-neutral-100 my-auto animate-in fade-in duration-200 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center font-bold shrink-0">
            <Cloud className="w-5 h-5 text-indigo-400 dark:text-indigo-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold text-black dark:text-white truncate">
              Set Up Your Cloud Workspace
            </h2>
            <p className="text-xs text-neutral-500 truncate">
              Signed in as: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{userEmail}</span>
            </p>
          </div>
        </div>

        {/* Existing local records overview */}
        <div className="p-3.5 rounded-2xl bg-[#F6F5F8] dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-white/[0.06] space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-800 dark:text-neutral-200">
            <HardDrive className="w-4 h-4 text-neutral-500" />
            <span>Existing Local Device Data Found</span>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            We noticed you have pre-existing financial records stored on this device. Would you like to associate this data with your new cloud account, or start with a fresh workspace?
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2 rounded-xl bg-white dark:bg-neutral-900">
              <div className="text-[10px] text-neutral-400 font-medium">Accounts</div>
              <div className="text-sm font-bold text-black dark:text-white">{localAccountsCount}</div>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-neutral-900">
              <div className="text-[10px] text-neutral-400 font-medium">Transactions</div>
              <div className="text-sm font-bold text-black dark:text-white">{localTransactionsCount}</div>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-neutral-900">
              <div className="text-[10px] text-neutral-400 font-medium">Bills</div>
              <div className="text-sm font-bold text-black dark:text-white">{localBillsCount}</div>
            </div>
          </div>
        </div>

        {/* Action Choices */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={onAssociateLocalData}
            className="w-full p-3.5 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-left hover:opacity-95 transition-all shadow-xs flex items-center justify-between group"
          >
            <div className="min-w-0 pr-3">
              <div className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                <span>Associate & Sync Local Data</span>
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-600 mt-0.5 leading-snug">
                Upload your current local records into this account and enable cross-device cloud sync.
              </p>
            </div>
            <span className="text-xs font-bold shrink-0 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
              Choose →
            </span>
          </button>

          <button
            type="button"
            onClick={onStartFreshWorkspace}
            className="w-full p-3.5 rounded-2xl bg-[#F6F5F8] dark:bg-neutral-800 text-left hover:bg-neutral-200/70 dark:hover:bg-neutral-700 transition-colors flex items-center justify-between group"
          >
            <div className="min-w-0 pr-3">
              <div className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Start Fresh Empty Workspace</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                Start with a clean slate for this account. Your current local data remains safe.
              </p>
            </div>
            <span className="text-xs font-semibold text-neutral-500 shrink-0 group-hover:text-black dark:group-hover:text-white transition-colors">
              Start Fresh →
            </span>
          </button>
        </div>

        <div className="text-[11px] text-neutral-400 text-center flex items-center justify-center gap-1.5 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2E9E6B]" />
          <span>Your cloud financial records are private to UID: {userEmail}</span>
        </div>
      </div>
    </div>
  );
};
