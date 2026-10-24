import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import { SyncStatus } from '../services/syncService';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  isOnline: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  isRulesNeeded?: boolean;
  onSyncClick?: () => void;
  className?: string;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  status,
  isOnline,
  pendingCount,
  lastSyncTime,
  isRulesNeeded,
  onSyncClick,
  className = '',
}) => {
  const isEffectiveOffline = !isOnline || status === 'offline';

  const tooltipText = isRulesNeeded
    ? 'Firestore security rules need to be published in your Firebase project. Click for 1-click guide.'
    : isEffectiveOffline
    ? `Offline mode active — All records saved locally.${
        pendingCount > 0 ? ` (${pendingCount} pending cloud sync)` : ''
      }`
    : status === 'syncing'
    ? 'Synchronizing with cloud...'
    : status === 'error'
    ? 'Cloud sync issue encountered. Click to review.'
    : pendingCount > 0
    ? `${pendingCount} changes waiting to sync to cloud.`
    : `Cloud synced (${
        lastSyncTime
          ? new Date(lastSyncTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Up to date'
      })`;

  return (
    <button
      type="button"
      onClick={onSyncClick}
      title={tooltipText}
      aria-label={tooltipText}
      className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all min-h-[28px] sm:min-h-[32px] cursor-pointer active:scale-95 shrink-0 ${
        isEffectiveOffline
          ? 'bg-neutral-200/90 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300/60 dark:border-neutral-700/60'
          : status === 'syncing'
          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40'
          : status === 'error'
          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40'
          : pendingCount > 0
          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/50'
          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'
      } ${className}`}
    >
      {isEffectiveOffline ? (
        <>
          <CloudOff className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <span className="hidden sm:inline truncate">Offline</span>
          {pendingCount > 0 && (
            <span
              className="px-1.5 py-0.2 rounded-full bg-neutral-300 dark:bg-neutral-700 text-[10px] font-extrabold text-neutral-800 dark:text-neutral-200"
              title={`${pendingCount} pending local changes`}
            >
              {pendingCount}
            </span>
          )}
        </>
      ) : status === 'syncing' ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />
          <span className="hidden sm:inline truncate">Syncing...</span>
        </>
      ) : status === 'error' ? (
        <>
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="hidden sm:inline truncate">{isRulesNeeded ? 'Rules' : 'Notice'}</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-800 text-[10px] font-extrabold">
              {pendingCount}
            </span>
          )}
        </>
      ) : pendingCount > 0 ? (
        <>
          <Cloud className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="hidden sm:inline truncate">Pending</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-800/80 text-amber-900 dark:text-amber-100 text-[10px] font-extrabold">
            {pendingCount}
          </span>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="hidden sm:inline truncate">Synced</span>
        </>
      )}
    </button>
  );
};
