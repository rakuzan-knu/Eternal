import { useState, useEffect, useMemo } from 'react';
import { useThemeStore, GRADIENT_PRESETS, isCurrentThemeLight } from '@/shared/model/useThemeStore';
import { hexToRgb, calculateRelativeLuminance } from './themeContrastEngine';
import { extractDominantColorsFromImage } from '@/features/chat/lib/themeUtils';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface LiquidGlassTheme {
  isLight: boolean;
  liquidGradient: string;
  popoverGradient: string;
  dominantColors: string[];
  backdropFilter: string;
  WebkitBackdropFilter: string;
  topSpecularClass: string;
  bottomSpecularClass: string;
  borderClass: string;
  boxShadow: string;
}

// In-memory cache for extracted dominant colors from wallpapers (by URL)
export const wallpaperColorsCache = new Map<string, string[]>();

export function getCachedWallpaperColors(url?: string | null): string[] | null {
  if (!url) return null;
  return wallpaperColorsCache.get(url) || null;
}

/**
 * Parses hex/rgb/rgba color strings safely into an RGB numeric object.
 */
export function parseColorToRgb(color?: string | null): RgbColor {
  if (!color) return { r: 24, g: 26, b: 36 };
  const trimmed = color.trim();
  if (trimmed.startsWith('#')) {
    return hexToRgb(trimmed);
  }
  const rgbMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: Math.max(0, Math.min(255, parseInt(rgbMatch[1], 10))),
      g: Math.max(0, Math.min(255, parseInt(rgbMatch[2], 10))),
      b: Math.max(0, Math.min(255, parseInt(rgbMatch[3], 10))),
    };
  }
  return { r: 24, g: 26, b: 36 };
}

/**
 * Hook providing dynamic Apple iOS Liquid Glass gradient styling extracted from the
 * page background (whether it's an image/GIF wallpaper, a gradient preset, or a solid theme).
 */
export function useLiquidGlassTheme(): LiquidGlassTheme {
  const solidTheme = useThemeStore((s) => s.solidTheme);
  const themeMode = useThemeStore((s) => s.themeMode);
  const wallpaper = useThemeStore((s) => s.wallpaper);
  const gradientPresetId = useThemeStore((s) => s.gradientPresetId);
  const customGradient = useThemeStore((s) => s.customGradient);
  const customSolidColor = useThemeStore((s) => s.customSolidColor);
  const accentColor = useThemeStore((s) => s.accentColor);

  const isLight = useMemo(() => {
    return isCurrentThemeLight({
      themeMode,
      solidTheme,
      customSolidColor,
      wallpaper,
      gradientPresetId,
      customGradient,
    });
  }, [themeMode, solidTheme, customSolidColor, wallpaper, gradientPresetId, customGradient]);

  const [wallpaperColors, setWallpaperColors] = useState<string[] | null>(() => {
    if (themeMode === 'wallpaper' && wallpaper?.url && wallpaperColorsCache.has(wallpaper.url)) {
      return wallpaperColorsCache.get(wallpaper.url)!;
    }
    return null;
  });

  // Extract dominant colors from wallpaper image/GIF
  useEffect(() => {
    if (themeMode !== 'wallpaper' || !wallpaper?.url) {
      setWallpaperColors(null);
      return;
    }

    if (wallpaperColorsCache.has(wallpaper.url)) {
      setWallpaperColors(wallpaperColorsCache.get(wallpaper.url)!);
      return;
    }

    let isMounted = true;
    extractDominantColorsFromImage(wallpaper.url, 3)
      .then((colors) => {
        if (!isMounted) return;
        const validColors =
          colors && colors.length > 0 ? colors : ['#8b5cf6', '#ec4899', '#3b82f6'];
        if (wallpaperColorsCache.size >= 50) {
          const firstKey = wallpaperColorsCache.keys().next().value;
          if (firstKey) wallpaperColorsCache.delete(firstKey);
        }
        wallpaperColorsCache.set(wallpaper.url, validColors);
        setWallpaperColors(validColors);
      })
      .catch(() => {
        if (!isMounted) return;
        const fallback = ['#8b5cf6', '#ec4899', '#3b82f6'];
        if (wallpaperColorsCache.size >= 50) {
          const firstKey = wallpaperColorsCache.keys().next().value;
          if (firstKey) wallpaperColorsCache.delete(firstKey);
        }
        wallpaperColorsCache.set(wallpaper.url, fallback);
        setWallpaperColors(fallback);
      });

    return () => {
      isMounted = false;
    };
  }, [themeMode, wallpaper?.url]);

  // Compute dominant color stops
  const dominantColors = useMemo<string[]>(() => {
    if (themeMode === 'wallpaper' && wallpaper?.url) {
      if (wallpaperColors && wallpaperColors.length >= 2) {
        return wallpaperColors;
      }
      return [
        accentColor || '#8B5CF6',
        isLight ? '#cbd5e1' : '#1e293b',
        isLight ? '#f1f5f9' : '#0f172a',
      ];
    }

    if (themeMode === 'gradient') {
      if (gradientPresetId && gradientPresetId !== 'custom') {
        const preset = GRADIENT_PRESETS.find((p) => p.id === gradientPresetId);
        if (preset?.colors && preset.colors.length >= 2) {
          return preset.colors;
        }
      } else if (customGradient?.from && customGradient?.to) {
        return [customGradient.from, customGradient.to, customGradient.from];
      }
    }

    if (themeMode === 'solid') {
      if (solidTheme === 'custom' && customSolidColor) {
        return [customSolidColor, accentColor || '#8B5CF6', customSolidColor];
      }
      if (solidTheme === 'light') {
        return [accentColor || '#3b82f6', '#e2e8f0', '#f8fafc'];
      }
      if (solidTheme === 'ash') {
        return ['#26262b', accentColor || '#8B5CF6', '#18181b'];
      }
      // dark / midnight
      return ['#11131a', accentColor || '#8B5CF6', '#090a0f'];
    }

    return isLight
      ? ['#f8fafc', '#e2e8f0', '#ffffff']
      : ['#181922', accentColor || '#8B5CF6', '#0c0d12'];
  }, [
    themeMode,
    wallpaper?.url,
    wallpaperColors,
    gradientPresetId,
    customGradient,
    solidTheme,
    customSolidColor,
    accentColor,
    isLight,
  ]);

  // Generate Apple iOS Liquid Glass multi-layer gradient
  const { liquidGradient, popoverGradient } = useMemo(() => {
    const c1 = parseColorToRgb(dominantColors[0] || (isLight ? '#f8fafc' : '#181922'));
    const c2 = parseColorToRgb(dominantColors[1] || dominantColors[0]);
    const c3 = parseColorToRgb(dominantColors[2] || dominantColors[1] || dominantColors[0]);

    if (isLight) {
      return {
        liquidGradient: `linear-gradient(135deg, rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.18) 0%, rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.08) 50%, rgba(${c3.r}, ${c3.g}, ${c3.b}, 0.14) 100%), linear-gradient(180deg, rgba(255, 255, 255, 0.75) 0%, rgba(244, 246, 250, 0.84) 100%)`,
        popoverGradient: `linear-gradient(145deg, rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.18) 0%, rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.08) 50%, rgba(${c3.r}, ${c3.g}, ${c3.b}, 0.14) 100%), linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.94) 100%)`,
      };
    }

    return {
      liquidGradient: `linear-gradient(135deg, rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.40) 0%, rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.22) 50%, rgba(${c3.r}, ${c3.g}, ${c3.b}, 0.34) 100%), linear-gradient(180deg, rgba(22, 25, 34, 0.64) 0%, rgba(10, 11, 16, 0.76) 100%)`,
      popoverGradient: `linear-gradient(145deg, rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.42) 0%, rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.22) 50%, rgba(${c3.r}, ${c3.g}, ${c3.b}, 0.36) 100%), linear-gradient(180deg, rgba(20, 22, 30, 0.82) 0%, rgba(9, 10, 15, 0.90) 100%)`,
    };
  }, [dominantColors, isLight]);

  const topSpecularClass = isLight
    ? 'bg-gradient-to-r from-transparent via-white/80 to-transparent'
    : 'bg-gradient-to-r from-transparent via-white/50 to-transparent';

  const bottomSpecularClass = isLight
    ? 'bg-gradient-to-r from-transparent via-white/40 to-transparent'
    : 'bg-gradient-to-r from-transparent via-white/10 to-transparent';

  const borderClass = isLight ? 'border border-white/60' : 'border border-white/20';

  const boxShadow = isLight
    ? '0 16px 36px -6px rgba(0, 0, 0, 0.14), 0 4px 12px -2px rgba(0, 0, 0, 0.06), inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.04)'
    : 'inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.45), inset 0 -1px 1.5px 0 rgba(255, 255, 255, 0.1), inset 0 0 16px 2px rgba(255, 255, 255, 0.04), 0 24px 48px -12px rgba(0, 0, 0, 0.75), 0 8px 16px -4px rgba(0, 0, 0, 0.5)';

  return {
    isLight,
    liquidGradient,
    popoverGradient,
    dominantColors,
    backdropFilter: 'blur(40px) saturate(210%) brightness(106%)',
    WebkitBackdropFilter: 'blur(40px) saturate(210%) brightness(106%)',
    topSpecularClass,
    bottomSpecularClass,
    borderClass,
    boxShadow,
  };
}
