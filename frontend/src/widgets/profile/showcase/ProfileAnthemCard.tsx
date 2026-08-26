import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ExternalLink, Music2, Edit3 } from 'lucide-react';
import type { ProfileAnthemDto } from '@backend/common/contracts';
import { SpotifyBrandIcon } from '@/shared/ui/BrandIcons';
import { audioCoordinator } from '@/shared/lib/audioCoordinator';

interface ProfileAnthemCardProps {
  anthem?: ProfileAnthemDto | null;
  isOwner: boolean;
  onEditClick?: () => void;
}

export const ProfileAnthemCard: React.FC<ProfileAnthemCardProps> = ({
  anthem,
  isOwner,
  onEditClick,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const anthemId = `anthem-${anthem?.title}-${anthem?.artist}`;

  // Initialize and synchronize audio lifecycle (STRICT ZERO-AUTOPLAY)
  useEffect(() => {
    if (anthem?.previewUrl) {
      const audio = new Audio(anthem.previewUrl);
      audio.preload = 'none';

      audio.onended = () => {
        setIsPlaying(false);
        audioCoordinator.stop(anthemId);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        audioCoordinator.stop(anthemId);
      };

      audioRef.current = audio;
    } else {
      audioRef.current = null;
    }

    const handleGlobalPlay = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail.id !== anthemId) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
      }
    };

    const handleGlobalStop = (e: Event) => {
      const customEvent = e as CustomEvent<{ id?: string }>;
      if (!customEvent.detail.id || customEvent.detail.id === anthemId) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      }
    };

    window.addEventListener('app:audio-play', handleGlobalPlay);
    window.addEventListener('app:audio-stop', handleGlobalStop);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      setIsPlaying(false);
      window.removeEventListener('app:audio-play', handleGlobalPlay);
      window.removeEventListener('app:audio-stop', handleGlobalStop);
    };
  }, [anthem?.previewUrl, anthemId]);

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

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current || !anthem.previewUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      audioCoordinator.stop(anthemId);
    } else {
      audioCoordinator.play(audioRef.current, anthemId);
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
        audioCoordinator.stop(anthemId);
      });
      setIsPlaying(true);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 hover:border-white/20 p-3 mb-4 shadow-xl transition-all animate-fadeIn">
      {/* Ambient Album Glow under art when playing */}
      {isPlaying && (
        <div
          className="absolute -left-4 -top-4 w-28 h-28 rounded-full opacity-40 blur-2xl pointer-events-none transition-opacity animate-pulse"
          style={{ backgroundColor: '#1DB954' }}
        />
      )}

      <div className="relative flex items-center justify-between gap-3 z-10">
        {/* Left: Album Art with Play/Pause Button overlay */}
        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-lg group/cover">
          <img src={anthem.albumArt} alt={anthem.title} className="w-full h-full object-cover" />

          {anthem.previewUrl ? (
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause Anthem' : 'Play Anthem Preview'}
              className={`absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-xs transition-opacity cursor-pointer ${
                isPlaying ? 'opacity-100' : 'opacity-0 group-hover/cover:opacity-100'
              }`}
            >
              {isPlaying ? (
                <Pause size={18} className="text-white fill-white" />
              ) : (
                <Play size={18} className="text-white fill-white ml-0.5" />
              )}
            </button>
          ) : (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Music2 size={16} className="text-white/70" />
            </div>
          )}
        </div>

        {/* Center: Track Title & Artist */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white truncate tracking-wide">
              {anthem.title}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-gray-400 font-medium truncate">{anthem.artist}</span>
            <SpotifyBrandIcon size={12} />
          </div>
        </div>

        {/* Right: Equalizer or External Spotify Link & Edit */}
        <div className="flex items-center gap-2 shrink-0">
          {anthem.previewUrl ? (
            <div className="flex items-end gap-0.5 h-4 w-4 justify-center" aria-hidden="true">
              <span
                className={`w-0.5 bg-[#1DB954] rounded-full transition-transform ${
                  isPlaying ? 'h-full animate-equalizerBar' : 'h-1.5'
                }`}
                style={{
                  transformOrigin: 'bottom',
                  animationDelay: '0s',
                }}
              />
              <span
                className={`w-0.5 bg-[#1DB954] rounded-full transition-transform ${
                  isPlaying ? 'h-full animate-equalizerBar' : 'h-3'
                }`}
                style={{
                  transformOrigin: 'bottom',
                  animationDelay: '-0.3s',
                }}
              />
              <span
                className={`w-0.5 bg-[#1DB954] rounded-full transition-transform ${
                  isPlaying ? 'h-full animate-equalizerBar' : 'h-2'
                }`}
                style={{
                  transformOrigin: 'bottom',
                  animationDelay: '-0.15s',
                }}
              />
              <span
                className={`w-0.5 bg-[#1DB954] rounded-full transition-transform ${
                  isPlaying ? 'h-full animate-equalizerBar' : 'h-1'
                }`}
                style={{
                  transformOrigin: 'bottom',
                  animationDelay: '-0.45s',
                }}
              />
            </div>
          ) : (
            anthem.spotifyUrl && (
              <a
                href={anthem.spotifyUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-[#1DB954] text-[10px] font-bold border border-emerald-500/30 transition-all cursor-pointer"
                title="Listen full track on Spotify"
              >
                <span>Spotify</span>
                <ExternalLink size={10} />
              </a>
            )
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
