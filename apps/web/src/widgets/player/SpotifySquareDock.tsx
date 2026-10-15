import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Maximize2,
  X,
  Volume2,
  Volume1,
  VolumeX,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  ListMusic,
} from 'lucide-react';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { useLiquidGlassTheme } from '@/shared/lib/useLiquidGlassTheme';
import { extractDominantColors, type AmbientPalette } from '@/shared/lib/extractDominantColors';
import {
  getPiPLastCenter,
  setPiPLastCenter,
  triggerCallPiPTransition,
} from '@/features/chat/lib/webrtc/callPiPTransition';
import { usePiPStackOffset } from '@/shared/lib/pipStackCoordinator';
import { SpotifyQueuePopover } from './SpotifyQueuePopover';

const CARD_SIZE = 196;

const formatTime = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const SpotifySquareDock: React.FC = () => {
  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const isPlaying = useSpotifyPlayerStore((s) => s.isPlaying);
  const progressMs = useSpotifyPlayerStore((s) => s.progressMs);
  const durationMs = useSpotifyPlayerStore((s) => s.durationMs);
  const volume = useSpotifyPlayerStore((s) => s.volume);
  const isMuted = useSpotifyPlayerStore((s) => s.isMuted);
  const isDockVisible = useSpotifyPlayerStore((s) => s.isDockVisible);
  const isQueueOpen = useSpotifyPlayerStore((s) => s.isQueueOpen);
  const isGameModeOpen = useSpotifyPlayerStore((s) => s.isGameModeOpen);
  const repeatMode = useSpotifyPlayerStore((s) => s.repeatMode);

  const togglePlay = useSpotifyPlayerStore((s) => s.togglePlay);
  const prevTrack = useSpotifyPlayerStore((s) => s.prevTrack);
  const nextTrack = useSpotifyPlayerStore((s) => s.nextTrack);
  const seek = useSpotifyPlayerStore((s) => s.seek);
  const toggleRepeat = useSpotifyPlayerStore((s) => s.toggleRepeat);
  const toggleMute = useSpotifyPlayerStore((s) => s.toggleMute);
  const setVolume = useSpotifyPlayerStore((s) => s.setVolume);
  const toggleQueue = useSpotifyPlayerStore((s) => s.toggleQueue);
  const closeDock = useSpotifyPlayerStore((s) => s.closeDock);
  const setGameModeOpen = useSpotifyPlayerStore((s) => s.setGameModeOpen);

  const { topSpecularClass } = useLiquidGlassTheme();

  // 1. Hover & Interaction state
  const [isHovered, setIsHovered] = useState(false);
  const [showVolumePopup, setShowVolumePopup] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const isDraggingVolumeRef = useRef(false);
  const volumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeTrackRef = useRef<HTMLDivElement>(null);

  // 2. Drag & Drop positioning
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardRect, setCardRect] = useState<DOMRect | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    cardX: number;
    cardY: number;
  } | null>(null);
  const hasMovedRef = useRef(false);
  const lastTapRef = useRef<number>(0);

  // Stacking offset when both Call PiP and Spotify Square Dock are in default bottom-right position
  const isPlayerAtDefault = Boolean(
    isDockVisible && currentTrack && !isGameModeOpen && position === null,
  );
  const isStackedAbove = usePiPStackOffset('player', isPlayerAtDefault);

  // Update card rectangle for queue popover anchoring
  const updateCardRect = useCallback(() => {
    if (cardRef.current) {
      setCardRect(cardRef.current.getBoundingClientRect());
    }
  }, []);

  useEffect(() => {
    updateCardRect();
  }, [position, isDockVisible, isHovered, isStackedAbove, updateCardRect]);

  // Reset custom dragged position when dock closes
  useEffect(() => {
    if (!isDockVisible) {
      setPosition(null);
    }
  }, [isDockVisible]);

  // Register center for circular radial expansion
  useEffect(() => {
    if (cardRef.current && isDockVisible) {
      const rect = cardRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setPiPLastCenter({
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
        });
      }
    }
  }, [position, isDockVisible, isStackedAbove]);

  // Clamping within viewport
  useEffect(() => {
    const handleResize = () => {
      updateCardRect();
      setPosition((prev) => {
        if (!prev) return null;
        const viewportW = document.documentElement.clientWidth || window.innerWidth;
        const viewportH = document.documentElement.clientHeight || window.innerHeight;
        const clampedX = Math.max(12, Math.min(viewportW - (CARD_SIZE + 12), prev.x));
        const clampedY = Math.max(12, Math.min(viewportH - (CARD_SIZE + 12), prev.y));
        return { x: clampedX, y: clampedY };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCardRect]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement)?.closest('button, input, [data-no-drag="true"]')) return;

    const rect = cardRef.current?.getBoundingClientRect();
    const currentCardX = position?.x ?? (rect ? rect.left : 20);
    const currentCardY = position?.y ?? (rect ? rect.top : 20);

    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      cardX: currentCardX,
      cardY: currentCardY,
    };
    hasMovedRef.current = false;
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.pointerX;
      const dy = e.clientY - dragStartRef.current.pointerY;

      if (!hasMovedRef.current && Math.hypot(dx, dy) > 4) {
        hasMovedRef.current = true;
        isDraggingRef.current = true;
        setIsDragging(true);
      }

      if (hasMovedRef.current) {
        const viewportW = document.documentElement.clientWidth || window.innerWidth;
        const viewportH = document.documentElement.clientHeight || window.innerHeight;
        const nextX = Math.max(
          12,
          Math.min(viewportW - (CARD_SIZE + 12), dragStartRef.current.cardX + dx),
        );
        const nextY = Math.max(
          12,
          Math.min(viewportH - (CARD_SIZE + 12), dragStartRef.current.cardY + dy),
        );
        setPosition({ x: nextX, y: nextY });
      }
    };

    const handlePointerUp = () => {
      if (dragStartRef.current) {
        dragStartRef.current = null;
        setTimeout(() => {
          isDraggingRef.current = false;
          setIsDragging(false);
          updateCardRect();
        }, 50);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [updateCardRect]);

  // 3. Dynamic ambient radial circular gradient extraction & crossfade
  const [palette, setPalette] = useState<AmbientPalette>({
    primary: 'rgb(30, 41, 59)',
    secondary: 'rgb(15, 23, 42)',
    glow: 'rgba(56, 189, 248, 0.4)',
    bgGradient:
      'radial-gradient(circle at 50% 35%, rgb(30, 41, 59) 0%, rgb(15, 23, 42) 65%, #08090d 100%)',
  });
  const [gradientA, setGradientA] = useState(palette.bgGradient);
  const [gradientB, setGradientB] = useState(palette.bgGradient);
  const [currentLayer, setCurrentLayer] = useState<'A' | 'B'>('A');
  const layerRef = useRef<'A' | 'B'>('A');

  const coverSrc = useMemo(() => {
    return (
      currentTrack?.albumArt ||
      currentTrack?.artistAvatar ||
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80'
    );
  }, [currentTrack?.albumArt, currentTrack?.artistAvatar]);

  useEffect(() => {
    if (!coverSrc) return;
    let isMounted = true;
    extractDominantColors(coverSrc, currentTrack?.title).then((extracted) => {
      if (isMounted) {
        setPalette(extracted);
        if (layerRef.current === 'A') {
          setGradientB(extracted.bgGradient);
          layerRef.current = 'B';
          setCurrentLayer('B');
        } else {
          setGradientA(extracted.bgGradient);
          layerRef.current = 'A';
          setCurrentLayer('A');
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [coverSrc, currentTrack?.id, currentTrack?.title]);

  // 4. Smooth circular reveal expansion into GameModePlayer
  const handleExpand = useCallback(() => {
    const rect = cardRef.current?.getBoundingClientRect();
    const origin = rect
      ? {
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
        }
      : getPiPLastCenter();

    setPiPLastCenter(origin);
    triggerCallPiPTransition('expand', origin, () => {
      setGameModeOpen(true);
    });
  }, [setGameModeOpen]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement)?.closest('button, input, [data-no-drag="true"]')) return;
    handleExpand();
  };

  const handlePointerUpCard = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement)?.closest('button, input, [data-no-drag="true"]')) return;
    if (hasMovedRef.current) return;

    const now = Date.now();
    if (now - lastTapRef.current < 450) {
      handleExpand();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  // 5. Scrubber drag-to-seek
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubProgressMs, setScrubProgressMs] = useState<number | null>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const isScrubbingRef = useRef(false);
  const durationMsRef = useRef(durationMs);

  useEffect(() => {
    durationMsRef.current = durationMs;
  }, [durationMs]);

  const calculateScrubberPos = useCallback((clientX: number) => {
    if (!scrubberRef.current) return 0;
    const rect = scrubberRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleScrubberPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const pos = calculateScrubberPos(e.clientX);
    const targetMs = pos * (durationMsRef.current || 0);

    isScrubbingRef.current = true;
    setIsScrubbing(true);
    setScrubProgressMs(targetMs);

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!isScrubbingRef.current) return;
      moveEvent.preventDefault();
      const movePos = calculateScrubberPos(moveEvent.clientX);
      setScrubProgressMs(movePos * (durationMsRef.current || 0));
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (!isScrubbingRef.current) return;
      isScrubbingRef.current = false;
      setIsScrubbing(false);
      setScrubProgressMs(null);

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      const finalPos = calculateScrubberPos(upEvent.clientX);
      seek(finalPos * (durationMsRef.current || 0));
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // 6. Smooth Vertical Volume Slider Mechanics
  const updateVolumeFromPointer = useCallback(
    (clientY: number) => {
      if (!volumeTrackRef.current) return;
      const rect = volumeTrackRef.current.getBoundingClientRect();
      if (rect.height <= 0) return;
      // clientY: rect.bottom is 0%, rect.top is 100%
      const ratio = (rect.bottom - clientY) / rect.height;
      const clamped = Math.max(0, Math.min(1, ratio));
      if (isMuted && clamped > 0) toggleMute();
      setVolume(clamped);
    },
    [isMuted, toggleMute, setVolume],
  );

  const handleVolumePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    isDraggingVolumeRef.current = true;
    setIsDraggingVolume(true);
    updateVolumeFromPointer(e.clientY);

    const onPointerMove = (moveEv: PointerEvent) => {
      if (!isDraggingVolumeRef.current) return;
      moveEv.preventDefault();
      updateVolumeFromPointer(moveEv.clientY);
    };

    const onPointerUp = () => {
      isDraggingVolumeRef.current = false;
      setIsDraggingVolume(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handleVolumeEnter = () => {
    if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
    setShowVolumePopup(true);
  };

  const handleVolumeLeave = () => {
    if (isDraggingVolumeRef.current) return;
    volumeTimeoutRef.current = setTimeout(() => {
      if (!isDraggingVolumeRef.current) {
        setShowVolumePopup(false);
      }
    }, 400);
  };

  if (!isDockVisible || !currentTrack || isGameModeOpen) {
    return null;
  }

  const effectiveProgress = isScrubbing && scrubProgressMs !== null ? scrubProgressMs : progressMs;
  const progressRatio =
    durationMs > 0 ? Math.min(1, Math.max(0, effectiveProgress / durationMs)) : 0;
  const progressPercent = Math.min(100, Math.max(0, progressRatio * 100));

  const isVolumeMuted = isMuted || volume === 0;

  // Visual liquid glass styles matching call PiP & modern glassmorphism
  const topBtnStyle =
    'w-7 h-7 rounded-full flex items-center justify-center border transition-all hover:scale-108 active:scale-95 cursor-pointer bg-white/12 hover:bg-white/25 text-white/95 hover:text-white border-white/25 backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)]';

  const bottomPanelStyle =
    'bg-white/10 hover:bg-white/[0.14] border-white/25 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.35)] backdrop-blur-2xl transition-colors';

  const buttonBaseStyle =
    'w-[23px] h-[23px] shrink-0 flex items-center justify-center rounded-full transition-all cursor-pointer bg-white/12 hover:bg-white/25 text-white/90 hover:text-white border border-white/20 backdrop-blur-xl shadow-[0_2px_8px_rgba(0,0,0,0.25),inset_0_1px_0.5px_rgba(255,255,255,0.4)] active:scale-95';

  const isInteracting =
    isHovered || isScrubbing || isDraggingVolume || showVolumePopup || isQueueOpen;

  return (
    <>
      <div
        ref={cardRef}
        role="region"
        aria-label="Spotify Compact Square Player"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUpCard}
        onDoubleClick={handleDoubleClick}
        style={
          position
            ? {
                width: CARD_SIZE,
                height: CARD_SIZE,
                left: `${position.x}px`,
                top: `${position.y}px`,
              }
            : {
                width: CARD_SIZE,
                height: CARD_SIZE,
                right: 'calc(env(safe-area-inset-right, 0px) + 20px)',
                bottom: isStackedAbove
                  ? 'calc(env(safe-area-inset-bottom, 0px) + 278px)'
                  : 'calc(env(safe-area-inset-bottom, 0px) + 84px)',
              }
        }
        className={`fixed z-50 rounded-[32px] overflow-hidden select-none flex items-center justify-center transition-[box-shadow,transform,bottom] duration-300 backdrop-blur-2xl border border-white/25 shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.4),0_16px_40px_rgba(0,0,0,0.5)] bg-[#090a0f] ${
          isDragging ? 'cursor-grabbing scale-102 shadow-2xl' : 'cursor-grab hover:shadow-2xl'
        }`}
      >
        {/* 1. Layer A dynamic radial gradient */}
        <div
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out pointer-events-none"
          style={{
            background: gradientA,
            opacity: currentLayer === 'A' ? 1 : 0,
          }}
        />

        {/* 2. Layer B dynamic radial gradient */}
        <div
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out pointer-events-none"
          style={{
            background: gradientB,
            opacity: currentLayer === 'B' ? 1 : 0,
          }}
        />

        {/* Subtle Specular Top Reflection Sweep */}
        <div
          className={`absolute inset-x-6 top-0 h-[1.5px] ${topSpecularClass} pointer-events-none rounded-t-full`}
        />

        {/* 3. Top-Bar Title on Hover (No overlap with scrubber) */}
        <div
          className={`absolute top-2.5 inset-x-11 z-20 text-center transition-all duration-300 pointer-events-none ${
            isInteracting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          <span className="text-[11px] font-semibold text-white/95 truncate block drop-shadow-md">
            {currentTrack.title}
          </span>
        </div>

        {/* 4. Center Stage: Circular Artwork with Pulse Aura */}
        <div
          className={`relative flex flex-col items-center justify-center pointer-events-none transition-all duration-300 ${
            isInteracting ? '-translate-y-2 scale-90' : 'translate-y-0 scale-100'
          }`}
        >
          <div
            className={`rounded-full p-0.5 transition-all duration-500 overflow-hidden ${
              isPlaying
                ? 'ring-[3px] ring-white/40 shadow-[0_0_20px_rgba(255,255,255,0.35)]'
                : 'ring-1 ring-white/20 shadow-lg'
            }`}
          >
            <img
              src={coverSrc}
              alt={currentTrack.title}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80';
              }}
              className={`w-18 h-18 object-cover rounded-full ${
                isPlaying ? 'animate-[spin_24s_linear_infinite]' : ''
              }`}
            />
          </div>
        </div>

        {/* 5. Top-Left Expand Button (slides in on hover) */}
        <div
          className={`absolute top-2.5 left-2.5 z-20 transition-all duration-300 ease-out transform ${
            isInteracting
              ? 'translate-x-0 translate-y-0 opacity-100 scale-100'
              : '-translate-x-6 -translate-y-6 opacity-0 scale-90 pointer-events-none'
          }`}
        >
          <button
            type="button"
            onClick={handleExpand}
            title="Expand to Fullscreen (Double-click)"
            aria-label="Expand to Fullscreen"
            className={topBtnStyle}
          >
            <Maximize2 size={13} />
          </button>
        </div>

        {/* 6. Top-Right Close Button (slides in on hover) */}
        <div
          className={`absolute top-2.5 right-2.5 z-20 transition-all duration-300 ease-out transform ${
            isInteracting
              ? 'translate-x-0 translate-y-0 opacity-100 scale-100'
              : 'translate-x-6 -translate-y-6 opacity-0 scale-90 pointer-events-none'
          }`}
        >
          <button
            type="button"
            onClick={closeDock}
            title="Close Player"
            aria-label="Close Player"
            className={`${topBtnStyle} hover:border-rose-400/40 hover:bg-rose-500/20 hover:text-rose-200`}
          >
            <X size={14} />
          </button>
        </div>

        {/* 7. Bottom Controls Cluster: Duration Scrubber + 6 Buttons Row */}
        <div
          className={`absolute bottom-2.5 inset-x-2 z-20 flex flex-col items-center gap-1.5 transition-all duration-300 ease-out transform ${
            isInteracting
              ? 'translate-y-0 opacity-100 scale-100'
              : 'translate-y-8 opacity-0 scale-90 pointer-events-none'
          }`}
        >
          {/* 7.1 Duration Scrubber Slider */}
          <div data-no-drag="true" className="w-full px-1 flex items-center gap-1.5 select-none">
            <span className="text-[9px] font-mono text-white/70 w-6 text-right tabular-nums">
              {formatTime(effectiveProgress)}
            </span>

            <div
              ref={scrubberRef}
              onPointerDown={handleScrubberPointerDown}
              className="relative flex-1 h-3 flex items-center cursor-pointer group/scrub touch-none"
              title="Seek playback position"
            >
              {/* Background Track */}
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full group-hover/scrub:bg-emerald-400 transition-[width] duration-75"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Apple Glass Thumb Knob */}
              <span
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] pointer-events-none transition-transform ${
                  isScrubbing
                    ? 'w-3 h-3 scale-110 shadow-[0_0_12px_rgba(255,255,255,1)]'
                    : 'w-2 h-2 group-hover/scrub:scale-125'
                }`}
                style={{ left: `${progressPercent}%` }}
              />
            </div>

            <span className="text-[9px] font-mono text-white/70 w-6 tabular-nums">
              {formatTime(durationMs)}
            </span>
          </div>

          {/* 7.2 The 6 Buttons Pill: Volume, Prev, Play/Pause, Next, Repeat, Queue */}
          <div
            data-no-drag="true"
            className={`flex items-center justify-between px-2 py-1 rounded-full border w-full box-border ${bottomPanelStyle}`}
          >
            {/* Button 1: Volume */}
            <div
              className="relative shrink-0 flex items-center justify-center"
              onMouseEnter={handleVolumeEnter}
              onMouseLeave={handleVolumeLeave}
            >
              <button
                type="button"
                onClick={toggleMute}
                title={isVolumeMuted ? 'Unmute' : 'Mute'}
                aria-label={isVolumeMuted ? 'Unmute' : 'Mute'}
                className={`${buttonBaseStyle} ${
                  isVolumeMuted
                    ? 'bg-rose-500/30 text-rose-200 border-rose-400/50 shadow-[0_0_12px_rgba(244,63,94,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)]'
                    : showVolumePopup || isDraggingVolume
                      ? 'bg-white/25 text-white border-white/35 shadow-[0_0_12px_rgba(255,255,255,0.3)]'
                      : ''
                }`}
              >
                {isVolumeMuted ? (
                  <VolumeX size={11} />
                ) : volume < 0.5 ? (
                  <Volume1 size={11} />
                ) : (
                  <Volume2 size={11} />
                )}
              </button>

              {/* Vertical Volume Slider - Transparent background with smooth vertical slide out/in */}
              <AnimatePresence>
                {showVolumePopup && (
                  <motion.div
                    key="volume-slider-popup"
                    initial={{ opacity: 0, y: 16, scaleY: 0.6 }}
                    animate={{ opacity: 1, y: 0, scaleY: 1 }}
                    exit={{ opacity: 0, y: 16, scaleY: 0.6 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 420 }}
                    style={{ transformOrigin: 'bottom center' }}
                    className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1.5 select-none bg-transparent"
                    onMouseEnter={handleVolumeEnter}
                    onMouseLeave={handleVolumeLeave}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[10px] font-mono font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] tabular-nums pointer-events-none">
                      {isVolumeMuted ? '0%' : `${Math.round(volume * 100)}%`}
                    </span>

                    {/* Vertical Drag/Click Pill Track */}
                    <div
                      ref={volumeTrackRef}
                      onPointerDown={handleVolumePointerDown}
                      className="relative w-2 h-20 bg-white/20 hover:bg-white/30 rounded-full cursor-pointer touch-none shadow-[0_2px_8px_rgba(0,0,0,0.5)] backdrop-blur-sm"
                      title="Adjust volume"
                    >
                      {/* Filled bar from bottom up */}
                      <div
                        className="absolute bottom-0 inset-x-0 bg-white rounded-full pointer-events-none"
                        style={{ height: `${isVolumeMuted ? 0 : volume * 100}%` }}
                      />
                      {/* Knob thumb */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.6)] pointer-events-none"
                        style={{ bottom: `${isVolumeMuted ? 0 : volume * 100}%` }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Button 2: Previous / Restart */}
            <button
              type="button"
              onClick={prevTrack}
              title="Previous / Restart"
              aria-label="Previous / Restart"
              className={buttonBaseStyle}
            >
              <SkipBack size={11} className="fill-current" />
            </button>

            {/* Button 3: Play / Pause (Liquid glass illuminated center) */}
            <button
              type="button"
              onClick={togglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-[27px] h-[27px] shrink-0 flex items-center justify-center rounded-full transition-all cursor-pointer bg-white/90 hover:bg-white text-zinc-950 border border-white/60 backdrop-blur-2xl shadow-[0_0_18px_rgba(255,255,255,0.45),inset_0_1.5px_1.5px_rgba(255,255,255,0.9)] hover:scale-106 active:scale-95"
            >
              {isPlaying ? (
                <Pause size={12} className="fill-current text-zinc-950" />
              ) : (
                <Play size={12} className="fill-current text-zinc-950 ml-0.5" />
              )}
            </button>

            {/* Button 4: Next Track */}
            <button
              type="button"
              onClick={nextTrack}
              title="Next Track"
              aria-label="Next Track"
              className={buttonBaseStyle}
            >
              <SkipForward size={11} className="fill-current" />
            </button>

            {/* Button 5: Repeat Track (Loop) with Purple Glass Accent */}
            <button
              type="button"
              onClick={toggleRepeat}
              title={
                repeatMode === 2
                  ? 'Repeat one track (loop)'
                  : repeatMode === 1
                    ? 'Repeat queue'
                    : 'Repeat off'
              }
              aria-label={
                repeatMode === 2
                  ? 'Repeat one track (loop)'
                  : repeatMode === 1
                    ? 'Repeat queue'
                    : 'Repeat off'
              }
              className={`relative ${buttonBaseStyle} ${
                repeatMode === 2
                  ? 'bg-purple-600/55 hover:bg-purple-600/65 text-white border-purple-400/70 shadow-[0_0_16px_rgba(168,85,247,0.65),inset_0_1px_1.5px_rgba(255,255,255,0.4)]'
                  : repeatMode === 1
                    ? 'bg-purple-600/35 hover:bg-purple-600/45 text-purple-200 border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)]'
                    : ''
              }`}
            >
              <Repeat size={11} className={repeatMode > 0 ? 'text-purple-200' : ''} />
              {repeatMode === 1 && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-400 shadow-[0_0_4px_#c084fc]" />
              )}
              {repeatMode === 2 && (
                <span className="absolute -top-0.5 -right-0.5 text-[7px] font-black text-white w-2.5 h-2.5 rounded-full flex items-center justify-center leading-none bg-purple-600 border border-purple-300/50 shadow-[0_0_6px_rgba(168,85,247,0.8)]">
                  1
                </span>
              )}
            </button>

            {/* Button 6: Playback Queue */}
            <button
              type="button"
              data-queue-toggle="true"
              onClick={toggleQueue}
              title="Playback Queue"
              aria-label="Playback Queue"
              className={`${buttonBaseStyle} ${
                isQueueOpen
                  ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40 shadow-[0_0_12px_rgba(52,211,153,0.35),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                  : ''
              }`}
            >
              <ListMusic size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Queue Popover via Portal anchored to square dock */}
      <SpotifyQueuePopover align="right" portal={true} anchorRect={cardRect} />
    </>
  );
};
