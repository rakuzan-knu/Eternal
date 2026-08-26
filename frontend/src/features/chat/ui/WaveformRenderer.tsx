import React, { useRef, useState, useCallback } from 'react';
import { formatVoiceTime } from '../lib/waveformUtils';

export interface WaveformRendererProps {
  peaks: number[];
  progressFraction: number; // 0.0 - 1.0
  totalDuration: number; // in seconds
  onSeek: (fraction: number) => void;
  onHoverFractionChange?: (fraction: number | null) => void;
  isOwnMessage?: boolean;
}

export const WaveformRenderer = React.memo(function WaveformRenderer({
  peaks,
  progressFraction,
  totalDuration,
  onSeek,
  onHoverFractionChange,
  isOwnMessage = false,
}: WaveformRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Compute seek fraction from pointer event
  const getFractionFromEvent = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const clientX =
      typeof e.clientX === 'number' && !isNaN(e.clientX)
        ? e.clientX
        : typeof (e.nativeEvent as MouseEvent)?.clientX === 'number'
          ? (e.nativeEvent as MouseEvent).clientX
          : 0;
    const x = clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // In non-browser / test environments where pointer capture might not be implemented
    }

    const fraction = getFractionFromEvent(e);
    setIsScrubbing(true);
    setIsHovered(true);
    setHoverFraction(fraction);
    onHoverFractionChange?.(fraction);
    onSeek(fraction);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const fraction = getFractionFromEvent(e);
    setHoverFraction(fraction);
    setIsHovered(true);
    onHoverFractionChange?.(fraction);

    if (isScrubbing) {
      onSeek(fraction);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Test environment safe
    }

    const fraction = getFractionFromEvent(e);
    setIsScrubbing(false);
    onSeek(fraction);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Test environment safe
    }
    setIsScrubbing(false);
    setIsHovered(false);
    setHoverFraction(null);
    onHoverFractionChange?.(null);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) {
      setIsHovered(false);
      setHoverFraction(null);
      onHoverFractionChange?.(null);
    }
  };

  const activeHoverFraction = isHovered && hoverFraction !== null ? hoverFraction : null;
  const tooltipTime = activeHoverFraction !== null ? activeHoverFraction * totalDuration : null;

  return (
    <div
      ref={containerRef}
      data-testid="waveform-renderer"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
      className="group relative flex items-center justify-between gap-[2px] h-[24px] w-full min-w-0 cursor-pointer select-none touch-none py-1"
      title={totalDuration > 0 ? `Duration: ${formatVoiceTime(totalDuration)}` : undefined}
    >
      {/* Floating Seek Tooltip on Hover / Drag */}
      {tooltipTime !== null && totalDuration > 0 && (
        <div
          data-testid="waveform-tooltip"
          className="absolute -top-6 -translate-x-1/2 z-30 pointer-events-none px-1.5 py-0.5 rounded-md bg-[#10121a]/95 border border-purple-400/30 text-[10px] font-mono font-medium text-purple-200 shadow-xl backdrop-blur-md whitespace-nowrap animate-fadeIn"
          style={{
            left: `${Math.max(8, Math.min(92, (hoverFraction ?? 0) * 100))}%`,
          }}
        >
          {formatVoiceTime(tooltipTime)}
        </div>
      )}

      {/* 45 Waveform Bars */}
      {peaks.map((peak, idx) => {
        const barCenterFraction = (idx + 0.5) / peaks.length;
        const isPlayed = barCenterFraction <= progressFraction;
        const isHoverPreview =
          activeHoverFraction !== null &&
          ((activeHoverFraction >= progressFraction &&
            barCenterFraction > progressFraction &&
            barCenterFraction <= activeHoverFraction) ||
            (activeHoverFraction < progressFraction &&
              barCenterFraction <= progressFraction &&
              barCenterFraction >= activeHoverFraction));

        // Height between 4px and 22px
        const barHeight = Math.max(4, Math.min(22, Math.round(peak * 22)));

        let barColorClass = 'bg-white/25 group-hover:bg-white/35';
        if (isPlayed) {
          barColorClass = isOwnMessage
            ? 'bg-purple-300 shadow-[0_0_6px_rgba(216,180,254,0.6)]'
            : 'bg-sky-300 shadow-[0_0_6px_rgba(125,211,252,0.6)]';
        } else if (isHoverPreview) {
          barColorClass = isOwnMessage ? 'bg-purple-400/70' : 'bg-sky-400/70';
        }

        return (
          <div
            key={idx}
            data-testid={`waveform-bar-${idx}`}
            className="flex-1 flex items-center justify-center h-full min-w-[2px] pointer-events-none"
          >
            <span
              className={`w-full rounded-full transition-colors duration-75 ${barColorClass}`}
              style={{
                height: `${barHeight}px`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
});
