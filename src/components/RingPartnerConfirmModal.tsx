import React from 'react';
import { AlertCircle, Bell, BellRing, Clock, ShieldCheck, X } from 'lucide-react';

interface RingPartnerConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  partnerName: string;
  partnerAvatarColor?: string;
  workspaceName?: string;
  cooldownSeconds?: number;
  isLoading?: boolean;
}

export const RingPartnerConfirmModal: React.FC<RingPartnerConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  partnerName,
  partnerAvatarColor,
  workspaceName,
  cooldownSeconds = 0,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const partnerInitial = (partnerName || 'P').charAt(0).toUpperCase();
  const isOnCooldown = cooldownSeconds > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ring-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-[#15221B] border border-[#E5E1D8] dark:border-[#223528] shadow-2xl p-6 text-center space-y-5 overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 rounded-xl text-[#777D75] hover:text-[#174F32] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Partner Avatar */}
        <div className="mx-auto w-16 h-16 relative flex items-center justify-center mt-2">
          <div
            style={{ backgroundColor: partnerAvatarColor || '#174F32' }}
            className="w-16 h-16 rounded-full text-white font-extrabold text-xl flex items-center justify-center shadow-md border-2 border-white dark:border-[#1E382A]"
          >
            {partnerInitial}
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
            <BellRing className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-1.5">
          <h2
            id="ring-modal-title"
            className="text-lg sm:text-xl font-extrabold text-[#252923] dark:text-white tracking-tight"
          >
            Ring {partnerName}&apos;s Device?
          </h2>
          <p className="text-xs text-[#777D75] dark:text-[#8FA095] leading-relaxed">
            This will sound an audio chime and send an instant notification to {partnerName}&apos;s active device for the &ldquo;{workspaceName || 'Joint'}&rdquo; vault.
          </p>
        </div>

        {/* Rate-limiting or Cooldown Warning */}
        {isOnCooldown ? (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-center gap-2 font-semibold">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Please wait {cooldownSeconds}s before ringing again</span>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-[#E8F3EC] dark:bg-[#183023] border border-[#C5E2D1] dark:border-[#264835] text-[#174F32] dark:text-[#83C95B] text-xs flex items-center justify-center gap-2 font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Authenticated Partner Alert • 45s Timeout</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-2xl border border-[#E5E1D8] dark:border-[#223528] text-xs font-extrabold text-[#555C50] dark:text-[#D1D5DB] hover:bg-[#F9F8F5] dark:hover:bg-[#1A2A20] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isOnCooldown || isLoading}
            onClick={onConfirm}
            className="py-2.5 px-4 rounded-2xl bg-[#174F32] hover:bg-[#123E27] dark:bg-[#1F5438] dark:hover:bg-[#18452D] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <BellRing className="w-3.5 h-3.5 text-[#83C95B]" />
            <span>{isLoading ? 'Ringing...' : 'Ring Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
