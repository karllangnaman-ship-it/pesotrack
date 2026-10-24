import React, { useState } from 'react';
import { AlertCircle, Loader2, Undo2, X } from 'lucide-react';

export interface UnsendConfirmModalProps {
  isOpen: boolean;
  messageId: string | null;
  messagePreview?: string;
  onClose: () => void;
  onConfirm: (messageId: string) => Promise<{ ok: boolean; error?: string }>;
}

export const UnsendConfirmModal: React.FC<UnsendConfirmModalProps> = ({
  isOpen,
  messageId,
  messagePreview = '',
  onClose,
  onConfirm,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !messageId) return null;

  const handleUnsend = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await onConfirm(messageId);
      if (res.ok) {
        setIsLoading(false);
        onClose();
      } else {
        setIsLoading(false);
        setErrorMessage(res.error || 'Failed to unsend message.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Error unsending message.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsend-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn select-none"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0D1611] border border-[#1E382A] shadow-2xl p-6 text-[#F3F4F1] space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Undo2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 id="unsend-modal-title" className="text-base font-bold text-white tracking-tight">
                Unsend Message?
              </h3>
              <p className="text-[11px] text-[#8FA095]">
                Remove for everyone in the vault
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close dialog"
            className="p-1 rounded-xl text-[#8FA095] hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message snippet preview */}
        {messagePreview && (
          <div className="p-3 rounded-2xl bg-[#142319] border border-[#233B2B] text-xs text-[#D1D5DB] italic truncate">
            &ldquo;{messagePreview.length > 80 ? `${messagePreview.slice(0, 77)}...` : messagePreview}&rdquo;
          </div>
        )}

        <p className="text-xs text-[#8FA095] leading-relaxed">
          Unsending removes this message and any attachments for all participants in this joint vault. An indicator will display that a message was unsent.
        </p>

        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl border border-[#23382A] text-xs font-semibold text-[#8FA095] hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUnsend}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Unsending...</span>
              </>
            ) : (
              <>
                <Undo2 className="w-3.5 h-3.5" />
                <span>Unsend for Everyone</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
