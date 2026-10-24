import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Menu,
  Mic,
  MoreVertical,
  Phone,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Smile,
  SquarePen,
  Trash2,
  Undo2,
  Video,
  WifiOff,
  X,
  Receipt,
  ShoppingCart,
  Lightbulb,
  Zap,
  ZoomIn,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { ChatTextSize, JointMember, JointMessage } from '../types/finance';
import { RingPartnerConfirmModal } from '../components/RingPartnerConfirmModal';
import { PartnerDetailsContent, PartnerDetailsModal } from '../components/PartnerDetailsModal';
import { IncomingRingModal } from '../components/IncomingRingModal';
import { ClearChatModal } from '../components/ClearChatModal';
import { UnsendConfirmModal } from '../components/UnsendConfirmModal';
import { FullscreenImageViewer } from '../components/FullscreenImageViewer';
import { MediaBrowserModal } from '../components/MediaBrowserModal';
import { compressImageFile } from '../services/jointChatService';

interface JointChatPageProps {
  onBackToOverview?: () => void;
  onOpenMobileMenu?: () => void;
}

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

export const JointChatPage: React.FC<JointChatPageProps> = ({
  onBackToOverview,
  onOpenMobileMenu,
}) => {
  const {
    currentUser,
    activeJointWorkspace,
    jointMessages,
    jointUnreadMessagesCount,
    sendJointChatMessage,
    retryJointMessage,
    markJointMessagesAsRead,
    ringPartner,
    activeIncomingRing,
    respondToIncomingRing,
    jointAccounts,
    jointBills,
    jointGroceryItems,
    isOnline,
    showToast,
    clearJointChat,
    deleteJointMessageForMe,
    unsendJointMessage,
  } = useFinance();

  // Mobile navigation view: 'list' (conversation list) | 'chat' (active chat thread)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('chat');

  // Desktop Details Panel collapse state
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pesotrack_chat_details_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Modals & Popovers
  const [isMobileDetailsOpen, setIsMobileDetailsOpen] = useState(false);
  const [isRingConfirmOpen, setIsRingConfirmOpen] = useState(false);
  const [isClearChatModalOpen, setIsClearChatModalOpen] = useState(false);
  const [unsendMessageTarget, setUnsendMessageTarget] = useState<JointMessage | null>(null);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<JointMessage | null>(null);

  // Fullscreen Image Viewer State
  const [fullscreenImage, setFullscreenImage] = useState<{
    isOpen: boolean;
    url: string | null;
    name?: string;
    senderName?: string;
    timestamp?: string;
  }>({
    isOpen: false,
    url: null,
  });

  // Media, Links & Files Browser State
  const [isMediaBrowserOpen, setIsMediaBrowserOpen] = useState(false);
  const [mediaBrowserTab, setMediaBrowserTab] = useState<'images' | 'files' | 'links'>('images');

  // Customizable Text Size: small (12.5px), medium (13.5px), large (15px)
  const [chatTextSize, setChatTextSize] = useState<ChatTextSize>(() => {
    try {
      const stored = localStorage.getItem('pesotrack_chat_text_size') as ChatTextSize;
      if (stored === 'small' || stored === 'medium' || stored === 'large') {
        return stored;
      }
      return 'medium';
    } catch {
      return 'medium';
    }
  });

  const handleChangeTextSize = (size: ChatTextSize) => {
    setChatTextSize(size);
    try {
      localStorage.setItem('pesotrack_chat_text_size', size);
    } catch {}
  };

  // Temporary Highlight for Jumped Message
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const [ringCooldown, setRingCooldown] = useState(0);
  const [isRingingLoading, setIsRingingLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{ url: string; name: string; fileSize?: number } | null>(null);

  // Mute state (persisted in localStorage)
  const [isChatMuted, setIsChatMuted] = useState<boolean>(() => {
    try {
      if (!activeJointWorkspace) return false;
      return localStorage.getItem(`pesotrack_chat_muted_${activeJointWorkspace.id}`) === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleMute = () => {
    if (!activeJointWorkspace) return;
    const next = !isChatMuted;
    setIsChatMuted(next);
    try {
      localStorage.setItem(`pesotrack_chat_muted_${activeJointWorkspace.id}`, String(next));
    } catch {}
    showToast(next ? 'Chat muted' : 'Chat unmuted', 'info');
  };

  // Draft text persistence
  const [inputText, setInputText] = useState<string>(() => {
    try {
      if (!activeJointWorkspace) return '';
      return localStorage.getItem(`pesotrack_chat_draft_${activeJointWorkspace.id}`) || '';
    } catch {
      return '';
    }
  });
  const [isSending, setIsSending] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialScrollDoneRef = useRef(false);
  const previousMessageCountRef = useRef(jointMessages.length);

  // Identify partner member in 2-person joint workspace
  const partnerMember: JointMember | null = useMemo(() => {
    if (!activeJointWorkspace?.members) return null;
    return (
      activeJointWorkspace.members.find(
        (m) => m.uid !== currentUser?.uid && m.email?.toLowerCase() !== currentUser?.email?.toLowerCase()
      ) || null
    );
  }, [activeJointWorkspace, currentUser]);

  const partnerName = partnerMember?.displayName || partnerMember?.email?.split('@')[0] || 'Partner';
  const partnerAvatarColor = partnerMember?.avatarColor || '#174F32';
  const partnerInitial = partnerName.charAt(0).toUpperCase();

  // Save draft on edit
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    if (activeJointWorkspace) {
      try {
        localStorage.setItem(`pesotrack_chat_draft_${activeJointWorkspace.id}`, val);
      } catch {}
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // Ring Cooldown Timer countdown
  useEffect(() => {
    if (ringCooldown <= 0) return;
    const interval = setInterval(() => {
      setRingCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [ringCooldown]);

  // Mark unread messages sent by partner as read when viewing conversation
  useEffect(() => {
    if (!activeJointWorkspace || !currentUser) return;
    markJointMessagesAsRead();
  }, [activeJointWorkspace?.id, currentUser?.uid, jointMessages.length, markJointMessagesAsRead]);

  // Scroll to bottom helper
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  // Initial scroll to bottom when opening thread
  useEffect(() => {
    if (jointMessages.length > 0 && !initialScrollDoneRef.current) {
      scrollToBottom(false);
      initialScrollDoneRef.current = true;
    }
  }, [jointMessages.length]);

  // Subsequent scroll handling when new messages arrive
  useEffect(() => {
    const container = chatScrollContainerRef.current;
    if (!container) return;

    const countChanged = jointMessages.length !== previousMessageCountRef.current;
    previousMessageCountRef.current = jointMessages.length;

    if (countChanged) {
      const lastMsg = jointMessages[jointMessages.length - 1];
      const isSentByMe = lastMsg && lastMsg.senderUid === currentUser?.uid;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 160;

      // Only scroll down automatically if user is near bottom or user just sent a message
      if (isSentByMe || isNearBottom) {
        scrollToBottom(true);
      }
    }
  }, [jointMessages, currentUser?.uid]);

  const handleScroll = () => {
    const container = chatScrollContainerRef.current;
    if (!container) return;
    const isFarFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight > 220;
    setShowScrollBottom(isFarFromBottom);
  };

  // Close context menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.message-action-menu') && !target.closest('.message-action-trigger')) {
        setActiveMenuMessageId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Media counts for Media Browser & Details drawer
  const mediaCounts = useMemo(() => {
    let imagesCount = 0;
    let filesCount = 0;
    let linksCount = 0;
    let latestImageUrl: string | undefined;

    jointMessages.forEach((msg) => {
      if (msg.isUnsent) return;

      if (msg.mediaUrl) {
        if (msg.mediaType === 'file') {
          filesCount += 1;
        } else {
          imagesCount += 1;
          if (!latestImageUrl) {
            latestImageUrl = msg.mediaUrl;
          }
        }
      }

      if (msg.text) {
        const matches = msg.text.match(URL_REGEX);
        if (matches) {
          linksCount += matches.length;
        }
      }
    });

    return { images: imagesCount, files: filesCount, links: linksCount, latestImageUrl };
  }, [jointMessages]);

  // Dynamic CSS classes based on selected text size
  const textSizeClass = useMemo(() => {
    switch (chatTextSize) {
      case 'small':
        return 'text-[12.5px] leading-[1.35]';
      case 'large':
        return 'text-[15px] leading-[1.45]';
      case 'medium':
      default:
        return 'text-[13.5px] leading-[1.4]';
    }
  }, [chatTextSize]);

  // Jump smoothly to a specific message and flash highlight
  const handleJumpToOriginal = (targetMessageId?: string, quoteSnippet?: string) => {
    let targetMsg: JointMessage | undefined;
    if (targetMessageId) {
      targetMsg = jointMessages.find((m) => m.id === targetMessageId);
    }
    if (!targetMsg && quoteSnippet) {
      targetMsg = jointMessages.find((m) => m.text && m.text.includes(quoteSnippet));
    }

    if (targetMsg) {
      const el = document.getElementById(`msg-${targetMsg.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMessageId(targetMsg.id);
        setTimeout(() => {
          setHighlightedMessageId((curr) => (curr === targetMsg?.id ? null : curr));
        }, 2500);
      } else {
        showToast('Original message not found in view.', 'info');
      }
    } else {
      showToast('Original message no longer available.', 'info');
    }
  };

  // Helper to parse message content and extract reply info (both structured and legacy prefix)
  const parseMessageContent = (msg: JointMessage) => {
    // 1. Structured reply info
    if (msg.replyToSenderName || msg.replyToPreview) {
      return {
        replyInfo: {
          senderName: msg.replyToSenderName || 'Partner',
          text: msg.replyToPreview || '',
          targetId: msg.replyToMessageId,
        },
        cleanText: msg.text || '',
      };
    }

    // 2. Legacy prefix format: > [Replying to Try: "1"]\nActual message
    if (msg.text && msg.text.startsWith('> [Replying to ')) {
      const match = msg.text.match(/^>\s*\[Replying to ([^:]+):\s*"([^"]*)"\]\s*\n?([\s\S]*)$/);
      if (match) {
        return {
          replyInfo: {
            senderName: match[1],
            text: match[2],
            targetId: undefined,
          },
          cleanText: match[3],
        };
      }
    }

    return {
      replyInfo: null,
      cleanText: msg.text || '',
    };
  };

  // Send message handler (persists pure text without raw prefixes and sends structured reply metadata)
  const handleSend = async () => {
    const trimmed = inputText.trim();
    if ((!trimmed && !mediaPreview) || isSending) return;

    if (!partnerMember) {
      showToast('Invite your partner to start chatting in this joint vault.', 'info');
      return;
    }

    setIsSending(true);
    const mediaToSend = mediaPreview
      ? {
          mediaUrl: mediaPreview.url,
          mediaType: 'image' as const,
          mediaName: mediaPreview.name,
          fileSize: mediaPreview.fileSize,
        }
      : undefined;

    const replyToSend = replyingToMessage
      ? {
          id: replyingToMessage.id,
          senderName: replyingToMessage.senderName,
          text: replyingToMessage.text
            ? (replyingToMessage.text.length > 50 ? `${replyingToMessage.text.slice(0, 47)}...` : replyingToMessage.text)
            : 'Photo attachment',
        }
      : undefined;

    // Clear input, reply draft and preview immediately for snappy feel
    const draftMedia = mediaPreview;
    setInputText('');
    setMediaPreview(null);
    setReplyingToMessage(null);

    if (activeJointWorkspace) {
      try {
        localStorage.removeItem(`pesotrack_chat_draft_${activeJointWorkspace.id}`);
      } catch {}
    }

    try {
      await sendJointChatMessage(trimmed, mediaToSend, replyToSend);
      setTimeout(() => scrollToBottom(true), 60);
    } catch {
      // If complete send failure, restore preview so user can retry
      if (draftMedia) setMediaPreview(draftMedia);
      showToast('Message queued in outbox. Will sync when reconnected.', 'info');
    } finally {
      setIsSending(false);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Photo / receipt upload with intelligent client-side compression to <150KB
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImageFile(file, 1280, 0.78);
        setMediaPreview({
          url: compressed.dataUrl,
          name: file.name,
          fileSize: compressed.sizeBytes,
        });
        showToast(
          `Photo ready (${(compressed.sizeBytes / 1024).toFixed(0)} KB). Tap send to share.`,
          'info'
        );
      } catch (err) {
        showToast('Failed to optimize image. Please try a different photo.', 'error');
      }
    } else {
      if (file.size > 800 * 1024) {
        showToast('File size must be under 800KB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setMediaPreview({
            url: reader.result,
            name: file.name,
            fileSize: file.size,
          });
          showToast('File attached. Tap send to share.', 'info');
        }
      };
      reader.readAsDataURL(file);
    }

    e.target.value = '';
  };

  // Image load handler: preserves scroll without abrupt jumps
  const handleImageLoaded = () => {
    const container = chatScrollContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 160;
    if (isNearBottom) {
      scrollToBottom(false);
    }
  };

  // Quick preset chips
  const handleInsertQuickAction = (text: string) => {
    setInputText(text);
    setIsQuickActionsOpen(false);
    if (textareaRef.current) textareaRef.current.focus();
  };

  // Trigger Ring Partner
  const handleTriggerRing = async () => {
    if (ringCooldown > 0) return;
    setIsRingingLoading(true);

    try {
      const res = await ringPartner();
      if (res.ok) {
        setIsRingConfirmOpen(false);
        setRingCooldown(30);
        showToast(`Ringing ${partnerName}'s device...`, 'info');
      } else {
        showToast(res.message || 'Could not ring partner.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to ring partner.', 'error');
    } finally {
      setIsRingingLoading(false);
    }
  };

  // Toggle desktop details panel
  const handleToggleDetailsDesktop = () => {
    setIsDetailsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pesotrack_chat_details_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Filter messages by search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return jointMessages;
    const q = searchQuery.toLowerCase().trim();
    return jointMessages.filter((m) => m.text && m.text.toLowerCase().includes(q));
  }, [jointMessages, searchQuery]);

  // Format timestamp (e.g. 9:15 AM)
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-PH', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  // Format date header (e.g. Today, Oct 22, 2026)
  const formatDateHeader = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return `Today, ${date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday, ${date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      return date.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // Group messages by date and identify sender streaks
  const groupedMessages = useMemo(() => {
    const groups: { dateLabel: string; messages: JointMessage[] }[] = [];
    let currentGroup: { dateLabel: string; messages: JointMessage[] } | null = null;

    filteredMessages.forEach((msg) => {
      const dateLabel = formatDateHeader(msg.timestamp);
      if (!currentGroup || currentGroup.dateLabel !== dateLabel) {
        currentGroup = { dateLabel, messages: [msg] };
        groups.push(currentGroup);
      } else {
        currentGroup.messages.push(msg);
      }
    });

    return groups;
  }, [filteredMessages]);

  // Last message in thread for conversation preview
  const lastMessage = jointMessages[jointMessages.length - 1];

  // Common emoji picker list
  const commonEmojis = ['😊', '❤️', '👍', '💰', '💡', '🛒', '⚡', '🙏', '🔥', '🎉'];

  // Message Context Menu Handlers
  const handleCopyMessage = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Message copied to clipboard', 'info');
    }
    setActiveMenuMessageId(null);
  };

  const handleStartReply = (msg: JointMessage) => {
    setReplyingToMessage(msg);
    setActiveMenuMessageId(null);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleDeleteForMe = async (msgId: string) => {
    setActiveMenuMessageId(null);
    await deleteJointMessageForMe(msgId);
  };

  const handleStartUnsend = (msg: JointMessage) => {
    setActiveMenuMessageId(null);
    setUnsendMessageTarget(msg);
  };

  return (
    <div className="flex-1 w-full h-full min-h-0 flex bg-[#0B130E] text-[#F3F4F1] overflow-hidden select-none relative font-sans">
      {/* ===================================================================== */}
      {/* COLUMN 1: CONVERSATION LIST / MESSAGES SUB-SIDEBAR                   */}
      {/* Visible on Desktop & Tablet, and on Mobile when in 'list' view        */}
      {/* ===================================================================== */}
      <div
        className={`w-full md:w-72 lg:w-80 shrink-0 bg-[#0E1712] border-r border-[#19271E] flex flex-col h-full overflow-hidden transition-all ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Messages Header */}
        <div className="px-4 py-3.5 border-b border-[#19271E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {onOpenMobileMenu && (
              <button
                type="button"
                onClick={onOpenMobileMenu}
                aria-label="Open sidebar navigation"
                className="md:hidden p-1.5 -ml-1 rounded-xl text-[#8FA095] hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white tracking-tight leading-tight">
                Messages
              </h2>
              <p className="text-[11px] text-[#8FA095] truncate">
                Chat with your partner about your finances
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setMobileView('chat');
              if (textareaRef.current) textareaRef.current.focus();
            }}
            aria-label="Compose new message"
            className="p-2 rounded-xl text-[#8FA095] hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"
          >
            <SquarePen className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Conversation List / Active Partner Card */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 overscroll-contain">
          {partnerMember ? (
            <button
              type="button"
              onClick={() => setMobileView('chat')}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#142319] border border-[#1E3525] text-left transition-all hover:bg-[#182C20] cursor-pointer group shadow-2xs"
            >
              {/* Partner Avatar with Green Online Dot */}
              <div className="relative shrink-0">
                <div
                  style={{ backgroundColor: partnerAvatarColor }}
                  className="w-12 h-12 rounded-full text-white font-black text-base flex items-center justify-center border-2 border-[#1E382A] shadow-xs"
                >
                  {partnerInitial}
                </div>
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#22C55E] border-2 border-[#0E1712]" />
              </div>

              {/* Partner Info & Last Message Snippet */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-bold text-white truncate">
                    {partnerName}
                  </span>
                  <span className="text-[10px] text-[#8FA095] font-medium shrink-0 ml-1">
                    {lastMessage ? formatTime(lastMessage.timestamp) : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs text-[#8FA095] truncate group-hover:text-[#D1D5DB]">
                    {lastMessage
                      ? lastMessage.isUnsent
                        ? 'Message was unsent'
                        : (lastMessage.senderUid === currentUser?.uid ? 'You: ' : '') + (lastMessage.text || 'Photo attachment')
                      : 'Tap to start conversation'}
                  </p>
                  {jointUnreadMessagesCount > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#22C55E] text-[#0A1A10] font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs">
                      {jointUnreadMessagesCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ) : (
            <div className="p-4 text-center space-y-3 my-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#18291F] text-[#86EFAC] flex items-center justify-center">
                <SquarePen className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">No Partner in Vault</h4>
                <p className="text-xs text-[#8FA095]">
                  Invite your partner to collaborate on finances and start chatting.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* COLUMN 2: MAIN CONVERSATION PANEL                                     */}
      {/* ===================================================================== */}
      <div
        className={`flex-1 min-w-0 flex flex-col h-full min-h-0 bg-[#0B130E] relative overflow-hidden transition-all ${
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Top Conversation Header (STATIONARY) */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-[#1A2A20] bg-[#0E1712] shrink-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile Back Button */}
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 768) {
                  setMobileView('list');
                } else if (onBackToOverview) {
                  onBackToOverview();
                }
              }}
              aria-label="Back to conversations"
              className="p-1.5 -ml-1 rounded-xl text-[#8FA095] hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Partner Avatar with Online Indicator */}
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  setIsDetailsCollapsed(false);
                } else {
                  setIsMobileDetailsOpen(true);
                }
              }}
              aria-label="View partner details"
              className="relative shrink-0 cursor-pointer group"
            >
              <div
                style={{ backgroundColor: partnerAvatarColor }}
                className="w-10 h-10 rounded-full text-white font-black text-sm flex items-center justify-center border-2 border-[#1E382A] group-hover:scale-105 transition-transform"
              >
                {partnerInitial}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#22C55E] border-2 border-[#0E1712]" />
            </button>

            {/* Partner Name & Status */}
            <div className="min-w-0 flex flex-col text-left">
              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth >= 1024) {
                    setIsDetailsCollapsed(false);
                  } else {
                    setIsMobileDetailsOpen(true);
                  }
                }}
                className="text-sm sm:text-base font-bold text-white hover:underline cursor-pointer truncate"
              >
                {partnerName}
              </button>
              <div className="flex items-center gap-1.5 text-xs text-[#22C55E] font-medium leading-tight">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                <span>Online</span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Video Call */}
            <button
              type="button"
              onClick={() => {
                showToast(`Calling ${partnerName}... (Ring alert sent to device)`, 'info');
                handleTriggerRing();
              }}
              title="Video Call"
              aria-label="Start video call with partner"
              className="p-2 sm:p-2.5 rounded-xl bg-[#142319] hover:bg-[#1A2E21] border border-[#203627] text-[#86EFAC] hover:text-white transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <Video className="w-4.5 h-4.5" />
            </button>

            {/* Phone Call / Ring Partner */}
            <button
              type="button"
              onClick={() => setIsRingConfirmOpen(true)}
              disabled={ringCooldown > 0 || !partnerMember}
              title={ringCooldown > 0 ? `Ring cooldown (${ringCooldown}s)` : `Ring ${partnerName}`}
              aria-label="Ring partner device"
              className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                ringCooldown > 0 || !partnerMember
                  ? 'bg-white/5 border-transparent text-[#8FA095] cursor-not-allowed opacity-50'
                  : 'bg-[#142319] hover:bg-[#1A2E21] border-[#203627] text-[#86EFAC] hover:text-white'
              }`}
            >
              <Phone className="w-4.5 h-4.5" />
            </button>

            {/* Search */}
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen((prev) => !prev);
                if (isSearchOpen) setSearchQuery('');
              }}
              title="Search conversation"
              aria-label="Search messages in conversation"
              className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                isSearchOpen
                  ? 'bg-[#174F32] border-[#2A6644] text-white'
                  : 'bg-[#142319] hover:bg-[#1A2E21] border-[#203627] text-[#86EFAC] hover:text-white'
              }`}
            >
              <Search className="w-4.5 h-4.5" />
            </button>

            {/* Toggle Partner Details (Three Dots) */}
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  handleToggleDetailsDesktop();
                } else {
                  setIsMobileDetailsOpen(true);
                }
              }}
              title="Conversation details"
              aria-label="Toggle partner details panel"
              className="p-2 sm:p-2.5 rounded-xl bg-[#142319] hover:bg-[#1A2E21] border border-[#203627] text-[#86EFAC] hover:text-white transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <MoreVertical className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Search Bar (Collapsible) */}
        {isSearchOpen && (
          <div className="px-4 py-2 bg-[#121E17] border-b border-[#1E3424] flex items-center gap-2 animate-fadeIn shrink-0 z-10">
            <Search className="w-4 h-4 text-[#8FA095] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in this conversation..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-white focus:outline-none placeholder:text-[#8FA095]"
              autoFocus
            />
            {searchQuery && (
              <span className="text-[11px] font-bold text-[#86EFAC] px-1">
                {filteredMessages.length} found
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
              aria-label="Close search"
              className="p-1 rounded-lg text-[#8FA095] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* =================================================================== */}
        {/* SCROLLABLE MESSAGE HISTORY (THE ONLY VERTICALLY SCROLLABLE AREA)   */}
        {/* =================================================================== */}
        <div
          ref={chatScrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 w-full overflow-y-auto overscroll-contain px-3 sm:px-6 py-4 space-y-4 touch-pan-y bg-[#0B130E]"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {filteredMessages.length === 0 ? (
            <div className="max-w-md mx-auto py-16 px-4 text-center space-y-5">
              <div
                style={{ backgroundColor: `${partnerAvatarColor}25` }}
                className="w-18 h-18 mx-auto rounded-full text-[#86EFAC] flex items-center justify-center shadow-lg border-2 border-[#1E382A]"
              >
                <div className="text-2xl font-black">{partnerInitial}</div>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {partnerMember ? `Chat with ${partnerName}` : 'Partner has not joined yet'}
                </h3>
                <p className="text-xs text-[#8FA095] leading-relaxed">
                  {partnerMember
                    ? 'Messages are synchronized in real-time and stored securely in your vault.'
                    : 'Invite your partner to join this shared vault to start messaging.'}
                </p>
              </div>

              {partnerMember && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {[
                    'Hi! Did you already pay the Meralco bill?',
                    "Okay, I'll add it to the grocery list too.",
                    'Added na. I also recorded our grocery expense.',
                    'Thank you! ❤️',
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInputText(chip);
                        if (textareaRef.current) textareaRef.current.focus();
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#142319] border border-[#203627] text-[#D1D5DB] hover:border-emerald-500 hover:text-white transition-colors cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            groupedMessages.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-3">
                {/* Centered Date Separator */}
                <div className="flex items-center justify-center my-3">
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold text-[#8FA095] bg-[#16251C] border border-[#203627] shadow-2xs">
                    {group.dateLabel}
                  </span>
                </div>

                {/* Message Bubbles in Group */}
                {group.messages.map((msg, msgIdx) => {
                  const isSentByMe = msg.senderUid === currentUser?.uid;
                  const isNextSameSender =
                    msgIdx < group.messages.length - 1 &&
                    group.messages[msgIdx + 1].senderUid === msg.senderUid;
                  const isLatestOutgoing =
                    isSentByMe &&
                    (msgIdx === group.messages.length - 1 ||
                      group.messages[msgIdx + 1].senderUid !== msg.senderUid);
                  const isMenuOpen = activeMenuMessageId === msg.id;
                  const parsed = parseMessageContent(msg);

                  return (
                    <div
                      key={msg.id}
                      id={`msg-${msg.id}`}
                      className={`flex flex-col ${isSentByMe ? 'items-end' : 'items-start'} space-y-1 relative group transition-all duration-300 ${
                        highlightedMessageId === msg.id
                          ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0B130E] rounded-2xl animate-pulse p-1 -m-1'
                          : ''
                      }`}
                    >
                      {/* Outgoing Message Row: [3-dot menu trigger in open space] [Bubble] */}
                      {isSentByMe ? (
                        <div className="flex items-end justify-end gap-1.5 sm:gap-2 max-w-[90%] sm:max-w-[76%]">
                          {/* 3-Dot Action Menu Trigger (on LEFT of outgoing bubble) */}
                          <div className="relative shrink-0 self-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuMessageId(isMenuOpen ? null : msg.id);
                              }}
                              aria-label="Message options"
                              className={`message-action-trigger p-1.5 rounded-full text-[#8FA095] hover:text-white hover:bg-white/10 transition-opacity cursor-pointer ${
                                isMenuOpen ? 'opacity-100 bg-white/10 text-white' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                              }`}
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {/* Floating Context Action Menu */}
                            {isMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="message-action-menu absolute z-30 right-0 bottom-full mb-1 min-w-44 py-1.5 rounded-2xl bg-[#142319] border border-[#233B2B] shadow-2xl text-xs space-y-0.5 animate-fadeIn"
                              >
                                {!msg.isUnsent && msg.text && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyMessage(parsed.cleanText)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[#D1D5DB] hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-[#8FA095]" />
                                    <span>Copy Text</span>
                                  </button>
                                )}

                                {!msg.isUnsent && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartReply(msg)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[#D1D5DB] hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
                                  >
                                    <Reply className="w-3.5 h-3.5 text-[#8FA095]" />
                                    <span>Reply</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteForMe(msg.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                  <span>Delete for me</span>
                                </button>

                                {!msg.isUnsent && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartUnsend(msg)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer text-left border-t border-white/5"
                                  >
                                    <Undo2 className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Unsend for everyone</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Outgoing Message Bubble */}
                          <div
                            className={`rounded-2xl px-3 sm:px-3.5 py-2 ${textSizeClass} shadow-sm break-words relative ${
                              msg.isUnsent
                                ? 'bg-[#141F18] border border-dashed border-[#23382A] text-[#8FA095] italic rounded-2xl'
                                : 'bg-[#174F32] text-white border border-[#265D3E] rounded-br-xs'
                            } max-w-full`}
                          >
                            {msg.isUnsent ? (
                              <div className="flex items-center gap-2 py-0.5 select-none">
                                <Undo2 className="w-3.5 h-3.5 text-[#8FA095] shrink-0" />
                                <span>You unsent a message</span>
                                <span className="text-[10px] text-[#6A786F] ml-1 shrink-0 font-normal not-italic">
                                  {formatTime(msg.unsentAt || msg.timestamp)}
                                </span>
                              </div>
                            ) : (
                              <>
                                {/* Quoted Reply Preview */}
                                {parsed.replyInfo && (
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleJumpToOriginal(parsed.replyInfo?.targetId, parsed.replyInfo?.text);
                                    }}
                                    className="mb-1.5 px-2.5 py-1 rounded-lg text-xs bg-black/25 border-l-2 border-emerald-300 hover:bg-black/35 text-emerald-100 cursor-pointer transition-colors"
                                  >
                                    <div className="flex items-center gap-1 font-semibold text-[11px] text-emerald-300">
                                      <Reply className="w-3 h-3" />
                                      <span>{parsed.replyInfo.senderName}</span>
                                    </div>
                                    <p className="line-clamp-2 text-[11px] opacity-90 truncate mt-0.5">
                                      {parsed.replyInfo.text || 'Photo attachment'}
                                    </p>
                                  </div>
                                )}

                                {/* Image Attachment (Clickable Fullscreen) */}
                                {msg.mediaUrl && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFullscreenImage({
                                        isOpen: true,
                                        url: msg.mediaUrl!,
                                        name: msg.mediaName || 'Photo',
                                        senderName: msg.senderName,
                                        timestamp: msg.timestamp,
                                      })
                                    }
                                    className="mb-1.5 rounded-xl overflow-hidden max-w-xs border border-white/10 max-h-60 bg-[#142319] block group/img relative cursor-zoom-in text-left"
                                  >
                                    <img
                                      src={msg.mediaUrl}
                                      alt={msg.mediaName || 'Attachment'}
                                      onLoad={handleImageLoaded}
                                      className="w-full h-auto object-cover max-h-60 transition-transform group-hover/img:scale-[1.02]"
                                    />
                                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-medium">
                                      <ZoomIn className="w-4 h-4" />
                                      <span>View Fullscreen</span>
                                    </div>
                                  </button>
                                )}

                                {/* Message Text with Safe Clickable Links */}
                                <div className="flex items-end gap-2 justify-between">
                                  <div className="whitespace-pre-wrap select-text font-normal flex-1">
                                    {renderMessageContentWithLinks(parsed.cleanText, searchQuery)}
                                  </div>

                                  {/* Timestamp inside bubble */}
                                  <div className="flex items-center gap-1 shrink-0 text-[10px] text-[#A7B0A4] self-end ml-1">
                                    <span>{formatTime(msg.timestamp)}</span>
                                    <span className="inline-flex items-center">
                                      {msg.status === 'pending' ? (
                                        <Clock className="w-3 h-3 text-amber-300 animate-pulse" />
                                      ) : msg.status === 'sent' ? (
                                        <Check className="w-3.5 h-3.5 text-white/80" />
                                      ) : msg.status === 'delivered' ? (
                                        <CheckCheck className="w-3.5 h-3.5 text-white/90" />
                                      ) : msg.status === 'read' ? (
                                        <CheckCheck className="w-3.5 h-3.5 text-[#86EFAC] font-black" />
                                      ) : (
                                        <AlertCircle className="w-3.5 h-3.5 text-red-300" />
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Incoming Message Row: [Avatar] [Bubble] [3-dot menu trigger in open space] */
                        <div className="flex items-end justify-start gap-1.5 sm:gap-2 max-w-[90%] sm:max-w-[76%]">
                          {/* 1. Partner Avatar */}
                          <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center mb-0.5">
                            {!isNextSameSender ? (
                              <div
                                style={{ backgroundColor: partnerAvatarColor }}
                                className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center border border-[#1E382A]"
                              >
                                {partnerInitial}
                              </div>
                            ) : (
                              <div className="w-8 h-8" />
                            )}
                          </div>

                          {/* 2. Incoming Message Bubble */}
                          <div
                            className={`rounded-2xl px-3 sm:px-3.5 py-2 ${textSizeClass} shadow-sm break-words relative ${
                              msg.isUnsent
                                ? 'bg-[#141F18] border border-dashed border-[#23382A] text-[#8FA095] italic rounded-2xl'
                                : 'bg-[#1F2C24] text-[#F3F4F1] border border-[#2B3E32] rounded-bl-xs'
                            } max-w-full`}
                          >
                            {msg.isUnsent ? (
                              <div className="flex items-center gap-2 py-0.5 select-none">
                                <Undo2 className="w-3.5 h-3.5 text-[#8FA095] shrink-0" />
                                <span>This message was unsent</span>
                                <span className="text-[10px] text-[#6A786F] ml-1 shrink-0 font-normal not-italic">
                                  {formatTime(msg.unsentAt || msg.timestamp)}
                                </span>
                              </div>
                            ) : (
                              <>
                                {/* Quoted Reply Preview */}
                                {parsed.replyInfo && (
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleJumpToOriginal(parsed.replyInfo?.targetId, parsed.replyInfo?.text);
                                    }}
                                    className="mb-1.5 px-2.5 py-1 rounded-lg text-xs bg-black/30 border-l-2 border-emerald-400 hover:bg-black/40 text-emerald-200 cursor-pointer transition-colors"
                                  >
                                    <div className="flex items-center gap-1 font-semibold text-[11px] text-emerald-300">
                                      <Reply className="w-3 h-3" />
                                      <span>{parsed.replyInfo.senderName}</span>
                                    </div>
                                    <p className="line-clamp-2 text-[11px] opacity-90 truncate mt-0.5">
                                      {parsed.replyInfo.text || 'Photo attachment'}
                                    </p>
                                  </div>
                                )}

                                {/* Image Attachment (Clickable Fullscreen) */}
                                {msg.mediaUrl && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFullscreenImage({
                                        isOpen: true,
                                        url: msg.mediaUrl!,
                                        name: msg.mediaName || 'Photo',
                                        senderName: msg.senderName,
                                        timestamp: msg.timestamp,
                                      })
                                    }
                                    className="mb-1.5 rounded-xl overflow-hidden max-w-xs border border-white/10 max-h-60 bg-[#142319] block group/img relative cursor-zoom-in text-left"
                                  >
                                    <img
                                      src={msg.mediaUrl}
                                      alt={msg.mediaName || 'Attachment'}
                                      onLoad={handleImageLoaded}
                                      className="w-full h-auto object-cover max-h-60 transition-transform group-hover/img:scale-[1.02]"
                                    />
                                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-medium">
                                      <ZoomIn className="w-4 h-4" />
                                      <span>View Fullscreen</span>
                                    </div>
                                  </button>
                                )}

                                {/* Message Text with Safe Clickable Links */}
                                <div className="flex items-end gap-2 justify-between">
                                  <div className="whitespace-pre-wrap select-text font-normal flex-1">
                                    {renderMessageContentWithLinks(parsed.cleanText, searchQuery)}
                                  </div>

                                  {/* Timestamp inside bubble */}
                                  <div className="flex items-center gap-1 shrink-0 text-[10px] text-[#A7B0A4] self-end ml-1">
                                    <span>{formatTime(msg.timestamp)}</span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          {/* 3. 3-Dot Action Menu Trigger (on RIGHT of incoming bubble) */}
                          <div className="relative shrink-0 self-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuMessageId(isMenuOpen ? null : msg.id);
                              }}
                              aria-label="Message options"
                              className={`message-action-trigger p-1.5 rounded-full text-[#8FA095] hover:text-white hover:bg-white/10 transition-opacity cursor-pointer ${
                                isMenuOpen ? 'opacity-100 bg-white/10 text-white' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                              }`}
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {/* Floating Context Action Menu */}
                            {isMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="message-action-menu absolute z-30 left-0 bottom-full mb-1 min-w-44 py-1.5 rounded-2xl bg-[#142319] border border-[#233B2B] shadow-2xl text-xs space-y-0.5 animate-fadeIn"
                              >
                                {!msg.isUnsent && msg.text && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyMessage(parsed.cleanText)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[#D1D5DB] hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-[#8FA095]" />
                                    <span>Copy Text</span>
                                  </button>
                                )}

                                {!msg.isUnsent && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartReply(msg)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[#D1D5DB] hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
                                  >
                                    <Reply className="w-3.5 h-3.5 text-[#8FA095]" />
                                    <span>Reply</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteForMe(msg.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                  <span>Delete for me</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Underneath Message Status Label (Delivered, Seen, Waiting to sync, Retry) */}
                      {isSentByMe && isLatestOutgoing && !msg.isUnsent && (
                        <div className="text-[11px] text-[#8FA095] pr-1 flex items-center gap-1 select-none font-medium">
                          {msg.status === 'pending' ? (
                            <span className="text-amber-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 animate-pulse" />
                              <span>Waiting to sync</span>
                            </span>
                          ) : msg.status === 'sent' ? (
                            <span>Sent</span>
                          ) : msg.status === 'delivered' ? (
                            <span>Delivered</span>
                          ) : msg.status === 'read' ? (
                            <span className="text-[#86EFAC] flex items-center gap-1">
                              <span>Seen</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => retryJointMessage(msg.id)}
                              className="text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Failed — Tap to retry</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to Bottom Floating Action Button */}
        {showScrollBottom && (
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            aria-label="Scroll to newest messages"
            className="absolute bottom-20 right-6 z-20 p-2.5 rounded-full bg-[#174F32] hover:bg-[#123E27] text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer border border-[#2A6644]"
          >
            <ArrowDown className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}

        {/* =================================================================== */}
        {/* MESSAGE COMPOSER (STATIONARY AT BOTTOM)                             */}
        {/* =================================================================== */}
        <div className="p-3 sm:p-4 border-t border-[#1A2A20] bg-[#0E1712] shrink-0 space-y-2 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] z-20">
          {/* Offline Notice */}
          {!isOnline && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-200 text-[11px] font-semibold flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Offline • Actions and messages are queued in your outbox and will sync automatically upon reconnection.</span>
            </div>
          )}

          {/* Replying Banner Preview */}
          {replyingToMessage && (
            <div className="flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl bg-[#142319] border border-[#233B2B] text-xs text-white animate-fadeIn">
              <div className="flex items-center gap-2 min-w-0">
                <Reply className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[#8FA095] truncate">
                  Replying to <strong className="text-white">{replyingToMessage.senderName}</strong>: {replyingToMessage.text ? (replyingToMessage.text.length > 50 ? `${replyingToMessage.text.slice(0, 47)}...` : replyingToMessage.text) : 'Photo'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReplyingToMessage(null)}
                className="p-1 text-[#8FA095] hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Pending Media Attachment Preview */}
          {mediaPreview && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#16251C] border border-[#23382A] text-xs text-white">
              <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate flex-1">{mediaPreview.name}</span>
              <button
                type="button"
                onClick={() => setMediaPreview(null)}
                className="p-1 text-[#8FA095] hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Actions Popover */}
          {isQuickActionsOpen && (
            <div className="p-2 rounded-2xl bg-[#142319] border border-[#233B2B] shadow-xl flex flex-wrap items-center gap-2 animate-fadeIn">
              <button
                type="button"
                onClick={() => handleInsertQuickAction('⚡ Recorded an expense payment: ₱')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1A2D20] text-emerald-300 hover:bg-[#203828] cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Share Expense</span>
              </button>
              <button
                type="button"
                onClick={() => handleInsertQuickAction('💡 Bill Reminder: ')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1A2D20] text-amber-300 hover:bg-[#203828] cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Bill Reminder</span>
              </button>
              <button
                type="button"
                onClick={() => handleInsertQuickAction('🛒 Added to grocery list: ')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1A2D20] text-cyan-300 hover:bg-[#203828] cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Grocery Item</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1A2D20] text-emerald-200 hover:bg-[#203828] cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Upload Receipt</span>
              </button>
            </div>
          )}

          {/* Emoji Popover */}
          {isEmojiPickerOpen && (
            <div className="p-2 rounded-2xl bg-[#142319] border border-[#233B2B] shadow-xl flex items-center gap-1 animate-fadeIn overflow-x-auto no-scrollbar">
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setInputText((prev) => prev + emoji);
                    setIsEmojiPickerOpen(false);
                    if (textareaRef.current) textareaRef.current.focus();
                  }}
                  className="p-1.5 text-base hover:bg-white/10 rounded-lg cursor-pointer transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Composer Input Bar matching Screenshot 2 */}
          <div className="flex items-center gap-2">
            {/* Plus / Actions Toggle */}
            <button
              type="button"
              onClick={() => setIsQuickActionsOpen((prev) => !prev)}
              aria-label="Add attachment or action"
              className={`p-2 rounded-full transition-colors cursor-pointer shrink-0 ${
                isQuickActionsOpen
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#16251C] hover:bg-[#1E3325] text-[#86EFAC]'
              }`}
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>

            {/* Photo / Gallery Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach photo or receipt"
              className="p-2 rounded-full bg-[#16251C] hover:bg-[#1E3325] text-[#86EFAC] transition-colors cursor-pointer shrink-0"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Pill-Shaped Message Input Bar */}
            <div className="flex-1 flex items-center bg-[#16251C] border border-[#23382A] rounded-full px-4 py-1.5 focus-within:border-emerald-500 transition-colors">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={partnerMember ? 'Type a message...' : 'Waiting for partner to join...'}
                disabled={!partnerMember}
                className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder:text-[#8FA095] focus:outline-none resize-none max-h-24 py-1 leading-relaxed"
              />

              {/* Emoji Button inside Input Bar */}
              <button
                type="button"
                onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                aria-label="Insert emoji"
                className="p-1 text-[#8FA095] hover:text-[#86EFAC] transition-colors cursor-pointer shrink-0 ml-1"
              >
                <Smile className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Send or Mic Button */}
            {inputText.trim() || mediaPreview ? (
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending || !partnerMember}
                aria-label="Send message"
                className="w-10 h-10 rounded-full bg-[#22C55E] hover:bg-[#16A34A] text-[#0A1A10] flex items-center justify-center shrink-0 shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Send className="w-4.5 h-4.5 stroke-[2.8]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  showToast('Voice memo recording: Tap and hold to speak', 'info');
                }}
                aria-label="Voice memo"
                className="w-10 h-10 rounded-full bg-[#16251C] hover:bg-[#1E3325] text-[#86EFAC] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* COLUMN 3: PARTNER DETAILS PANEL (DESKTOP RIGHT SIDEBAR)              */}
      {/* ===================================================================== */}
      {!isDetailsCollapsed && partnerMember && (
        <div className="hidden lg:flex w-72 lg:w-80 shrink-0 h-full overflow-hidden flex-col">
          <PartnerDetailsContent
            workspace={activeJointWorkspace}
            partner={partnerMember}
            onRingPartner={() => setIsRingConfirmOpen(true)}
            onVideoCall={() => {
              showToast(`Calling ${partnerName}...`, 'info');
              handleTriggerRing();
            }}
            onMessageClick={() => {
              if (textareaRef.current) textareaRef.current.focus();
            }}
            onClose={handleToggleDetailsDesktop}
            isMuted={isChatMuted}
            onToggleMute={handleToggleMute}
            onClearChat={() => setIsClearChatModalOpen(true)}
            cooldownSeconds={ringCooldown}
            textSize={chatTextSize}
            onChangeTextSize={handleChangeTextSize}
            mediaCounts={mediaCounts}
            onOpenMediaBrowser={(tab) => {
              setMediaBrowserTab(tab || 'images');
              setIsMediaBrowserOpen(true);
            }}
            stats={{
              accountsCount: jointAccounts.length,
              billsCount: jointBills.length,
              groceriesCount: jointGroceryItems.filter((g) => !g.isPurchased && !g.isDeleted).length,
              messagesCount: jointMessages.length,
            }}
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODALS & OVERLAYS                                                    */}
      {/* ===================================================================== */}

      {/* Interactive Fullscreen Image Viewer with Pinch-Zoom, Pan & Download */}
      <FullscreenImageViewer
        isOpen={fullscreenImage.isOpen}
        imageUrl={fullscreenImage.url}
        imageName={fullscreenImage.name}
        senderName={fullscreenImage.senderName}
        timestamp={fullscreenImage.timestamp}
        onClose={() => setFullscreenImage({ isOpen: false, url: null })}
      />

      {/* Media, Links & Files Browser Modal */}
      <MediaBrowserModal
        isOpen={isMediaBrowserOpen}
        onClose={() => setIsMediaBrowserOpen(false)}
        messages={jointMessages}
        initialTab={mediaBrowserTab}
        onSelectImage={(item) => {
          setFullscreenImage({
            isOpen: true,
            url: item.url,
            name: item.name,
            senderName: item.senderName,
            timestamp: item.timestamp,
          });
        }}
        onNavigateToMessage={(msgId: string) => {
          setIsMediaBrowserOpen(false);
          setTimeout(() => {
            handleJumpToOriginal(msgId);
          }, 150);
        }}
      />

      {/* Clear Chat Confirmation Modal */}
      <ClearChatModal
        isOpen={isClearChatModalOpen}
        onClose={() => setIsClearChatModalOpen(false)}
        partnerName={partnerName}
        onConfirm={async (scope) => {
          return await clearJointChat(scope);
        }}
      />

      {/* Unsend Message Confirmation Modal */}
      <UnsendConfirmModal
        isOpen={Boolean(unsendMessageTarget)}
        messageId={unsendMessageTarget?.id || null}
        messagePreview={unsendMessageTarget?.text || (unsendMessageTarget?.mediaUrl ? 'Photo attachment' : '')}
        onClose={() => setUnsendMessageTarget(null)}
        onConfirm={async (msgId) => {
          return await unsendJointMessage(msgId);
        }}
      />

      {/* Ring Partner Confirm Modal */}
      <RingPartnerConfirmModal
        isOpen={isRingConfirmOpen}
        partnerName={partnerName}
        onClose={() => setIsRingConfirmOpen(false)}
        onConfirm={handleTriggerRing}
        isLoading={isRingingLoading}
        cooldownSeconds={ringCooldown}
      />

      {/* Mobile Drawer Partner Details Modal */}
      <PartnerDetailsModal
        isOpen={isMobileDetailsOpen}
        workspace={activeJointWorkspace}
        partner={partnerMember}
        onRingPartner={() => {
          setIsMobileDetailsOpen(false);
          setIsRingConfirmOpen(true);
        }}
        onVideoCall={() => {
          setIsMobileDetailsOpen(false);
          showToast(`Calling ${partnerName}...`, 'info');
          handleTriggerRing();
        }}
        onMessageClick={() => {
          setIsMobileDetailsOpen(false);
          if (textareaRef.current) textareaRef.current.focus();
        }}
        onClose={() => setIsMobileDetailsOpen(false)}
        isMuted={isChatMuted}
        onToggleMute={handleToggleMute}
        onClearChat={() => {
          setIsMobileDetailsOpen(false);
          setIsClearChatModalOpen(true);
        }}
        cooldownSeconds={ringCooldown}
        textSize={chatTextSize}
        onChangeTextSize={handleChangeTextSize}
        mediaCounts={mediaCounts}
        onOpenMediaBrowser={(tab) => {
          setIsMobileDetailsOpen(false);
          setMediaBrowserTab(tab || 'images');
          setIsMediaBrowserOpen(true);
        }}
        stats={{
          accountsCount: jointAccounts.length,
          billsCount: jointBills.length,
          groceriesCount: jointGroceryItems.filter((g) => !g.isPurchased && !g.isDeleted).length,
          messagesCount: jointMessages.length,
        }}
      />

      {/* Full-Screen Incoming Ring Modal */}
      <IncomingRingModal
        ringRequest={activeIncomingRing}
        onAccept={() => respondToIncomingRing('accepted')}
        onDismiss={() => respondToIncomingRing('dismissed')}
        onMessage={() => {
          respondToIncomingRing('dismissed');
          if (textareaRef.current) textareaRef.current.focus();
        }}
      />
    </div>
  );
};

/**
 * Renders message text with automatic URL detection, wrapping links into safe clickable <a> tags.
 */
function renderMessageContentWithLinks(text: string, searchQuery: string) {
  if (!text) return null;

  // Split string preserving URL tokens
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          const href = part.startsWith('http://') || part.startsWith('https://') ? part : `https://${part}`;
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="underline text-emerald-300 hover:text-emerald-100 break-all inline-flex items-center gap-0.5 font-medium cursor-pointer transition-colors"
              title={`Open ${part}`}
            >
              <span>{part}</span>
              <ExternalLink className="w-3 h-3 inline-block shrink-0 opacity-80" />
            </a>
          );
        }
        return searchQuery.trim() ? highlightMatch(part, searchQuery) : part;
      })}
    </>
  );
}

/**
 * Highlights searched substrings inside message text.
 */
function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="bg-amber-300 text-black px-0.5 rounded-xs font-semibold"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
