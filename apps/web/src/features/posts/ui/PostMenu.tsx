import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import {
  Bookmark,
  BookmarkCheck,
  EyeOff,
  Flag,
  HeartOff,
  Link2,
  MessageSquareOff,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Trash2,
  UserX,
} from 'lucide-react';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHiddenPostsStore } from '../../../shared/model/useHiddenPostsStore';

interface PostMenuProps {
  postId: string | number;
  isOwner?: boolean;
  isSaved?: boolean;
  isPinned?: boolean;
  hideLikesCount?: boolean;
  isCommentsDisabled?: boolean;
  onSave?: () => void;
  onReport?: () => void;
  onBlockAuthor?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onTogglePin?: () => void;
  onToggleHideLikes?: () => void;
  onToggleDisableComments?: () => void;
  onHide?: () => void;
  onOpenChange?: (isOpen: boolean) => void;
}

export function PostMenu({
  postId,
  isOwner,
  isSaved = false,
  isPinned = false,
  hideLikesCount = false,
  isCommentsDisabled = false,
  onSave,
  onReport,
  onBlockAuthor,
  onDelete,
  onEdit,
  onTogglePin,
  onToggleHideLikes,
  onToggleDisableComments,
  onHide,
  onOpenChange,
}: PostMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; right: number }>({
    top: 0,
    right: 12,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hidePost = useHiddenPostsStore((s) => s.hidePost);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const updateCoords = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const measuredHeight = menuRef.current?.offsetHeight;
    const estimatedHeight =
      measuredHeight && measuredHeight > 50 ? measuredHeight : isOwner ? 340 : 250;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;

    let nextCoords: { top?: number; bottom?: number; right: number };

    // If not enough room below and more space above, open ABOVE the trigger button
    if (spaceBelow < estimatedHeight && spaceAbove >= spaceBelow) {
      nextCoords = {
        bottom: Math.max(12, window.innerHeight - rect.top + gap),
        right: Math.max(12, Math.min(window.innerWidth - 12, window.innerWidth - rect.right)),
      };
    } else {
      nextCoords = {
        top: Math.max(12, Math.min(rect.bottom + gap, window.innerHeight - estimatedHeight - 12)),
        right: Math.max(12, Math.min(window.innerWidth - 12, window.innerWidth - rect.right)),
      };
    }

    setCoords(nextCoords);
  }, [isOwner]);

  useLayoutEffect(() => {
    if (open) {
      updateCoords();
      // Re-measure after mount to ensure pixel-perfect positioning with actual DOM height
      const rafId = requestAnimationFrame(() => {
        updateCoords();
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [open, updateCoords]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updateCoords();
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open, updateCoords]);

  const handleCopyLink = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const postUrl = `${origin}/post/${postId}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(postUrl);
      }
    } catch {
      // Fallback if needed
    }
    useMessageToastStore.getState().addToast({
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      conversationId: '',
      messageId: '',
      title: 'Link Copied',
      body: 'Post link copied to clipboard.',
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
    setOpen(false);
  };

  const item = (
    icon: React.ReactNode,
    label: string,
    onClick?: () => void,
    variant: 'default' | 'danger' = 'default',
  ) => (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
      className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-xl transition-colors cursor-pointer text-left ${
        variant === 'danger'
          ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
          : 'text-gray-200 hover:text-white hover:bg-white/8'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More options"
        className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all cursor-pointer"
      >
        <MoreHorizontal size={18} />
      </button>

      {open &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              right: `${coords.right}px`,
            }}
            className={`z-99999 w-64 max-h-[calc(100vh-24px)] overflow-y-auto custom-scrollbar bg-[#141418]/95 backdrop-blur-2xl border border-white/12 rounded-2xl shadow-2xl shadow-black/80 p-1.5 animate-fadeIn space-y-0.5 ${
              coords.bottom !== undefined ? 'origin-bottom-right' : 'origin-top-right'
            }`}
          >
            {isOwner ? (
              <>
                {item(
                  isPinned ? <PinOff size={16} /> : <Pin size={16} />,
                  isPinned ? 'Unpin from profile' : 'Pin to top of profile',
                  onTogglePin,
                )}
                {item(<Pencil size={16} />, 'Edit post', onEdit)}
                {item(
                  <HeartOff size={16} />,
                  hideLikesCount ? 'Show like count' : 'Hide like count',
                  onToggleHideLikes,
                )}
                {item(
                  <MessageSquareOff size={16} />,
                  isCommentsDisabled ? 'Enable commenting' : 'Disable commenting',
                  onToggleDisableComments,
                )}
                {item(
                  isSaved ? (
                    <BookmarkCheck size={16} className="text-sky-400" />
                  ) : (
                    <Bookmark size={16} />
                  ),
                  isSaved ? 'Unsave post' : 'Save post',
                  onSave,
                )}
                {item(<Link2 size={16} />, 'Copy link', handleCopyLink)}
                {item(
                  <Trash2 size={16} className="text-red-400" />,
                  'Delete your post',
                  onDelete,
                  'danger',
                )}
              </>
            ) : (
              <>
                {item(
                  isSaved ? (
                    <BookmarkCheck size={16} className="text-sky-400" />
                  ) : (
                    <Bookmark size={16} />
                  ),
                  isSaved ? 'Unsave post' : 'Save post',
                  onSave,
                )}
                {item(<EyeOff size={16} />, 'Hide post', onHide ? onHide : () => hidePost(postId))}
                {item(<UserX size={16} />, 'Block author', onBlockAuthor)}
                {item(<Link2 size={16} />, 'Copy link', handleCopyLink)}
                {item(<Flag size={16} className="text-red-400" />, 'Report', onReport, 'danger')}
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

export default PostMenu;
