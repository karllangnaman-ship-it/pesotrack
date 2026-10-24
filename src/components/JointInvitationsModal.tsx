import React, { useState } from 'react';
import {
  Check,
  Clock,
  HeartHandshake,
  Mail,
  UserCheck,
  Users,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { JointInvitation } from '../types/finance';

interface JointInvitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitations: JointInvitation[];
  sentInvitations: JointInvitation[];
  onAccept: (invitationId: string) => Promise<boolean>;
  onDecline: (invitationId: string) => Promise<boolean>;
  onRevoke: (invitationId: string) => Promise<boolean>;
  currentUserEmail?: string | null;
}

export const JointInvitationsModal: React.FC<JointInvitationsModalProps> = ({
  isOpen,
  onClose,
  invitations,
  sentInvitations,
  onAccept,
  onDecline,
  onRevoke,
  currentUserEmail,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'received' | 'sent'>('received');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAcceptClick = async (id: string) => {
    setActionLoadingId(id);
    setFeedbackMessage(null);
    try {
      const ok = await onAccept(id);
      if (ok) {
        setFeedbackMessage('Invitation accepted! Opening your joint workspace...');
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (e: any) {
      setFeedbackMessage(e?.message || 'Failed to accept invitation.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineClick = async (id: string) => {
    setActionLoadingId(id);
    setFeedbackMessage(null);
    try {
      await onDecline(id);
      setFeedbackMessage('Invitation declined.');
    } catch (e: any) {
      setFeedbackMessage(e?.message || 'Failed to decline invitation.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeClick = async (id: string) => {
    setActionLoadingId(id);
    setFeedbackMessage(null);
    try {
      await onRevoke(id);
      setFeedbackMessage('Invitation cancelled.');
    } catch (e: any) {
      setFeedbackMessage(e?.message || 'Failed to cancel invitation.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingReceived = invitations.filter((i) => i.status === 'pending');
  const pendingSent = sentInvitations.filter((i) => i.status === 'pending');

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="relative w-full max-w-lg bg-[#F6F4EE] dark:bg-[#15221B] rounded-3xl border border-[#E5E1D8] dark:border-[#223528] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#E5E1D8] dark:border-[#223528] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#174F32]/10 dark:bg-[#83C95B]/15 text-[#174F32] dark:text-[#83C95B] flex items-center justify-center">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#252923] dark:text-white">
                Joint Account Invitations
              </h2>
              <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
                Manage shared finance requests with partners or family
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#777D75] hover:text-[#252923] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="px-5 py-2.5 bg-emerald-500/15 border-b border-emerald-500/20 text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Tab Switcher: Received vs Sent */}
        <div className="px-5 sm:px-6 pt-4 pb-2">
          <div className="bg-[#E8E4DA] dark:bg-[#1C2C23] p-1 rounded-2xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveSubTab('received')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'received'
                  ? 'bg-[#174F32] text-white shadow-xs'
                  : 'text-[#61685D] dark:text-[#9EA59B]'
              }`}
            >
              <span>Received</span>
              {pendingReceived.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                  {pendingReceived.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('sent')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'sent'
                  ? 'bg-[#174F32] text-white shadow-xs'
                  : 'text-[#61685D] dark:text-[#9EA59B]'
              }`}
            >
              <span>Sent</span>
              {pendingSent.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 text-[10px] font-black">
                  {pendingSent.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3.5 flex-1">
          {activeSubTab === 'received' ? (
            pendingReceived.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#E8E4DA] dark:bg-[#1C2C23] text-[#777D75] flex items-center justify-center">
                  <Mail className="w-6 h-6 opacity-60" />
                </div>
                <p className="text-sm font-bold text-[#252923] dark:text-white">No pending invitations</p>
                <p className="text-xs text-[#777D75] dark:text-[#8FA095] max-w-xs mx-auto">
                  When a partner or family member invites {currentUserEmail || 'you'} to a joint account, it will appear here.
                </p>
              </div>
            ) : (
              pendingReceived.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#223528] rounded-2xl p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#174F32] text-[#83C95B] font-black text-sm flex items-center justify-center shrink-0">
                        {inv.inviterName ? inv.inviterName.charAt(0).toUpperCase() : 'P'}
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-[#252923] dark:text-white leading-tight">
                          {inv.jointWorkspaceName}
                        </h3>
                        <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
                          Invited by <strong className="text-[#252923] dark:text-white">{inv.inviterName}</strong> ({inv.inviterEmail})
                        </p>
                      </div>
                    </div>
                    {inv.relationship && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-[#174F32]/10 dark:bg-[#83C95B]/15 text-[#174F32] dark:text-[#83C95B] whitespace-nowrap">
                        {inv.relationship}
                      </span>
                    )}
                  </div>

                  {inv.message && (
                    <div className="bg-[#F6F4EE] dark:bg-[#15221B] p-2.5 rounded-xl text-xs text-[#61685D] dark:text-[#BAC0B6] italic border border-[#E5E1D8]/60 dark:border-[#223528]/60">
                      "{inv.message}"
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 gap-2">
                    <div className="flex items-center gap-1 text-[11px] text-[#777D75] dark:text-[#8FA095]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={actionLoadingId === inv.id}
                        onClick={() => handleDeclineClick(inv.id)}
                        className="px-3 py-1.5 rounded-xl border border-[#E5E1D8] dark:border-[#283C2F] text-xs font-bold text-[#777D75] dark:text-[#BAC0B6] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        Decline
                      </button>

                      <button
                        type="button"
                        disabled={actionLoadingId === inv.id}
                        onClick={() => handleAcceptClick(inv.id)}
                        className="px-4 py-1.5 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        {actionLoadingId === inv.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Joining...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            pendingSent.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#E8E4DA] dark:bg-[#1C2C23] text-[#777D75] flex items-center justify-center">
                  <HeartHandshake className="w-6 h-6 opacity-60" />
                </div>
                <p className="text-sm font-bold text-[#252923] dark:text-white">No pending sent invitations</p>
                <p className="text-xs text-[#777D75] dark:text-[#8FA095] max-w-xs mx-auto">
                  Invitations you send to your partner or family will be tracked here.
                </p>
              </div>
            ) : (
              pendingSent.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#223528] rounded-2xl p-4 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-[#252923] dark:text-white leading-tight">
                        {inv.jointWorkspaceName}
                      </h3>
                      <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
                        Sent to: <strong className="text-[#252923] dark:text-white">{inv.inviteeEmail}</strong>
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      Pending
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#777D75]">
                      Sent {new Date(inv.createdAt).toLocaleDateString()}
                    </span>

                    <button
                      type="button"
                      disabled={actionLoadingId === inv.id}
                      onClick={() => handleRevokeClick(inv.id)}
                      className="px-3 py-1 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      {actionLoadingId === inv.id ? 'Cancelling...' : 'Cancel Invitation'}
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
};
