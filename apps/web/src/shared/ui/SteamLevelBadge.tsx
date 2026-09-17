import React from 'react';

interface SteamLevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Authentic Steam Profile Level Badge styling matching Steam's official design:
 * - 00-09: Grey (#9b9b9b)
 * - 10-19: Red (#c02942)
 * - 20-29: Orange (#d97a1e)
 * - 30-39: Yellow (#d9a81e)
 * - 40-49: Green (#467a3c / #5c7e10) -> Level 48 is green!
 * - 50-59: Blue (#4ba6df)
 * - 60-69: Purple (#8e44ad)
 * - 70-79: Pink (#d32ce6)
 * - 80-89: Dark Red (#731b26)
 * - 90-99: Bronze / Brown (#795548)
 * - 100+: Hexagonal badge following color progression
 */
const getSteamLevelColor = (level: number) => {
  const tier = Math.floor((level % 100) / 10);
  switch (tier) {
    case 0:
      return {
        border: '#9b9b9b',
        glow: 'rgba(155, 155, 155, 0.4)',
        text: '#ffffff',
        bg: '#171a21',
      };
    case 1:
      return { border: '#c02942', glow: 'rgba(192, 41, 66, 0.4)', text: '#ffffff', bg: '#171a21' };
    case 2:
      return { border: '#d97a1e', glow: 'rgba(217, 122, 30, 0.4)', text: '#ffffff', bg: '#171a21' };
    case 3:
      return { border: '#d9a81e', glow: 'rgba(217, 168, 30, 0.4)', text: '#ffffff', bg: '#171a21' };
    case 4:
      // Green (Levels 40-49, e.g. Level 48)
      return { border: '#5c7e10', glow: 'rgba(92, 126, 16, 0.45)', text: '#ffffff', bg: '#171a21' };
    case 5:
      return { border: '#4ba6df', glow: 'rgba(75, 166, 223, 0.4)', text: '#ffffff', bg: '#171a21' };
    case 6:
      return { border: '#8e44ad', glow: 'rgba(142, 68, 173, 0.4)', text: '#ffffff', bg: '#171a21' };
    case 7:
      return { border: '#d32ce6', glow: 'rgba(211, 44, 230, 0.4)', text: '#ffffff', bg: '#171a21' };
    case 8:
      return { border: '#731b26', glow: 'rgba(115, 27, 38, 0.4)', text: '#ffffff', bg: '#171a21' };
    case 9:
      return { border: '#795548', glow: 'rgba(121, 85, 72, 0.4)', text: '#ffffff', bg: '#171a21' };
    default:
      return { border: '#5c7e10', glow: 'rgba(92, 126, 16, 0.4)', text: '#ffffff', bg: '#171a21' };
  }
};

export const SteamLevelBadge: React.FC<SteamLevelBadgeProps> = ({
  level,
  size = 'md',
  className = '',
}) => {
  const safeLevel = typeof level === 'number' && !isNaN(level) ? level : 0;
  const color = getSteamLevelColor(safeLevel);
  const isHexagon = safeLevel >= 100;

  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  }[size];

  return (
    <div
      className={`inline-flex items-center justify-center font-bold select-none shrink-0 transition-transform ${sizeClasses} ${className}`}
      style={{
        backgroundColor: color.bg,
        border: `2px solid ${color.border}`,
        borderRadius: isHexagon ? '0' : '9999px',
        clipPath: isHexagon
          ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
          : undefined,
        boxShadow: `0 0 10px ${color.glow}`,
        color: color.text,
      }}
      title={`Steam Level ${safeLevel}`}
    >
      <span className="font-extrabold tracking-tight">{safeLevel}</span>
    </div>
  );
};
