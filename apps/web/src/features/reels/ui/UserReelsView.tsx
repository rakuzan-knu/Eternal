import React from 'react';
import { Film, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserReels } from '../api/reelsApi';
import { BlurHashImage } from '@/shared/ui/BlurHashImage';

interface UserReelsViewProps {
  userId: string;
}

export const UserReelsView: React.FC<UserReelsViewProps> = ({ userId }) => {
  const { data, isLoading } = useUserReels(userId);
  const navigate = useNavigate();

  const reels = data?.pages.flatMap((page) => page.data) ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="aspect-9/16 rounded-2xl bg-zinc-900/80 animate-pulse border border-white/5"
          />
        ))}
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/5 rounded-4xl bg-white/1">
        <Film className="w-10 h-10 text-zinc-600 mb-3" />
        <p className="text-gray-400 font-medium text-base">No reels published yet</p>
        <p className="text-gray-600 text-xs mt-1">
          Short videos uploaded by this user will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {reels.map((reel) => (
        <div
          key={reel.id}
          onClick={() => navigate(`/reels?id=${reel.id}`)}
          className="group relative aspect-9/16 rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/6 shadow-md hover:border-pink-500/50 transition-all hover:scale-[1.02]"
        >
          {reel.blurhash || reel.thumbnailUrl ? (
            <BlurHashImage
              blurhash={reel.blurhash}
              src={reel.thumbnailUrl}
              alt={reel.caption}
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={reel.videoUrl}
              className="w-full h-full object-cover pointer-events-none"
              preload="metadata"
            />
          )}

          {/* Dark gradient on bottom */}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

          {/* Views count badge */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-semibold drop-shadow">
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{reel.viewsCount}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
