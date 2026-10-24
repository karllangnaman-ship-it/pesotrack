import React, { useMemo, useState } from 'react';
import {
  ExternalLink,
  FileText,
  Globe,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageSquare,
  Search,
  X,
} from 'lucide-react';
import { JointMessage } from '../types/finance';

export interface ExtractedLinkItem {
  id: string;
  messageId: string;
  url: string;
  domain: string;
  snippet: string;
  senderName: string;
  timestamp: string;
}

export interface MediaBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: JointMessage[];
  initialTab?: 'images' | 'files' | 'links';
  onSelectImage: (item: { url: string; name: string; senderName?: string; timestamp?: string }) => void;
  onNavigateToMessage: (messageId: string) => void;
}

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

export const MediaBrowserModal: React.FC<MediaBrowserModalProps> = ({
  isOpen,
  onClose,
  messages,
  initialTab = 'images',
  onSelectImage,
  onNavigateToMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'images' | 'files' | 'links'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all media items from active conversation messages
  const imageItems = useMemo(() => {
    return messages
      .filter((m) => !m.isUnsent && !m.isDeleted && m.mediaUrl && (m.mediaType === 'image' || !m.mediaType))
      .map((m) => ({
        id: m.id,
        url: m.mediaUrl!,
        name: m.mediaName || 'Photo Attachment',
        senderName: m.senderName,
        timestamp: m.timestamp,
      }))
      .reverse();
  }, [messages]);

  const fileItems = useMemo(() => {
    return messages
      .filter((m) => !m.isUnsent && !m.isDeleted && m.mediaUrl && m.mediaType === 'file')
      .map((m) => ({
        id: m.id,
        url: m.mediaUrl!,
        name: m.mediaName || 'Document File',
        size: m.fileSize,
        senderName: m.senderName,
        timestamp: m.timestamp,
      }))
      .reverse();
  }, [messages]);

  const linkItems = useMemo(() => {
    const list: ExtractedLinkItem[] = [];
    messages.forEach((m) => {
      if (m.isUnsent || m.isDeleted || !m.text) return;
      const matches = m.text.match(URL_REGEX);
      if (matches) {
        matches.forEach((rawUrl, idx) => {
          let cleanUrl = rawUrl.trim().replace(/[.,!?;:)\]]+$/, '');
          const href = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')
            ? cleanUrl
            : `https://${cleanUrl}`;

          let domain = cleanUrl;
          try {
            const parsed = new URL(href);
            domain = parsed.hostname.replace(/^www\./, '');
          } catch {}

          list.push({
            id: `${m.id}_link_${idx}`,
            messageId: m.id,
            url: href,
            domain,
            snippet: m.text,
            senderName: m.senderName,
            timestamp: m.timestamp,
          });
        });
      }
    });
    return list.reverse();
  }, [messages]);

  // Filter items by search query
  const filteredImages = useMemo(() => {
    if (!searchQuery.trim()) return imageItems;
    const q = searchQuery.toLowerCase().trim();
    return imageItems.filter(
      (img) => img.name.toLowerCase().includes(q) || img.senderName.toLowerCase().includes(q)
    );
  }, [imageItems, searchQuery]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return fileItems;
    const q = searchQuery.toLowerCase().trim();
    return fileItems.filter(
      (file) => file.name.toLowerCase().includes(q) || file.senderName.toLowerCase().includes(q)
    );
  }, [fileItems, searchQuery]);

  const filteredLinks = useMemo(() => {
    if (!searchQuery.trim()) return linkItems;
    const q = searchQuery.toLowerCase().trim();
    return linkItems.filter(
      (item) =>
        item.url.toLowerCase().includes(q) ||
        item.domain.toLowerCase().includes(q) ||
        item.snippet.toLowerCase().includes(q) ||
        item.senderName.toLowerCase().includes(q)
    );
  }, [linkItems, searchQuery]);

  if (!isOpen) return null;

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-browser-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-fadeIn"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-3xl bg-[#0D1611] border border-[#1E382A] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A2A20] shrink-0 bg-[#0E1812]">
          <div>
            <h3 id="media-browser-title" className="text-base sm:text-lg font-bold text-white">
              Media, Links & Files
            </h3>
            <p className="text-xs text-[#8FA095]">
              Shared in this joint finances conversation
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close media browser"
            className="p-1.5 rounded-xl text-[#8FA095] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation & Search Filter */}
        <div className="px-5 pt-3 pb-2 border-b border-[#1A2A20] bg-[#0E1812] shrink-0 space-y-3">
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-[#142319] border border-[#1F3627]">
            <button
              type="button"
              onClick={() => setActiveTab('images')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'images'
                  ? 'bg-[#174F32] text-white shadow-xs'
                  : 'text-[#8FA095] hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Images</span>
              <span className="text-[11px] opacity-75">({imageItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('files')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'files'
                  ? 'bg-[#174F32] text-white shadow-xs'
                  : 'text-[#8FA095] hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Files</span>
              <span className="text-[11px] opacity-75">({fileItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('links')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'links'
                  ? 'bg-[#174F32] text-white shadow-xs'
                  : 'text-[#8FA095] hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Links</span>
              <span className="text-[11px] opacity-75">({linkItems.length})</span>
            </button>
          </div>

          {/* Search filter input */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#142319] border border-[#1F3627]">
            <Search className="w-3.5 h-3.5 text-[#8FA095] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="flex-1 bg-transparent text-xs text-white placeholder:text-[#8FA095] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[#8FA095] hover:text-white text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 overscroll-contain">
          {/* TAB 1: IMAGES */}
          {activeTab === 'images' && (
            <div>
              {filteredImages.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#18291F] text-[#86EFAC] flex items-center justify-center">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">No Photos Found</h4>
                  <p className="text-xs text-[#8FA095] max-w-xs mx-auto">
                    {searchQuery ? 'No images match your search.' : 'Photos, receipts, and images shared in this chat will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredImages.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectImage(img);
                      }}
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-[#142319] border border-[#203627] hover:border-emerald-500 transition-all cursor-pointer text-left focus:outline-none"
                    >
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end">
                        <span className="text-[10px] text-white font-semibold truncate">
                          {img.name}
                        </span>
                        <span className="text-[9px] text-[#86EFAC] truncate">
                          {img.senderName} • {formatDate(img.timestamp)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FILES */}
          {activeTab === 'files' && (
            <div className="space-y-2">
              {filteredFiles.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#18291F] text-[#86EFAC] flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">No Files Shared</h4>
                  <p className="text-xs text-[#8FA095] max-w-xs mx-auto">
                    Documents, spreadsheets, or invoices shared in this chat will appear here.
                  </p>
                </div>
              ) : (
                filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#142319] border border-[#1F3627] hover:border-[#2C4A36] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-10 h-10 rounded-xl bg-[#1A3323] text-[#86EFAC] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-white truncate">
                          {file.name}
                        </h5>
                        <p className="text-[10px] text-[#8FA095] truncate">
                          {file.senderName} • {formatDate(file.timestamp)}
                        </p>
                      </div>
                    </div>

                    <a
                      href={file.url}
                      download={file.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#174F32] hover:bg-[#123E27] text-white shrink-0 border border-[#2A6644] cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: LINKS */}
          {activeTab === 'links' && (
            <div className="space-y-2.5">
              {filteredLinks.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#18291F] text-[#86EFAC] flex items-center justify-center">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">No Links Shared</h4>
                  <p className="text-xs text-[#8FA095] max-w-xs mx-auto">
                    Web addresses and URLs detected in messages will be compiled here automatically.
                  </p>
                </div>
              ) : (
                filteredLinks.map((link) => (
                  <div
                    key={link.id}
                    className="p-3.5 rounded-2xl bg-[#142319] border border-[#1F3627] hover:border-[#2C4A36] transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded-lg bg-[#1E3828] text-[#86EFAC] font-mono text-[11px] font-bold shrink-0">
                          {link.domain}
                        </span>
                        <span className="text-[10px] text-[#8FA095] truncate">
                          {link.senderName} • {formatDate(link.timestamp)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Jump to message in chat */}
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onNavigateToMessage(link.messageId);
                          }}
                          title="Jump to message in conversation"
                          aria-label="Jump to message"
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-[#D1D5DB] transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3 text-[#8FA095]" />
                          <span>Message</span>
                        </button>

                        {/* Open external URL */}
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#174F32] hover:bg-[#123E27] text-white transition-colors cursor-pointer flex items-center gap-1 border border-[#2A6644]"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#60A5FA] hover:underline font-mono truncate block break-all"
                    >
                      {link.url}
                    </a>

                    <p className="text-[11px] text-[#D1D5DB] line-clamp-2 bg-[#0E1812] p-2 rounded-xl border border-white/5">
                      "{link.snippet}"
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
