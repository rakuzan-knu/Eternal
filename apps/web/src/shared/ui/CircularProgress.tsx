import React from 'react';

interface CircularProgressProps {
  /** Progress percentage from 0 to 100 */
  percent: number;
  /** Size in pixels (diameter) */
  size?: number;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Whether to show the percentage text inside */
  showPercentText?: boolean;
  /** Additional wrapper class names */
  className?: string;
  /** Ring stroke color (defaults to white) */
  color?: string;
}

export default function CircularProgress({
  percent,
  size = 54,
  strokeWidth = 3.5,
  showPercentText = true,
  className = '',
  color = '#ffffff',
}: CircularProgressProps) {
  const clampedPercent = Math.min(100, Math.max(0, Math.round(percent)));
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clampedPercent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90 transform"
        style={{ overflow: 'visible' }}
      >
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.22)"
          strokeWidth={strokeWidth}
        />
        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-200 ease-out"
        />
      </svg>

      {showPercentText && (
        <span
          className="absolute inset-0 flex items-center justify-center font-bold text-white tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
          style={{ fontSize: Math.max(10, Math.round(size * 0.26)) }}
        >
          {clampedPercent}%
        </span>
      )}
    </div>
  );
}
