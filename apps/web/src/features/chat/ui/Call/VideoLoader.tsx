import React from 'react';
import { MicOff, Monitor } from 'lucide-react';

export interface VideoLoaderProps {
  userName?: string;
  isMuted?: boolean;
  isScreenShare?: boolean;
  className?: string;
}

/**
 * Authentic Discord-Style Video & Screen Share Loader.
 * Displays the iconic tumbling dual purple cubes in the center of a dark card
 * with a bottom-left participant metadata pill badge.
 */
export function VideoLoader({
  userName,
  isMuted = false,
  isScreenShare = false,
  className = '',
}: VideoLoaderProps) {
  return (
    <div
      role="status"
      aria-label={`Connecting video for ${userName || 'participant'}...`}
      className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#1e1f22] select-none pointer-events-none transition-opacity duration-300 ${className}`}
    >
      {/* Discord tumbling dual purple cubes animation */}
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div className="discord-cubes-wrapper relative w-8 h-8">
          <div className="discord-cube-1 absolute top-0 left-0 w-3 h-3 bg-[#8b5cf6] rounded-[3px] shadow-[0_0_12px_rgba(139,92,246,0.85)]" />
          <div className="discord-cube-2 absolute bottom-0 right-0 w-3 h-3 bg-[#8b5cf6] rounded-[3px] shadow-[0_0_12px_rgba(139,92,246,0.85)]" />
        </div>
      </div>

      {/* Bottom left user metadata pill badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-semibold text-white shadow-lg pointer-events-none border border-white/10 max-w-[80%]">
        {isScreenShare ? (
          <Monitor size={13} className="text-purple-400 shrink-0" />
        ) : isMuted ? (
          <MicOff size={13} className="text-rose-400 shrink-0" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
        )}
        <span className="truncate max-w-44 text-zinc-200">{userName || 'User'}</span>
      </div>
    </div>
  );
}
