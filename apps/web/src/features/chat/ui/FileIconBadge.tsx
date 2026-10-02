import React from 'react';
import { getFileTypeMeta, getFileExtension } from '../lib/fileTypeUtils';

export interface FileIconBadgeProps {
  fileName?: string | null;
  mimeType?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const SIZE_CONFIGS = {
  xs: { width: 26, height: 32, foldSize: 8, fontSize: 8, radius: 4 },
  sm: { width: 34, height: 42, foldSize: 10, fontSize: 9.5, radius: 6 },
  md: { width: 42, height: 52, foldSize: 12, fontSize: 11, radius: 7 },
  lg: { width: 56, height: 68, foldSize: 16, fontSize: 13, radius: 9 },
  xl: { width: 72, height: 88, foldSize: 20, fontSize: 15, radius: 11 },
};

export default function FileIconBadge({
  fileName,
  mimeType,
  size = 'md',
  className = '',
  onClick,
}: FileIconBadgeProps) {
  const meta = getFileTypeMeta(fileName, mimeType);
  const ext = (getFileExtension(fileName) || meta.extension || 'file').toUpperCase().slice(0, 5);

  const cfg = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;
  const { width, height, foldSize, fontSize, radius } = cfg;

  // Telegram color schemes for document sheets
  const colorMap: Record<string, { top: string; bottom: string; fold: string; shadow: string }> = {
    pdf: { top: '#ef4444', bottom: '#dc2626', fold: '#fca5a5', shadow: 'rgba(239, 68, 68, 0.45)' },
    word: {
      top: '#3b82f6',
      bottom: '#1d4ed8',
      fold: '#93c5fd',
      shadow: 'rgba(59, 130, 246, 0.45)',
    },
    excel: {
      top: '#22c55e',
      bottom: '#15803d',
      fold: '#86efac',
      shadow: 'rgba(34, 197, 94, 0.45)',
    },
    powerpoint: {
      top: '#f97316',
      bottom: '#c2410c',
      fold: '#fdba74',
      shadow: 'rgba(249, 115, 22, 0.45)',
    },
    text: { top: '#06b6d4', bottom: '#0369a1', fold: '#67e8f9', shadow: 'rgba(6, 182, 212, 0.45)' },
    code: {
      top: '#8b5cf6',
      bottom: '#6d28d9',
      fold: '#c4b5fd',
      shadow: 'rgba(139, 92, 246, 0.45)',
    },
    archive: {
      top: '#f59e0b',
      bottom: '#b45309',
      fold: '#fcd34d',
      shadow: 'rgba(245, 158, 11, 0.45)',
    },
    audio: {
      top: '#a855f7',
      bottom: '#7e22ce',
      fold: '#d8b4fe',
      shadow: 'rgba(168, 85, 247, 0.45)',
    },
    video: {
      top: '#6366f1',
      bottom: '#4338ca',
      fold: '#a5b4fc',
      shadow: 'rgba(99, 102, 241, 0.45)',
    },
    image: {
      top: '#10b981',
      bottom: '#047857',
      fold: '#6ee7b7',
      shadow: 'rgba(16, 185, 129, 0.45)',
    },
    other: {
      top: '#64748b',
      bottom: '#334155',
      fold: '#cbd5e1',
      shadow: 'rgba(100, 116, 139, 0.45)',
    },
  };

  const colors = colorMap[meta.category] || colorMap.other;
  const gradientId = `fib-grad-${meta.category}-${size}-${ext}`;
  const foldGradId = `fib-fold-${meta.category}-${size}-${ext}`;

  // SVG path coordinates for sheet with folded top-right corner
  // (0,0) with radius down to (0, height), right to (width, height), up to (width, foldSize),
  // then angle to (width - foldSize, 0), and back to (radius, 0)
  const mainPath = `
    M 0 ${radius}
    A ${radius} ${radius} 0 0 1 ${radius} 0
    L ${width - foldSize} 0
    L ${width} ${foldSize}
    L ${width} ${height - radius}
    A ${radius} ${radius} 0 0 1 ${width - radius} ${height}
    L ${radius} ${height}
    A ${radius} ${radius} 0 0 1 0 ${height - radius}
    Z
  `;

  // Fold flap: triangle at top-right corner
  const foldPath = `
    M ${width - foldSize} 0
    L ${width - foldSize} ${foldSize - 2}
    A 2 2 0 0 0 ${width - foldSize + 2} ${foldSize}
    L ${width} ${foldSize}
    Z
  `;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''
      } ${className}`}
      style={{ width, height }}
      title={`${meta.description} (${ext})`}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible drop-shadow-sm"
      >
        <defs>
          {/* Main sheet gradient */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.top} />
            <stop offset="100%" stopColor={colors.bottom} />
          </linearGradient>

          {/* Fold flap highlight gradient */}
          <linearGradient id={foldGradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
            <stop offset="100%" stopColor={colors.fold} stopOpacity="0.9" />
          </linearGradient>

          {/* Realistic subtle shadow filter */}
          <filter id={`fib-shadow-${size}`} x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor={colors.shadow} />
          </filter>
        </defs>

        {/* Main Paper Sheet */}
        <path d={mainPath} fill={`url(#${gradientId})`} filter={`url(#fib-shadow-${size})`} />

        {/* Subtle document horizontal lines graphic in top half */}
        {size !== 'xs' && (
          <g
            opacity="0.3"
            stroke="#ffffff"
            strokeWidth={size === 'sm' ? 1.2 : 1.5}
            strokeLinecap="round"
          >
            <line x1={width * 0.22} y1={height * 0.28} x2={width * 0.6} y2={height * 0.28} />
            <line x1={width * 0.22} y1={height * 0.4} x2={width * 0.76} y2={height * 0.4} />
            {size !== 'sm' && (
              <line x1={width * 0.22} y1={height * 0.52} x2={width * 0.55} y2={height * 0.52} />
            )}
          </g>
        )}

        {/* Fold Flap (Top-right dog ear) */}
        <path d={foldPath} fill={`url(#${foldGradId})`} />
        {/* Dark crease under fold */}
        <path
          d={`M ${width - foldSize} ${foldSize} L ${width - foldSize} 0`}
          stroke="rgba(0, 0, 0, 0.2)"
          strokeWidth="0.75"
        />
        <path
          d={`M ${width - foldSize} ${foldSize} L ${width} ${foldSize}`}
          stroke="rgba(0, 0, 0, 0.2)"
          strokeWidth="0.75"
        />

        {/* Extension Badge Text Container (bottom area) */}
        <rect
          x={width * 0.12}
          y={height - fontSize * 1.85}
          width={width * 0.76}
          height={fontSize * 1.45}
          rx={Math.max(2, radius * 0.5)}
          fill="rgba(0, 0, 0, 0.22)"
        />

        {/* Bold White Extension Text */}
        <text
          x={width / 2}
          y={height - fontSize * 0.78}
          textAnchor="middle"
          fill="#ffffff"
          fontSize={fontSize}
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="800"
          letterSpacing="0.04em"
        >
          {ext}
        </text>
      </svg>
    </div>
  );
}
