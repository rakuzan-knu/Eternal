import React from 'react';
import { FileText, BarChart2, Bookmark } from 'lucide-react';
import { PostType } from '@/entities/post/model/types';
import Avatar from '@/shared/ui/Avatar';

interface CollectionCardCoverProps {
  coverImg?: string | null;
  post?: PostType | null;
  emptyIcon?: React.ReactNode;
}

export function CollectionCardCover({ coverImg, post, emptyIcon }: CollectionCardCoverProps) {
  if (coverImg) {
    return (
      <img
        src={coverImg}
        alt="Collection cover"
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-60"
      />
    );
  }

  if (post) {
    const isPoll = Boolean(post.poll);

    return (
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e153b]/85 via-[#131122]/90 to-[#0b0a10] p-3.5 flex flex-col justify-between overflow-hidden border border-white/[0.05]">
        {/* Top bar: Author + Type Badge */}
        <div className="flex items-center justify-between gap-1.5 z-10">
          <div className="flex items-center gap-1.5 min-w-0 pr-1">
            <Avatar size="sm" src={post.avatar} />
            <span className="text-[11px] font-medium text-gray-300 truncate">@{post.handle}</span>
          </div>

          {isPoll ? (
            <span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-pink-300 bg-pink-500/20 px-2 py-0.5 rounded-full border border-pink-500/30 shadow-sm">
              <BarChart2 size={11} /> Poll
            </span>
          ) : (
            <span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30 shadow-sm">
              <FileText size={11} /> Post
            </span>
          )}
        </div>

        {/* Text Preview in Typographic quotes */}
        <div className="my-auto py-1 z-10">
          <p className="text-[11px] text-gray-200 line-clamp-3 leading-relaxed font-normal tracking-wide italic select-none">
            {post.text ? `“${post.text}”` : isPoll ? '“Poll”' : 'Saved item'}
          </p>
        </div>

        {/* Decorative glass reflection blur */}
        <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-neutral-900/60 via-[#131317] to-black flex items-center justify-center text-white/20">
      {emptyIcon || <Bookmark size={32} />}
    </div>
  );
}
