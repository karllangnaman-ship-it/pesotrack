import React, { useRef, useState, useEffect } from 'react';
import {
  AlertTriangle,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  Clipboard,
  Clock,
  Cloud,
  CloudOff,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Laptop,
  LogIn,
  LogOut,
  Mail,
  Moon,
  RefreshCw,
  RotateCcw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  BackupSummary,
  exportBackupJSON,
  exportLedgerCSV,
  validateBackupJSON,
} from '../utils/backupService';
import {
  checkNotificationPermission,
  requestNotificationPermission,
} from '../utils/notificationService';
import {
  FIRESTORE_RULES_SOURCE,
  getFirebaseConsoleRulesUrl,
} from '../utils/firestoreRulesHelper';

interface SettingsPageProps {
  initialSection?: 'profile' | 'notifications' | 'backup' | 'appearance' | 'sync';
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ initialSection }) => {
  const {
    state,
    reconciledAccounts,
    updateSettings,
    importBackupJSON,
    resetToDefaultDemo,
    clearAllData,
    showToast,
    notificationSettings,
    updateNotificationSettings,
    testLocalNotification,
    currentUser,
    isOnline,
    syncStatus,
    lastSyncTime,
    pendingSyncCount,
    syncNow,
    openAuthModal,
    logout,
    syncError,
    isRulesPermissionError,
    firebaseProjectId,
    backendStatus,
    checkBackendHealth,
    restoreFromCloudVault,
    getCloudBackupOverview,
    getLocalSafetyBackupInfo,
  } = useFinance();

  const { settings } = state;

  const [profileName, setProfileName] = useState(settings.profileName);
  const [profileEmail, setProfileEmail] = useState(settings.profileEmail);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importFeedback, setImportFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [permGranted, setPermGranted] = useState<boolean>(true);
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [hasCopiedRules, setHasCopiedRules] = useState(false);

  const handleCopyRules = () => {
    try {
      navigator.clipboard.writeText(FIRESTORE_RULES_SOURCE);
      setHasCopiedRules(true);
      showToast('Firestore security rules copied to clipboard!', 'success');
      setTimeout(() => setHasCopiedRules(false), 3000);
    } catch {
      showToast('Could not auto-copy. Please copy from the preview below.', 'info');
    }
  };

  useEffect(() => {
    checkNotificationPermission().then((res) => {
      setPermGranted(res.granted);
    });
  }, []);

  useEffect(() => {
    if (initialSection) {
      const el = document.getElementById(`section-${initialSection}`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
    }
  }, [initialSection]);

  const handleRequestPerm = async () => {
    const res = await requestNotificationPermission();
    setPermGranted(res.granted);
    if (res.granted) {
      showToast('Notification permission granted!', 'success');
    } else {
      showToast('Notification permission was not granted. Please check phone Settings.', 'error');
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    try {
      await testLocalNotification();
    } finally {
      setIsTestingNotification(false);
    }
  };

  // Restore Confirmation Modal state (validates first, preserves existing data until confirmed)
  const [pendingRestore, setPendingRestore] = useState<{
    rawJson: string;
    summary: BackupSummary;
    mode: 'merge' | 'replace';
  } | null>(null);

  // Cloud Restore Modal state (separates Cloud Sync from Cloud Restore)
  const [isCloudRestoreModalOpen, setIsCloudRestoreModalOpen] = useState(false);
  const [cloudRestoreLoading, setCloudRestoreLoading] = useState(false);
  const [cloudRestoreOverview, setCloudRestoreOverview] = useState<{
    hasCloudData: boolean;
    summary?: BackupSummary;
    message?: string;
  } | null>(null);
  const [cloudRestoreMode, setCloudRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [isPingingBackend, setIsPingingBackend] = useState(false);

  const handleOpenCloudRestore = async () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (!isOnline) {
      showToast('Internet unavailable. Your local records remain safe.', 'info');
      return;
    }
    setCloudRestoreLoading(true);
    setIsCloudRestoreModalOpen(true);
    try {
      const res = await getCloudBackupOverview();
      setCloudRestoreOverview(res);
    } catch {
      showToast('Could not load cloud overview.', 'error');
    } finally {
      setCloudRestoreLoading(false);
    }
  };

  const handleConfirmCloudRestore = async () => {
    setCloudRestoreLoading(true);
    try {
      const res = await restoreFromCloudVault(cloudRestoreMode);
      if (res.ok) {
        setIsCloudRestoreModalOpen(false);
      }
    } finally {
      setCloudRestoreLoading(false);
    }
  };

  const handlePingBackend = async () => {
    setIsPingingBackend(true);
    try {
      await checkBackendHealth();
      showToast('Backend health check completed.', 'info');
    } finally {
      setIsPingingBackend(false);
    }
  };

  // Manual Paste Modal state
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedJsonText, setPastedJsonText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      profileName: profileName.trim() || 'PesoTrack User',
      profileEmail: profileEmail.trim(),
    });
  };

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const res = await exportBackupJSON(state);
      showToast(res.message, 'success');
    } catch (err: unknown) {
      console.error('[SettingsPage] Backup export error:', err);
      showToast('Could not export backup file.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const res = await exportLedgerCSV(reconciledAccounts, state.transactions);
      showToast(res.message, 'success');
    } catch (err: unknown) {
      console.error('[SettingsPage] CSV export error:', err);
      showToast('Could not export transactions CSV.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const processBackupFileContent = (rawText: string) => {
    setImportFeedback(null);
    const validation = validateBackupJSON(rawText);

    if (!validation.valid || !validation.summary) {
      setImportFeedback({
        ok: false,
        message: validation.error || 'Invalid backup structure. Existing data was not modified.',
      });
      return;
    }

    // Backup is valid! Show confirmation modal to review before applying
    setPendingRestore({
      rawJson: rawText,
      summary: validation.summary,
      mode: importMode,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      processBackupFileContent(raw);
    };
    reader.onerror = () => {
      setImportFeedback({
        ok: false,
        message: 'Could not read the selected file from device storage.',
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = () => {
    if (!pendingRestore) return;
    const result = importBackupJSON(pendingRestore.rawJson, pendingRestore.mode);
    setImportFeedback(result);
    setPendingRestore(null);
  };

  const handleCancelRestore = () => {
    setPendingRestore(null);
    showToast('Restore cancelled. Existing data unchanged.', 'info');
  };

  const handleProcessPastedText = () => {
    setPasteError(null);
    if (!pastedJsonText.trim()) {
      setPasteError('Please paste your backup JSON text.');
      return;
    }

    const validation = validateBackupJSON(pastedJsonText);
    if (!validation.valid || !validation.summary) {
      setPasteError(validation.error || 'Invalid JSON content.');
      return;
    }

    setIsPasteModalOpen(false);
    setPastedJsonText('');
    setPendingRestore({
      rawJson: pastedJsonText,
      summary: validation.summary,
      mode: importMode,
    });
  };

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-8 w-full max-w-full min-w-0 overflow-hidden">
      {/* Firebase Account & Per-User Cloud Sync */}
      <div
        id="section-sync"
        className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] space-y-3.5 border border-black/[0.04] dark:border-white/[0.06] scroll-mt-20"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-black dark:text-white truncate">
                  Cloud Synchronization & Vault
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isOnline
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-500 truncate">
                {currentUser
                  ? `Signed in as ${currentUser.email}`
                  : 'Operating locally on device (Guest mode)'}
              </p>
            </div>
          </div>

          {currentUser ? (
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => syncNow()}
                disabled={syncStatus === 'syncing'}
                className="px-3.5 py-2 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                title="Synchronize local changes with cloud vault"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    syncStatus === 'syncing' ? 'animate-spin' : ''
                  }`}
                />
                <span>{syncStatus === 'syncing' ? 'Syncing...' : 'Sync to Cloud'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCloudRestore}
                disabled={cloudRestoreLoading || syncStatus === 'syncing'}
                className="px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-[#F6F5F8] dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold hover:bg-neutral-200/70 dark:hover:bg-neutral-700 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                title="Download and restore your cloud vault backup"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Restore from Cloud</span>
              </button>

              <button
                type="button"
                onClick={() => logout()}
                className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Sign out of account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="px-4 py-2 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>

        {/* Unverified Email Warning Banner */}
        {currentUser && !currentUser.emailVerified && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 dark:text-amber-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-bold">Email verification link required for cloud sync</span>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Please click the verification link sent to your email to enable Cloud Firestore sync.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => syncNow()}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 self-start sm:self-auto cursor-pointer shadow-xs transition-colors"
            >
              Check Verification Link
            </button>
          </div>
        )}

        {/* Sync Status Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="p-3 rounded-2xl bg-[#F6F5F8] dark:bg-neutral-800/70 border border-neutral-200/60 dark:border-white/[0.06]">
            <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
              Sync State
            </div>
            <div className="text-xs sm:text-sm font-bold text-black dark:text-white mt-0.5 flex items-center gap-1.5 capitalize">
              {syncStatus === 'synced' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Synced</span>
                </>
              ) : syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                  <span>Syncing...</span>
                </>
              ) : syncStatus === 'offline' ? (
                <>
                  <CloudOff className="w-4 h-4 text-neutral-500 shrink-0" />
                  <span>Offline</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Sync Error</span>
                </>
              )}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F6F5F8] dark:bg-neutral-800/70 border border-neutral-200/60 dark:border-white/[0.06]">
            <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
              Pending Queue
            </div>
            <div className="text-xs sm:text-sm font-bold text-black dark:text-white mt-0.5">
              {pendingSyncCount > 0 ? (
                <span className="text-amber-600 dark:text-amber-400">
                  {pendingSyncCount} changes queued
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">
                  0 pending
                </span>
              )}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F6F5F8] dark:bg-neutral-800/70 border border-neutral-200/60 dark:border-white/[0.06] col-span-2 sm:col-span-1">
            <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
              Last Cloud Sync
            </div>
            <div className="text-xs sm:text-sm font-bold text-black dark:text-white mt-0.5 truncate">
              {lastSyncTime
                ? new Date(lastSyncTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Not yet synced'}
            </div>
          </div>
        </div>

        {/* Vercel Online-Only Backend Status & Diagnostics Card */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F6F5F8] dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 shadow-xs shrink-0 text-neutral-800 dark:text-neutral-200 mt-0.5 sm:mt-0">
              <Server className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-black dark:text-white">
                  Vercel Online Backend
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    backendStatus.isBackendReachable
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : !isOnline
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {backendStatus.isBackendReachable
                    ? 'Connected (Serverless)'
                    : !isOnline
                    ? 'Device Offline'
                    : 'Backend Standby'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Serverless endpoints: <code className="font-mono text-[10px] px-1 py-0.5 rounded bg-black/5 dark:bg-white/10">/api/health</code>, <code className="font-mono text-[10px] px-1 py-0.5 rounded bg-black/5 dark:bg-white/10">/api/sync</code>, <code className="font-mono text-[10px] px-1 py-0.5 rounded bg-black/5 dark:bg-white/10">/api/restore</code>. Works 100% offline from local vault when disconnected.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handlePingBackend}
              disabled={isPingingBackend || !isOnline}
              className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPingingBackend ? 'animate-spin' : ''}`} />
              <span>Ping Backend</span>
            </button>
          </div>
        </div>

        {/* Sync Error / Firestore Rules Setup Card */}
        {isRulesPermissionError ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border-2 border-amber-500/30 text-amber-950 dark:text-amber-100 space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Firestore Security Rules Not Published
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Your Firebase project <span className="font-mono font-bold bg-amber-500/20 px-1 py-0.5 rounded">{firebaseProjectId}</span> is currently rejecting database operations because its Firestore security rules are locked. Your local vault remains 100% intact and safe.
                </p>
              </div>
            </div>

            {/* Quick 3-Step Guide */}
            <div className="bg-white/90 dark:bg-neutral-900/90 rounded-xl p-3 sm:p-3.5 border border-amber-500/20 space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    Copy Security Rules
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Click "Copy Firestore Rules" below to copy the complete rules that protect your private financial records.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    Paste &amp; Publish in Firebase Console
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Click "Open Firebase Console Rules" below, select the <strong>Rules</strong> tab in Firestore Database, paste the code, and click <strong>Publish</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    Verify &amp; Sync
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Come back here and tap "Verify &amp; Sync Now" to push all queued changes to your cloud database.
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleCopyRules}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {hasCopiedRules ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Firestore Rules</span>
                  </>
                )}
              </button>

              <a
                href={getFirebaseConsoleRulesUrl(firebaseProjectId)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Firebase Console Rules</span>
              </a>

              <button
                type="button"
                onClick={() => syncNow()}
                disabled={syncStatus === 'syncing'}
                className="px-3.5 py-2 rounded-xl border border-amber-600/40 dark:border-amber-400/40 hover:bg-amber-600/10 text-amber-900 dark:text-amber-200 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    syncStatus === 'syncing' ? 'animate-spin' : ''
                  }`}
                />
                <span>Verify &amp; Sync Now</span>
              </button>
            </div>

            {/* Collapsible preview */}
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer font-bold text-amber-900 dark:text-amber-300 hover:underline select-none">
                Preview firestore.rules
              </summary>
              <div className="mt-2 p-3 rounded-xl bg-neutral-950 text-neutral-100 font-mono text-[11px] overflow-x-auto max-h-60 overflow-y-auto border border-neutral-800">
                <pre className="whitespace-pre">{FIRESTORE_RULES_SOURCE}</pre>
              </div>
            </details>
          </div>
        ) : syncError ? (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <span className="font-semibold">Sync notice:</span> {syncError}
              <div className="text-[11px] text-amber-700 dark:text-amber-300">
                Your data is safely preserved on this device. We will automatically retry when connectivity returns, or you can tap "Sync Now".
              </div>
            </div>
          </div>
        ) : null}

        {/* Informative Note */}
        <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-500 pt-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2E9E6B] shrink-0" />
            <span>
              {currentUser
                ? 'Multi-user isolation active. Your records are securely restricted to your Firebase UID.'
                : 'Sign in to access your records across other devices. Full local offline operation is always active.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowConfigGuide(!showConfigGuide)}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
          >
            {showConfigGuide ? 'Hide keys guide' : 'Firebase keys guide'}
          </button>
        </div>

        {/* Collapsible Firebase Setup & Secret Keys Guide */}
        {showConfigGuide && (
          <div className="mt-2.5 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-neutral-700 dark:text-neutral-300 space-y-2.5 animate-fadeIn">
            <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5 text-xs">
              <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Saan ilalagay ang Firebase Keys / Configuration:</span>
            </div>
            <ul className="space-y-1.5 list-disc list-inside text-[11px] text-neutral-600 dark:text-neutral-300">
              <li>
                <span className="font-semibold text-neutral-900 dark:text-white">Client App Config:</span> Ang inyong Firebase settings ay nasa <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[10px]">firebase-applet-config.json</code> sa root folder ng project. Naka-setup na ito nang awtomatiko.
              </li>
              <li>
                <span className="font-semibold text-neutral-900 dark:text-white">Secret Keys / Admin SDK:</span> <span className="text-amber-600 dark:text-amber-400 font-semibold">HINDI</span> dapat ilagay ang server secret keys o private credentials sa client application o mobile app code upang maiwasan ang data leaks. Ang proteksyon at isolation ay pinapatupad ng deployed <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[10px]">firestore.rules</code> sa cloud server ng Google.
              </li>
              <li>
                <span className="font-semibold text-neutral-900 dark:text-white">Android Capacitor Build:</span> Kung mag-e-export ng native Android APK gamit ang Android Studio/Capacitor, ilagay ang inyong <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[10px]">google-services.json</code> file sa directory na: <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[10px]">android/app/google-services.json</code>.
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Profile Settings */}
      <form
        id="section-profile"
        onSubmit={handleSaveProfile}
        className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] space-y-3.5 sm:space-y-4 scroll-mt-20"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center font-bold shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-bold text-black dark:text-white truncate">
              Profile & Account
            </h2>
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">
              Personalize your workspace
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 text-xs sm:text-sm font-medium text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
              Email (Local Reference)
            </label>
            <input
              type="email"
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 text-xs sm:text-sm font-medium text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 sm:py-2.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold hover:bg-neutral-800 transition-colors"
          >
            Save Profile
          </button>
        </div>
      </form>

      {/* Preferences & Privacy / Appearance */}
      <div id="section-appearance" className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] space-y-3.5 scroll-mt-20">
        <h2 className="text-sm sm:text-base font-bold text-black dark:text-white">
          Preferences & Privacy
        </h2>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs sm:text-sm">
          {/* Default Currency */}
          <div className="py-2.5 sm:py-3 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1 mr-2">
              <div className="font-semibold text-black dark:text-white truncate">
                Default Currency
              </div>
              <div className="text-[11px] sm:text-xs text-neutral-500 truncate">
                Philippine Peso conventions
              </div>
            </div>
            <span className="font-bold text-black dark:text-white shrink-0">
              PHP (₱)
            </span>
          </div>

          {/* Hide Balances Mode */}
          <div className="py-2.5 sm:py-3 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1 mr-2">
              <div className="font-semibold text-black dark:text-white truncate">
                Hide Balances Mode
              </div>
              <div className="text-[11px] sm:text-xs text-neutral-500 truncate">
                Conceal amounts across screens (₱••••••)
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                updateSettings({ hideBalances: !settings.hideBalances })
              }
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
                settings.hideBalances
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                  : 'bg-[#F6F5F8] dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              {settings.hideBalances ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hidden</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Visible</span>
                </>
              )}
            </button>
          </div>

          {/* Appearance Theme */}
          <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-black dark:text-white truncate">
                Appearance Theme
              </div>
              <div className="text-[11px] sm:text-xs text-neutral-500 truncate">
                Choose Light, Dark, or follow your device System settings
              </div>
            </div>

            <div className="bg-[#E6E5EA] dark:bg-neutral-800 p-1 rounded-2xl flex items-center gap-1 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => updateSettings({ themeMode: 'light', darkMode: false })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  settings.themeMode === 'light' || (!settings.themeMode && !settings.darkMode)
                    ? 'bg-white text-black shadow-xs font-bold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => updateSettings({ themeMode: 'dark', darkMode: true })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  settings.themeMode === 'dark' || (!settings.themeMode && settings.darkMode)
                    ? 'bg-neutral-900 text-white shadow-xs font-bold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => updateSettings({ themeMode: 'system' })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  settings.themeMode === 'system'
                    ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xs font-bold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* Start of Month Day */}
          <div className="py-2.5 sm:py-3 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1 mr-2">
              <div className="font-semibold text-black dark:text-white truncate">
                Start of Month Day
              </div>
              <div className="text-[11px] sm:text-xs text-neutral-500 truncate">
                Salary or billing reset day
              </div>
            </div>
            <select
              value={settings.startOfMonthDay}
              onChange={(e) =>
                updateSettings({ startOfMonthDay: Number(e.target.value) })
              }
              className="px-2.5 py-1.5 rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 text-xs font-bold text-black dark:text-white shrink-0"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  Day {day}
                </option>
              ))}
            </select>
          </div>

          {/* Budget Reminders */}
          <div className="py-2.5 sm:py-3 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1 mr-2">
              <div className="font-semibold text-black dark:text-white truncate">
                Budget & Due Alerts
              </div>
              <div className="text-[11px] sm:text-xs text-neutral-500 truncate">
                Warnings when spending approaches limits
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.budgetReminders}
              onChange={(e) =>
                updateSettings({
                  budgetReminders: e.target.checked,
                  dueReminders: e.target.checked,
                })
              }
              className="w-4 h-4 accent-neutral-900 shrink-0"
            />
          </div>
        </div>
      </div>

      {/* 5. NATIVE ANDROID PHONE NOTIFICATIONS – OFFLINE ONLY */}
      <div id="section-notifications" className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] space-y-3.5 border border-black/[0.04] dark:border-white/[0.06] scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-black dark:text-white">
                Offline Local Phone Reminders
              </h2>
              <p className="text-[11px] sm:text-xs text-neutral-500">
                100% offline device alarms • No internet or cloud servers needed
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestNotification}
            disabled={isTestingNotification}
            className="px-3 py-1.5 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 transition-opacity whitespace-nowrap self-start sm:self-auto disabled:opacity-50"
          >
            {isTestingNotification ? 'Scheduling...' : '🔔 Test Reminder Now'}
          </button>
        </div>

        {/* Master Toggle */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-black dark:text-white">
              Enable Scheduled Reminders
            </div>
            <div className="text-[11px] text-neutral-500">
              Deliver notifications when bills, debts, or collections are due
            </div>
          </div>
          <input
            type="checkbox"
            checked={notificationSettings.enabled}
            onChange={(e) =>
              updateNotificationSettings({ enabled: e.target.checked })
            }
            className="w-4 h-4 accent-neutral-900 dark:accent-white cursor-pointer"
          />
        </div>

        {notificationSettings.enabled && (
          <div className="space-y-3 pt-1">
            {/* Reminder Time of Day */}
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-black dark:text-white">
                  Reminder Time of Day:
                </span>
                <p className="text-[11px] text-neutral-500">
                  Time when morning reminders trigger on your phone
                </p>
              </div>
              <input
                type="time"
                value={notificationSettings.reminderTime || '09:00'}
                onChange={(e) =>
                  updateNotificationSettings({ reminderTime: e.target.value })
                }
                className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-bold tabular-nums text-black dark:text-white text-xs"
              />
            </div>

            {/* Reminder Days Before Checkboxes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                When to Remind:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { days: 0, label: 'On Due Date' },
                  { days: 1, label: '1 Day Before' },
                  { days: 3, label: '3 Days Before' },
                  { days: 7, label: '7 Days Before' },
                ].map((item) => {
                  const list = notificationSettings.remindDaysBeforeList || [
                    0, 1,
                  ];
                  const isChecked = list.includes(item.days);
                  return (
                    <button
                      key={item.days}
                      type="button"
                      onClick={() => {
                        const nextList = isChecked
                          ? list.filter((d) => d !== item.days)
                          : [...list, item.days];
                        updateNotificationSettings({
                          remindDaysBeforeList:
                            nextList.length > 0 ? nextList : [0],
                          remindOnDueDate: nextList.includes(0),
                        });
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all ${
                        isChecked
                          ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Separate category toggles */}
            <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Reminder Categories:
              </label>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600 dark:text-neutral-300">
                    Monthly Bills (Electricity, Water, Wi-Fi, etc.)
                  </span>
                  <input
                    type="checkbox"
                    checked={notificationSettings.billsEnabled}
                    onChange={(e) =>
                      updateNotificationSettings({
                        billsEnabled: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-neutral-900 dark:accent-white cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-600 dark:text-neutral-300">
                    Credit Card Statement & Due Dates
                  </span>
                  <input
                    type="checkbox"
                    checked={notificationSettings.creditEnabled}
                    onChange={(e) =>
                      updateNotificationSettings({
                        creditEnabled: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-neutral-900 dark:accent-white cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-600 dark:text-neutral-300">
                    Loan Installment Due Dates
                  </span>
                  <input
                    type="checkbox"
                    checked={notificationSettings.loanEnabled}
                    onChange={(e) =>
                      updateNotificationSettings({
                        loanEnabled: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-neutral-900 dark:accent-white cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-600 dark:text-neutral-300">
                    Expected Collections (Money Owed to You)
                  </span>
                  <input
                    type="checkbox"
                    checked={notificationSettings.receivablesEnabled}
                    onChange={(e) =>
                      updateNotificationSettings({
                        receivablesEnabled: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-neutral-900 dark:accent-white cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-600 dark:text-neutral-300">
                    Overdue Unpaid Reminders
                  </span>
                  <input
                    type="checkbox"
                    checked={notificationSettings.overdueEnabled}
                    onChange={(e) =>
                      updateNotificationSettings({
                        overdueEnabled: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-neutral-900 dark:accent-white cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Android 13+ Permission status info */}
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 text-[11px] text-neutral-500 space-y-1">
              <div className="flex items-center justify-between">
                <span>Phone Notification Permission:</span>
                <span
                  className={`font-bold ${
                    permGranted ? 'text-[#2E9E6B]' : 'text-amber-600'
                  }`}
                >
                  {permGranted ? 'Granted' : 'Needs Permission'}
                </span>
              </div>
              {!permGranted && (
                <button
                  type="button"
                  onClick={handleRequestPerm}
                  className="mt-1 text-xs font-bold text-neutral-950 dark:text-white underline cursor-pointer"
                >
                  Request Notification Permission Now
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Backup & Export (Android APK and Web Compatible) */}
      <div id="section-backup" className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] space-y-3.5 scroll-mt-20">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-[#2E9E6B] shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-bold text-black dark:text-white truncate">
              Backup, Export & Restore
            </h2>
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">
              100% Offline · Compatible with Android APK & Web
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportJSON}
            className="p-3 sm:p-3.5 rounded-2xl bg-[#F6F5F8] dark:bg-neutral-800 text-left hover:bg-neutral-200/70 dark:hover:bg-neutral-700 transition-colors flex items-center gap-3 disabled:opacity-60"
          >
            <Download className="w-5 h-5 text-black dark:text-white shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-black dark:text-white truncate">
                Export Full Backup (.JSON)
              </div>
              <div className="text-[10px] sm:text-[11px] text-neutral-500 truncate">
                Accounts, ledger, budgets & loans
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportCSV}
            className="p-3 sm:p-3.5 rounded-2xl bg-[#F6F5F8] dark:bg-neutral-800 text-left hover:bg-neutral-200/70 dark:hover:bg-neutral-700 transition-colors flex items-center gap-3 disabled:opacity-60"
          >
            <FileSpreadsheet className="w-5 h-5 text-[#2E9E6B] shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-black dark:text-white truncate">
                Export Ledger (.CSV)
              </div>
              <div className="text-[10px] sm:text-[11px] text-neutral-500 truncate">
                Spreadsheet-ready records
              </div>
            </div>
          </button>
        </div>

        {/* Restore Section */}
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="text-xs font-bold text-black dark:text-white">
              Restore from Backup (.JSON)
            </span>
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setImportMode('merge')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  importMode === 'merge'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                Merge (Keep Existing)
              </button>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  importMode === 'replace'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                Replace All
              </button>
            </div>
          </div>

          {/* Android-safe file input accepting json and fallback text */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json,text/plain,*/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 sm:py-3 px-4 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span className="truncate">Select Backup File (.JSON)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPasteError(null);
                setPastedJsonText('');
                setIsPasteModalOpen(true);
              }}
              className="py-2.5 sm:py-3 px-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-[#F6F5F8] dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-center gap-2 hover:bg-neutral-200/60 dark:hover:bg-neutral-700 transition-colors"
            >
              <Clipboard className="w-4 h-4 shrink-0" />
              <span className="truncate">Paste Backup JSON</span>
            </button>
          </div>

          {importFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                importFeedback.ok
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/40'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-200 border border-red-200 dark:border-red-800/40'
              }`}
            >
              {importFeedback.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              )}
              <span className="flex-1 break-words">{importFeedback.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Data Reset */}
      <div className="bg-white dark:bg-neutral-900 rounded-[22px] sm:rounded-[24px] p-4.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)] space-y-3">
        <h2 className="text-sm sm:text-base font-bold text-black dark:text-white">
          Data Management
        </h2>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={resetToDefaultDemo}
            className="w-full sm:flex-1 py-2.5 sm:py-3 px-4 rounded-2xl bg-[#F6F5F8] dark:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-center gap-1.5 hover:bg-neutral-200/70 transition-colors"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>Restore Default Demo Data</span>
          </button>

          {!confirmClearAll ? (
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="w-full sm:flex-1 py-2.5 sm:py-3 px-4 rounded-2xl bg-red-50 dark:bg-red-950/50 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center justify-center gap-1.5 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Delete All Data</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                clearAllData();
                setConfirmClearAll(false);
              }}
              className="w-full sm:flex-1 py-2.5 sm:py-3 px-4 rounded-2xl bg-red-600 text-xs font-bold text-white flex items-center justify-center gap-1.5 hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Confirm Wipe All Data</span>
            </button>
          )}
        </div>
      </div>

      {/* RESTORE CONFIRMATION MODAL: Validates first and preserves existing data until user confirms */}
      {pendingRestore && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-[24px] max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-black/[0.06] dark:border-white/[0.08] animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-black dark:text-white">
                    Validated Backup File
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Existing data preserved until you confirm
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelRestore}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Backup Contents Summary Card */}
            <div className="p-3.5 rounded-2xl bg-[#F6F5F8] dark:bg-neutral-800 text-xs space-y-2">
              <div className="font-semibold text-black dark:text-white">
                Backup Content Overview:
              </div>
              <div className="grid grid-cols-2 gap-2 text-neutral-600 dark:text-neutral-300">
                <div className="p-2 rounded-xl bg-white dark:bg-neutral-900">
                  <div className="text-[10px] text-neutral-400">Accounts</div>
                  <div className="text-sm font-bold text-black dark:text-white">
                    {pendingRestore.summary.accountsCount}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-neutral-900">
                  <div className="text-[10px] text-neutral-400">Transactions</div>
                  <div className="text-sm font-bold text-black dark:text-white">
                    {pendingRestore.summary.transactionsCount}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-neutral-900">
                  <div className="text-[10px] text-neutral-400">Budgets</div>
                  <div className="text-sm font-bold text-black dark:text-white">
                    {pendingRestore.summary.budgetsCount}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-neutral-900">
                  <div className="text-[10px] text-neutral-400">Recurring</div>
                  <div className="text-sm font-bold text-black dark:text-white">
                    {pendingRestore.summary.recurringCount}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 col-span-2">
                  <div className="text-[10px] text-neutral-400">Money Owed (Receivables)</div>
                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {pendingRestore.summary.receivablesCount || 0}
                  </div>
                </div>
              </div>
              {pendingRestore.summary.updatedAt && (
                <div className="text-[11px] text-neutral-400 pt-1">
                  Export Date: {new Date(pendingRestore.summary.updatedAt).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Mode Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Restoration Mode:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPendingRestore((prev) =>
                      prev ? { ...prev, mode: 'merge' } : null
                    )
                  }
                  className={`p-2.5 rounded-xl text-left border transition-all text-xs ${
                    pendingRestore.mode === 'merge'
                      ? 'border-neutral-900 dark:border-white bg-neutral-900/5 dark:bg-white/10 font-bold text-black dark:text-white'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-500'
                  }`}
                >
                  <div className="font-semibold">Merge Data</div>
                  <div className="text-[10px] text-neutral-500">Keep existing records</div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPendingRestore((prev) =>
                      prev ? { ...prev, mode: 'replace' } : null
                    )
                  }
                  className={`p-2.5 rounded-xl text-left border transition-all text-xs ${
                    pendingRestore.mode === 'replace'
                      ? 'border-red-600 bg-red-50 dark:bg-red-950/40 font-bold text-red-600 dark:text-red-400'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-500'
                  }`}
                >
                  <div className="font-semibold">Replace All</div>
                  <div className="text-[10px] text-neutral-500">Overwrite workspace</div>
                </button>
              </div>
            </div>

            {pendingRestore.mode === 'replace' && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Warning:</strong> Replace mode will overwrite your current accounts, transactions, and budgets with this backup.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancelRestore}
                className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-colors ${
                  pendingRestore.mode === 'replace'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950'
                }`}
              >
                Confirm & Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASTE BACKUP JSON MODAL */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-[24px] max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-black/[0.06] dark:border-white/[0.08] animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                <h3 className="text-sm sm:text-base font-bold text-black dark:text-white">
                  Paste PesoTrack Backup JSON
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Paste the entire contents of a previously exported PesoTrack backup file. It will be validated before anything is restored.
            </p>

            <textarea
              rows={8}
              value={pastedJsonText}
              onChange={(e) => setPastedJsonText(e.target.value)}
              placeholder='{\n  "version": 1,\n  "accounts": [...],\n  "transactions": [...]\n}'
              className="w-full p-3 font-mono text-xs rounded-xl bg-[#F6F5F8] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />

            {pasteError && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{pasteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessPastedText}
                className="px-5 py-2.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold hover:opacity-90"
              >
                Validate & Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOUD RESTORE CONFIRMATION MODAL: Retrieves latest backup from Vercel online backend / Cloud Firestore */}
      {isCloudRestoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-[24px] max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-black/[0.06] dark:border-white/[0.08] animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-black dark:text-white">
                    Restore from Cloud Vault
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    {currentUser?.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCloudRestoreModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cloudRestoreLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                <RefreshCw className="w-7 h-7 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  Retrieving latest backup from cloud vault...
                </div>
              </div>
            ) : cloudRestoreOverview && !cloudRestoreOverview.hasCloudData ? (
              <div className="p-4 rounded-2xl bg-[#F6F5F8] dark:bg-neutral-800 text-center space-y-2">
                <div className="text-xs font-bold text-black dark:text-white">
                  No Cloud Data Found
                </div>
                <p className="text-[11px] text-neutral-500">
                  There are no financial records saved in your cloud vault for this account yet. Tap "Sync to Cloud" to upload your current records.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCloudRestoreModalOpen(false)}
                  className="mt-2 px-4 py-2 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : cloudRestoreOverview?.summary ? (
              <div className="space-y-3.5">
                {/* Cloud Overview Grid */}
                <div className="p-3.5 rounded-2xl bg-[#F6F5F8] dark:bg-neutral-800 text-xs space-y-2">
                  <div className="font-semibold text-black dark:text-white flex items-center justify-between">
                    <span>Cloud Backup Contents:</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-neutral-600 dark:text-neutral-300">
                    <div className="p-2 rounded-xl bg-white dark:bg-neutral-900">
                      <div className="text-[10px] text-neutral-400">Accounts</div>
                      <div className="text-sm font-bold text-black dark:text-white">
                        {cloudRestoreOverview.summary.accountsCount}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-neutral-900">
                      <div className="text-[10px] text-neutral-400">Transactions</div>
                      <div className="text-sm font-bold text-black dark:text-white">
                        {cloudRestoreOverview.summary.transactionsCount}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-neutral-900">
                      <div className="text-[10px] text-neutral-400">Bills & Entries</div>
                      <div className="text-sm font-bold text-black dark:text-white">
                        {cloudRestoreOverview.summary.billsCount}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-neutral-900">
                      <div className="text-[10px] text-neutral-400">Money Owed</div>
                      <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {cloudRestoreOverview.summary.receivablesCount || 0}
                      </div>
                    </div>
                  </div>
                  {cloudRestoreOverview.summary.updatedAt && (
                    <div className="text-[10px] text-neutral-400 pt-1">
                      Last Cloud Update: {new Date(cloudRestoreOverview.summary.updatedAt).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Mode Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Choose Restoration Mode:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCloudRestoreMode('merge')}
                      className={`p-2.5 rounded-xl text-left border transition-all text-xs cursor-pointer ${
                        cloudRestoreMode === 'merge'
                          ? 'border-neutral-900 dark:border-white bg-neutral-900/5 dark:bg-white/10 font-bold text-black dark:text-white'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-500'
                      }`}
                    >
                      <div className="font-semibold">Merge Data</div>
                      <div className="text-[10px] text-neutral-500">Keep local records</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCloudRestoreMode('replace')}
                      className={`p-2.5 rounded-xl text-left border transition-all text-xs cursor-pointer ${
                        cloudRestoreMode === 'replace'
                          ? 'border-red-600 bg-red-50 dark:bg-red-950/40 font-bold text-red-600 dark:text-red-400'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-500'
                      }`}
                    >
                      <div className="font-semibold">Replace All</div>
                      <div className="text-[10px] text-neutral-500">Overwrite workspace</div>
                    </button>
                  </div>
                </div>

                {cloudRestoreMode === 'replace' ? (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      An automatic safety backup of your current local records will be saved first before replacing.
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400">
                    Existing local transactions and accounts will be preserved; missing items from the cloud will be added.
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCloudRestoreModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={cloudRestoreLoading}
                    onClick={handleConfirmCloudRestore}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-50 ${
                      cloudRestoreMode === 'replace'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950'
                    }`}
                  >
                    {cloudRestoreMode === 'replace' ? 'Confirm & Replace' : 'Confirm & Merge'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
