import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, Disc, MinusCircle, Image, CreditCard, X, Check } from 'lucide-react';
import Hls from 'hls.js';
import { audioCoordinator } from '@/shared/lib/audioCoordinator';
import {
  generateSeededWaveform,
  STORY_STICKER_COLOR_PALETTES,
  formatTimeMs,
  formatSeconds,
} from '../lib/storyMusicUtils';
import { StoryMusicStickerView } from './StoryMusicStickerView';
import type { AudioOverlay } from '../model/types';
import type { StoryMusicTrack } from './StoryMusicSearchModal';

interface StoryMusicCustomizerModalProps {
  isOpen: boolean;
  track: StoryMusicTrack | null;
  onClose: () => void;
  onConfirm: (config: {
    musicStyle: 'none' | 'card' | 'cover' | 'vinyl';
    stickerColor?: string;
    startTimeMs: number;
    clipDurationSeconds: number;
    streamUrl: string;
    audioUrl: string;
    isHls?: boolean;
    title: string;
    artist: string;
    albumArt: string;
    durationMs: number;
  }) => void;
}

export const StoryMusicCustomizerModal: React.FC<StoryMusicCustomizerModalProps> = ({
  isOpen,
  track,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !track) return null;

  const totalDurationMs = Math.max(30000, track.durationMs || 180000);

  // States
  const [selectedStyle, setSelectedStyle] = useState<'none' | 'cover' | 'card' | 'vinyl'>('card');
  const [colorIndex, setColorIndex] = useState(0);
  const [clipDurationSeconds, setClipDurationSeconds] = useState(15);
  const [startTimeMs, setStartTimeMs] = useState(0);
  const [currentPlayMs, setCurrentPlayMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  // Active color from palette
  const activeColor = useMemo(() => {
    if (selectedStyle === 'card') {
      const cardPalette = [
        '#FFFFFF', // Clean White default for card
        '#18181B', // Dark
        '#A855F7', // Vivid Purple
        '#8B5CF6', // Violet
        '#C084FC', // Light Orchid
        '#6366F1', // Electric Indigo
        '#38BDF8', // Sky Cyan
        '#10B981', // Emerald Mint
        '#EC4899', // Fuchsia
        '#EF4444', // Crimson Red
      ];
      return cardPalette[colorIndex % cardPalette.length];
    }
    // For Cover: signature purple is default!
    return STORY_STICKER_COLOR_PALETTES[colorIndex % STORY_STICKER_COLOR_PALETTES.length];
  }, [colorIndex, selectedStyle]);

  // Deterministic 60-bar waveform
  const waveform = useMemo(() => {
    return generateSeededWaveform(track.id || track.title, 60);
  }, [track.id, track.title]);

  // Audio & HLS refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const scrubberTrackRef = useRef<HTMLDivElement | null>(null);
  const isDraggingScrubberRef = useRef(false);
  const wasPlayingBeforeDragRef = useRef(false);
  const pendingStartTimeMsRef = useRef(startTimeMs);

  // Cleanup audio
  const stopAudio = () => {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    audioCoordinator.stop('story-music-customizer');
  };

  // Initialize and stream audio
  useEffect(() => {
    const playUrl = track.streamUrl || track.audioUrl;
    if (!playUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }

    const audio = audioRef.current;
    audio.volume = 0.9;

    const isHls = track.isHls || playUrl.includes('.m3u8');

    const startAudioPlayback = () => {
      audio.currentTime = startTimeMs / 1000;
      setCurrentPlayMs(startTimeMs);
      audioCoordinator.play(audio, 'story-music-customizer');
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    };

    if (isHls) {
      if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = playUrl;
        startAudioPlayback();
      } else if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hlsRef.current = hls;
        hls.loadSource(playUrl);
        hls.attachMedia(audio);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          startAudioPlayback();
        });
      }
    } else {
      audio.src = playUrl;
      startAudioPlayback();
    }

    return () => {
      stopAudio();
    };
  }, [track.id, track.streamUrl, track.audioUrl]);

  // Real-time smooth playhead animation loop (60fps)
  useEffect(() => {
    let animId: number;
    const updatePlayhead = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused && !isDraggingScrubberRef.current) {
        const curMs = audio.currentTime * 1000;
        setCurrentPlayMs(curMs);
      }
      animId = requestAnimationFrame(updatePlayhead);
    };

    if (isPlaying) {
      animId = requestAnimationFrame(updatePlayhead);
    }
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying]);

  // Keep currentPlayMs in sync when startTimeMs changes externally
  useEffect(() => {
    if (!isDraggingScrubberRef.current) {
      setCurrentPlayMs(startTimeMs);
      pendingStartTimeMsRef.current = startTimeMs;
    }
  }, [startTimeMs]);

  // Loop snippet between [startTimeMs, startTimeMs + clipDurationSeconds * 1000]
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (isDraggingScrubberRef.current) return;
      const currentMs = audio.currentTime * 1000;
      const endMs = startTimeMs + clipDurationSeconds * 1000;

      // If reached end of snippet, loop back to snippet start
      if (currentMs >= endMs || currentMs < startTimeMs) {
        audio.currentTime = startTimeMs / 1000;
        setCurrentPlayMs(startTimeMs);
      }
    };

    audio.addEventListener?.('timeupdate', handleTimeUpdate);
    return () => {
      audio.removeEventListener?.('timeupdate', handleTimeUpdate);
    };
  }, [startTimeMs, clipDurationSeconds]);

  // Toggle Play / Pause
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      const curMs = audio.currentTime * 1000;
      if (curMs >= startTimeMs + clipDurationMs || curMs < startTimeMs) {
        audio.currentTime = startTimeMs / 1000;
        setCurrentPlayMs(startTimeMs);
      }
      audioCoordinator.play(audio, 'story-music-customizer');
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  // Calculate positions for scrubber
  const clipDurationMs = clipDurationSeconds * 1000;
  const maxStartMs = Math.max(0, totalDurationMs - clipDurationMs);

  // Snippet progress ratio (0 to 1) for the playhead indicator
  const snippetProgress = useMemo(() => {
    if (clipDurationMs <= 0) return 0;
    const elapsed = currentPlayMs - startTimeMs;
    const clamped = Math.max(0, Math.min(clipDurationMs, elapsed));
    return clamped / clipDurationMs;
  }, [currentPlayMs, startTimeMs, clipDurationMs]);

  // Scrubber percentage calculations
  const windowWidthPercent = Math.min(100, Math.max(12, (clipDurationMs / totalDurationMs) * 100));
  const windowLeftPercent =
    maxStartMs > 0 ? (startTimeMs / maxStartMs) * (100 - windowWidthPercent) : 0;

  // Chorus dots (e.g. at 22%, 52%, 76% of song)
  const chorusPoints = useMemo(() => [0.22, 0.52, 0.76], []);

  // Jump to chorus
  const handleJumpToChorus = (fraction: number) => {
    const targetMs = Math.round(fraction * maxStartMs);
    const safeMs = Math.max(0, Math.min(maxStartMs, targetMs));
    setStartTimeMs(safeMs);
    setCurrentPlayMs(safeMs);
    pendingStartTimeMsRef.current = safeMs;

    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = safeMs / 1000;
      if (isPlaying) {
        audioCoordinator.play(audio, 'story-music-customizer');
        audio.play().catch(() => {});
      }
    }
  };

  // Scrubber drag / pointer events
  const handleScrubberPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!scrubberTrackRef.current) return;
    isDraggingScrubberRef.current = true;
    wasPlayingBeforeDragRef.current = isPlaying;

    // Immediately pause audio during drag so it doesn't stutter or play 1000 times!
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateScrubberPosition(e.clientX);
  };

  const handleScrubberPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!isDraggingScrubberRef.current) return;
    // Pure visual update (NO audio seek, NO audio play during drag!)
    updateScrubberPosition(e.clientX);
  };

  const handleScrubberPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!isDraggingScrubberRef.current) return;
    isDraggingScrubberRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}

    // When user releases the scrubber, seek audio and resume cleanly
    const finalStartMs = pendingStartTimeMsRef.current;
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = finalStartMs / 1000;
      setCurrentPlayMs(finalStartMs);

      if (wasPlayingBeforeDragRef.current || isPlaying) {
        audioCoordinator.play(audio, 'story-music-customizer');
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
    }
  };

  const updateScrubberPosition = (clientX: number) => {
    const trackElem = scrubberTrackRef.current;
    if (!trackElem) return;

    const rect = trackElem.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickFraction = Math.max(0, Math.min(1, clickX / rect.width));

    const newStartMs = Math.round(clickFraction * maxStartMs);
    const safeStartMs = Math.max(0, Math.min(maxStartMs, newStartMs));

    pendingStartTimeMsRef.current = safeStartMs;
    setStartTimeMs(safeStartMs);
    setCurrentPlayMs(safeStartMs);
  };

  // Mock overlay for real-time live preview
  const previewOverlay: AudioOverlay = {
    id: 'preview-music-sticker',
    type: 'audio',
    title: track.title,
    artist: track.artist,
    albumArt: track.albumArt,
    musicStyle: selectedStyle,
    stickerColor: activeColor,
    startTimeMs,
    clipDurationSeconds,
    xPercent: 50,
    yPercent: 50,
  };

  // Handle Done
  const handleDone = () => {
    stopAudio();
    onConfirm({
      musicStyle: selectedStyle,
      stickerColor: activeColor,
      startTimeMs,
      clipDurationSeconds,
      streamUrl: track.streamUrl || '',
      audioUrl: track.audioUrl || track.streamUrl || '',
      isHls: track.isHls,
      title: track.title,
      artist: track.artist,
      albumArt: track.albumArt,
      durationMs: totalDurationMs,
    });
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[10010] flex flex-col justify-between bg-black/95 select-none animate-fadeIn overflow-hidden text-white"
    >
      {/* 1. TOP HEADER BAR */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-4 pb-2">
        {/* Cancel Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            stopAudio();
            onClose();
          }}
          className="text-sm font-semibold text-white/90 hover:text-white transition-colors cursor-pointer py-1"
        >
          Cancel
        </button>

        {/* Center: Mini Track Art & Color Wheel */}
        <div className="flex items-center gap-3">
          {/* Miniature Track Art */}
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/20 shadow-md bg-white/10 shrink-0">
            {track.albumArt ? (
              <img src={track.albumArt} alt={track.title} className="w-full h-full object-cover" />
            ) : null}
          </div>

          {/* Color Wheel Button (Only shown when card or cover style is active) */}
          {(selectedStyle === 'card' || selectedStyle === 'cover') && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setColorIndex((prev) => prev + 1);
              }}
              style={{
                background:
                  'conic-gradient(from 0deg, #a855f7, #6366f1, #38bdf8, #10b981, #ec4899, #c084fc, #8b5cf6, #a855f7)',
              }}
              className="w-7 h-7 rounded-full p-[2px] shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer border border-white/40"
              title="Change color"
            >
              <div
                style={{ backgroundColor: activeColor }}
                className="w-full h-full rounded-full border border-black/20"
              />
            </button>
          )}
        </div>

        {/* Done Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDone();
          }}
          className="text-sm font-bold text-white hover:text-purple-300 transition-colors cursor-pointer py-1"
        >
          Done
        </button>
      </div>

      {/* 2. CENTER PREVIEW CANVAS (Real-Time Live Sticker Display) */}
      <div className="flex-1 flex items-center justify-center px-4 relative">
        <div className="transform scale-100 sm:scale-110 transition-transform">
          <StoryMusicStickerView
            overlay={previewOverlay}
            isEditor={false}
            isPlaying={isPlaying}
            isHeld={false}
          />
        </div>
      </div>

      {/* 3. BOTTOM CONTROLS (Vibrant Purple Palette) */}
      <div className="relative z-20 pb-7 pt-2 flex flex-col gap-3.5 bg-gradient-to-t from-black via-black/90 to-transparent">
        {/* A. 4-Icon Mode Selector Bar */}
        <div className="flex items-center justify-center gap-6 py-1">
          {/* 1. Only Music ("Audio Only" / None) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedStyle('none');
            }}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              selectedStyle === 'none'
                ? 'bg-white text-purple-600 scale-110 shadow-[0_0_18px_rgba(168,85,247,0.45)] ring-2 ring-purple-500/50'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Audio Only"
          >
            <MinusCircle size={22} className="stroke-[2.5]" />
          </button>

          {/* 2. Large Cover */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedStyle('cover');
            }}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              selectedStyle === 'cover'
                ? 'bg-white text-purple-600 scale-110 shadow-[0_0_18px_rgba(168,85,247,0.45)] ring-2 ring-purple-500/50'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Large Cover"
          >
            <Image size={20} className="stroke-[2.3]" />
          </button>

          {/* 3. Compact Card */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedStyle('card');
            }}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              selectedStyle === 'card'
                ? 'bg-white text-purple-600 scale-110 shadow-[0_0_18px_rgba(168,85,247,0.45)] ring-2 ring-purple-500/50'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Cover Card"
          >
            <CreditCard size={20} className="stroke-[2.3]" />
          </button>

          {/* 4. Vinyl LP Record (with "NEW" purple badge) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedStyle('vinyl');
            }}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              selectedStyle === 'vinyl'
                ? 'bg-white text-purple-600 scale-110 shadow-[0_0_18px_rgba(168,85,247,0.45)] ring-2 ring-purple-500/50'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Vinyl Record"
          >
            <Disc size={21} className="stroke-[2.3]" />
            {/* "NEW" Badge */}
            <span className="absolute -top-1.5 -right-1 px-1.5 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[8px] font-black rounded-full shadow-sm shadow-purple-500/50 tracking-tight scale-90">
              NEW
            </span>
          </button>
        </div>

        {/* B. Mini Track Overview Timeline & Playback Row */}
        <div className="flex items-center justify-between px-5 gap-3 max-w-lg mx-auto w-full">
          {/* Duration Selector Button (20) / (15) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDurationPicker(true);
            }}
            className="w-9 h-9 rounded-full border border-purple-400/40 bg-purple-950/40 hover:bg-purple-900/60 active:scale-95 flex items-center justify-center text-xs font-black text-white transition-all cursor-pointer shrink-0 shadow-md shadow-purple-900/30"
            title="Clip duration (sec)"
          >
            {clipDurationSeconds}
          </button>

          {/* Track Info & Progress Mini-Line with Chorus Dots */}
          <div className="flex-1 flex flex-col min-w-0 px-2">
            <div className="flex items-center justify-between text-xs font-bold text-white/90 truncate mb-1">
              <span className="truncate">{track.title}</span>
              <span className="text-[10px] text-white/70 ml-2 shrink-0 font-semibold tabular-nums">
                {formatTimeMs(currentPlayMs)} / {formatTimeMs(totalDurationMs)}
              </span>
            </div>

            {/* Overview mini-track line */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                handleJumpToChorus(frac);
              }}
              className="relative w-full h-1.5 bg-white/15 rounded-full cursor-pointer overflow-visible group"
            >
              {/* Highlighted active segment - Pure Purple Gradient, No Yellow */}
              <div
                style={{
                  left: `${(startTimeMs / totalDurationMs) * 100}%`,
                  width: `${(clipDurationMs / totalDurationMs) * 100}%`,
                }}
                className="absolute top-0 bottom-0 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.7)]"
              />

              {/* Real-time Playhead dot on overview timeline */}
              <div
                style={{
                  left: `${Math.min(100, Math.max(0, (currentPlayMs / totalDurationMs) * 100))}%`,
                }}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff,0_0_12px_rgba(168,85,247,1)] pointer-events-none z-10"
              />

              {/* Purple Chorus / Drop Markers */}
              {chorusPoints.map((pt, idx) => (
                <div
                  key={idx}
                  style={{ left: `${pt * 100}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJumpToChorus(pt);
                  }}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-purple-400 hover:scale-150 transition-transform shadow-[0_0_10px_rgba(168,85,247,1)] border border-white/70 cursor-pointer"
                  title="Chorus / Drop"
                />
              ))}
            </div>
          </div>

          {/* Circular Play / Pause Toggle Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            className="w-10 h-10 rounded-full bg-white hover:bg-white/90 text-black flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={17} className="fill-black stroke-black" />
            ) : (
              <Play size={17} className="fill-black stroke-black ml-0.5" />
            )}
          </button>
        </div>

        {/* C. Waveform Scrubber with Signature Purple Gradient Selection Box */}
        <div
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="relative px-5 max-w-lg mx-auto w-full pt-1"
        >
          <div
            ref={scrubberTrackRef}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={handleScrubberPointerDown}
            onPointerMove={handleScrubberPointerMove}
            onPointerUp={handleScrubberPointerUp}
            className="relative h-14 w-full flex items-center justify-between cursor-ew-resize touch-none select-none"
          >
            {/* 60 Spectrum Sound Bars */}
            <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none">
              {waveform.map((height, idx) => (
                <div
                  key={idx}
                  style={{ height: `${height}%` }}
                  className="w-[3px] sm:w-[4px] bg-white/30 rounded-full mx-[1px]"
                />
              ))}
            </div>

            {/* Draggable Gradient Selection Box (Signature Pure Purple/Fuchsia Gradient - NO yellow!) */}
            <div
              style={{
                left: `${windowLeftPercent}%`,
                width: `${windowWidthPercent}%`,
              }}
              className="absolute top-0 bottom-0 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-600 p-[2.5px] shadow-[0_0_25px_rgba(168,85,247,0.7)] transition-none pointer-events-none"
            >
              {/* Inner cutout with animated live playhead and active progress bars */}
              <div className="relative w-full h-full bg-black/40 backdrop-blur-[1px] rounded-[9px] flex items-center justify-between px-1 overflow-hidden">
                {/* Active progress background fill */}
                <div
                  style={{ width: `${snippetProgress * 100}%` }}
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-purple-600/35 via-fuchsia-500/25 to-purple-500/15 pointer-events-none rounded-l-[8px]"
                />

                {/* Vertical Glowing Playhead Line */}
                <div
                  style={{ left: `${snippetProgress * 100}%` }}
                  className="absolute top-0 bottom-0 w-[2px] bg-white rounded-full shadow-[0_0_8px_#ffffff,0_0_16px_rgba(168,85,247,1)] z-20 pointer-events-none -translate-x-1/2"
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(168,85,247,1)]" />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(168,85,247,1)]" />
                </div>

                {/* 14 Sound bars with active progress illumination */}
                <div className="w-full flex items-center justify-between pointer-events-none z-10 px-0.5">
                  {[42, 68, 88, 62, 98, 84, 58, 92, 76, 52, 78, 96, 68, 46].map((barH, bIdx) => {
                    const barRatio = bIdx / 13;
                    const isPassed = barRatio <= snippetProgress;
                    return (
                      <div
                        key={bIdx}
                        style={{ height: `${barH}%` }}
                        className={`w-[2.5px] rounded-full transition-colors duration-75 mx-auto ${
                          isPassed
                            ? 'bg-gradient-to-t from-purple-400 via-fuchsia-300 to-white shadow-[0_0_6px_rgba(168,85,247,0.9)] opacity-100'
                            : 'bg-white/40 opacity-60'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. DURATION SELECTOR MODAL */}
      {showDurationPicker && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowDurationPicker(false);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#18181b] border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col text-white animate-slideUp"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-sm font-bold">Choose duration</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDurationPicker(false);
                }}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto py-2 divide-y divide-white/5 scrollbar-thin">
              {Array.from({ length: 26 }, (_, i) => i + 5).map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setClipDurationSeconds(sec);
                    setShowDurationPicker(false);
                  }}
                  className={`w-full py-2.5 px-4 flex items-center justify-between text-xs font-bold rounded-xl transition-colors ${
                    clipDurationSeconds === sec
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <span>{formatSeconds(sec)}</span>
                  {clipDurationSeconds === sec && <Check size={14} className="stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
