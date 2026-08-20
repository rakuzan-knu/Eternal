import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  Check,
  Radio,
} from 'lucide-react';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';
import { useMediaSessionSync } from '@/shared/lib/useMediaSessionSync';

function formatTimer(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const SPEED_OPTIONS = [0.5, 1.0, 1.2, 1.5, 1.7, 2.0];

interface GlobalMediaPlaybackBarProps {
  onNearQueueEnd?: () => void;
}

export default function GlobalMediaPlaybackBar({ onNearQueueEnd }: GlobalMediaPlaybackBarProps) {
  // Sync with OS MediaSession
  useMediaSessionSync();

  const {
    activeMediaId,
    url,
    mediaType,
    senderName,
    sentAt,
    currentTime,
    duration,
    isPlaying,
    isMuted,
    volume,
    playbackRate,
    seekTarget,
    nextIndicator,
    playlist,
    currentIndex,
    playNext,
    playPrev,
    togglePlay,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
    toggleMute,
    setPlaybackRate,
    stopAll,
  } = useActiveMediaPlaybackStore();

  const masterAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement | null>(null);

  // Single Master Audio Node Sync (Audio/Voice only - Video notes use their own HTMLVideoElement)
  useEffect(() => {
    const audio = masterAudioRef.current;
    if (!audio) return;

    if (mediaType === 'video' || !url) {
      if (!audio.paused) {
        audio.pause();
      }
      return;
    }

    if (audio.src !== url) {
      audio.src = url;
      audio.load();
      if (isPlaying) {
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
    }
  }, [url, mediaType, isPlaying, setIsPlaying]);

  useEffect(() => {
    const audio = masterAudioRef.current;
    if (!audio || mediaType === 'video') return;

    if (isPlaying && audio.paused) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [isPlaying, mediaType, setIsPlaying]);

  useEffect(() => {
    const audio = masterAudioRef.current;
    if (!audio) return;
    audio.muted = isMuted;
    audio.volume = isMuted ? 0 : volume;
    audio.playbackRate = playbackRate;
    if ('preservesPitch' in audio) {
      (audio as unknown as { preservesPitch: boolean }).preservesPitch = true;
    }
  }, [isMuted, volume, playbackRate]);

  useEffect(() => {
    const audio = masterAudioRef.current;
    if (!audio || seekTarget === null) return;
    audio.currentTime = seekTarget;
  }, [seekTarget]);

  // Anti-Audio Leakage: Headphone Disconnect Auto-Pause Protection
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.addEventListener) return;

    const handleDeviceChange = () => {
      // When audio devices change (e.g. bluetooth headphones disconnect), pause immediately
      if (useActiveMediaPlaybackStore.getState().isPlaying) {
        useActiveMediaPlaybackStore.getState().setIsPlaying(false);
        if (masterAudioRef.current) {
          masterAudioRef.current.pause();
        }
      }
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  // Queue boundary prefetch trigger
  useEffect(() => {
    if (currentIndex >= 0 && currentIndex >= playlist.length - 2 && onNearQueueEnd) {
      onNearQueueEnd();
    }
  }, [currentIndex, playlist.length, onNearQueueEnd]);

  if (!activeMediaId) return null;

  return (
    <div
      data-testid="global-media-playback-bar"
      className="relative z-30 flex items-center justify-between h-10 px-4 bg-[#141622]/95 border-b border-purple-500/20 backdrop-blur-2xl text-white select-none animate-slideDown shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all"
    >
      {/* Hidden Master Audio Element for continuous background autoplay */}
      <audio
        ref={masterAudioRef}
        preload="auto"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (d && !isNaN(d) && isFinite(d)) {
            setDuration(d);
          }
        }}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime);
        }}
        onEnded={() => {
          // Automatic continuous playlist advance
          const hasNext = playNext();
          if (!hasNext) {
            setIsPlaying(false);
            setCurrentTime(0);
          }
        }}
      />

      {/* Left controls & sender meta */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Playback Controls: Prev, Play/Pause, Next */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => playPrev()}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition active:scale-95 cursor-pointer"
            title="Previous track"
          >
            <SkipBack size={13} />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 hover:text-white border border-purple-400/30 transition active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.3)]"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => playNext()}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition active:scale-95 cursor-pointer"
            title="Next track"
          >
            <SkipForward size={13} />
          </button>
        </div>

        {/* Sender meta or 1-second transient Next indicator banner */}
        <div className="flex items-center gap-2 min-w-0 text-xs truncate">
          {nextIndicator ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/25 border border-purple-400/40 text-purple-200 text-xs font-semibold animate-pulse">
              <Radio size={11} className="text-purple-400 animate-spin" />
              <span>{nextIndicator}</span>
            </div>
          ) : (
            <>
              <span className="font-semibold text-white truncate hover:underline cursor-pointer">
                {senderName || 'Voice / Video Note'}
              </span>
              {sentAt && <span className="text-gray-400 text-[11px] shrink-0">{sentAt}</span>}
            </>
          )}
        </div>
      </div>

      {/* Right controls: Timer, Volume, Speed, Close */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Real-time timer */}
        <div className="font-mono text-xs font-medium text-purple-300 tracking-tight">
          {formatTimer(currentTime)}
        </div>

        {/* Volume Button & Hover Slider Popup */}
        <div
          className="relative flex items-center"
          onMouseEnter={() => setIsVolumeHovered(true)}
          onMouseLeave={() => setIsVolumeHovered(false)}
        >
          <button
            type="button"
            onClick={toggleMute}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition active:scale-95 cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX size={15} className="text-red-400" />
            ) : (
              <Volume2 size={15} className="text-purple-300" />
            )}
          </button>

          {/* Vertical Volume Slider Dropdown */}
          {isVolumeHovered && (
            <div className="absolute top-full -left-2 pt-2 z-50 animate-fadeIn">
              <div className="flex flex-col items-center justify-center w-8 h-28 py-3 bg-[#181926]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 h-1.5 -rotate-90 origin-center accent-purple-500 cursor-pointer bg-white/20 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>

        {/* Playback Speed Selector */}
        <div className="relative" ref={speedMenuRef}>
          <button
            type="button"
            onClick={() => setIsSpeedOpen(!isSpeedOpen)}
            className="px-2 py-1 flex items-center gap-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-purple-300 transition active:scale-95 cursor-pointer"
            title="Playback Speed"
          >
            <span>{playbackRate}X</span>
          </button>

          {isSpeedOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-28 bg-[#181926]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl py-1.5 z-50 animate-fadeIn">
              <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Speed
              </div>
              {SPEED_OPTIONS.map((speed) => {
                const isSelected = playbackRate === speed;
                return (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => {
                      setPlaybackRate(speed);
                      setIsSpeedOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition hover:bg-white/10 ${
                      isSelected ? 'text-purple-300 font-bold bg-purple-500/10' : 'text-gray-200'
                    }`}
                  >
                    <span>{speed}x</span>
                    {isSelected && <Check size={13} className="text-purple-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={stopAll}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition active:scale-90 cursor-pointer"
          title="Close player"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
