import React from 'react';
import { z } from 'zod';
import {
  BUILT_IN_PRESETS,
  ChatThemeConfig,
  DEFAULT_DARK_THEME_CONFIG,
  PresetTheme,
} from '../model/chatTheme';
import { idbGet, idbSet, idbDelete } from '../../../shared/lib/indexedDbStorage';

// Safe URL validator for theme image / background URLs to protect against XSS (e.g. javascript:, vbscript:, data:)
const safeUrlSchema = z
  .string()
  .max(4096)
  .refine(
    (url) => {
      if (!url) return true;
      const lower = url.trim().toLowerCase();
      if (
        lower.startsWith('javascript:') ||
        lower.startsWith('vbscript:') ||
        lower.startsWith('data:')
      ) {
        if (lower.startsWith('data:')) {
          return /^data:image\/(?:png|jpeg|jpg|webp|gif|avif);base64,[a-z0-9+/=]+$/i.test(
            url.trim(),
          );
        }
        return false;
      }
      return true;
    },
    { message: 'Unsafe URL scheme in theme image background' },
  )
  .optional();

/**
 * Strict Zod schema for validating parsed and imported theme configurations.
 */
export const chatThemeSchema = z.object({
  id: z.string().max(100).optional(),
  name: z.string().max(100).optional(),
  backgroundType: z.enum(['solid', 'gradient', 'image', 'preset', 'shader']).default('solid'),
  backgroundColor: z.string().max(50).default('#0b0b0c'),
  gradientColors: z.array(z.string().max(50)).max(10).default(['#0b0b0c', '#14151b']),
  gradientAngle: z.number().min(0).max(360).default(135),
  bgImageUrl: safeUrlSchema,
  bgBrightness: z.number().min(0).max(1).default(0.8),
  bgBlur: z.number().min(0).max(50).default(0),
  shaderPresetId: z.string().max(50).optional(),
  audioReactive: z.boolean().default(true),
  parallax3d: z.boolean().default(true),
  bubbleType: z.enum(['solid', 'gradient', 'preset']).default('gradient'),
  bubbleColor: z.string().max(50).default('#9333ea'),
  bubbleGradientColors: z.array(z.string().max(50)).max(10).default(['#9333ea', '#6366f1']),
  bubbleGradientAngle: z.number().min(0).max(360).default(135),
  bubbleContinuousGradient: z.boolean().default(false),
  bubbleOpacity: z.number().min(0.05).max(1).default(0.95),
  bubbleBlur: z.number().min(0).max(50).default(16),
  incomingBubbleColor: z.string().max(50).optional(),
  incomingBubbleOpacity: z.number().min(0.05).max(1).default(0.85),
  incomingBubbleBlur: z.number().min(0).max(50).default(16),
});

/**
 * Triggers a subtle tactile haptic vibration on mobile devices & supported browsers.
 */
export function triggerHapticFeedback(pattern: number | number[] = 6): void {
  if (
    typeof navigator !== 'undefined' &&
    'vibrate' in navigator &&
    typeof navigator.vibrate === 'function'
  ) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Gracefully ignore if browser/platform denies vibration
    }
  }
}

export interface ContrastTheme {
  isLight: boolean;
  textColor: string;
  subtextColor: string;
  timeColor: string;
  statusColor: string;
  quoteBg: string;
  quoteBorder: string;
  quoteAuthorColor: string;
  quoteSnippetColor: string;
  linkBg: string;
  linkBorder: string;
}

/**
 * Converts a 3, 6 or 8-character hex color code to RGB components [r, g, b].
 */
export function hexToRgb(hex: string): [number, number, number] {
  let cleaned = hex.trim().replace(/^#/, '');
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (cleaned.length >= 6) {
    const r = parseInt(cleaned.slice(0, 2), 16) || 0;
    const g = parseInt(cleaned.slice(2, 4), 16) || 0;
    const b = parseInt(cleaned.slice(4, 6), 16) || 0;
    return [r, g, b];
  }
  return [0, 0, 0];
}

/**
 * Calculates WCAG relative luminance (0 to 1) of a color.
 */
export function getLuminance(hexOrRgb: string): number {
  if (!hexOrRgb) return 0;
  if (hexOrRgb.startsWith('rgba') || hexOrRgb.startsWith('rgb')) {
    const match = hexOrRgb.match(/\d+/g);
    if (match && match.length >= 3) {
      const [r, g, b] = match.slice(0, 3).map((v) => parseInt(v, 10) / 255);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
  }

  const [rRaw, gRaw, bRaw] = hexToRgb(hexOrRgb);
  const transform = (val: number) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const r = transform(rRaw);
  const g = transform(gRaw);
  const b = transform(bRaw);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Automatically determines bubble contrast theme (light vs dark) based on WCAG luminance.
 */
export function getBubbleContrastTheme(
  config: ChatThemeConfig,
  isOwnMessage: boolean,
): ContrastTheme {
  let avgLuminance = 0.1;

  if (isOwnMessage) {
    if (config.bubbleTextColor && config.bubbleTextColor !== 'auto') {
      const isCustomLightText = getLuminance(config.bubbleTextColor) > 0.5;
      return createContrastTheme(!isCustomLightText, config.bubbleTextColor);
    }

    if (config.bubbleType === 'solid') {
      avgLuminance = getLuminance(config.bubbleColor || '#9333ea');
    } else {
      const colors =
        config.bubbleGradientColors && config.bubbleGradientColors.length > 0
          ? config.bubbleGradientColors
          : ['#9333ea', '#6366f1'];
      const sum = colors.reduce((acc, c) => acc + getLuminance(c), 0);
      avgLuminance = sum / colors.length;
    }
  } else {
    if (config.incomingBubbleTextColor && config.incomingBubbleTextColor !== 'auto') {
      const isCustomLightText = getLuminance(config.incomingBubbleTextColor) > 0.5;
      return createContrastTheme(!isCustomLightText, config.incomingBubbleTextColor);
    }
    const color = config.incomingBubbleColor || '#12131b';
    avgLuminance = getLuminance(color);
  }

  const isLight = avgLuminance > 0.48;
  return createContrastTheme(isLight);
}

function createContrastTheme(isLight: boolean, explicitTextColor?: string): ContrastTheme {
  if (isLight) {
    return {
      isLight: true,
      textColor: explicitTextColor || '#0f172a',
      subtextColor: 'rgba(15, 23, 42, 0.75)',
      timeColor: 'rgba(15, 23, 42, 0.65)',
      statusColor: '#0f172a',
      quoteBg: 'rgba(0, 0, 0, 0.08)',
      quoteBorder: '#0f172a',
      quoteAuthorColor: '#1e293b',
      quoteSnippetColor: '#334155',
      linkBg: 'rgba(0, 0, 0, 0.06)',
      linkBorder: 'rgba(0, 0, 0, 0.12)',
    };
  }

  return {
    isLight: false,
    textColor: explicitTextColor || '#ffffff',
    subtextColor: 'rgba(255, 255, 255, 0.8)',
    timeColor: 'rgba(255, 255, 255, 0.65)',
    statusColor: '#ffffff',
    quoteBg: 'rgba(255, 255, 255, 0.12)',
    quoteBorder: '#c084fc',
    quoteAuthorColor: '#e9d5ff',
    quoteSnippetColor: 'rgba(255, 255, 255, 0.85)',
    linkBg: 'rgba(0, 0, 0, 0.25)',
    linkBorder: 'rgba(255, 255, 255, 0.1)',
  };
}

/**
 * Returns CSS properties for the chat background layer with hardware acceleration.
 */
export function getChatBackgroundStyle(config: ChatThemeConfig): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    willChange: 'transform',
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
  };

  if (config.backgroundType === 'image' && config.bgImageUrl) {
    return {
      ...baseStyle,
      backgroundImage: `url(${config.bgImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }

  if (config.backgroundType === 'gradient') {
    const angle = config.gradientAngle ?? 135;
    const colors =
      config.gradientColors && config.gradientColors.length > 0
        ? config.gradientColors
        : ['#0b0b0c', '#14151b'];
    return {
      ...baseStyle,
      background: `linear-gradient(${angle}deg, ${colors.join(', ')})`,
    };
  }

  // Solid or preset fallback
  return {
    ...baseStyle,
    backgroundColor: config.backgroundColor || '#0b0b0c',
  };
}

/**
 * Converts a hex color and alpha (0 to 1) to rgba string.
 */
export function hexToRgba(hex: string, alpha = 1): string {
  const [r, g, b] = hexToRgb(hex);
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
}

/**
 * Converts HSL (h: 0-360, s: 0-100, l: 0-100) to hex string.
 */
export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (val: number) => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generates an aesthetically pleasing harmonic gradient using color theory rules.
 */
export function generateHarmonicGradient(baseHueInput?: number): {
  colors: string[];
  angle: number;
  schemeName: string;
} {
  const baseHue = baseHueInput !== undefined ? baseHueInput : Math.floor(Math.random() * 360);
  const schemes = [
    {
      name: 'Analogous Sunset',
      hues: [baseHue, (baseHue + 28) % 360, (baseHue + 56) % 360],
      sat: 85,
      light: 52,
    },
    {
      name: 'Electric Triad',
      hues: [baseHue, (baseHue + 120) % 360, (baseHue + 240) % 360],
      sat: 90,
      light: 55,
    },
    {
      name: 'Complementary Pop',
      hues: [baseHue, (baseHue + 180) % 360],
      sat: 88,
      light: 50,
    },
    {
      name: 'Split Complementary',
      hues: [baseHue, (baseHue + 150) % 360, (baseHue + 210) % 360],
      sat: 82,
      light: 54,
    },
    {
      name: 'Synthwave Neon',
      hues: [baseHue, (baseHue + 45) % 360, (baseHue + 90) % 360],
      sat: 95,
      light: 58,
    },
    {
      name: 'Deep Cosmic',
      hues: [baseHue, (baseHue + 75) % 360, (baseHue + 160) % 360],
      sat: 78,
      light: 42,
    },
  ];

  const scheme = schemes[Math.floor(Math.random() * schemes.length)];
  const colors = scheme.hues.map((h) => hslToHex(h, scheme.sat, scheme.light));
  const presetAngles = [45, 90, 135, 180, 225, 270, 315];
  const angle = presetAngles[Math.floor(Math.random() * presetAngles.length)];

  return { colors, angle, schemeName: scheme.name };
}

/**
 * Extracts dominant vibrant colors from an image / GIF using offscreen Canvas.
 */
export async function extractDominantColorsFromImage(
  imageSrcOrUrl: string,
  count = 4,
): Promise<string[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(['#8b5cf6', '#ec4899', '#3b82f6', '#10b981']);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(['#8b5cf6', '#ec4899', '#3b82f6', '#10b981']);
          return;
        }

        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imgData = ctx.getImageData(0, 0, size, size).data;
        const colorBuckets: { [hex: string]: { count: number; sat: number; light: number } } = {};

        for (let i = 0; i < imgData.length; i += 16) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue; // skip transparent pixels

          // Quantize to 16 levels per channel to reduce buckets
          const qR = Math.round(r / 16) * 16;
          const qG = Math.round(g / 16) * 16;
          const qB = Math.round(b / 16) * 16;

          const max = Math.max(qR, qG, qB);
          const min = Math.min(qR, qG, qB);
          const light = (max + min) / 2 / 255;
          const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));

          // Ignore extreme pure blacks or stark whites
          if (light < 0.1 || light > 0.9) continue;

          const hex = `#${qR.toString(16).padStart(2, '0')}${qG.toString(16).padStart(2, '0')}${qB.toString(16).padStart(2, '0')}`;

          if (!colorBuckets[hex]) {
            colorBuckets[hex] = { count: 0, sat, light };
          }
          colorBuckets[hex].count += 1 + sat * 2; // boost vibrant saturated colors
        }

        const sorted = Object.entries(colorBuckets)
          .sort((a, b) => b[1].count - a[1].count)
          .map(([hex]) => hex);

        if (sorted.length === 0) {
          resolve(['#8b5cf6', '#ec4899', '#3b82f6', '#10b981']);
        } else {
          // Pick up to count distinctive colors
          resolve(sorted.slice(0, count));
        }
      } catch {
        resolve(['#8b5cf6', '#ec4899', '#3b82f6', '#10b981']);
      }
    };

    img.onerror = () => {
      resolve(['#8b5cf6', '#ec4899', '#3b82f6', '#10b981']);
    };

    img.src = imageSrcOrUrl;
  });
}

/**
 * Encodes a ChatThemeConfig into a shareable Base64 theme code.
 */
export function encodeThemeCode(config: ChatThemeConfig): string {
  const cleanConfig: ChatThemeConfig = {
    ...config,
    // Do not include huge local blob URLs in portable codes
    bgImageUrl: config.bgImageUrl?.startsWith('blob:') ? undefined : config.bgImageUrl,
  };

  try {
    const json = JSON.stringify(cleanConfig);
    const encoded = btoa(encodeURIComponent(json));
    return `ETERNAL-THEME:${encoded}`;
  } catch {
    return `ETERNAL-THEME:${btoa(JSON.stringify({ id: config.id || 'custom' }))}`;
  }
}

/**
 * Decodes a shared Base64 theme code into a ChatThemeConfig with strict Zod validation.
 */
export function decodeThemeCode(rawCode: string): ChatThemeConfig | null {
  if (!rawCode || typeof rawCode !== 'string') return null;

  let cleaned = rawCode.trim();
  if (cleaned.startsWith('ETERNAL-THEME:')) {
    cleaned = cleaned.slice('ETERNAL-THEME:'.length).trim();
  }

  let parsedRaw: unknown = null;

  try {
    const decoded = decodeURIComponent(atob(cleaned));
    parsedRaw = JSON.parse(decoded);
  } catch {
    // Attempt direct JSON parse fallback
    try {
      parsedRaw = JSON.parse(rawCode);
    } catch {
      return null;
    }
  }

  const validation = chatThemeSchema.safeParse(parsedRaw);
  if (!validation.success) {
    return null;
  }

  return parseChatTheme(validation.data);
}

/**
 * Returns CSS properties for message bubbles (including continuous fixed screen gradient & frosted glassmorphism).
 */
export function getBubbleStyle(
  config: ChatThemeConfig,
  isOwnMessage: boolean,
): { style: React.CSSProperties; className: string } {
  const opacity = isOwnMessage
    ? (config.bubbleOpacity ?? 0.95)
    : (config.incomingBubbleOpacity ?? 0.85);
  const blur = isOwnMessage ? (config.bubbleBlur ?? 16) : (config.incomingBubbleBlur ?? 16);

  const glassStyle: React.CSSProperties = {
    backdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
    WebkitBackdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
  };

  if (!isOwnMessage) {
    if (config.incomingBubbleColor) {
      const bg =
        config.incomingBubbleColor.startsWith('#') && opacity < 1
          ? hexToRgba(config.incomingBubbleColor, opacity)
          : config.incomingBubbleColor;

      return {
        style: {
          ...glassStyle,
          backgroundColor: bg,
          borderColor: 'rgba(255, 255, 255, 0.12)',
        },
        className: 'shadow-md border',
      };
    }
    return {
      style: {
        ...glassStyle,
        backgroundColor: `rgba(18, 19, 27, ${opacity})`,
      },
      className: 'backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.4)]',
    };
  }

  if (config.bubbleContinuousGradient) {
    const colors =
      config.bubbleGradientColors && config.bubbleGradientColors.length > 0
        ? config.bubbleGradientColors
        : ['#9333ea', '#6366f1'];
    const angle = config.bubbleGradientAngle ?? 180;
    const rgbaColors =
      opacity < 1 ? colors.map((c) => (c.startsWith('#') ? hexToRgba(c, opacity) : c)) : colors;

    return {
      style: {
        ...glassStyle,
        background: `linear-gradient(${angle}deg, ${rgbaColors.join(', ')})`,
        backgroundAttachment: 'fixed',
        backgroundSize: '100vw 100vh',
        backgroundPosition: 'center',
        borderColor: 'rgba(255, 255, 255, 0.25)',
      },
      className: 'shadow-lg shadow-purple-500/20 border text-white',
    };
  }

  if (config.bubbleType === 'solid') {
    const solidColor = config.bubbleColor || '#9333ea';
    const bg =
      solidColor.startsWith('#') && opacity < 1 ? hexToRgba(solidColor, opacity) : solidColor;

    return {
      style: {
        ...glassStyle,
        backgroundColor: bg,
        borderColor: 'rgba(255, 255, 255, 0.2)',
      },
      className: 'shadow-lg border',
    };
  }

  const colors =
    config.bubbleGradientColors && config.bubbleGradientColors.length > 0
      ? config.bubbleGradientColors
      : ['#9333ea', '#6366f1'];
  const angle = config.bubbleGradientAngle ?? 135;
  const rgbaColors =
    opacity < 1 ? colors.map((c) => (c.startsWith('#') ? hexToRgba(c, opacity) : c)) : colors;

  return {
    style: {
      ...glassStyle,
      background: `linear-gradient(${angle}deg, ${rgbaColors.join(', ')})`,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    className: 'shadow-lg shadow-purple-500/20 border',
  };
}

/**
 * Parses and sanitizes a theme string or preset ID into a valid ChatThemeConfig.
 */
export function parseChatTheme(raw: unknown): ChatThemeConfig {
  if (!raw || raw === 'default') return { ...DEFAULT_DARK_THEME_CONFIG };

  if (typeof raw === 'object' && raw !== null && 'backgroundType' in raw) {
    const validated = chatThemeSchema.safeParse(raw);
    if (validated.success) {
      return {
        ...DEFAULT_DARK_THEME_CONFIG,
        ...(raw as ChatThemeConfig),
      };
    }
    return {
      ...DEFAULT_DARK_THEME_CONFIG,
      ...(raw as ChatThemeConfig),
    };
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();

    // Check if it is a Base64 theme code (ETERNAL-THEME:...)
    if (trimmed.startsWith('ETERNAL-THEME:')) {
      const decoded = decodeThemeCode(trimmed);
      if (decoded) return decoded;
    }

    // Check if it's prefixed with preset: (e.g. preset:cyberpunk)
    if (trimmed.startsWith('preset:')) {
      const presetId = trimmed.slice(7);
      const foundPreset = BUILT_IN_PRESETS.find((p) => p.id === presetId);
      if (foundPreset) {
        return { ...foundPreset.config, id: foundPreset.id };
      }
      return { ...DEFAULT_DARK_THEME_CONFIG, id: presetId };
    }

    // Check if it's prefixed with shader: (e.g. shader:neon-smoke)
    if (trimmed.startsWith('shader:')) {
      const shaderId = trimmed.slice(7);
      return {
        ...DEFAULT_DARK_THEME_CONFIG,
        id: shaderId,
        backgroundType: 'shader',
        shaderPresetId: shaderId,
      };
    }

    // Check if it's a built-in preset ID
    const foundPreset = BUILT_IN_PRESETS.find((p) => p.id === trimmed);
    if (foundPreset) {
      return { ...foundPreset.config, id: foundPreset.id };
    }

    // Try parsing as JSON config
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_DARK_THEME_CONFIG,
            ...parsed,
          };
        }
      } catch {
        // Fallback below
      }
    }

    // Direct solid hex / rgb color
    if (trimmed.startsWith('#') || trimmed.startsWith('rgb')) {
      return {
        ...DEFAULT_DARK_THEME_CONFIG,
        backgroundType: 'solid',
        backgroundColor: trimmed,
      };
    }
  }

  return { ...DEFAULT_DARK_THEME_CONFIG };
}

/**
 * Serializes a ChatThemeConfig into a portable string (preset ID or ETERNAL-THEME Base64 code).
 */
export function serializeChatTheme(config: ChatThemeConfig): string {
  if (!config) return 'default';
  if (config.id && config.id !== 'custom' && config.id !== 'default') {
    if (config.backgroundType === 'shader' && config.shaderPresetId) {
      return `shader:${config.shaderPresetId}`;
    }
    const preset = BUILT_IN_PRESETS.find((p) => p.id === config.id);
    if (preset && JSON.stringify(preset.config) === JSON.stringify(config)) {
      return preset.id;
    }
    return preset ? preset.id : `preset:${config.id}`;
  }
  if (config.backgroundType === 'shader' && config.shaderPresetId) {
    return `shader:${config.shaderPresetId}`;
  }
  return encodeThemeCode(config);
}

// ----------------------------------------------------
// Custom User Presets Storage
// ----------------------------------------------------
const CUSTOM_PRESETS_KEY = 'eternal_custom_chat_presets';

export async function getCustomPresets(): Promise<PresetTheme[]> {
  try {
    const fromIdb = await idbGet<PresetTheme[]>(CUSTOM_PRESETS_KEY);
    if (fromIdb && Array.isArray(fromIdb)) return fromIdb;

    if (typeof window !== 'undefined') {
      const fromLocal = localStorage.getItem(CUSTOM_PRESETS_KEY);
      if (fromLocal) {
        const parsed = JSON.parse(fromLocal);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (err) {
    console.warn('[ThemeUtils] Failed to load custom presets:', err);
  }
  return [];
}

export async function saveCustomPreset(
  nameOrPreset: string | PresetTheme,
  config?: ChatThemeConfig,
): Promise<PresetTheme[]> {
  let preset: PresetTheme;

  if (typeof nameOrPreset === 'string') {
    const themeConfig = config || DEFAULT_DARK_THEME_CONFIG;
    let previewBg = themeConfig.backgroundColor || '#0b0b0c';
    if (themeConfig.backgroundType === 'gradient' && themeConfig.gradientColors?.length) {
      previewBg = `linear-gradient(${themeConfig.gradientAngle ?? 135}deg, ${themeConfig.gradientColors.join(', ')})`;
    } else if (themeConfig.backgroundType === 'image' && themeConfig.bgImageUrl) {
      previewBg = `url(${themeConfig.bgImageUrl})`;
    }

    preset = {
      id: `custom-${Date.now()}`,
      name: nameOrPreset,
      category: themeConfig.backgroundType === 'gradient' ? 'gradient' : 'solid',
      previewBg,
      config: {
        ...themeConfig,
        id: `custom-${Date.now()}`,
        name: nameOrPreset,
      },
    };
  } else {
    preset = nameOrPreset;
  }

  const current = await getCustomPresets();
  const existingIdx = current.findIndex((p) => p.id === preset.id);
  let next: PresetTheme[];

  if (existingIdx >= 0) {
    next = [...current];
    next[existingIdx] = preset;
  } else {
    next = [preset, ...current];
  }

  await idbSet(CUSTOM_PRESETS_KEY, next);
  try {
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(next));
  } catch {
    // Gracefully handle if localStorage is full
  }
  return next;
}

export async function deleteCustomPreset(presetId: string): Promise<PresetTheme[]> {
  const current = await getCustomPresets();
  const next = current.filter((p) => p.id !== presetId);
  await idbSet(CUSTOM_PRESETS_KEY, next);
  try {
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}

// ----------------------------------------------------
// Multi-Tab Sync with BroadcastChannel
// ----------------------------------------------------
export function dispatchThemeSync(conversationId: string, theme: ChatThemeConfig) {
  if (typeof window === 'undefined') return;

  const payload = {
    type: 'ETERNAL_THEME_UPDATED',
    conversationId,
    theme,
    timestamp: Date.now(),
  };

  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('eternal_theme_sync');
      channel.postMessage(payload);
      channel.close();
    }
  } catch {
    // Ignore
  }

  // Local window event for current tab
  window.dispatchEvent(new CustomEvent('eternal_theme_updated', { detail: payload }));
}

// ----------------------------------------------------
// SVG Sanitizer & CSS Injection Shield
// ----------------------------------------------------
/**
 * Sanitizes and validates SVG file content to prevent CSS/JS injection and XSS attacks.
 * Strips <script>, <foreignObject>, <iframe>, <object>, <embed>, inline event handlers (onload, onerror, etc.),
 * and dangerous URI schemes.
 */
export function sanitizeAndValidateSvg(svgContent: string): {
  isValid: boolean;
  sanitizedSvg?: string;
  error?: string;
} {
  if (!svgContent || typeof svgContent !== 'string') {
    return { isValid: false, error: 'Empty SVG content' };
  }

  try {
    if (typeof DOMParser === 'undefined') {
      // In test/Node environment, strictly reject any executable or active content without partial regex replacement
      if (
        /<(?:script|foreignobject|iframe|object|embed|audio|video|meta|link|use|set|animate|animatetransform|handler)\b/i.test(
          svgContent,
        ) ||
        /\bon[a-z0-9_-]+\s*=/i.test(svgContent) ||
        /(?:javascript|vbscript):/i.test(svgContent) ||
        /data:(?!image\/(?:png|jpeg|jpg|webp|gif|avif);base64)/i.test(svgContent)
      ) {
        return { isValid: false, error: 'SVG contains forbidden executable tags or scripts' };
      }
      return { isValid: true, sanitizedSvg: svgContent };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');

    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      return { isValid: false, error: 'Invalid SVG format' };
    }

    const svgElement = doc.documentElement;
    if (!svgElement || svgElement.nodeName.toLowerCase() !== 'svg') {
      return { isValid: false, error: 'Root element is not <svg>' };
    }

    // Dangerous tags to remove completely (case-insensitive & namespace-safe)
    const dangerousTagSet = new Set([
      'script',
      'foreignobject',
      'iframe',
      'object',
      'embed',
      'audio',
      'video',
      'meta',
      'link',
      'applet',
      'frame',
      'frameset',
      'use',
      'set',
      'animate',
      'animatetransform',
      'handler',
    ]);

    const allElements = Array.from(doc.getElementsByTagName('*'));
    for (const el of allElements) {
      const tagName = el.tagName.toLowerCase().replace(/^.*:/, '');
      if (dangerousTagSet.has(tagName)) {
        el.parentNode?.removeChild(el);
        continue;
      }

      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        const attrName = attr.name.toLowerCase();
        const attrVal = attr.value.trim().toLowerCase();

        // Remove inline event handlers (e.g. onload, onerror, onclick, onanything)
        if (attrName.startsWith('on') || attrName.includes('on')) {
          el.removeAttribute(attr.name);
          continue;
        }

        // Remove dangerous href/xlink:href/src protocols
        if (
          attrName === 'href' ||
          attrName === 'xlink:href' ||
          attrName === 'src' ||
          attrName.endsWith(':href') ||
          attrName.endsWith(':src')
        ) {
          if (
            attrVal.startsWith('javascript:') ||
            attrVal.startsWith('vbscript:') ||
            (attrVal.startsWith('data:') &&
              !/^data:image\/(?:png|jpeg|jpg|webp|gif|avif);base64,[a-z0-9+/=]+$/i.test(attrVal))
          ) {
            el.removeAttribute(attr.name);
            continue;
          }
        }

        // Check style attributes for javascript/expression execution
        if (attrName === 'style') {
          if (
            attrVal.includes('javascript:') ||
            attrVal.includes('vbscript:') ||
            attrVal.includes('expression(') ||
            attrVal.includes('-moz-binding') ||
            attrVal.includes('url(')
          ) {
            el.removeAttribute(attr.name);
            continue;
          }
        }
      }
    }

    const serializer = new XMLSerializer();
    const sanitized = serializer.serializeToString(doc);
    return { isValid: true, sanitizedSvg: sanitized };
  } catch (err) {
    return { isValid: false, error: (err as Error).message || 'Failed to sanitize SVG' };
  }
}

// ----------------------------------------------------
// Recent Wallpapers Storage (History up to 5 items)
// ----------------------------------------------------
export interface RecentWallpaperItem {
  id: string;
  type: 'image' | 'gif' | 'shader';
  url?: string;
  shaderId?: string;
  name: string;
  thumbnailUrl?: string;
  previewBg?: string;
  createdAt: number;
}

const RECENT_WALLPAPERS_KEY = 'eternal_recent_chat_wallpapers';
const MAX_RECENT_WALLPAPERS = 5;

export async function getRecentWallpapers(): Promise<RecentWallpaperItem[]> {
  try {
    const fromIdb = await idbGet<RecentWallpaperItem[]>(RECENT_WALLPAPERS_KEY);
    if (fromIdb && Array.isArray(fromIdb)) return fromIdb;

    if (typeof window !== 'undefined') {
      const fromLocal = localStorage.getItem(RECENT_WALLPAPERS_KEY);
      if (fromLocal) {
        const parsed = JSON.parse(fromLocal);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (err) {
    console.warn('[ThemeUtils] Failed to load recent wallpapers:', err);
  }
  return [];
}

export async function addRecentWallpaper(
  item: Omit<RecentWallpaperItem, 'id' | 'createdAt'>,
): Promise<RecentWallpaperItem[]> {
  const newItem: RecentWallpaperItem = {
    ...item,
    id: `recent-wp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
  };

  const current = await getRecentWallpapers();
  // Filter duplicates by url or shaderId
  const filtered = current.filter((wp) => {
    if (item.url && wp.url) return wp.url !== item.url;
    if (item.shaderId && wp.shaderId) return wp.shaderId !== item.shaderId;
    return true;
  });

  const next = [newItem, ...filtered].slice(0, MAX_RECENT_WALLPAPERS);

  await idbSet(RECENT_WALLPAPERS_KEY, next);
  try {
    localStorage.setItem(RECENT_WALLPAPERS_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}

export async function deleteRecentWallpaper(id: string): Promise<RecentWallpaperItem[]> {
  const current = await getRecentWallpapers();
  const next = current.filter((wp) => wp.id !== id);
  await idbSet(RECENT_WALLPAPERS_KEY, next);
  try {
    localStorage.setItem(RECENT_WALLPAPERS_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}

// ----------------------------------------------------
// Dynamic <meta name="theme-color"> Sync
// ----------------------------------------------------
/**
 * Dynamically updates the browser's <meta name="theme-color"> to seamlessly match
 * the status bar and browser tab to the top color of the chat theme.
 */
export function updateMetaThemeColor(themeOrColor: string | ChatThemeConfig): void {
  if (typeof document === 'undefined') return;

  let targetColor = '#0b0b0c';

  if (typeof themeOrColor === 'string') {
    targetColor =
      themeOrColor.startsWith('#') || themeOrColor.startsWith('rgb') ? themeOrColor : '#0b0b0c';
  } else if (themeOrColor && typeof themeOrColor === 'object') {
    if (themeOrColor.backgroundType === 'solid') {
      targetColor = themeOrColor.backgroundColor || '#0b0b0c';
    } else if (
      themeOrColor.backgroundType === 'gradient' &&
      themeOrColor.gradientColors?.length > 0
    ) {
      targetColor = themeOrColor.gradientColors[0];
    } else if (themeOrColor.backgroundType === 'shader') {
      targetColor = '#0d071a';
    } else {
      targetColor = themeOrColor.backgroundColor || '#0b0b0c';
    }
  }

  try {
    let metaTag = document.querySelector('meta[name="theme-color"]');
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTag);
    }
    metaTag.setAttribute('content', targetColor);
  } catch {
    // Ignore in non-browser environments
  }
}
