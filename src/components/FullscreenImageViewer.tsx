import React, { useEffect, useRef, useState } from 'react';
import { Download, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export interface FullscreenImageViewerProps {
  isOpen: boolean;
  imageUrl: string | null;
  imageName?: string;
  senderName?: string;
  timestamp?: string;
  onClose: () => void;
}

export const FullscreenImageViewer: React.FC<FullscreenImageViewerProps> = ({
  isOpen,
  imageUrl,
  imageName = 'Photo Attachment',
  senderName,
  timestamp,
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialTouchDistRef = useRef<number | null>(null);
  const initialTouchScaleRef = useRef(1);

  // Reset transform when opened or image changes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageUrl]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Double click / tap to toggle zoom
  const handleDoubleClick = () => {
    if (scale > 1) {
      handleResetZoom();
    } else {
      setScale(2);
    }
  };

  // Wheel zoom on desktop
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.25, 4));
    } else {
      setScale((prev) => {
        const next = Math.max(prev - 0.25, 1);
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pinch and pan handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialTouchDistRef.current = dist;
      initialTouchScaleRef.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialTouchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialTouchDistRef.current;
      const nextScale = Math.min(Math.max(initialTouchScaleRef.current * ratio, 1), 4);
      setScale(nextScale);
      if (nextScale === 1) setPosition({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = () => {
    initialTouchDistRef.current = null;
    setIsDragging(false);
  };

  // Download / share action
  const handleDownload = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title: imageName,
          url: imageUrl,
          dialogTitle: 'Share or save photo',
        });
        return;
      }

      // Browser download trigger
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = imageName.includes('.') ? imageName : `${imageName}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('[ImageViewer] Download failed:', err);
    }
  };

  const formattedDate = timestamp
    ? new Date(timestamp).toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image attachment viewer"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col select-none overscroll-none animate-fadeIn"
      onWheel={handleWheel}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-black/60 border-b border-white/10 shrink-0 z-20">
        <div className="min-w-0 flex-1 pr-3">
          <h4 className="text-sm sm:text-base font-bold text-white truncate">
            {imageName}
          </h4>
          {(senderName || formattedDate) && (
            <p className="text-xs text-[#8FA095] truncate">
              {senderName ? `Shared by ${senderName}` : ''}
              {senderName && formattedDate ? ' • ' : ''}
              {formattedDate}
            </p>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 1}
            title="Zoom Out"
            aria-label="Zoom Out"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 4}
            title="Zoom In"
            aria-label="Zoom In"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {scale > 1 && (
            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset Zoom"
              aria-label="Reset Zoom"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            title="Download or share"
            aria-label="Download image"
            className="p-2 rounded-xl bg-[#174F32] hover:bg-[#123E27] text-[#86EFAC] hover:text-white transition-colors cursor-pointer border border-[#2A6644]"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close image viewer"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden p-2 sm:p-6 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        <img
          src={imageUrl}
          alt={imageName}
          draggable={false}
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            maxHeight: '100%',
            maxWidth: '100%',
            objectFit: 'contain',
          }}
          className="select-none pointer-events-auto rounded-lg shadow-2xl"
        />
      </div>

      {/* Bottom Hint Banner */}
      <div className="py-2 text-center text-[11px] text-[#8FA095] bg-black/40 border-t border-white/5 shrink-0">
        <span>{scale > 1 ? `${Math.round(scale * 100)}% • Drag to pan • Double-tap to reset` : 'Pinch or double-tap to zoom'}</span>
      </div>
    </div>
  );
};
