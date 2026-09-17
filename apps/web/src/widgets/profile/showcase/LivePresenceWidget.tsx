import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, ExternalLink, Pencil, Headphones, Send, Music, Radio } from 'lucide-react';
import type { ProfileShowcaseDto } from '@backend/common/contracts';
import {
  SpotifyBrandIcon,
  SoundCloudBrandIcon,
  SteamBrandIcon,
  TwitchBrandIcon,
  DiscordGamepadIcon,
} from '@/shared/ui/BrandIcons';
import { useLiveElapsedTimer } from '@/shared/lib/activityTimer';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { useJamSession } from '@/features/music/model/useJamSession';
import {
  unescapeHtml,
  isSoundCloudUrl,
  isSpotifyUrl,
  sanitizeExternalUrl,
  sanitizeImageUrl,
  sanitizePlatformUrl,
} from '@/shared/lib/spotifyUrl';
import { ShowcaseIntegrationCard } from './ShowcaseIntegrationCard';

interface LivePresenceWidgetProps {
  showcase: ProfileShowcaseDto;
  isOwner: boolean;
  onEditClick?: () => void;
}

const SpotifyPlayerCard: React.FC<{
  activity: any;
  isOwner: boolean;
  isPlayingPreview: boolean;
  onTogglePreview: (e: React.MouseEvent, url?: string | null) => void;
  showcaseUserId?: string;
}> = ({ activity, isOwner, isPlayingPreview, onTogglePreview, showcaseUserId }) => {
  const [progressMs, setProgressMs] = useState(activity.progressMs || 0);
  const [copiedLink, setCopiedLink] = useState(false);
  const elapsedTimer = useLiveElapsedTimer(activity.startedAt);
  const { joinJam, createJam } = useJamSession();

  const isPlatformTrack = Boolean(
    activity.isPlatformTrack ||
    activity.source === 'platform' ||
    activity.trackId?.startsWith('trk-') ||
    activity.trackId?.startsWith('track-') ||
    activity.externalUrl?.includes('/music/track/'),
  );

  const isSoundCloud = Boolean(
    activity.source === 'soundcloud' ||
    activity.trackId?.startsWith('sc-') ||
    activity.trackId?.startsWith('soundcloud-') ||
    isSoundCloudUrl(activity.externalUrl),
  );

  useEffect(() => {
    const duration = activity.durationMs || 1;
    // When paused, stop timer and freeze progressMs at exact paused position
    if (activity.isPaused) {
      setProgressMs(activity.progressMs || 0);
      return;
    }

    const drift = Math.max(0, Date.now() - (activity.updatedAt || Date.now()));
    const initialMs = Math.min(duration, (activity.progressMs || 0) + drift);
    setProgressMs(initialMs);

    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const nextMs = Math.min(duration, initialMs + elapsed);
      setProgressMs(nextMs);
    }, 1000);

    return () => clearInterval(interval);
  }, [
    activity.trackId,
    activity.progressMs,
    activity.updatedAt,
    activity.durationMs,
    activity.isPaused,
  ]);

  const formatTime = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const durationMs = activity.durationMs || 180000;
  const progressPercent = Math.min(100, Math.max(0, (progressMs / durationMs) * 100));

  const handleShareToChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    const trackUrl = isPlatformTrack
      ? `${window.location.origin}/music/track/${activity.trackId}`
      : isSoundCloud
        ? activity.externalUrl || 'https://soundcloud.com'
        : activity.externalUrl || `https://open.spotify.com/track/${activity.trackId}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(trackUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleListenTogether = (e: React.MouseEvent) => {
    e.stopPropagation();
    const jamId = activity.jamRoomId || (showcaseUserId ? `jam_${showcaseUserId}` : null);
    if (jamId) {
      joinJam(jamId);
    } else if (isOwner) {
      createJam('dj_only');
    } else {
      onTogglePreview(e, activity.previewUrl);
    }
  };

  return (
    <div
      className={`relative flex flex-col p-3.5 rounded-2xl bg-[#121316]/90 border shadow-md group/spotify transition-all ${
        activity.isPaused
          ? 'border-amber-400/25 shadow-amber-950/20'
          : isPlatformTrack
            ? 'border-purple-500/25 shadow-purple-950/20'
            : isSoundCloud
              ? 'border-[#FF5500]/25 shadow-orange-950/20'
              : 'border-[#1DB954]/20'
      }`}
    >
      {/* Top row: Artwork, Track Info, Equalizer */}
      <div className="flex items-center gap-3.5">
        {/* Album Art with Platform/Spotify Badge */}
        <div className="relative w-13 h-13 rounded-2xl overflow-hidden bg-[#18181b] shrink-0 border border-white/10 shadow-md group/art">
          {activity.imageUrl ? (
            <img
              src={sanitizeImageUrl(activity.imageUrl)}
              alt={activity.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center ${
                isPlatformTrack
                  ? 'text-purple-400'
                  : isSoundCloud
                    ? 'text-[#FF5500]'
                    : 'text-[#1DB954]'
              }`}
            >
              <Headphones size={22} />
            </div>
          )}

          {/* Badge: Platform / SoundCloud / Spotify */}
          {isPlatformTrack ? (
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#121316] border-2 border-[#18181b] flex items-center justify-center shadow-md text-purple-400"
              title="Platform Music"
            >
              <Radio size={10} />
            </div>
          ) : isSoundCloud ? (
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#121316] border-2 border-[#18181b] flex items-center justify-center shadow-md text-[#FF5500]"
              title="SoundCloud"
            >
              <SoundCloudBrandIcon size={11} />
            </div>
          ) : (
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#121316] border-2 border-[#18181b] flex items-center justify-center shadow-md"
              title="Spotify"
            >
              <SpotifyBrandIcon size={11} />
            </div>
          )}

          {/* Synchronized Play/Pause Button on Album Cover */}
          <button
            type="button"
            onClick={(e) => onTogglePreview(e, activity.previewUrl)}
            className={`absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center transition-opacity text-white cursor-pointer ${
              isPlayingPreview ? 'opacity-100' : 'opacity-0 group-hover/art:opacity-100'
            }`}
            title={isPlayingPreview ? 'Pause' : 'Listen in player'}
          >
            {isPlayingPreview ? (
              <Pause size={18} className="fill-white text-white" />
            ) : (
              <Play size={18} className="fill-white text-white translate-x-0.5" />
            )}
          </button>
        </div>

        {/* Track Title & Artist */}
        <div className="flex flex-col min-w-0 flex-1 justify-center">
          <div className="flex items-center gap-1.5 min-w-0">
            {isPlatformTrack ? (
              <Link
                to={`/music/track/${activity.trackId}`}
                className="text-[13px] font-bold text-white truncate hover:text-purple-400 hover:underline transition-colors"
                title={unescapeHtml(activity.title)}
              >
                {unescapeHtml(activity.title)}
              </Link>
            ) : isSoundCloud ? (
              <a
                href={
                  sanitizePlatformUrl(activity.externalUrl, ['soundcloud.com']) ||
                  'https://soundcloud.com'
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-bold text-white truncate hover:text-[#FF5500] hover:underline transition-colors"
                title={unescapeHtml(activity.title)}
              >
                {unescapeHtml(activity.title)}
              </a>
            ) : (
              <a
                href={
                  sanitizePlatformUrl(activity.externalUrl, ['spotify.com']) ||
                  (activity.trackId
                    ? `https://open.spotify.com/track/${encodeURIComponent(activity.trackId)}`
                    : 'https://open.spotify.com')
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-bold text-white truncate hover:text-[#1DB954] hover:underline transition-colors"
                title={unescapeHtml(activity.title)}
              >
                {unescapeHtml(activity.title)}
              </a>
            )}
          </div>

          <span className="text-xs text-gray-400 truncate mt-0.5 font-medium">
            {unescapeHtml(
              activity.subtitle || activity.artist || (isPlatformTrack ? 'Music Hub' : 'Spotify'),
            )}
          </span>

          {/* Elapsed Activity Timer / Paused Indicator */}
          {activity.isPaused ? (
            <div className="flex items-center gap-1.5 mt-1 text-amber-400">
              <Pause size={12} className="text-amber-400 fill-amber-400/40 shrink-0" />
              <span className="text-[11px] font-bold font-mono tracking-wide">Paused</span>
              {elapsedTimer && (
                <span className="text-[10px] text-gray-400 font-mono">• {elapsedTimer}</span>
              )}
            </div>
          ) : (
            <div
              className={`flex items-center gap-1.5 mt-1 ${
                isPlatformTrack
                  ? 'text-purple-400'
                  : isSoundCloud
                    ? 'text-[#FF5500]'
                    : 'text-[#1DB954]'
              }`}
            >
              {isPlatformTrack ? (
                <Radio size={12} className="shrink-0 animate-pulse text-purple-400" />
              ) : (
                <Music size={12} className="shrink-0" />
              )}
              <span className="text-[11px] font-semibold font-mono tracking-wide">
                {elapsedTimer
                  ? `${elapsedTimer} ${isPlatformTrack ? 'live' : 'listening'}`
                  : isPlatformTrack
                    ? 'Listening on platform'
                    : 'Listening now'}
              </span>
            </div>
          )}
        </div>

        {/* Equalizer Bars: animated when playing, resting when paused */}
        {activity.isPaused ? (
          <div className="flex items-end gap-1 h-5 shrink-0 px-1 py-0.5 opacity-60" title="Paused">
            <span className="w-1 bg-amber-400/70 rounded-full h-2" />
            <span className="w-1 bg-amber-400/70 rounded-full h-3.5" />
            <span className="w-1 bg-amber-400/70 rounded-full h-2.5" />
            <span className="w-1 bg-amber-400/70 rounded-full h-1.5" />
          </div>
        ) : (
          <div
            className="flex items-end gap-1 h-5 shrink-0 px-1 py-0.5"
            title={
              isPlatformTrack ? 'Listening on website' : isSoundCloud ? 'SoundCloud' : 'Spotify'
            }
          >
            <span
              className={`w-1 rounded-full h-full animate-[liveEqualizer_0.9s_ease-in-out_infinite] ${
                isPlatformTrack ? 'bg-purple-400' : isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
              }`}
              style={{ transformOrigin: 'bottom', animationDelay: '0s' }}
            />
            <span
              className={`w-1 rounded-full h-full animate-[liveEqualizer_0.8s_ease-in-out_infinite] ${
                isPlatformTrack ? 'bg-purple-400' : isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
              }`}
              style={{ transformOrigin: 'bottom', animationDelay: '-0.2s' }}
            />
            <span
              className={`w-1 rounded-full h-full animate-[liveEqualizer_1.05s_ease-in-out_infinite] ${
                isPlatformTrack ? 'bg-purple-400' : isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
              }`}
              style={{ transformOrigin: 'bottom', animationDelay: '-0.4s' }}
            />
            <span
              className={`w-1 rounded-full h-full animate-[liveEqualizer_0.75s_ease-in-out_infinite] ${
                isPlatformTrack ? 'bg-purple-400' : isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
              }`}
              style={{ transformOrigin: 'bottom', animationDelay: '-0.6s' }}
            />
          </div>
        )}
      </div>

      {/* Real-time Ticking Progress Bar */}
      <div className="flex flex-col gap-1 mt-2.5">
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              activity.isPaused
                ? 'bg-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                : isPlatformTrack
                  ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                  : isSoundCloud
                    ? 'bg-[#FF5500] shadow-[0_0_8px_rgba(255,85,0,0.5)]'
                    : 'bg-[#1DB954] shadow-[0_0_8px_rgba(29,185,84,0.5)]'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
          <span>{formatTime(progressMs)}</span>
          <span>{formatTime(durationMs)}</span>
        </div>
      </div>

      {/* Action Row: Listen Together / Open in Spotify or SoundCloud + Share */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/6">
        {isPlatformTrack ? (
          <button
            type="button"
            onClick={handleListenTogether}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-bold transition-all border border-purple-500/35 cursor-pointer shadow-xs active:scale-95"
            title="Listen together with user"
          >
            <Radio size={12} className="animate-pulse text-purple-400" />
            <span>Listen Together</span>
          </button>
        ) : isSoundCloud ? (
          <a
            href={
              sanitizePlatformUrl(activity.externalUrl, ['soundcloud.com']) ||
              'https://soundcloud.com'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FF5500]/15 hover:bg-[#FF5500]/25 text-[#FF5500] text-[11px] font-bold transition-all border border-[#FF5500]/30"
          >
            <SoundCloudBrandIcon size={12} />
            <span>SoundCloud</span>
            <ExternalLink size={10} />
          </a>
        ) : (
          <a
            href={
              sanitizePlatformUrl(activity.externalUrl, ['spotify.com']) ||
              (activity.trackId
                ? `https://open.spotify.com/track/${encodeURIComponent(activity.trackId)}`
                : 'https://open.spotify.com')
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#1DB954]/15 hover:bg-[#1DB954]/25 text-[#1DB954] text-[11px] font-bold transition-all border border-[#1DB954]/30"
          >
            <SpotifyBrandIcon size={12} />
            <span>Open in Spotify</span>
            <ExternalLink size={10} />
          </a>
        )}

        {/* Share to Chat button */}
        <button
          type="button"
          onClick={handleShareToChat}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[11px] font-semibold transition-all cursor-pointer border border-white/6"
          title="Copy track link"
        >
          <Send
            size={11}
            className={
              isPlatformTrack
                ? 'text-purple-400'
                : isSoundCloud
                  ? 'text-[#FF5500]'
                  : 'text-[#1DB954]'
            }
          />
          <span>{copiedLink ? 'Link copied!' : 'Share'}</span>
        </button>
      </div>
    </div>
  );
};

export const LivePresenceWidget: React.FC<LivePresenceWidgetProps> = ({
  showcase,
  isOwner,
  onEditClick,
}) => {
  const { activityStatus, connectedAccounts, accentColor } = showcase;
  const accent = accentColor || '#6366f1';
  const elapsedTimer = useLiveElapsedTimer(activityStatus?.startedAt);

  // Dual-activity resolution for stacked display
  const connectedSteam = (connectedAccounts as any)?.steam;
  const connectedSpotify = (connectedAccounts as any)?.spotify;
  const connectedTwitch = (connectedAccounts as any)?.twitch;

  const steamActivity =
    activityStatus?.type === 'gaming' || activityStatus?.isSteam
      ? activityStatus
      : connectedSteam?.currentActivity?.type === 'gaming'
        ? connectedSteam.currentActivity
        : null;

  const spotifyActivity =
    activityStatus?.type === 'spotify' ||
    (activityStatus?.type as string) === 'platform_music' ||
    activityStatus?.isPlatformTrack
      ? activityStatus
      : connectedSpotify?.currentActivity?.type === 'spotify'
        ? connectedSpotify.currentActivity
        : null;

  const twitchActivity =
    connectedTwitch?.isLive && connectedTwitch?.showLiveStatus !== false
      ? {
          type: 'streaming',
          title: connectedTwitch.streamTitle || `Streaming on Twitch`,
          subtitle: connectedTwitch.gameName ? `Twitch • ${connectedTwitch.gameName}` : 'Twitch',
          gameName: connectedTwitch.gameName,
          viewersCount: connectedTwitch.viewersCount || 0,
          startedAt: connectedTwitch.startedAt,
          externalUrl: connectedTwitch.url || `https://twitch.tv/${connectedTwitch.username}`,
          avatarUrl: connectedTwitch.avatarUrl,
          username: connectedTwitch.displayName || connectedTwitch.username,
        }
      : null;

  const hasAnyActivity = Boolean(steamActivity || spotifyActivity || twitchActivity);

  const globalSpotifyTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const globalSpotifyPlaying = useSpotifyPlayerStore((s) => s.isPlaying);

  const isCurrentSpotifyActive = Boolean(
    spotifyActivity &&
    globalSpotifyPlaying &&
    globalSpotifyTrack &&
    (globalSpotifyTrack.id === spotifyActivity.trackId ||
      globalSpotifyTrack.title.toLowerCase() === unescapeHtml(spotifyActivity.title).toLowerCase()),
  );

  const toggleAudioPreview = (e: React.MouseEvent, previewUrl?: string | null) => {
    e.stopPropagation();
    if (!spotifyActivity) return;

    const isThisTrack = Boolean(
      globalSpotifyTrack &&
      (globalSpotifyTrack.id === spotifyActivity.trackId ||
        globalSpotifyTrack.title.toLowerCase() ===
          unescapeHtml(spotifyActivity.title).toLowerCase()),
    );

    if (isCurrentSpotifyActive) {
      useSpotifyPlayerStore.getState().pause();
    } else if (isThisTrack && !globalSpotifyPlaying) {
      useSpotifyPlayerStore.getState().resume();
    } else {
      const isPlatform = Boolean(
        spotifyActivity.isPlatformTrack ||
        spotifyActivity.source === 'platform' ||
        spotifyActivity.trackId?.startsWith('trk-') ||
        spotifyActivity.trackId?.startsWith('track-'),
      );
      const isSC = Boolean(
        spotifyActivity.source === 'soundcloud' ||
        spotifyActivity.trackId?.startsWith('sc-') ||
        spotifyActivity.trackId?.startsWith('soundcloud-'),
      );

      useSpotifyPlayerStore.getState().playTrack({
        id: spotifyActivity.trackId,
        title: unescapeHtml(spotifyActivity.title),
        artist: unescapeHtml(
          spotifyActivity.subtitle ||
            spotifyActivity.artist ||
            (isPlatform ? 'Music Hub' : 'Spotify'),
        ),
        albumArt: spotifyActivity.imageUrl || '',
        durationMs: spotifyActivity.durationMs || 180000,
        previewUrl: previewUrl || spotifyActivity.previewUrl || null,
        spotifyUrl: isPlatform
          ? `/music/track/${spotifyActivity.trackId}`
          : isSC
            ? spotifyActivity.externalUrl || 'https://soundcloud.com'
            : spotifyActivity.externalUrl && isSpotifyUrl(spotifyActivity.externalUrl)
              ? spotifyActivity.externalUrl
              : `https://open.spotify.com/track/${spotifyActivity.trackId}`,
        contextName: isPlatform ? 'Platform' : isSC ? 'SoundCloud' : 'Live Spotify Status',
        source: isSC ? 'soundcloud' : isPlatform ? 'platform' : 'spotify',
        streamUrl: spotifyActivity.streamUrl,
      });
    }
  };

  const visibleAccounts = connectedAccounts
    ? Object.entries(connectedAccounts).filter(
        ([_, val]) => val && (typeof val !== 'object' || (val as any).displayOnProfile !== false),
      )
    : [];
  const hasConnectedAccounts = visibleAccounts.length > 0;

  if (!isOwner && !hasAnyActivity && !hasConnectedAccounts) {
    return null;
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-white/3 backdrop-blur-2xl border border-white/8 p-4.5 transition-all duration-300 hover:border-white/16 shadow-xl flex flex-col gap-3.5 group"
      style={{ boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37)` }}
    >
      {/* Background Accent Glow */}
      <div
        className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full blur-3xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-35"
        style={{ backgroundColor: accent }}
      />

      {/* Widget Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            {twitchActivity && (steamActivity || spotifyActivity)
              ? 'Streaming & Activity'
              : twitchActivity
                ? 'Streaming on Twitch'
                : steamActivity && spotifyActivity
                  ? 'Gaming & Music Activity'
                  : steamActivity
                    ? 'Playing'
                    : spotifyActivity
                      ? spotifyActivity.isPlatformTrack || spotifyActivity.source === 'platform'
                        ? 'Listening on platform'
                        : spotifyActivity.source === 'soundcloud'
                          ? 'Listening to SoundCloud'
                          : 'Listening to Spotify'
                      : 'Activity & Integrations'}
          </span>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={onEditClick}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl bg-white/6 hover:bg-white/12 text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Edit Activity"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {/* DUAL STACKED ACTIVITIES OR SINGLE ACTIVITY */}
      {hasAnyActivity ? (
        <div className="flex flex-col gap-2.5">
          {/* 1. TWITCH STREAMING CARD (If live) */}
          {twitchActivity && (
            <a
              href={
                sanitizePlatformUrl(twitchActivity.externalUrl, ['twitch.tv']) ||
                `https://twitch.tv/${encodeURIComponent(twitchActivity.username || '')}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="relative flex items-center gap-3.5 p-3 rounded-2xl bg-linear-to-r from-purple-950/60 via-[#18181b]/90 to-[#121316]/90 border border-purple-500/30 hover:border-purple-400/60 shadow-md hover:bg-white/6 transition-all duration-200 cursor-pointer group/twitch"
            >
              <div className="relative w-14 h-14 rounded-2xl overflow-visible bg-black/60 shrink-0 border border-purple-500/30 flex items-center justify-center shadow-inner">
                <div className="w-full h-full rounded-2xl overflow-hidden flex items-center justify-center bg-black/40">
                  <img
                    src={sanitizeImageUrl(twitchActivity.avatarUrl, '/icons/brands/twitch.png')}
                    alt={twitchActivity.username}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/icons/brands/twitch.png';
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#9146FF] border-2 border-[#121316] flex items-center justify-center shadow-md text-white"
                  title="Twitch"
                >
                  <TwitchBrandIcon size={11} className="text-white fill-white" />
                </div>
              </div>

              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[14px] font-bold text-white truncate leading-snug tracking-tight group-hover/twitch:text-purple-300 transition-colors">
                    {twitchActivity.title}
                  </span>
                  <ExternalLink
                    size={12}
                    className="text-gray-400 shrink-0 opacity-50 group-hover/twitch:opacity-100 transition-opacity"
                  />
                </div>

                <span className="text-xs text-purple-300 truncate mt-0.5 font-normal">
                  {twitchActivity.subtitle}
                </span>

                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-600/30 text-red-300 border border-red-500/40 text-[10px] font-bold tracking-wider uppercase animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                    LIVE
                  </span>
                  <span className="text-xs font-semibold text-gray-300">
                    {twitchActivity.viewersCount.toLocaleString()} viewers
                  </span>
                </div>
              </div>
            </a>
          )}

          {/* 2. STEAM GAMING CARD (If active) */}
          {steamActivity && (
            <div
              onClick={() => {
                const safeUrl = sanitizeExternalUrl(steamActivity.externalUrl, '');
                if (safeUrl) {
                  window.open(safeUrl, '_blank', 'noopener,noreferrer');
                }
              }}
              className={`relative flex items-center gap-3.5 p-3 rounded-2xl bg-[#121316]/90 border border-white/8 hover:border-white/16 shadow-md transition-all duration-200 ${
                steamActivity.externalUrl ? 'cursor-pointer hover:bg-white/6' : ''
              }`}
            >
              {/* 1:1 Authentic Icon with Bottom-Right Platform Badge */}
              <div className="relative w-14 h-14 rounded-2xl overflow-visible bg-black/60 shrink-0 border border-white/10 flex items-center justify-center shadow-inner">
                <div className="w-full h-full rounded-2xl overflow-hidden flex items-center justify-center bg-black/40">
                  <img
                    src={sanitizeImageUrl(steamActivity.imageUrl, '/icons/brands/steam.png')}
                    alt={steamActivity.title}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/icons/brands/steam.png';
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Overlapping Platform Badge (Steam) */}
                {steamActivity.isSteam && (
                  <div
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#1e1f22] border-2 border-[#121316] flex items-center justify-center shadow-md"
                    title="Steam"
                  >
                    <SteamBrandIcon size={11} className="text-white" />
                  </div>
                )}
              </div>

              {/* Text Info */}
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[14px] font-bold text-white truncate leading-snug tracking-tight">
                    {steamActivity.title}
                  </span>
                  {steamActivity.externalUrl && (
                    <ExternalLink
                      size={12}
                      className="text-gray-400 shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                    />
                  )}
                </div>

                <span className="text-xs text-gray-400 truncate mt-0.5 font-normal">
                  {steamActivity.subtitle || 'Steam'}
                </span>

                {/* Discord-style Gamepad Timer (Green #23a55a) */}
                <div className="flex items-center gap-1.5 mt-1 text-[#23a55a]">
                  <DiscordGamepadIcon size={15} className="text-[#23a55a]" />
                  <span className="text-xs font-semibold font-mono tracking-wide">
                    {elapsedTimer ||
                      (steamActivity.playtimeHours ? `${steamActivity.playtimeHours} hrs` : '0:00')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. SPOTIFY / PLATFORM PLAYER CARD (If active) */}
          {spotifyActivity && (
            <SpotifyPlayerCard
              activity={spotifyActivity}
              isOwner={isOwner}
              isPlayingPreview={isCurrentSpotifyActive}
              onTogglePreview={toggleAudioPreview}
              showcaseUserId={showcase.userId}
            />
          )}
        </div>
      ) : isOwner ? (
        <button
          type="button"
          onClick={onEditClick}
          className="py-2.5 border border-dashed border-white/10 rounded-2xl text-xs text-gray-400 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-1.5 bg-white/1"
        >
          <Headphones size={13} />
          <span>Broadcast live Spotify or gaming activity</span>
        </button>
      ) : null}

      {/* Connected Accounts & Rich Platform Cards */}
      {hasConnectedAccounts && (
        <div className="flex flex-col gap-3 pt-2 border-t border-white/5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Connected Platform Highlights
          </span>
          <div className="flex flex-col gap-2.5">
            {visibleAccounts.map(([platformKey, accountData]) => {
              if (!accountData) return null;
              const formattedData =
                typeof accountData === 'object'
                  ? accountData
                  : { username: accountData, handle: accountData };

              return (
                <ShowcaseIntegrationCard
                  key={platformKey}
                  platform={platformKey}
                  data={formattedData}
                  isOwner={isOwner}
                  onConfigureClick={onEditClick}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
