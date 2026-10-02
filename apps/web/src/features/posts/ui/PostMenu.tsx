import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { useUIStore } from '@/shared/model/useUIStore';
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
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const activePostMenuId = useUIStore((s) => s.activePostMenuId);
  const setActivePostMenuId = useUIStore((s) => s.setActivePostMenuId);
  const open = activePostMenuId === postId;

  const setOpen = (valOrFn: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof valOrFn === 'function' ? valOrFn(open) : valOrFn;
    setActivePostMenuId(nextVal ? postId : null);
  };

  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hidePost = useHiddenPostsStore((s) => s.hidePost);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    return () => {
      if (useUIStore.getState().activePostMenuId === postId) {
        useUIStore.getState().setActivePostMenuId(null);
      }
    };
  }, [postId]);

  useLayoutEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedHeight = isOwner ? 340 : 250;
      if (spaceBelow < estimatedHeight && rect.top > spaceBelow) {
        setPlacement('top');
      } else {
        setPlacement('bottom');
      }
    }
  }, [open, isOwner]);

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

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

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
          ? 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-500/10'
          : 'text-gray-800 dark:text-gray-200 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
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
        className="text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div
          ref={menuRef}
          className={`absolute right-0 ${
            placement === 'top'
              ? 'bottom-full mb-1.5 origin-bottom-right'
              : 'top-full mt-1.5 origin-top-right'
          } z-50 w-64 max-h-[calc(100vh-24px)] overflow-y-auto custom-scrollbar glass-modal border border-black/10 dark:border-white/12 rounded-2xl shadow-2xl p-1.5 animate-fadeIn space-y-0.5 text-gray-800 dark:text-gray-200`}
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
                  <BookmarkCheck size={16} className="text-sky-500 dark:text-sky-400" />
                ) : (
                  <Bookmark size={16} />
                ),
                isSaved ? 'Unsave post' : 'Save post',
                onSave,
              )}
              {item(<Link2 size={16} />, 'Copy link', handleCopyLink)}
              {item(
                <Trash2 size={16} className="text-red-600 dark:text-red-400" />,
                'Delete your post',
                onDelete,
                'danger',
              )}
            </>
          ) : (
            <>
              {item(
                isSaved ? (
                  <BookmarkCheck size={16} className="text-sky-500 dark:text-sky-400" />
                ) : (
                  <Bookmark size={16} />
                ),
                isSaved ? 'Unsave post' : 'Save post',
                onSave,
              )}
              {item(<EyeOff size={16} />, 'Hide post', onHide ? onHide : () => hidePost(postId))}
              {item(<UserX size={16} />, 'Block author', onBlockAuthor)}
              {item(<Link2 size={16} />, 'Copy link', handleCopyLink)}
              {item(
                <Flag size={16} className="text-red-600 dark:text-red-400" />,
                'Report',
                onReport,
                'danger',
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default PostMenu;
