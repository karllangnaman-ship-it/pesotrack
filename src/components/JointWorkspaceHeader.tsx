import React from 'react';
import {
  Bell,
  CheckCircle2,
  Lock,
  Mail,
  RefreshCw,
  Settings,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  WifiOff,
} from 'lucide-react';
import { JointWorkspace, JointMember } from '../types/finance';

interface JointWorkspaceHeaderProps {
  workspace: JointWorkspace;
  currentUserId: string;
  isOnline: boolean;
  pendingMutationCount: number;
  lastSyncTime: string | null;
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  onInviteMember: () => void;
}

export const JointWorkspaceHeader: React.FC<JointWorkspaceHeaderProps> = ({
  workspace,
  currentUserId,
  isOnline,
  pendingMutationCount,
  lastSyncTime,
  unreadCount,
  onOpenNotifications,
  onOpenSettings,
  onInviteMember,
}) => {
  const members = workspace.members || [];
  const currentMember = members.find((m) => m.uid === currentUserId);
  const otherMembers = members.filter((m) => m.uid !== currentUserId);
  const isFullyJoined = members.length >= 2;

  // Format sync time
  const formatSyncTime = (timeStr: string | null) => {
    if (!timeStr) return 'Synced';
    try {
      const d = new Date(timeStr);
      return `Synced ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return 'Synced';
    }
  };

  return (
    <div className="w-full bg-[#112419] border border-[#1E3B2B] rounded-3xl p-4 sm:p-5 shadow-lg text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Brand identity, workspace name, relationship, member count */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[#1A3827] border border-[#2B543C] text-[#86EFAC] flex items-center justify-center shadow-xs shrink-0">
            <Users className="w-6 h-6 stroke-[2.2]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                {workspace.name || 'Shared Household'}
              </h1>

              {workspace.relationship && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#1E3B2B] text-[#86EFAC] border border-[#2D583F] uppercase tracking-wider shrink-0">
                  {workspace.relationship}
                </span>
              )}

              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#14291D] text-[#8FA095] border border-[#1E3827] shrink-0">
                {isFullyJoined ? `${members.length} Members` : '1 Member • Waiting for Partner'}
              </span>
            </div>

            {/* Member Presence & Avatars */}
            <div className="flex items-center gap-2.5 pt-1.5 flex-wrap">
              <div className="flex -space-x-2 items-center">
                {members.map((m) => (
                  <div
                    key={m.uid}
                    title={`${m.displayName} (${m.role})`}
                    className="w-7 h-7 rounded-full text-white text-[11px] font-black flex items-center justify-center border-2 border-[#112419] shadow-xs cursor-default"
                    style={{ backgroundColor: m.avatarColor || '#1E3B2B' }}
                  >
                    {m.displayName ? m.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                ))}
              </div>

              <span className="text-xs text-[#9BB1A3]">
                {isFullyJoined
                  ? `Collaborating with ${otherMembers.map((m) => m.displayName).join(', ')}`
                  : 'Invite your partner or roommate to join this workspace'}
              </span>

              {!isFullyJoined && (
                <button
                  type="button"
                  onClick={onInviteMember}
                  className="inline-flex items-center gap-1 text-xs font-black text-[#86EFAC] hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Invite Partner</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Synchronization Status, Notification Bell, and Settings */}
        <div className="flex items-center gap-2 sm:gap-2.5 self-start md:self-center flex-wrap shrink-0">
          {/* Real Synchronization Status Pill */}
          {!isOnline ? (
            <div
              title="You are offline. Offline changes are queued and will automatically sync when connected."
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25"
            >
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span>Offline ({pendingMutationCount} queued)</span>
            </div>
          ) : pendingMutationCount > 0 ? (
            <div
              title="Synchronizing local changes with household cloud Firestore..."
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/25"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
              <span>Syncing ({pendingMutationCount})...</span>
            </div>
          ) : (
            <div
              title={lastSyncTime ? `Last synced: ${new Date(lastSyncTime).toLocaleString()}` : 'Connected and synced'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-[#86EFAC] border border-emerald-500/25"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{formatSyncTime(lastSyncTime)}</span>
            </div>
          )}

          {/* Notification Bell with Badge */}
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label="Open notifications"
            className="relative p-2 rounded-xl bg-[#1A3827] hover:bg-[#234A34] border border-[#2B543C] text-white transition-colors cursor-pointer flex items-center justify-center min-h-[38px] min-w-[38px]"
          >
            <Bell className="w-4 h-4 text-[#86EFAC]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Invite Member Button (visible on md+) */}
          {!isFullyJoined && (
            <button
              type="button"
              onClick={onInviteMember}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-colors cursor-pointer min-h-[38px] shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite</span>
            </button>
          )}

          {/* Workspace Settings */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A3827] hover:bg-[#234A34] border border-[#2B543C] text-xs font-bold text-white transition-colors cursor-pointer min-h-[38px]"
          >
            <Settings className="w-3.5 h-3.5 text-[#8FA095]" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
