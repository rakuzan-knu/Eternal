import { Link } from 'react-router-dom';
import { Film, Play } from 'lucide-react';
import { BlurHashImage } from '@/shared/ui/BlurHashImage';
import type { ReelItem } from '@/entities/reel';

export function ReelGrid({ reels }: { reels: ReelItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      {reels.map((reel) => (
        <Link
          key={reel.id}
          to={`/reels?id=${encodeURIComponent(reel.id)}`}
          aria-label={`Watch ${reel.caption || `reel by ${reel.author.username}`}`}
          className="group relative aspect-9/16 rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 shadow-md hover:border-purple-400/60 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-400"
        >
          {reel.blurhash || reel.thumbnailUrl ? (
            <BlurHashImage
              blurhash={reel.blurhash}
              src={reel.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-linear-to-b from-zinc-800 to-zinc-950">
              <Film className="size-8 text-zinc-500" aria-hidden="true" />
            </div>
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-black/90 via-transparent to-transparent"
          />
          <div className="absolute inset-x-3 bottom-3 text-white">
            <p className="line-clamp-2 text-sm font-semibold mb-2">
              {reel.caption || `@${reel.author.username}`}
            </p>
            <span className="flex items-center gap-1.5 text-xs text-white/80">
              <Play size={13} aria-hidden="true" /> {reel.viewsCount.toLocaleString()} views
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
