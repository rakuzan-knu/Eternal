import React from 'react';
import type { ReelItem } from '../api/reelsApi';
import { BlurHashImage } from '@/shared/ui/BlurHashImage';
import { Play } from 'lucide-react';

interface ReelPlaceholderProps {
  reel: ReelItem;
}

/**
 * Enterprise Lightweight Reel Placeholder
 *
 * Rendered for reels outside the active viewport window (distance > 1).
 * Preserves exact layout height, aspect ratio, and snap alignment while consuming
 * ~4 DOM nodes and 0 hardware video decoder handles.
 */
export const ReelPlaceholder: React.FC<ReelPlaceholderProps> = React.memo(({ reel }) => {
  return (
    <div className="relative flex items-center justify-center gap-3 sm:gap-4.5 w-full h-[100dvh] sm:h-[min(calc(100dvh-120px),720px)] max-w-sm sm:max-w-md my-auto select-none">
      {/* Video Container Placeholder */}
      <div className="relative w-full h-full max-w-[380px] sm:max-w-[420px] aspect-9/16 rounded-none sm:rounded-3xl overflow-hidden bg-zinc-950 shadow-2xl border-0 sm:border border-white/10 flex items-center justify-center">
        {reel.thumbnailUrl ? (
          <img
            src={reel.thumbnailUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover opacity-60 filter blur-[1px]"
          />
        ) : reel.blurhash ? (
          <BlurHashImage
            blurhash={reel.blurhash}
            src=""
            alt=""
            className="w-full h-full object-cover opacity-50"
          />
        ) : (
          <div className="w-full h-full bg-linear-to-b from-zinc-900 via-zinc-950 to-black flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <Play className="w-8 h-8 text-white/30 fill-white/20 ml-1" />
            </div>
          </div>
        )}

        {/* Minimal caption preview bar */}
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
          <div className="h-3 w-28 bg-white/20 rounded-full mb-2 animate-pulse" />
          <div className="h-2.5 w-48 bg-white/10 rounded-full" />
        </div>
      </div>

      {/* Geometry spacer for desktop action rail */}
      <div className="hidden sm:flex flex-col items-center pb-2 z-20 shrink-0 w-11 sm:w-12" />
    </div>
  );
});

ReelPlaceholder.displayName = 'ReelPlaceholder';
