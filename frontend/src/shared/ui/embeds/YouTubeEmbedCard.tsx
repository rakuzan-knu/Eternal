import React, { useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { YoutubeIcon } from './EmbedIcons';
import type { LinkEmbedData } from '@/entities/opengraph/model/types';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';

interface YouTubeEmbedCardProps {
  data: LinkEmbedData;
  className?: string;
}

export const YouTubeEmbedCard: React.FC<YouTubeEmbedCardProps> = ({ data, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [coverTier, setCoverTier] = useState<1 | 2 | 3>(1);

  const videoId =
    data.youtube?.videoId ||
    (() => {
      try {
        const parsed = new URL(data.url);
        if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1);
        return parsed.searchParams.get('v') || null;
      } catch {
        return null;
      }
    })();

  if (!videoId) return null;

  const startSeconds = data.youtube?.startSeconds;
  const duration = data.youtube?.duration;
  const title = data.title || 'YouTube Video';
  const author = data.youtube?.author || data.siteName || 'YouTube';

  const iframeSrc = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1${
    startSeconds && startSeconds > 0 ? `&start=${startSeconds}` : ''
  }`;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Singleton Playback rule: stop all active voice notes / video notes
    try {
      useActiveMediaPlaybackStore.getState().stopAll();
    } catch {
      // Ignore if store is uninitialized
    }

    setIsPlaying(true);
  };

  const handleExternalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      data-testid="youtube-embed-card"
      className={`relative w-full max-w-[360px] aspect-video rounded-xl overflow-hidden bg-[#0d0c14] border border-white/10 select-none shadow-lg group transition-all duration-200 hover:border-purple-500/40 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {isPlaying ? (
        <iframe
          src={iframeSrc}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0"
        />
      ) : (
        <div className="relative w-full h-full cursor-pointer" onClick={handlePlayClick}>
          {/* Two-Tier Image Fallback Chain */}
          {coverTier === 1 ? (
            <img
              src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setCoverTier(2)}
            />
          ) : coverTier === 2 ? (
            <img
              src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setCoverTier(3)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1b1928] to-[#0a0a10] p-4 text-center">
              <YoutubeIcon className="w-10 h-10 text-red-500 mb-2 opacity-80" />
              <span className="text-xs text-gray-300 font-medium line-clamp-2">{title}</span>
            </div>
          )}

          {/* Dark Gradient Overlay for Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/60 pointer-events-none" />

          {/* Header Bar */}
          <div className="absolute top-0 inset-x-0 p-2.5 flex items-center justify-between z-10">
            <div className="flex items-center gap-1.5 min-w-0 pr-2">
              <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center shrink-0 shadow">
                <YoutubeIcon className="w-3 h-3 text-white fill-white" />
              </div>
              <span className="text-[11px] font-semibold text-white/90 truncate drop-shadow-md">
                {title}
              </span>
            </div>

            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleExternalClick}
              className="p-1 rounded-lg bg-black/50 hover:bg-black/80 text-white/80 hover:text-white backdrop-blur-md transition-all shrink-0 border border-white/10"
              title="Open on YouTube"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Centered Glassmorphism Play Button */}
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-purple-600/80 hover:bg-purple-600 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-all duration-200 shadow-lg shadow-purple-600/50 border border-purple-400/30 text-white">
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </div>
          </div>

          {/* Footer Info: Author & Duration / Start Timestamp */}
          <div className="absolute bottom-0 inset-x-0 p-2 flex items-center justify-between z-10 text-[11px] text-gray-300 pointer-events-none">
            <span className="truncate font-medium drop-shadow-md text-gray-200">{author}</span>

            <div className="flex items-center gap-1 shrink-0 ml-2">
              {startSeconds && startSeconds > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-purple-900/80 backdrop-blur-md border border-purple-500/30 text-[10px] font-mono text-purple-200 font-bold">
                  Start {Math.floor(startSeconds / 60)}:
                  {(startSeconds % 60).toString().padStart(2, '0')}
                </span>
              )}
              {duration && (
                <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono text-gray-200 font-bold">
                  {duration}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
