import React, { useRef, useState } from 'react';
import { MoreHorizontal, EyeOff, Bookmark, Flag, UserX } from 'lucide-react';
import { useClickOutside } from '../../../shared/lib/useClickOutside';
import { useHiddenPostsStore } from '../../../shared/model/useHiddenPostsStore';

interface PostMenuProps {
  postId: string | number;
  isOwner?: boolean;
  onSave?: () => void;
  onReport?: () => void;
  onBlockAuthor?: () => void;
}

export function PostMenu({ postId, isOwner, onSave, onReport, onBlockAuthor }: PostMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hidePost = useHiddenPostsStore((s) => s.hidePost);
  useClickOutside(ref, () => setOpen(false));

  const item = (icon: React.ReactNode, label: string, onClick?: () => void) => (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-200 hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer text-left"
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-gray-500 hover:text-white p-1.5 rounded-full hover:bg-white/5 transition-all cursor-pointer"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-64 bg-[#0f0f12]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 p-1.5 animate-fadeIn">
          {item(<Bookmark size={16} />, 'Save post', onSave)}
          {item(<EyeOff size={16} />, 'Hide post', () => hidePost(postId))}
          {!isOwner && item(<UserX size={16} />, 'Block author', onBlockAuthor)}
          {item(<Flag size={16} />, 'Report', onReport)}
        </div>
      )}
    </div>
  );
}
