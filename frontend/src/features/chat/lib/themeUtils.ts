import React from 'react';
import { z } from 'zod';
import {
  BUILT_IN_PRESETS,
  BubbleShapeType,
  CHAT_FONTS,
  ChatThemeConfig,
  DEFAULT_DARK_THEME_CONFIG,
  PresetTheme,
} from '../model/chatTheme';
export type { ChatThemeConfig, PresetTheme, BubbleShapeType };
import { idbGet, idbSet, idbDelete } from '../../../shared/lib/indexedDbStorage';
import { loadThemeFont } from './fontLoader';

// Safe URL validator for theme image / background URLs to protect against XSS (e.g. javascript:, vbscript:)
const safeUrlSchema = z
  .string()
  .max(10_000_000)
  .refine(
    (url) => {
      if (!url) return true;
      const lower = url.trim().toLowerCase();
      if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) {
        return false;
      }
      if (lower.startsWith('blob:')) {
        return true;
      }
      if (lower.startsWith('data:')) {
        return /^data:image\/(?:png|jpeg|jpg|webp|gif|avif|svg\+xml)(?:;[a-z0-9-]+=[a-z0-9-]+)*;base64,[a-z0-9+/=\s]+$/i.test(
          url.trim(),
        );
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
  bubbleShape: z
    .enum([
      'default',
      'ios-classic',
      'telegram-modern',
      'cyber-glass',
      'retro-pixel',
      'gummy',
      'prisma',
      'capybara',
      'frog',
      'cat-dog',
      'doge',
      'dino',
      'heart-pepe',
      'liquid-neon',
      'star-bubble',
      'pink-cream',
      'sheetbook-note',
      'moon-bubble',
      'cloudy-bubble',
      'evil-bubble',
      'halo-bubble',
      'system-bubble',
    ])
    .default('telegram-modern'),
  bubbleType: z.enum(['solid', 'gradient', 'preset']).default('gradient'),
  bubbleColor: z.string().max(50).default('#9333ea'),
  bubbleGradientColors: z.array(z.string().max(50)).max(10).default(['#9333ea', '#6366f1']),
  bubbleGradientAngle: z.number().min(0).max(360).default(135),
  bubbleContinuousGradient: z.boolean().default(false),
  bubbleTextColor: z.string().max(50).default('auto'),
  bubbleOpacity: z.number().min(0.05).max(1).default(0.95),
  bubbleBlur: z.number().min(0).max(50).default(16),
  incomingBubbleType: z.enum(['solid', 'gradient', 'preset']).optional(),
  incomingBubbleColor: z.string().max(50).optional(),
  incomingBubbleGradientColors: z.array(z.string().max(50)).max(10).optional(),
  incomingBubbleGradientAngle: z.number().min(0).max(360).optional(),
  incomingBubbleTextColor: z.string().max(50).optional(),
  incomingBubbleOpacity: z.number().min(0.05).max(1).default(0.85),
  incomingBubbleBlur: z.number().min(0).max(50).default(16),
  textFont: z.string().max(50).default('default'),
  textEffect: z.string().max(50).default('minimal'),
  textColor: z.string().max(50).default('auto'),
  textApplyToAll: z.boolean().default(false),
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
  // If the bubble shape explicitly overrides background to white (e.g. sheetbook-note)
  if (config.bubbleShape === 'sheetbook-note') {
    const customTextColor = isOwnMessage ? config.bubbleTextColor : config.incomingBubbleTextColor;
    if (customTextColor && customTextColor !== 'auto') {
      const isCustomLightText = getLuminance(customTextColor) > 0.5;
      return createContrastTheme(!isCustomLightText, customTextColor);
    }
    return createContrastTheme(true);
  }

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
      backgroundColor: 'transparent',
      backgroundImage: `url(${config.bgImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'initial',
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
      backgroundColor: 'transparent',
      backgroundImage: `linear-gradient(${angle}deg, ${colors.join(', ')})`,
      backgroundSize: 'auto',
      backgroundPosition: 'initial',
      backgroundRepeat: 'repeat',
      backgroundAttachment: 'initial',
    };
  }

  // Solid or preset fallback
  return {
    ...baseStyle,
    backgroundColor: config.backgroundColor || '#0b0b0c',
    backgroundImage: 'none',
    backgroundSize: 'auto',
    backgroundPosition: 'initial',
    backgroundRepeat: 'repeat',
    backgroundAttachment: 'initial',
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
 * Computes CSS styles and classes for custom typography and Discord-style text effects.
 * Supports on-demand font loading, font scaling/line-height normalization,
 * contrast-aware text color resolution, and toggle scope (own vs all messages).
 */
export function getThemeTextStyle(
  config?: ChatThemeConfig | null,
  isOwnMessage = true,
  baseTextColor?: string,
): {
  style: React.CSSProperties;
  className: string;
} {
  if (!config) {
    return { style: {}, className: '' };
  }

  // If textApplyToAll is false, custom text styling applies ONLY to user's own bubbles
  const shouldApply = config.textApplyToAll || isOwnMessage;
  if (!shouldApply) {
    return { style: {}, className: '' };
  }

  const fontId = config.textFont || 'default';
  const effectId = config.textEffect || 'minimal';
  const rawColor = config.textColor || 'auto';

  const fontMeta = CHAT_FONTS.find((f) => f.id === fontId);

  // Trigger on-demand lazy loading of the font stylesheet
  if (fontMeta && fontMeta.googleFontName) {
    loadThemeFont(fontMeta.fontFamily, fontMeta.googleFontName);
  }

  const style: React.CSSProperties = {};
  const classNames: string[] = [];

  // 1. Font Family & x-height scale / line-height / letter-spacing normalization
  if (fontMeta && fontId !== 'default') {
    style.fontFamily = fontMeta.fontFamily;
    if (fontMeta.scale && fontMeta.scale !== 1) {
      style.fontSize = `${fontMeta.scale}em`;
    }
    if (fontMeta.lineHeight) {
      style.lineHeight = fontMeta.lineHeight;
    }
    if (fontMeta.letterSpacing) {
      style.letterSpacing = fontMeta.letterSpacing;
    }
  }

  // 2. Text Color Resolution (Auto mode resolves to high-contrast base color)
  let effectiveColor: string | undefined = undefined;
  if (rawColor && rawColor !== 'auto') {
    effectiveColor = rawColor;
  } else if (baseTextColor) {
    effectiveColor = baseTextColor;
  }

  // 3. Text Effect application
  switch (effectId) {
    case 'gradient': {
      classNames.push('msg-effect-gradient');
      if (effectiveColor && rawColor !== 'auto') {
        style.backgroundImage = `linear-gradient(135deg, ${effectiveColor} 0%, #a855f7 50%, #38bdf8 100%)`;
      }
      break;
    }
    case 'neon': {
      classNames.push('msg-effect-neon');
      if (effectiveColor) {
        style.color = effectiveColor;
        style.textShadow = `0 0 5px ${effectiveColor}, 0 0 12px ${effectiveColor}, 0 0 22px rgba(168, 85, 247, 0.8)`;
      }
      break;
    }
    case 'cartoon': {
      classNames.push('msg-effect-cartoon');
      if (effectiveColor) {
        style.color = effectiveColor;
      }
      break;
    }
    case 'highlight': {
      classNames.push('msg-effect-highlight');
      if (effectiveColor && rawColor !== 'auto') {
        style.color = effectiveColor;
        style.textShadow = `0 0 8px ${effectiveColor}b3, 0 2px 0 rgba(0,0,0,0.5)`;
      }
      break;
    }
    case 'gummy': {
      classNames.push('msg-effect-gummy');
      if (effectiveColor && rawColor !== 'auto') {
        style.color = effectiveColor;
      }
      break;
    }
    case 'prism': {
      classNames.push('msg-effect-prism');
      if (effectiveColor) {
        style.color = effectiveColor;
      }
      break;
    }
    case 'minimal':
    default: {
      if (effectiveColor) {
        style.color = effectiveColor;
      }
      break;
    }
  }

  return {
    style,
    className: classNames.join(' '),
  };
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
 * Computes bubble shapes, rounding classes, borders and tail visibility based on selected BubbleShapeType.
 */
export function getBubbleShapeStyles(
  shape: BubbleShapeType = 'telegram-modern',
  isOwnMessage: boolean,
  position: 'single' | 'first' | 'middle' | 'last' = 'single',
): {
  roundingClass: string;
  extraClass: string;
  extraStyle: React.CSSProperties;
  showTail: boolean;
  tailType: 'ios' | 'telegram' | null;
} {
  switch (shape) {
    case 'ios-classic': {
      let roundingClass = '';
      if (isOwnMessage) {
        switch (position) {
          case 'first':
            roundingClass = 'rounded-[20px] rounded-br-[8px]';
            break;
          case 'middle':
            roundingClass = 'rounded-l-[20px] rounded-r-[8px]';
            break;
          case 'last':
          case 'single':
          default:
            roundingClass = 'rounded-[20px] rounded-br-[6px]';
            break;
        }
      } else {
        switch (position) {
          case 'first':
            roundingClass = 'rounded-[20px] rounded-bl-[8px]';
            break;
          case 'middle':
            roundingClass = 'rounded-r-[20px] rounded-l-[8px]';
            break;
          case 'last':
          case 'single':
          default:
            roundingClass = 'rounded-[20px] rounded-bl-[6px]';
            break;
        }
      }
      return {
        roundingClass,
        extraClass: '',
        extraStyle: {},
        showTail: position === 'single' || position === 'last',
        tailType: 'ios',
      };
    }

    case 'telegram-modern': {
      let roundingClass = '';
      if (isOwnMessage) {
        switch (position) {
          case 'first':
            roundingClass = 'rounded-[18px] rounded-br-[8px]';
            break;
          case 'middle':
            roundingClass = 'rounded-l-[18px] rounded-r-[6px]';
            break;
          case 'last':
            roundingClass = 'rounded-l-[18px] rounded-tr-[18px] rounded-br-[3px]';
            break;
          case 'single':
          default:
            roundingClass = 'rounded-[18px] rounded-br-[3px]';
            break;
        }
      } else {
        switch (position) {
          case 'first':
            roundingClass = 'rounded-[18px] rounded-bl-[8px]';
            break;
          case 'middle':
            roundingClass = 'rounded-r-[18px] rounded-l-[6px]';
            break;
          case 'last':
            roundingClass = 'rounded-r-[18px] rounded-tl-[18px] rounded-bl-[3px]';
            break;
          case 'single':
          default:
            roundingClass = 'rounded-[18px] rounded-bl-[3px]';
            break;
        }
      }
      return {
        roundingClass,
        extraClass: '',
        extraStyle: {},
        showTail: position === 'single' || position === 'last',
        tailType: 'telegram',
      };
    }

    case 'cyber-glass': {
      return {
        roundingClass: 'rounded-2xl',
        extraClass: isOwnMessage
          ? 'border border-cyan-400/80 shadow-[0_0_16px_rgba(6,182,212,0.45),inset_0_0_12px_rgba(147,51,234,0.25)] ring-1 ring-cyan-300/40'
          : 'border border-purple-400/70 shadow-[0_0_16px_rgba(168,85,247,0.35),inset_0_0_12px_rgba(6,182,212,0.2)] ring-1 ring-purple-300/30',
        extraStyle: {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        },
        showTail: false,
        tailType: null,
      };
    }

    case 'retro-pixel': {
      return {
        roundingClass: 'rounded-none',
        extraClass: 'border-2 border-black shadow-[3px_3px_0px_#000000]',
        extraStyle: {
          imageRendering: 'pixelated',
        },
        showTail: false,
        tailType: null,
      };
    }

    case 'gummy': {
      return {
        roundingClass: 'rounded-[24px]',
        extraClass:
          'animate-gummy-squish border border-white/45 shadow-[0_8px_25px_rgba(244,114,182,0.4),inset_0_2px_4px_rgba(255,255,255,0.6)]',
        extraStyle: {
          backgroundImage:
            'linear-gradient(135deg, rgba(244,114,182,0.95) 0%, rgba(192,132,252,0.95) 50%, rgba(56,189,248,0.95) 100%)',
          color: '#ffffff',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
        },
        showTail: false,
        tailType: null,
      };
    }

    case 'prisma': {
      return {
        roundingClass: 'rounded-[22px]',
        extraClass:
          'animate-prisma-flow border border-white/50 shadow-[0_4px_20px_rgba(59,130,246,0.35)]',
        extraStyle: {
          backgroundImage:
            'linear-gradient(90deg, #f59e0b, #10b981, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #f97316, #f59e0b)',
          backgroundSize: '200% 100%',
          color: '#ffffff',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        },
        showTail: false,
        tailType: null,
      };
    }

    case 'capybara': {
      return {
        roundingClass: isOwnMessage
          ? 'rounded-[22px] rounded-br-[6px]'
          : 'rounded-[22px] rounded-bl-[6px]',
        extraClass: 'border-2 border-[#78350f] shadow-[0_4px_16px_rgba(120,53,15,0.3)]',
        extraStyle: {
          backgroundColor: isOwnMessage ? '#b5804c' : '#a06a38',
          backgroundImage: isOwnMessage
            ? 'linear-gradient(180deg, #c58f59 0%, #a8733f 100%)'
            : 'linear-gradient(180deg, #b07a46 0%, #8c5828 100%)',
          color: '#ffffff',
        },
        showTail: false,
        tailType: null,
      };
    }

    case 'frog': {
      return {
        roundingClass: isOwnMessage
          ? 'rounded-[20px] rounded-br-[6px]'
          : 'rounded-[20px] rounded-bl-[6px]',
        extraClass: 'border-2 border-[#065f46] shadow-[0_4px_16px_rgba(16,185,129,0.3)]',
        extraStyle: {
          backgroundColor: isOwnMessage ? '#10b981' : '#059669',
          backgroundImage: isOwnMessage
            ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)'
            : 'linear-gradient(180deg, #059669 0%, #047857 100%)',
          color: '#ffffff',
        },
        showTail: false,
        tailType: null,
      };
    }

    case 'cat-dog': {
      return {
        roundingClass: isOwnMessage
          ? 'rounded-[22px] rounded-br-[6px]'
          : 'rounded-[22px] rounded-bl-[6px]',
        extraClass: 'border-2 border-[#b45309]/60 shadow-[0_4px_16px_rgba(217,119,6,0.2)]',
        extraStyle: {
          backgroundColor: isOwnMessage ? '#fef3c7' : '#fde68a',
          backgroundImage: isOwnMessage
            ? 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)'
            : 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)',
          color: '#78350f',
        },
        showTail: false,
        tailType: null,
      };
    }

    case 'doge': {
      return {
        roundingClass: isOwnMessage
          ? 'rounded-[22px] rounded-br-[6px]'
          : 'rounded-[22px] rounded-bl-[6px]',
        extraClass: 'border-2 border-[#b45309] shadow-[0_4px_16px_rgba(245,158,11,0.25)]',
        extraStyle: {
          backgroundColor: isOwnMessage ? '#fbbf24' : '#f59e0b',
          backgroundImage: isOwnMessage
            ? 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)'
            : 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
          color: '#451a03',
        },
        showTail: false,
        tailType: null,
      };
    }

    case 'dino': {
      return {
        roundingClass: isOwnMessage
          ? 'rounded-[20px] rounded-br-[6px]'
          : 'rounded-[20px] rounded-bl-[6px]',
        extraClass: 'border-2 border-[#0f766e] shadow-[0_4px_16px_rgba(20,184,166,0.3)]',
        extraStyle: {
          backgroundColor: isOwnMessage ? '#14b8a6' : '#0d9488',
          backgroundImage: isOwnMessage
            ? 'linear-gradient(180deg, #2dd4bf 0%, #0f766e 100%)'
            : 'linear-gradient(180deg, #14b8a6 0%, #115e59 100%)',
          color: '#ffffff',
        },
        showTail: false,
        tailType: null,
      };
    }

    case 'heart-pepe': {
      return {
        roundingClass: isOwnMessage
          ? 'rounded-[22px] rounded-br-[6px]'
          : 'rounded-[22px] rounded-bl-[6px]',
        extraClass: 'border-2 border-[#db2777]/60 shadow-[0_4px_16px_rgba(244,114,182,0.3)]',
        extraStyle: {
          backgroundColor: isOwnMessage ? '#fbcfe8' : '#f472b6',
          backgroundImage: isOwnMessage
            ? 'linear-gradient(180deg, #fdf2f8 0%, #fbcfe8 100%)'
            : 'linear-gradient(180deg, #fce7f3 0%, #f472b6 100%)',
          color: '#831843',
        },
        showTail: false,
        tailType: null,
      };
    }

    case 'liquid-neon': {
      return {
        roundingClass: 'rounded-[22px]',
        extraClass:
          'border border-purple-500/30 shadow-[0_0_22px_rgba(168,85,247,0.35),inset_0_0_15px_rgba(192,132,252,0.12)]',
        extraStyle: {
          backgroundColor: isOwnMessage ? 'rgba(18, 12, 36, 0.88)' : 'rgba(13, 9, 26, 0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          color: '#ffffff',
        },
        showTail: false,
        tailType: null,
      };
    }

    case 'star-bubble': {
      return {
        roundingClass: isOwnMessage
          ? 'rounded-[20px] rounded-br-[6px]'
          : 'rounded-[20px] rounded-bl-[6px]',
        extraClass: 'border border-amber-600/30 shadow-[0_4px_16px_rgba(245,158,11,0.4)]',
        extraStyle: {
          backgroundColor: '#f59e0b',
          backgroundImage: isOwnMessage
            ? 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 60%, #d97706 100%)'
            : 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 60%, #b45309 100%)',
          color: '#451a03',
        },
        showTail: true,
        tailType: 'telegram',
      };
    }

    case 'pink-cream': {
      return {
        roundingClass: 'rounded-t-[22px] rounded-b-[6px]',
        extraClass: 'pb-3.5 border border-pink-300/40 shadow-[0_6px_20px_rgba(244,114,182,0.4)]',
        extraStyle: {
          backgroundColor: '#f472b6',
          backgroundImage: isOwnMessage
            ? 'linear-gradient(180deg, #fbcfe8 0%, #f472b6 60%, #e11d48 130%)'
            : 'linear-gradient(180deg, #fce7f3 0%, #fb7185 60%, #be123c 130%)',
          color: '#831843',
        },
        showTail: false,
        tailType: null,
      };
    }

    case 'sheetbook-note': {
      return {
        roundingClass: 'rounded-[16px]',
        extraClass: 'border border-slate-300 shadow-[0_4px_16px_rgba(0,0,0,0.18)]',
        extraStyle: {
          backgroundColor: '#ffffff',
          backgroundImage:
            'linear-gradient(to right, rgba(59, 130, 246, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(59, 130, 246, 0.15) 1px, transparent 1px)',
          backgroundSize: '13px 13px',
          color: '#0f172a',
        },
        showTail: false,
        tailType: null,
      };
    }

    case 'moon-bubble': {
      return {
        roundingClass: 'rounded-[22px]',
        extraClass: 'border border-purple-500/25 shadow-[0_0_20px_rgba(147,51,234,0.3)]',
        extraStyle: {
          backgroundColor: '#181135',
          backgroundImage: 'linear-gradient(135deg, #181135 0%, #29154e 50%, #120c2b 100%)',
          color: '#ffffff',
        },
        showTail: false,
        tailType: null,
      };
    }

    case 'cloudy-bubble': {
      return {
        roundingClass: 'rounded-t-[22px] rounded-b-[4px]',
        extraClass: 'pb-4 border border-blue-400/30 shadow-[0_4px_20px_rgba(37,99,235,0.4)]',
        extraStyle: {
          backgroundColor: '#3b82f6',
          backgroundImage: isOwnMessage
            ? 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 60%, #1d4ed8 100%)'
            : 'linear-gradient(180deg, #3b82f6 0%, #2563eb 60%, #1e40af 100%)',
          color: '#ffffff',
        },
        showTail: false,
        tailType: null,
      };
    }

    case 'evil-bubble': {
      return {
        roundingClass: 'rounded-[22px]',
        extraClass:
          'border border-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.45),inset_0_0_12px_rgba(220,38,38,0.3)]',
        extraStyle: {
          backgroundColor: isOwnMessage ? 'rgba(38, 10, 18, 0.88)' : 'rgba(26, 6, 13, 0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          color: '#ffe4e6',
        },
        showTail: false,
        tailType: null,
      };
    }

    case 'halo-bubble': {
      return {
        roundingClass: 'rounded-[20px]',
        extraClass: 'border-2 border-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.35)]',
        extraStyle: {
          backgroundColor: '#ffffff',
          color: '#1f2937',
        },
        showTail: false,
        tailType: null,
      };
    }

    case 'system-bubble': {
      return {
        roundingClass: 'rounded-[14px]',
        extraClass:
          'pt-4 pl-3.5 pr-3.5 pb-2 border border-emerald-500/80 shadow-[0_0_14px_rgba(34,197,94,0.35),inset_0_0_8px_rgba(34,197,94,0.2)] font-mono',
        extraStyle: {
          backgroundColor: '#050805',
          color: '#4ade80',
          textShadow: '0 0 4px rgba(74,222,128,0.4)',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        },
        showTail: false,
        tailType: null,
      };
    }

    case 'default':
    default: {
      let roundingClass = '';
      if (isOwnMessage) {
        switch (position) {
          case 'first':
            roundingClass = 'rounded-[20px] rounded-br-md';
            break;
          case 'middle':
            roundingClass = 'rounded-l-[20px] rounded-r-md';
            break;
          case 'last':
            roundingClass = 'rounded-l-[20px] rounded-tr-md rounded-br-[4px]';
            break;
          case 'single':
          default:
            roundingClass = 'rounded-[20px] rounded-br-[4px]';
            break;
        }
      } else {
        switch (position) {
          case 'first':
            roundingClass = 'rounded-[20px] rounded-bl-md';
            break;
          case 'middle':
            roundingClass = 'rounded-r-[20px] rounded-l-md';
            break;
          case 'last':
            roundingClass = 'rounded-r-[20px] rounded-tl-md rounded-bl-[4px]';
            break;
          case 'single':
          default:
            roundingClass = 'rounded-[20px] rounded-bl-[4px]';
            break;
        }
      }
      return {
        roundingClass,
        extraClass: '',
        extraStyle: {},
        showTail: false,
        tailType: null,
      };
    }
  }
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
          backgroundImage: 'none',
          backgroundAttachment: 'initial',
          backgroundSize: 'auto',
          backgroundPosition: 'initial',
          borderColor: 'rgba(255, 255, 255, 0.12)',
        },
        className: 'shadow-md border',
      };
    }
    return {
      style: {
        ...glassStyle,
        backgroundColor: `rgba(18, 19, 27, ${opacity})`,
        backgroundImage: 'none',
        backgroundAttachment: 'initial',
        backgroundSize: 'auto',
        backgroundPosition: 'initial',
        borderColor: 'rgba(255, 255, 255, 0.08)',
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
        backgroundColor: 'transparent',
        backgroundImage: `linear-gradient(${angle}deg, ${rgbaColors.join(', ')})`,
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
        backgroundImage: 'none',
        backgroundAttachment: 'initial',
        backgroundSize: 'auto',
        backgroundPosition: 'initial',
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
      backgroundColor: 'transparent',
      backgroundImage: `linear-gradient(${angle}deg, ${rgbaColors.join(', ')})`,
      backgroundAttachment: 'initial',
      backgroundSize: 'auto',
      backgroundPosition: 'initial',
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
    const preset = BUILT_IN_PRESETS.find((p) => p.id === config.id);
    if (preset && JSON.stringify(preset.config) === JSON.stringify(config)) {
      return preset.id;
    }
  }

  // Check if it is a pure shader preset with default bubbles & typography
  if (config.backgroundType === 'shader' && config.shaderPresetId) {
    const isDefaultBubbles =
      config.bubbleType === DEFAULT_DARK_THEME_CONFIG.bubbleType &&
      config.bubbleColor === DEFAULT_DARK_THEME_CONFIG.bubbleColor &&
      config.bubbleGradientAngle === DEFAULT_DARK_THEME_CONFIG.bubbleGradientAngle &&
      config.bubbleContinuousGradient === DEFAULT_DARK_THEME_CONFIG.bubbleContinuousGradient &&
      config.bubbleOpacity === DEFAULT_DARK_THEME_CONFIG.bubbleOpacity &&
      config.bubbleBlur === DEFAULT_DARK_THEME_CONFIG.bubbleBlur &&
      (config.bubbleShape || 'telegram-modern') === DEFAULT_DARK_THEME_CONFIG.bubbleShape &&
      (config.bubbleTextColor || 'auto') === DEFAULT_DARK_THEME_CONFIG.bubbleTextColor &&
      config.incomingBubbleColor === DEFAULT_DARK_THEME_CONFIG.incomingBubbleColor &&
      (config.incomingBubbleTextColor || 'auto') ===
        DEFAULT_DARK_THEME_CONFIG.incomingBubbleTextColor &&
      (config.textFont || 'default') === DEFAULT_DARK_THEME_CONFIG.textFont &&
      (config.textEffect || 'minimal') === DEFAULT_DARK_THEME_CONFIG.textEffect &&
      (config.textColor || 'auto') === DEFAULT_DARK_THEME_CONFIG.textColor &&
      Boolean(config.textApplyToAll) === DEFAULT_DARK_THEME_CONFIG.textApplyToAll &&
      JSON.stringify(config.bubbleGradientColors) ===
        JSON.stringify(DEFAULT_DARK_THEME_CONFIG.bubbleGradientColors);

    if (isDefaultBubbles) {
      return `shader:${config.shaderPresetId}`;
    }
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
  if (next.length === 0) {
    await idbDelete(RECENT_WALLPAPERS_KEY);
    try {
      localStorage.removeItem(RECENT_WALLPAPERS_KEY);
    } catch {
      // Ignore
    }
  } else {
    await idbSet(RECENT_WALLPAPERS_KEY, next);
    try {
      localStorage.setItem(RECENT_WALLPAPERS_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
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
