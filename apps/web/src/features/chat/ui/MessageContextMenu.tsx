import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Reply,
  Pencil,
  Copy,
  Languages,
  Pin,
  PinOff,
  Forward,
  CheckSquare,
  Trash2,
  Flag,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  ChevronDown,
  Download,
} from 'lucide-react';
import { AttachmentView, MessageView } from '../../../entities/chat/model/types';
import { formatFullMessageDate } from '../lib/groupMessagesByDate';
import MessageReactionDock from './MessageReactionDock';

export interface MessageContextMenuProps {
  message: MessageView;
  isOwnMessage: boolean;
  onClose: () => void;
  onReply?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onForward: () => void;
  onTogglePin: () => void;
  onReport: () => void;
  onSelectMessage?: () => void;
  onReact?: (emoji: string, origin?: { x: number; y: number }) => void;
  onOpenFullPicker?: () => void;
  onOpenExpandedPicker?: (coords?: { x: number; y: number }) => void;
  coords?: { x: number; y: number } | null;
  anchorEl?: HTMLElement | null;
  align?: 'left' | 'right';
  isReadByOther?: boolean;
  targetAttachment?: AttachmentView | null;
}

const EXIT_DURATION_MS = 130;

export default function MessageContextMenu({
  message,
  isOwnMessage,
  onClose,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onTogglePin,
  onReport,
  onSelectMessage,
  onReact,
  onOpenFullPicker,
  onOpenExpandedPicker,
  coords,
  anchorEl,
  align = 'left',
  isReadByOther = false,
  targetAttachment,
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [position, setPosition] = useState<{ top: number; left: number }>(() => ({
    top: coords?.y ?? 100,
    left: coords?.x ?? 100,
  }));

  const requestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      onClose();
    }, EXIT_DURATION_MS);
  }, [isClosing, onClose]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => {
      cancelAnimationFrame(id);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Global Esc key handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        requestClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [requestClose]);

  // Viewport clamping & smart positioning
  useLayoutEffect(() => {
    const menuEl = menuRef.current;
    const menuWidth = 280;
    const menuHeight = menuEl ? menuEl.offsetHeight : 340;
    const padding = 12;

    let targetX = coords ? coords.x : 100;
    let targetY = coords ? coords.y : 100;

    if (!coords && anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      targetX = align === 'right' ? rect.right - menuWidth : rect.left;
      targetY = rect.bottom + 4;
    }

    // Horizontal clamp
    let left = targetX;
    if (left + menuWidth > window.innerWidth - padding) {
      left = Math.max(padding, window.innerWidth - menuWidth - padding);
    } else {
      left = Math.max(padding, left);
    }

    // Vertical placement: if not enough room below, flip upwards
    let top = targetY;
    if (top + menuHeight > window.innerHeight - padding) {
      top = Math.max(padding, targetY - menuHeight);
    } else {
      top = Math.max(padding, top);
    }

    setPosition({ top, left });
  }, [coords, anchorEl, align, mounted]);

  const handleCopy = () => {
    if (message.body) {
      navigator.clipboard?.writeText(message.body);
    }
  };

  const mediaAttachment =
    targetAttachment ||
    message.attachments?.find(
      (a) => a.type === 'IMAGE' || a.type === 'VIDEO' || a.type === 'GIF' || a.type === 'FILE',
    ) ||
    message.attachments?.[0];

  const isImage = Boolean(
    mediaAttachment &&
    (mediaAttachment.type === 'IMAGE' ||
      mediaAttachment.type === 'GIF' ||
      mediaAttachment.mimeType?.startsWith('image/') ||
      /\.(png|jpe?g|webp|gif|svg)$/i.test(mediaAttachment.url || '')),
  );
  const hasMedia = Boolean(mediaAttachment);

  const handleCopyMedia = async () => {
    if (!mediaAttachment?.url) return;
    try {
      const res = await fetch(mediaAttachment.url);
      const blob = await res.blob();
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        if (blob.type === 'image/png') {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = URL.createObjectURL(blob);
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 300;
        canvas.height = img.naturalHeight || 300;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        const pngBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png'),
        );
        if (pngBlob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
          return;
        }
      }
      await navigator.clipboard?.writeText(mediaAttachment.url);
    } catch {
      try {
        await navigator.clipboard?.writeText(mediaAttachment.url);
      } catch {
        // silent
      }
    }
  };

  const handleDownload = async () => {
    if (!mediaAttachment?.url) return;
    const filename =
      mediaAttachment.fileName ||
      (mediaAttachment as any).name ||
      mediaAttachment.url.split('/').pop() ||
      'media';
    try {
      const res = await fetch(mediaAttachment.url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      const a = document.createElement('a');
      a.href = mediaAttachment.url;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleTranslate = () => {
    if (message.body) {
      const url = `https://translate.google.com/?sl=auto&text=${encodeURIComponent(message.body)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Status calculation matching Telegram
  const isSending =
    message.status === 'SENDING' ||
    Boolean((message as unknown as { isPending?: boolean })?.isPending);
  const isError = message.status === 'ERROR';
  const isRead =
    isReadByOther ||
    message.status === 'READ' ||
    Boolean(message.readBy && message.readBy.length > 0);
  const isSent = message.status === 'SENT';

  const statusLabel = isError
    ? 'Failed'
    : isSending
      ? 'Sending...'
      : isRead
        ? 'Read'
        : isSent
          ? 'Sent'
          : 'Delivered';

  const formattedDate = formatFullMessageDate(message.createdAt || new Date());

  const itemButtonClass =
    'w-full flex items-center gap-3 px-3 py-2 text-[13.5px] font-medium text-white/90 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-100 active:scale-[0.98] cursor-pointer group';
  const iconClass = 'w-4 h-4 text-white/70 group-hover:text-white shrink-0 transition-colors';
  const dangerButtonClass =
    'w-full flex items-center gap-3 px-3 py-2 text-[13.5px] font-medium text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 rounded-xl transition-all duration-100 active:scale-[0.98] cursor-pointer group';

  const isVisible = mounted && !isClosing;

  return createPortal(
    <>
      {/* Invisible backdrop to dismiss click outside smoothly */}
      <div
        data-testid="context-menu-backdrop"
        className="fixed inset-0 z-[999] bg-transparent cursor-default select-none"
        onClick={(e) => {
          e.stopPropagation();
          requestClose();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          requestClose();
        }}
      />

      {/* Floating Menu Container with Smooth Appearance & Exit */}
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
        }}
        className={`z-[1000] flex flex-col gap-1.5 select-none origin-top transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isVisible
            ? 'opacity-100 scale-100 animate-telegramMenuIn'
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Telegram Quick Reactions Pill Bar using MessageReactionDock with TelegramAppleEmoji */}
        {onReact && (
          <div
            data-testid="context-menu-reactions"
            className="self-start overflow-visible transition-all duration-200 ease-out animate-telegramReactionsExpand origin-left"
          >
            <MessageReactionDock
              onPick={(emoji, origin) => {
                onReact(emoji, origin);
                requestClose();
              }}
              onExpand={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                // Immediately close this context menu because the expanded reactions picker is opening
                onClose();
                if (onOpenExpandedPicker) {
                  onOpenExpandedPicker({
                    x: rect.left,
                    y: rect.top,
                  });
                } else if (onOpenFullPicker) {
                  onOpenFullPicker();
                }
              }}
            />
          </div>
        )}

        {/* Main Context Menu Card */}
        <div className="w-[230px] rounded-2xl bg-[#181926]/95 dark:bg-[#181926]/95 backdrop-blur-2xl border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.65)] py-1.5 px-1 flex flex-col">
          {/* Status Header: Timestamp & Sent/Delivered/Read indicator */}
          <div className="px-3 py-1.5 flex items-center gap-2.5 text-[12.5px] font-medium text-gray-300 dark:text-gray-200 select-none border-b border-white/10 mb-1">
            <span className="shrink-0 flex items-center justify-center">
              {isOwnMessage ? (
                isError ? (
                  <AlertCircle size={15} className="text-rose-400 stroke-2" />
                ) : isSending ? (
                  <Clock size={14} className="text-gray-400 animate-spin" />
                ) : isRead ? (
                  <CheckCheck size={16} className="text-sky-400 stroke-[2.4]" />
                ) : (
                  <Check size={16} className="text-gray-400 stroke-2" />
                )
              ) : (
                <Clock size={14} className="text-gray-400" />
              )}
            </span>
            <span className="text-[12.5px] font-medium truncate" title={formattedDate}>
              {formattedDate}
            </span>
            {isOwnMessage && (
              <span className="ml-auto text-[11px] font-normal text-gray-400/80 tracking-tight">
                {statusLabel}
              </span>
            )}
          </div>

          {/* Action: Reply */}
          {onReply && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReply();
                requestClose();
              }}
              className={itemButtonClass}
            >
              <Reply size={16} className={iconClass} />
              <span>Reply</span>
            </button>
          )}

          {/* Action: Edit (ONLY visible on own messages!) */}
          {isOwnMessage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
                requestClose();
              }}
              className={itemButtonClass}
            >
              <Pencil size={16} className={iconClass} />
              <span>Edit</span>
            </button>
          )}

          {/* Action: Copy Media (for images/gifs) */}
          {isImage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyMedia();
                requestClose();
              }}
              className={itemButtonClass}
            >
              <Copy size={16} className={iconClass} />
              <span>Copy Media</span>
            </button>
          )}

          {/* Action: Download (for images, videos, files) */}
          {hasMedia && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
                requestClose();
              }}
              className={itemButtonClass}
            >
              <Download size={16} className={iconClass} />
              <span>Download</span>
            </button>
          )}

          {/* Action: Copy (or Copy message text) */}
          {Boolean(message.body) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
                requestClose();
              }}
              className={itemButtonClass}
            >
              <Copy size={16} className={iconClass} />
              <span>Copy</span>
            </button>
          )}

          {/* Action: Translate */}
          {Boolean(message.body) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleTranslate();
                requestClose();
              }}
              className={itemButtonClass}
            >
              <Languages size={16} className={iconClass} />
              <span>Translate</span>
            </button>
          )}

          {/* Action: Pin / Unpin */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
              requestClose();
            }}
            className={itemButtonClass}
          >
            {message.isPinned ? (
              <>
                <PinOff size={16} className={iconClass} />
                <span>Unpin</span>
              </>
            ) : (
              <>
                <Pin size={16} className={iconClass} />
                <span>Pin</span>
              </>
            )}
          </button>

          {/* Action: Forward */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onForward();
              requestClose();
            }}
            className={itemButtonClass}
          >
            <Forward size={16} className={iconClass} />
            <span>Forward</span>
          </button>

          {/* Action: Select */}
          {onSelectMessage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectMessage();
                requestClose();
              }}
              className={itemButtonClass}
            >
              <CheckSquare size={16} className={iconClass} />
              <span>Select</span>
            </button>
          )}

          {/* Action: Delete */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              requestClose();
            }}
            className={dangerButtonClass}
          >
            <Trash2
              size={16}
              className="w-4 h-4 text-rose-400 group-hover:text-rose-300 shrink-0"
            />
            <span>Delete</span>
          </button>

          {/* Action: Report (only for messages from others) */}
          {!isOwnMessage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReport();
                requestClose();
              }}
              className={dangerButtonClass}
            >
              <Flag
                size={16}
                className="w-4 h-4 text-rose-400 group-hover:text-rose-300 shrink-0"
              />
              <span>Report</span>
            </button>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
