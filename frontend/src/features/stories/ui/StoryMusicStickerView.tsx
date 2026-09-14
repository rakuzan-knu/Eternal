import React, { useState } from 'react';
import { Music } from 'lucide-react';
import type { AudioOverlay } from '../model/types';

interface StoryMusicStickerViewProps {
  overlay: AudioOverlay;
  isEditor?: boolean;
  isPlaying?: boolean;
  isHeld?: boolean;
}

export const StoryMusicStickerView: React.FC<StoryMusicStickerViewProps> = ({
  overlay,
  isEditor = false,
  isPlaying = true,
  isHeld = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const style = overlay.musicStyle || 'card';
  const customColor = overlay.stickerColor;
  const hasValidArt = Boolean(
    overlay.albumArt && !overlay.albumArt.startsWith('blob:') && !imgError,
  );

  // 1. Style "None" - Audio background only
  if (style === 'none') {
    if (!isEditor) {
      return null; // Completely invisible in story viewer!
    }
    // Minimal floating indicator in editor so the creator can see & manage it
    return (
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 text-white shadow-2xl select-none">
        <div className="w-5 h-5 rounded-full bg-purple-600/80 flex items-center justify-center">
          <Music size={11} className="text-white" />
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-white/90">
          <span>Audio only</span>
          <span className="text-white/40">•</span>
          <span className="truncate max-w-[120px] font-medium text-white/70">{overlay.title}</span>
        </div>
      </div>
    );
  }

  // Helper: check if a hex color is light or dark
  const isLightColor = (hex?: string) => {
    if (!hex || hex === '#FFFFFF') return true;
    if (hex === '#18181B' || hex === '#000000') return false;
    const clean = hex.replace('#', '');
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 150;
    }
    return true;
  };

  // 2. Style "Card" (Compact horizontal card - Screenshot 4)
  if (style === 'card') {
    const bgColor = customColor || '#FFFFFF';
    const isLight = isLightColor(bgColor);
    const textColor = isLight ? 'text-zinc-900' : 'text-white';
    const subtextColor = isLight ? 'text-zinc-600' : 'text-zinc-300';
    const eqColor = isLight ? 'bg-zinc-800' : 'bg-white';

    return (
      <div
        style={{ backgroundColor: bgColor }}
        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl shadow-2xl border border-black/5 select-none transition-colors duration-200 min-w-[190px] max-w-[260px]`}
      >
        {/* Album Art with Equalizer */}
        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-black/10 shrink-0 shadow-sm">
          {hasValidArt && overlay.albumArt ? (
            <img
              src={overlay.albumArt}
              alt={overlay.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-purple-700 to-pink-600">
              <Music size={16} className="text-white" />
            </div>
          )}
          {/* Animated Equalizer Bars */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
            <span
              className={`w-0.5 h-3 ${eqColor} rounded-full transition-all ${
                isPlaying && !isHeld ? 'animate-pulse' : 'h-1.5'
              }`}
            />
            <span
              className={`w-0.5 h-4 ${eqColor} rounded-full transition-all ${
                isPlaying && !isHeld ? 'animate-pulse delay-75' : 'h-2.5'
              }`}
            />
            <span
              className={`w-0.5 h-2.5 ${eqColor} rounded-full transition-all ${
                isPlaying && !isHeld ? 'animate-pulse delay-150' : 'h-1'
              }`}
            />
          </div>
        </div>

        {/* Titles */}
        <div className="flex flex-col min-w-0 pr-1">
          <span className={`text-xs font-black truncate tracking-tight ${textColor}`}>
            {overlay.title}
          </span>
          {overlay.artist && (
            <span className={`text-[11px] font-semibold truncate ${subtextColor}`}>
              {overlay.artist}
            </span>
          )}
        </div>
      </div>
    );
  }

  // 3. Style "Cover" (Large Album Artwork with Title below - Screenshot 3)
  if (style === 'cover') {
    const textColor = customColor || '#A855F7'; // Signature Vivid Purple Default

    return (
      <div className="flex flex-col items-center select-none">
        {/* Big Square Album Art */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-black/20 group">
          {hasValidArt && overlay.albumArt ? (
            <img
              src={overlay.albumArt}
              alt={overlay.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-purple-800 to-indigo-700">
              <Music size={44} className="text-white/80" />
            </div>
          )}

          {/* Equalizer at bottom-left corner of cover */}
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 shadow-md">
            <div className="flex items-center gap-0.5 h-3.5">
              <span
                className={`w-0.5 h-3 bg-white rounded-full ${
                  isPlaying && !isHeld ? 'animate-pulse' : 'h-1.5'
                }`}
              />
              <span
                className={`w-0.5 h-full bg-white rounded-full ${
                  isPlaying && !isHeld ? 'animate-pulse delay-75' : 'h-2'
                }`}
              />
              <span
                className={`w-0.5 h-2 bg-white rounded-full ${
                  isPlaying && !isHeld ? 'animate-pulse delay-150' : 'h-1'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Title & Artist centered below with custom text color */}
        <div className="flex flex-col items-center text-center mt-2.5 max-w-[220px]">
          <span
            style={{ color: textColor }}
            className="text-sm font-black truncate w-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          >
            {overlay.title}
          </span>
          {overlay.artist && (
            <span
              style={{ color: textColor }}
              className="text-xs font-bold opacity-90 truncate w-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
            >
              {overlay.artist}
            </span>
          )}
        </div>
      </div>
    );
  }

  // 4. Style "Vinyl" (Rotating vinyl disc - Screenshot 5)
  if (style === 'vinyl') {
    return (
      <div className="flex flex-col items-center select-none">
        {/* Vinyl Disc Container with Concentric Grooves */}
        <div
          style={{
            background:
              'radial-gradient(circle, #1f1f23 0%, #151518 26%, #0d0d10 28%, #1f1f23 33%, #0a0a0c 35%, #18181b 41%, #09090b 43%, #1c1c20 50%, #08080a 52%, #18181b 58%, #070708 60%, #141416 66%, #050506 68%, #111113 74%, #000000 100%)',
            animationPlayState: isPlaying && !isHeld ? 'running' : 'paused',
          }}
          className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.8),inset_0_0_15px_rgba(255,255,255,0.08)] flex items-center justify-center animate-[spin_6s_linear_infinite]"
        >
          {/* Vinyl Sheen Overlay (Glossy reflection) */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 via-transparent to-white/15 pointer-events-none" />

          {/* Center Circular Label */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-zinc-800 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] flex items-center justify-center bg-black">
            {hasValidArt && overlay.albumArt ? (
              <img
                src={overlay.albumArt}
                alt={overlay.title}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-purple-800 to-pink-700">
                <Music size={22} className="text-white/80" />
              </div>
            )}

            {/* Central Spindle Hole */}
            <div className="absolute w-3.5 h-3.5 rounded-full bg-black border border-white/25 shadow-inner" />
          </div>
        </div>

        {/* Title & Artist centered below in clean white */}
        <div className="flex flex-col items-center text-center mt-3 max-w-[220px]">
          <span className="text-sm font-black text-white truncate w-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {overlay.title}
          </span>
          {overlay.artist && (
            <span className="text-xs font-semibold text-white/80 truncate w-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {overlay.artist}
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
};
