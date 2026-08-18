import React, { useRef, useState, useEffect } from 'react';
import {
  MoreHorizontal,
  EyeOff,
  Bookmark,
  BookmarkCheck,
  Flag,
  UserX,
  Pencil,
  Trash2,
  HeartOff,
  MessageSquareOff,
  Link2,
  Pin,
  PinOff,
} from 'lucide-react';
import { useClickOutside } from '../../../shared/lib/useClickOutside';
import { useHiddenPostsStore } from '../../../shared/model/useHiddenPostsStore';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';

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
  const ref = useRef<HTMLDivElement>(null);
  const hidePost = useHiddenPostsStore((s) => s.hidePost);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useClickOutside(ref, () => {
    setOpen(false);
  });

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
          : 'text-gray-200 hover:text-white hover:bg-white/[0.08]'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className={`relative ${open ? 'z-50' : 'z-10'}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More options"
        className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all cursor-pointer"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-64 bg-[#141418]/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/80 p-1.5 animate-fadeIn space-y-0.5">
          {isOwner ? (
            <>
              {item(
                isPinned ? <PinOff size={16} /> : <Pin size={16} />,
                isPinned ? 'Unpin from profile' : 'Pin to top of profile',
                onTogglePin,
              )}
              {item(<Pencil size={16} />, 'Edit post', onEdit)}
              {item(
                <Trash2 size={16} className="text-red-400" />,
                'Delete your post',
                onDelete,
                'danger',
              )}
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
              {item(<Flag size={16} className="text-red-400" />, 'Report', onReport, 'danger')}
              {item(<Link2 size={16} />, 'Copy link', handleCopyLink)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default PostMenu;
