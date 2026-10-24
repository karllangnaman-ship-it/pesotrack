import React from 'react';
import { MessageSquare, Phone, PhoneOff, BellOff } from 'lucide-react';
import { JointRingRequest } from '../types/finance';

interface IncomingRingModalProps {
  ringRequest: JointRingRequest | null;
  onAccept: () => void;
  onDismiss: () => void;
  onMessage?: () => void;
}

export const IncomingRingModal: React.FC<IncomingRingModalProps> = ({
  ringRequest,
  onAccept,
  onDismiss,
  onMessage,
}) => {
  if (!ringRequest) return null;

  const callerInitial = (ringRequest.callerName || 'P').charAt(0).toUpperCase();

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="incoming-ring-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0B140E] border border-[#1E382A] shadow-2xl p-8 text-center space-y-6 overflow-hidden">
        {/* Ambient Radial Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Pulsing Concentric Ring Waves around Avatar (Messenger style) */}
        <div className="relative mx-auto w-32 h-32 flex items-center justify-center my-2">
          {/* Outermost animated pulse */}
          <span className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping opacity-60" />
          {/* Middle glow ring */}
          <span className="absolute inset-2 rounded-full border border-emerald-400/50 bg-emerald-500/10 animate-pulse" />
          {/* Inner ring */}
          <span className="absolute inset-4 rounded-full border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(74,222,128,0.35)]" />

          {/* Central Avatar */}
          <div
            style={{ backgroundColor: ringRequest.callerAvatarColor || '#174F32' }}
            className="relative w-22 h-22 rounded-full text-white font-black text-3xl flex items-center justify-center shadow-2xl border-3 border-emerald-400/60 overflow-hidden"
          >
            {callerInitial}
          </div>
        </div>

        {/* Identity & Ring Status */}
        <div className="space-y-1.5 relative z-10">
          <h2
            id="incoming-ring-title"
            className="text-2xl font-black text-white tracking-tight"
          >
            {ringRequest.callerName}
          </h2>
          <div className="text-sm font-bold text-emerald-400">
            Incoming Ring
          </div>
          <p className="text-xs text-[#8FA095]">
            Ring from Joint Finances
          </p>
        </div>

        {/* Primary Circular Call Controls (Decline & Accept) */}
        <div className="flex items-center justify-center gap-10 pt-4 relative z-10">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Decline incoming ring"
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 flex items-center justify-center transition-all cursor-pointer active:scale-90"
            >
              <PhoneOff className="w-7 h-7 stroke-[2.4]" />
            </button>
            <span className="text-xs font-bold text-[#8FA095]">Decline</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onAccept}
              aria-label="Accept incoming ring and open chat"
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/35 flex items-center justify-center transition-all cursor-pointer active:scale-90 animate-bounce"
            >
              <Phone className="w-7 h-7 stroke-[2.4]" />
            </button>
            <span className="text-xs font-bold text-emerald-400">Accept</span>
          </div>
        </div>

        {/* Auxiliary Quick Actions (Message & Snooze) */}
        <div className="flex items-center justify-center gap-12 pt-2 border-t border-[#1C2C22] relative z-10">
          <button
            type="button"
            onClick={() => {
              onDismiss();
              onMessage?.();
            }}
            className="flex flex-col items-center gap-1 text-[#8FA095] hover:text-white transition-colors cursor-pointer text-[11px] font-semibold"
          >
            <div className="w-9 h-9 rounded-full bg-[#16231A] border border-[#223628] flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-[#8FA095]" />
            </div>
            <span>Message</span>
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="flex flex-col items-center gap-1 text-[#8FA095] hover:text-white transition-colors cursor-pointer text-[11px] font-semibold"
          >
            <div className="w-9 h-9 rounded-full bg-[#16231A] border border-[#223628] flex items-center justify-center">
              <BellOff className="w-4 h-4 text-[#8FA095]" />
            </div>
            <span>Snooze</span>
          </button>
        </div>
      </div>
    </div>
  );
};
