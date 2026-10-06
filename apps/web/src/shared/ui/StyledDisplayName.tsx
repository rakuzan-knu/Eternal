import React, { useMemo } from 'react';
import type { DisplayNameStyleDto } from '@social-network/shared-contracts';
import { useThemeStore, isCurrentThemeLight } from '@/shared/model/useThemeStore';
import { useActiveDecorationStore } from '@/shared/model/useActiveDecorationStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import {
  getAdaptiveContrastColor,
  adaptGradientString,
  adaptGummyColors,
} from '@/shared/lib/colorContrast';

export interface StyledDisplayNameProps {
  name: string;
  nameStyle?: DisplayNameStyleDto | null;
  style?: DisplayNameStyleDto | null;
  userId?: string | null;
  isCurrentUser?: boolean;
  className?: string;
  nameClassName?: string;
  overrideColor?: string;
  isLightBackground?: boolean;
  themeMode?: 'light' | 'dark';
}

export function StyledDisplayName({
  name,
  nameStyle: propNameStyle,
  style: propStyle,
  userId,
  isCurrentUser: propIsCurrentUser,
  className = '',
  nameClassName = '',
  overrideColor,
  isLightBackground: propIsLight,
  themeMode,
}: StyledDisplayNameProps) {
  const { data: currentUser } = useCurrentUser();
  const themeIsLight = useThemeStore((s) => isCurrentThemeLight(s));
  const isLight =
    themeMode !== undefined
      ? themeMode === 'light'
      : propIsLight !== undefined
        ? propIsLight
        : themeIsLight;

  const activeNameStyle = useActiveDecorationStore((s) => s.activeNameStyle);
  const isCurrent =
    propIsCurrentUser ??
    (Boolean(userId && currentUser?.id && userId === currentUser.id) ||
      (!userId && currentUser?.displayName === name));

  const directPropStyle = propNameStyle !== undefined ? propNameStyle : propStyle;

  // If this is the current user, prioritize activeNameStyle or profile style; otherwise use direct prop style
  const effectiveStyle: DisplayNameStyleDto | null = useMemo(() => {
    if (isCurrent) {
      return activeNameStyle ?? currentUser?.displayNameStyle ?? directPropStyle ?? null;
    }
    return directPropStyle ?? null;
  }, [directPropStyle, isCurrent, activeNameStyle, currentUser?.displayNameStyle]);

  if (!effectiveStyle) {
    return (
      <span
        data-nameplate-label
        className={`truncate inline-flex items-center ${
          isLight ? 'text-gray-900' : 'text-white'
        } ${className} ${nameClassName}`}
      >
        {name}
      </span>
    );
  }

  const { fontFamily, effect, color, gradient, gummyColors, animation } = effectiveStyle;
  const rawColor = overrideColor || color || '#10b981';

  // Smart Adaptive Color Contrast (Discord-style)
  const adaptiveColor = getAdaptiveContrastColor(rawColor, isLight);

  // 1. POP EFFECT
  // Each letter pops slightly upward leaving behind an extruded 3D shadow trail
  if (effect === 'highlight') {
    const letters = name.split('');
    const textColor = isLight ? '#18181b' : '#ffffff';
    return (
      <span
        data-nameplate-label
        className={`select-none tracking-wide font-extrabold inline-flex items-center ${className} ${nameClassName}`}
        style={{
          fontFamily: fontFamily || 'inherit',
          ['--pop-trail-color' as any]: adaptiveColor,
        }}
      >
        {letters.map((char, idx) => (
          <span
            key={idx}
            className="inline-block"
            style={{
              color: textColor,
              animation: 'popLetterBounce 2s ease-in-out infinite',
              animationDelay: `${idx * 0.12}s`,
              textShadow: `0 1px 0 ${adaptiveColor}, 0 2px 0 ${adaptiveColor}, 0 3px 0 ${adaptiveColor}`,
              willChange: 'transform, text-shadow',
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </span>
    );
  }

  // 2. GUMMY EFFECT
  // 4 distinct pastel colors cycling letter-by-letter with adaptive contrast
  if (effect === 'gummy') {
    const defaultPalette = ['#c084fc', '#67e8f9', '#f472b6', '#4ade80'];
    const palette = adaptGummyColors(
      gummyColors && gummyColors.length === 4 ? gummyColors : defaultPalette,
      isLight,
    );
    const letters = name.split('');
    return (
      <span
        data-nameplate-label
        className={`select-none tracking-wide font-extrabold inline-flex items-center ${className} ${nameClassName}`}
        style={{
          fontFamily: fontFamily || 'inherit',
        }}
      >
        {letters.map((char, idx) => {
          const charColor = palette[idx % palette.length];
          return (
            <span
              key={idx}
              className="inline-block"
              style={{
                color: charColor,
                animation: 'gummyJellyStretch 2s ease-in-out infinite',
                animationDelay: `${idx * 0.15}s`,
                textShadow: isLight
                  ? `0 1px 0 rgba(0,0,0,0.25), 0 2px 4px ${charColor}55`
                  : `0 2px 0 rgba(0,0,0,0.35), 0 3px 6px ${charColor}66, 0 -1px 0 rgba(255,255,255,0.7)`,
                transformOrigin: 'bottom center',
                willChange: 'transform',
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          );
        })}
      </span>
    );
  }

  // 3. PRISM EFFECT
  // Smooth rainbow gradient shimmer flowing right to left with adaptive color stops
  if (effect === 'prism') {
    const defaultGradient =
      'linear-gradient(90deg, #ff4e50 0%, #f9d423 16.6%, #10b981 33.3%, #06b6d4 50%, #6366f1 66.6%, #ec4899 83.3%, #ff4e50 100%)';
    const prismGradient = adaptGradientString(gradient || defaultGradient, isLight);
    return (
      <span
        data-nameplate-label
        className={`select-none tracking-wide font-extrabold inline-flex items-center ${className} ${nameClassName}`}
        style={{
          fontFamily: fontFamily || 'inherit',
          backgroundImage: prismGradient,
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
          animation: 'prismFlowRightToLeft 2.8s linear infinite',
          filter: isLight
            ? 'drop-shadow(0 1px 1px rgba(0,0,0,0.25))'
            : 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))',
        }}
      >
        {name}
      </span>
    );
  }

  // 4. NEON EFFECT
  // Clean outlined stroke with light glow
  if (effect === 'neon') {
    return (
      <span
        data-nameplate-label
        className={`select-none tracking-wide font-extrabold inline-flex items-center ${className} ${nameClassName}`}
        style={{
          fontFamily: fontFamily || 'inherit',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
          WebkitTextStroke: `1.2px ${adaptiveColor}`,
          textShadow: 'none',
          filter: isLight
            ? `drop-shadow(0 0 1px ${adaptiveColor}) drop-shadow(0 0 1px rgba(0,0,0,0.4))`
            : `drop-shadow(0 0 1px ${adaptiveColor})`,
        }}
      >
        {name}
      </span>
    );
  }

  // 5. TOON EFFECT
  // Smooth cartoon gradient sweep bottom to top
  if (effect === 'cartoon') {
    const toonTopColor = isLight ? '#000000' : '#ffffff';
    const toonGrad = `linear-gradient(180deg, ${toonTopColor} 0%, ${toonTopColor} 30%, ${adaptiveColor} 65%, ${toonTopColor} 100%)`;
    return (
      <span
        data-nameplate-label
        className={`select-none tracking-wide font-black inline-flex items-center ${className} ${nameClassName}`}
        style={{
          fontFamily: fontFamily || 'inherit',
          backgroundImage: toonGrad,
          backgroundSize: '100% 200%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
          animation: 'toonFlowBottomToTop 2.6s ease-in-out infinite',
          filter:
            'drop-shadow(1px 1px 0 #000000) drop-shadow(-1px -1px 0 #000000) drop-shadow(1px -1px 0 #000000) drop-shadow(-1px 1px 0 #000000) drop-shadow(0 2px 0 #000000)',
        }}
      >
        {name}
      </span>
    );
  }

  // 6. GRADIENT EFFECT
  if (effect === 'gradient') {
    const defaultGrad = `linear-gradient(135deg, ${adaptiveColor} 0%, #a855f7 50%, #38bdf8 100%)`;
    const grad = adaptGradientString(gradient || defaultGrad, isLight);
    return (
      <span
        data-nameplate-label
        className={`select-none tracking-wide font-extrabold inline-flex items-center ${className} ${nameClassName}`}
        style={{
          fontFamily: fontFamily || 'inherit',
          backgroundImage: grad,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
          filter: isLight
            ? 'drop-shadow(0 1px 1px rgba(0,0,0,0.2))'
            : 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))',
        }}
      >
        {name}
      </span>
    );
  }

  // 7. SOLID / MINIMAL / DEFAULT
  return (
    <span
      data-nameplate-label
      className={`select-none tracking-wide font-bold inline-flex items-center ${className} ${nameClassName}`}
      style={{
        fontFamily: fontFamily || 'inherit',
        color: adaptiveColor,
        animation:
          animation === 'pulse'
            ? 'nameGlowPulseAnim 2.5s ease-in-out infinite'
            : animation === 'float'
              ? 'nameFloatAnim 2s ease-in-out infinite'
              : undefined,
      }}
    >
      {name}
    </span>
  );
}

export default StyledDisplayName;
