import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Music2, ExternalLink } from 'lucide-react';
import type { LinkEmbedData } from '@/entities/opengraph/model/types';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { SpotifyBrandIcon } from '@/shared/ui/BrandIcons';
import {
  isSpotifyUrl,
  isSoundCloudUrl,
  isSpotifyMessageOrigin,
  parseSpotifyUrl,
  sanitizeImageUrl,
  sanitizeExternalUrl,
} from '@/shared/lib/urlSecurity';

interface AudioEmbedCardProps {
  data: LinkEmbedData;
  className?: string;
  autoExpand?: boolean;
}

export const AudioEmbedCard: React.FC<AudioEmbedCardProps> = ({
  data,
  className = '',
  autoExpand = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [oEmbedMeta, setOEmbedMeta] = useState<{ title?: string; artist?: string; cover?: string }>(
    {},
  );
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const audio = data.audio;
  const spotifyInfo = parseSpotifyUrl(data.url);
  const isSpotify = audio?.provider === 'spotify' || Boolean(spotifyInfo) || isSpotifyUrl(data.url);
  const isSoundCloud = audio?.provider === 'soundcloud' || isSoundCloudUrl(data.url);

  const audioType = audio?.audioType || (spotifyInfo ? spotifyInfo.type : 'track');
  const embedUrl =
    audio?.embedUrl ||
    (spotifyInfo
      ? `https://open.spotify.com/embed/${spotifyInfo.type}/${spotifyInfo.id}?utm_source=generator&theme=0`
      : null);

  // Fetch genuine Spotify metadata via oEmbed when missing or basic
  useEffect(() => {
    if (isSpotify && data.url) {
      fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(data.url)}`)
        .then((res) => res.json())
        .then((d) => {
          if (d && d.title) {
            setOEmbedMeta({
              title: d.title,
              artist: d.author_name || 'Spotify',
              cover: d.thumbnail_url,
            });
          }
        })
        .catch(() => {});
    }
  }, [isSpotify, data.url]);

  const activeTitle = oEmbedMeta.title || data.title || 'Spotify Track';
  const activeArtist =
    oEmbedMeta.artist || audio?.artist || data.siteName || (isSpotify ? 'Spotify' : 'SoundCloud');
  const activeCover = sanitizeImageUrl(oEmbedMeta.cover || data.image);

  const title = activeTitle;
  const artist = activeArtist;
  const cover = activeCover;

  const globalSpotifyTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const globalSpotifyPlaying = useSpotifyPlayerStore((s) => s.isPlaying);

  const isCurrentSpotifyPlaying = Boolean(
    isSpotify && spotifyInfo && globalSpotifyTrack?.id === spotifyInfo.id && globalSpotifyPlaying,
  );

  const launchInDock = () => {
    if (!isSpotify || !spotifyInfo) return;
    const trackId = spotifyInfo.id;
    useSpotifyPlayerStore.getState().playTrack({
      id: trackId,
      title: activeTitle,
      artist: activeArtist,
      albumArt: activeCover || '',
      durationMs: 180000,
      previewUrl: null,
      spotifyUrl: data.url,
      contextName: 'Spotify Chat Embed',
    });
  };

  // Listen to Spotify embed iframe events & focus clicks to trigger our Liquid Dock
  useEffect(() => {
    if (!isSpotify || !spotifyInfo) return;

    const trackId = spotifyInfo.id;

    const triggerDock = () => {
      const state = useSpotifyPlayerStore.getState();
      if (!state.isDockVisible || state.currentTrack?.id !== trackId) {
        state.playTrack(
          {
            id: trackId,
            title: activeTitle,
            artist: activeArtist,
            albumArt: activeCover || '',
            durationMs: 180000,
            previewUrl: null,
            spotifyUrl: data.url,
            contextName: 'Spotify Chat Embed',
          },
          undefined,
          undefined,
          false,
        );
      }
    };

    const handleWindowMessage = (e: MessageEvent) => {
      if (
        e.origin !== 'https://open.spotify.com' &&
        e.origin !== 'https://spotify.com' &&
        !isSpotifyMessageOrigin(e.origin)
      ) {
        return;
      }

      let msg = e.data;
      if (typeof msg === 'string') {
        try {
          msg = JSON.parse(msg);
        } catch {
          return;
        }
      }

      if (!msg || typeof msg !== 'object') return;

      const isPlaybackStarted =
        msg.type === 'playback_started' ||
        msg.type === 'playback_start' ||
        msg.event === 'playback_started';
      const isPlaybackActive =
        (msg.type === 'playback_update' || msg.event === 'playback_update') &&
        msg.payload &&
        msg.payload.isPaused === false;

      if (isPlaybackStarted || isPlaybackActive) {
        triggerDock();
      }
    };

    const handleWindowBlur = () => {
      setTimeout(() => {
        if (document.activeElement === iframeRef.current) {
          triggerDock();
        }
      }, 350);
    };

    window.addEventListener('message', handleWindowMessage);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('message', handleWindowMessage);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isSpotify, spotifyInfo, activeTitle, activeArtist, activeCover, data.url]);

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

  const shouldShowExpanded = (isExpanded || autoExpand) && Boolean(embedUrl);

  if (shouldShowExpanded) {
    const isTrack = audioType === 'track';
    // Discord Spotify compact player standard: 80px for tracks, 152px for playlists/albums
    const height = isSpotify ? (isTrack ? 80 : 152) : isSoundCloud ? 120 : 80;

    return (
      <div
        data-testid="audio-embed-card-expanded"
        className={`group/embed relative w-full max-w-full rounded-xl overflow-hidden shadow-lg border border-white/10 bg-[#12111a] select-none ${className}`}
        style={{ height: `${height}px`, minHeight: `${height}px`, maxHeight: `${height}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {isSpotify && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              launchInDock();
            }}
            className="absolute top-1.5 right-2 z-20 px-2 py-0.5 rounded-full bg-black/75 hover:bg-[#1DB954] text-white text-[10px] font-semibold backdrop-blur-md border border-white/20 flex items-center gap-1.5 opacity-0 group-hover/embed:opacity-100 transition-all shadow-lg cursor-pointer"
            title="Listen in Liquid Dock"
          >
            <SpotifyBrandIcon size={12} />
            <span>In Liquid Dock</span>
          </button>
        )}
        <iframe
          ref={iframeRef}
          src={embedUrl!}
          title={activeTitle}
          width="100%"
          height={height}
          frameBorder="0"
          scrolling="no"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="w-full h-full border-0 block"
          style={{
            borderRadius: '12px',
            border: 'none',
            overflow: 'hidden',
            display: 'block',
            width: '100%',
            height: `${height}px`,
          }}
        />
      </div>
    );
  }

  return (
    <div
      data-testid="audio-embed-card"
      className={`relative w-full max-w-full h-20 rounded-xl bg-[#12111a]/90 hover:bg-[#161522] backdrop-blur-md border border-white/10 hover:border-purple-500/40 p-2 flex items-center gap-3 transition-all duration-200 shadow-lg select-none group cursor-pointer ${className}`}
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
        {(embedUrl || isSpotify) && (
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center text-white transition-transform group-hover:scale-105 shadow-md cursor-pointer ${
              isSpotify
                ? 'bg-[#1DB954] hover:bg-[#1ed760] shadow-[#1DB954]/40 border border-[#1DB954]/40'
                : 'bg-purple-600/80 hover:bg-purple-600 shadow-purple-600/40 border border-purple-400/30'
            }`}
            title={
              (isSpotify ? isCurrentSpotifyPlaying : isExpanded) ? 'Pause audio' : 'Play audio'
            }
          >
            {(isSpotify ? isCurrentSpotifyPlaying : isExpanded) ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white ml-0.5" />
            )}
          </button>
        )}

        <a
          href={sanitizeExternalUrl(data.url, '#')}
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
