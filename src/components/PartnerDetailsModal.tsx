import React from 'react';
import {
  Bell,
  BellOff,
  ChevronRight,
  FileText,
  Home,
  Image as ImageIcon,
  MessageSquare,
  Phone,
  Receipt,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { JointMember, JointWorkspace } from '../types/finance';

export interface PartnerDetailsPanelProps {
  workspace: JointWorkspace | null;
  partner: JointMember | null;
  onRingPartner: () => void;
  onVideoCall?: () => void;
  onMessageClick?: () => void;
  onClose?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onClearChat?: () => void;
  cooldownSeconds?: number;
  stats?: {
    accountsCount: number;
    billsCount: number;
    groceriesCount: number;
    messagesCount: number;
  };
  textSize?: 'small' | 'medium' | 'large';
  onChangeTextSize?: (size: 'small' | 'medium' | 'large') => void;
  mediaCounts?: {
    images: number;
    files: number;
    links: number;
    latestImageUrl?: string;
  };
  onOpenMediaBrowser?: (tab?: 'images' | 'files' | 'links') => void;
  sharedMedia?: {
    id: string;
    url?: string;
    title: string;
    type: 'receipt' | 'photo' | 'doc';
  }[];
  onSelectMedia?: (item: any) => void;
}

export const PartnerDetailsContent: React.FC<PartnerDetailsPanelProps> = ({
  workspace,
  partner,
  onRingPartner,
  onVideoCall,
  onMessageClick,
  onClose,
  isMuted = false,
  onToggleMute,
  onClearChat,
  cooldownSeconds = 0,
  textSize = 'medium',
  onChangeTextSize,
  mediaCounts = { images: 0, files: 0, links: 0 },
  onOpenMediaBrowser,
}) => {
  if (!partner) return null;

  const partnerName = partner.displayName || partner.email?.split('@')[0] || 'Partner';
  const partnerInitial = partnerName.charAt(0).toUpperCase();
  const joinedDateFormatted = partner.joinedAt
    ? new Date(partner.joinedAt).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Oct 22, 2026';

  const totalMediaCount = mediaCounts.images + mediaCounts.files + mediaCounts.links;

  return (
    <div className="flex flex-col h-full bg-[#0D1611] text-[#F3F4F1] border-l border-[#1A2A20] select-none overflow-y-auto">
      {/* 1. Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A2A20] shrink-0">
        <h3 className="text-base font-bold text-white tracking-tight">
          Partner Details
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Collapse partner details"
            className="p-1.5 rounded-xl text-[#8FA095] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-5 space-y-6 flex-1 min-h-0 overflow-y-auto">
        {/* 2. Partner Avatar & Identity */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="relative">
            <div
              style={{ backgroundColor: partner.avatarColor || '#174F32' }}
              className="w-20 h-20 rounded-full text-white font-extrabold text-2xl flex items-center justify-center shadow-lg border-2 border-[#1E382A]"
            >
              {partnerInitial}
            </div>
            {/* Green Online Dot */}
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#22C55E] border-2 border-[#0D1611]" />
          </div>

          <div className="space-y-0.5">
            <h4 className="text-lg font-bold text-white">
              {partnerName}
            </h4>
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#22C55E] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              <span>Online</span>
            </div>
          </div>

          {/* Quick Action Circles: Message, Ring, Video Call */}
          <div className="flex items-center justify-center gap-6 pt-3">
            {/* Message */}
            <button
              type="button"
              onClick={onMessageClick}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-[#16251C] border border-[#23382A] text-white flex items-center justify-center group-hover:bg-[#1E3325] transition-colors">
                <MessageSquare className="w-4.5 h-4.5 text-[#86EFAC]" />
              </div>
              <span className="text-[11px] text-[#8FA095] group-hover:text-white font-medium">
                Message
              </span>
            </button>

            {/* Ring */}
            <button
              type="button"
              onClick={onRingPartner}
              disabled={cooldownSeconds > 0}
              className="flex flex-col items-center gap-1.5 group cursor-pointer disabled:opacity-50"
            >
              <div className="w-11 h-11 rounded-full bg-[#16251C] border border-[#23382A] text-white flex items-center justify-center group-hover:bg-[#1E3325] transition-colors">
                <Phone className="w-4.5 h-4.5 text-[#86EFAC]" />
              </div>
              <span className="text-[11px] text-[#8FA095] group-hover:text-white font-medium">
                {cooldownSeconds > 0 ? `${cooldownSeconds}s` : 'Ring'}
              </span>
            </button>

            {/* Video Call */}
            <button
              type="button"
              onClick={onVideoCall}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-[#16251C] border border-[#23382A] text-white flex items-center justify-center group-hover:bg-[#1E3325] transition-colors">
                <Video className="w-4.5 h-4.5 text-[#86EFAC]" />
              </div>
              <span className="text-[11px] text-[#8FA095] group-hover:text-white font-medium">
                Video Call
              </span>
            </button>
          </div>
        </div>

        {/* 3. About Section */}
        <div className="space-y-1.5 pt-2">
          <div className="text-[11px] font-bold text-[#8FA095] uppercase tracking-wider">
            About
          </div>
          <div className="text-xs text-white font-medium">
            Partner • {partner.role === 'owner' ? 'Admin' : 'Member'}
          </div>
          <div className="text-[11px] text-[#8FA095]">
            Joined {joinedDateFormatted}
          </div>
        </div>

        {/* 4. Shared Workspace Section */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-bold text-[#8FA095] uppercase tracking-wider">
            Shared Workspace
          </div>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#142218] border border-[#1E3224]">
            <div className="w-9 h-9 rounded-xl bg-[#1E3B2B] text-[#86EFAC] flex items-center justify-center shrink-0">
              <Home className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {workspace?.name || 'Our Household'}
              </div>
              <div className="text-[11px] text-[#8FA095] truncate">
                2 members • {workspace?.relationship || 'Family'}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Media, Links and Files Section (Messenger Layout) */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8FA095] uppercase tracking-wider">
              Media, Links and Files
            </span>
            <button
              type="button"
              onClick={() => onOpenMediaBrowser?.('images')}
              className="text-xs text-[#22C55E] hover:underline font-semibold cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {/* Tile 1: Images */}
            <button
              type="button"
              onClick={() => onOpenMediaBrowser?.('images')}
              className="aspect-square rounded-2xl bg-[#142319] border border-[#203627] flex flex-col items-center justify-center p-1.5 hover:border-emerald-500 hover:bg-[#182C20] transition-all cursor-pointer text-center group relative overflow-hidden"
            >
              {mediaCounts.latestImageUrl ? (
                <>
                  <img
                    src={mediaCounts.latestImageUrl}
                    alt="Latest shared photo"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-1">
                    <ImageIcon className="w-4 h-4 text-emerald-400 mb-0.5" />
                    <span className="text-[10px] text-white font-bold">{mediaCounts.images}</span>
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform mb-1" />
                  <span className="text-[10px] font-bold text-white">Images</span>
                  <span className="text-[9px] text-[#8FA095]">({mediaCounts.images})</span>
                </>
              )}
            </button>

            {/* Tile 2: Files */}
            <button
              type="button"
              onClick={() => onOpenMediaBrowser?.('files')}
              className="aspect-square rounded-2xl bg-[#142319] border border-[#203627] flex flex-col items-center justify-center p-1.5 hover:border-emerald-500 hover:bg-[#182C20] transition-all cursor-pointer text-center group"
            >
              <FileText className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform mb-1" />
              <span className="text-[10px] font-bold text-white">Files</span>
              <span className="text-[9px] text-[#8FA095]">({mediaCounts.files})</span>
            </button>

            {/* Tile 3: Links */}
            <button
              type="button"
              onClick={() => onOpenMediaBrowser?.('links')}
              className="aspect-square rounded-2xl bg-[#142319] border border-[#203627] flex flex-col items-center justify-center p-1.5 hover:border-emerald-500 hover:bg-[#182C20] transition-all cursor-pointer text-center group"
            >
              <FileText className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform mb-1" />
              <span className="text-[10px] font-bold text-white">Links</span>
              <span className="text-[9px] text-[#8FA095]">({mediaCounts.links})</span>
            </button>

            {/* Tile 4: View All (+Count) */}
            <button
              type="button"
              onClick={() => onOpenMediaBrowser?.('images')}
              className="aspect-square rounded-2xl bg-[#1A2C20] border border-[#223628] flex flex-col items-center justify-center p-1.5 hover:bg-[#203628] hover:border-emerald-500 transition-all cursor-pointer text-center group"
            >
              <span className="text-sm font-black text-[#86EFAC] group-hover:scale-110 transition-transform">
                {totalMediaCount > 0 ? `+${totalMediaCount}` : '0'}
              </span>
              <span className="text-[9px] text-[#8FA095]">View all</span>
            </button>
          </div>
        </div>

        {/* 6. Chat Settings Section */}
        <div className="space-y-3 pt-2 border-t border-[#1A2A20]">
          <div className="text-[11px] font-bold text-[#8FA095] uppercase tracking-wider mb-1">
            Chat Settings
          </div>

          {/* Message Text Size Setting */}
          <div className="p-3 rounded-2xl bg-[#142319] border border-[#1E3424] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#E5E7EB]">Message Text Size</span>
              <span className="text-[11px] font-bold text-[#86EFAC] capitalize">{textSize}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 bg-[#0E1812] p-1 rounded-xl border border-white/5">
              {(['small', 'medium', 'large'] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onChangeTextSize?.(sz)}
                  className={`py-1 text-xs font-bold rounded-lg transition-all capitalize cursor-pointer ${
                    textSize === sz
                      ? 'bg-[#174F32] text-white shadow-xs'
                      : 'text-[#8FA095] hover:text-white'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications Setting */}
          <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-[#8FA095]" />
              <span className="text-xs text-[#E5E7EB]">Notifications</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#8FA095]">
              <span>All messages</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Mute Chat Switch */}
          <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2.5">
              <BellOff className="w-4 h-4 text-[#8FA095]" />
              <span className="text-xs text-[#E5E7EB]">Mute Chat</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isMuted}
              onClick={onToggleMute}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                isMuted ? 'bg-[#22C55E]' : 'bg-[#25392C]'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  isMuted ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Clear Chat */}
          <button
            type="button"
            onClick={onClearChat}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Clear Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export interface PartnerDetailsModalProps extends PartnerDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PartnerDetailsModal: React.FC<PartnerDetailsModalProps> = ({
  isOpen,
  onClose,
  ...panelProps
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="partner-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn"
    >
      <div className="relative w-full max-w-sm max-h-[90vh] rounded-3xl bg-[#0D1611] border border-[#1E382A] shadow-2xl overflow-hidden flex flex-col">
        <PartnerDetailsContent {...panelProps} onClose={onClose} />
      </div>
    </div>
  );
};
