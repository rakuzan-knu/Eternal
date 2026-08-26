import React, { useState } from 'react';
import { Play, Pause, Music2, ExternalLink } from 'lucide-react';
import type { LinkEmbedData } from '@/entities/opengraph/model/types';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';

interface AudioEmbedCardProps {
  data: LinkEmbedData;
  className?: string;
}

export const AudioEmbedCard: React.FC<AudioEmbedCardProps> = ({ data, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const audio = data.audio;
  const isSpotify = audio?.provider === 'spotify' || data.url.includes('spotify.com');
  const isSoundCloud = audio?.provider === 'soundcloud' || data.url.includes('soundcloud.com');

  const title = data.title || 'Audio Track';
  const artist = audio?.artist || data.siteName || (isSpotify ? 'Spotify' : 'SoundCloud');
  const cover = data.image;
  const embedUrl = audio?.embedUrl;

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Singleton Playback rule: stop all active voice notes / video notes
    try {
      useActiveMediaPlaybackStore.getState().stopAll();
    } catch {
      // ignore
    }

    setIsExpanded(!isExpanded);
  };

  const handleExternalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (isExpanded && embedUrl) {
    return (
      <div
        data-testid="audio-embed-card-expanded"
        className={`w-full max-w-[360px] rounded-xl overflow-hidden bg-[#12111a]/95 border border-white/10 shadow-lg ${
          isSpotify ? 'h-36 sm:h-40' : 'h-32 sm:h-36'
        } ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={embedUrl}
          title={title}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          className="w-full h-full border-0"
        />
      </div>
    );
  }

  return (
    <div
      data-testid="audio-embed-card"
      className={`relative w-full max-w-[360px] h-20 rounded-xl bg-[#12111a]/90 hover:bg-[#161522] backdrop-blur-md border border-white/10 hover:border-purple-500/40 p-2 flex items-center gap-3 transition-all duration-200 shadow-lg select-none group cursor-pointer ${className}`}
      onClick={handleTogglePlay}
    >
      {/* Square Cover / Icon */}
      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-black/40 shrink-0 border border-white/5 flex items-center justify-center">
        {cover && !imageError ? (
          <img
            src={cover}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-black">
            <Music2 className="w-6 h-6 text-purple-400" />
          </div>
        )}

        {/* Small Provider Watermark */}
        <div className="absolute bottom-1 right-1 p-0.5 rounded bg-black/70 backdrop-blur-xs">
          {isSpotify ? (
            <span className="w-2.5 h-2.5 rounded-full bg-[#1DB954] block" title="Spotify" />
          ) : isSoundCloud ? (
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5500] block" title="SoundCloud" />
          ) : null}
        </div>
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <h4 className="text-xs sm:text-[13px] font-bold text-white group-hover:text-purple-300 transition-colors truncate">
          {title}
        </h4>
        <span className="text-[11px] text-gray-400 truncate font-normal">{artist}</span>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[9.5px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded bg-white/5 text-gray-400 border border-white/5">
            {isSpotify ? 'Spotify' : isSoundCloud ? 'SoundCloud' : 'Audio'}
          </span>
        </div>
      </div>

      {/* Play / Action Buttons */}
      <div className="flex items-center gap-1 shrink-0 pr-1">
        {embedUrl && (
          <button
            type="button"
            onClick={handleTogglePlay}
            className="w-8 h-8 rounded-full bg-purple-600/80 hover:bg-purple-600 backdrop-blur-md flex items-center justify-center text-white transition-transform group-hover:scale-105 shadow-md shadow-purple-600/40 border border-purple-400/30 cursor-pointer"
            title={isExpanded ? 'Collapse player' : 'Play audio'}
          >
            {isExpanded ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white ml-0.5" />
            )}
          </button>
        )}

        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleExternalClick}
          className="p-1.5 rounded-lg bg-black/40 hover:bg-black/70 text-gray-400 hover:text-white transition-colors border border-white/5"
          title="Open in new tab"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
