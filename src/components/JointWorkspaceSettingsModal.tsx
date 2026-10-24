import React, { useState } from 'react';
import {
  Crown,
  Heart,
  LogOut,
  Mail,
  Plus,
  Shield,
  Trash2,
  User,
  UserMinus,
  Users,
  X,
  Loader2,
  Check,
} from 'lucide-react';
import { JointWorkspace, JointMember, getWorkspaceMemberLimit } from '../types/finance';

interface JointWorkspaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: JointWorkspace;
  currentUserId: string;
  onUpdateWorkspace: (data: { name: string; relationship: string }) => Promise<boolean>;
  onInvitePartner: (email: string, message?: string) => Promise<boolean>;
  onRemoveMember: (memberUid: string) => Promise<boolean>;
  onLeaveWorkspace: () => Promise<boolean>;
}

export const JointWorkspaceSettingsModal: React.FC<JointWorkspaceSettingsModalProps> = ({
  isOpen,
  onClose,
  workspace,
  currentUserId,
  onUpdateWorkspace,
  onInvitePartner,
  onRemoveMember,
  onLeaveWorkspace,
}) => {
  const [name, setName] = useState(workspace.name || 'Our Household');
  const [relationship, setRelationship] = useState(workspace.relationship || 'Partner');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [showInviteInput, setShowInviteInput] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [actionMemberLoading, setActionMemberLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  if (!isOpen) return null;

  const isOwner = workspace.ownerUid === currentUserId;
  const members = workspace.members || [];
  const maxMembers = getWorkspaceMemberLimit(workspace.relationship);
  const hasCapacity = members.length < maxMembers;

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setFeedback(null);
    try {
      const ok = await onUpdateWorkspace({ name: name.trim(), relationship: relationship.trim() });
      if (ok) {
        setFeedback('Workspace details updated successfully!');
      }
    } catch (e: any) {
      setFeedback(e?.message || 'Failed to update workspace.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    setFeedback(null);
    try {
      const ok = await onInvitePartner(inviteEmail.trim(), inviteMessage.trim());
      if (ok) {
        setFeedback(`Invitation sent to ${inviteEmail.trim()}!`);
        setInviteEmail('');
        setShowInviteInput(false);
      }
    } catch (e: any) {
      setFeedback(e?.message || 'Failed to send partner invitation.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveClick = async (memberUid: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this joint account?`)) {
      return;
    }
    setActionMemberLoading(memberUid);
    try {
      await onRemoveMember(memberUid);
      setFeedback(`Removed ${memberName} from joint workspace.`);
    } catch (e: any) {
      setFeedback(e?.message || 'Failed to remove member.');
    } finally {
      setActionMemberLoading(null);
    }
  };

  const handleLeaveClick = async () => {
    setActionMemberLoading('leave');
    try {
      await onLeaveWorkspace();
      onClose();
    } catch (e: any) {
      setFeedback(e?.message || 'Failed to leave workspace.');
    } finally {
      setActionMemberLoading(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="relative w-full max-w-lg bg-[#F6F4EE] dark:bg-[#15221B] rounded-3xl border border-[#E5E1D8] dark:border-[#223528] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#E5E1D8] dark:border-[#223528] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#174F32] text-[#83C95B] flex items-center justify-center">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#252923] dark:text-white">
                Joint Account Settings
              </h2>
              <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
                Manage members, roles, and workspace properties
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

        {/* Feedback message */}
        {feedback && (
          <div className="px-5 py-2.5 bg-emerald-500/15 border-b border-emerald-500/20 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
            {feedback}
          </div>
        )}

        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Workspace Details Form */}
          <form onSubmit={handleSaveDetails} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-[#777D75] dark:text-[#8FA095] uppercase tracking-wider">
                Workspace Info
              </h3>
              {isOwner && (
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="text-xs font-bold text-[#174F32] dark:text-[#83C95B] hover:underline cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-xs font-bold text-[#252923] dark:text-white mb-1 block">
                  Joint Account Name
                </label>
                <input
                  type="text"
                  disabled={!isOwner}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#283C2F] text-xs sm:text-sm text-[#252923] dark:text-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#252923] dark:text-white mb-1 block">
                  Relationship Label
                </label>
                <input
                  type="text"
                  disabled={!isOwner}
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="e.g. Partner, Spouse, Family"
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#283C2F] text-xs sm:text-sm text-[#252923] dark:text-white disabled:opacity-60"
                />
              </div>
            </div>
          </form>

          {/* Members List */}
          <div className="space-y-3 pt-3 border-t border-[#E5E1D8] dark:border-[#223528]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-[#777D75] dark:text-[#8FA095] uppercase tracking-wider">
                Members ({members.length} / {maxMembers})
              </h3>
              {hasCapacity && isOwner && !showInviteInput && (
                <button
                  type="button"
                  onClick={() => setShowInviteInput(true)}
                  className="text-xs font-bold text-[#174F32] dark:text-[#83C95B] flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Invite Member</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {members.map((member) => {
                const isMemberOwner = member.role === 'owner';
                const isMe = member.uid === currentUserId;

                return (
                  <div
                    key={member.uid}
                    className="p-3.5 rounded-2xl bg-white dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#283C2F] flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs"
                        style={{ backgroundColor: member.avatarColor || '#174F32' }}
                      >
                        {member.displayName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-extrabold text-[#252923] dark:text-white truncate">
                            {member.displayName || 'Member'}
                          </p>
                          {isMe && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-black/5 dark:bg-white/10 text-[#777D75]">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#777D75] dark:text-[#8FA095] truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          isMemberOwner
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : 'bg-[#174F32]/10 dark:bg-[#83C95B]/15 text-[#174F32] dark:text-[#83C95B]'
                        }`}
                      >
                        {isMemberOwner && <Crown className="w-3 h-3 text-amber-500" />}
                        <span>{member.role}</span>
                      </span>

                      {/* Owner can remove partner */}
                      {isOwner && !isMemberOwner && (
                        <button
                          type="button"
                          disabled={actionMemberLoading === member.uid}
                          onClick={() => handleRemoveClick(member.uid, member.displayName)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Remove partner"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Invite Partner Form inside Settings */}
            {showInviteInput && (
              <form onSubmit={handleSendInvite} className="p-4 rounded-2xl bg-[#E8F3EC] dark:bg-[#183023] border border-[#C5E2D1] dark:border-[#264835] space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#174F32] dark:text-[#83C95B]">
                    Send Partner Invitation
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowInviteInput(false)}
                    className="text-[#174F32] dark:text-[#83C95B] text-xs hover:underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="partner@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C2C23] border border-[#C5E2D1] dark:border-[#283C2F] text-xs text-[#252923] dark:text-white"
                />

                <textarea
                  rows={2}
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Optional note..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C2C23] border border-[#C5E2D1] dark:border-[#283C2F] text-xs text-[#252923] dark:text-white"
                />

                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="w-full py-2 rounded-xl bg-[#174F32] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isInviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  <span>Send Invitation</span>
                </button>
              </form>
            )}
          </div>

          {/* Privacy & Scope Card */}
          <div className="p-3.5 rounded-2xl bg-[#F6F4EE] dark:bg-[#18271F] border border-[#E5E1D8] dark:border-[#223528] text-xs text-[#777D75] dark:text-[#8FA095] space-y-1">
            <p className="font-extrabold text-[#252923] dark:text-white flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#174F32] dark:text-[#83C95B]" />
              <span>Data Isolation & Permissions</span>
            </p>
            <p className="leading-relaxed">
              Financial records created in this Joint Account are accessible strictly to the authorized members of this workspace. Personal transactions, loans, and personal wallets never appear here.
            </p>
          </div>

          {/* Leave Workspace Action */}
          <div className="pt-3 border-t border-[#E5E1D8] dark:border-[#223528]">
            {!confirmLeave ? (
              <button
                type="button"
                onClick={() => setConfirmLeave(true)}
                className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Joint Account</span>
              </button>
            ) : (
              <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/25 space-y-2 text-center animate-fadeIn">
                <p className="text-xs font-bold text-red-900 dark:text-red-200">
                  Are you sure you want to leave this workspace?
                </p>
                <p className="text-[11px] text-red-800 dark:text-red-300">
                  Shared records will remain preserved for your partner.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setConfirmLeave(false)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1C2C23] text-xs font-bold text-[#777D75] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionMemberLoading === 'leave'}
                    onClick={handleLeaveClick}
                    className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    {actionMemberLoading === 'leave' && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Confirm & Leave</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
