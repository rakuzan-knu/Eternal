import React, { useMemo } from 'react';
import { Sparkles, HeartHandshake } from 'lucide-react';
import type { ProfileShowcaseDto } from '@backend/common/contracts';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useShowcase } from '@/entities/showcase/model/useShowcase';

interface TasteMatchBannerProps {
  targetShowcase: ProfileShowcaseDto;
  targetUsername: string;
  isOwner: boolean;
}

export const TasteMatchBanner: React.FC<TasteMatchBannerProps> = ({ targetShowcase, isOwner }) => {
  const { data: currentUser } = useCurrentUser();
  const { data: viewerShowcase } = useShowcase(currentUser?.username);

  const commonTitles = useMemo(() => {
    if (!currentUser || isOwner || !viewerShowcase) return [];

    const targetTitles = [
      targetShowcase.spotlightMedia?.title,
      ...targetShowcase.mediaItems.map((m) => m.title),
    ].filter(Boolean) as string[];

    const viewerTitles = [
      viewerShowcase.spotlightMedia?.title,
      ...viewerShowcase.mediaItems.map((m) => m.title),
    ].filter(Boolean) as string[];

    if (targetTitles.length === 0 || viewerTitles.length === 0) return [];

    const matches = targetTitles.filter((tTitle) =>
      viewerTitles.some((vTitle) => vTitle.trim().toLowerCase() === tTitle.trim().toLowerCase()),
    );

    return Array.from(new Set(matches));
  }, [currentUser, isOwner, viewerShowcase, targetShowcase]);

  if (commonTitles.length === 0) {
    return null;
  }

  const count = commonTitles.length;
  const wordEnding = count === 1 ? 'title' : 'titles';

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/50 via-purple-950/40 to-pink-950/40 backdrop-blur-2xl border border-indigo-500/30 p-3.5 shadow-xl transition-all duration-300 hover:border-indigo-400/50 group animate-fadeIn">
      {/* Background Accent Neon Glow */}
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-indigo-500/25 blur-2xl pointer-events-none transition-opacity group-hover:opacity-40" />

      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.5)]">
          <HeartHandshake size={15} className="animate-pulse" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 tracking-wide">
            ✨ You have {count} common {wordEnding}:
          </span>
        </div>
      </div>

      {/* Common Title Badges */}
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {commonTitles.map((title, idx) => (
          <span
            key={idx}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-500/15 border border-indigo-400/30 text-[11px] font-semibold text-indigo-100 shadow-sm backdrop-blur-md transition-transform hover:scale-105"
          >
            <Sparkles size={10} className="text-amber-300 shrink-0" />
            <span className="truncate max-w-[140px]">{title}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
