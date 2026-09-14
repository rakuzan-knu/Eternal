import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, ExternalLink, Music2, Edit3, Cloud, Radio } from 'lucide-react';
import type { ProfileAnthemDto } from '@backend/common/contracts';
import { SpotifyBrandIcon, SoundCloudBrandIcon } from '@/shared/ui/BrandIcons';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { useJamSession } from '@/features/music/model/useJamSession';
import {
  getSafeSpotifyTrackUrl,
  extractSpotifyTrackId,
  unescapeHtml,
  isSoundCloudUrl,
  sanitizeImageUrl,
  sanitizeExternalUrl,
  sanitizePlatformUrl,
} from '@/shared/lib/spotifyUrl';

interface ProfileAnthemCardProps {
  anthem?: ProfileAnthemDto | null;
  isOwner: boolean;
  onEditClick?: () => void;
  targetUserId?: string;
}

export const ProfileAnthemCard: React.FC<ProfileAnthemCardProps> = ({
  anthem,
  isOwner,
  onEditClick,
  targetUserId,
}) => {
  const globalTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const isGlobalPlaying = useSpotifyPlayerStore((s) => s.isPlaying);
  const { joinJam, createJam } = useJamSession();

  if (!anthem) {
    if (!isOwner) return null;
    return (
      <div
        onClick={onEditClick}
        className="group relative overflow-hidden rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-dashed border-white/10 hover:border-indigo-400/40 p-3 mb-4 flex items-center justify-between cursor-pointer transition-all animate-fadeIn"
      >
        <div className="flex items-center gap-2.5 text-gray-400 group-hover:text-gray-200">
          <div className="p-2 rounded-xl bg-white/[0.04] text-indigo-400">
            <Music2 size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-300 group-hover:text-white">
              Pin Profile Anthem
            </span>
            <span className="text-[10px] text-gray-500">
              Add your favorite song to the top of your showcase
            </span>
          </div>
        </div>
        <button
          type="button"
          className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[11px] font-semibold text-indigo-300"
        >
          Add
        </button>
      </div>
    );
  }

  const isSoundCloud = Boolean(
    (anthem as any)?.source === 'soundcloud' ||
    (anthem as any)?.id?.startsWith('sc-') ||
    (anthem as any)?.trackId?.startsWith('sc-') ||
    (anthem as any)?.trackId?.startsWith('soundcloud-') ||
    isSoundCloudUrl(anthem?.spotifyUrl),
  );

  const isPlatformTrack = Boolean(
    (anthem as any)?.isPlatformTrack ||
    (anthem as any)?.source === 'platform' ||
    anthem?.spotifyUrl?.includes('/music/track/') ||
    anthem?.id?.startsWith('trk-') ||
    anthem?.id?.startsWith('track-'),
  );

  const safeTrackId = isSoundCloud
    ? (anthem as any)?.id || (anthem as any)?.trackId
    : extractSpotifyTrackId({
        id: (anthem as any)?.trackId || (anthem as any)?.id,
        trackId: (anthem as any)?.trackId,
        spotifyUrl: anthem?.spotifyUrl,
      }) ||
      (anthem as any)?.trackId ||
      (anthem as any)?.id;

  const isThisAnthemTrack = Boolean(
    anthem &&
    globalTrack &&
    ((safeTrackId && globalTrack.id === safeTrackId) ||
      (globalTrack.spotifyUrl &&
        anthem.spotifyUrl &&
        globalTrack.spotifyUrl === anthem.spotifyUrl) ||
      (globalTrack.title.toLowerCase() === unescapeHtml(anthem.title).toLowerCase() &&
        globalTrack.artist.toLowerCase() === unescapeHtml(anthem.artist).toLowerCase())),
  );

  // Exact 1:1 synchronization with Spotify Liquid Dock
  const isPlayingNow = isGlobalPlaying && isThisAnthemTrack;

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!anthem) return;

    if (isPlayingNow) {
      useSpotifyPlayerStore.getState().pause();
    } else if (isThisAnthemTrack && !isGlobalPlaying) {
      useSpotifyPlayerStore.getState().resume();
    } else {
      useSpotifyPlayerStore.getState().playTrack({
        id: safeTrackId || `track-${Date.now()}`,
        title: unescapeHtml(anthem.title),
        artist: unescapeHtml(anthem.artist),
        albumArt: anthem.albumArt,
        durationMs: (anthem as any).durationMs || 180000,
        previewUrl: anthem.previewUrl || null,
        spotifyUrl:
          anthem.spotifyUrl ||
          (isSoundCloud ? 'https://soundcloud.com' : getSafeSpotifyTrackUrl(anthem)),
        contextName: 'Profile Anthem',
        source: isSoundCloud ? 'soundcloud' : isPlatformTrack ? 'platform' : 'spotify',
        streamUrl: (anthem as any).streamUrl,
      });
    }
  };

  const handleListenTogether = (e: React.MouseEvent) => {
    e.stopPropagation();
    const jamId = (anthem as any)?.jamRoomId || (targetUserId ? `jam_${targetUserId}` : null);
    if (jamId) {
      joinJam(jamId);
    } else if (isOwner) {
      createJam('dj_only');
    } else {
      togglePlay(e);
    }
  };

  const trackLink = isSoundCloud
    ? sanitizePlatformUrl((anthem as any).spotifyUrl, ['soundcloud.com']) ||
      'https://soundcloud.com'
    : getSafeSpotifyTrackUrl({
        spotifyUrl: anthem.spotifyUrl,
        id: (anthem as any).trackId || (anthem as any).id,
        trackId: (anthem as any).trackId,
        title: anthem.title,
        artist: anthem.artist,
      });

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-[#121216]/90 border border-white/10 hover:border-white/20 p-3 mb-4 shadow-xl transition-all animate-fadeIn">
      {/* Ambient Album Glow under art when playing */}
      {isPlayingNow && (
        <div
          className="absolute -left-2 -top-2 w-28 h-28 rounded-full opacity-35 blur-2xl pointer-events-none transition-opacity duration-700"
          style={{
            backgroundColor: isPlatformTrack ? '#a855f7' : isSoundCloud ? '#FF5500' : '#1DB954',
          }}
        />
      )}

      <div className="relative flex items-center justify-between gap-3 z-10">
        {/* Left: Album Art with synchronized Play/Pause Button overlay */}
        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-lg group/cover">
          <img
            src={sanitizeImageUrl(anthem.albumArt)}
            alt={anthem.title}
            className="w-full h-full object-cover"
          />

          {/* Synchronized Play/Pause overlay button on album cover */}
          <button
            type="button"
            onClick={togglePlay}
            onPointerEnter={() => {
              if (!isSoundCloud && !isPlatformTrack && !isPlayingNow) {
                useSpotifyPlayerStore.getState().initSpotifySDK();
              }
            }}
            aria-label={isPlayingNow ? 'Pause Anthem' : 'Play Anthem Preview'}
            className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity cursor-pointer ${
              isPlayingNow ? 'opacity-100' : 'opacity-0 group-hover/cover:opacity-100'
            }`}
            title={isPlayingNow ? 'Pause' : 'Listen in Liquid Dock'}
          >
            {isPlayingNow ? (
              <Pause size={18} className="text-white fill-white" />
            ) : (
              <Play size={18} className="text-white fill-white ml-0.5" />
            )}
          </button>
        </div>

        {/* Center: Track Title & Artist */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isPlatformTrack ? (
              <Link
                to={`/music/track/${safeTrackId}`}
                className="text-xs font-bold text-white truncate tracking-wide hover:underline hover:text-purple-400 transition-colors"
                title={unescapeHtml(anthem.title)}
              >
                {unescapeHtml(anthem.title)}
              </Link>
            ) : (
              <a
                href={sanitizeExternalUrl(trackLink, '#')}
                target="_blank"
                rel="noreferrer"
                className={`text-xs font-bold text-white truncate tracking-wide hover:underline transition-colors ${
                  isSoundCloud ? 'hover:text-[#FF5500]' : 'hover:text-[#1DB954]'
                }`}
                title={unescapeHtml(anthem.title)}
              >
                {unescapeHtml(anthem.title)}
              </a>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-gray-400 font-medium truncate">
              {unescapeHtml(anthem.artist)}
            </span>
            {isPlatformTrack ? (
              <Radio size={11} className="text-purple-400" />
            ) : isSoundCloud ? (
              <SoundCloudBrandIcon size={12} />
            ) : (
              <SpotifyBrandIcon size={12} />
            )}
          </div>
        </div>

        {/* Right: Live Equalizer (synchronized when playing) + Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          {isPlayingNow && (
            <div
              className="flex items-end gap-0.5 h-4 w-4 justify-center mr-0.5"
              aria-hidden="true"
              title="Playing in Liquid Dock"
            >
              <span
                className={`w-0.5 rounded-full h-full animate-equalizerBar ${
                  isPlatformTrack ? 'bg-purple-400' : isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                }`}
                style={{ transformOrigin: 'bottom', animationDelay: '0s' }}
              />
              <span
                className={`w-0.5 rounded-full h-full animate-equalizerBar ${
                  isPlatformTrack ? 'bg-purple-400' : isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                }`}
                style={{ transformOrigin: 'bottom', animationDelay: '-0.3s' }}
              />
              <span
                className={`w-0.5 rounded-full h-full animate-equalizerBar ${
                  isPlatformTrack ? 'bg-purple-400' : isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                }`}
                style={{ transformOrigin: 'bottom', animationDelay: '-0.15s' }}
              />
              <span
                className={`w-0.5 rounded-full h-full animate-equalizerBar ${
                  isPlatformTrack ? 'bg-purple-400' : isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                }`}
                style={{ transformOrigin: 'bottom', animationDelay: '-0.45s' }}
              />
            </div>
          )}

          {isPlatformTrack ? (
            <button
              type="button"
              onClick={handleListenTogether}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] font-bold border border-purple-500/35 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Listen together with user"
            >
              <Radio size={12} className="animate-pulse" />
              <span>Listen Together</span>
            </button>
          ) : isSoundCloud ? (
            <a
              href={sanitizePlatformUrl(trackLink, ['soundcloud.com'], 'https://soundcloud.com')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FF5500]/15 hover:bg-[#FF5500]/25 text-[#FF5500] text-[10px] font-bold border border-[#FF5500]/30 transition-all cursor-pointer shadow-xs"
              title="Listen on SoundCloud"
            >
              <SoundCloudBrandIcon size={12} />
              <span>Listen on SoundCloud</span>
              <ExternalLink size={10} />
            </a>
          ) : (
            <a
              href={sanitizePlatformUrl(trackLink, ['spotify.com'], 'https://open.spotify.com')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#1DB954]/15 hover:bg-[#1DB954]/25 text-[#1DB954] text-[10px] font-bold border border-[#1DB954]/30 transition-all cursor-pointer shadow-xs"
              title="Listen on Spotify"
            >
              <SpotifyBrandIcon size={11} />
              <span>Listen on Spotify</span>
              <ExternalLink size={10} />
            </a>
          )}

          {isOwner && onEditClick && (
            <button
              type="button"
              onClick={onEditClick}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Change Profile Anthem"
            >
              <Edit3 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
