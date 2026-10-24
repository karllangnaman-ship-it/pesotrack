import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  AlertCircle,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Crown,
  Heart,
  Home,
  Info,
  Loader2,
  LogOut,
  Mail,
  Moon,
  MoreVertical,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sun,
  Trash2,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { THEME_COLOR_LIST } from '../utils/themeColors';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NotificationSettings,
  ThemeMode,
  JointMember,
  JointInvitation,
  getWorkspaceMemberLimit,
} from '../types/finance';
import { formatPeso } from '../utils/currency';
import {
  checkNotificationPermission,
  requestNotificationPermission,
  sanitizeNotificationSettings,
} from '../utils/notificationService';

interface JointSettingsPageProps {
  onOpenCreateWorkspace?: () => void;
  onOpenInvitations?: () => void;
}

interface RelationshipMeta {
  id: string;
  label: string;
  max: number;
  description: string;
  idealFor: string;
  icon: string;
}

const RELATIONSHIP_CONFIGS: RelationshipMeta[] = [
  {
    id: 'Partner',
    label: 'Partner',
    max: 2,
    description: 'For unmarried partners.',
    idealFor: 'Ideal for couples who share bills and personal living costs.',
    icon: '❤️',
  },
  {
    id: 'Spouse',
    label: 'Spouse / Married',
    max: 2,
    description: 'For married couples.',
    idealFor: 'Ideal for married couples managing a combined household vault.',
    icon: '💍',
  },
  {
    id: 'Family',
    label: 'Family',
    max: 10,
    description: 'For parents, children, siblings, and other family members.',
    idealFor: 'Ideal for families who manage household finances together.',
    icon: '👨‍👩‍👧‍👦',
  },
  {
    id: 'Housemate',
    label: 'Housemate / Roommate',
    max: 10,
    description: 'For shared living arrangements.',
    idealFor: 'Ideal for roommates splitting rent, utilities, groceries, and wifi.',
    icon: '🏠',
  },
  {
    id: 'Other',
    label: 'Other',
    max: 10,
    description: 'For any other shared-finance arrangement.',
    idealFor: 'Ideal for clubs, trip groups, or any custom shared arrangement.',
    icon: '🤝',
  },
];

function getRelationshipMeta(rel?: string): RelationshipMeta {
  const norm = (rel || '').toLowerCase();
  if (norm.includes('spouse') || norm.includes('marri')) {
    return RELATIONSHIP_CONFIGS[1];
  }
  if (norm.includes('family')) {
    return RELATIONSHIP_CONFIGS[2];
  }
  if (norm.includes('housemate') || norm.includes('roommate')) {
    return RELATIONSHIP_CONFIGS[3];
  }
  if (norm.includes('other')) {
    return RELATIONSHIP_CONFIGS[4];
  }
  return RELATIONSHIP_CONFIGS[0];
}

export const JointSettingsPage: React.FC<JointSettingsPageProps> = ({
  onOpenCreateWorkspace,
  onOpenInvitations,
}) => {
  const {
    activeJointWorkspace,
    myJointWorkspaces,
    jointInvitations,
    jointSentInvitations,
    workspacePendingInvitations,
    jointActivities,
    isJointRealtimeActive,
    jointPendingMutationCount,
    isOnline,
    currentUser,
    state,
    updateSettings,
    updateJointWorkspace,
    updateJointNotificationSettings,
    testJointLocalNotification,
    invitePartnerToJoint,
    removeJointMember,
    updateJointMemberRole,
    leaveJointWorkspace,
    revokeJointInvitation,
    refreshJointData,
    showToast,
  } = useFinance();

  // State
  const [workspaceName, setWorkspaceName] = useState(activeJointWorkspace?.name || '');
  const [relationship, setRelationship] = useState(activeJointWorkspace?.relationship || 'Family');
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);
  const [isRelationshipDropdownOpen, setIsRelationshipDropdownOpen] = useState(false);
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
  const [relationshipChangeError, setRelationshipChangeError] = useState<string | null>(null);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Member Action Dropdown & Modals
  const [activeMemberMenuUid, setActiveMemberMenuUid] = useState<string | null>(null);
  const [selectedMemberForDetails, setSelectedMemberForDetails] = useState<JointMember | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<JointMember | null>(null);
  const [memberToTransfer, setMemberToTransfer] = useState<JointMember | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Leave & Danger
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Notification Perm
  const [permGranted, setPermGranted] = useState<boolean>(true);
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  const inviteInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkNotificationPermission().then((res) => {
      setPermGranted(res.granted);
    });
  }, []);

  useEffect(() => {
    if (activeJointWorkspace) {
      setWorkspaceName(activeJointWorkspace.name || '');
      setRelationship(activeJointWorkspace.relationship || 'Family');
    }
  }, [activeJointWorkspace?.id, activeJointWorkspace?.name, activeJointWorkspace?.relationship]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRelationshipDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!activeJointWorkspace) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-[#174F32]/20 dark:bg-[#60D36D]/15 text-[#174F32] dark:text-[#60D36D] flex items-center justify-center">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-[#252923] dark:text-white">
          No Active Joint Workspace
        </h2>
        <p className="text-xs text-[#777D75] dark:text-[#8FA095] max-w-sm mx-auto">
          Create or join a joint account to manage shared household finances with family, housemates, or your partner.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          {onOpenCreateWorkspace && (
            <button
              type="button"
              onClick={onOpenCreateWorkspace}
              className="px-5 py-2.5 rounded-xl bg-[#60D36D] hover:bg-[#52c161] text-[#0A1A0F] text-xs font-bold shadow-xs cursor-pointer"
            >
              + Create Joint Account
            </button>
          )}
          {onOpenInvitations && (
            <button
              type="button"
              onClick={onOpenInvitations}
              className="px-5 py-2.5 rounded-xl bg-white dark:bg-[#111A14] border border-[#E5E1D8] dark:border-[#1E2C22] text-xs font-bold text-[#252923] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              Check Invitations
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentUserId = currentUser?.uid || '';
  const isOwner = activeJointWorkspace.ownerUid === currentUserId;
  const members = activeJointWorkspace.members || [];
  const currentRelMeta = getRelationshipMeta(relationship);
  const maxMembers = currentRelMeta.max;

  // Filter pending invitations specifically for this workspace from context or workspace doc
  const pendingWorkspaceInvites = (
    workspacePendingInvitations && workspacePendingInvitations.length > 0
      ? workspacePendingInvitations
      : (activeJointWorkspace as any)?.pendingInvitations || []
  ).filter(
    (inv: any) => inv && inv.jointWorkspaceId === activeJointWorkspace.id && inv.status === 'pending'
  );

  // Total occupied or reserved slots = active members + pending invitations
  const occupiedSlots = members.length;
  const reservedSlots = pendingWorkspaceInvites.length;
  const totalCommitted = occupiedSlots + reservedSlots;
  const availableSlots = Math.max(0, maxMembers - totalCommitted);
  const isAtCapacity = totalCommitted >= maxMembers;

  // Capacity percentage for progress bar
  const capacityPercent = Math.min(100, Math.round((occupiedSlots / maxMembers) * 100));

  // Handle relationship selection & capacity validation
  const handleSelectRelationship = async (newRelId: string) => {
    setIsRelationshipDropdownOpen(false);
    setIsRelationshipModalOpen(false);
    setRelationshipChangeError(null);

    const targetMeta = getRelationshipMeta(newRelId);
    const targetLimit = targetMeta.max;

    // RULE: Changing relationship type must never silently remove existing members.
    // If proposed relationship change violates member limit, prevent the change and explain why.
    if (totalCommitted > targetLimit) {
      const err = `Cannot switch to "${targetMeta.label}" (limit: ${targetLimit} members). This workspace currently has ${occupiedSlots} active member(s) and ${reservedSlots} pending invitation(s) (${totalCommitted} total slots). Please remove members or cancel pending invitations first.`;
      setRelationshipChangeError(err);
      showToast(err, 'error');
      return;
    }

    setRelationship(targetMeta.label);
    setIsUpdatingDetails(true);
    try {
      const ok = await updateJointWorkspace({
        name: workspaceName.trim() || activeJointWorkspace.name,
        relationship: targetMeta.label,
      });
      if (ok) {
        showToast(`Workspace relationship updated to ${targetMeta.label}!`, 'success');
      }
    } finally {
      setIsUpdatingDetails(false);
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setRelationshipChangeError(null);
    if (!workspaceName.trim()) {
      showToast('Workspace name cannot be empty', 'error');
      return;
    }
    setIsUpdatingDetails(true);
    try {
      const ok = await updateJointWorkspace({
        name: workspaceName.trim(),
        relationship,
      });
      if (ok) {
        showToast('Joint workspace details saved!', 'success');
      }
    } finally {
      setIsUpdatingDetails(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    if (isAtCapacity) {
      showToast(`Cannot invite: workspace is at full capacity (${maxMembers}/${maxMembers} members & reserved slots).`, 'error');
      return;
    }

    const emailToInvite = inviteEmail.trim().toLowerCase();
    if (currentUser?.email && emailToInvite === currentUser.email.toLowerCase()) {
      showToast('You cannot invite your own email address.', 'error');
      return;
    }

    // Check if member already in workspace
    if (members.some((m) => m.email.toLowerCase() === emailToInvite)) {
      showToast('This person is already a member of this workspace.', 'error');
      return;
    }

    // Check if already invited
    if (pendingWorkspaceInvites.some((p: JointInvitation) => p.inviteeEmail?.toLowerCase() === emailToInvite)) {
      showToast('An invitation has already been sent to this email.', 'error');
      return;
    }

    setIsSendingInvite(true);
    try {
      const ok = await invitePartnerToJoint(emailToInvite, inviteMessage.trim() || undefined);
      if (ok) {
        setInviteEmail('');
        setInviteMessage('');
        setIsInviteModalOpen(false);
        refreshJointData();
      }
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    setIsActionLoading(true);
    try {
      await revokeJointInvitation(invitationId);
      refreshJointData();
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    if (memberToRemove.role === 'owner') {
      showToast('Cannot remove the workspace owner without transferring ownership first.', 'error');
      return;
    }

    setIsActionLoading(true);
    try {
      const ok = await removeJointMember(memberToRemove.uid);
      if (ok) {
        setMemberToRemove(null);
        setActiveMemberMenuUid(null);
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!memberToTransfer) return;
    setIsActionLoading(true);
    try {
      const ok = await updateJointMemberRole(memberToTransfer.uid, 'owner');
      if (ok) {
        setMemberToTransfer(null);
        setActiveMemberMenuUid(null);
        showToast(`Workspace ownership transferred to ${memberToTransfer.displayName}!`, 'success');
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleMemberRole = async (member: JointMember) => {
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    setIsActionLoading(true);
    try {
      await updateJointMemberRole(member.uid, newRole);
      setActiveMemberMenuUid(null);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveJointWorkspace();
    } catch (err: any) {
      showToast(err?.message || 'Error leaving workspace', 'error');
    }
  };

  const currentThemeMode: ThemeMode =
    state.settings.themeMode || (state.settings.darkMode ? 'dark' : 'system');

  const focusInviteInput = () => {
    setIsInviteModalOpen(true);
    if (inviteInputRef.current) {
      inviteInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 space-y-6 text-[#252923] dark:text-[#E8EFE9]">
      {/* Dynamic Error Banner if Relationship Change Exceeds Limit */}
      {relationshipChangeError && (
        <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-700 dark:text-red-300 flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <div className="text-xs space-y-1">
            <p className="font-extrabold text-sm">Cannot Change Relationship Type</p>
            <p className="leading-relaxed">{relationshipChangeError}</p>
          </div>
          <button
            type="button"
            onClick={() => setRelationshipChangeError(null)}
            className="ml-auto text-red-400 hover:text-red-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Center Content (2 cols) and Right Panel (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* CENTER CONTENT (Cols 1-7 or 1-8 on desktop) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6 min-w-0">
          {/* 1. Workspace Details Card */}
          <div className="bg-[#FFFFFF] dark:bg-[#111A14] border border-[#E5E1D8] dark:border-[#1E2C22] rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#152319] dark:text-white tracking-tight">
                Workspace Details
              </h1>
              <p className="text-xs text-[#777D75] dark:text-[#8FA095] mt-0.5">
                Update the name and relationship label of this shared household
              </p>
            </div>

            <form onSubmit={handleSaveDetails} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Workspace Name Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#61685D] dark:text-[#8FA095]">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    disabled={!isOwner}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="e.g. Our Household"
                    className="w-full px-4 py-3 rounded-2xl border border-[#E0DCD3] dark:border-[#1E2D22] text-sm font-semibold text-[#152319] dark:text-white bg-white dark:bg-[#162219] focus:outline-none focus:ring-2 focus:ring-[#60D36D] transition-all disabled:opacity-60"
                  />
                </div>

                {/* Relationship Dropdown */}
                <div className="space-y-1.5 relative" ref={dropdownRef}>
                  <label className="block text-xs font-bold text-[#61685D] dark:text-[#8FA095]">
                    Relationship
                  </label>
                  <button
                    type="button"
                    disabled={!isOwner}
                    onClick={() => {
                      if (window.innerWidth < 640) {
                        setIsRelationshipModalOpen(true);
                      } else {
                        setIsRelationshipDropdownOpen(!isRelationshipDropdownOpen);
                      }
                    }}
                    className="w-full px-4 py-3 rounded-2xl border border-[#E0DCD3] dark:border-[#1E2D22] text-sm font-semibold text-[#152319] dark:text-white bg-white dark:bg-[#162219] flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#60D36D] transition-all disabled:opacity-60 text-left"
                  >
                    <span>{currentRelMeta.label}</span>
                    <ChevronDown className={`w-4 h-4 text-[#777D75] transition-transform ${isRelationshipDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Desktop Dropdown Menu matching Reference Image */}
                  {isRelationshipDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1.5 bg-[#FFFFFF] dark:bg-[#111A14] border border-[#E0DCD3] dark:border-[#223528] rounded-2xl shadow-xl overflow-hidden py-1.5 animate-fadeIn">
                      {RELATIONSHIP_CONFIGS.map((config) => {
                        const isSelected = currentRelMeta.id === config.id;
                        return (
                          <button
                            key={config.id}
                            type="button"
                            onClick={() => handleSelectRelationship(config.id)}
                            className={`w-full px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-semibold transition-colors cursor-pointer text-left ${
                              isSelected
                                ? 'bg-[#174F32]/10 dark:bg-[#1B3123] text-[#174F32] dark:text-[#60D36D]'
                                : 'text-[#252923] dark:text-[#E8EFE9] hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                          >
                            <span>{config.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#777D75] dark:text-[#8FA095]">
                                (Max {config.max})
                              </span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-[#174F32] dark:text-[#60D36D] stroke-[2.5]" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Capacity Info Box */}
              <div className="p-4 rounded-2xl bg-[#E8F3EC] dark:bg-[#142319] border border-[#C5E2D1] dark:border-[#1E3324] flex items-start sm:items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#174F32] text-[#60D36D] flex items-center justify-center shrink-0 shadow-xs">
                  <Users className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="text-xs space-y-0.5 min-w-0">
                  <p className="font-extrabold text-[#174F32] dark:text-[#83C95B] text-sm">
                    Up to {maxMembers} members can join this workspace
                  </p>
                  <p className="text-[#4E5C52] dark:text-[#9FB1A5] truncate">
                    {currentRelMeta.idealFor}
                  </p>
                </div>
              </div>

              {isOwner && (
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isUpdatingDetails}
                    className="px-5 py-2.5 rounded-xl bg-[#174F32] dark:bg-[#1E3D2A] hover:bg-[#123E27] dark:hover:bg-[#254d35] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isUpdatingDetails && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* 2. Members List Card */}
          <div className="bg-[#FFFFFF] dark:bg-[#111A14] border border-[#E5E1D8] dark:border-[#1E2C22] rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
            {/* Header with Title and Invite Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-[#152319] dark:text-white tracking-tight">
                  Members ({occupiedSlots} of {maxMembers})
                </h2>
                <p className="text-xs text-[#777D75] dark:text-[#8FA095] mt-0.5">
                  Active members collaborating in this shared vault
                </p>
              </div>

              {isOwner && (
                <button
                  type="button"
                  onClick={focusInviteInput}
                  disabled={isAtCapacity}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-extrabold transition-all cursor-pointer shadow-xs ${
                    isAtCapacity
                      ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                      : 'bg-[#60D36D] hover:bg-[#52c161] text-[#0A1A0F] active:scale-95'
                  }`}
                >
                  <UserPlus className="w-4 h-4 stroke-[2.3]" />
                  <span>+ Invite Member</span>
                </button>
              )}
            </div>

            {/* Capacity Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#777D75] dark:text-[#8FA095]">
                <span>Member Capacity</span>
                <span className="text-[#152319] dark:text-[#60D36D]">
                  {occupiedSlots} / {maxMembers} members
                  {reservedSlots > 0 && ` (+${reservedSlots} pending)`}
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-[#E5E1D8] dark:bg-[#1C2C22] overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-[#60D36D] transition-all duration-500 shadow-sm"
                  style={{ width: `${capacityPercent}%` }}
                />
              </div>
            </div>

            {/* Members Rows */}
            <div className="divide-y divide-[#E5E1D8]/60 dark:divide-[#1E2C22]">
              {members.map((member) => {
                const isMe = member.uid === currentUserId;
                const isMemberOwner = member.role === 'owner';
                const isMemberAdmin = member.role === 'admin';
                const isMenuOpen = activeMemberMenuUid === member.uid;

                return (
                  <div
                    key={member.uid}
                    className="py-3.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                  >
                    {/* Avatar & Info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-11 h-11 rounded-2xl text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs"
                        style={{ backgroundColor: member.avatarColor || '#174F32' }}
                      >
                        {member.displayName?.slice(0, 2).toUpperCase() || 'MB'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-extrabold text-[#152319] dark:text-white truncate">
                            {member.displayName || 'Member'}
                          </p>
                          {isMe && (
                            <span className="text-xs font-bold text-[#60D36D] dark:text-[#60D36D]">
                              (You)
                            </span>
                          )}
                          {isMemberOwner ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Crown className="w-3 h-3 text-amber-500" />
                              <span>Owner</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E5E1D8]/80 dark:bg-[#1A281E] text-[#555C52] dark:text-[#B4C4B9] border border-transparent dark:border-[#223528]">
                              <span>{isMemberAdmin ? 'Admin' : 'Member'}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#777D75] dark:text-[#8FA095] truncate mt-0.5">
                          {member.email}
                        </p>
                      </div>
                    </div>

                    {/* Joined Date & 3-Dot Actions */}
                    <div className="flex items-center gap-3 shrink-0 relative">
                      <span className="hidden sm:inline-block text-xs text-[#777D75] dark:text-[#8FA095]">
                        Joined {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                      </span>

                      {/* 3-Dot Action Button */}
                      <button
                        type="button"
                        onClick={() =>
                          setActiveMemberMenuUid(isMenuOpen ? null : member.uid)
                        }
                        className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[#777D75] dark:text-[#8FA095] cursor-pointer transition-colors"
                        title="Member actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Action Dropdown Menu */}
                      {isMenuOpen && (
                        <div className="absolute right-0 top-8 z-30 w-48 bg-[#FFFFFF] dark:bg-[#111A14] border border-[#E5E1D8] dark:border-[#223528] rounded-2xl shadow-xl overflow-hidden py-1.5 animate-fadeIn">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMemberForDetails(member);
                              setActiveMemberMenuUid(null);
                            }}
                            className="w-full px-4 py-2 text-xs font-semibold text-left text-[#252923] dark:text-[#E8EFE9] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                          >
                            <User className="w-3.5 h-3.5 text-[#777D75]" />
                            <span>View Details</span>
                          </button>

                          {isOwner && !isMe && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleMemberRole(member)}
                                className="w-full px-4 py-2 text-xs font-semibold text-left text-[#252923] dark:text-[#E8EFE9] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-[#60D36D]" />
                                <span>{isMemberAdmin ? 'Demote to Member' : 'Make Co-Admin'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setMemberToTransfer(member);
                                  setActiveMemberMenuUid(null);
                                }}
                                className="w-full px-4 py-2 text-xs font-semibold text-left text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 flex items-center gap-2 cursor-pointer"
                              >
                                <Crown className="w-3.5 h-3.5" />
                                <span>Transfer Ownership</span>
                              </button>

                              <div className="my-1 border-t border-[#E5E1D8]/60 dark:border-[#223528]" />

                              <button
                                type="button"
                                onClick={() => {
                                  setMemberToRemove(member);
                                  setActiveMemberMenuUid(null);
                                }}
                                className="w-full px-4 py-2 text-xs font-semibold text-left text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                                <span>Remove Member</span>
                              </button>
                            </>
                          )}

                          {isMe && !isMemberOwner && (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmLeave(true);
                                setActiveMemberMenuUid(null);
                              }}
                              className="w-full px-4 py-2 text-xs font-semibold text-left text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Leave Workspace</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Realtime Activity Timeline */}
          <div className="bg-[#FFFFFF] dark:bg-[#111A14] border border-[#E5E1D8] dark:border-[#1E2C22] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-[#152319] dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#174F32] dark:text-[#60D36D]" />
                  <span>Real-Time Activity Timeline</span>
                </h2>
                <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
                  Live record of additions, payments, and member changes across all workspace collaborators
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#60D36D]">
                <span className="w-2 h-2 rounded-full bg-[#60D36D] animate-pulse" />
                <span>Live Sync</span>
              </div>
            </div>

            {jointActivities.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#777D75]">
                No shared activities recorded yet. When members record transactions, settle bills, or buy groceries, they will appear here in real-time.
              </div>
            ) : (
              <div className="divide-y divide-[#E5E1D8]/60 dark:divide-[#1E2C22] max-h-72 overflow-y-auto">
                {jointActivities.slice(0, 15).map((act) => (
                  <div key={act.id} className="py-2.5 flex items-start justify-between gap-3 text-xs first:pt-0 last:pb-0">
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-semibold text-[#152319] dark:text-white truncate">
                        {act.description}
                      </p>
                      <p className="text-[10px] text-[#777D75]">
                        {new Date(act.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {act.amount !== undefined && (
                      <span className="font-black text-xs text-[#174F32] dark:text-[#60D36D] tabular-nums shrink-0">
                        {formatPeso(act.amount)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT PANEL: Invite Member & Pending Invitations */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Invite Member Card */}
          <div className="bg-[#FFFFFF] dark:bg-[#111A14] border border-[#E5E1D8] dark:border-[#1E2C22] rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#174F32]/10 dark:bg-[#1A2D20] text-[#174F32] dark:text-[#60D36D] flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#152319] dark:text-white">
                    Invite Member
                  </h2>
                  <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
                    Invite {currentRelMeta.label.toLowerCase()} members to join this workspace
                  </p>
                </div>
              </div>
            </div>

            {/* Relationship Info */}
            <div className="text-xs space-y-0.5 border-b border-[#E5E1D8]/60 dark:border-[#1E2C22] pb-3">
              <p className="font-bold text-[#152319] dark:text-[#E8EFE9]">
                Relationship: <span className="text-[#60D36D] font-black">{currentRelMeta.label}</span>
              </p>
              <p className="text-[#777D75] dark:text-[#8FA095]">
                Max members: <span className="font-semibold text-[#152319] dark:text-white">{maxMembers}</span>
              </p>
            </div>

            {/* Invite Form */}
            <form onSubmit={handleSendInvite} className="space-y-3.5">
              <div className="space-y-1">
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#777D75] absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    ref={inviteInputRef}
                    type="email"
                    value={inviteEmail}
                    disabled={isAtCapacity || isSendingInvite}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-[#E0DCD3] dark:border-[#1E2D22] text-xs sm:text-sm font-semibold text-[#152319] dark:text-white bg-white dark:bg-[#162219] focus:outline-none focus:ring-2 focus:ring-[#60D36D] transition-all disabled:opacity-60"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSendingInvite || isAtCapacity || !inviteEmail.trim()}
                className={`w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs ${
                  isAtCapacity
                    ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                    : 'bg-[#60D36D] hover:bg-[#52c161] text-[#0A1A0F] active:scale-[0.99]'
                }`}
              >
                {isSendingInvite ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#0A1A0F]" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                <span>{isAtCapacity ? 'Capacity Reached' : 'Send Invitation'}</span>
              </button>
            </form>

            {/* Pending Invitations Section */}
            <div className="space-y-3 pt-3 border-t border-[#E5E1D8]/60 dark:border-[#1E2C22]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#777D75] dark:text-[#8FA095]">
                  Pending Invitations ({pendingWorkspaceInvites.length})
                </h3>
              </div>

              {pendingWorkspaceInvites.length === 0 ? (
                <p className="text-xs text-[#777D75] py-1 italic">
                  No pending invitations for this workspace.
                </p>
              ) : (
                <div className="space-y-2">
                  {pendingWorkspaceInvites.map((inv: JointInvitation) => (
                    <div
                      key={inv.id}
                      className="p-3 rounded-2xl bg-[#F6F4EE] dark:bg-[#162219] border border-[#E5E1D8] dark:border-[#223528] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-[#152319] dark:text-white truncate">
                          {inv.inviteeEmail}
                        </p>
                        <p className="text-[11px] text-[#777D75] dark:text-[#8FA095]">
                          Invited {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Pending</span>
                        </span>

                        {isOwner && (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
                            title="Cancel invitation"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info Callout Banner matching Reference */}
            <div className="p-4 rounded-2xl bg-[#E0F2FE] dark:bg-[#0C2233] border border-[#BAE6FD] dark:border-[#153D5B] flex items-start gap-3">
              <Info className="w-5 h-5 text-[#0284C7] dark:text-[#38BDF8] shrink-0 mt-0.5" />
              <div className="text-xs text-[#0369A1] dark:text-[#BAE6FD] space-y-0.5">
                <p className="font-bold">
                  You can invite up to {availableSlots} more member{availableSlots === 1 ? '' : 's'}.
                </p>
                <p className="opacity-90">
                  {currentRelMeta.label} workspaces allow up to {maxMembers} total members. Each pending invitation reserves 1 member slot.
                </p>
              </div>
            </div>
          </div>

          {/* Relationship Types & Member Limits Reference Card (matches mockup) */}
          <div className="bg-[#FFFFFF] dark:bg-[#111A14] border border-[#E5E1D8] dark:border-[#1E2C22] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-[#152319] dark:text-white">
              Relationship Types & Member Limits
            </h3>
            <div className="space-y-3">
              {RELATIONSHIP_CONFIGS.map((rel) => (
                <div
                  key={rel.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#F8F9FA] dark:bg-[#162219] border border-[#E5E1D8]/60 dark:border-[#1E2C22]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{rel.icon}</span>
                    <div>
                      <p className="text-xs font-bold text-[#152319] dark:text-white">
                        {rel.label}
                      </p>
                      <p className="text-[11px] text-[#777D75] dark:text-[#8FA095]">
                        {rel.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#174F32] dark:text-[#60D36D] tabular-nums shrink-0">
                    Max {rel.max}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Offline Reminders & Danger Zone */}
          <div className="space-y-4">
            {/* Danger Zone: Leave Workspace */}
            <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-3xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-extrabold text-red-900 dark:text-red-200 flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span>Leave Workspace</span>
              </h3>
              <p className="text-[11px] text-red-700/80 dark:text-red-300/80">
                Leaving this workspace removes your access to shared accounts and bills. Your personal accounts and private data remain untouched.
              </p>
              {confirmLeave ? (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleLeave}
                    className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Confirm & Leave
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmLeave(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#1C2C23] border border-[#E5E1D8] dark:border-[#283C2F] text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmLeave(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#162219] border border-red-300 dark:border-red-800 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                >
                  Leave Workspace
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: Select Relationship (Mobile & Tablet) */}
      {/* ========================================================= */}
      {isRelationshipModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
        >
          <div className="relative w-full max-w-md bg-[#FFFFFF] dark:bg-[#111A14] rounded-3xl border border-[#E5E1D8] dark:border-[#223528] shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] dark:border-[#223528] pb-3">
              <h2 className="text-base font-extrabold text-[#152319] dark:text-white">
                Select Relationship
              </h2>
              <button
                type="button"
                onClick={() => setIsRelationshipModalOpen(false)}
                className="p-1.5 rounded-xl text-[#777D75] hover:text-[#252923] dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto">
              {RELATIONSHIP_CONFIGS.map((rel) => {
                const isSelected = currentRelMeta.id === rel.id;
                return (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => handleSelectRelationship(rel.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-start justify-between gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#174F32]/10 dark:bg-[#183023] border-[#174F32] dark:border-[#60D36D]'
                        : 'bg-[#F9FAF9] dark:bg-[#162219] border-[#E5E1D8] dark:border-[#223528] hover:border-[#60D36D]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5">{rel.icon}</span>
                      <div className="space-y-0.5">
                        <p className="text-sm font-extrabold text-[#152319] dark:text-white">
                          {rel.label}
                        </p>
                        <p className="text-xs font-bold text-[#60D36D]">
                          Max {rel.max} members
                        </p>
                        <p className="text-[11px] text-[#777D75] dark:text-[#8FA095]">
                          {rel.description}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                        isSelected
                          ? 'border-[#60D36D] bg-[#60D36D]'
                          : 'border-[#777D75] dark:border-[#35493B]'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-[#0A1A0F]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: View Member Details */}
      {/* ========================================================= */}
      {selectedMemberForDetails && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
        >
          <div className="relative w-full max-w-sm bg-[#FFFFFF] dark:bg-[#111A14] rounded-3xl border border-[#E5E1D8] dark:border-[#223528] shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] dark:border-[#223528] pb-3">
              <h2 className="text-sm font-extrabold text-[#152319] dark:text-white">
                Member Profile
              </h2>
              <button
                type="button"
                onClick={() => setSelectedMemberForDetails(null)}
                className="p-1 rounded-xl text-[#777D75] hover:text-[#252923] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-2 py-2">
              <div
                className="w-16 h-16 mx-auto rounded-3xl text-white font-black text-xl flex items-center justify-center shadow-xs"
                style={{ backgroundColor: selectedMemberForDetails.avatarColor || '#174F32' }}
              >
                {selectedMemberForDetails.displayName?.slice(0, 2).toUpperCase() || 'MB'}
              </div>
              <h3 className="text-base font-black text-[#152319] dark:text-white">
                {selectedMemberForDetails.displayName}
              </h3>
              <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
                {selectedMemberForDetails.email}
              </p>
              <div className="pt-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#174F32]/10 dark:bg-[#1B3123] text-[#174F32] dark:text-[#60D36D] capitalize">
                  Role: {selectedMemberForDetails.role}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F6F4EE] dark:bg-[#162219] text-xs text-[#777D75] dark:text-[#8FA095] space-y-1.5">
              <p>
                <span className="font-bold text-[#152319] dark:text-white">Joined: </span>
                {selectedMemberForDetails.joinedAt ? new Date(selectedMemberForDetails.joinedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recently'}
              </p>
              <p>
                <span className="font-bold text-[#152319] dark:text-white">Workspace: </span>
                {activeJointWorkspace.name} ({activeJointWorkspace.relationship})
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedMemberForDetails(null)}
              className="w-full py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Confirm Remove Member */}
      {/* ========================================================= */}
      {memberToRemove && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
        >
          <div className="relative w-full max-w-sm bg-[#FFFFFF] dark:bg-[#111A14] rounded-3xl border border-red-200 dark:border-red-900/40 shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/15 flex items-center justify-center">
                <UserMinus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold">Remove Member?</h3>
                <p className="text-xs text-[#777D75]">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-[#61685D] dark:text-[#A0AFA5] leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-[#152319] dark:text-white">{memberToRemove.displayName}</span> ({memberToRemove.email}) from <span className="font-bold text-[#152319] dark:text-white">{activeJointWorkspace.name}</span>?
            </p>

            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300">
              🛡️ Their personal account, private transactions, and personal wallet will remain completely intact and unaffected.
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isActionLoading}
                onClick={handleRemoveMember}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Remove Member</span>
              </button>
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Confirm Transfer Ownership */}
      {/* ========================================================= */}
      {memberToTransfer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
        >
          <div className="relative w-full max-w-sm bg-[#FFFFFF] dark:bg-[#111A14] rounded-3xl border border-amber-200 dark:border-amber-900/40 shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold">Transfer Ownership</h3>
                <p className="text-xs text-[#777D75]">Grant primary control</p>
              </div>
            </div>

            <p className="text-xs text-[#61685D] dark:text-[#A0AFA5] leading-relaxed">
              Transfer workspace ownership to <span className="font-bold text-[#152319] dark:text-white">{memberToTransfer.displayName}</span>? You will remain a member with standard privileges.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isActionLoading}
                onClick={handleTransferOwnership}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Transfer</span>
              </button>
              <button
                type="button"
                onClick={() => setMemberToTransfer(null)}
                className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Invite Member Dialog */}
      {/* ========================================================= */}
      {isInviteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
        >
          <div className="relative w-full max-w-md bg-[#FFFFFF] dark:bg-[#111A14] rounded-3xl border border-[#E5E1D8] dark:border-[#223528] shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] dark:border-[#223528] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#174F32]/10 dark:bg-[#1A2D20] text-[#174F32] dark:text-[#60D36D] flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#152319] dark:text-white">
                    Invite Member
                  </h2>
                  <p className="text-xs text-[#777D75] dark:text-[#8FA095]">
                    Invite {currentRelMeta.label.toLowerCase()} members to join
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1.5 rounded-xl text-[#777D75] hover:text-[#252923] dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Capacity Info Banner */}
            <div className="p-3.5 rounded-2xl bg-[#E0F2FE] dark:bg-[#0C2233] border border-[#BAE6FD] dark:border-[#153D5B] flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8] shrink-0 mt-0.5" />
              <div className="text-xs text-[#0369A1] dark:text-[#BAE6FD] space-y-0.5">
                <p className="font-bold">
                  {isAtCapacity
                    ? `Workspace is at maximum capacity (${occupiedSlots}/${maxMembers} members).`
                    : `You can invite up to ${availableSlots} more member${availableSlots === 1 ? '' : 's'}.`}
                </p>
                <p className="opacity-90">
                  {currentRelMeta.label} workspaces allow up to {maxMembers} members total.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#61685D] dark:text-[#8FA095]">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#777D75] absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    autoFocus
                    value={inviteEmail}
                    disabled={isAtCapacity || isSendingInvite}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-[#E0DCD3] dark:border-[#1E2D22] text-xs sm:text-sm font-semibold text-[#152319] dark:text-white bg-white dark:bg-[#162219] focus:outline-none focus:ring-2 focus:ring-[#60D36D] transition-all disabled:opacity-60"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#61685D] dark:text-[#8FA095]">
                  Personal Note (Optional)
                </label>
                <input
                  type="text"
                  value={inviteMessage}
                  disabled={isAtCapacity || isSendingInvite}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="e.g. Join our family household vault on PesoTrack!"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#E0DCD3] dark:border-[#1E2D22] text-xs font-semibold text-[#152319] dark:text-white bg-white dark:bg-[#162219] focus:outline-none focus:ring-2 focus:ring-[#60D36D] transition-all disabled:opacity-60"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSendingInvite || isAtCapacity || !inviteEmail.trim()}
                  className={`flex-1 py-3 px-4 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs ${
                    isAtCapacity
                      ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                      : 'bg-[#60D36D] hover:bg-[#52c161] text-[#0A1A0F] active:scale-[0.99]'
                  }`}
                >
                  {isSendingInvite ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#0A1A0F]" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  <span>{isAtCapacity ? 'Capacity Reached' : 'Send Invitation'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-3 rounded-2xl bg-black/5 dark:bg-white/10 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
