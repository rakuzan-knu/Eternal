import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getTextOnAccent,
  generateSemanticTokens,
  calculateRelativeLuminance,
  hexToRgb,
} from '../lib/themeContrastEngine';
import { getCachedWallpaperColors, parseColorToRgb } from '../lib/useLiquidGlassTheme';
import { idbGet } from '../lib/indexedDbStorage';
import { CHAT_FONTS } from '@/features/chat/model/chatTheme';
import { loadThemeFont } from '@/features/chat/lib/fontLoader';
import { CURSOR_PRESETS, applyCursorToDOM } from '../lib/cursorEngine';

export type AppFontScope = 'none' | 'headings' | 'all';
export type CursorSize = 'normal' | 'large';

export type Theme = 'dark' | 'light';
export type BaseSolidTheme = 'light' | 'ash' | 'dark' | 'midnight' | 'custom';
export type ThemeMode = 'solid' | 'gradient' | 'wallpaper';

export interface CustomGradientConfig {
  from: string;
  to: string;
  angle: number;
}

export interface WallpaperConfig {
  id: string;
  name: string;
  url: string;
  dimming: number; // 0.2 to 0.9 (overlay darkness)
  blur: number; // 0 to 20 px (active for static images)
  isAnimated: boolean;
  mediaType: 'image' | 'gif' | 'video';
  themeMode?: 'dark' | 'light';
}

export interface GradientPreset {
  id: string;
  name: string;
  gradient: string;
  colors: string[];
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: 'midnight-violet',
    name: 'Midnight Violet',
    gradient: 'linear-gradient(135deg, #180728 0%, #3b0764 50%, #0d0218 100%)',
    colors: ['#180728', '#3b0764', '#0d0218'],
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    gradient: 'linear-gradient(135deg, #022c43 0%, #053f5c 50%, #011627 100%)',
    colors: ['#022c43', '#053f5c', '#011627'],
  },
  {
    id: 'sunset-mirage',
    name: 'Sunset Mirage',
    gradient: 'linear-gradient(135deg, #431407 0%, #7c2d12 50%, #1f0802 100%)',
    colors: ['#431407', '#7c2d12', '#1f0802'],
  },
  {
    id: 'emerald-aurora',
    name: 'Emerald Aurora',
    gradient: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #011710 100%)',
    colors: ['#022c22', '#064e3b', '#011710'],
  },
  {
    id: 'deep-space',
    name: 'Deep Space',
    gradient: 'linear-gradient(135deg, #090a0f 0%, #1b2838 50%, #050608 100%)',
    colors: ['#090a0f', '#1b2838', '#050608'],
  },
];

export const ACCENT_PRESETS = [
  { id: 'eternal-violet', name: 'Eternal Violet', hex: '#8B5CF6' },
  { id: 'neon-purple', name: 'Neon Purple', hex: '#A855F7' },
  { id: 'discord-blurple', name: 'Blurple', hex: '#5865F2' },
  { id: 'cyber-cyan', name: 'Cyan', hex: '#06B6D4' },
  { id: 'emerald', name: 'Emerald', hex: '#10B981' },
  { id: 'spotify-green', name: 'Spotify Green', hex: '#1ED760' },
  { id: 'sunset', name: 'Amber Glow', hex: '#F59E0B' },
  { id: 'rose-quartz', name: 'Rose', hex: '#F43F5E' },
];

export const SOLID_THEME_COLORS: Record<BaseSolidTheme, string> = {
  light: '#f8fafc',
  ash: '#26262b',
  dark: '#050505',
  midnight: '#000000',
  custom: '#7c3aed',
};

export interface ThemeSnapshot {
  themeMode: ThemeMode;
  solidTheme: BaseSolidTheme;
  customSolidColor: string | null;
  gradientPresetId: string | null;
  customGradient: CustomGradientConfig;
  wallpaper: WallpaperConfig | null;
  label: string;
}

export interface ThemeState {
  // Legacy fields
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Enterprise fields
  themeMode: ThemeMode;
  solidTheme: BaseSolidTheme;
  customSolidColor: string | null;
  recentColors: string[]; // max 3 recent custom canvas colors
  accentColor: string;
  textOnAccent: '#000000' | '#ffffff';
  recentAccents: string[]; // max 3 recent custom accents
  gradientPresetId: string | null;
  customGradient: CustomGradientConfig;
  wallpaper: WallpaperConfig | null;
  glassmorphismOpacity: number; // 0.0 to 1.0 (default 0.6)
  isGlassmorphismEnabled: boolean;
  syncWithSystem: boolean;
  ambientPlayerGlow: boolean;
  soundFxEnabled: boolean;
  previousThemeSnapshot: ThemeSnapshot | null;

  // Typography Engine fields
  appFontId: string;
  appFontFamily: string;
  appFontScope: AppFontScope;
  appTextEffect: string;
  appTextColor: string;

  // Actions
  setSolidTheme: (solidTheme: BaseSolidTheme, keepSync?: boolean) => void;
  restorePreviousTheme: () => void;
  setCustomSolidColor: (color: string) => void;
  setAccentColor: (accent: string) => void;
  setGradientPreset: (presetId: string) => void;
  setCustomGradient: (gradient: CustomGradientConfig) => void;
  setWallpaper: (wallpaper: WallpaperConfig | null) => void;
  activateWallpaper: () => void;
  updateWallpaperSettings: (
    settings: Partial<Pick<WallpaperConfig, 'dimming' | 'blur' | 'themeMode'>>,
  ) => void;
  setGlassmorphismOpacity: (opacity: number) => void;
  setSyncWithSystem: (enabled: boolean) => void;
  setAmbientPlayerGlow: (enabled: boolean) => void;
  setSoundFxEnabled: (enabled: boolean) => void;
  resetToDefaults: () => void;

  // Typography Actions
  setAppFontId: (id: string) => void;
  setAppFontScope: (scope: AppFontScope) => void;
  setAppTextEffect: (effect: string) => void;
  setAppTextColor: (color: string) => void;
  resetAppTypography: () => void;

  // Custom Cursor Engine fields
  customCursorEnabled: boolean;
  customCursorId: string;
  customCursorVariant: string;
  customCursorSize: CursorSize;

  // Custom Cursor VFX fields
  cursorVfxEnabled: boolean;
  cursorVfxTrail: boolean;
  cursorVfxClick: boolean;
  cursorVfxHover: boolean;

  // Custom Cursor Actions
  setCustomCursorEnabled: (enabled: boolean) => void;
  setCustomCursorId: (id: string) => void;
  setCustomCursorVariant: (variant: string) => void;
  setCustomCursor: (id: string, variant?: string) => void;
  setCustomCursorSize: (size: CursorSize) => void;
  setCursorVfxEnabled: (enabled: boolean) => void;
  setCursorVfxSetting: (key: 'trail' | 'click' | 'hover', enabled: boolean) => void;
  resetCustomCursor: () => void;
}

export const IDB_WALLPAPER_KEY = 'app_custom_wallpaper_blob';

let activeWallpaperObjectUrl: string | null = null;
let rehydratingPromise: Promise<string | null> | null = null;

/**
 * Rehydrates custom wallpaper blob from local IndexedDB storage.
 * Guarantees uploaded media survives page refreshes and browser restarts without quota limits.
 * Employs deduplication lock and graceful delayed revocation to prevent infinite DOM error loops.
 */
export async function rehydrateWallpaperBlob(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // 1. Deduplication: if rehydration is already in-flight, reuse existing promise
  if (rehydratingPromise) {
    return rehydratingPromise;
  }

  // 2. Reuse: if we already have an active valid blob URL in this session, return it immediately
  const current = useThemeStore.getState();
  if (activeWallpaperObjectUrl && current.wallpaper?.url === activeWallpaperObjectUrl) {
    return activeWallpaperObjectUrl;
  }

  rehydratingPromise = (async () => {
    try {
      const blob = await idbGet<Blob>(IDB_WALLPAPER_KEY);
      if (!blob) return null;

      const oldUrl = activeWallpaperObjectUrl;
      const freshUrl = URL.createObjectURL(blob);
      activeWallpaperObjectUrl = freshUrl;

      // Delayed revocation: give active DOM nodes 2 seconds to transition before freeing previous blob
      if (oldUrl && oldUrl !== freshUrl) {
        setTimeout(() => safeRevokeMediaUrl(oldUrl), 2000);
      }

      const isVideo = blob.type.startsWith('video/');
      const isGif = blob.type === 'image/gif';
      const isAnimated = isVideo || isGif;
      const mediaType = isVideo ? 'video' : isGif ? 'gif' : 'image';

      const updatedWallpaper: WallpaperConfig = {
        id: current.wallpaper?.id || `wall-${Date.now()}`,
        name: current.wallpaper?.name || 'custom-wallpaper',
        url: freshUrl,
        dimming: current.wallpaper?.dimming ?? 0.7,
        blur: current.wallpaper?.blur ?? (isAnimated ? 0 : 0),
        isAnimated: current.wallpaper?.isAnimated ?? isAnimated,
        mediaType: current.wallpaper?.mediaType ?? mediaType,
        themeMode: current.wallpaper?.themeMode ?? 'dark',
      };

      useThemeStore.setState({ wallpaper: updatedWallpaper });
      applyThemeToDOM(useThemeStore.getState());
      return freshUrl;
    } catch (err) {
      console.error('Failed to rehydrate wallpaper from IndexedDB:', err);
      return null;
    } finally {
      rehydratingPromise = null;
    }
  })();

  return rehydratingPromise;
}

/**
 * Revokes blob URL if previously created to protect against memory leaks.
 */
export function safeRevokeMediaUrl(url?: string | null): void {
  if (typeof window !== 'undefined' && url && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore
    }
    if (activeWallpaperObjectUrl === url) {
      activeWallpaperObjectUrl = null;
    }
  }
}

/**
 * Applies active theme state directly to DOM (documentElement data-theme & CSS custom properties).
 */
export function applyThemeToDOM(state: Partial<ThemeState>): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const solidTheme = state.solidTheme || (state.theme === 'light' ? 'light' : 'dark');
  const accent = state.accentColor || '#8B5CF6';
  const textOnAccent = state.textOnAccent || getTextOnAccent(accent);

  // Compute canvas color (supporting gradient dominant tones, custom hex, and base solid themes)
  let canvasColor: string;
  if (state.themeMode === 'gradient') {
    if (state.gradientPresetId && state.gradientPresetId !== 'custom') {
      const preset = GRADIENT_PRESETS.find((p) => p.id === state.gradientPresetId);
      canvasColor = preset?.colors[0] || '#180728';
    } else if (state.customGradient?.from) {
      canvasColor = state.customGradient.from;
    } else {
      canvasColor = '#180728';
    }
  } else if (solidTheme === 'custom' && state.customSolidColor) {
    canvasColor = state.customSolidColor;
  } else {
    canvasColor = SOLID_THEME_COLORS[solidTheme] || '#070709';
  }

  const isWallpaperMode = state.themeMode === 'wallpaper' && Boolean(state.wallpaper?.url);

  const isLight = isCurrentThemeLight(state);

  const effectiveSolid = state.solidTheme || (state.theme === 'light' ? 'light' : 'dark');
  const dataTheme = isLight
    ? 'light'
    : state.themeMode === 'solid' &&
        (effectiveSolid === 'ash' || effectiveSolid === 'dark' || effectiveSolid === 'midnight')
      ? effectiveSolid
      : 'dark';

  root.setAttribute('data-theme', dataTheme);
  root.setAttribute('data-surface-contrast', isLight ? 'light' : 'dark');
  if (isLight) {
    root.classList.remove('dark');
    root.classList.add('light');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
  }
  root.style.setProperty('--app-accent-color', accent);
  root.style.setProperty('--text-on-accent', textOnAccent);

  // Apply semantic tokens based on contrast
  const tokens = generateSemanticTokens(canvasColor, accent);
  root.style.setProperty('--app-bg-color', isLight ? '#ffffff' : tokens.surfaceBase);
  root.style.setProperty('--app-surface-elevated', isLight ? '#ffffff' : tokens.surfaceElevated1);
  root.style.setProperty('--app-surface-card', isLight ? '#ffffff' : tokens.surfaceElevated2);
  root.style.setProperty(
    '--app-border-subtle',
    isLight ? 'rgba(0, 0, 0, 0.08)' : tokens.borderSubtle,
  );

  if (state.customSolidColor) {
    root.style.setProperty('--app-bg-custom', state.customSolidColor);
  }

  const opacity = state.glassmorphismOpacity !== undefined ? state.glassmorphismOpacity : 0.0;
  root.style.setProperty('--app-glass-opacity', String(opacity));

  const hasWallpaper = isWallpaperMode;

  // 1. Determine base surface RGB:
  let baseRgb: string;
  let cardRgb: string;
  let sidebarRgb: string;

  if (hasWallpaper) {
    const isWallpaperLight = state.wallpaper?.themeMode === 'light';
    const cachedColors = state.wallpaper?.url
      ? getCachedWallpaperColors(state.wallpaper.url)
      : null;
    if (cachedColors && cachedColors.length > 0 && !isWallpaperLight) {
      const domRgb = parseColorToRgb(cachedColors[0]);
      // Blend 35% dominant color into base dark tone for rich glass refraction
      const bR = Math.round(14 + domRgb.r * 0.18);
      const bG = Math.round(15 + domRgb.g * 0.18);
      const bB = Math.round(20 + domRgb.b * 0.22);
      baseRgb = `${bR}, ${bG}, ${bB}`;
      cardRgb = `${Math.min(255, bR + 6)}, ${Math.min(255, bG + 6)}, ${Math.min(255, bB + 8)}`;
      sidebarRgb = `${Math.min(255, bR + 8)}, ${Math.min(255, bG + 8)}, ${Math.min(255, bB + 10)}`;
    } else {
      baseRgb = isWallpaperLight ? '255, 255, 255' : '18, 19, 26';
      cardRgb = isWallpaperLight ? '255, 255, 255' : '22, 23, 30';
      sidebarRgb = isWallpaperLight ? '255, 255, 255' : '24, 25, 33';
    }
  } else {
    if (isLight) {
      baseRgb = '255, 255, 255';
      cardRgb = '255, 255, 255';
      sidebarRgb = '255, 255, 255';
    } else {
      const cardRgbObj = hexToRgb(tokens.surfaceElevated2);
      const sidebarRgbObj = hexToRgb(tokens.surfaceElevated1);
      const modalRgbObj = hexToRgb(tokens.surfaceBase);
      cardRgb = `${cardRgbObj.r}, ${cardRgbObj.g}, ${cardRgbObj.b}`;
      sidebarRgb = `${sidebarRgbObj.r}, ${sidebarRgbObj.g}, ${sidebarRgbObj.b}`;
      baseRgb = `${modalRgbObj.r}, ${modalRgbObj.g}, ${modalRgbObj.b}`;
    }
  }

  // Apple Liquid Glass Dynamic Alpha Curve & Text Readability Protection:
  // At 0% opacity: completely opaque solid backing (1.0)
  // At 100% opacity: maintains protective optical tint substrate so underlying text never clashes!
  const minCardAlpha = hasWallpaper ? 0.48 : isLight ? 0.88 : 0.42;
  const minSidebarAlpha = hasWallpaper ? 0.54 : isLight ? 0.92 : 0.48;
  const minModalAlpha = hasWallpaper ? 0.74 : isLight ? 0.92 : 0.78;
  const minMenuAlpha = hasWallpaper ? 0.82 : isLight ? 0.94 : 0.86;

  const modalAlpha = opacity === 0 ? '1.0' : (0.98 - opacity * (0.98 - minModalAlpha)).toFixed(3);
  const cardAlpha = opacity === 0 ? '1.0' : (0.96 - opacity * (0.96 - minCardAlpha)).toFixed(3);
  const sidebarAlpha =
    opacity === 0 ? '1.0' : (0.98 - opacity * (0.98 - minSidebarAlpha)).toFixed(3);
  const menuAlpha = opacity === 0 ? '1.0' : (0.98 - opacity * (0.98 - minMenuAlpha)).toFixed(3);
  const subpanelAlpha = isLight ? '0.98' : '0.96';

  const blurPx = opacity === 0 ? 0 : Math.round(16 + opacity * 24);
  const glassSaturation = Math.round(100 + opacity * 95);
  const specularRimAlpha = (opacity * 0.45).toFixed(3);
  const specularInnerAlpha = (opacity * 0.12).toFixed(3);
  const specularBottomAlpha = (opacity * 0.08).toFixed(3);
  const borderGlassAlpha = isLight
    ? (0.08 + opacity * 0.06).toFixed(3)
    : (0.05 + opacity * 0.15).toFixed(3);
  const shadowBlur = Math.round(16 + opacity * 24);
  const shadowDepthAlpha = (0.15 + opacity * 0.35).toFixed(3);

  root.style.setProperty('--app-glass-modal-bg', `rgba(${baseRgb}, ${modalAlpha})`);
  root.style.setProperty('--app-glass-card-bg', `rgba(${cardRgb}, ${cardAlpha})`);
  root.style.setProperty('--app-glass-sidebar-bg', `rgba(${sidebarRgb}, ${sidebarAlpha})`);
  root.style.setProperty(
    '--app-glass-menu-bg',
    isLight ? `rgba(255, 255, 255, ${menuAlpha})` : `rgba(${baseRgb}, ${menuAlpha})`,
  );
  root.style.setProperty(
    '--app-glass-subpanel-bg',
    isLight ? `rgba(255, 255, 255, ${subpanelAlpha})` : `rgba(${cardRgb}, ${subpanelAlpha})`,
  );
  root.style.setProperty('--app-glass-blur', `${blurPx}px`);
  root.style.setProperty('--app-glass-saturate', `${glassSaturation}%`);
  root.style.setProperty(
    '--app-glass-border-color',
    isLight ? `rgba(0, 0, 0, ${borderGlassAlpha})` : `rgba(255, 255, 255, ${borderGlassAlpha})`,
  );
  root.style.setProperty(
    '--app-glass-shadow',
    opacity === 0
      ? 'none'
      : isLight
        ? '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
        : `inset 0 1px 1px 0 rgba(255, 255, 255, ${specularRimAlpha}), inset 0 0 0 1px rgba(255, 255, 255, ${specularInnerAlpha}), inset 0 -1px 1px 0 rgba(255, 255, 255, ${specularBottomAlpha}), 0 16px ${shadowBlur}px -6px rgba(0, 0, 0, ${shadowDepthAlpha})`,
  );

  // Text Contrast & Dynamic Glass Surface Protection:
  if (isLight) {
    root.style.setProperty('--app-text-primary', '#0f172a');
    root.style.setProperty('--app-text-secondary', '#334155');
    root.style.setProperty('--app-text-muted', '#64748b');
    root.style.setProperty('--glass-text-primary', '#0f172a');
    root.style.setProperty('--glass-text-secondary', '#334155');
    root.style.setProperty('--glass-text-muted', '#64748b');
    root.style.setProperty('--glass-text-placeholder', '#94a3b8');
    root.style.setProperty('--glass-icon-color', '#64748b');
    root.style.setProperty('--glass-icon-hover', '#0f172a');
  } else {
    root.style.setProperty('--app-text-primary', '#ffffff');
    root.style.setProperty('--app-text-secondary', '#e2e8f0');
    root.style.setProperty('--app-text-muted', '#cbd5e1');
    root.style.setProperty('--glass-text-primary', '#ffffff');
    root.style.setProperty('--glass-text-secondary', '#e2e8f0');
    root.style.setProperty('--glass-text-muted', '#cbd5e1');
    root.style.setProperty('--glass-text-placeholder', 'rgba(255, 255, 255, 0.60)');
    root.style.setProperty('--glass-icon-color', 'rgba(255, 255, 255, 0.75)');
    root.style.setProperty('--glass-icon-hover', '#ffffff');
  }

  // Update theme-color meta tag for mobile browsers
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', canvasColor);
  }

  // Typography Engine Application:
  const fontScope = state.appFontScope || 'none';
  const fontId = state.appFontId || 'default';
  const textEffect = state.appTextEffect || 'minimal';
  const textColor = state.appTextColor || 'auto';

  root.setAttribute('data-font-scope', fontScope);

  const fontMeta = CHAT_FONTS.find((f) => f.id === fontId);
  const fontFamily = fontMeta
    ? fontMeta.fontFamily
    : "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  // Trigger on-demand font loading if google font
  if (fontMeta && fontMeta.googleFontName) {
    loadThemeFont(fontMeta.fontFamily, fontMeta.googleFontName);
  }

  if (fontScope !== 'none' && fontId !== 'default') {
    root.style.setProperty('--app-custom-font', fontFamily);
    root.style.setProperty('--font-heading', fontFamily);
  } else {
    root.style.setProperty(
      '--app-custom-font',
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    );
    root.style.setProperty(
      '--font-heading',
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    );
  }

  if (fontScope !== 'none' && textEffect && textEffect !== 'minimal') {
    root.setAttribute('data-font-effect', textEffect);
  } else {
    root.removeAttribute('data-font-effect');
  }

  if (fontScope !== 'none' && textColor && textColor !== 'auto') {
    root.setAttribute('data-has-custom-color', 'true');
    root.style.setProperty('--app-custom-text-color', textColor);
  } else {
    root.removeAttribute('data-has-custom-color');
    root.style.removeProperty('--app-custom-text-color');
  }

  // Custom Cursor Engine Application:
  const cursorEnabled = Boolean(state.customCursorEnabled);
  const cursorId = state.customCursorId || 'minecraft-sword';
  const cursorVariant = state.customCursorVariant || 'diamond';
  const cursorSizePx = state.customCursorSize === 'large' ? 44 : 32;
  applyCursorToDOM(cursorEnabled, cursorId, cursorVariant, cursorSizePx);
}

// Cross-tab broadcast channel
let themeBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    themeBroadcastChannel = new BroadcastChannel('app-theme-sync');
  } catch {
    themeBroadcastChannel = null;
  }
}

function getSerializableThemeState(state: ThemeState) {
  return {
    theme: state.theme,
    solidTheme: state.solidTheme,
    themeMode: state.themeMode,
    customSolidColor: state.customSolidColor,
    recentColors: state.recentColors,
    accentColor: state.accentColor,
    textOnAccent: state.textOnAccent,
    recentAccents: state.recentAccents,
    gradientPresetId: state.gradientPresetId,
    customGradient: state.customGradient,
    wallpaper: state.wallpaper
      ? {
          ...state.wallpaper,
          url: state.wallpaper.url?.startsWith('blob:') ? '' : state.wallpaper.url,
        }
      : null,
    glassmorphismOpacity: state.glassmorphismOpacity,
    isGlassmorphismEnabled:
      state.isGlassmorphismEnabled ??
      (state.glassmorphismOpacity > 0 || state.themeMode === 'wallpaper'),
    syncWithSystem: state.syncWithSystem,
    ambientPlayerGlow: state.ambientPlayerGlow,
    soundFxEnabled: state.soundFxEnabled,
    previousThemeSnapshot: state.previousThemeSnapshot,
    appFontId: state.appFontId,
    appFontFamily: state.appFontFamily,
    appFontScope: state.appFontScope,
    appTextEffect: state.appTextEffect,
    appTextColor: state.appTextColor,
    customCursorEnabled: state.customCursorEnabled,
    customCursorId: state.customCursorId,
    customCursorVariant: state.customCursorVariant,
    customCursorSize: state.customCursorSize,
    cursorVfxEnabled: state.cursorVfxEnabled,
    cursorVfxTrail: state.cursorVfxTrail,
    cursorVfxClick: state.cursorVfxClick,
    cursorVfxHover: state.cursorVfxHover,
  };
}

function createCurrentSnapshot(state: ThemeState): ThemeSnapshot {
  let label = 'Custom';
  if (state.themeMode === 'wallpaper') label = 'Wallpaper';
  else if (state.themeMode === 'gradient') label = 'Gradient';
  else if (state.solidTheme === 'custom') label = 'Custom Color';
  else if (state.solidTheme === 'ash') label = 'Ash';
  else if (state.solidTheme === 'midnight') label = 'Midnight';
  else if (state.solidTheme === 'light') label = 'Light';
  else if (state.solidTheme === 'dark') label = 'Dark';

  return {
    themeMode: state.themeMode,
    solidTheme: state.solidTheme,
    customSolidColor: state.customSolidColor,
    gradientPresetId: state.gradientPresetId,
    customGradient: state.customGradient,
    wallpaper: state.wallpaper,
    label,
  };
}

function broadcastThemeSync(state: ThemeState): void {
  try {
    themeBroadcastChannel?.postMessage({
      type: 'THEME_SYNC',
      state: getSerializableThemeState(state),
    });
  } catch {
    // Ignore
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Legacy
      theme: 'dark',
      setTheme: (theme) => {
        const solidTheme: BaseSolidTheme = theme === 'light' ? 'light' : 'dark';
        set({ theme, solidTheme });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      // Enterprise State
      themeMode: 'solid',
      solidTheme: 'dark',
      customSolidColor: null,
      recentColors: [],
      accentColor: '#8B5CF6',
      textOnAccent: '#ffffff',
      recentAccents: [],
      gradientPresetId: null,
      customGradient: {
        from: '#180728',
        to: '#3b0764',
        angle: 135,
      },
      wallpaper: null,
      glassmorphismOpacity: 0.0,
      isGlassmorphismEnabled: false,
      syncWithSystem: false,
      ambientPlayerGlow: false,
      soundFxEnabled: true,
      previousThemeSnapshot: null,

      // Typography Engine Initial State
      appFontId: 'default',
      appFontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      appFontScope: 'none',
      appTextEffect: 'minimal',
      appTextColor: 'auto',

      // Custom Cursor Initial State
      customCursorEnabled: false,
      customCursorId: 'minecraft-sword',
      customCursorVariant: 'diamond',
      customCursorSize: 'normal',
      cursorVfxEnabled: false,
      cursorVfxTrail: false,
      cursorVfxClick: false,
      cursorVfxHover: false,

      // Actions
      setSolidTheme: (solidTheme, keepSync = false) => {
        const current = get();
        let prevSnapshot = current.previousThemeSnapshot;
        if (current.solidTheme !== solidTheme || current.themeMode !== 'solid') {
          prevSnapshot = createCurrentSnapshot(current);
        }
        const legacyTheme: Theme = solidTheme === 'light' ? 'light' : 'dark';
        set({
          solidTheme,
          theme: legacyTheme,
          themeMode: 'solid',
          previousThemeSnapshot: prevSnapshot,
          syncWithSystem: keepSync ? current.syncWithSystem : false,
        });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      restorePreviousTheme: () => {
        const snapshot = get().previousThemeSnapshot;
        if (!snapshot) return;
        const current = get();
        const newPrev = createCurrentSnapshot(current);
        const legacyTheme: Theme = snapshot.solidTheme === 'light' ? 'light' : 'dark';
        set({
          themeMode: snapshot.themeMode,
          solidTheme: snapshot.solidTheme,
          customSolidColor: snapshot.customSolidColor,
          gradientPresetId: snapshot.gradientPresetId,
          customGradient: snapshot.customGradient,
          wallpaper: snapshot.wallpaper,
          theme: legacyTheme,
          previousThemeSnapshot: newPrev,
          syncWithSystem: false,
        });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      setCustomSolidColor: (color) => {
        const currentRecents = get().recentColors.filter((c) => c !== color);
        const recentColors = [color, ...currentRecents].slice(0, 3);
        const isLight = solidThemeIsLight(color);

        set({
          customSolidColor: color,
          solidTheme: 'custom',
          themeMode: 'solid',
          recentColors,
          theme: isLight ? 'light' : 'dark',
          syncWithSystem: false,
        });

        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      setAccentColor: (accent) => {
        const textOnAccent = getTextOnAccent(accent);
        const currentRecents = get().recentAccents.filter((c) => c !== accent);
        const recentAccents = [accent, ...currentRecents].slice(0, 3);

        set({ accentColor: accent, textOnAccent, recentAccents });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      setGradientPreset: (presetId) => {
        const current = get();
        let prevSnapshot = current.previousThemeSnapshot;
        if (current.gradientPresetId !== presetId || current.themeMode !== 'gradient') {
          prevSnapshot = createCurrentSnapshot(current);
        }
        const preset = GRADIENT_PRESETS.find((p) => p.id === presetId);
        const isLight = preset?.colors[0] ? solidThemeIsLight(preset.colors[0]) : false;
        set({
          gradientPresetId: presetId,
          themeMode: 'gradient',
          theme: isLight ? 'light' : 'dark',
          solidTheme: isLight ? 'light' : 'dark',
          previousThemeSnapshot: prevSnapshot,
          syncWithSystem: false,
        });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      setCustomGradient: (gradient) => {
        const current = get();
        let prevSnapshot = current.previousThemeSnapshot;
        if (current.themeMode !== 'gradient' || current.gradientPresetId !== 'custom') {
          prevSnapshot = createCurrentSnapshot(current);
        }
        const isLight = solidThemeIsLight(gradient.from);
        set({
          customGradient: gradient,
          gradientPresetId: 'custom',
          themeMode: 'gradient',
          theme: isLight ? 'light' : 'dark',
          solidTheme: isLight ? 'light' : 'dark',
          previousThemeSnapshot: prevSnapshot,
          syncWithSystem: false,
        });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      setWallpaper: (newWallpaper) => {
        const current = get();
        const prev = current.wallpaper;
        if (prev?.url && prev.url !== newWallpaper?.url) {
          safeRevokeMediaUrl(prev.url);
        }
        let prevSnapshot = current.previousThemeSnapshot;
        if (newWallpaper) {
          prevSnapshot = createCurrentSnapshot(current);
        }
        const isLight = Boolean(
          newWallpaper &&
          newWallpaper.themeMode === 'light' &&
          (newWallpaper.dimming ?? 0.7) < 0.35,
        );
        set({
          wallpaper: newWallpaper,
          themeMode: newWallpaper ? 'wallpaper' : 'solid',
          theme: isLight ? 'light' : 'dark',
          solidTheme: isLight ? 'light' : 'dark',
          isGlassmorphismEnabled: Boolean(newWallpaper) || get().glassmorphismOpacity > 0,
          previousThemeSnapshot: prevSnapshot,
          syncWithSystem: false,
        });

        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      activateWallpaper: () => {
        const wall = get().wallpaper;
        const current = get();
        let prevSnapshot = current.previousThemeSnapshot;
        if (current.themeMode !== 'wallpaper') {
          prevSnapshot = createCurrentSnapshot(current);
        }
        if (!wall || !wall.url) {
          void rehydrateWallpaperBlob().then((url) => {
            if (url) {
              const activeWall = get().wallpaper;
              const isLight = Boolean(
                activeWall &&
                activeWall.themeMode === 'light' &&
                (activeWall.dimming ?? 0.7) < 0.35,
              );
              set({
                themeMode: 'wallpaper',
                theme: isLight ? 'light' : 'dark',
                solidTheme: isLight ? 'light' : 'dark',
                isGlassmorphismEnabled: true,
                previousThemeSnapshot: prevSnapshot,
                syncWithSystem: false,
              });
              applyThemeToDOM(get());
              broadcastThemeSync(get());
            }
          });
          return;
        }
        const isLight = Boolean(wall && wall.themeMode === 'light' && (wall.dimming ?? 0.7) < 0.35);
        set({
          themeMode: 'wallpaper',
          theme: isLight ? 'light' : 'dark',
          solidTheme: isLight ? 'light' : 'dark',
          isGlassmorphismEnabled: true,
          previousThemeSnapshot: prevSnapshot,
          syncWithSystem: false,
        });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      updateWallpaperSettings: (settings) => {
        const curr = get().wallpaper;
        if (!curr) return;
        const updated = { ...curr, ...settings };
        const isLight = Boolean(updated.themeMode === 'light' && (updated.dimming ?? 0.7) < 0.35);
        set({
          wallpaper: updated,
          theme: isLight ? 'light' : 'dark',
          solidTheme: isLight ? 'light' : 'dark',
        });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      setGlassmorphismOpacity: (opacity) => {
        const val = Math.max(0, Math.min(1, opacity));
        set({
          glassmorphismOpacity: val,
          isGlassmorphismEnabled: val > 0 || get().themeMode === 'wallpaper',
        });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      setSyncWithSystem: (syncWithSystem) => {
        set({ syncWithSystem });
        if (syncWithSystem && typeof window !== 'undefined' && window.matchMedia) {
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          get().setSolidTheme(isDark ? 'dark' : 'light', true);
        }
      },

      setAmbientPlayerGlow: (ambientPlayerGlow) => {
        set({ ambientPlayerGlow });
      },

      setSoundFxEnabled: (soundFxEnabled) => {
        set({ soundFxEnabled });
      },

      resetToDefaults: () => {
        const prev = get().wallpaper;
        if (prev?.url) {
          safeRevokeMediaUrl(prev.url);
        }

        set({
          theme: 'dark',
          solidTheme: 'dark',
          themeMode: 'solid',
          customSolidColor: null,
          accentColor: '#8B5CF6',
          textOnAccent: '#ffffff',
          gradientPresetId: null,
          wallpaper: null,
          glassmorphismOpacity: 0.0,
          isGlassmorphismEnabled: false,
          syncWithSystem: false,
          ambientPlayerGlow: false,
          soundFxEnabled: true,
          appFontId: 'default',
          appFontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          appFontScope: 'none',
          appTextEffect: 'minimal',
          appTextColor: 'auto',
          customCursorEnabled: false,
          customCursorId: 'minecraft-sword',
          customCursorVariant: 'diamond',
          customCursorSize: 'normal',
        });

        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      setAppFontId: (appFontId: string) => {
        const fontMeta = CHAT_FONTS.find((f) => f.id === appFontId);
        const appFontFamily = fontMeta
          ? fontMeta.fontFamily
          : "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        set({ appFontId, appFontFamily });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      setAppFontScope: (appFontScope: AppFontScope) => {
        set({ appFontScope });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      setAppTextEffect: (appTextEffect: string) => {
        set({ appTextEffect });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      setAppTextColor: (appTextColor: string) => {
        set({ appTextColor });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      resetAppTypography: () => {
        set({
          appFontId: 'default',
          appFontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          appFontScope: 'none',
          appTextEffect: 'minimal',
          appTextColor: 'auto',
        });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      setCustomCursorEnabled: (customCursorEnabled: boolean) => {
        set({ customCursorEnabled });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      setCustomCursorId: (customCursorId: string) => {
        const preset = CURSOR_PRESETS.find((p) => p.id === customCursorId);
        const currentVariant = get().customCursorVariant;
        const hasVariant = preset?.variants.some((v) => v.id === currentVariant);
        const customCursorVariant = hasVariant ? currentVariant : preset?.defaultVariant || '';
        set({ customCursorId, customCursorVariant, customCursorEnabled: true });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      setCustomCursorVariant: (customCursorVariant: string) => {
        set({ customCursorVariant, customCursorEnabled: true });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      setCustomCursor: (customCursorId: string, customCursorVariant?: string) => {
        const preset = CURSOR_PRESETS.find((p) => p.id === customCursorId);
        const resolvedVariant = customCursorVariant || preset?.defaultVariant || '';
        set({
          customCursorId,
          customCursorVariant: resolvedVariant,
          customCursorEnabled: true,
        });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      setCustomCursorSize: (customCursorSize: CursorSize) => {
        set({ customCursorSize });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },

      setCursorVfxEnabled: (cursorVfxEnabled: boolean) => {
        set({ cursorVfxEnabled });
        broadcastThemeSync(get());
      },

      setCursorVfxSetting: (key: 'trail' | 'click' | 'hover', enabled: boolean) => {
        if (key === 'trail') set({ cursorVfxTrail: enabled });
        else if (key === 'click') set({ cursorVfxClick: enabled });
        else if (key === 'hover') set({ cursorVfxHover: enabled });
        broadcastThemeSync(get());
      },

      resetCustomCursor: () => {
        set({
          customCursorEnabled: false,
          customCursorId: 'minecraft-sword',
          customCursorVariant: 'diamond',
          customCursorSize: 'normal',
          cursorVfxEnabled: false,
          cursorVfxTrail: false,
          cursorVfxClick: false,
          cursorVfxHover: false,
        });
        applyThemeToDOM(get());
        broadcastThemeSync(get());
      },
    }),
    {
      name: 'eternal-theme',
      partialize: (state) => ({
        ...state,
        // Do not persist ephemeral dead blob: URLs into localStorage
        wallpaper: state.wallpaper ? { ...state.wallpaper, url: '' } : null,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const isLight = isCurrentThemeLight(state);
          if (state.themeMode !== 'solid') {
            useThemeStore.setState({
              theme: isLight ? 'light' : 'dark',
              solidTheme: isLight ? 'light' : 'dark',
            });
          }
          applyThemeToDOM(useThemeStore.getState());
          // Always rehydrate custom wallpaper from IndexedDB on startup
          void rehydrateWallpaperBlob();
        } else {
          // Fresh account or empty localStorage: immediately apply default dark theme
          applyThemeToDOM(useThemeStore.getState());
        }
      },
    },
  ),
);

export function solidThemeIsLight(colorHex: string): boolean {
  try {
    return calculateRelativeLuminance(colorHex) > 0.6;
  } catch {
    return false;
  }
}

export function isCurrentThemeLight(state: Partial<ThemeState>): boolean {
  const isWallpaperMode = state.themeMode === 'wallpaper' && Boolean(state.wallpaper?.url);
  if (isWallpaperMode) {
    return state.wallpaper?.themeMode === 'light' && (state.wallpaper?.dimming ?? 0.7) < 0.35;
  }
  if (state.themeMode === 'gradient') {
    if (state.gradientPresetId && state.gradientPresetId !== 'custom') {
      const preset = GRADIENT_PRESETS.find((p) => p.id === state.gradientPresetId);
      return preset?.colors[0] ? solidThemeIsLight(preset.colors[0]) : false;
    }
    if (state.customGradient?.from) {
      return solidThemeIsLight(state.customGradient.from);
    }
    return false;
  }
  const solidTheme = state.solidTheme || (state.theme === 'light' ? 'light' : 'dark');
  if (state.themeMode === 'solid' || !state.themeMode) {
    if (solidTheme === 'light') return true;
    if (solidTheme === 'custom' && state.customSolidColor) {
      return solidThemeIsLight(state.customSolidColor);
    }
    return false;
  }
  return false;
}

// Cross-tab message receiver
if (themeBroadcastChannel) {
  themeBroadcastChannel.onmessage = (event) => {
    if (event.data?.type === 'THEME_SYNC' && event.data.state) {
      useThemeStore.setState(event.data.state);
      applyThemeToDOM(event.data.state);
    }
  };
}

// Window storage event fallback for cross-tab sync
if (typeof window !== 'undefined') {
  applyThemeToDOM(useThemeStore.getState());

  window.addEventListener('storage', (e) => {
    if (e.key === 'eternal-theme' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed?.state) {
          useThemeStore.setState(parsed.state);
          applyThemeToDOM(parsed.state);
        }
      } catch {
        // Ignore
      }
    }
  });
}
