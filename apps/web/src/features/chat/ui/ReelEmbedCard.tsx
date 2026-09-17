import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Play, Pause } from 'lucide-react';
import { apiClient } from '@/shared/api/httpClient';
import { type ReelItem, DEFAULT_SEED_REELS } from '@/entities/reel';

interface ReelEmbedCardProps {
  reelId: string;
  isOwnMessage?: boolean;
}

export const ReelEmbedCard: React.FC<ReelEmbedCardProps> = ({ reelId }) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const { data: reel } = useQuery<ReelItem>({
    queryKey: ['reel-embed', reelId],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<ReelItem>(`/reels/${reelId}`);
        return data;
      } catch {
        const seed = DEFAULT_SEED_REELS.find((r) => r.id === reelId);
        if (seed) return seed;
        return {
          id: reelId,
          authorId: 'user-profkino',
          caption: 'Reel Video',
          videoUrl: '/videos/sample-reel.mp4',
          hlsUrl: null,
          thumbnailUrl: '/images/profkino-reel-preview.webp',
          blurhash: null,
          thumbhash: null,
          duration: 15,
          width: 720,
          height: 1280,
          audioTitle: 'Original Audio',
          audioArtist: 'PROFKINO',
          audioUrl: null,
          viewsCount: 100,
          likesCount: 50,
          commentsCount: 2,
          sharesCount: 1,
          createdAt: new Date().toISOString(),
          author: {
            id: 'user-profkino',
            username: 'profkino',
            displayName: 'PROFKINO',
            avatar:
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          },
        };
      }
    },
    staleTime: 1000 * 60 * 10,
  });

  if (!reel) return null;

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) {
      navigate(`/reels?id=${reel.id}`);
      return;
    }

    if (video.paused) {
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => navigate(`/reels?id=${reel.id}`));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleOpenReel = () => {
    navigate(`/reels?id=${reel.id}`);
  };

  return (
    <div
      onClick={handleOpenReel}
      className="mt-1 mb-1.5 w-44 sm:w-52 aspect-[9/16] max-h-[360px] rounded-2xl overflow-hidden relative shadow-xl bg-zinc-900 border border-white/10 group cursor-pointer select-none"
    >
      {/* Video stream matching user's Image 2 */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.thumbnailUrl || undefined}
        loop
        playsInline
        className="w-full h-full object-cover"
        onEnded={() => setIsPlaying(false)}
      />

      {/* Dim overlay */}
      <div className="absolute inset-0 bg-black/25 group-hover:bg-black/15 transition-colors" />

      {/* Centered Play / Pause Button matching user's Image 2 */}
      <div
        onClick={handleTogglePlay}
        className="absolute inset-0 flex items-center justify-center cursor-pointer"
        aria-label={isPlaying ? 'Пауза' : 'Відтворити'}
      >
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isPlaying
              ? 'opacity-0 group-hover:opacity-100 bg-black/50 text-white'
              : 'opacity-90 group-hover:scale-110 bg-black/40 backdrop-blur-xs text-white'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 fill-white" />
          ) : (
            <Play className="w-6 h-6 fill-white ml-0.5" />
          )}
        </div>
      </div>

      {/* Bottom Author Avatar matching user's Image 2 */}
      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2 pointer-events-none">
        {reel.author.avatar ? (
          <img
            src={reel.author.avatar}
            alt={reel.author.username}
            className="w-7 h-7 rounded-full object-cover ring-1.5 ring-white/70 shadow-md"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-linear-to-tr from-pink-500 to-indigo-500 flex items-center justify-center font-bold text-white text-[10px] ring-1.5 ring-white/70 shadow-md">
            {reel.author.username.slice(0, 2).toUpperCase()}
          </div>
        )}
        <span className="text-[11px] font-bold text-white drop-shadow truncate max-w-[110px]">
          {reel.author.displayName || reel.author.username}
        </span>
      </div>
    </div>
  );
};
