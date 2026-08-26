import React, { useState, useRef, useEffect } from 'react';
import { Gamepad2, Play, Pause, ExternalLink, Pencil, Headphones, Check } from 'lucide-react';
import type { ProfileShowcaseDto } from '@backend/common/contracts';
import {
  SpotifyBrandIcon,
  SteamBrandIcon,
  DiscordBrandIcon,
  TwitchBrandIcon,
  GitHubBrandIcon,
} from '@/shared/ui/BrandIcons';
import { audioCoordinator } from '@/shared/lib/audioCoordinator';

interface LivePresenceWidgetProps {
  showcase: ProfileShowcaseDto;
  isOwner: boolean;
  onEditClick?: () => void;
}

export const LivePresenceWidget: React.FC<LivePresenceWidgetProps> = ({
  showcase,
  isOwner,
  onEditClick,
}) => {
  const { activityStatus, connectedAccounts, accentColor } = showcase;
  const accent = accentColor || '#6366f1';
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioId = `activity-${showcase.userId}-${activityStatus?.title}`;

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleEnded = () => {
      setIsPlayingPreview(false);
      audioCoordinator.stop(audioId);
    };
    const handleError = () => {
      setIsPlayingPreview(false);
      audioCoordinator.stop(audioId);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    const handleGlobalPlay = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail.id !== audioId) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setIsPlayingPreview(false);
      }
    };

    window.addEventListener('app:audio-play', handleGlobalPlay);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      window.removeEventListener('app:audio-play', handleGlobalPlay);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [audioId]);

  const toggleAudioPreview = (e: React.MouseEvent, previewUrl?: string | null) => {
    e.stopPropagation();
    if (!previewUrl || !audioRef.current) return;

    if (isPlayingPreview) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
      audioCoordinator.stop(audioId);
    } else {
      if (audioRef.current.src !== previewUrl) {
        audioRef.current.src = previewUrl;
      }
      audioCoordinator.play(audioRef.current, audioId);
      audioRef.current
        .play()
        .then(() => setIsPlayingPreview(true))
        .catch(() => {
          setIsPlayingPreview(false);
          audioCoordinator.stop(audioId);
        });
    }
  };

  const hasConnectedAccounts = Boolean(
    connectedAccounts && Object.values(connectedAccounts).some((val) => Boolean(val)),
  );
  const hasActivity = Boolean(activityStatus);

  if (!isOwner && !hasActivity && !hasConnectedAccounts) {
    return null;
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] p-4.5 transition-all duration-300 hover:border-white/[0.16] shadow-xl flex flex-col gap-3.5 group"
      style={{ boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37)` }}
    >
      {/* Background Accent Glow */}
      <div
        className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full blur-3xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-35"
        style={{ backgroundColor: accent }}
      />

      {/* Widget Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          {activityStatus?.type === 'spotify' ? (
            <div className="w-2.5 h-2.5 rounded-full bg-[#1DB954] shadow-[0_0_8px_rgba(29,185,84,0.8)] animate-pulse" />
          ) : activityStatus?.type === 'gaming' ? (
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse" />
          ) : (
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }}
            />
          )}
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            {activityStatus?.type === 'spotify'
              ? 'Listening to Spotify'
              : activityStatus?.type === 'gaming'
                ? 'Playing Game'
                : 'Activity & Integrations'}
          </span>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={onEditClick}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Edit Activity"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {/* Live Activity Card */}
      {activityStatus ? (
        <div
          onClick={() => {
            if (activityStatus.externalUrl) {
              window.open(activityStatus.externalUrl, '_blank', 'noopener,noreferrer');
            }
          }}
          className={`relative flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] transition-all duration-200 ${
            activityStatus.externalUrl ? 'hover:bg-white/[0.07] cursor-pointer' : ''
          }`}
        >
          {/* Image / Artwork */}
          <div className="relative w-13 h-13 rounded-xl overflow-hidden bg-[#18181b] shrink-0 border border-white/10 group/art">
            {activityStatus.imageUrl ? (
              <img
                src={activityStatus.imageUrl}
                alt={activityStatus.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                {activityStatus.type === 'spotify' ? (
                  <Headphones size={20} className="text-[#1DB954]" />
                ) : (
                  <Gamepad2 size={20} className="text-indigo-400" />
                )}
              </div>
            )}

            {/* Audio Preview Play Button for Spotify */}
            {activityStatus.type === 'spotify' && activityStatus.previewUrl && (
              <button
                type="button"
                onClick={(e) => toggleAudioPreview(e, activityStatus.previewUrl)}
                className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover/art:opacity-100 transition-opacity text-white"
                title={isPlayingPreview ? 'Pause 30s preview' : 'Play 30s audio preview'}
              >
                {isPlayingPreview ? (
                  <Pause size={18} />
                ) : (
                  <Play size={18} className="translate-x-0.5" />
                )}
              </button>
            )}
          </div>

          {/* Activity Text Details */}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-white truncate">{activityStatus.title}</span>
              {activityStatus.externalUrl && (
                <ExternalLink size={11} className="text-gray-400 shrink-0 opacity-60" />
              )}
            </div>

            {activityStatus.subtitle && (
              <span className="text-[11px] text-gray-300 truncate mt-0.5 font-medium">
                {activityStatus.subtitle}
              </span>
            )}

            {activityStatus.playtimeHours !== undefined && activityStatus.playtimeHours !== null ? (
              <span className="text-[10px] text-indigo-300/90 font-semibold mt-1">
                ⏱ {activityStatus.playtimeHours} hrs on record
              </span>
            ) : activityStatus.details ? (
              <span className="text-[10px] text-gray-400 truncate mt-0.5">
                {activityStatus.details}
              </span>
            ) : null}
          </div>

          {/* Procedural GPU-Accelerated 4-Bar Equalizer */}
          {activityStatus.type === 'spotify' && (
            <div className="flex items-end gap-1 h-4 shrink-0 px-1">
              <span
                className="w-1 bg-[#1DB954] rounded-full h-full animate-[liveEqualizer_0.9s_ease-in-out_infinite]"
                style={{ transformOrigin: 'bottom', animationDelay: '0s' }}
              />
              <span
                className="w-1 bg-[#1DB954] rounded-full h-full animate-[liveEqualizer_0.8s_ease-in-out_infinite]"
                style={{ transformOrigin: 'bottom', animationDelay: '-0.2s' }}
              />
              <span
                className="w-1 bg-[#1DB954] rounded-full h-full animate-[liveEqualizer_1.05s_ease-in-out_infinite]"
                style={{ transformOrigin: 'bottom', animationDelay: '-0.4s' }}
              />
              <span
                className="w-1 bg-[#1DB954] rounded-full h-full animate-[liveEqualizer_0.75s_ease-in-out_infinite]"
                style={{ transformOrigin: 'bottom', animationDelay: '-0.6s' }}
              />
            </div>
          )}
        </div>
      ) : isOwner ? (
        <button
          type="button"
          onClick={onEditClick}
          className="py-2.5 border border-dashed border-white/10 rounded-2xl text-xs text-gray-400 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-1.5 bg-white/[0.01]"
        >
          <Headphones size={13} />
          <span>Broadcast live Spotify or gaming activity</span>
        </button>
      ) : null}

      {/* Connected Accounts Strip */}
      {hasConnectedAccounts && (
        <div className="flex flex-col gap-1.5 pt-1 border-t border-white/[0.05]">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Connected Accounts
          </span>
          <div className="flex flex-wrap gap-1.5">
            {connectedAccounts?.github && (
              <a
                href={`https://github.com/${connectedAccounts.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-gray-200 transition-colors"
                title={`GitHub: @${connectedAccounts.github}`}
              >
                <GitHubBrandIcon size={14} />
                <span className="truncate max-w-[100px]">@{connectedAccounts.github}</span>
              </a>
            )}

            {connectedAccounts?.steam && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-gray-200"
                title={`Steam: ${connectedAccounts.steam}`}
              >
                <SteamBrandIcon size={14} />
                <span className="truncate max-w-[100px]">{connectedAccounts.steam}</span>
              </div>
            )}

            {connectedAccounts?.spotify && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-gray-200"
                title={`Spotify: ${connectedAccounts.spotify}`}
              >
                <SpotifyBrandIcon size={14} />
                <span className="truncate max-w-[100px]">{connectedAccounts.spotify}</span>
              </div>
            )}

            {connectedAccounts?.discord && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-gray-200"
                title={`Discord: ${connectedAccounts.discord}`}
              >
                <DiscordBrandIcon size={14} />
                <span className="truncate max-w-[100px]">{connectedAccounts.discord}</span>
              </div>
            )}

            {connectedAccounts?.twitch && (
              <a
                href={`https://twitch.tv/${connectedAccounts.twitch}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-[#9146FF] transition-colors"
                title={`Twitch: ${connectedAccounts.twitch}`}
              >
                <TwitchBrandIcon size={14} />
                <span className="truncate max-w-[100px]">twitch/{connectedAccounts.twitch}</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
