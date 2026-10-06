import { ProfileFrame } from '@/shared/ui/ProfileFrame';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trash2,
  Plus,
  ChevronsRight,
  Sparkles,
  Check,
  X,
  Palette,
  Type,
  Swords,
  Star,
  Flame,
  Store,
  Lock,
  Ban,
  Loader2,
  Moon,
  Sun,
  Dices,
  Pipette,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useDecorations } from '@/pages/Shop/model/useDecorations';
import { useNameplates } from '@/pages/Shop/model/useNameplates';
import type { AvatarDecorationDto, NameplateDto } from '@social-network/shared-contracts';
import { AvatarWithDecoration } from '@/shared/ui/AvatarDecoration';
import { Nameplate } from '@/shared/ui/Nameplate';
import Avatar from '@/shared/ui/Avatar';
import Banner from '@/shared/ui/Banner';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { useThemeStore } from '@/shared/model/useThemeStore';
import { useUIStore } from '@/shared/model/useUIStore';
import { apiClient } from '@/shared/api/httpClient';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import { useActiveDecorationStore } from '@/shared/model/useActiveDecorationStore';
import {
  getAdaptiveContrastColor,
  adaptGradientString,
  adaptGummyColors,
} from '@/shared/lib/colorContrast';
import {
  CHAT_FONTS,
  CHAT_TEXT_EFFECTS,
  DISCORD_TEXT_COLORS,
} from '@/features/chat/model/chatTheme';
import { loadThemeFont, preloadTextTabFonts } from '@/features/chat/lib/fontLoader';

const DISCORD_CUSTOMIZE_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700;800&family=DynaPuff:wght@700;800&family=Cinzel:wght@700;800&family=Orbitron:wght@700;900&family=Caveat:wght@700&family=Press+Start+2P&display=swap');

@keyframes sakuraFall1 {
  0% { transform: translate3d(0, -10px, 0) rotate(0deg); opacity: 0; }
  20% { opacity: 0.9; }
  80% { opacity: 0.85; }
  100% { transform: translate3d(24px, 120px, 0) rotate(260deg); opacity: 0; }
}
@keyframes sakuraFall2 {
  0% { transform: translate3d(10px, -15px, 0) rotate(45deg); opacity: 0; }
  25% { opacity: 0.95; }
  75% { opacity: 0.8; }
  100% { transform: translate3d(-18px, 125px, 0) rotate(320deg); opacity: 0; }
}
@keyframes sakuraFall3 {
  0% { transform: translate3d(-8px, -12px, 0) rotate(15deg); opacity: 0; }
  20% { opacity: 0.9; }
  80% { opacity: 0.85; }
  100% { transform: translate3d(14px, 115px, 0) rotate(210deg); opacity: 0; }
}
@keyframes nameGlowPulseAnim {
  0%, 100% { filter: drop-shadow(0 2px 7px rgba(168, 85, 247, 0.65)); }
  50% { filter: drop-shadow(0 2px 18px rgba(168, 85, 247, 0.95)) drop-shadow(0 0 26px rgba(147, 197, 253, 0.85)); }
}
@keyframes nameFloatAnim {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
@keyframes cyberScanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
@keyframes cosmicTwinkle {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
@keyframes meteorFall {
  0% { transform: translate3d(80px, -40px, 0); opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 0.9; }
  100% { transform: translate3d(-140px, 180px, 0); opacity: 0; }
}
@keyframes emberRiseAnim {
  0% { transform: translateY(20px) scale(0.5); opacity: 0; }
  30% { opacity: 0.9; }
  80% { opacity: 0.8; }
  100% { transform: translateY(-80px) scale(1.1); opacity: 0; }
}
@keyframes bubbleFloatAnim {
  0% { transform: translateY(30px) scale(0.6); opacity: 0; }
  25% { opacity: 0.85; }
  80% { opacity: 0.75; }
  100% { transform: translateY(-70px) scale(1.05); opacity: 0; }
}
@keyframes leafDrift {
  0% { transform: translate3d(0, -10px, 0) rotate(0deg); opacity: 0; }
  20% { opacity: 0.9; }
  80% { opacity: 0.85; }
  100% { transform: translate3d(-25px, 110px, 0) rotate(180deg); opacity: 0; }
}
@keyframes prismFlowRightToLeft {
  0% { background-position: 0% 50%; }
  100% { background-position: -200% 50%; }
}
@keyframes gummyJellyStretch {
  0%, 65%, 100% { transform: scale(1, 1) translateY(0); }
  15% { transform: scale(1.18, 0.82) translateY(1px); }
  30% { transform: scale(0.82, 1.32) translateY(-4px); }
  45% { transform: scale(1.1, 0.92) translateY(0.5px); }
  55% { transform: scale(0.96, 1.04) translateY(-0.5px); }
}
@keyframes popLetterBounce {
  0%, 65%, 100% {
    transform: translateY(0);
    text-shadow:
      0 1px 0 var(--pop-trail-color, #10b981),
      0 2px 0 var(--pop-trail-color, #10b981),
      0 3px 0 var(--pop-trail-color, #10b981);
  }
  25% {
    transform: translateY(-5px);
    text-shadow:
      0 1px 0 var(--pop-trail-color, #10b981),
      0 2px 0 var(--pop-trail-color, #10b981),
      0 3px 0 var(--pop-trail-color, #10b981),
      0 4px 0 var(--pop-trail-color, #10b981),
      0 5px 0 var(--pop-trail-color, #10b981),
      0 6px 0 var(--pop-trail-color, #10b981),
      0 7px 0 var(--pop-trail-color, #10b981),
      0 8px 1px rgba(0, 0, 0, 0.4);
  }
  45% {
    transform: translateY(0);
    text-shadow:
      0 1px 0 var(--pop-trail-color, #10b981),
      0 2px 0 var(--pop-trail-color, #10b981),
      0 3px 0 var(--pop-trail-color, #10b981);
  }
}
@keyframes toonFlowBottomToTop {
  0% { background-position: 50% 100%; }
  50% { background-position: 50% 0%; }
  100% { background-position: 50% -100%; }
}
`;

const EternalLogoIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 28,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="40" height="40" rx="12" fill="white" fillOpacity="0.05" />
      <path d="M13 11H27V15H17.5V18.5H25V22H17.5V25.5H27V29.5H13V11Z" fill="currentColor" />
    </svg>
  );
};

// -------------------------------------------------------------
// Presets & Types
// -------------------------------------------------------------

export interface ProfileEffectPreset {
  id: string;
  name: string;
  description: string;
  isOwned: boolean;
  acquiredDate?: string;
  effectKey: string;
}

export const PROFILE_EFFECT_PRESETS: ProfileEffectPreset[] = [
  {
    id: 'katana-sakura',
    name: 'Sakura Katana',
    description: 'Angled enchanted katana with drifting cherry blossoms',
    isOwned: true,
    acquiredDate: 'Acquired October 2025',
    effectKey: 'katana-sakura',
  },
  {
    id: 'cyber-glitch',
    name: 'Cyberpunk Surge',
    description: 'Holographic scanlines and neon cyan electric grid',
    isOwned: true,
    acquiredDate: 'Acquired November 2025',
    effectKey: 'cyber-glitch',
  },
  {
    id: 'cosmic-starfall',
    name: 'Cosmic Stardust',
    description: 'Swirling purple galaxy with falling meteor trails',
    isOwned: false,
    effectKey: 'cosmic-starfall',
  },
  {
    id: 'dragon-embers',
    name: 'Dragon Embers',
    description: 'Rising fiery sparks and mystic crimson aura',
    isOwned: false,
    effectKey: 'dragon-embers',
  },
  {
    id: 'witch-magic',
    name: "Witch's Brew",
    description: 'Playful sorcery with glowing magical orbs and runes',
    isOwned: false,
    effectKey: 'witch-magic',
  },
  {
    id: 'autumn-swan',
    name: 'Autumn Swan',
    description: 'Golden twilight waters with drifting maple leaves',
    isOwned: false,
    effectKey: 'autumn-swan',
  },
  {
    id: 'water-bubbles',
    name: 'Shimmering Bubbles',
    description: 'Iridescent floating pearls with crystalline light refractions',
    isOwned: false,
    effectKey: 'water-bubbles',
  },
  {
    id: 'mermaid-tide',
    name: 'Mermaid Melody',
    description: 'Pearlescent ocean tides with shimmering coral luster',
    isOwned: false,
    effectKey: 'mermaid-tide',
  },
  {
    id: 'sunflower-bloom',
    name: 'Sunflower Field',
    description: 'Golden summer blossoms bathed in gentle sunbeams',
    isOwned: false,
    effectKey: 'sunflower-bloom',
  },
];

export interface ProfileFramePreset {
  id: string;
  name: string;
  isOwned: boolean;
  acquiredDate?: string;
  borderStyle: string;
  frameType: string;
}

export const PROFILE_FRAME_PRESETS: ProfileFramePreset[] = [
  {
    id: 'sakura-petals',
    name: 'Sakura Frame',
    isOwned: true,
    acquiredDate: 'Acquired September 2025',
    borderStyle:
      'border-2 border-pink-400/80 shadow-[0_0_18px_rgba(244,114,182,0.55)] ring-1 ring-pink-300/40',
    frameType: 'sakura',
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Frame',
    isOwned: false,
    borderStyle:
      'border-2 border-cyan-400/80 shadow-[0_0_18px_rgba(6,182,212,0.6)] ring-1 ring-cyan-300/40',
    frameType: 'cyber',
  },
  {
    id: 'dragon-fire',
    name: 'Dragon Flame Frame',
    isOwned: false,
    borderStyle:
      'border-2 border-rose-500/80 shadow-[0_0_22px_rgba(244,63,94,0.65)] ring-1 ring-amber-400/50',
    frameType: 'fire',
  },
  {
    id: 'regal-gold',
    name: 'Golden Crest',
    isOwned: false,
    borderStyle:
      'border-2 border-amber-300/80 shadow-[0_0_18px_rgba(245,158,11,0.55)] ring-1 ring-yellow-200/40',
    frameType: 'gold',
  },
  {
    id: 'frost-crystal',
    name: 'Frost Crystal Frame',
    isOwned: false,
    borderStyle:
      'border-2 border-sky-300/80 shadow-[0_0_18px_rgba(56,189,248,0.55)] ring-1 ring-white/50',
    frameType: 'frost',
  },
  {
    id: 'sunflower-harvest',
    name: 'Sunflower Frame',
    isOwned: false,
    borderStyle:
      'border-2 border-yellow-400/80 shadow-[0_0_18px_rgba(250,204,21,0.55)] ring-1 ring-amber-500/40',
    frameType: 'sunflower',
  },
  {
    id: 'violet-nebula',
    name: 'Violet Nebula',
    isOwned: false,
    borderStyle:
      'border-2 border-purple-400/80 shadow-[0_0_20px_rgba(168,85,247,0.55)] ring-1 ring-fuchsia-300/40',
    frameType: 'nebula',
  },
  {
    id: 'gothic-silver',
    name: 'Gothic Silver Frame',
    isOwned: false,
    borderStyle:
      'border-2 border-slate-300/80 shadow-[0_0_18px_rgba(203,213,225,0.45)] ring-1 ring-white/40',
    frameType: 'silver',
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare Frame',
    isOwned: false,
    borderStyle:
      'border-2 border-orange-500/80 shadow-[0_0_22px_rgba(249,115,22,0.6)] ring-1 ring-yellow-400/50',
    frameType: 'solar',
  },
];

export interface NameStyleConfig {
  fontId?: string;
  fontFamily: string;
  fontName: string;
  effect?: 'minimal' | 'gradient' | 'neon' | 'cartoon' | 'highlight' | 'gummy' | 'prism';
  color?: string;
  gradient?: string;
  glow?: string;
  animation?: 'none' | 'pulse' | 'wave' | 'shimmer' | 'float';
  gummyColors?: string[];
}

export const DISCORD_GUMMY_PALETTES = [
  { id: 'candy', name: 'Candy', colors: ['#c084fc', '#e9d5ff', '#f472b6', '#fb7185'] },
  {
    id: 'pastel-frost',
    name: 'Pastel Frost',
    colors: ['#67e8f9', '#a5b4fc', '#c084fc', '#f472b6'],
  },
  { id: 'bubblegum', name: 'Bubblegum', colors: ['#f472b6', '#ec4899', '#db2777', '#fda4af'] },
  { id: 'citrus', name: 'Citrus', colors: ['#fca5a5', '#fb923c', '#f97316', '#ea580c'] },
  { id: 'matcha', name: 'Matcha', colors: ['#bef264', '#86efac', '#4ade80', '#22c55e'] },
  { id: 'ocean', name: 'Ocean', colors: ['#7dd3fc', '#38bdf8', '#60a5fa', '#818cf8'] },
  { id: 'lavender', name: 'Lavender', colors: ['#e9d5ff', '#c084fc', '#a855f7', '#7c3aed'] },
];

export const DISCORD_PRISM_GRADIENTS = [
  {
    id: 'rainbow',
    name: 'Rainbow Spectrum',
    gradient:
      'linear-gradient(90deg, #ff4e50 0%, #f9d423 16.6%, #10b981 33.3%, #06b6d4 50%, #6366f1 66.6%, #ec4899 83.3%, #ff4e50 100%)',
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    gradient: 'linear-gradient(90deg, #ff7e5f 0%, #feb47b 33%, #ff2a6d 66%, #ff7e5f 100%)',
  },
  {
    id: 'inferno',
    name: 'Fiery Inferno',
    gradient: 'linear-gradient(90deg, #dc2626 0%, #ea580c 33%, #f59e0b 66%, #dc2626 100%)',
  },
  {
    id: 'aurora',
    name: 'Electric Aurora',
    gradient: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 33%, #c084fc 66%, #38bdf8 100%)',
  },
  {
    id: 'cyber',
    name: 'Cyber Mint',
    gradient: 'linear-gradient(90deg, #06b6d4 0%, #10b981 50%, #3b82f6 100%)',
  },
  {
    id: 'peachy',
    name: 'Golden Peach',
    gradient: 'linear-gradient(90deg, #fde047 0%, #fbcfe8 50%, #f472b6 100%)',
  },
];

export const DISCORD_SOLID_COLORS = [
  { name: 'White', color: '#ffffff' },
  { name: 'Blurple', color: '#5865f2' },
  { name: 'Green', color: '#57f287' },
  { name: 'Yellow', color: '#fee75c' },
  { name: 'Fuchsia', color: '#eb459e' },
  { name: 'Red', color: '#ed4245' },
  { name: 'Cyan', color: '#00b0f4' },
  { name: 'Slate', color: '#99aab5' },
];

export const DISCORD_GRADIENT_PRESETS = [
  { id: 'sunset', name: 'Sunset', gradient: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' },
  { id: 'cyber', name: 'Cyberpunk', gradient: 'linear-gradient(135deg, #06b6d4 0%, #ec4899 100%)' },
  { id: 'aurora', name: 'Aurora', gradient: 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)' },
  { id: 'berry', name: 'Berry', gradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' },
  { id: 'golden', name: 'Golden', gradient: 'linear-gradient(135deg, #eab308 0%, #ef4444 100%)' },
  { id: 'ocean', name: 'Ocean', gradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)' },
  {
    id: 'cotton',
    name: 'Cotton Candy',
    gradient: 'linear-gradient(135deg, #38bdf8 0%, #f472b6 100%)',
  },
];

export const DISCORD_NEON_COLORS = [
  { name: 'Cyan', color: '#00f0ff' },
  { name: 'Green', color: '#39ff14' },
  { name: 'Pink', color: '#ff007f' },
  { name: 'Purple', color: '#bf00ff' },
  { name: 'Yellow', color: '#ffe600' },
  { name: 'Orange', color: '#ff5f00' },
  { name: 'Blue', color: '#0066ff' },
];

export const DISCORD_TOON_COLORS = [
  { name: 'Bubblegum', color: '#f472b6' },
  { name: 'Lime', color: '#a3e635' },
  { name: 'Orange', color: '#fb923c' },
  { name: 'Sky', color: '#38bdf8' },
  { name: 'Lavender', color: '#c084fc' },
  { name: 'Sun', color: '#facc15' },
  { name: 'White', color: '#ffffff' },
];

export const DISCORD_POP_COLORS = [
  { name: 'Emerald', color: '#10b981' },
  { name: 'Sky', color: '#38bdf8' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Red', color: '#ef4444' },
  { name: 'Gold', color: '#eab308' },
  { name: 'White', color: '#ffffff' },
];

// HSV Color Helper Functions for Custom Color Picker
export function hsvToHex(h: number, s: number, v: number): string {
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const val = Math.max(0, Math.min(100, v)) / 100;
  const c = val * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = val - c;
  let r = 0,
    g = 0,
    b = 0;
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
  } else if (h >= 300 && h <= 360) {
    r = c;
    g = 0;
    b = x;
  }
  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3)
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  if (clean.length !== 6) return { h: 320, s: 80, v: 95 };
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(v * 100) };
}

export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export const renderStyledName = (
  text: string,
  styleConfig: NameStyleConfig | null,
  options?: {
    className?: string;
    overrideColor?: string;
    isLightBackground?: boolean;
  },
) => {
  if (!styleConfig) {
    return (
      <span
        className={`inline-block pl-1.5 pr-1 truncate ${
          options?.className ||
          (options?.isLightBackground
            ? 'text-base font-bold text-gray-950'
            : 'text-base font-bold text-white')
        }`}
      >
        {text}
      </span>
    );
  }

  const isLight = options?.isLightBackground ?? false;
  const { fontFamily, effect, color, gradient, glow, animation, gummyColors } = styleConfig;
  const rawColor = options?.overrideColor || color || '#10b981';
  const activeColor = getAdaptiveContrastColor(rawColor, isLight);

  // 1. POP EFFECT
  // Each letter pops slightly upward leaving behind an extruded 3D shadow trail of the chosen color
  if (effect === 'highlight') {
    const letters = text.split('');
    const textColor = isLight ? '#18181b' : '#ffffff';
    return (
      <span
        className={`select-none tracking-wide font-extrabold inline-flex items-baseline pl-1.5 pr-1 ${
          options?.className || ''
        }`}
        style={{
          fontFamily: fontFamily || 'inherit',
          ['--pop-trail-color' as any]: activeColor,
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
              textShadow: `0 1px 0 ${activeColor}, 0 2px 0 ${activeColor}, 0 3px 0 ${activeColor}`,
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
  // 4 distinct pastel colors cycling letter-by-letter; each letter stretches like jelly once every 2 seconds
  if (effect === 'gummy') {
    const rawPalette =
      gummyColors && gummyColors.length === 4
        ? gummyColors
        : ['#c084fc', '#67e8f9', '#f472b6', '#4ade80'];
    const palette = adaptGummyColors(rawPalette, isLight);
    const letters = text.split('');
    return (
      <span
        className={`select-none tracking-wide font-extrabold inline-flex items-baseline pl-1.5 pr-1 ${
          options?.className || ''
        }`}
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
  // Continuous smooth rainbow gradient shimmer flowing right to left
  if (effect === 'prism') {
    const rawPrism =
      gradient ||
      'linear-gradient(90deg, #ff4e50 0%, #f9d423 16.6%, #10b981 33.3%, #06b6d4 50%, #6366f1 66.6%, #ec4899 83.3%, #ff4e50 100%)';
    const prismGradient = adaptGradientString(rawPrism, isLight);
    return (
      <span
        className={`select-none tracking-wide font-extrabold inline-block pl-1.5 pr-1 ${
          options?.className || ''
        }`}
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
        {text}
      </span>
    );
  }

  // 4. NEON EFFECT
  // Requirement 6: у "Neon" не должно быть такой тени, оно просто обводит все буквы легкой линией и всё.
  if (effect === 'neon') {
    return (
      <span
        className={`select-none tracking-wide font-extrabold inline-block pl-1.5 pr-1 ${
          options?.className || ''
        }`}
        style={{
          fontFamily: fontFamily || 'inherit',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
          WebkitTextStroke: `1.2px ${activeColor}`,
          textShadow: 'none',
          filter: isLight
            ? `drop-shadow(0 0 1px ${activeColor}) drop-shadow(0 0 1px rgba(0,0,0,0.4))`
            : `drop-shadow(0 0 1px ${activeColor})`,
        }}
      >
        {text}
      </span>
    );
  }

  // 5. TOON EFFECT
  // Requirement 7: "Toon" сейчас полностью чёрный, а должен выбранным цветом обычный текст - белый, а выбранным цветом снизу-вверх переливаеться по всему имени плавно.
  if (effect === 'cartoon') {
    const toonTopColor = isLight ? '#000000' : '#ffffff';
    const toonGrad = `linear-gradient(180deg, ${toonTopColor} 0%, ${toonTopColor} 30%, ${activeColor} 65%, ${toonTopColor} 100%)`;
    return (
      <span
        className={`select-none tracking-wide font-black inline-block pl-1.5 pr-1 ${
          options?.className || ''
        }`}
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
        {text}
      </span>
    );
  }

  // 6. GRADIENT EFFECT
  if (effect === 'gradient') {
    const rawGrad =
      gradient || `linear-gradient(135deg, ${activeColor} 0%, #a855f7 50%, #38bdf8 100%)`;
    const grad = adaptGradientString(rawGrad, isLight);
    return (
      <span
        className={`select-none tracking-wide font-extrabold inline-block pl-1.5 pr-1 ${
          options?.className || ''
        }`}
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
        {text}
      </span>
    );
  }

  // 7. SOLID / MINIMAL / DEFAULT
  return (
    <span
      className={`select-none tracking-wide font-bold inline-block pl-1.5 pr-1 ${
        options?.className || ''
      }`}
      style={{
        fontFamily: fontFamily || 'inherit',
        color: activeColor,
        animation:
          animation === 'pulse'
            ? 'nameGlowPulseAnim 2.5s ease-in-out infinite'
            : animation === 'float'
              ? 'nameFloatAnim 2s ease-in-out infinite'
              : undefined,
      }}
    >
      {text}
    </span>
  );
};

export interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  accent: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'default-dark', name: 'Default Dark (Eternal)', primary: '#1e1f22', accent: '#111214' },
  { id: 'royal-twilight', name: 'Royal Twilight', primary: '#3c2378', accent: '#eae5d8' },
  { id: 'midnight-blurple', name: 'Midnight Blurple', primary: '#5865F2', accent: '#1e1f22' },
  { id: 'dark-neon', name: 'Dark Neon', primary: '#7928CA', accent: '#FF0080' },
  { id: 'emerald-dusk', name: 'Emerald Dusk', primary: '#064e3b', accent: '#34d399' },
  { id: 'sunset-coral', name: 'Sunset Coral', primary: '#881337', accent: '#fbbf24' },
  { id: 'cyber-ice', name: 'Cyber Ice', primary: '#0c4a6e', accent: '#38bdf8' },
  { id: 'sakura-blossom', name: 'Sakura Dream', primary: '#831843', accent: '#fbcfe8' },
  { id: 'obsidian-noir', name: 'Obsidian Noir', primary: '#18181b', accent: '#09090b' },
];

const STORAGE_KEY = 'eternal_profile_customizations_v2';

const SakuraKatanaGraphic: React.FC<{ isCardOverlay?: boolean; isThumbnail?: boolean }> = ({
  isCardOverlay = false,
  isThumbnail = false,
}) => {
  if (isThumbnail) {
    return (
      <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-[#1c121e] to-[#0a050d] flex items-center justify-center">
        <div className="absolute top-1.5 left-2 w-1.5 h-1.5 rounded-full bg-pink-300/80" />
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-rose-400/80" />
        <div className="w-14 h-14 relative rotate-[-28deg] translate-y-1">
          <svg
            viewBox="0 0 60 120"
            className="w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          >
            <defs>
              <linearGradient id="miniBladeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>
            </defs>
            <path
              d="M 30 8 Q 30.5 45 30.5 78 L 29 78 Q 29 45 29.5 8 Z"
              fill="url(#miniBladeGrad)"
            />
            <ellipse cx="29.8" cy="79" rx="5" ry="1.6" fill="#fbbf24" />
            <rect x="28.2" y="80" width="3.2" height="28" rx="1" fill="#1e293b" />
            <circle cx="34" cy="76" r="3" fill="#f472b6" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-20">
      {/* Drifting Sakura Petals */}
      <div
        className="absolute top-2 left-6 w-3 h-3 rounded-full bg-pink-300/90 shadow-[0_0_8px_rgba(244,114,182,0.9)]"
        style={{
          animation: 'sakuraFall1 3.5s ease-in-out infinite',
          clipPath: 'polygon(50% 0%, 100% 40%, 80% 100%, 20% 100%, 0% 40%)',
        }}
      />
      <div
        className="absolute top-4 right-8 w-3.5 h-4 rounded-full bg-rose-300/95 shadow-[0_0_10px_rgba(251,113,133,0.9)]"
        style={{
          animation: 'sakuraFall2 4.2s ease-in-out infinite 0.7s',
          clipPath: 'polygon(50% 0%, 100% 40%, 80% 100%, 20% 100%, 0% 40%)',
        }}
      />
      <div
        className="absolute top-10 left-1/4 w-2.5 h-3 rounded-full bg-pink-200/90 shadow-[0_0_8px_rgba(244,114,182,0.8)]"
        style={{
          animation: 'sakuraFall3 4.8s ease-in-out infinite 1.4s',
          clipPath: 'polygon(50% 0%, 100% 40%, 80% 100%, 20% 100%, 0% 40%)',
        }}
      />
      <div
        className="absolute bottom-20 right-6 w-3 h-3 rounded-full bg-pink-300/85"
        style={{
          animation: 'sakuraFall1 4s ease-in-out infinite 2s',
          clipPath: 'polygon(50% 0%, 100% 40%, 80% 100%, 20% 100%, 0% 40%)',
        }}
      />

      {/* Angled Sakura Katana*/}
      <div
        className={`absolute pointer-events-none drop-shadow-[0_8px_20px_rgba(0,0,0,0.85)] ${
          isCardOverlay
            ? 'right-2 bottom-4 w-[160px] h-[320px] rotate-[-28deg] origin-bottom-right'
            : 'right-1 bottom-2 w-[120px] h-[240px] rotate-[-28deg] origin-bottom-right'
        }`}
      >
        <svg
          viewBox="0 0 100 240"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="katanaBladeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="30%" stopColor="#ffffff" />
              <stop offset="65%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
            <linearGradient id="katanaEdgeGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#bae6fd" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="tsukaWrapGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="35%" stopColor="#312e81" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
          </defs>

          {/* Curved Japanese Katana Blade */}
          <path
            d="M 50 14 Q 53 100 52 172 L 48 172 Q 49 100 48 14 Z"
            fill="url(#katanaBladeGrad)"
          />
          {/* Blade Tip */}
          <path d="M 48 14 Q 50 6 52 14 Z" fill="#ffffff" />
          {/* Sharp Edge Line */}
          <path
            d="M 52 14 Q 53 100 52 172"
            stroke="url(#katanaEdgeGlow)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Golden Tsuba (Guard) */}
          <ellipse
            cx="50"
            cy="173"
            rx="10"
            ry="3.4"
            fill="#d97706"
            stroke="#b45309"
            strokeWidth="1"
          />
          <ellipse cx="50" cy="173" rx="7.8" ry="2.2" fill="#fbbf24" />

          {/* Tsuka (Handle / Grip) with diamond wraps */}
          <rect x="47.2" y="176" width="5.6" height="54" rx="2" fill="url(#tsukaWrapGrad)" />
          {/* Gold Wrap criss-crosses */}
          <line x1="47.2" y1="183" x2="52.8" y2="187" stroke="#fef08a" strokeWidth="1" />
          <line x1="52.8" y1="183" x2="47.2" y2="187" stroke="#fef08a" strokeWidth="1" />
          <line x1="47.2" y1="193" x2="52.8" y2="197" stroke="#fef08a" strokeWidth="1" />
          <line x1="52.8" y1="193" x2="47.2" y2="197" stroke="#fef08a" strokeWidth="1" />
          <line x1="47.2" y1="203" x2="52.8" y2="207" stroke="#fef08a" strokeWidth="1" />
          <line x1="52.8" y1="203" x2="47.2" y2="207" stroke="#fef08a" strokeWidth="1" />
          <line x1="47.2" y1="213" x2="52.8" y2="217" stroke="#fef08a" strokeWidth="1" />
          <line x1="52.8" y1="213" x2="47.2" y2="217" stroke="#fef08a" strokeWidth="1" />
          <line x1="47.2" y1="223" x2="52.8" y2="227" stroke="#fef08a" strokeWidth="1" />
          <line x1="52.8" y1="223" x2="47.2" y2="227" stroke="#fef08a" strokeWidth="1" />

          {/* Kashira (End cap) */}
          <rect x="46.5" y="230" width="7" height="3.5" rx="1.2" fill="#d97706" />

          {/* Sakura Blossoms clinging around guard & blade */}
          <g transform="translate(48, 145) scale(0.9)">
            <circle cx="0" cy="0" r="2.5" fill="#fde047" />
            <circle cx="-5" cy="-2" r="3.2" fill="#f472b6" opacity="0.9" />
            <circle cx="5" cy="-2" r="3.2" fill="#f472b6" opacity="0.9" />
            <circle cx="-3" cy="5" r="3.2" fill="#fb7185" opacity="0.9" />
            <circle cx="3" cy="5" r="3.2" fill="#fb7185" opacity="0.9" />
            <circle cx="0" cy="-6" r="3.2" fill="#f472b6" opacity="0.9" />
          </g>
          <g transform="translate(60, 172) scale(1)">
            <circle cx="0" cy="0" r="2.5" fill="#fde047" />
            <circle cx="-5" cy="-2" r="3.5" fill="#f472b6" opacity="0.95" />
            <circle cx="5" cy="-2" r="3.5" fill="#f472b6" opacity="0.95" />
            <circle cx="-3" cy="5" r="3.5" fill="#fb7185" opacity="0.95" />
            <circle cx="3" cy="5" r="3.5" fill="#fb7185" opacity="0.95" />
            <circle cx="0" cy="-6" r="3.5" fill="#f472b6" opacity="0.95" />
          </g>
          <g transform="translate(38, 195) scale(0.85)">
            <circle cx="0" cy="0" r="2" fill="#fde047" />
            <circle cx="-4" cy="-2" r="2.8" fill="#f472b6" opacity="0.9" />
            <circle cx="4" cy="-2" r="2.8" fill="#f472b6" opacity="0.9" />
            <circle cx="-2" cy="4" r="2.8" fill="#fb7185" opacity="0.9" />
            <circle cx="2" cy="4" r="2.8" fill="#fb7185" opacity="0.9" />
            <circle cx="0" cy="-5" r="2.8" fill="#f472b6" opacity="0.9" />
          </g>
          <g transform="translate(56, 30) scale(0.7)">
            <circle cx="0" cy="0" r="2" fill="#fde047" />
            <circle cx="-4" cy="-2" r="2.8" fill="#fbcfe8" opacity="0.9" />
            <circle cx="4" cy="-2" r="2.8" fill="#fbcfe8" opacity="0.9" />
            <circle cx="-2" cy="4" r="2.8" fill="#f472b6" opacity="0.9" />
            <circle cx="2" cy="4" r="2.8" fill="#f472b6" opacity="0.9" />
            <circle cx="0" cy="-5" r="2.8" fill="#fbcfe8" opacity="0.9" />
          </g>
        </svg>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Component: Profile Effect Visual Renderer
// -------------------------------------------------------------
const ProfileEffectVisual: React.FC<{
  effectKey: string;
  isCardOverlay?: boolean;
  isThumbnail?: boolean;
}> = ({ effectKey, isCardOverlay = false, isThumbnail = false }) => {
  if (effectKey === 'katana-sakura') {
    return <SakuraKatanaGraphic isCardOverlay={isCardOverlay} isThumbnail={isThumbnail} />;
  }

  if (isThumbnail) {
    if (effectKey === 'cyber-glitch') {
      return (
        <div className="w-full h-full bg-gradient-to-b from-[#061e2b] to-[#040e16] flex items-center justify-center relative overflow-hidden">
          <div className="w-full h-0.5 bg-cyan-400/80 shadow-[0_0_8px_#22d3ee] animate-pulse" />
          <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:8px_8px] opacity-30" />
        </div>
      );
    }
    if (effectKey === 'cosmic-starfall') {
      return (
        <div className="w-full h-full bg-gradient-to-b from-[#1b0c36] to-[#0b0417] flex items-center justify-center relative overflow-hidden">
          <Star size={16} className="text-purple-300 animate-spin" />
          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-300" />
          <div className="absolute bottom-2 left-2 w-1 h-1 rounded-full bg-white" />
        </div>
      );
    }
    if (effectKey === 'dragon-embers') {
      return (
        <div className="w-full h-full bg-gradient-to-b from-[#2b0808] to-[#120303] flex items-center justify-center relative overflow-hidden">
          <Flame size={18} className="text-rose-400 animate-bounce" />
          <div className="absolute bottom-1 w-2 h-2 rounded-full bg-amber-400/80" />
        </div>
      );
    }
    if (effectKey === 'witch-magic') {
      return (
        <div className="w-full h-full bg-gradient-to-b from-[#1c0828] to-[#0d0314] flex items-center justify-center relative overflow-hidden">
          <Sparkles size={18} className="text-emerald-400 animate-pulse" />
          <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
        </div>
      );
    }
    if (effectKey === 'autumn-swan') {
      return (
        <div className="w-full h-full bg-gradient-to-b from-[#2d1b0a] to-[#140b03] flex items-center justify-center relative overflow-hidden">
          <div className="w-6 h-6 rounded-full border border-amber-400/40 flex items-center justify-center">
            <span className="text-xs">🍂</span>
          </div>
        </div>
      );
    }
    if (effectKey === 'water-bubbles') {
      return (
        <div className="w-full h-full bg-gradient-to-b from-[#08202e] to-[#040e14] flex items-center justify-center relative overflow-hidden">
          <div className="w-5 h-5 rounded-full border border-sky-300/60 bg-sky-400/20 shadow-[0_0_8px_rgba(56,189,248,0.4)]" />
          <div className="w-2.5 h-2.5 rounded-full border border-pink-300/60 bg-pink-400/20 absolute top-2 right-2" />
        </div>
      );
    }
    if (effectKey === 'mermaid-tide') {
      return (
        <div className="w-full h-full bg-gradient-to-b from-[#0c242c] to-[#061317] flex items-center justify-center relative overflow-hidden">
          <span className="text-sm">🧜‍♀️</span>
        </div>
      );
    }
    if (effectKey === 'sunflower-bloom') {
      return (
        <div className="w-full h-full bg-gradient-to-b from-[#2a1b05] to-[#120b02] flex items-center justify-center relative overflow-hidden">
          <span className="text-sm">🌻</span>
        </div>
      );
    }
    return (
      <div className="w-full h-full bg-black/40 flex items-center justify-center">
        <Sparkles size={16} className="text-indigo-400" />
      </div>
    );
  }

  // Live Card Overlay
  if (effectKey === 'cyber-glitch') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-20">
        <div
          className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent shadow-[0_0_12px_#22d3ee]"
          style={{ animation: 'cyberScanline 2.6s linear infinite' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:12px_12px] opacity-20 pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-cyan-500/10 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-cyan-500/15 to-transparent" />
      </div>
    );
  }

  if (effectKey === 'cosmic-starfall') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-20">
        <div className="absolute inset-0 bg-radial-gradient from-purple-900/20 via-indigo-950/15 to-transparent" />
        <div
          className="absolute top-6 left-12 w-2 h-2 rounded-full bg-purple-300 shadow-[0_0_8px_#c084fc]"
          style={{ animation: 'cosmicTwinkle 2.2s ease-in-out infinite' }}
        />
        <div
          className="absolute top-16 right-10 w-2.5 h-2.5 rounded-full bg-blue-300 shadow-[0_0_10px_#93c5fd]"
          style={{ animation: 'cosmicTwinkle 2.8s ease-in-out infinite 0.7s' }}
        />
        <div
          className="absolute bottom-20 left-10 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff]"
          style={{ animation: 'cosmicTwinkle 1.8s ease-in-out infinite 1.2s' }}
        />
        <div
          className="absolute w-28 h-0.5 bg-gradient-to-r from-transparent via-purple-300 to-transparent rotate-[-35deg]"
          style={{ animation: 'meteorFall 3.6s ease-in-out infinite' }}
        />
      </div>
    );
  }

  if (effectKey === 'dragon-embers') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-20">
        <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-rose-600/25 via-amber-600/10 to-transparent" />
        <div
          className="absolute bottom-4 left-8 w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_#fb7185]"
          style={{ animation: 'emberRiseAnim 2.8s ease-in infinite' }}
        />
        <div
          className="absolute bottom-2 right-12 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]"
          style={{ animation: 'emberRiseAnim 3.4s ease-in infinite 0.8s' }}
        />
        <div
          className="absolute bottom-6 left-1/2 w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_6px_#fb923c]"
          style={{ animation: 'emberRiseAnim 2.5s ease-in infinite 1.5s' }}
        />
      </div>
    );
  }

  if (effectKey === 'witch-magic') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-20">
        <div className="absolute inset-0 bg-radial-gradient from-fuchsia-900/15 via-emerald-900/10 to-transparent" />
        <div
          className="absolute top-10 right-8 w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]"
          style={{ animation: 'cosmicTwinkle 2s ease-in-out infinite' }}
        />
        <div
          className="absolute bottom-16 left-8 w-3 h-3 rounded-full bg-fuchsia-400 shadow-[0_0_10px_#e879f9]"
          style={{ animation: 'cosmicTwinkle 2.5s ease-in-out infinite 0.8s' }}
        />
      </div>
    );
  }

  if (effectKey === 'autumn-swan') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-20">
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-amber-900/30 to-transparent" />
        <div
          className="absolute top-6 right-8 text-sm select-none"
          style={{ animation: 'leafDrift 3.8s ease-in-out infinite' }}
        >
          🍂
        </div>
        <div
          className="absolute top-14 left-10 text-xs select-none"
          style={{ animation: 'leafDrift 4.4s ease-in-out infinite 1.2s' }}
        >
          🍁
        </div>
      </div>
    );
  }

  if (effectKey === 'water-bubbles') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-20">
        <div
          className="absolute bottom-4 left-10 w-5 h-5 rounded-full border border-sky-300/70 bg-sky-400/20 backdrop-blur-[1px] shadow-[0_0_8px_rgba(56,189,248,0.5)]"
          style={{ animation: 'bubbleFloatAnim 3.2s ease-in-out infinite' }}
        />
        <div
          className="absolute bottom-8 right-12 w-6 h-6 rounded-full border border-pink-300/70 bg-pink-400/20 backdrop-blur-[1px] shadow-[0_0_8px_rgba(244,114,182,0.5)]"
          style={{ animation: 'bubbleFloatAnim 4s ease-in-out infinite 0.9s' }}
        />
        <div
          className="absolute bottom-2 left-1/2 w-4 h-4 rounded-full border border-purple-300/70 bg-purple-400/20 backdrop-blur-[1px]"
          style={{ animation: 'bubbleFloatAnim 3.6s ease-in-out infinite 1.8s' }}
        />
      </div>
    );
  }

  if (effectKey === 'mermaid-tide') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-20">
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-teal-500/20 via-cyan-500/10 to-transparent" />
        <div
          className="absolute bottom-6 left-1/3 w-3 h-3 rounded-full bg-teal-300/80 shadow-[0_0_8px_#5eead4]"
          style={{ animation: 'bubbleFloatAnim 3.4s ease-in-out infinite' }}
        />
      </div>
    );
  }

  if (effectKey === 'sunflower-bloom') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-20">
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-600/15 via-transparent to-yellow-500/10" />
        <div
          className="absolute top-8 left-8 text-sm select-none"
          style={{ animation: 'leafDrift 4s ease-in-out infinite' }}
        >
          🌻
        </div>
      </div>
    );
  }

  return null;
};

// -------------------------------------------------------------
// Component: Profile Frame Decorative Embellishment
// -------------------------------------------------------------
const ProfileFrameVisual: React.FC<{
  frameType?: string;
  isThumbnail?: boolean;
}> = ({ frameType, isThumbnail = false }) => {
  if (!frameType || frameType === 'none') return null;

  if (isThumbnail) {
    return (
      <div className="w-12 h-14 bg-[#111214] rounded-lg relative overflow-hidden flex flex-col items-center justify-between p-1.5 shadow-inner">
        <div className="w-5 h-5 rounded-full bg-white/20 mt-1" />
        <div className="w-8 h-1 bg-white/15 rounded-full mb-1" />
      </div>
    );
  }

  if (frameType === 'sakura') {
    return (
      <div className="absolute inset-0 pointer-events-none select-none z-30">
        <div className="absolute -top-2 -left-2 flex items-center gap-0.5">
          <span className="text-base drop-shadow-md">🌸</span>
        </div>
        <div className="absolute -bottom-2 -right-2 flex items-center gap-0.5">
          <span className="text-base drop-shadow-md">🌸</span>
        </div>
      </div>
    );
  }

  if (frameType === 'cyber') {
    return (
      <div className="absolute inset-0 pointer-events-none select-none z-30">
        <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-400 drop-shadow-[0_0_6px_#22d3ee]" />
        <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-cyan-400 drop-shadow-[0_0_6px_#22d3ee]" />
        <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-cyan-400 drop-shadow-[0_0_6px_#22d3ee]" />
        <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-cyan-400 drop-shadow-[0_0_6px_#22d3ee]" />
      </div>
    );
  }

  if (frameType === 'fire') {
    return (
      <div className="absolute inset-0 pointer-events-none select-none z-30">
        <div className="absolute -top-3.5 inset-x-0 flex justify-center gap-2">
          <span className="text-sm drop-shadow-lg">🔥</span>
        </div>
      </div>
    );
  }

  if (frameType === 'gold') {
    return (
      <div className="absolute inset-0 pointer-events-none select-none z-30">
        <div className="absolute -top-2 inset-x-0 flex justify-center">
          <span className="text-xs drop-shadow-lg text-amber-300 font-bold">⚜️</span>
        </div>
      </div>
    );
  }

  if (frameType === 'frost') {
    return (
      <div className="absolute inset-0 pointer-events-none select-none z-30">
        <div className="absolute -top-2 -left-2 text-sm">❄️</div>
        <div className="absolute -top-2 -right-2 text-sm">❄️</div>
      </div>
    );
  }

  if (frameType === 'sunflower') {
    return (
      <div className="absolute inset-0 pointer-events-none select-none z-30">
        <div className="absolute -top-2 -left-2 text-sm">🌻</div>
        <div className="absolute -bottom-2 -right-2 text-sm">🌻</div>
      </div>
    );
  }

  if (frameType === 'nebula') {
    return (
      <div className="absolute inset-0 pointer-events-none select-none z-30">
        <div className="absolute -top-2 -right-2 text-sm">✨</div>
        <div className="absolute -bottom-2 -left-2 text-sm">✨</div>
      </div>
    );
  }

  return null;
};

// Component: Mini Profile Silhouette Card
const MiniProfileSilhouette: React.FC = () => {
  return (
    <div className="w-[82px] h-[114px] bg-[#111214] rounded-xl border border-white/5 relative overflow-hidden flex flex-col justify-between p-2 select-none shadow-inner">
      <div className="w-full h-8 bg-white/[0.04] rounded-t-lg -mx-2 -mt-2 mb-1" />
      <div className="relative -mt-5 mb-1">
        <div className="w-6 h-6 rounded-full bg-[#2b2d31] border-2 border-[#111214] flex items-center justify-center">
          <div className="w-3.5 h-3.5 rounded-full bg-white/20" />
        </div>
      </div>
      <div className="space-y-1 w-full mt-auto">
        <div className="w-3/4 h-1.5 bg-white/20 rounded-full" />
        <div className="w-1/2 h-1 bg-white/10 rounded-full" />
        <div className="w-5/6 h-1 bg-white/10 rounded-full" />
      </div>
    </div>
  );
};

// Color Picker Popover (Saturation/Value + Hue Slider + Hex)
const DEFAULT_PRESET_SWATCHES = ['#1e1f22', '#111214', '#2b2d31', '#5865F2', '#57F287', '#EB459E'];

interface DiscordHsvColorPickerProps {
  color: string;
  onChange: (hex: string) => void;
  onClose?: () => void;
  className?: string;
  presetSwatches?: string[];
}

export const DiscordHsvColorPicker: React.FC<DiscordHsvColorPickerProps> = ({
  color,
  onChange,
  onClose,
  className,
  presetSwatches = DEFAULT_PRESET_SWATCHES,
}) => {
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const [hexInput, setHexInput] = useState(() => color.replace('#', '').toLowerCase());
  const satValRef = useRef<HTMLDivElement>(null);
  const isDraggingSatVal = useRef(false);
  const hueSliderRef = useRef<HTMLDivElement>(null);
  const isDraggingHue = useRef(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setHsv(hexToHsv(color));
    setHexInput(color.replace('#', '').toLowerCase());
  }, [color]);

  // Click outside & Escape handling
  useEffect(() => {
    if (!onClose) return;
    const handleDocumentClick = (e: MouseEvent) => {
      if (isDraggingSatVal.current || isDraggingHue.current) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (pickerRef.current && pickerRef.current.contains(target)) return;
      if (target.closest?.('[data-color-picker-toggle]')) return;
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleDocumentClick);
    }, 50);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleDocumentClick);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose]);

  const updateSatValFromEvent = (e: MouseEvent | React.MouseEvent) => {
    if (!satValRef.current) return;
    const rect = satValRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const s = Math.round((x / rect.width) * 100);
    const v = Math.round((1 - y / rect.height) * 100);
    const currentH = hsvRef.current.h;
    const newHsv = { h: currentH, s, v };
    setHsv(newHsv);
    const newHex = hsvToHex(currentH, s, v);
    setHexInput(newHex.replace('#', '').toLowerCase());
    onChangeRef.current(newHex);
  };

  const updateHueFromEvent = (e: MouseEvent | React.MouseEvent) => {
    if (!hueSliderRef.current) return;
    const rect = hueSliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const h = Math.round((x / rect.width) * 360);
    const { s, v } = hsvRef.current;
    const newHsv = { h, s, v };
    setHsv(newHsv);
    const newHex = hsvToHex(h, s, v);
    setHexInput(newHex.replace('#', '').toLowerCase());
    onChangeRef.current(newHex);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSatVal.current) {
        updateSatValFromEvent(e);
      } else if (isDraggingHue.current) {
        updateHueFromEvent(e);
      }
    };
    const handleMouseUp = () => {
      isDraggingSatVal.current = false;
      isDraggingHue.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleEyedropper = async () => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          const pickedHex = result.sRGBHex.toLowerCase();
          setHexInput(pickedHex.replace('#', ''));
          setHsv(hexToHsv(pickedHex));
          onChangeRef.current(pickedHex);
        }
      } catch {
        // User cancelled eyedropper
      }
    } else {
      alert(
        'Инструмент "Пипетка" поддерживается в Google Chrome, Microsoft Edge, Opera и Яндекс.Браузере.',
      );
    }
  };

  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);
  const pureHueHex = hsvToHex(hsv.h, 100, 100);

  return (
    <div
      ref={pickerRef}
      role="dialog"
      aria-modal="true"
      data-modal-open="true"
      data-submodal-open="true"
      className={`w-full max-w-[310px] mx-auto bg-[#111214] border border-white/10 rounded-2xl p-3 shadow-2xl shadow-black/80 flex flex-col gap-3 select-none backdrop-blur-2xl ${className || ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-1 border-b border-white/10 text-xs font-bold text-gray-300">
        <span className="flex items-center gap-1.5 text-purple-300">
          <Pipette size={13} />
          Custom Color
        </span>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-md border border-white/20 shadow-xs"
            style={{ backgroundColor: currentHex }}
            title={`Текущий цвет: ${currentHex}`}
          />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-0.5 rounded transition cursor-pointer"
              title="Закрыть выбор цвета"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      {/* 2D Saturation / Value Gradient Canvas (Black layer on top ensures 0% brightness is true black, not white!) */}
      <div
        ref={satValRef}
        onMouseDown={(e) => {
          isDraggingSatVal.current = true;
          updateSatValFromEvent(e);
        }}
        className="w-full h-[140px] rounded-xl relative cursor-crosshair overflow-hidden select-none border border-white/10 shadow-inner"
        style={{
          backgroundColor: pureHueHex,
          backgroundImage:
            'linear-gradient(to top, #000000, transparent), linear-gradient(to right, #ffffff, transparent)',
        }}
      >
        {/* Reticle with current color fill */}
        <div
          className="w-4 h-4 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.7),0_2px_4px_rgba(0,0,0,0.8)] absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-none"
          style={{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
            backgroundColor: currentHex,
          }}
        />
      </div>

      {/* Rainbow Hue Slider */}
      <div
        ref={hueSliderRef}
        onMouseDown={(e) => {
          isDraggingHue.current = true;
          updateHueFromEvent(e);
        }}
        className="w-full h-3 rounded-full relative cursor-pointer select-none border border-white/10"
        style={{
          background:
            'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
        }}
      >
        <div
          className="w-3.5 h-5 bg-white rounded-md shadow-md border border-black/30 absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none"
          style={{ left: `${Math.max(0, Math.min(100, (hsv.h / 360) * 100))}%` }}
        />
      </div>

      {/* Hex Input Box with Active Color Swatch & Eyedropper */}
      <div className="flex items-center gap-2 bg-[#0a0b0d] border border-[#5865F2] rounded-xl px-3 py-2 shadow-inner focus-within:ring-1 focus-within:ring-[#5865F2]">
        <div
          className="w-5 h-5 rounded-md border border-white/20 shadow-xs shrink-0"
          style={{ backgroundColor: currentHex }}
          title={`Текущий цвет: ${currentHex}`}
        />
        <span className="text-gray-400 font-bold text-sm select-none">#</span>
        <input
          type="text"
          value={hexInput}
          maxLength={6}
          onChange={(e) => {
            const cleanVal = e.target.value.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
            setHexInput(cleanVal);
            if (cleanVal.length === 6) {
              const fullHex = `#${cleanVal}`;
              setHsv(hexToHsv(fullHex));
              onChangeRef.current(fullHex);
            } else if (cleanVal.length === 3) {
              const expanded = cleanVal
                .split('')
                .map((c) => c + c)
                .join('');
              const fullHex = `#${expanded}`;
              setHsv(hexToHsv(fullHex));
              onChangeRef.current(fullHex);
            }
          }}
          onBlur={() => {
            if (hexInput.length === 6) {
              const fullHex = `#${hexInput}`;
              setHsv(hexToHsv(fullHex));
              onChangeRef.current(fullHex);
            } else if (hexInput.length === 3) {
              const expanded = hexInput
                .split('')
                .map((c) => c + c)
                .join('');
              const fullHex = `#${expanded}`;
              setHexInput(expanded);
              setHsv(hexToHsv(fullHex));
              onChangeRef.current(fullHex);
            } else {
              setHexInput(color.replace('#', '').toLowerCase());
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="w-full bg-transparent text-white font-mono text-sm outline-none tracking-wider lowercase"
          placeholder="1e1f22"
        />
        <button
          type="button"
          onClick={handleEyedropper}
          className="text-gray-400 hover:text-white transition cursor-pointer p-0.5 shrink-0"
          title="Пипетка (выбрать цвет с экрана)"
        >
          <Pipette size={16} />
        </button>
      </div>

      {/* Preset Color Swatches Row */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5">
        {presetSwatches.map((swatchHex) => {
          const isSelected = currentHex.toLowerCase() === swatchHex.toLowerCase();
          return (
            <button
              key={swatchHex}
              type="button"
              onClick={() => {
                const clean = swatchHex.replace('#', '').toLowerCase();
                setHexInput(clean);
                setHsv(hexToHsv(swatchHex));
                onChangeRef.current(swatchHex);
              }}
              className={`w-9 h-9 rounded-xl border transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95 ${
                isSelected
                  ? 'border-white ring-2 ring-white/80 scale-105 shadow-[0_0_12px_rgba(255,255,255,0.5)]'
                  : 'border-white/10 hover:border-white/40'
              }`}
              style={{ backgroundColor: swatchHex }}
              title={swatchHex}
            />
          );
        })}
      </div>
    </div>
  );
};

// Main Component: ProfileCustomizeSettingsSection
export const ProfileCustomizeSettingsSection: React.FC = () => {
  const navigate = useNavigate();
  const closeEditProfile = useUIStore((s) => s.closeEditProfile);
  const { data: currentUser } = useCurrentUser();
  const { catalog, inventory, equip } = useDecorations();
  const queryClient = useQueryClient();
  const accentColor = useThemeStore((s) => s.accentColor) || '#5865F2';

  // Centralized Shop navigation: closes modal, closes edit profile modal, navigates to /shop
  const handleGoToShop = (category?: string | React.MouseEvent) => {
    setActivePickerModal(null);
    closeEditProfile();
    const cat = typeof category === 'string' ? category : undefined;
    navigate(cat ? `/shop?category=${cat}` : '/shop');
  };

  // Active decoration resolution: matches RailwaySidebar and ProfileHeader exactly!
  const ownedItems = inventory.data?.items || [];
  const ownedMap = useMemo(
    () =>
      new Map<string, AvatarDecorationDto>(
        ownedItems.map((item) => [item.decoration.id, item.decoration]),
      ),
    [ownedItems],
  );

  const activeDecorationId = inventory.isSuccess
    ? (inventory.data?.activeDecorationId ?? null)
    : currentUser?.activeDecoration?.id || currentUser?.activeDecorationId || null;

  const currentEquippedDecoration: AvatarDecorationDto | null = useMemo(() => {
    if (!activeDecorationId) return null;
    return (
      ownedMap.get(activeDecorationId) ||
      (currentUser?.activeDecoration?.id === activeDecorationId
        ? currentUser.activeDecoration
        : null) ||
      catalog.data?.find((d) => d.id === activeDecorationId) ||
      null
    );
  }, [activeDecorationId, ownedMap, currentUser?.activeDecoration, catalog.data]);

  // Shop items that user doesn't own yet
  const shopItems = useMemo(
    () => (catalog.data || []).filter((item) => !ownedMap.has(item.id)),
    [catalog.data, ownedMap],
  );

  // Preview decoration for Change Avatar Decoration modal
  const [previewDecoration, setPreviewDecoration] = useState<AvatarDecorationDto | null>(
    currentEquippedDecoration,
  );

  // Sync preview decoration when active decoration changes
  useEffect(() => {
    setPreviewDecoration(currentEquippedDecoration);
  }, [currentEquippedDecoration]);

  // Real Nameplates integration matching Avatar Decorations
  const {
    catalog: nameplateCatalog,
    inventory: nameplateInventory,
    equip: nameplateEquip,
  } = useNameplates();

  const ownedNameplateItems = nameplateInventory.data?.items || [];
  const ownedNameplateMap = useMemo(
    () =>
      new Map<string, NameplateDto>(
        ownedNameplateItems.map((item) => [item.nameplate.id, item.nameplate]),
      ),
    [ownedNameplateItems],
  );

  const activeNameplateId = nameplateInventory.isSuccess
    ? (nameplateInventory.data?.activeNameplateId ?? null)
    : currentUser?.activeNameplate?.id || currentUser?.activeNameplateId || null;

  const currentEquippedNameplate: NameplateDto | null = useMemo(() => {
    if (!activeNameplateId) return null;
    return (
      ownedNameplateMap.get(activeNameplateId) ||
      (currentUser?.activeNameplate?.id === activeNameplateId
        ? currentUser.activeNameplate
        : null) ||
      nameplateCatalog.data?.find((n) => n.id === activeNameplateId) ||
      null
    );
  }, [activeNameplateId, ownedNameplateMap, currentUser?.activeNameplate, nameplateCatalog.data]);

  const shopNameplates = useMemo(
    () => (nameplateCatalog.data || []).filter((item) => !ownedNameplateMap.has(item.id)),
    [nameplateCatalog.data, ownedNameplateMap],
  );

  const [previewNameplate, setPreviewNameplate] = useState<NameplateDto | null>(
    currentEquippedNameplate,
  );

  useEffect(() => {
    setPreviewNameplate(currentEquippedNameplate);
  }, [currentEquippedNameplate]);

  const [selectedProfileEffect, setSelectedProfileEffect] = useState<ProfileEffectPreset | null>(
    () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.effect) {
            const found = PROFILE_EFFECT_PRESETS.find((p) => p.id === parsed.effect.id);
            return found || parsed.effect;
          }
        }
      } catch {
        // ignore
      }
      return null;
    },
  );

  const [selectedProfileFrame, setSelectedProfileFrame] = useState<ProfileFramePreset | null>(
    () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.frame) {
            const found = PROFILE_FRAME_PRESETS.find((p) => p.id === parsed.frame.id);
            return found || parsed.frame;
          }
        }
      } catch {
        // ignore
      }
      return null;
    },
  );

  const [nameStyle, setNameStyle] = useState<NameStyleConfig | null>(() => {
    const active = useActiveDecorationStore.getState().activeNameStyle;
    if (active) return active as any;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.nameStyle !== undefined) return parsed.nameStyle;
      }
    } catch {
      // ignore
    }
    return (currentUser?.displayNameStyle as any) || null;
  });

  useEffect(() => {
    if (currentUser?.displayNameStyle !== undefined) {
      setNameStyle((currentUser.displayNameStyle as any) || null);
      useActiveDecorationStore.getState().setActiveNameStyle(currentUser.displayNameStyle as any);
    }
  }, [currentUser?.displayNameStyle]);

  // Default theme background: check currentUser.profileTheme, then localStorage, then default dark
  const [themePrimary, setThemePrimary] = useState<string>(() => {
    if (currentUser?.profileTheme?.primary) return currentUser.profileTheme.primary;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.themePrimary) return parsed.themePrimary;
      }
    } catch {
      // ignore
    }
    return '#1e1f22';
  });

  const [themeAccent, setThemeAccent] = useState<string>(() => {
    if (currentUser?.profileTheme?.accent) return currentUser.profileTheme.accent;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.themeAccent) return parsed.themeAccent;
      }
    } catch {
      // ignore
    }
    return '#111214';
  });

  useEffect(() => {
    if (currentUser?.profileTheme?.primary) {
      setThemePrimary(currentUser.profileTheme.primary);
    }
    if (currentUser?.profileTheme?.accent) {
      setThemeAccent(currentUser.profileTheme.accent);
    }
  }, [currentUser?.profileTheme?.primary, currentUser?.profileTheme?.accent]);

  // Modal / Picker States
  const [activePickerModal, setActivePickerModal] = useState<
    'nameplate' | 'decoration' | 'effect' | 'frame' | 'nameStyle' | null
  >(null);

  // Profile Theme Popover State: 'primary' (top 50% / top button) or 'accent' (bottom 50% / bottom button)
  const [activeThemeColorPicker, setActiveThemeColorPicker] = useState<'primary' | 'accent' | null>(
    null,
  );
  const themeBlockRef = useRef<HTMLDivElement>(null);

  // Close theme color picker if clicked outside the theme block
  useEffect(() => {
    if (!activeThemeColorPicker) return;
    const handleOutsideThemeClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (themeBlockRef.current && !themeBlockRef.current.contains(target)) {
        setActiveThemeColorPicker(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideThemeClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideThemeClick);
    };
  }, [activeThemeColorPicker]);

  // Handle Escape key specifically for theme color picker popover
  useEffect(() => {
    if (!activeThemeColorPicker) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setActiveThemeColorPicker(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [activeThemeColorPicker]);

  // Preview states for Selection Modals
  const [previewProfileEffect, setPreviewProfileEffect] = useState<ProfileEffectPreset | null>(
    selectedProfileEffect,
  );
  const [previewProfileFrame, setPreviewProfileFrame] = useState<ProfileFramePreset | null>(
    selectedProfileFrame,
  );

  // Sync modal preview states when modals open or active values change
  useEffect(() => {
    if (activePickerModal === 'nameplate') {
      setPreviewNameplate(currentEquippedNameplate);
    }
  }, [activePickerModal, currentEquippedNameplate]);

  useEffect(() => {
    if (activePickerModal === 'effect') {
      setPreviewProfileEffect(selectedProfileEffect);
    }
  }, [activePickerModal, selectedProfileEffect]);

  useEffect(() => {
    if (activePickerModal === 'frame') {
      setPreviewProfileFrame(selectedProfileFrame);
    }
  }, [activePickerModal, selectedProfileFrame]);

  // Draft states for Change Display Name Style Modal
  const [draftNameFont, setDraftNameFont] = useState<string>(() => nameStyle?.fontId || 'bubble');
  const [draftNameFontFamily, setDraftNameFontFamily] = useState<string>(
    () => nameStyle?.fontFamily || "'Rubik Bubbles', cursive",
  );
  const [draftNameFontName, setDraftNameFontName] = useState<string>(
    () => nameStyle?.fontName || 'Bubbles',
  );
  const [draftNameEffect, setDraftNameEffect] = useState<
    'minimal' | 'gradient' | 'neon' | 'cartoon' | 'highlight' | 'gummy' | 'prism'
  >(() => (nameStyle?.effect as any) || 'minimal');
  const [draftNameColor, setDraftNameColor] = useState<string>(() => nameStyle?.color || '#10b981');
  const [draftGummyPalette, setDraftGummyPalette] = useState<string[]>(
    () => nameStyle?.gummyColors || ['#c084fc', '#67e8f9', '#f472b6', '#4ade80'],
  );
  const [draftPrismGradient, setDraftPrismGradient] = useState<string>(
    () => nameStyle?.gradient || DISCORD_PRISM_GRADIENTS[0].gradient,
  );
  const [draftGradientPreset, setDraftGradientPreset] = useState<string>(
    () => nameStyle?.gradient || DISCORD_GRADIENT_PRESETS[0].gradient,
  );
  const [draftPreviewMode, setDraftPreviewMode] = useState<'dark' | 'light'>('dark');
  const [showColorPickerPopover, setShowColorPickerPopover] = useState(false);
  const [showGummyCustomSlider, setShowGummyCustomSlider] = useState(false);
  const [gummySliderRatio, setGummySliderRatio] = useState(0.85);
  const [hoveredFontTooltip, setHoveredFontTooltip] = useState<string | null>(null);

  useEffect(() => {
    if (activePickerModal === 'nameStyle') {
      preloadTextTabFonts();
      if (nameStyle) {
        setDraftNameFont(nameStyle.fontId || 'bubble');
        setDraftNameFontFamily(nameStyle.fontFamily);
        setDraftNameFontName(nameStyle.fontName);
        setDraftNameEffect((nameStyle.effect as any) || 'minimal');
        setDraftNameColor(nameStyle.color || '#10b981');
        setDraftGummyPalette(
          nameStyle.gummyColors && nameStyle.gummyColors.length === 4
            ? nameStyle.gummyColors
            : ['#c084fc', '#67e8f9', '#f472b6', '#4ade80'],
        );
        setDraftPrismGradient(nameStyle.gradient || DISCORD_PRISM_GRADIENTS[0].gradient);
        setDraftGradientPreset(nameStyle.gradient || DISCORD_GRADIENT_PRESETS[0].gradient);
      } else {
        setDraftNameFont('bubble');
        setDraftNameFontFamily("'Rubik Bubbles', cursive");
        setDraftNameFontName('Bubbles');
        setDraftNameEffect('minimal');
        setDraftNameColor('#10b981');
        setDraftGummyPalette(['#c084fc', '#67e8f9', '#f472b6', '#4ade80']);
        setDraftPrismGradient(DISCORD_PRISM_GRADIENTS[0].gradient);
        setDraftGradientPreset(DISCORD_GRADIENT_PRESETS[0].gradient);
      }
      setShowColorPickerPopover(false);
      setShowGummyCustomSlider(false);
      setGummySliderRatio(0.85);
    }
  }, [activePickerModal, nameStyle]);

  // Handle Escape key for all active picker submodals (nameplate, decoration, effect, frame, nameStyle)
  useEffect(() => {
    if (!activePickerModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // If a nested popover (like color picker in nameStyle) is open, let that close first
        if (showColorPickerPopover) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (activePickerModal === 'nameplate') {
          setPreviewNameplate(currentEquippedNameplate);
        } else if (activePickerModal === 'decoration') {
          setPreviewDecoration(currentEquippedDecoration);
        } else if (activePickerModal === 'effect') {
          setPreviewProfileEffect(selectedProfileEffect);
        } else if (activePickerModal === 'frame') {
          setPreviewProfileFrame(selectedProfileFrame);
        } else if (activePickerModal === 'nameStyle') {
          setShowColorPickerPopover(false);
        }
        setActivePickerModal(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    activePickerModal,
    showColorPickerPopover,
    currentEquippedNameplate,
    currentEquippedDecoration,
    selectedProfileEffect,
    selectedProfileFrame,
  ]);

  const handleGummySliderPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setGummySliderRatio(ratio);

    // 4 smart pastel harmonic tones calculated continuously from slider ratio
    const baseHue = Math.round(ratio * 360);
    const c1 = hslToHex(baseHue, 82, 72);
    const c2 = hslToHex((baseHue + 40) % 360, 86, 74);
    const c3 = hslToHex((baseHue + 85) % 360, 80, 72);
    const c4 = hslToHex((baseHue + 130) % 360, 88, 75);
    setDraftGummyPalette([c1, c2, c3, c4]);
  };

  const liveDraftNameStyle: NameStyleConfig = useMemo(
    () => ({
      fontId: draftNameFont,
      fontFamily: draftNameFontFamily,
      fontName: draftNameFontName,
      effect: draftNameEffect,
      color: draftNameColor,
      gummyColors: draftGummyPalette,
      gradient:
        draftNameEffect === 'prism'
          ? draftPrismGradient
          : draftNameEffect === 'gradient'
            ? draftGradientPreset
            : undefined,
      glow: draftNameEffect === 'neon' ? `0 0 10px ${draftNameColor}` : undefined,
    }),
    [
      draftNameFont,
      draftNameFontFamily,
      draftNameFontName,
      draftNameEffect,
      draftNameColor,
      draftGummyPalette,
      draftPrismGradient,
      draftGradientPreset,
    ],
  );

  const handleSurpriseMe = () => {
    const randomFont = CHAT_FONTS[Math.floor(Math.random() * CHAT_FONTS.length)];
    const effectKeys: (
      'minimal' | 'gradient' | 'neon' | 'cartoon' | 'highlight' | 'gummy' | 'prism'
    )[] = ['minimal', 'gradient', 'neon', 'cartoon', 'highlight', 'gummy', 'prism'];
    const randomEffect = effectKeys[Math.floor(Math.random() * effectKeys.length)];
    const surpriseColors = [
      '#10b981',
      '#38bdf8',
      '#a855f7',
      '#ec4899',
      '#ef4444',
      '#eab308',
      '#ffffff',
      '#06b6d4',
      '#f97316',
    ];
    const randomColor = surpriseColors[Math.floor(Math.random() * surpriseColors.length)];

    if (randomFont.googleFontName) {
      loadThemeFont(randomFont.fontFamily, randomFont.googleFontName);
    }

    setDraftNameFont(randomFont.id);
    setDraftNameFontFamily(randomFont.fontFamily);
    setDraftNameFontName(randomFont.name);
    setDraftNameEffect(randomEffect);
    setDraftNameColor(randomColor);

    if (randomEffect === 'gummy') {
      const randPal =
        DISCORD_GUMMY_PALETTES[Math.floor(Math.random() * DISCORD_GUMMY_PALETTES.length)];
      setDraftGummyPalette(randPal.colors);
    }
    if (randomEffect === 'prism') {
      const randGrad =
        DISCORD_PRISM_GRADIENTS[Math.floor(Math.random() * DISCORD_PRISM_GRADIENTS.length)];
      setDraftPrismGradient(randGrad.gradient);
    }
    if (randomEffect === 'gradient') {
      const randGrad =
        DISCORD_GRADIENT_PRESETS[Math.floor(Math.random() * DISCORD_GRADIENT_PRESETS.length)];
      setDraftGradientPreset(randGrad.gradient);
    }
  };

  const handleApplyNameStyle = async () => {
    const updated: NameStyleConfig = {
      fontId: draftNameFont,
      fontFamily: draftNameFontFamily,
      fontName: draftNameFontName,
      effect: draftNameEffect,
      color: draftNameColor,
      gummyColors: draftGummyPalette,
      gradient:
        draftNameEffect === 'prism'
          ? draftPrismGradient
          : draftNameEffect === 'gradient'
            ? draftGradientPreset
            : undefined,
      glow: draftNameEffect === 'neon' ? `0 0 10px ${draftNameColor}` : undefined,
    };
    setNameStyle(updated);
    persistVisualSettings({ nameStyle: updated });
    useActiveDecorationStore.getState().setActiveNameStyle(updated as any);

    if (currentUser?.id) {
      queryClient.setQueryData(queryKeys.user.current(currentUser.id), (old: any) =>
        old ? { ...old, displayNameStyle: updated } : old,
      );
      try {
        await apiClient.patch(`/users/${currentUser.id}`, { displayNameStyle: updated });
        queryClient.invalidateQueries({ queryKey: queryKeys.user.current(currentUser.id) });
        queryClient.invalidateQueries({ queryKey: ['user'] });
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['posts'] });
      } catch (err) {
        // gracefully fall back to local store
      }
    }

    setActivePickerModal(null);
    useMessageToastStore.getState().addToast({
      id: `toast-${Date.now()}`,
      conversationId: '',
      messageId: '',
      title: 'Display Name Style Applied',
      body: `Font: ${draftNameFontName} • Effect: ${draftNameEffect}`,
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
  };

  // UI state for Live Preview Drawer / Collapse
  const [showLivePreview, setShowLivePreview] = useState(true);

  // Save changes for local non-backend customization options (nameplate, name style, theme)
  const persistVisualSettings = (updates: Record<string, any>) => {
    try {
      const existing = (() => {
        try {
          return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch {
          return {};
        }
      })();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...updates }));
    } catch {
      // ignore
    }
  };

  const themeSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSaveThemeColors = (newPrimary: string, newAccent: string) => {
    setThemePrimary(newPrimary);
    setThemeAccent(newAccent);
    persistVisualSettings({ themePrimary: newPrimary, themeAccent: newAccent });

    if (currentUser?.id) {
      const updatedTheme = { primary: newPrimary, accent: newAccent };
      queryClient.setQueryData(queryKeys.user.current(currentUser.id), (old: any) =>
        old ? { ...old, profileTheme: updatedTheme } : old,
      );
      if (currentUser.username) {
        queryClient.setQueryData(queryKeys.user.byUsername(currentUser.username), (old: any) =>
          old ? { ...old, profileTheme: updatedTheme } : old,
        );
      }

      if (themeSaveTimeoutRef.current) {
        clearTimeout(themeSaveTimeoutRef.current);
      }
      themeSaveTimeoutRef.current = setTimeout(async () => {
        try {
          await apiClient.patch(`/users/${currentUser.id}`, { profileTheme: updatedTheme });
          queryClient.invalidateQueries({ queryKey: queryKeys.user.current(currentUser.id) });
          if (currentUser.username) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.user.byUsername(currentUser.username),
            });
          }
          queryClient.invalidateQueries({ queryKey: ['user'] });
          queryClient.invalidateQueries({ queryKey: ['users'] });
        } catch {
          // ignore
        }
      }, 350);
    }
  };

  // Check if the user has an explicitly customized profile theme
  const hasCustomProfileTheme = Boolean(
    (currentUser?.profileTheme?.primary && currentUser?.profileTheme?.accent) ||
    themePrimary !== '#1e1f22' ||
    themeAccent !== '#111214',
  );

  const handleResetTheme = () => {
    setThemePrimary('#1e1f22');
    setThemeAccent('#111214');
    persistVisualSettings({ themePrimary: null, themeAccent: null });
    setActiveThemeColorPicker(null);

    if (currentUser?.id) {
      queryClient.setQueryData(queryKeys.user.current(currentUser.id), (old: any) =>
        old ? { ...old, profileTheme: null } : old,
      );
      if (currentUser.username) {
        queryClient.setQueryData(queryKeys.user.byUsername(currentUser.username), (old: any) =>
          old ? { ...old, profileTheme: null } : old,
        );
      }

      if (themeSaveTimeoutRef.current) {
        clearTimeout(themeSaveTimeoutRef.current);
      }
      themeSaveTimeoutRef.current = setTimeout(async () => {
        try {
          await apiClient.patch(`/users/${currentUser.id}`, { profileTheme: null });
          queryClient.invalidateQueries({ queryKey: queryKeys.user.current(currentUser.id) });
          if (currentUser.username) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.user.byUsername(currentUser.username),
            });
          }
          queryClient.invalidateQueries({ queryKey: ['user'] });
          queryClient.invalidateQueries({ queryKey: ['users'] });
        } catch {
          // ignore
        }
      }, 350);
    }
  };

  const displayName = currentUser?.displayName || currentUser?.username || 'User';
  const username = currentUser?.username || 'user';
  const avatarUrl = currentUser?.avatar || null;

  // Format user bio with normal character limit
  const bioText = currentUser?.bio?.trim()
    ? currentUser.bio.length > 120
      ? currentUser.bio.slice(0, 120) + '...'
      : currentUser.bio
    : 'No bio yet.';

  // Check if preview decoration is owned
  const isPreviewOwned = previewDecoration === null || ownedMap.has(previewDecoration.id);
  const isPreviewCurrentActive = (previewDecoration?.id || null) === (activeDecorationId || null);

  const handleApplyDecoration = async () => {
    if (!isPreviewOwned) {
      handleGoToShop();
      return;
    }

    try {
      await equip.mutateAsync(previewDecoration?.id ?? null);
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}`,
        conversationId: '',
        messageId: '',
        title: 'Avatar Decoration Updated',
        body: previewDecoration
          ? `Equipped ${previewDecoration.name}.`
          : 'Avatar decoration cleared.',
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
      setActivePickerModal(null);
    } catch {
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}`,
        conversationId: '',
        messageId: '',
        title: 'Error',
        body: 'Failed to equip decoration. Please try again.',
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    }
  };

  const isPreviewNameplateOwned =
    previewNameplate === null || ownedNameplateMap.has(previewNameplate.id);

  const handleApplyNameplate = async () => {
    if (!isPreviewNameplateOwned) {
      handleGoToShop('nameplates');
      return;
    }
    try {
      await nameplateEquip.mutateAsync(previewNameplate?.id ?? null);
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}`,
        conversationId: '',
        messageId: '',
        title: 'Nameplate Updated',
        body: previewNameplate ? `Equipped ${previewNameplate.name}.` : 'Nameplate cleared.',
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
      setActivePickerModal(null);
    } catch {
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}`,
        conversationId: '',
        messageId: '',
        title: 'Error',
        body: 'Failed to equip nameplate. Please try again.',
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    }
  };

  const handleApplyProfileEffect = () => {
    if (previewProfileEffect && !previewProfileEffect.isOwned) {
      handleGoToShop();
      return;
    }
    setSelectedProfileEffect(previewProfileEffect);
    persistVisualSettings({ effect: previewProfileEffect });
    useMessageToastStore.getState().addToast({
      id: `toast-${Date.now()}`,
      conversationId: '',
      messageId: '',
      title: 'Profile Effect Updated',
      body: previewProfileEffect
        ? `Equipped ${previewProfileEffect.name}.`
        : 'Profile effect cleared.',
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
    setActivePickerModal(null);
  };

  const handleApplyProfileFrame = () => {
    if (previewProfileFrame && !previewProfileFrame.isOwned) {
      handleGoToShop();
      return;
    }
    setSelectedProfileFrame(previewProfileFrame);
    persistVisualSettings({ frame: previewProfileFrame });
    useMessageToastStore.getState().addToast({
      id: `toast-${Date.now()}`,
      conversationId: '',
      messageId: '',
      title: 'Profile Frame Updated',
      body: previewProfileFrame
        ? `Equipped ${previewProfileFrame.name}.`
        : 'Profile frame cleared.',
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
    setActivePickerModal(null);
  };

  return (
    <div className="flex flex-col gap-6 text-gray-950 dark:text-white animate-fadeIn relative pb-10">
      <style>{DISCORD_CUSTOMIZE_STYLES}</style>

      {/* 2-Column Responsive Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full min-w-0">
        {/* LEFT COLUMN: Controls 1-to-1 matching user specifications */}
        <div className="flex-1 min-w-0 max-w-[310px] w-full flex flex-col gap-4">
          {/* Top Bar: Just text "Customize" and ">>" */}
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xl font-bold text-gray-950 dark:text-white tracking-wide select-none">
              Customize
            </h3>
            <button
              type="button"
              onClick={() => setShowLivePreview((prev) => !prev)}
              className="text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/[0.06] transition cursor-pointer"
              title={showLivePreview ? 'Collapse Preview' : 'Expand Preview'}
            >
              <ChevronsRight
                size={18}
                className={`transition-transform duration-300 ${!showLivePreview ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* 1. Nameplate */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wide select-none">
              Nameplate
            </h4>

            {currentEquippedNameplate ? (
              // Nameplate Equipped State
              <div
                onClick={() => {
                  void nameplateCatalog.refetch();
                  void nameplateInventory.refetch();
                  setPreviewNameplate(currentEquippedNameplate);
                  setActivePickerModal('nameplate');
                }}
                className="nameplate-row w-full h-[58px] rounded-2xl p-2.5 flex items-center justify-between border border-black/10 dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 transition-all cursor-pointer relative overflow-hidden group shadow-md"
              >
                <Nameplate nameplate={currentEquippedNameplate} />
                <div className="flex items-center gap-3 relative z-10 min-w-0" data-nameplate-text>
                  <div className="w-9 h-9 shrink-0 relative flex items-center justify-center">
                    <Avatar
                      src={avatarUrl}
                      size="sm"
                      alt={displayName}
                      decoration={currentEquippedDecoration}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm tracking-wide truncate text-white">
                      {currentEquippedNameplate.name}
                    </span>
                    <span className="text-xs text-emerald-400 font-medium">Equipped</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await nameplateEquip.mutateAsync(null);
                      useMessageToastStore.getState().addToast({
                        id: `toast-${Date.now()}`,
                        conversationId: '',
                        messageId: '',
                        title: 'Nameplate Removed',
                        body: 'Nameplate cleared.',
                        avatar: null,
                        memberAvatars: [],
                        isGroup: false,
                      });
                    } catch {
                      // ignore
                    }
                  }}
                  className="w-8 h-8 rounded-xl bg-black/40 hover:bg-black/70 text-gray-300 hover:text-red-400 flex items-center justify-center transition active:scale-95 shrink-0 relative z-10 cursor-pointer shadow-xs"
                  title="Remove Nameplate"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ) : (
              // Nameplate Empty Initial State with Eternal Logo watermark & '+'
              <div
                onClick={() => {
                  void nameplateCatalog.refetch();
                  void nameplateInventory.refetch();
                  setPreviewNameplate(null);
                  setActivePickerModal('nameplate');
                }}
                className="w-full h-[58px] rounded-2xl p-2.5 flex items-center justify-between border border-dashed border-black/15 dark:border-white/15 hover:border-black/30 dark:hover:border-white/30 transition-all cursor-pointer bg-black/[0.02] dark:bg-[#1e1f22]/70 relative overflow-hidden group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <EternalLogoIcon size={18} className="opacity-60" />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    None equipped
                  </span>
                </div>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-300 font-semibold flex items-center gap-1">
                  <Plus size={14} /> Add
                </span>
              </div>
            )}
          </div>

          {/* 2. Avatar & Decoration (Reads real active decoration from backend database!) */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wide select-none">
              Avatar &amp; Decoration
            </h4>

            {currentEquippedDecoration ? (
              // Equipped Decoration state (Live active decoration from database!)
              <div
                onClick={() => {
                  void catalog.refetch();
                  void inventory.refetch();
                  setPreviewDecoration(currentEquippedDecoration);
                  setActivePickerModal('decoration');
                }}
                className="w-full h-[76px] rounded-2xl p-3 flex items-center justify-between border border-black/10 dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 transition-all cursor-pointer bg-white/70 dark:bg-[#1e1f22] relative overflow-hidden group shadow-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                    <AvatarWithDecoration
                      size={44}
                      avatarUrl={avatarUrl}
                      decoration={currentEquippedDecoration}
                      alt={displayName}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-gray-950 dark:text-white truncate">
                      {currentEquippedDecoration.name}
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Equipped
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await equip.mutateAsync(null);
                      useMessageToastStore.getState().addToast({
                        id: `toast-${Date.now()}`,
                        conversationId: '',
                        messageId: '',
                        title: 'Decoration Removed',
                        body: 'Avatar decoration cleared.',
                        avatar: null,
                        memberAvatars: [],
                        isGroup: false,
                      });
                    } catch {
                      // ignore
                    }
                  }}
                  className="w-8 h-8 rounded-xl bg-black/5 dark:bg-black/40 hover:bg-red-500/10 dark:hover:bg-black/70 text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center transition active:scale-95 shrink-0 cursor-pointer shadow-xs"
                  title="Remove Decoration"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ) : (
              // Empty Initial State (Single card, dashed border, Eternal icon watermark, centered '+')
              <div
                onClick={() => {
                  void catalog.refetch();
                  void inventory.refetch();
                  setPreviewDecoration(null);
                  setActivePickerModal('decoration');
                }}
                className="w-full h-[76px] rounded-2xl p-3 flex items-center justify-between border-2 border-dashed border-black/15 dark:border-white/15 hover:border-black/30 dark:hover:border-white/30 transition-all cursor-pointer bg-black/[0.02] dark:bg-[#1e1f22]/70 relative overflow-hidden group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border border-dashed border-black/20 dark:border-gray-600/70 group-hover:border-gray-400 group-hover:scale-105 transition-all flex items-center justify-center relative bg-black/5 dark:bg-[#111214]/60">
                    <EternalLogoIcon size={24} className="opacity-60" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-300">
                      Avatar Decoration
                    </span>
                    <span className="text-xs text-gray-500">None equipped</span>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 group-hover:bg-black/10 dark:group-hover:bg-white/20 flex items-center justify-center text-gray-700 dark:text-white font-bold transition shadow-xs">
                  <Plus size={16} />
                </div>
              </div>
            )}
          </div>

          {/* 3. Profile Effect & Frame (Empty initially with '+', appears on selection) */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wide select-none">
              Profile Effect &amp; Frame
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {/* Card 1: Profile Effect */}
              {selectedProfileEffect ? (
                <div
                  onClick={() => setActivePickerModal('effect')}
                  className="h-[148px] rounded-2xl bg-white/70 dark:bg-[#1e1f22] border border-black/10 dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 transition-all cursor-pointer flex flex-col items-center justify-center p-2 relative overflow-hidden group shadow-md"
                  title="Profile Effect"
                >
                  <div className="relative w-[82px] h-[114px] rounded-xl overflow-hidden bg-[#111214]">
                    <MiniProfileSilhouette />
                    <ProfileEffectVisual
                      effectKey={selectedProfileEffect.effectKey}
                      isThumbnail={true}
                    />
                  </div>
                  <div className="flex items-center justify-between w-full px-1 mt-1">
                    <span className="text-[11px] font-bold text-gray-900 dark:text-white truncate max-w-[70px]">
                      {selectedProfileEffect.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProfileEffect(null);
                        persistVisualSettings({ effect: null });
                      }}
                      className="text-gray-400 hover:text-red-400 transition"
                      title="Remove Effect"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setActivePickerModal('effect')}
                  className="h-[148px] rounded-2xl bg-black/[0.02] dark:bg-[#1e1f22] border-2 border-dashed border-black/15 dark:border-white/15 hover:border-black/30 dark:hover:border-white/30 transition-all cursor-pointer flex flex-col items-center justify-center p-2 relative group shadow-sm"
                  title="Add Profile Effect"
                >
                  <div className="w-[82px] h-[114px] rounded-xl border border-dashed border-black/20 dark:border-gray-600/70 group-hover:border-gray-400 group-hover:scale-105 transition-all flex flex-col items-center justify-center relative bg-black/5 dark:bg-[#111214]/60 gap-2">
                    <EternalLogoIcon size={26} className="opacity-50" />
                    <div className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 group-hover:bg-black/10 dark:group-hover:bg-white/20 flex items-center justify-center text-gray-700 dark:text-white font-bold transition shadow-xs">
                      <Plus size={15} />
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 mt-1 font-semibold">
                    Add Effect
                  </span>
                </div>
              )}

              {/* Server-owned frames are managed by the canonical shop. */}
              <button
                type="button"
                onClick={() => handleGoToShop('profile-frames')}
                className="h-[148px] rounded-2xl bg-black/[0.02] dark:bg-[#1e1f22] border border-black/15 dark:border-white/15 hover:border-[var(--app-accent-color)] transition-colors cursor-pointer flex flex-col items-center justify-center p-3 gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--app-accent-color)]"
                title="Manage Profile Frame"
              >
                <div className="relative w-[66px] h-[88px] rounded-xl bg-black/10 dark:bg-black/30">
                  <ProfileFrame frame={currentUser?.activeProfileFrame} compact />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <EternalLogoIcon size={22} className="opacity-60" />
                  </div>
                </div>
                <span className="text-[11px] font-semibold truncate max-w-full">
                  {currentUser?.activeProfileFrame?.name ?? 'Add Frame'}
                </span>
              </button>
            </div>
          </div>

          {/* 4. Display Name Style (Regular font by default, stylized if selected) */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wide select-none">
              Display Name Style
            </h4>

            {nameStyle ? (
              // Stylized Name
              <div
                onClick={() => setActivePickerModal('nameStyle')}
                className="w-full h-[62px] rounded-2xl bg-white/70 dark:bg-[#1e1f22] border border-black/10 dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 transition-all cursor-pointer flex items-center justify-between px-4 relative group shadow-md active:scale-[0.99]"
                title="Customize Display Name Style"
              >
                <div className="truncate flex-1 pr-2">
                  {renderStyledName(displayName, nameStyle, {
                    className: 'text-xl font-black truncate',
                  })}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNameStyle(null);
                    persistVisualSettings({ nameStyle: null });
                    useActiveDecorationStore.getState().setActiveNameStyle(null);
                    if (currentUser?.id) {
                      queryClient.setQueryData(
                        queryKeys.user.current(currentUser.id),
                        (old: any) => (old ? { ...old, displayNameStyle: null } : old),
                      );
                      apiClient
                        .patch(`/users/${currentUser.id}`, { displayNameStyle: null })
                        .then(() => {
                          queryClient.invalidateQueries({
                            queryKey: queryKeys.user.current(currentUser.id),
                          });
                          queryClient.invalidateQueries({ queryKey: ['user'] });
                          queryClient.invalidateQueries({ queryKey: ['users'] });
                          queryClient.invalidateQueries({ queryKey: ['posts'] });
                        })
                        .catch(() => {});
                    }
                  }}
                  className="w-8 h-8 rounded-xl bg-black/5 dark:bg-black/40 hover:bg-black/10 dark:hover:bg-black/70 text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center transition active:scale-95 shrink-0"
                  title="Reset to Normal Name"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ) : (
              // Normal Standard Name initially
              <div
                onClick={() => setActivePickerModal('nameStyle')}
                className="w-full h-[62px] rounded-2xl bg-black/[0.02] dark:bg-[#1e1f22] border border-black/10 dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 transition-all cursor-pointer flex items-center justify-between px-4 relative group shadow-md active:scale-[0.99]"
                title="Customize Display Name Style"
              >
                <span className="select-none text-base font-bold text-gray-900 dark:text-white tracking-wide truncate">
                  {displayName}
                </span>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-300 font-semibold flex items-center gap-1">
                  <Plus size={14} /> Customize
                </span>
              </div>
            )}
          </div>

          {/* 5. Profile Theme (Default natural dark colors initially) */}
          <div className="flex flex-col gap-2 relative" ref={themeBlockRef}>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wide select-none">
                Profile Theme
              </h4>
              <button
                type="button"
                onClick={handleResetTheme}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors px-2 py-0.5 rounded-md hover:bg-white/5"
                title="Reset to default theme"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            </div>

            <div
              data-color-picker-toggle="bar"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickY = e.clientY - rect.top;
                const clickedPart = clickY <= rect.height / 2 ? 'primary' : 'accent';
                setActiveThemeColorPicker((prev) => (prev === clickedPart ? null : clickedPart));
              }}
              className="w-full h-[128px] rounded-2xl relative overflow-hidden shadow-lg border border-black/15 dark:border-black/30 hover:border-black/30 dark:hover:border-black/50 transition-all cursor-pointer group select-none"
              style={{
                backgroundColor: themeAccent,
                backgroundImage: `linear-gradient(180deg, ${themePrimary} 0%, ${themeAccent} 100%)`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: '100% 100.5%',
              }}
              title="Нажмите на верхнюю часть для смены верхнего цвета, на нижнюю — для нижнего"
            >
              {/* Top Color Button: Centered in the top 50% */}
              <button
                type="button"
                data-color-picker-toggle="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveThemeColorPicker((prev) => (prev === 'primary' ? null : 'primary'));
                }}
                className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-xl border-2 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                  activeThemeColorPicker === 'primary'
                    ? 'border-white ring-2 ring-white/80 scale-105 shadow-[0_0_16px_rgba(255,255,255,0.6)]'
                    : 'border-white shadow-md'
                }`}
                style={{ backgroundColor: themePrimary }}
                title="Primary Color (Верхние 50%)"
              />

              {/* Bottom Color Button: Centered in the bottom 50% */}
              <button
                type="button"
                data-color-picker-toggle="accent"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveThemeColorPicker((prev) => (prev === 'accent' ? null : 'accent'));
                }}
                className={`absolute top-3/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-xl border-2 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                  activeThemeColorPicker === 'accent'
                    ? 'border-white ring-2 ring-white/80 scale-105 shadow-[0_0_16px_rgba(255,255,255,0.6)]'
                    : 'border-white/90 shadow-md'
                }`}
                style={{ backgroundColor: themeAccent }}
                title="Accent Color (Нижние 50%)"
              />
            </div>

            {/* Inline Color Picker Popover (Fully visible above the block, never goes off screen) */}
            <AnimatePresence>
              {activeThemeColorPicker && (
                <div
                  data-modal-open="true"
                  data-submodal-open="true"
                  className="absolute z-50 bottom-full mb-3 left-1/2 -translate-x-1/2"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 6 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <DiscordHsvColorPicker
                      color={activeThemeColorPicker === 'primary' ? themePrimary : themeAccent}
                      onChange={(hex) => {
                        if (activeThemeColorPicker === 'primary') {
                          handleSaveThemeColors(hex, themeAccent);
                        } else {
                          handleSaveThemeColors(themePrimary, hex);
                        }
                      }}
                      onClose={() => setActiveThemeColorPicker(null)}
                    />
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
        {/* RIGHT COLUMN: Live Profile Preview Card                   */}
        <AnimatePresence>
          {showLivePreview && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full sm:w-[268px] max-w-[268px] flex flex-col gap-2 shrink-0 self-start sticky top-0 min-w-0"
            >
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest select-none">
                Preview
              </span>

              {/* Profile Card Mockup */}
              <div
                className={`w-full rounded-2xl overflow-hidden shadow-2xl relative transition-all ${
                  selectedProfileFrame?.borderStyle || 'border border-black/15 dark:border-black/40'
                }`}
                style={
                  hasCustomProfileTheme
                    ? {
                        backgroundColor: themeAccent,
                        backgroundImage: `linear-gradient(180deg, ${themePrimary} 0%, ${themeAccent} 100%)`,
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '100% 100.5%',
                      }
                    : {
                        backgroundColor: '#111214',
                      }
                }
              >
                {/* Profile Frame Decorative Embellishments */}
                <ProfileFrame frame={currentUser?.activeProfileFrame} compact />

                {/* Banner Area */}
                <div className="w-full h-28 relative overflow-hidden bg-black/20">
                  <Banner
                    src={currentUser?.banner}
                    fallbackGradient={
                      hasCustomProfileTheme
                        ? `linear-gradient(135deg, ${themePrimary} 0%, rgba(0,0,0,0.55) 100%)`
                        : undefined
                    }
                  />
                </div>

                {/* Live Animated Profile Effect Overlay on Card */}
                {selectedProfileEffect && (
                  <ProfileEffectVisual
                    effectKey={selectedProfileEffect.effectKey}
                    isCardOverlay={true}
                  />
                )}

                {/* Avatar & Identity Area */}
                <div className="px-4 pb-4 -mt-10 relative z-10 flex flex-col gap-3">
                  <div className="flex items-end justify-between">
                    {/* Avatar */}
                    <div className="relative">
                      <AvatarWithDecoration
                        size={76}
                        avatarUrl={avatarUrl}
                        decoration={currentEquippedDecoration}
                        alt={displayName}
                      />
                      {/* Online Status Indicator */}
                      <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#1e1f22] z-30" />
                    </div>
                  </div>

                  {/* Profile Info Container: translucent dark overlay allowing the card's theme gradient to shine through fully! */}
                  <div className="bg-black/25 backdrop-blur-md rounded-xl p-3 flex flex-col gap-2.5 shadow-md border border-white/10">
                    {/* Display Name (Regular font by default, stylized if selected; styled with Nameplate if equipped) */}
                    <div
                      className={`relative rounded-xl transition-all ${
                        currentEquippedNameplate ? 'nameplate-row px-3 py-2 -mx-1' : ''
                      }`}
                    >
                      {currentEquippedNameplate && (
                        <Nameplate nameplate={currentEquippedNameplate} />
                      )}
                      <div data-nameplate-text className="relative z-10">
                        {nameStyle ? (
                          renderStyledName(displayName, nameStyle, {
                            className: 'text-lg font-black truncate select-none block',
                          })
                        ) : (
                          <h3 className="text-base font-bold text-white truncate select-none">
                            {displayName}
                          </h3>
                        )}
                        <p className="text-xs text-gray-300 font-medium">@{username}</p>
                      </div>
                    </div>

                    <div className="w-full h-[1px] bg-white/10" />

                    {/* BIO Section: with normal character limit */}
                    <div>
                      <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block mb-1">
                        BIO
                      </span>
                      <p className="text-xs text-gray-200 leading-relaxed break-words whitespace-pre-wrap line-clamp-3 overflow-hidden">
                        {bioText || 'No bio yet.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {activePickerModal === 'decoration' && (
          <div
            role="dialog"
            aria-modal="true"
            data-modal-open="true"
            data-submodal-open="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setPreviewDecoration(currentEquippedDecoration);
                setActivePickerModal(null);
              }
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl glass-modal border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-gray-950 dark:text-white backdrop-blur-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
                <h3 className="text-lg font-bold text-gray-950 dark:text-white tracking-wide">
                  Change Avatar Decoration
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewDecoration(currentEquippedDecoration);
                    setActivePickerModal(null);
                  }}
                  className="text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body: 2 Columns */}
              <div className="flex flex-col md:flex-row gap-6 items-stretch">
                {/* Left Column: Decorations List */}
                <div className="w-full md:w-[320px] max-h-[440px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4">
                  {/* Section: Your Decorations */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
                      Your Decorations
                    </h4>

                    <div className="grid grid-cols-3 gap-2.5">
                      {/* Item: None */}
                      <button
                        type="button"
                        onClick={() => setPreviewDecoration(null)}
                        style={{
                          borderColor: previewDecoration === null ? accentColor : undefined,
                          boxShadow:
                            previewDecoration === null ? `0 0 0 2px ${accentColor}40` : undefined,
                        }}
                        className={`h-20 rounded-xl p-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer relative bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] ${
                          previewDecoration === null
                            ? 'border-2 ring-2 bg-black/[0.03] dark:bg-white/[0.06]'
                            : 'border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                        }`}
                      >
                        <Ban size={22} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-300">
                          None
                        </span>
                      </button>

                      {/* Item: Shop */}
                      <button
                        type="button"
                        onClick={handleGoToShop}
                        className="h-20 rounded-xl p-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer relative bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 group"
                      >
                        <Store
                          size={22}
                          className="text-gray-600 dark:text-gray-300 group-hover:text-indigo-500 transition-colors"
                        />
                        <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-white">
                          Shop
                        </span>
                      </button>

                      {/* Owned Items from Backend Database */}
                      {ownedItems.map((item) => {
                        const isSelected = previewDecoration?.id === item.decoration.id;
                        return (
                          <button
                            key={item.decoration.id}
                            type="button"
                            onClick={() => setPreviewDecoration(item.decoration)}
                            style={{
                              borderColor: isSelected ? accentColor : undefined,
                              boxShadow: isSelected ? `0 0 0 2px ${accentColor}40` : undefined,
                            }}
                            className={`h-20 rounded-xl p-1.5 flex flex-col items-center justify-center transition-all cursor-pointer relative bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] ${
                              isSelected
                                ? 'border-2 ring-2 bg-black/[0.03] dark:bg-white/[0.06]'
                                : 'border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                            }`}
                            title={item.decoration.name}
                          >
                            <img
                              src={item.decoration.previewUrl || item.decoration.assetUrl}
                              alt={item.decoration.name}
                              className="w-12 h-12 object-contain pointer-events-none select-none"
                            />
                            <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 truncate w-full text-center mt-1">
                              {item.decoration.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section: See What's in Shop (Items available for purchase) */}
                  {shopItems.length > 0 && (
                    <div className="pt-2 border-t border-black/10 dark:border-white/10">
                      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
                        See What&apos;s in Shop
                      </h4>

                      <div className="grid grid-cols-3 gap-2.5">
                        {shopItems.map((item) => {
                          const isSelected = previewDecoration?.id === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setPreviewDecoration(item)}
                              style={{
                                borderColor: isSelected ? accentColor : undefined,
                                boxShadow: isSelected ? `0 0 0 2px ${accentColor}40` : undefined,
                              }}
                              className={`h-20 rounded-xl p-1.5 flex flex-col items-center justify-center transition-all cursor-pointer relative bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] ${
                                isSelected
                                  ? 'border-2 ring-2 bg-black/[0.03] dark:bg-white/[0.06]'
                                  : 'border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                              }`}
                              title={`${item.name} (Shop)`}
                            >
                              <Lock
                                size={12}
                                className="absolute top-1.5 right-1.5 text-gray-500 dark:text-white/70"
                              />
                              <img
                                src={item.previewUrl || item.assetUrl}
                                alt={item.name}
                                className="w-12 h-12 object-contain pointer-events-none select-none"
                              />
                              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 truncate w-full text-center mt-1">
                                {item.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Live Avatar Preview Area */}
                <div className="flex-1 bg-black/5 dark:bg-black/35 rounded-2xl p-6 flex items-center justify-between min-w-[280px] relative border border-black/10 dark:border-white/5">
                  {/* Large Centered Avatar with Preview Decoration */}
                  <div className="flex-1 flex items-center justify-center">
                    <AvatarWithDecoration
                      size={136}
                      avatarUrl={avatarUrl}
                      decoration={previewDecoration}
                      alt={displayName}
                    />
                  </div>

                  {/* Vertical Column of Mini Avatar Previews */}
                  <div className="flex flex-col items-center justify-center gap-3.5 pl-3 border-l border-black/10 dark:border-white/10 shrink-0">
                    <AvatarWithDecoration
                      size={36}
                      avatarUrl={avatarUrl}
                      decoration={previewDecoration}
                    />
                    <AvatarWithDecoration
                      size={30}
                      avatarUrl={avatarUrl}
                      decoration={previewDecoration}
                    />
                    {/* With Online green dot */}
                    <div className="relative">
                      <AvatarWithDecoration
                        size={30}
                        avatarUrl={avatarUrl}
                        decoration={previewDecoration}
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border border-white dark:border-[#1e1f22]" />
                    </div>
                    {/* With Offline gray dot */}
                    <div className="relative">
                      <AvatarWithDecoration
                        size={30}
                        avatarUrl={avatarUrl}
                        decoration={previewDecoration}
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-gray-500 border border-white dark:border-[#1e1f22]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer (Cancel / Apply buttons) */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewDecoration(currentEquippedDecoration);
                    setActivePickerModal(null);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.08] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={equip.isPending || (isPreviewOwned && isPreviewCurrentActive)}
                  onClick={handleApplyDecoration}
                  style={{
                    backgroundColor:
                      isPreviewOwned && isPreviewCurrentActive ? undefined : accentColor,
                  }}
                  className={`px-6 py-2 rounded-xl text-sm font-bold text-white transition cursor-pointer shadow-md active:scale-95 flex items-center gap-2 ${
                    isPreviewOwned && isPreviewCurrentActive
                      ? 'bg-gray-400 dark:bg-gray-600 opacity-50 cursor-not-allowed pointer-events-none'
                      : 'hover:opacity-90'
                  }`}
                >
                  {equip.isPending && <Loader2 size={16} className="animate-spin" />}
                  {!isPreviewOwned && <Store size={15} />}
                  <span>
                    {!isPreviewOwned
                      ? 'View in Shop'
                      : isPreviewCurrentActive
                        ? 'Applied'
                        : 'Apply'}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activePickerModal === 'nameplate' && (
          <div
            role="dialog"
            aria-modal="true"
            data-modal-open="true"
            data-submodal-open="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setPreviewNameplate(currentEquippedNameplate);
                setActivePickerModal(null);
              }
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl glass-modal border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-gray-950 dark:text-white backdrop-blur-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
                <h3 className="text-lg font-bold text-gray-950 dark:text-white tracking-wide">
                  Change Nameplate
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewNameplate(currentEquippedNameplate);
                    setActivePickerModal(null);
                  }}
                  className="text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body: 2 Columns */}
              <div className="flex flex-col md:flex-row gap-6 items-stretch">
                {/* Left Column: Nameplates List */}
                <div className="w-full md:w-[320px] max-h-[440px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4">
                  {/* Section: Your Nameplates */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
                      Your Nameplates
                    </h4>

                    {/* Top Row: None & Shop */}
                    <div className="grid grid-cols-2 gap-2.5 mb-3">
                      {/* Item: None */}
                      <button
                        type="button"
                        onClick={() => setPreviewNameplate(null)}
                        style={{
                          borderColor: previewNameplate === null ? accentColor : undefined,
                          boxShadow:
                            previewNameplate === null ? `0 0 0 2px ${accentColor}40` : undefined,
                        }}
                        className={`h-20 rounded-xl p-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer relative bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] ${
                          previewNameplate === null
                            ? 'border-2 ring-2 bg-black/[0.03] dark:bg-white/[0.06]'
                            : 'border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                        }`}
                      >
                        <Ban size={22} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-300">
                          None
                        </span>
                      </button>

                      {/* Item: Shop */}
                      <button
                        type="button"
                        onClick={() => handleGoToShop('nameplates')}
                        className="h-20 rounded-xl p-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer relative bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 group"
                      >
                        <Store
                          size={22}
                          className="text-gray-600 dark:text-gray-300 group-hover:text-indigo-500 transition-colors"
                        />
                        <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-white">
                          Shop
                        </span>
                      </button>
                    </div>

                    {/* Owned Nameplates (Wide rounded banner cards) */}
                    {ownedNameplateItems.length === 0 ? (
                      <div className="text-center py-3 text-xs text-gray-500 dark:text-gray-400">
                        No nameplates in collection
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {ownedNameplateItems.map((item) => {
                          const np = item.nameplate;
                          const isSelected = previewNameplate?.id === np.id;
                          return (
                            <button
                              key={np.id}
                              type="button"
                              onClick={() => setPreviewNameplate(np)}
                              style={{
                                borderColor: isSelected ? accentColor : undefined,
                                boxShadow: isSelected ? `0 0 0 2px ${accentColor}80` : undefined,
                              }}
                              className={`nameplate-row w-full h-12 rounded-2xl px-3 flex items-center justify-between cursor-pointer border transition-all relative overflow-hidden group shadow-sm ${
                                isSelected
                                  ? 'border-2 ring-2'
                                  : 'border-white/10 hover:border-white/30'
                              }`}
                            >
                              <Nameplate nameplate={np} playOnHover={true} />
                              <div
                                className="flex items-center gap-2.5 relative z-10"
                                data-nameplate-text
                              >
                                <div className="w-7 h-7 rounded-full bg-white/20 border border-white/25 flex items-center justify-center shrink-0">
                                  <EternalLogoIcon size={14} className="opacity-70 text-white" />
                                </div>
                                <div className="w-24 h-2.5 rounded-full bg-white/25" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Section: See What's in Shop */}
                  {shopNameplates.length > 0 && (
                    <div className="pt-2 border-t border-black/10 dark:border-white/10">
                      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
                        See What&apos;s in Shop
                      </h4>

                      <div className="flex flex-col gap-2.5">
                        {shopNameplates.map((np) => {
                          const isSelected = previewNameplate?.id === np.id;
                          return (
                            <button
                              key={np.id}
                              type="button"
                              onClick={() => setPreviewNameplate(np)}
                              style={{
                                borderColor: isSelected ? accentColor : undefined,
                                boxShadow: isSelected ? `0 0 0 2px ${accentColor}80` : undefined,
                              }}
                              className={`nameplate-row w-full h-12 rounded-2xl px-3 flex items-center justify-between cursor-pointer border transition-all relative overflow-hidden group shadow-sm ${
                                isSelected
                                  ? 'border-2 ring-2'
                                  : 'border-white/10 hover:border-white/30'
                              }`}
                            >
                              <Nameplate nameplate={np} playOnHover={true} />
                              <div
                                className="flex items-center gap-2.5 relative z-10"
                                data-nameplate-text
                              >
                                <div className="w-7 h-7 rounded-full bg-white/20 border border-white/25 flex items-center justify-center shrink-0">
                                  <EternalLogoIcon size={14} className="opacity-70 text-white" />
                                </div>
                                <div className="w-24 h-2.5 rounded-full bg-white/25" />
                              </div>
                              <Lock size={14} className="text-white/80 shrink-0 z-10" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Live Member List Preview*/}
                <div className="flex-1 bg-black/5 dark:bg-black/35 rounded-2xl p-4 flex flex-col justify-between min-w-[280px] border border-black/10 dark:border-white/5">
                  {/* Channel Member List Mockup */}
                  <div className="bg-[#111214] rounded-xl p-2.5 flex flex-col gap-1.5 shadow-inner border border-white/5">
                    {/* Skeleton Row 1 */}
                    <div className="h-10 px-2.5 rounded-lg flex items-center gap-3 opacity-60">
                      <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
                      <div className="flex flex-col gap-1.5 flex-1">
                        <div className="w-32 h-3 rounded-full bg-white/15" />
                        <div className="w-16 h-2 rounded-full bg-white/5" />
                      </div>
                    </div>

                    {/* Skeleton Row 2 */}
                    <div className="h-10 px-2.5 rounded-lg flex items-center gap-3 opacity-60">
                      <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
                      <div className="w-24 h-3 rounded-full bg-white/15" />
                    </div>

                    {/* Row 3: ACTIVE USER ROW Wearing the Nameplate! */}
                    <div
                      className={`nameplate-row h-10 px-2.5 rounded-lg flex items-center gap-3 relative overflow-hidden transition-all shadow-md ${
                        !previewNameplate ? 'bg-white/5' : ''
                      }`}
                    >
                      {previewNameplate && (
                        <Nameplate
                          key={previewNameplate.id}
                          nameplate={previewNameplate}
                          alwaysPlay={true}
                        />
                      )}
                      <div className="w-8 h-8 shrink-0 relative flex items-center justify-center z-10">
                        <AvatarWithDecoration
                          size={32}
                          avatarUrl={avatarUrl}
                          decoration={currentEquippedDecoration}
                          alt={displayName}
                        />
                      </div>
                      <div className="truncate flex-1 min-w-0 relative z-10" data-nameplate-text>
                        {renderStyledName(displayName, nameStyle, {
                          className:
                            'font-semibold text-sm tracking-wide truncate block text-white',
                        })}
                      </div>
                    </div>

                    {/* Skeleton Row 4 */}
                    <div className="h-10 px-2.5 rounded-lg flex items-center gap-3 opacity-60">
                      <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
                      <div className="w-28 h-3 rounded-full bg-white/15" />
                    </div>

                    {/* Skeleton Row 5 */}
                    <div className="h-10 px-2.5 rounded-lg flex items-center gap-3 opacity-60">
                      <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
                      <div className="w-20 h-3 rounded-full bg-white/15" />
                    </div>
                  </div>

                  {/* Details Box */}
                  <div className="bg-[#111214] rounded-xl p-3 border border-white/5 flex flex-col gap-0.5 mt-3">
                    <span className="font-bold text-white text-sm">
                      {previewNameplate ? previewNameplate.name : 'None'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {previewNameplate
                        ? ownedNameplateMap.has(previewNameplate.id)
                          ? 'In your collection'
                          : 'Available in Shop'
                        : 'Default member style'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewNameplate(currentEquippedNameplate);
                    setActivePickerModal(null);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.08] transition cursor-pointer"
                >
                  Cancel
                </button>
                {(() => {
                  const isOwned =
                    previewNameplate === null || ownedNameplateMap.has(previewNameplate.id);
                  const isCurrentActive =
                    (previewNameplate?.id || null) === (activeNameplateId || null);

                  return (
                    <button
                      type="button"
                      disabled={nameplateEquip.isPending || (isOwned && isCurrentActive)}
                      onClick={handleApplyNameplate}
                      style={{
                        backgroundColor: isOwned && isCurrentActive ? undefined : accentColor,
                      }}
                      className={`px-6 py-2 rounded-xl text-sm font-bold text-white transition cursor-pointer shadow-md active:scale-95 flex items-center gap-2 ${
                        isOwned && isCurrentActive
                          ? 'bg-gray-400 dark:bg-gray-600 opacity-50 cursor-not-allowed pointer-events-none'
                          : 'hover:opacity-90'
                      }`}
                    >
                      {nameplateEquip.isPending && <Loader2 size={16} className="animate-spin" />}
                      {!isOwned && <Store size={15} />}
                      <span>
                        {!isOwned ? 'View in Shop' : isCurrentActive ? 'Applied' : 'Apply'}
                      </span>
                    </button>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activePickerModal === 'effect' && (
          <div
            role="dialog"
            aria-modal="true"
            data-modal-open="true"
            data-submodal-open="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setPreviewProfileEffect(selectedProfileEffect);
                setActivePickerModal(null);
              }
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl glass-modal border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-gray-950 dark:text-white backdrop-blur-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
                <h3 className="text-lg font-bold text-gray-950 dark:text-white tracking-wide">
                  Change Profile Effect
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewProfileEffect(selectedProfileEffect);
                    setActivePickerModal(null);
                  }}
                  className="text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body: 2 Columns */}
              <div className="flex flex-col md:flex-row gap-6 items-stretch">
                {/* Left Column: Effects List */}
                <div className="w-full md:w-[320px] max-h-[440px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4">
                  {/* Section: Your Effects */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
                      Your Effects
                    </h4>

                    <div className="grid grid-cols-3 gap-2.5">
                      {/* Item: None */}
                      <button
                        type="button"
                        onClick={() => setPreviewProfileEffect(null)}
                        style={{
                          borderColor: previewProfileEffect === null ? accentColor : undefined,
                          boxShadow:
                            previewProfileEffect === null
                              ? `0 0 0 2px ${accentColor}40`
                              : undefined,
                        }}
                        className={`h-20 rounded-xl p-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer relative bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] ${
                          previewProfileEffect === null
                            ? 'border-2 ring-2 bg-black/[0.03] dark:bg-white/[0.06]'
                            : 'border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                        }`}
                      >
                        <Ban size={22} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-300">
                          None
                        </span>
                      </button>

                      {/* Item: Shop */}
                      <button
                        type="button"
                        onClick={handleGoToShop}
                        className="h-20 rounded-xl p-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer relative bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 group"
                      >
                        <Store
                          size={22}
                          className="text-gray-600 dark:text-gray-300 group-hover:text-indigo-500 transition-colors"
                        />
                        <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-white">
                          Shop
                        </span>
                      </button>

                      {/* Owned Effects */}
                      {PROFILE_EFFECT_PRESETS.filter((eff) => eff.isOwned).map((eff) => {
                        const isSelected = previewProfileEffect?.id === eff.id;
                        return (
                          <button
                            key={eff.id}
                            type="button"
                            onClick={() => setPreviewProfileEffect(eff)}
                            style={{
                              borderColor: isSelected ? accentColor : undefined,
                              boxShadow: isSelected ? `0 0 0 2px ${accentColor}40` : undefined,
                            }}
                            className={`h-20 rounded-xl p-1.5 flex flex-col items-center justify-between transition-all cursor-pointer relative bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] overflow-hidden ${
                              isSelected
                                ? 'border-2 ring-2 bg-black/[0.03] dark:bg-white/[0.06]'
                                : 'border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                            }`}
                            title={eff.name}
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden relative mt-0.5">
                              <ProfileEffectVisual effectKey={eff.effectKey} isThumbnail={true} />
                            </div>
                            <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 truncate w-full text-center">
                              {eff.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section: See What's in Shop (NO Nitro section!) */}
                  <div className="pt-2 border-t border-black/10 dark:border-white/10">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
                      See What&apos;s in Shop
                    </h4>

                    <div className="grid grid-cols-3 gap-2.5">
                      {PROFILE_EFFECT_PRESETS.filter((eff) => !eff.isOwned).map((eff) => {
                        const isSelected = previewProfileEffect?.id === eff.id;
                        return (
                          <button
                            key={eff.id}
                            type="button"
                            onClick={() => setPreviewProfileEffect(eff)}
                            style={{
                              borderColor: isSelected ? accentColor : undefined,
                              boxShadow: isSelected ? `0 0 0 2px ${accentColor}40` : undefined,
                            }}
                            className={`h-20 rounded-xl p-1.5 flex flex-col items-center justify-between transition-all cursor-pointer relative bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] overflow-hidden ${
                              isSelected
                                ? 'border-2 ring-2 bg-black/[0.03] dark:bg-white/[0.06]'
                                : 'border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                            }`}
                            title={`${eff.name} (Shop)`}
                          >
                            <Lock
                              size={12}
                              className="absolute top-1.5 right-1.5 text-white/90 drop-shadow-md z-10"
                            />
                            <div className="w-10 h-10 rounded-lg overflow-hidden relative mt-0.5">
                              <ProfileEffectVisual effectKey={eff.effectKey} isThumbnail={true} />
                            </div>
                            <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 truncate w-full text-center">
                              {eff.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Column: Profile Card with Live Animated Effect */}
                <div className="flex-1 bg-black/5 dark:bg-black/35 rounded-2xl p-4 flex flex-col justify-between min-w-[280px] border border-black/10 dark:border-white/5">
                  <div
                    className={`rounded-2xl relative overflow-hidden shadow-2xl p-4 flex flex-col gap-3 min-h-[350px] ${
                      selectedProfileFrame?.borderStyle || 'border border-white/10'
                    }`}
                    style={
                      hasCustomProfileTheme
                        ? {
                            backgroundColor: themeAccent,
                            backgroundImage: `linear-gradient(180deg, ${themePrimary} 0%, ${themeAccent} 100%)`,
                          }
                        : { backgroundColor: '#111214' }
                    }
                  >
                    {/* Selected Profile Frame Flourishes */}
                    <ProfileFrame frame={currentUser?.activeProfileFrame} compact />

                    {/* Banner at top */}
                    <div className="w-full h-24 rounded-t-xl -mx-4 -mt-4 mb-1 relative overflow-hidden">
                      <Banner
                        src={currentUser?.banner}
                        fallbackGradient={
                          hasCustomProfileTheme
                            ? `linear-gradient(135deg, ${themePrimary} 0%, rgba(0,0,0,0.6) 100%)`
                            : undefined
                        }
                      />
                    </div>

                    {/* Live Animated Effect Overlay across entire Profile Card! */}
                    {previewProfileEffect && (
                      <ProfileEffectVisual
                        effectKey={previewProfileEffect.effectKey}
                        isCardOverlay={true}
                      />
                    )}

                    {/* Avatar row with decoration & online status */}
                    <div className="-mt-12 relative z-10 flex items-end justify-between">
                      <div className="relative">
                        <AvatarWithDecoration
                          size={68}
                          avatarUrl={avatarUrl}
                          decoration={currentEquippedDecoration}
                          alt={displayName}
                        />
                        <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#111214] z-30" />
                      </div>
                    </div>

                    {/* User Identity Details */}
                    <div className="flex flex-col gap-0.5 z-10">
                      <div className="truncate">
                        {renderStyledName(displayName, nameStyle, {
                          className: 'text-base font-bold tracking-wide truncate block',
                        })}
                      </div>
                      <span className="text-xs text-gray-300">@{username}</span>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-300">
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-semibold text-white">
                          Developer
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-semibold text-white">
                          Fame
                        </span>
                      </div>
                    </div>

                    {/* Bio snippet */}
                    <p className="text-xs text-gray-300 line-clamp-2 z-10 mt-1 leading-relaxed">
                      {bioText}
                    </p>

                    {/* Example Button) */}
                    <button
                      type="button"
                      style={{ backgroundColor: accentColor }}
                      className="w-full py-2.5 rounded-lg text-white font-semibold text-xs text-center shadow-md select-none mt-auto cursor-default z-10"
                    >
                      Example Button
                    </button>
                  </div>

                  {/* Details Box */}
                  <div className="bg-[#111214] rounded-xl p-3 border border-white/5 flex flex-col gap-0.5 mt-3">
                    <span className="font-bold text-white text-sm">
                      {previewProfileEffect ? previewProfileEffect.name : 'None'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {previewProfileEffect
                        ? previewProfileEffect.isOwned
                          ? previewProfileEffect.acquiredDate || 'Acquired'
                          : 'Available in Shop'
                        : 'No profile effect applied'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewProfileEffect(selectedProfileEffect);
                    setActivePickerModal(null);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.08] transition cursor-pointer"
                >
                  Cancel
                </button>
                {(() => {
                  const isOwned = previewProfileEffect === null || previewProfileEffect.isOwned;
                  const isCurrentActive =
                    (previewProfileEffect?.id || null) === (selectedProfileEffect?.id || null);

                  return (
                    <button
                      type="button"
                      disabled={isOwned && isCurrentActive}
                      onClick={handleApplyProfileEffect}
                      style={{
                        backgroundColor: isOwned && isCurrentActive ? undefined : accentColor,
                      }}
                      className={`px-6 py-2 rounded-xl text-sm font-bold text-white transition cursor-pointer shadow-md active:scale-95 flex items-center gap-2 ${
                        isOwned && isCurrentActive
                          ? 'bg-gray-400 dark:bg-gray-600 opacity-50 cursor-not-allowed pointer-events-none'
                          : 'hover:opacity-90'
                      }`}
                    >
                      {!isOwned && <Store size={15} />}
                      <span>
                        {!isOwned ? 'View in Shop' : isCurrentActive ? 'Applied' : 'Apply'}
                      </span>
                    </button>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activePickerModal === 'frame' && (
          <div
            role="dialog"
            aria-modal="true"
            data-modal-open="true"
            data-submodal-open="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setPreviewProfileFrame(selectedProfileFrame);
                setActivePickerModal(null);
              }
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl glass-modal border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-gray-950 dark:text-white backdrop-blur-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
                <h3 className="text-lg font-bold text-gray-950 dark:text-white tracking-wide">
                  Change Profile Frame
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewProfileFrame(selectedProfileFrame);
                    setActivePickerModal(null);
                  }}
                  className="text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body: 2 Columns */}
              <div className="flex flex-col md:flex-row gap-6 items-stretch">
                {/* Left Column: Frames List */}
                <div className="w-full md:w-[320px] max-h-[440px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4">
                  {/* Section: Your Frames */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
                      Your Frames
                    </h4>

                    <div className="grid grid-cols-3 gap-2.5">
                      {/* Item: None */}
                      <button
                        type="button"
                        onClick={() => setPreviewProfileFrame(null)}
                        style={{
                          borderColor: previewProfileFrame === null ? accentColor : undefined,
                          boxShadow:
                            previewProfileFrame === null ? `0 0 0 2px ${accentColor}40` : undefined,
                        }}
                        className={`h-20 rounded-xl p-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer relative bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] ${
                          previewProfileFrame === null
                            ? 'border-2 ring-2 bg-black/[0.03] dark:bg-white/[0.06]'
                            : 'border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                        }`}
                      >
                        <Ban size={22} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-300">
                          None
                        </span>
                      </button>

                      {/* Item: Shop */}
                      <button
                        type="button"
                        onClick={handleGoToShop}
                        className="h-20 rounded-xl p-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer relative bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 group"
                      >
                        <Store
                          size={22}
                          className="text-gray-600 dark:text-gray-300 group-hover:text-indigo-500 transition-colors"
                        />
                        <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-white">
                          Shop
                        </span>
                      </button>

                      {/* Owned Frames */}
                      {PROFILE_FRAME_PRESETS.filter((frm) => frm.isOwned).map((frm) => {
                        const isSelected = previewProfileFrame?.id === frm.id;
                        return (
                          <button
                            key={frm.id}
                            type="button"
                            onClick={() => setPreviewProfileFrame(frm)}
                            style={{
                              borderColor: isSelected ? accentColor : undefined,
                              boxShadow: isSelected ? `0 0 0 2px ${accentColor}40` : undefined,
                            }}
                            className={`h-20 rounded-xl p-1.5 flex flex-col items-center justify-between transition-all cursor-pointer relative bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] overflow-hidden ${
                              isSelected
                                ? 'border-2 ring-2 bg-black/[0.03] dark:bg-white/[0.06]'
                                : 'border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                            }`}
                            title={frm.name}
                          >
                            <div
                              className={`w-10 h-10 rounded-lg bg-[#111214] flex items-center justify-center relative mt-0.5 ${
                                frm.borderStyle || ''
                              }`}
                            >
                              <ProfileFrameVisual frameType={frm.frameType} isThumbnail={true} />
                            </div>
                            <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 truncate w-full text-center">
                              {frm.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section: See What's in Shop (NO Nitro section!) */}
                  <div className="pt-2 border-t border-black/10 dark:border-white/10">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
                      See What&apos;s in Shop
                    </h4>

                    <div className="grid grid-cols-3 gap-2.5">
                      {PROFILE_FRAME_PRESETS.filter((frm) => !frm.isOwned).map((frm) => {
                        const isSelected = previewProfileFrame?.id === frm.id;
                        return (
                          <button
                            key={frm.id}
                            type="button"
                            onClick={() => setPreviewProfileFrame(frm)}
                            style={{
                              borderColor: isSelected ? accentColor : undefined,
                              boxShadow: isSelected ? `0 0 0 2px ${accentColor}40` : undefined,
                            }}
                            className={`h-20 rounded-xl p-1.5 flex flex-col items-center justify-between transition-all cursor-pointer relative bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] overflow-hidden ${
                              isSelected
                                ? 'border-2 ring-2 bg-black/[0.03] dark:bg-white/[0.06]'
                                : 'border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                            }`}
                            title={`${frm.name} (Shop)`}
                          >
                            <Lock
                              size={12}
                              className="absolute top-1.5 right-1.5 text-white/90 drop-shadow-md z-10"
                            />
                            <div
                              className={`w-10 h-10 rounded-lg bg-[#111214] flex items-center justify-center relative mt-0.5 ${
                                frm.borderStyle || ''
                              }`}
                            >
                              <ProfileFrameVisual frameType={frm.frameType} isThumbnail={true} />
                            </div>
                            <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 truncate w-full text-center">
                              {frm.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Column: Framed Profile Card Preview */}
                <div className="flex-1 bg-black/5 dark:bg-black/35 rounded-2xl p-4 flex flex-col justify-between min-w-[280px] border border-black/10 dark:border-white/5">
                  {/* Framed Profile Card */}
                  <div
                    className={`rounded-2xl relative overflow-hidden shadow-2xl p-4 flex flex-col gap-3 min-h-[350px] transition-all duration-300 ${
                      previewProfileFrame?.borderStyle || 'border border-white/10'
                    }`}
                    style={
                      hasCustomProfileTheme
                        ? {
                            backgroundColor: themeAccent,
                            backgroundImage: `linear-gradient(180deg, ${themePrimary} 0%, ${themeAccent} 100%)`,
                          }
                        : { backgroundColor: '#111214' }
                    }
                  >
                    {/* Frame Decorative Flourishes */}
                    {previewProfileFrame && (
                      <ProfileFrameVisual frameType={previewProfileFrame.frameType} />
                    )}

                    {/* Banner at top */}
                    <div className="w-full h-24 rounded-t-xl -mx-4 -mt-4 mb-1 relative overflow-hidden">
                      <Banner
                        src={currentUser?.banner}
                        fallbackGradient={
                          hasCustomProfileTheme
                            ? `linear-gradient(135deg, ${themePrimary} 0%, rgba(0,0,0,0.6) 100%)`
                            : undefined
                        }
                      />
                    </div>

                    {/* Active Profile Effect if equipped */}
                    {selectedProfileEffect && (
                      <ProfileEffectVisual
                        effectKey={selectedProfileEffect.effectKey}
                        isCardOverlay={true}
                      />
                    )}

                    {/* Avatar row with decoration & online status */}
                    <div className="-mt-12 relative z-10 flex items-end justify-between">
                      <div className="relative">
                        <AvatarWithDecoration
                          size={68}
                          avatarUrl={avatarUrl}
                          decoration={currentEquippedDecoration}
                          alt={displayName}
                        />
                        <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#111214] z-30" />
                      </div>
                    </div>

                    {/* User Identity Details */}
                    <div className="flex flex-col gap-0.5 z-10">
                      <div className="truncate">
                        {renderStyledName(displayName, nameStyle, {
                          className: 'text-base font-bold tracking-wide truncate block',
                        })}
                      </div>
                      <span className="text-xs text-gray-300">@{username}</span>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-300">
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-semibold text-white">
                          Developer
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-semibold text-white">
                          Fame
                        </span>
                      </div>
                    </div>

                    {/* Bio snippet */}
                    <p className="text-xs text-gray-300 line-clamp-2 z-10 mt-1 leading-relaxed">
                      {bioText}
                    </p>

                    {/* Example Button */}
                    <button
                      type="button"
                      style={{ backgroundColor: accentColor }}
                      className="w-full py-2.5 rounded-lg text-white font-semibold text-xs text-center shadow-md select-none mt-auto cursor-default z-10"
                    >
                      Example Button
                    </button>
                  </div>

                  {/* Details Box */}
                  <div className="bg-[#111214] rounded-xl p-3 border border-white/5 flex flex-col gap-0.5 mt-3">
                    <span className="font-bold text-white text-sm">
                      {previewProfileFrame ? previewProfileFrame.name : 'None'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {previewProfileFrame
                        ? previewProfileFrame.isOwned
                          ? previewProfileFrame.acquiredDate || 'Acquired'
                          : 'Available in Shop'
                        : 'No profile frame applied'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewProfileFrame(selectedProfileFrame);
                    setActivePickerModal(null);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.08] transition cursor-pointer"
                >
                  Cancel
                </button>
                {(() => {
                  const isOwned = previewProfileFrame === null || previewProfileFrame.isOwned;
                  const isCurrentActive =
                    (previewProfileFrame?.id || null) === (selectedProfileFrame?.id || null);

                  return (
                    <button
                      type="button"
                      disabled={isOwned && isCurrentActive}
                      onClick={handleApplyProfileFrame}
                      style={{
                        backgroundColor: isOwned && isCurrentActive ? undefined : accentColor,
                      }}
                      className={`px-6 py-2 rounded-xl text-sm font-bold text-white transition cursor-pointer shadow-md active:scale-95 flex items-center gap-2 ${
                        isOwned && isCurrentActive
                          ? 'bg-gray-400 dark:bg-gray-600 opacity-50 cursor-not-allowed pointer-events-none'
                          : 'hover:opacity-90'
                      }`}
                    >
                      {!isOwned && <Store size={15} />}
                      <span>
                        {!isOwned ? 'View in Shop' : isCurrentActive ? 'Applied' : 'Apply'}
                      </span>
                    </button>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activePickerModal === 'nameStyle' && (
          <div
            role="dialog"
            aria-modal="true"
            data-modal-open="true"
            data-submodal-open="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowColorPickerPopover(false);
                setActivePickerModal(null);
              }
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-3xl glass-modal border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-gray-950 dark:text-white backdrop-blur-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
                <h3 className="text-lg font-bold text-gray-950 dark:text-white tracking-wide">
                  Change Display Name Style
                </h3>
                <button
                  type="button"
                  onClick={() => setActivePickerModal(null)}
                  className="text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body: 2 Columns */}
              <div className="flex flex-col md:flex-row gap-6 items-stretch">
                {/* Left Column: Fonts, Effects & Colors */}
                <div className="w-full md:w-[350px] max-h-[460px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-5">
                  {/* Section 1: Choose Font */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                        <Type size={14} className="text-indigo-400" />
                        Choose Font
                      </h4>
                      <span className="text-[11px] font-semibold text-purple-400 dark:text-purple-300 max-w-[170px] truncate select-none">
                        {hoveredFontTooltip
                          ? CHAT_FONTS.find((f) => f.id === hoveredFontTooltip)?.name
                          : draftNameFontName}
                      </span>
                    </div>

                    {/* 4-Column Grid of Font Preview Cards */}
                    <div className="grid grid-cols-4 gap-2">
                      {CHAT_FONTS.map((f) => {
                        const isSelected = draftNameFont === f.id;
                        return (
                          <div key={f.id} className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                if (f.googleFontName) {
                                  loadThemeFont(f.fontFamily, f.googleFontName);
                                }
                                setDraftNameFont(f.id);
                                setDraftNameFontFamily(f.fontFamily);
                                setDraftNameFontName(f.name);
                              }}
                              onMouseEnter={() => {
                                if (f.googleFontName) {
                                  loadThemeFont(f.fontFamily, f.googleFontName);
                                }
                                setHoveredFontTooltip(f.id);
                              }}
                              onMouseLeave={() => setHoveredFontTooltip(null)}
                              style={{
                                borderColor: isSelected ? accentColor : undefined,
                                boxShadow: isSelected ? `0 0 0 2px ${accentColor}80` : undefined,
                              }}
                              className={`w-full aspect-[1.1/1] rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
                                isSelected
                                  ? 'bg-black/15 dark:bg-white/[0.08] border-2 ring-2'
                                  : 'bg-black/5 dark:bg-[#181922] hover:bg-black/10 dark:hover:bg-[#20222e] border border-black/10 dark:border-white/10'
                              }`}
                              title={f.name}
                            >
                              {/* Selected indicator dot */}
                              {isSelected && (
                                <span
                                  className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full shadow-[0_0_6px_currentColor]"
                                  style={{ backgroundColor: accentColor, color: accentColor }}
                                />
                              )}
                              <span
                                style={{
                                  fontFamily: f.fontFamily,
                                  fontSize: f.scale ? `${f.scale * 1.45}rem` : '1.45rem',
                                  lineHeight: 1,
                                }}
                                className="font-bold select-none text-gray-900 dark:text-white"
                              >
                                {f.sampleText || 'Gg'}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 2: Choose Effect */}
                  <div className="pt-2 border-t border-black/10 dark:border-white/10">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 select-none">
                      <Sparkles size={14} className="text-amber-400" />
                      Choose Effect
                    </h4>

                    {/* Effects Grid*/}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'minimal', label: 'Solid' },
                        { id: 'gradient', label: 'Gradient' },
                        { id: 'neon', label: 'Neon' },
                        { id: 'cartoon', label: 'Toon' },
                        { id: 'highlight', label: 'Pop' },
                        { id: 'gummy', label: 'Gummy' },
                        { id: 'prism', label: 'Prism' },
                      ].map((eff) => {
                        const isSelected = draftNameEffect === eff.id;
                        return (
                          <button
                            key={eff.id}
                            type="button"
                            onClick={() => setDraftNameEffect(eff.id as any)}
                            style={{
                              borderColor: isSelected ? accentColor : undefined,
                              boxShadow: isSelected ? `0 0 0 2px ${accentColor}80` : undefined,
                            }}
                            className={`h-11 rounded-2xl flex items-center justify-center px-2 transition-all cursor-pointer relative ${
                              isSelected
                                ? 'bg-black/15 dark:bg-white/[0.08] border-2 ring-2'
                                : 'bg-black/5 dark:bg-[#181922] hover:bg-black/10 dark:hover:bg-[#20222e] border border-black/10 dark:border-white/10'
                            }`}
                          >
                            {isSelected && (
                              <span
                                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full shadow-[0_0_6px_currentColor]"
                                style={{ backgroundColor: accentColor, color: accentColor }}
                              />
                            )}
                            {eff.id === 'highlight' ? (
                              <span className="text-xs font-black select-none text-white drop-shadow-[0_2px_0_#10b981]">
                                Pop
                              </span>
                            ) : eff.id === 'gummy' ? (
                              <span className="text-xs font-black select-none tracking-wider">
                                <span className="text-[#c084fc]">G</span>
                                <span className="text-[#67e8f9]">u</span>
                                <span className="text-[#f472b6]">m</span>
                                <span className="text-[#4ade80]">m</span>
                                <span className="text-[#fb7185]">y</span>
                              </span>
                            ) : eff.id === 'prism' ? (
                              <span
                                className="text-xs font-black select-none"
                                style={{
                                  backgroundImage:
                                    'linear-gradient(90deg, #10b981, #f59e0b, #ec4899, #8b5cf6, #06b6d4)',
                                  WebkitBackgroundClip: 'text',
                                  backgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                  color: 'transparent',
                                }}
                              >
                                Prism
                              </span>
                            ) : eff.id === 'gradient' ? (
                              <span
                                className="text-xs font-black select-none"
                                style={{
                                  backgroundImage:
                                    'linear-gradient(135deg, #2dd4bf 0%, #f472b6 100%)',
                                  WebkitBackgroundClip: 'text',
                                  backgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                  color: 'transparent',
                                }}
                              >
                                Gradient
                              </span>
                            ) : eff.id === 'neon' ? (
                              <span
                                className="text-xs font-black select-none"
                                style={{
                                  color: 'transparent',
                                  WebkitTextStroke: '1px #c084fc',
                                  filter: 'drop-shadow(0 0 1px #c084fc)',
                                }}
                              >
                                Neon
                              </span>
                            ) : eff.id === 'cartoon' ? (
                              <span
                                className="text-xs font-black select-none"
                                style={{
                                  backgroundImage:
                                    'linear-gradient(180deg, #ffffff 0%, #f472b6 50%, #ffffff 100%)',
                                  backgroundSize: '100% 200%',
                                  WebkitBackgroundClip: 'text',
                                  backgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                  color: 'transparent',
                                  animation: 'toonFlowBottomToTop 2.5s ease-in-out infinite',
                                  filter:
                                    'drop-shadow(1px 1px 0 #000000) drop-shadow(-1px -1px 0 #000000)',
                                }}
                              >
                                Toon
                              </span>
                            ) : (
                              <span className="text-xs font-bold select-none text-gray-900 dark:text-gray-100">
                                Solid
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 3: Choose Color*/}
                  <div className="pt-2 border-t border-black/10 dark:border-white/10 relative">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 select-none">
                      <Palette size={14} className="text-rose-400" />
                      Choose Color
                    </h4>

                    {/* A. PRISM COLOR PICKER*/}
                    {draftNameEffect === 'prism' && (
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-2.5">
                          {/* Spectrum gradient bar with interactive stop indicators */}
                          <div
                            className="flex-1 h-11 rounded-xl relative overflow-hidden p-1.5 flex items-center justify-between border border-black/10 dark:border-white/10 shadow-inner"
                            style={{
                              background:
                                'linear-gradient(90deg, #ff4e50 0%, #f9d423 20%, #10b981 40%, #06b6d4 60%, #a855f7 80%, #ec4899 100%)',
                            }}
                          >
                            {[
                              { color: '#f97316' },
                              { color: '#10b981' },
                              { color: '#fde047' },
                              { color: '#ec4899' },
                              { color: '#3b82f6' },
                            ].map((stop, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setDraftNameColor(stop.color);
                                  setDraftPrismGradient(
                                    `linear-gradient(90deg, ${stop.color} 0%, #f9d423 25%, #10b981 50%, #06b6d4 75%, ${stop.color} 100%)`,
                                  );
                                }}
                                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white shadow-md hover:scale-110 active:scale-95 transition cursor-pointer"
                                style={{ backgroundColor: stop.color }}
                                title={`Color stop: ${stop.color}`}
                              >
                                <Pipette size={11} className="stroke-[2.5]" />
                              </button>
                            ))}
                          </div>

                          {/* 6 Gradient Pill Presets */}
                          <div className="grid grid-cols-3 gap-1 shrink-0">
                            {DISCORD_PRISM_GRADIENTS.map((p) => {
                              const isSelected = draftPrismGradient === p.gradient;
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setDraftPrismGradient(p.gradient)}
                                  className={`w-9 h-5 rounded-lg relative overflow-hidden border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'border-white ring-2 ring-purple-500 shadow-md scale-105'
                                      : 'border-white/10 hover:border-white/40'
                                  }`}
                                  style={{ background: p.gradient }}
                                  title={p.name}
                                >
                                  {isSelected && (
                                    <Check
                                      size={10}
                                      className="absolute inset-0 m-auto text-white stroke-3 drop-shadow"
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* B. GUMMY COLOR PICKER*/}
                    {draftNameEffect === 'gummy' && (
                      <div className="flex flex-col gap-2.5">
                        {/* Pastel Gradient Slider Track - Only shown when user clicks "Выбрать цвет самому" */}
                        <AnimatePresence>
                          {showGummyCustomSlider && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.18 }}
                              className="overflow-hidden"
                            >
                              <div
                                className="w-full h-8 rounded-xl relative overflow-hidden border border-black/10 dark:border-white/10 flex items-center px-2 cursor-pointer shadow-inner touch-none select-none"
                                style={{
                                  background:
                                    'linear-gradient(90deg, #fde047 0%, #86efac 25%, #7dd3fc 50%, #c084fc 75%, #f472b6 100%)',
                                }}
                                onPointerDown={(e) => {
                                  e.currentTarget.setPointerCapture(e.pointerId);
                                  handleGummySliderPointer(e);
                                }}
                                onPointerMove={(e) => {
                                  if (e.buttons === 1) {
                                    handleGummySliderPointer(e);
                                  }
                                }}
                                onPointerUp={(e) => {
                                  try {
                                    e.currentTarget.releasePointerCapture(e.pointerId);
                                  } catch {}
                                }}
                              >
                                {/* Draggable white thumb positioned along the slider track */}
                                <div
                                  className="w-5 h-6 rounded-md border-2 border-white bg-white/50 shadow-md backdrop-blur-xs transition-none pointer-events-none absolute"
                                  style={{
                                    left: `calc(8px + ${gummySliderRatio} * (100% - 36px))`,
                                  }}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* 7 Preset Palettes with 4 Vertical Stripes each + Pencil Toggle Button */}
                        <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar">
                          <button
                            type="button"
                            onClick={() => setShowGummyCustomSlider((prev) => !prev)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition shrink-0 cursor-pointer border ${
                              showGummyCustomSlider
                                ? 'bg-purple-600 border-white ring-2 ring-purple-400 text-white shadow-md'
                                : 'bg-black/5 dark:bg-[#181922] hover:bg-black/10 dark:hover:bg-[#20222e] border-black/10 dark:border-white/10 text-gray-400 hover:text-white'
                            }`}
                            title="Выбрать цвет самому"
                          >
                            <Pencil size={14} />
                          </button>

                          {DISCORD_GUMMY_PALETTES.map((pal) => {
                            const isSelected =
                              draftGummyPalette.length === 4 &&
                              draftGummyPalette[0] === pal.colors[0] &&
                              draftGummyPalette[1] === pal.colors[1];
                            return (
                              <button
                                key={pal.id}
                                type="button"
                                onClick={() => setDraftGummyPalette(pal.colors)}
                                className={`w-8 h-8 rounded-xl overflow-hidden flex shrink-0 border transition-all cursor-pointer relative ${
                                  isSelected
                                    ? 'border-white ring-2 ring-purple-500/80 scale-105 shadow-md'
                                    : 'border-white/10 hover:border-white/40 hover:scale-105'
                                }`}
                                title={pal.name}
                              >
                                {pal.colors.map((c, idx) => (
                                  <div
                                    key={idx}
                                    className="flex-1 h-full"
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                                {isSelected && (
                                  <Check
                                    size={12}
                                    className="absolute inset-0 m-auto text-white stroke-3 drop-shadow bg-black/40 rounded-full p-0.5"
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* C. GRADIENT EFFECT PICKER */}
                    {draftNameEffect === 'gradient' && (
                      <div className="flex flex-col gap-2.5">
                        <div className="grid grid-cols-4 gap-1.5">
                          {DISCORD_GRADIENT_PRESETS.map((p) => {
                            const isSelected = draftGradientPreset === p.gradient;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setDraftGradientPreset(p.gradient);
                                  setShowColorPickerPopover(false);
                                }}
                                className={`h-7 rounded-lg relative overflow-hidden border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-white ring-2 ring-purple-500 scale-105 shadow-md'
                                    : 'border-white/10 hover:border-white/40'
                                }`}
                                style={{ background: p.gradient }}
                                title={p.name}
                              >
                                {isSelected && (
                                  <Check
                                    size={12}
                                    className="absolute inset-0 m-auto text-white stroke-3 drop-shadow bg-black/30 rounded-full p-0.5"
                                  />
                                )}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            data-color-picker-toggle="true"
                            onClick={() => setShowColorPickerPopover((prev) => !prev)}
                            className={`h-7 rounded-lg flex items-center justify-center transition cursor-pointer border text-xs font-semibold gap-1 ${
                              showColorPickerPopover
                                ? 'bg-purple-600 border-white ring-2 ring-purple-400 text-white shadow-md'
                                : 'bg-black/5 dark:bg-[#181922] hover:bg-black/10 dark:hover:bg-[#20222e] border-black/10 dark:border-white/10 text-gray-400 hover:text-white'
                            }`}
                            title="Свой цвет градиента"
                          >
                            <Pencil size={12} />
                            <span>Custom</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* D. NEON EFFECT PICKER */}
                    {draftNameEffect === 'neon' && (
                      <div className="flex items-center gap-2 overflow-x-auto py-1 custom-scrollbar">
                        <button
                          type="button"
                          data-color-picker-toggle="true"
                          onClick={() => setShowColorPickerPopover((prev) => !prev)}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition shrink-0 cursor-pointer border ${
                            showColorPickerPopover
                              ? 'bg-purple-600 border-white ring-2 ring-white/50 text-white'
                              : 'bg-black/5 dark:bg-[#181922] hover:bg-black/10 dark:hover:bg-[#20222e] border-black/10 dark:border-white/10 text-gray-400 hover:text-white'
                          }`}
                          title="Выбрать цвет самому"
                        >
                          <Pencil size={14} />
                        </button>
                        {DISCORD_NEON_COLORS.map((swatch) => {
                          const isSelected =
                            draftNameColor.toLowerCase() === swatch.color.toLowerCase();
                          return (
                            <button
                              key={swatch.name}
                              type="button"
                              onClick={() => {
                                setDraftNameColor(swatch.color);
                                setShowColorPickerPopover(false);
                              }}
                              className={`relative w-8 h-8 rounded-xl shrink-0 transition-all border cursor-pointer ${
                                isSelected
                                  ? 'border-white ring-2 ring-white/80 scale-105 shadow-md'
                                  : 'border-white/10 hover:border-white/40 hover:scale-105'
                              }`}
                              style={{
                                backgroundColor: swatch.color,
                                boxShadow: `0 0 10px ${swatch.color}88`,
                              }}
                              title={swatch.name}
                            >
                              {isSelected && (
                                <Check
                                  size={13}
                                  className="absolute inset-0 m-auto stroke-3 drop-shadow text-white bg-black/40 rounded-full p-0.5"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* E. TOON EFFECT PICKER */}
                    {draftNameEffect === 'cartoon' && (
                      <div className="flex items-center gap-2 overflow-x-auto py-1 custom-scrollbar">
                        <button
                          type="button"
                          data-color-picker-toggle="true"
                          onClick={() => setShowColorPickerPopover((prev) => !prev)}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition shrink-0 cursor-pointer border ${
                            showColorPickerPopover
                              ? 'bg-purple-600 border-white ring-2 ring-white/50 text-white'
                              : 'bg-black/5 dark:bg-[#181922] hover:bg-black/10 dark:hover:bg-[#20222e] border-black/10 dark:border-white/10 text-gray-400 hover:text-white'
                          }`}
                          title="Выбрать цвет самому"
                        >
                          <Pencil size={14} />
                        </button>
                        {DISCORD_TOON_COLORS.map((swatch) => {
                          const isSelected =
                            draftNameColor.toLowerCase() === swatch.color.toLowerCase();
                          return (
                            <button
                              key={swatch.name}
                              type="button"
                              onClick={() => {
                                setDraftNameColor(swatch.color);
                                setShowColorPickerPopover(false);
                              }}
                              className={`relative w-8 h-8 rounded-xl shrink-0 transition-transform active:scale-90 border cursor-pointer ${
                                isSelected
                                  ? 'border-white ring-2 ring-purple-500/80 scale-105 shadow-md'
                                  : 'border-white/10 hover:border-white/40 hover:scale-105'
                              }`}
                              style={{ backgroundColor: swatch.color }}
                              title={swatch.name}
                            >
                              {isSelected && (
                                <Check
                                  size={13}
                                  className={`absolute inset-0 m-auto stroke-3 drop-shadow ${
                                    swatch.color === '#ffffff' ? 'text-black' : 'text-white'
                                  }`}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* F. POP EFFECT PICKER */}
                    {draftNameEffect === 'highlight' && (
                      <div className="flex items-center gap-2 overflow-x-auto py-1 custom-scrollbar">
                        <button
                          type="button"
                          data-color-picker-toggle="true"
                          onClick={() => setShowColorPickerPopover((prev) => !prev)}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition shrink-0 cursor-pointer border ${
                            showColorPickerPopover
                              ? 'bg-purple-600 border-white ring-2 ring-white/50 text-white'
                              : 'bg-black/5 dark:bg-[#181922] hover:bg-black/10 dark:hover:bg-[#20222e] border-black/10 dark:border-white/10 text-gray-400 hover:text-white'
                          }`}
                          title="Выбрать цвет самому"
                        >
                          <Pencil size={14} />
                        </button>
                        {DISCORD_POP_COLORS.map((swatch) => {
                          const isSelected =
                            draftNameColor.toLowerCase() === swatch.color.toLowerCase();
                          return (
                            <button
                              key={swatch.name}
                              type="button"
                              onClick={() => {
                                setDraftNameColor(swatch.color);
                                setShowColorPickerPopover(false);
                              }}
                              className={`relative w-8 h-8 rounded-xl shrink-0 transition-transform active:scale-90 border cursor-pointer ${
                                isSelected
                                  ? 'border-white ring-2 ring-emerald-500/80 scale-105 shadow-md'
                                  : 'border-white/10 hover:border-white/40 hover:scale-105'
                              }`}
                              style={{
                                backgroundColor: swatch.color,
                                boxShadow: `0 2px 0 rgba(0,0,0,0.5)`,
                              }}
                              title={swatch.name}
                            >
                              {isSelected && (
                                <Check
                                  size={13}
                                  className={`absolute inset-0 m-auto stroke-3 drop-shadow ${
                                    swatch.color === '#ffffff' ? 'text-black' : 'text-white'
                                  }`}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* G. SOLID / MINIMAL PICKER */}
                    {draftNameEffect === 'minimal' && (
                      <div className="flex items-center gap-2 overflow-x-auto py-1 custom-scrollbar">
                        <button
                          type="button"
                          data-color-picker-toggle="true"
                          onClick={() => setShowColorPickerPopover((prev) => !prev)}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition shrink-0 cursor-pointer border ${
                            showColorPickerPopover
                              ? 'bg-purple-600 border-white ring-2 ring-white/50 text-white'
                              : 'bg-black/5 dark:bg-[#181922] hover:bg-black/10 dark:hover:bg-[#20222e] border-black/10 dark:border-white/10 text-gray-400 hover:text-white'
                          }`}
                          title="Выбрать цвет самому"
                        >
                          <Pencil size={14} />
                        </button>
                        {DISCORD_SOLID_COLORS.map((swatch) => {
                          const isSelected =
                            draftNameColor.toLowerCase() === swatch.color.toLowerCase();
                          return (
                            <button
                              key={swatch.name}
                              type="button"
                              onClick={() => {
                                setDraftNameColor(swatch.color);
                                setShowColorPickerPopover(false);
                              }}
                              className={`relative w-8 h-8 rounded-xl shrink-0 transition-transform active:scale-90 border cursor-pointer ${
                                isSelected
                                  ? 'border-white ring-2 ring-purple-500/80 scale-105 shadow-md'
                                  : 'border-white/10 hover:border-white/40 hover:scale-105'
                              }`}
                              style={{ backgroundColor: swatch.color }}
                              title={swatch.name}
                            >
                              {isSelected && (
                                <Check
                                  size={13}
                                  className={`absolute inset-0 m-auto stroke-3 drop-shadow ${
                                    swatch.color === '#ffffff' ? 'text-black' : 'text-white'
                                  }`}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Expandable Custom Color Picker - Cleanly inline below swatches */}
                    <AnimatePresence>
                      {showColorPickerPopover &&
                        draftNameEffect !== 'prism' &&
                        draftNameEffect !== 'gummy' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden mt-2.5 w-full"
                          >
                            <DiscordHsvColorPicker
                              color={draftNameColor}
                              className="w-full"
                              onChange={(hex) => {
                                setDraftNameColor(hex);
                                if (draftNameEffect === 'gradient') {
                                  setDraftGradientPreset(
                                    `linear-gradient(135deg, ${hex} 0%, #a855f7 50%, #38bdf8 100%)`,
                                  );
                                }
                              }}
                              onClose={() => setShowColorPickerPopover(false)}
                            />
                          </motion.div>
                        )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Right Column: Live Multi-Context Preview Box */}
                <div className="flex-1 bg-black/5 dark:bg-black/35 rounded-2xl p-4 flex flex-col justify-between min-w-[300px] border border-black/10 dark:border-white/5">
                  {/* Preview Canvas (Can be toggled between dark & light mode!) */}
                  <div
                    className={`rounded-2xl border p-4 flex flex-col gap-3.5 transition-colors duration-200 relative overflow-hidden shadow-2xl ${
                      draftPreviewMode === 'dark'
                        ? 'bg-[#111214] border-white/10 text-white'
                        : 'bg-[#f2f3f5] border-black/10 text-gray-900'
                    }`}
                  >
                    {/* 1. Profile Header Card */}
                    <div
                      className={`rounded-2xl relative overflow-hidden shadow-lg border transition-all ${
                        selectedProfileFrame?.borderStyle ||
                        (draftPreviewMode === 'dark' ? 'border-white/10' : 'border-black/10')
                      }`}
                      style={
                        hasCustomProfileTheme
                          ? {
                              backgroundColor: themeAccent,
                              backgroundImage: `linear-gradient(180deg, ${themePrimary} 0%, ${themeAccent} 100%)`,
                            }
                          : { backgroundColor: draftPreviewMode === 'dark' ? '#111214' : '#f2f3f5' }
                      }
                    >
                      {/* Decorative Frame */}
                      <ProfileFrame frame={currentUser?.activeProfileFrame} compact />

                      {/* Animated Profile Effect */}
                      {selectedProfileEffect && (
                        <ProfileEffectVisual
                          effectKey={selectedProfileEffect.effectKey}
                          isCardOverlay={true}
                        />
                      )}

                      {/* Banner area: 100% full width edge-to-edge */}
                      <div className="w-full h-20 relative overflow-hidden">
                        <Banner
                          src={currentUser?.banner}
                          fallbackGradient={
                            hasCustomProfileTheme
                              ? `linear-gradient(135deg, ${themePrimary} 0%, rgba(0,0,0,0.6) 100%)`
                              : undefined
                          }
                        />
                      </div>

                      {/* Profile Card Body */}
                      <div className="px-3.5 pb-3.5">
                        {/* Avatar row with decoration & online status */}
                        <div className="-mt-7 relative z-10 flex items-end justify-between">
                          <div className="relative">
                            <AvatarWithDecoration
                              size={56}
                              avatarUrl={avatarUrl}
                              decoration={currentEquippedDecoration}
                              alt={displayName}
                            />
                            <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#111214] z-30" />
                          </div>
                        </div>

                        {/* Display Name styled in real time & Username */}
                        <div className="flex flex-col gap-0.5 z-10 mt-1.5">
                          <div className="truncate pl-1">
                            {renderStyledName(displayName, liveDraftNameStyle, {
                              className:
                                'text-base font-bold tracking-wide truncate block text-white',
                            })}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-medium text-gray-200">
                              @{username || 'user'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Floating Chat Message Bubble */}
                    <div
                      className={`rounded-xl p-3 flex items-start gap-3 shadow-md border ${
                        draftPreviewMode === 'dark'
                          ? 'bg-[#1e1f22] border-white/5'
                          : 'bg-white border-black/10 shadow-sm'
                      }`}
                    >
                      <div className="shrink-0 mt-0.5 flex items-center justify-center">
                        <AvatarWithDecoration
                          size={32}
                          avatarUrl={avatarUrl}
                          decoration={currentEquippedDecoration}
                          alt={displayName}
                        />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate max-w-[150px] pl-1">
                            {renderStyledName(displayName, liveDraftNameStyle, {
                              className: 'text-xs font-bold truncate block',
                              isLightBackground: draftPreviewMode === 'light',
                            })}
                          </div>
                          <span
                            className={`text-[10px] select-none font-medium ${
                              draftPreviewMode === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            }`}
                          >
                            8:20 PM
                          </span>
                        </div>
                        <p
                          className={`text-xs mt-0.5 select-none font-medium ${
                            draftPreviewMode === 'dark' ? 'text-gray-200' : 'text-gray-900'
                          }`}
                        >
                          does anyone read this?
                        </p>
                      </div>
                    </div>

                    {/* 3. Member List / Nameplate Row Preview*/}
                    <div
                      className={`nameplate-row h-10 px-3 rounded-xl flex items-center gap-2.5 relative overflow-hidden shadow-xs border ${
                        draftPreviewMode === 'dark'
                          ? 'border-white/10 bg-white/[0.05]'
                          : 'border-black/10 bg-zinc-200/90'
                      }`}
                    >
                      {currentEquippedNameplate && (
                        <Nameplate nameplate={currentEquippedNameplate} />
                      )}
                      <div className="shrink-0 flex items-center justify-center relative z-10">
                        <AvatarWithDecoration
                          size={24}
                          avatarUrl={avatarUrl}
                          decoration={currentEquippedDecoration}
                          alt={displayName}
                        />
                      </div>
                      <div
                        className="truncate flex-1 min-w-0 pl-1 relative z-10"
                        data-nameplate-text
                      >
                        {renderStyledName(displayName, liveDraftNameStyle, {
                          className: 'text-xs font-bold tracking-wide truncate block',
                          isLightBackground:
                            draftPreviewMode === 'light' && !currentEquippedNameplate,
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Preview Footer: Note + Dark/Light Mode Switcher */}
                  <div className="flex items-center justify-between gap-3 mt-3 pt-2">
                    <p
                      className={`text-[11px] leading-snug select-none ${
                        draftPreviewMode === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      Note: Display name colors and effects will not appear in voice chats. Styles
                      may also look different across light/dark mode.{' '}
                      <span className="text-sky-500 hover:underline cursor-pointer">
                        Learn more
                      </span>
                    </p>

                    {/* Dark / Light Mode Switcher*/}
                    <button
                      type="button"
                      onClick={() =>
                        setDraftPreviewMode((prev) => (prev === 'dark' ? 'light' : 'dark'))
                      }
                      className={`p-2 rounded-xl transition shrink-0 cursor-pointer shadow-xs border ${
                        draftPreviewMode === 'dark'
                          ? 'bg-white/10 hover:bg-white/20 text-gray-200 border-white/10'
                          : 'bg-black/5 hover:bg-black/10 text-gray-800 border-black/10'
                      }`}
                      title={
                        draftPreviewMode === 'dark'
                          ? 'Switch to Light Preview'
                          : 'Switch to Dark Preview'
                      }
                    >
                      {draftPreviewMode === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-black/10 dark:border-white/10">
                {/* Surprise Me Button*/}
                <button
                  type="button"
                  onClick={handleSurpriseMe}
                  className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/[0.08] hover:bg-black/10 dark:hover:bg-white/[0.15] text-gray-800 dark:text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer active:scale-95 shadow-xs"
                >
                  <Dices size={16} className="text-purple-400" />
                  <span>Surprise Me</span>
                </button>

                {/* Cancel & Apply Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActivePickerModal(null)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.08] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyNameStyle}
                    style={{ backgroundColor: accentColor }}
                    className="px-6 py-2 rounded-xl text-sm font-bold text-white transition cursor-pointer shadow-md active:scale-95 hover:opacity-90"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
