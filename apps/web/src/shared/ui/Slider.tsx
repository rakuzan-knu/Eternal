import React, { useState, useRef, useId } from 'react';
import { useThemeStore } from '@/shared/model/useThemeStore';

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatTooltip?: (value: number) => string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  /** Optional custom background element (e.g. for dual-color sensitivity meter) */
  customTrackBackground?: React.ReactNode;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  formatTooltip,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  customTrackBackground,
}: SliderProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const accentColor = useThemeStore((s) => s.accentColor) || '#5865F2';
  const id = useId();

  const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const showTooltip = (isHovered || isDragging) && !disabled;

  return (
    <div
      className={`relative w-full flex items-center py-2 select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-ew-resize'
      } ${className}`}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      {/* Floating Tooltip directly above the Thumb */}
      {showTooltip && (
        <div
          className="absolute -top-6.5 z-40 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#111214] text-white text-[11px] font-bold shadow-xl border border-white/10 pointer-events-none flex flex-col items-center animate-fadeIn"
          style={{
            left: `calc(${percent}% + ${(0.5 - percent / 100) * 16}px)`,
          }}
        >
          <span>{formatTooltip ? formatTooltip(value) : value}</span>
          <div className="w-1.5 h-1.5 bg-[#111214] border-r border-b border-white/10 rotate-45 -mb-1 mt-0.5" />
        </div>
      )}

      {/* Track Base */}
      <div className="relative w-full h-1.5 rounded-full overflow-hidden pointer-events-none">
        {customTrackBackground ? (
          customTrackBackground
        ) : (
          <div className="w-full h-full bg-black/15 dark:bg-white/15 rounded-full">
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: `${percent}%`,
                backgroundColor: accentColor,
              }}
            />
          </div>
        )}
      </div>

      {/* Actual Range Input with cursor-ew-resize */}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onTouchStart={() => setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
        className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-ew-resize focus:outline-none z-20 
          [&::-webkit-slider-runnable-track]:bg-transparent 
          [&::-webkit-slider-thumb]:appearance-none 
          [&::-webkit-slider-thumb]:w-4 
          [&::-webkit-slider-thumb]:h-4 
          [&::-webkit-slider-thumb]:rounded-full 
          [&::-webkit-slider-thumb]:bg-white 
          [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.6)] 
          [&::-webkit-slider-thumb]:cursor-ew-resize 
          [&::-webkit-slider-thumb]:transition-transform 
          [&::-webkit-slider-thumb]:hover:scale-115 
          [&::-webkit-slider-thumb]:active:scale-125
          [&::-moz-range-track]:bg-transparent
          [&::-moz-range-thumb]:w-4 
          [&::-moz-range-thumb]:h-4 
          [&::-moz-range-thumb]:rounded-full 
          [&::-moz-range-thumb]:bg-white 
          [&::-moz-range-thumb]:border-none 
          [&::-moz-range-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.6)] 
          [&::-moz-range-thumb]:cursor-ew-resize 
          [&::-moz-range-thumb]:transition-transform 
          [&::-moz-range-thumb]:hover:scale-115 
          [&::-moz-range-thumb]:active:scale-125"
      />
    </div>
  );
}
