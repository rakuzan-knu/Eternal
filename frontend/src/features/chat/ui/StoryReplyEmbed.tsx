import React, { useState } from 'react';
import { Clock, Play, Sparkles } from 'lucide-react';
import type { AttachmentView } from '../../../entities/chat/model/types';

interface StoryReplyEmbedProps {
  attachment?:
    AttachmentView | { url?: string; type?: string; name?: string; size?: number } | null;
  createdAt?: string;
  isOwnMessage?: boolean;
}

export const StoryReplyEmbed: React.FC<StoryReplyEmbedProps> = ({
  attachment,
  createdAt,
  isOwnMessage,
}) => {
  const [hasError, setHasError] = useState(false);

  // Check 24-hour expiration based on message creation if no metadata
  const isExpired = createdAt
    ? Date.now() - new Date(createdAt).getTime() > 24 * 60 * 60 * 1000
    : false;

  const showUnavailable = !attachment?.url || hasError || isExpired;

  if (showUnavailable) {
    return (
      <div className="mb-2.5 p-2.5 rounded-2xl bg-[#12131d]/90 backdrop-blur-2xl border border-white/[0.08] flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-all">
        <div className="w-10 h-14 rounded-xl bg-white/[0.04] border border-white/10 shrink-0 flex items-center justify-center backdrop-blur-md shadow-inner">
          <Clock size={18} className="text-purple-300/70 animate-pulse" />
        </div>
        <div className="flex flex-col min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-purple-300 tracking-tight">
              Ответ на историю
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400/40" />
          </div>
          <span className="text-[11px] text-gray-400 font-normal leading-snug mt-0.5">
            История недоступна или срок её действия истек
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2.5 p-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-purple-500/25 flex items-center gap-2.5 shadow-[0_4px_16px_rgba(139,92,246,0.15)] group/story hover:border-purple-500/40 transition-colors">
      <div className="relative w-10 h-14 rounded-xl overflow-hidden bg-purple-950/60 border border-white/15 shrink-0 flex items-center justify-center">
        {attachment.type === 'VIDEO' ? (
          <>
            <video
              src={attachment.url}
              className="w-full h-full object-cover"
              onError={() => setHasError(true)}
              muted
              playsInline
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Play size={12} className="text-white fill-white drop-shadow-md" />
            </div>
          </>
        ) : (
          <img
            src={attachment.url}
            alt="Story Preview"
            className="w-full h-full object-cover group-hover/story:scale-105 transition-transform duration-300"
            onError={() => setHasError(true)}
          />
        )}
      </div>

      <div className="flex flex-col min-w-0 pr-1">
        <div className="flex items-center gap-1">
          <span className="text-[12px] font-bold text-purple-300">Ответ на историю</span>
          <Sparkles size={11} className="text-purple-400 shrink-0" />
        </div>
        <span className="text-[11px] text-gray-300/80 line-clamp-1">История автора</span>
      </div>
    </div>
  );
};
