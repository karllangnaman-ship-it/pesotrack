import React, { useState } from 'react';
import { AlertTriangle, Check, Loader2, RefreshCw, Trash2, User, Users, X } from 'lucide-react';

export interface ClearChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scope: 'for_me' | 'for_everyone') => Promise<{ ok: boolean; error?: string }>;
  partnerName?: string;
}

export const ClearChatModal: React.FC<ClearChatModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  partnerName = 'Partner',
}) => {
  const [scope, setScope] = useState<'for_me' | 'for_everyone'>('for_me');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExecuteClear = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await onConfirm(scope);
      if (result.ok) {
        setIsLoading(false);
        onClose();
      } else {
        setIsLoading(false);
        setErrorMessage(result.error || 'Failed to clear chat. Please try again.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Failed to clear chat.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-chat-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn select-none"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-[#0D1611] border border-[#1E382A] shadow-2xl p-6 text-[#F3F4F1] space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0 shadow-xs">
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 id="clear-chat-title" className="text-lg font-bold text-white tracking-tight">
                Clear Chat History
              </h3>
              <p className="text-xs text-[#8FA095]">
                Manage conversation history in your joint vault
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close dialog"
            className="p-1.5 rounded-xl text-[#8FA095] hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Safety Assurance Note */}
        <div className="p-3.5 rounded-2xl bg-[#142319] border border-[#233B2B] text-xs text-[#D1D5DB] space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[#86EFAC]">
            <Check className="w-4 h-4 text-[#22C55E]" />
            <span>Financial Records Are Safe</span>
          </div>
          <p className="text-[11px] text-[#8FA095] leading-relaxed">
            Clearing chat only removes conversational messages. Your joint bank accounts, transactions, shared bills, debt planner, and grocery lists will remain completely intact.
          </p>
        </div>

        {/* Scope Selector Options */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-[#8FA095] uppercase tracking-wider block">
            Choose Deletion Scope
          </label>

          {/* Option 1: Clear for Me */}
          <div
            onClick={() => setScope('for_me')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
              scope === 'for_me'
                ? 'bg-[#182C20] border-[#22C55E]/60 text-white shadow-xs'
                : 'bg-[#121E17] border-[#1E3424] text-[#8FA095] hover:bg-[#16251C]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                scope === 'for_me' ? 'border-[#22C55E] bg-[#22C55E]' : 'border-[#4B5E52]'
              }`}
            >
              {scope === 'for_me' && <span className="w-2 h-2 rounded-full bg-[#0D1611]" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#86EFAC]" />
                <span className="text-sm font-bold text-white">Clear for me only</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#174F32] text-[#86EFAC]">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-[#8FA095] mt-1 leading-relaxed">
                Messages are removed from your device and view. {partnerName} keeps their full chat history intact.
              </p>
            </div>
          </div>

          {/* Option 2: Clear for Everyone */}
          <div
            onClick={() => setScope('for_everyone')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
              scope === 'for_everyone'
                ? 'bg-red-500/10 border-red-500/50 text-white shadow-xs'
                : 'bg-[#121E17] border-[#1E3424] text-[#8FA095] hover:bg-[#16251C]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                scope === 'for_everyone' ? 'border-red-400 bg-red-400' : 'border-[#4B5E52]'
              }`}
            >
              {scope === 'for_everyone' && <span className="w-2 h-2 rounded-full bg-[#0D1611]" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-red-400" />
                <span className="text-sm font-bold text-white">Clear for everyone</span>
              </div>
              <p className="text-xs text-[#8FA095] mt-1 leading-relaxed">
                Permanently removes all messages for all members in this joint workspace. Deleted messages cannot be recovered.
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert with Retry */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 flex items-start gap-2 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{errorMessage}</p>
              <button
                type="button"
                onClick={handleExecuteClear}
                className="mt-1.5 text-xs font-bold text-red-300 hover:text-white underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Tap to retry</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-[#23382A] text-xs sm:text-sm font-semibold text-[#8FA095] hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteClear}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 ${
              scope === 'for_everyone'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#174F32] hover:bg-[#123E27] border border-[#286040]'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Clearing chat...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{scope === 'for_everyone' ? 'Clear for Everyone' : 'Clear for Me'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
