/**
 * Cursor Engine: Ultra-high performance custom cursors.
 * 1:1 Pixel Art rendering with authentic Minecraft tools and Dota 2 cursor pack,
 * 3D isometric pixel cursors, realistic katana with dynamic tsukamaki wrap,
 * and comprehensive system states (default, pointer, text, grab, grabbing, not-allowed).
 */

import { CURSOR_BASE64_ASSETS } from './cursorAssets';

export type CursorStateType = 'default' | 'pointer' | 'text' | 'grab' | 'grabbing' | 'not-allowed';

export interface CursorVariant {
  id: string;
  name: string;
  color: string;
  glowColor?: string;
}

export interface CursorPreset {
  id: string;
  name: string;
  tag: string;
  description: string;
  category: 'gaming' | 'cyber' | 'anime' | 'retro';
  variants: CursorVariant[];
  defaultVariant: string;
  hotspots: {
    default: [number, number];
    pointer?: [number, number];
    text?: [number, number];
    grab?: [number, number];
    grabbing?: [number, number];
    'not-allowed'?: [number, number];
  };
}

// ---------------------------------------------------------------------------
// 1. Minecraft Tool Materials (Exact Palette)
// ---------------------------------------------------------------------------
export interface MinecraftMaterial {
  id: string;
  name: string;
  light: string;
  mid: string;
  dark: string;
  outline: string;
  glowColor: string;
}

export const MINECRAFT_MATERIALS: MinecraftMaterial[] = [
  {
    id: 'diamond',
    name: 'Diamond',
    light: '#55ffff',
    mid: '#2cf9ed',
    dark: '#00aaaa',
    outline: '#0a3d3a',
    glowColor: 'rgba(44, 249, 237, 0.55)',
  },
  {
    id: 'netherite',
    name: 'Netherite',
    light: '#776f79',
    mid: '#524b53',
    dark: '#342e35',
    outline: '#19151a',
    glowColor: 'rgba(92, 85, 95, 0.55)',
  },
  {
    id: 'iron',
    name: 'Iron',
    light: '#ffffff',
    mid: '#e2e8f0',
    dark: '#94a3b8',
    outline: '#334155',
    glowColor: 'rgba(226, 232, 240, 0.50)',
  },
  {
    id: 'gold',
    name: 'Gold',
    light: '#fef08a',
    mid: '#facc15',
    dark: '#ca8a04',
    outline: '#713f12',
    glowColor: 'rgba(251, 191, 36, 0.55)',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    light: '#6ee7b7',
    mid: '#10b981',
    dark: '#047857',
    outline: '#064e3b',
    glowColor: 'rgba(16, 185, 129, 0.55)',
  },
  {
    id: 'ruby',
    name: 'Ruby',
    light: '#fda4af',
    mid: '#f43f5e',
    dark: '#be123c',
    outline: '#881337',
    glowColor: 'rgba(244, 63, 94, 0.55)',
  },
];

export const MINECRAFT_TOOL_VARIANTS: CursorVariant[] = MINECRAFT_MATERIALS.map((m) => ({
  id: m.id,
  name: m.name,
  color: m.mid,
  glowColor: m.glowColor,
}));

// ---------------------------------------------------------------------------
// 2. Dota 2 Cursor Variants
// ---------------------------------------------------------------------------
export const DOTA2_VARIANTS: CursorVariant[] = [
  {
    id: 'classic',
    name: 'Classic Steel',
    color: '#00f0ff',
    glowColor: 'rgba(0, 240, 255, 0.55)',
  },
  {
    id: 'wrath-of-ka',
    name: 'Wrath of Ka (Spectral)',
    color: '#22c55e',
    glowColor: 'rgba(34, 197, 94, 0.60)',
  },
  {
    id: 'crimson',
    name: 'Crimson Blade',
    color: '#ff003c',
    glowColor: 'rgba(255, 0, 60, 0.60)',
  },
  {
    id: 'gold',
    name: 'Golden Aegis Immortal',
    color: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.60)',
  },
];

// ---------------------------------------------------------------------------
// 3. 3D Pixel Cursor Variants (Exact Image 4)
// ---------------------------------------------------------------------------
export const PIXEL_3D_VARIANTS: CursorVariant[] = [
  {
    id: 'cyber',
    name: 'Cyber Purple (3D)',
    color: '#d946ef',
    glowColor: 'rgba(217, 70, 239, 0.60)',
  },
  {
    id: 'cyan',
    name: 'Neon Cyan (3D)',
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.60)',
  },
  {
    id: 'lime',
    name: 'Matrix Lime (3D)',
    color: '#84cc16',
    glowColor: 'rgba(132, 204, 22, 0.60)',
  },
  {
    id: 'amber',
    name: 'Sunset Amber (3D)',
    color: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.60)',
  },
];

// ---------------------------------------------------------------------------
// 4. Realistic Katana Variants (Image 5)
// ---------------------------------------------------------------------------
export const KATANA_VARIANTS: CursorVariant[] = [
  {
    id: 'crimson',
    name: 'Crimson Lotus',
    color: '#dc2626',
    glowColor: 'rgba(220, 38, 38, 0.60)',
  },
  {
    id: 'thunder',
    name: 'Thunder Steel',
    color: '#2563eb',
    glowColor: 'rgba(37, 99, 235, 0.60)',
  },
  {
    id: 'jade',
    name: 'Dragon Jade',
    color: '#059669',
    glowColor: 'rgba(5, 150, 105, 0.60)',
  },
  {
    id: 'gold',
    name: 'Imperial Shogun',
    color: '#d97706',
    glowColor: 'rgba(217, 119, 6, 0.60)',
  },
  {
    id: 'shadow',
    name: 'Shadow Lord',
    color: '#9333ea',
    glowColor: 'rgba(147, 51, 234, 0.60)',
  },
];

// ---------------------------------------------------------------------------
// 5. Other Popular Presets
// ---------------------------------------------------------------------------
export const CYBERPUNK_VARIANTS: CursorVariant[] = [
  { id: 'cyan', name: 'Night City Cyan', color: '#00f0ff', glowColor: 'rgba(0, 240, 255, 0.55)' },
  { id: 'matrix', name: 'Matrix Green', color: '#22c55e', glowColor: 'rgba(34, 197, 94, 0.55)' },
  { id: 'red', name: 'Arasaka Red', color: '#ff003c', glowColor: 'rgba(255, 0, 60, 0.55)' },
  { id: 'yellow', name: 'Cyber Gold', color: '#facc15', glowColor: 'rgba(250, 204, 21, 0.55)' },
];

export const MAGIC_WAND_VARIANTS: CursorVariant[] = [
  { id: 'starlight', name: 'Starlight', color: '#fde047', glowColor: 'rgba(253, 224, 71, 0.55)' },
  { id: 'celestial', name: 'Celestial', color: '#c084fc', glowColor: 'rgba(192, 132, 252, 0.55)' },
  { id: 'frost', name: 'Frost', color: '#38bdf8', glowColor: 'rgba(56, 189, 248, 0.55)' },
];

export const CURSOR_PRESETS: CursorPreset[] = [
  {
    id: 'minecraft-sword',
    name: 'Minecraft Sword',
    tag: '1:1 Pixel Art',
    description:
      'Authentic 1:1 pixel art Minecraft sword with diamond block hover effect and materials',
    category: 'gaming',
    variants: MINECRAFT_TOOL_VARIANTS,
    defaultVariant: 'diamond',
    hotspots: {
      default: [0, 0],
      pointer: [0, 0],
      text: [8, 16],
      grab: [0, 0],
      grabbing: [0, 0],
      'not-allowed': [0, 0],
    },
  },
  {
    id: 'minecraft-pickaxe',
    name: 'Minecraft Pickaxe',
    tag: '1:1 Pixel Tool',
    description: 'Authentic pixel pickaxe with obsidian mining on hover and all materials',
    category: 'gaming',
    variants: MINECRAFT_TOOL_VARIANTS,
    defaultVariant: 'diamond',
    hotspots: {
      default: [0, 0],
      pointer: [0, 0],
      text: [8, 16],
      grab: [0, 0],
      grabbing: [0, 0],
      'not-allowed': [0, 0],
    },
  },
  {
    id: 'minecraft-axe',
    name: 'Minecraft Axe',
    tag: '1:1 Pixel Weapon',
    description: 'Legendary battle axe with birch log chopping on hover and all materials',
    category: 'gaming',
    variants: MINECRAFT_TOOL_VARIANTS,
    defaultVariant: 'diamond',
    hotspots: {
      default: [0, 0],
      pointer: [0, 0],
      text: [8, 16],
      grab: [0, 0],
      grabbing: [0, 0],
      'not-allowed': [0, 0],
    },
  },
  {
    id: 'dota2',
    name: 'Dota 2 Classic',
    tag: '1:1 Official Pack',
    description:
      'Authentic official Dota 2 cursor pack (Default, Pointer, Text, Grab, Not-allowed)',
    category: 'gaming',
    variants: DOTA2_VARIANTS,
    defaultVariant: 'classic',
    hotspots: {
      default: [4, 4],
      pointer: [4, 4],
      text: [24, 24],
      grab: [16, 16],
      grabbing: [16, 16],
      'not-allowed': [4, 4],
    },
  },
  {
    id: 'pixel-3d',
    name: '3D Pixel Cursor',
    tag: 'Voluminous 3D',
    description: 'Volumetric pixel cursor with neon extrusion and 3D gauntlet pointer',
    category: 'retro',
    variants: PIXEL_3D_VARIANTS,
    defaultVariant: 'cyber',
    hotspots: {
      default: [2, 2],
      pointer: [6, 2],
      text: [8, 16],
      grab: [10, 10],
      grabbing: [10, 10],
      'not-allowed': [2, 2],
    },
  },
  {
    id: 'katana',
    name: 'Realistic Katana',
    tag: 'Samurai Steel',
    description: 'Detailed samurai blade with traditional tsukamaki wrap and hamon line',
    category: 'anime',
    variants: KATANA_VARIANTS,
    defaultVariant: 'crimson',
    hotspots: {
      default: [2, 2],
      pointer: [2, 2],
      text: [8, 16],
      grab: [12, 12],
      grabbing: [2, 2],
      'not-allowed': [2, 2],
    },
  },
  {
    id: 'cyberpunk-crosshair',
    name: 'Cyberpunk Crosshair',
    tag: 'Sci-Fi HUD',
    description: 'Tactical cybernetic holographic crosshair with target lock-on',
    category: 'cyber',
    variants: CYBERPUNK_VARIANTS,
    defaultVariant: 'cyan',
    hotspots: {
      default: [16, 16],
      pointer: [16, 16],
      text: [8, 16],
      grab: [16, 16],
      grabbing: [16, 16],
      'not-allowed': [16, 16],
    },
  },
  {
    id: 'magic-wand',
    name: 'Magic Wand',
    tag: 'Stardust',
    description: 'Crystal magic wand with stardust crystal and shimmering particles',
    category: 'anime',
    variants: MAGIC_WAND_VARIANTS,
    defaultVariant: 'starlight',
    hotspots: {
      default: [3, 3],
      pointer: [3, 3],
      text: [8, 16],
      grab: [16, 16],
      grabbing: [3, 3],
      'not-allowed': [3, 3],
    },
  },
];

// Helper to resolve Minecraft Material
function getMinecraftMaterial(variantId: string): MinecraftMaterial {
  return MINECRAFT_MATERIALS.find((m) => m.id === variantId) || MINECRAFT_MATERIALS[0];
}

// ---------------------------------------------------------------------------
// 1. MINECRAFT SWORD (Exact 1:1 Pixel from Image 1)
// ---------------------------------------------------------------------------
function renderMinecraftSword(variantId: string, state: CursorStateType, size: number): string {
  const m = getMinecraftMaterial(variantId);
  const isPointer = state === 'pointer';
  const isGrabbing = state === 'grabbing';

  // Common Minecraft wood hilt colors
  const wood = '#854d0e';
  const woodDark = '#451a03';
  const guard = m.outline;
  const guardMid = m.dark;

  if (state === 'text') {
    // Pixelated Minecraft themed I-Beam
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges">
      <!-- Top Bracket -->
      <rect x="5" y="1" width="6" height="2" fill="${m.outline}"/>
      <rect x="6" y="1" width="4" height="1" fill="${m.mid}"/>
      <!-- Vertical Shaft -->
      <rect x="7" y="3" width="2" height="10" fill="${m.mid}"/>
      <rect x="6" y="3" width="1" height="10" fill="${m.outline}"/>
      <rect x="9" y="3" width="1" height="10" fill="${m.dark}"/>
      <!-- Bottom Bracket -->
      <rect x="5" y="13" width="6" height="2" fill="${m.outline}"/>
      <rect x="6" y="14" width="4" height="1" fill="${m.mid}"/>
    </svg>`;
  }

  // Tilt/transform for pointer / grabbing attack
  const glow = isPointer
    ? `<filter id="mg" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="1.2" flood-color="${m.mid}" flood-opacity="0.95"/></filter>`
    : `<filter id="mg" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0.5" dy="0.5" stdDeviation="0.4" flood-color="#000000" flood-opacity="0.5"/></filter>`;

  const rotation = isGrabbing ? 'rotate(15 8 8)' : isPointer ? 'rotate(-6 2 2)' : '';

  // Sparkle stars in pointer state
  const sparkles = isPointer
    ? `<rect x="0" y="3" width="1" height="1" fill="#ffffff"/>
       <rect x="3" y="0" width="1" height="1" fill="#ffffff"/>
       <rect x="4" y="2" width="1" height="1" fill="${m.light}"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <defs>${glow}</defs>
    <g filter="url(#mg)" transform="${rotation}">
      <!-- Blade Tip (1:1 from screenshot) -->
      <rect x="1" y="1" width="2" height="1" fill="${m.outline}"/>
      <rect x="1" y="2" width="1" height="1" fill="${m.outline}"/>
      <rect x="2" y="2" width="2" height="1" fill="${m.light}"/>
      <rect x="4" y="2" width="1" height="1" fill="${m.outline}"/>

      <rect x="2" y="3" width="1" height="1" fill="${m.outline}"/>
      <rect x="3" y="3" width="1" height="1" fill="${m.light}"/>
      <rect x="4" y="3" width="1" height="1" fill="${m.mid}"/>
      <rect x="5" y="3" width="1" height="1" fill="${m.outline}"/>

      <rect x="3" y="4" width="1" height="1" fill="${m.outline}"/>
      <rect x="4" y="4" width="1" height="1" fill="${m.light}"/>
      <rect x="5" y="4" width="1" height="1" fill="${m.mid}"/>
      <rect x="6" y="4" width="1" height="1" fill="${m.dark}"/>
      <rect x="7" y="4" width="1" height="1" fill="${m.outline}"/>

      <rect x="4" y="5" width="1" height="1" fill="${m.outline}"/>
      <rect x="5" y="5" width="1" height="1" fill="${m.light}"/>
      <rect x="6" y="5" width="1" height="1" fill="${m.mid}"/>
      <rect x="7" y="5" width="1" height="1" fill="${m.dark}"/>
      <rect x="8" y="5" width="1" height="1" fill="${m.outline}"/>

      <rect x="5" y="6" width="1" height="1" fill="${m.outline}"/>
      <rect x="6" y="6" width="1" height="1" fill="${m.light}"/>
      <rect x="7" y="6" width="1" height="1" fill="${m.mid}"/>
      <rect x="8" y="6" width="1" height="1" fill="${m.dark}"/>
      <rect x="9" y="6" width="1" height="1" fill="${m.outline}"/>

      <rect x="6" y="7" width="1" height="1" fill="${m.outline}"/>
      <rect x="7" y="7" width="1" height="1" fill="${m.light}"/>
      <rect x="8" y="7" width="1" height="1" fill="${m.mid}"/>
      <rect x="9" y="7" width="1" height="1" fill="${m.dark}"/>
      <rect x="10" y="7" width="1" height="1" fill="${m.outline}"/>

      <rect x="7" y="8" width="1" height="1" fill="${m.outline}"/>
      <rect x="8" y="8" width="1" height="1" fill="${m.light}"/>
      <rect x="9" y="8" width="1" height="1" fill="${m.mid}"/>
      <rect x="10" y="8" width="1" height="1" fill="${m.dark}"/>
      <rect x="11" y="8" width="1" height="1" fill="${m.outline}"/>

      <!-- Guard Upper Wing -->
      <rect x="10" y="5" width="2" height="1" fill="${guard}"/>
      <rect x="10" y="6" width="1" height="1" fill="${guard}"/>
      <rect x="11" y="6" width="1" height="1" fill="${guardMid}"/>
      <rect x="12" y="6" width="1" height="1" fill="${guard}"/>
      <rect x="11" y="7" width="1" height="1" fill="${guard}"/>
      <rect x="12" y="7" width="1" height="1" fill="${guardMid}"/>
      <rect x="13" y="7" width="1" height="1" fill="${guard}"/>

      <!-- Guard Lower Wing -->
      <rect x="5" y="10" width="1" height="2" fill="${guard}"/>
      <rect x="6" y="10" width="1" height="1" fill="${guard}"/>
      <rect x="6" y="11" width="1" height="1" fill="${guardMid}"/>
      <rect x="6" y="12" width="1" height="1" fill="${guard}"/>
      <rect x="7" y="11" width="1" height="1" fill="${guard}"/>
      <rect x="7" y="12" width="1" height="1" fill="${guardMid}"/>
      <rect x="7" y="13" width="1" height="1" fill="${guard}"/>

      <!-- Guard Center -->
      <rect x="8" y="9" width="1" height="1" fill="${guard}"/>
      <rect x="9" y="9" width="1" height="1" fill="${guardMid}"/>
      <rect x="10" y="9" width="1" height="1" fill="${guard}"/>
      <rect x="9" y="10" width="1" height="1" fill="${guard}"/>

      <!-- Handle Wood -->
      <rect x="10" y="10" width="1" height="1" fill="${wood}"/>
      <rect x="11" y="10" width="1" height="1" fill="${woodDark}"/>
      <rect x="11" y="11" width="1" height="1" fill="${wood}"/>
      <rect x="12" y="11" width="1" height="1" fill="${woodDark}"/>
      <rect x="12" y="12" width="1" height="1" fill="${wood}"/>

      <!-- Pommel -->
      <rect x="12" y="14" width="2" height="1" fill="${guard}"/>
      <rect x="14" y="12" width="1" height="2" fill="${guard}"/>
      <rect x="13" y="13" width="1" height="1" fill="${m.light}"/>
      <rect x="13" y="12" width="1" height="1" fill="${guard}"/>
      <rect x="14" y="14" width="1" height="1" fill="${guard}"/>
      ${sparkles}
    </g>
  </svg>`;
}

// ---------------------------------------------------------------------------
// 2. MINECRAFT PICKAXE (Authentic 16x16 Tool)
// ---------------------------------------------------------------------------
function renderMinecraftPickaxe(variantId: string, state: CursorStateType, size: number): string {
  const m = getMinecraftMaterial(variantId);
  const isPointer = state === 'pointer';
  const isGrabbing = state === 'grabbing';

  const wood = '#854d0e';
  const woodDark = '#451a03';

  if (state === 'text') {
    return renderMinecraftSword(variantId, 'text', size);
  }

  const glow = isPointer
    ? `<filter id="mpg" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="1.2" flood-color="${m.mid}" flood-opacity="0.95"/></filter>`
    : `<filter id="mpg" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0.5" dy="0.5" stdDeviation="0.4" flood-color="#000000" flood-opacity="0.5"/></filter>`;

  const transform = isGrabbing ? 'rotate(20 8 8)' : isPointer ? 'rotate(-12 3 3)' : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <defs>${glow}</defs>
    <g filter="url(#mpg)" transform="${transform}">
      <!-- Pickaxe Arch Head -->
      <!-- Left Pick Point -->
      <rect x="1" y="5" width="1" height="2" fill="${m.outline}"/>
      <rect x="2" y="4" width="1" height="2" fill="${m.outline}"/>
      <rect x="2" y="5" width="1" height="1" fill="${m.light}"/>

      <rect x="3" y="3" width="1" height="2" fill="${m.outline}"/>
      <rect x="3" y="4" width="1" height="1" fill="${m.light}"/>

      <rect x="4" y="2" width="2" height="1" fill="${m.outline}"/>
      <rect x="4" y="3" width="1" height="1" fill="${m.light}"/>
      <rect x="4" y="4" width="1" height="1" fill="${m.mid}"/>

      <!-- Center Arch Top -->
      <rect x="5" y="1" width="3" height="1" fill="${m.outline}"/>
      <rect x="5" y="2" width="2" height="1" fill="${m.light}"/>
      <rect x="7" y="2" width="1" height="1" fill="${m.mid}"/>
      <rect x="5" y="3" width="1" height="1" fill="${m.mid}"/>
      <rect x="6" y="3" width="2" height="1" fill="${m.dark}"/>

      <!-- Right Pick Point -->
      <rect x="8" y="1" width="2" height="1" fill="${m.outline}"/>
      <rect x="8" y="2" width="1" height="1" fill="${m.mid}"/>
      <rect x="9" y="2" width="1" height="1" fill="${m.outline}"/>
      <rect x="9" y="3" width="1" height="1" fill="${m.mid}"/>
      <rect x="10" y="3" width="1" height="1" fill="${m.outline}"/>
      <rect x="10" y="4" width="1" height="1" fill="${m.dark}"/>
      <rect x="11" y="4" width="1" height="1" fill="${m.outline}"/>
      <rect x="11" y="5" width="1" height="1" fill="${m.dark}"/>
      <rect x="12" y="5" width="1" height="2" fill="${m.outline}"/>

      <!-- Collar -->
      <rect x="5" y="4" width="2" height="1" fill="${m.outline}"/>
      <rect x="6" y="5" width="1" height="1" fill="${m.dark}"/>
      <rect x="7" y="4" width="1" height="2" fill="${m.outline}"/>

      <!-- Handle -->
      <rect x="6" y="6" width="1" height="1" fill="${wood}"/>
      <rect x="7" y="6" width="1" height="1" fill="${woodDark}"/>
      <rect x="7" y="7" width="1" height="1" fill="${wood}"/>
      <rect x="8" y="7" width="1" height="1" fill="${woodDark}"/>
      <rect x="8" y="8" width="1" height="1" fill="${wood}"/>
      <rect x="9" y="8" width="1" height="1" fill="${woodDark}"/>
      <rect x="9" y="9" width="1" height="1" fill="${wood}"/>
      <rect x="10" y="9" width="1" height="1" fill="${woodDark}"/>
      <rect x="10" y="10" width="1" height="1" fill="${wood}"/>
      <rect x="11" y="10" width="1" height="1" fill="${woodDark}"/>
      <rect x="11" y="11" width="1" height="1" fill="${wood}"/>
      <rect x="12" y="11" width="1" height="1" fill="${woodDark}"/>
      <rect x="12" y="12" width="1" height="1" fill="${wood}"/>
      <rect x="13" y="12" width="1" height="1" fill="${woodDark}"/>
      <rect x="13" y="13" width="1" height="1" fill="${wood}"/>
    </g>
  </svg>`;
}

// ---------------------------------------------------------------------------
// 3. MINECRAFT AXE (Authentic 16x16 Tool)
// ---------------------------------------------------------------------------
function renderMinecraftAxe(variantId: string, state: CursorStateType, size: number): string {
  const m = getMinecraftMaterial(variantId);
  const isPointer = state === 'pointer';
  const isGrabbing = state === 'grabbing';

  const wood = '#854d0e';
  const woodDark = '#451a03';

  if (state === 'text') {
    return renderMinecraftSword(variantId, 'text', size);
  }

  const glow = isPointer
    ? `<filter id="mag" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="1.2" flood-color="${m.mid}" flood-opacity="0.95"/></filter>`
    : `<filter id="mag" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0.5" dy="0.5" stdDeviation="0.4" flood-color="#000000" flood-opacity="0.5"/></filter>`;

  const transform = isGrabbing ? 'rotate(20 8 8)' : isPointer ? 'rotate(-10 3 3)' : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <defs>${glow}</defs>
    <g filter="url(#mag)" transform="${transform}">
      <!-- Axe Blade Bit (Left Cutting Edge) -->
      <rect x="2" y="1" width="3" height="1" fill="${m.outline}"/>
      <rect x="1" y="2" width="1" height="4" fill="${m.outline}"/>
      <rect x="2" y="2" width="2" height="1" fill="${m.light}"/>
      <rect x="4" y="2" width="2" height="1" fill="${m.mid}"/>
      <rect x="6" y="2" width="1" height="1" fill="${m.outline}"/>

      <rect x="2" y="3" width="1" height="1" fill="${m.light}"/>
      <rect x="3" y="3" width="2" height="1" fill="${m.mid}"/>
      <rect x="5" y="3" width="1" height="1" fill="${m.dark}"/>
      <rect x="6" y="3" width="1" height="1" fill="${m.outline}"/>

      <rect x="2" y="4" width="1" height="1" fill="${m.light}"/>
      <rect x="3" y="4" width="2" height="1" fill="${m.mid}"/>
      <rect x="5" y="4" width="1" height="1" fill="${m.dark}"/>

      <rect x="2" y="5" width="1" height="1" fill="${m.outline}"/>
      <rect x="3" y="5" width="2" height="1" fill="${m.dark}"/>
      <rect x="5" y="5" width="1" height="1" fill="${m.outline}"/>

      <!-- Back Poll (Hammer side) -->
      <rect x="7" y="2" width="2" height="1" fill="${m.outline}"/>
      <rect x="7" y="3" width="1" height="1" fill="${m.dark}"/>
      <rect x="8" y="3" width="1" height="1" fill="${m.outline}"/>
      <rect x="6" y="4" width="2" height="1" fill="${m.dark}"/>
      <rect x="8" y="4" width="1" height="1" fill="${m.outline}"/>
      <rect x="7" y="5" width="1" height="1" fill="${m.outline}"/>

      <!-- Handle -->
      <rect x="5" y="5" width="1" height="1" fill="${wood}"/>
      <rect x="6" y="6" width="1" height="1" fill="${wood}"/>
      <rect x="7" y="6" width="1" height="1" fill="${woodDark}"/>
      <rect x="7" y="7" width="1" height="1" fill="${wood}"/>
      <rect x="8" y="7" width="1" height="1" fill="${woodDark}"/>
      <rect x="8" y="8" width="1" height="1" fill="${wood}"/>
      <rect x="9" y="8" width="1" height="1" fill="${woodDark}"/>
      <rect x="9" y="9" width="1" height="1" fill="${wood}"/>
      <rect x="10" y="9" width="1" height="1" fill="${woodDark}"/>
      <rect x="10" y="10" width="1" height="1" fill="${wood}"/>
      <rect x="11" y="10" width="1" height="1" fill="${woodDark}"/>
      <rect x="11" y="11" width="1" height="1" fill="${wood}"/>
      <rect x="12" y="11" width="1" height="1" fill="${woodDark}"/>
      <rect x="12" y="12" width="1" height="1" fill="${wood}"/>
      <rect x="13" y="12" width="1" height="1" fill="${woodDark}"/>
      <rect x="13" y="13" width="1" height="1" fill="${wood}"/>
    </g>
  </svg>`;
}

// ---------------------------------------------------------------------------
// 4. DOTA 2 CURSOR PACK (Image 3: Metallic Bevel, Wrath of Ka, Runic I-Beam)
// ---------------------------------------------------------------------------
function renderDota2(variantId: string, state: CursorStateType, size: number): string {
  const isWrathOfKa = variantId === 'wrath-of-ka';
  const isCrimson = variantId === 'crimson';
  const isGold = variantId === 'gold';

  const gemColor = isWrathOfKa ? '#22c55e' : isCrimson ? '#ff003c' : isGold ? '#fbbf24' : '#00f0ff';

  const glowAura = isWrathOfKa
    ? 'rgba(34, 197, 94, 0.65)'
    : isCrimson
      ? 'rgba(255, 0, 60, 0.65)'
      : isGold
        ? 'rgba(251, 191, 36, 0.65)'
        : 'rgba(0, 240, 255, 0.65)';

  if (state === 'text') {
    // Authentic Glowing Dota 2 Runic I-Beam (from Image 3)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
      <defs>
        <filter id="dtext" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="${gemColor}" flood-opacity="0.9"/>
        </filter>
      </defs>
      <g filter="url(#dtext)">
        <!-- Top Crosspiece -->
        <polygon points="10,6 22,6 20,8 12,8" fill="#e2e8f0" stroke="#090d16" stroke-width="0.8"/>
        <line x1="9" y1="6" x2="23" y2="6" stroke="${gemColor}" stroke-width="1.2" stroke-linecap="round"/>
        <!-- Shaft -->
        <rect x="15" y="8" width="2" height="16" fill="#ffffff"/>
        <line x1="16" y1="8" x2="16" y2="24" stroke="${gemColor}" stroke-width="2.5" stroke-opacity="0.8"/>
        <!-- Bottom Crosspiece -->
        <polygon points="10,26 22,26 20,24 12,24" fill="#e2e8f0" stroke="#090d16" stroke-width="0.8"/>
        <line x1="9" y1="26" x2="23" y2="26" stroke="${gemColor}" stroke-width="1.2" stroke-linecap="round"/>
        <!-- Rune Sparkle -->
        <circle cx="16" cy="16" r="2" fill="#ffffff" stroke="${gemColor}" stroke-width="0.8"/>
      </g>
    </svg>`;
  }

  if (state === 'pointer' && isWrathOfKa) {
    // Authentic Wrath of Ka Spectral Ethereal Hand (from Image 3)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
      <defs>
        <filter id="wglow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#22c55e" flood-opacity="0.95"/>
          <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="#052e16" flood-opacity="0.8"/>
        </filter>
      </defs>
      <g filter="url(#wglow)">
        <!-- Spectral Hand Shape (Image 3) -->
        <path d="M4 2 L8 2 L9 9 L11 9 L12 12 L13 13 L15 14 L17 17 L16 23 L11 25 L8 22 L6 16 L2 9 Z" fill="#22c55e" stroke="#022c12" stroke-width="1.5" stroke-linejoin="round"/>
        <!-- Inner Spectral Bones -->
        <path d="M6 3 L7 10 L10 13 L12 18 L12 22" fill="none" stroke="#bbf7d0" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="10" y1="10" x2="14" y2="15" stroke="#bbf7d0" stroke-width="1" stroke-linecap="round"/>
        <circle cx="6" cy="3" r="1.5" fill="#ffffff"/>
      </g>
    </svg>`;
  }

  // Classic Dota 2 Metal Arrowhead / Attack Pointer
  const isPointer = state === 'pointer';
  const arrowColor = isPointer && isCrimson ? '#ff003c' : '#ffffff';
  const filterId = `dglow_${variantId}_${state}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
    <defs>
      <filter id="${filterId}" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="${isPointer ? 2.5 : 1.2}" flood-color="${glowAura}" flood-opacity="0.9"/>
        <feDropShadow dx="1" dy="2" stdDeviation="1.2" flood-color="#020617" flood-opacity="0.75"/>
      </filter>
      <linearGradient id="dsteel" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="35%" stop-color="#cbd5e1"/>
        <stop offset="70%" stop-color="#64748b"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
      <linearGradient id="dmetal" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#334155"/>
        <stop offset="60%" stop-color="#94a3b8"/>
        <stop offset="100%" stop-color="#f8fafc"/>
      </linearGradient>
    </defs>
    <g filter="url(#${filterId})">
      <!-- Outer Metal Body Facet Left -->
      <polygon points="1,1 1,22 8,17 12,25 15,24 11,16 19,16" fill="url(#dsteel)" stroke="#090d16" stroke-width="1.6" stroke-linejoin="round"/>
      <!-- Inner Bevel Facet Right -->
      <polygon points="2,2 18,16 11,16 15,24 13,25 9,17 2,21" fill="url(#dmetal)"/>
      <!-- Center Glowing Gem / Socket -->
      <polygon points="5,7 10,12 8,14 3,9" fill="${gemColor}" stroke="#090d16" stroke-width="0.8"/>
      <circle cx="6.5" cy="10.5" r="1.5" fill="#ffffff"/>
      <!-- Specular Spine -->
      <line x1="2" y1="2" x2="11" y2="16" stroke="${arrowColor}" stroke-width="1" stroke-linecap="round"/>
    </g>
  </svg>`;
}

// ---------------------------------------------------------------------------
// 5. 3D PIXEL CURSOR (Exact 1:1 Replica from Image 4)
// ---------------------------------------------------------------------------
function renderPixel3D(variantId: string, state: CursorStateType, size: number): string {
  // Extrusion colors from screenshot:
  let extrudeLight = '#ec4899'; // Magenta / Pink
  let extrudeMid = '#a855f7'; // Violet
  let extrudeDark = '#581c87'; // Deep purple

  if (variantId === 'cyan') {
    extrudeLight = '#38bdf8';
    extrudeMid = '#06b6d4';
    extrudeDark = '#164e63';
  } else if (variantId === 'lime') {
    extrudeLight = '#a3e635';
    extrudeMid = '#65a30d';
    extrudeDark = '#365314';
  } else if (variantId === 'amber') {
    extrudeLight = '#fbbf24';
    extrudeMid = '#f97316';
    extrudeDark = '#7c2d12';
  }

  const faceDark = '#161324';
  const faceMid = '#262238';
  const faceHighlight = '#ffffff';

  if (state === 'pointer') {
    // 3D Pointing Pixel Hand (Exact Right Side of Image 4)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32" shape-rendering="crispEdges">
      <defs>
        <filter id="p3dg" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
      </defs>
      <g filter="url(#p3dg)">
        <!-- 3D Extruded Depth Blocks (Down & Right) -->
        <path d="M9 3 L10 3 L10 14 L12 14 L12 11 L14 11 L14 15 L16 15 L16 12 L18 12 L18 16 L20 16 L20 13 L22 13 L22 22 L17 27 L9 27 L6 24 L6 19 L4 19 L4 14 L6 14 L6 3 Z" fill="${extrudeDark}"/>
        <path d="M8 4 L9 4 L9 15 L11 15 L11 12 L13 12 L13 16 L15 16 L15 13 L17 13 L17 17 L19 17 L19 14 L21 14 L21 21 L16 26 L8 26 L5 23 L5 18 L3 18 L3 15 L5 15 L5 4 Z" fill="${extrudeMid}"/>
        <path d="M7 3 L8 3 L8 14 L10 14 L10 11 L12 11 L12 15 L14 15 L14 12 L16 12 L16 16 L18 16 L18 13 L20 13 L20 20 L15 25 L7 25 L4 22 L4 17 L2 17 L2 14 L4 14 L4 3 Z" fill="${extrudeLight}"/>

        <!-- Top Face (Charcoal Obsidian from Screenshot) -->
        <!-- Index Finger -->
        <rect x="5" y="2" width="3" height="12" fill="${faceDark}"/>
        <rect x="5" y="2" width="1" height="12" fill="${faceHighlight}"/>
        <!-- Middle Finger -->
        <rect x="9" y="8" width="3" height="7" fill="${faceDark}"/>
        <!-- Ring Finger -->
        <rect x="13" y="9" width="3" height="7" fill="${faceDark}"/>
        <!-- Pinky -->
        <rect x="17" y="10" width="3" height="6" fill="${faceDark}"/>
        <!-- Thumb -->
        <rect x="2" y="12" width="3" height="5" fill="${faceDark}"/>
        <rect x="2" y="12" width="1" height="4" fill="${faceHighlight}"/>
        <!-- Palm Body -->
        <rect x="5" y="14" width="15" height="7" fill="${faceDark}"/>
        <rect x="7" y="21" width="11" height="3" fill="${faceMid}"/>
      </g>
    </svg>`;
  }

  // 3D Isometric Extruded Arrow (Exact Left Side of Image 4)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32" shape-rendering="crispEdges">
    <defs>
      <filter id="p3da" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.6"/>
      </filter>
    </defs>
    <g filter="url(#p3da)">
      <!-- 3D Extruded Layers (Bottom-Right) -->
      <!-- Dark Extrusion Base -->
      <polygon points="5,5 5,26 11,20 16,30 20,28 15,18 24,18" fill="${extrudeDark}" transform="translate(3, 3)"/>
      <!-- Mid Violet Extrusion -->
      <polygon points="4,4 4,25 10,19 15,29 19,27 14,17 23,17" fill="${extrudeMid}" transform="translate(2, 2)"/>
      <!-- Bright Pink Extrusion Lip -->
      <polygon points="3,3 3,24 9,18 14,28 18,26 13,16 22,16" fill="${extrudeLight}" transform="translate(1, 1)"/>

      <!-- Obsidian Face -->
      <polygon points="2,2 2,23 8,17 13,27 17,25 12,15 21,15" fill="${faceDark}"/>
      <polygon points="4,4 4,18 7,15 11,23 13,22 9,14 17,14" fill="${faceMid}"/>

      <!-- White Specular Highlight Ridge (Top-Left) -->
      <polyline points="2,2 2,22" stroke="${faceHighlight}" stroke-width="1.2"/>
      <polyline points="2,2 20,15" stroke="${faceHighlight}" stroke-width="1.2"/>
    </g>
  </svg>`;
}

// ---------------------------------------------------------------------------
// 6. REALISTIC KATANA (Image 5: Polished Steel, Menuki Diamonds, Dynamic Wrap)
// ---------------------------------------------------------------------------
function renderRealisticKatana(variantId: string, state: CursorStateType, size: number): string {
  const v = KATANA_VARIANTS.find((x) => x.id === variantId) || KATANA_VARIANTS[0];
  const wrapColor = v.color; // Changes dynamically with variants!
  const isPointer = state === 'pointer';
  const isGrabbing = state === 'grabbing';

  // Hamon & Glint effects
  const glint = isPointer
    ? `<g transform="translate(3, 3)">
         <line x1="-5" y1="0" x2="5" y2="0" stroke="#ffffff" stroke-width="1.5"/>
         <line x1="0" y1="-5" x2="0" y2="5" stroke="#ffffff" stroke-width="1.5"/>
         <circle cx="0" cy="0" r="2" fill="${wrapColor}"/>
       </g>`
    : '';

  const rotation = isGrabbing ? 'rotate(15 16 16)' : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
    <defs>
      <filter id="katglow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="${isPointer ? 2.5 : 1}" flood-color="${wrapColor}" flood-opacity="0.8"/>
        <feDropShadow dx="1" dy="1" stdDeviation="0.8" flood-color="#000000" flood-opacity="0.5"/>
      </filter>
      <!-- Polished Realistic Steel Gradient -->
      <linearGradient id="bladeSteel" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="35%" stop-color="#f8fafc"/>
        <stop offset="65%" stop-color="#cbd5e1"/>
        <stop offset="100%" stop-color="#475569"/>
      </linearGradient>
    </defs>
    <g filter="url(#katglow)" transform="${rotation}">
      <!-- 1. Realistic Steel Blade with Kissaki (Tip) -->
      <path d="M2 2 L4.5 1 L17 13.5 L15 16 Z" fill="url(#bladeSteel)" stroke="#1e293b" stroke-width="0.8" stroke-linejoin="round"/>
      <!-- Polished Cutting Edge Line (Sharpened Razor Edge) -->
      <line x1="2" y1="2" x2="15" y2="15" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>
      <!-- Shinogi Ridge -->
      <line x1="3.2" y1="1.8" x2="16.5" y2="15" stroke="#94a3b8" stroke-width="0.8"/>

      <!-- 2. Habaki (Brass Collar) -->
      <rect x="15" y="13.5" width="3.2" height="3.2" transform="rotate(45 16.6 15.1)" fill="#f59e0b" stroke="#78350f" stroke-width="0.6"/>

      <!-- 3. Tsuba (Iron Guard Disc) -->
      <ellipse cx="17.8" cy="17.8" rx="4.5" ry="2.4" transform="rotate(45 17.8 17.8)" fill="#1e293b" stroke="#0f172a" stroke-width="0.9"/>
      <ellipse cx="17.8" cy="17.8" rx="4" ry="1.9" transform="rotate(45 17.8 17.8)" fill="none" stroke="#f59e0b" stroke-width="0.5"/>

      <!-- 4. Tsuka (Handle with Authentic Tsukamaki Wrap & Menuki Diamonds) -->
      <!-- Handle Core Wrap (Vibrant Variant Color) -->
      <line x1="19" y1="19" x2="28" y2="28" stroke="${wrapColor}" stroke-width="4.2" stroke-linecap="round"/>
      <!-- Diamond Menuki Pattern (Rhombus Cutouts) -->
      <polygon points="20.5,20.5 21.2,19.8 21.9,20.5 21.2,21.2" fill="#ffffff"/>
      <polygon points="23,23 23.7,22.3 24.4,23 23.7,23.7" fill="#ffffff"/>
      <polygon points="25.5,25.5 26.2,24.8 26.9,25.5 26.2,26.2" fill="#ffffff"/>
      <!-- Black Ito Cord Cross Bands -->
      <line x1="19" y1="19" x2="28" y2="28" stroke="#09090b" stroke-width="4.2" stroke-dasharray="1.5 2.2" stroke-linecap="round"/>

      <!-- 5. Kashira (Pommel Cap) -->
      <line x1="27.8" y1="27.8" x2="28.8" y2="28.8" stroke="#1e293b" stroke-width="4.2" stroke-linecap="butt"/>
      ${glint}
    </g>
  </svg>`;
}

// ---------------------------------------------------------------------------
// 7. CYBERPUNK CROSSHAIR
// ---------------------------------------------------------------------------
function renderCyberpunkCrosshair(variantId: string, state: CursorStateType, size: number): string {
  const v = CYBERPUNK_VARIANTS.find((x) => x.id === variantId) || CYBERPUNK_VARIANTS[0];
  const c = v.color;
  const isPointer = state === 'pointer';
  const bracketLen = isPointer ? 7 : 5;
  const cornerOffset = isPointer ? 4 : 5;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
    <defs>
      <filter id="cg" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="${isPointer ? 2.5 : 1.2}" flood-color="${c}" flood-opacity="0.85"/>
      </filter>
    </defs>
    <g filter="url(#cg)">
      <circle cx="16" cy="16" r="${isPointer ? 2.5 : 1.75}" fill="${c}" stroke="#000000" stroke-width="0.5"/>
      <line x1="16" y1="9" x2="16" y2="12" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="16" y1="20" x2="16" y2="23" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="9" y1="16" x2="12" y2="16" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="20" y1="16" x2="23" y2="16" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
      <!-- Brackets -->
      <path d="M${16 - cornerOffset - bracketLen} ${16 - cornerOffset} H${16 - cornerOffset} V${16 - cornerOffset - bracketLen}" fill="none" stroke="${c}" stroke-width="1.75"/>
      <path d="M${16 + cornerOffset + bracketLen} ${16 - cornerOffset} H${16 + cornerOffset} V${16 - cornerOffset - bracketLen}" fill="none" stroke="${c}" stroke-width="1.75"/>
      <path d="M${16 - cornerOffset - bracketLen} ${16 + cornerOffset} H${16 - cornerOffset} V${16 + cornerOffset + bracketLen}" fill="none" stroke="${c}" stroke-width="1.75"/>
      <path d="M${16 + cornerOffset + bracketLen} ${16 + cornerOffset} H${16 + cornerOffset} V${16 + cornerOffset + bracketLen}" fill="none" stroke="${c}" stroke-width="1.75"/>
    </g>
  </svg>`;
}

// ---------------------------------------------------------------------------
// 8. MAGIC WAND
// ---------------------------------------------------------------------------
function renderMagicWand(variantId: string, state: CursorStateType, size: number): string {
  const v = MAGIC_WAND_VARIANTS.find((x) => x.id === variantId) || MAGIC_WAND_VARIANTS[0];
  const c = v.color;
  const isPointer = state === 'pointer';
  const starScale = isPointer ? 1.35 : 1;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
    <defs>
      <filter id="wg" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="${isPointer ? 2.8 : 1.5}" flood-color="${c}" flood-opacity="0.95"/>
      </filter>
    </defs>
    <g filter="url(#wg)">
      <line x1="8" y1="8" x2="27" y2="27" stroke="#92400e" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="8" y1="8" x2="16" y2="16" stroke="#fde047" stroke-width="2.2" stroke-linecap="round"/>
      <g transform="translate(6, 6) scale(${starScale}) translate(-6, -6)">
        <polygon points="6,0 7.5,4.5 12,6 7.5,7.5 6,12 4.5,7.5 0,6 4.5,4.5" fill="${c}" stroke="#ffffff" stroke-width="0.75"/>
        <circle cx="6" cy="6" r="1.5" fill="#ffffff"/>
      </g>
      <circle cx="12" cy="3" r="0.9" fill="${c}"/>
      <circle cx="3" cy="12" r="0.9" fill="${c}"/>
    </g>
  </svg>`;
}

// ---------------------------------------------------------------------------
// Master SVG Generator
// ---------------------------------------------------------------------------
export function generateCursorSvg(
  presetId: string,
  variantId = '',
  state: CursorStateType | boolean = 'default',
  size = 32,
): string {
  // Normalize boolean isPointer flag if passed from legacy call
  const resolvedState: CursorStateType =
    typeof state === 'boolean' ? (state ? 'pointer' : 'default') : state || 'default';

  switch (presetId) {
    case 'minecraft-sword':
      return renderMinecraftSword(variantId, resolvedState, size);
    case 'minecraft-pickaxe':
      return renderMinecraftPickaxe(variantId, resolvedState, size);
    case 'minecraft-axe':
      return renderMinecraftAxe(variantId, resolvedState, size);
    case 'dota2':
      return renderDota2(variantId, resolvedState, size);
    case 'pixel-3d':
      return renderPixel3D(variantId, resolvedState, size);
    case 'katana':
      return renderRealisticKatana(variantId, resolvedState, size);
    case 'cyberpunk-crosshair':
      return renderCyberpunkCrosshair(variantId, resolvedState, size);
    case 'magic-wand':
      return renderMagicWand(variantId, resolvedState, size);
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
        <polygon points="2,2 2,22 8,16 16,16" fill="#ffffff" stroke="#000000" stroke-width="1.5"/>
      </svg>`;
  }
}

export function getPresetPreviewImage(
  presetId: string,
  variantId = '',
  _isHovered = false,
): string | null {
  if (presetId === 'minecraft-sword') {
    const v = variantId || 'diamond';
    return `/cursors/mc_sword_${v}_64.png`;
  }
  if (presetId === 'minecraft-pickaxe') {
    const v = variantId || 'diamond';
    return `/cursors/mc_pickaxe_${v}_64.png`;
  }
  if (presetId === 'minecraft-axe') {
    const v = variantId || 'diamond';
    return `/cursors/mc_axe_${v}_64.png`;
  }
  if (presetId === 'dota2') {
    const v = variantId || 'classic';
    return `/cursors/dota2_${v === 'classic' ? 'default' : v}_64.png`;
  }
  return null;
}

/**
 * Returns formatted CSS Data URL string with hotspot coordinates.
 * For authentic Minecraft tools and Dota 2, uses 1:1 pixel art PNG data URLs.
 * For other presets, renders crisp high-performance SVG.
 */
export function getCursorCssValue(
  presetId: string,
  variantId = '',
  state: CursorStateType | boolean = 'default',
  size = 32,
): string {
  const resolvedState: CursorStateType =
    typeof state === 'boolean' ? (state ? 'pointer' : 'default') : state || 'default';

  const preset = CURSOR_PRESETS.find((p) => p.id === presetId);
  const fallback =
    resolvedState === 'pointer'
      ? 'pointer'
      : resolvedState === 'text'
        ? 'text'
        : resolvedState === 'grab'
          ? 'grab'
          : resolvedState === 'grabbing'
            ? 'grabbing'
            : resolvedState === 'not-allowed'
              ? 'not-allowed'
              : 'auto';

  // 1. Authentic PNG 1:1 Pixel Cursors (Minecraft & Dota 2)
  const isMinecraft =
    presetId === 'minecraft-sword' ||
    presetId === 'minecraft-pickaxe' ||
    presetId === 'minecraft-axe';

  const isDota = presetId === 'dota2';

  if (isMinecraft || isDota) {
    const isLarge = size > 32;
    const suffix = isLarge ? '_64.png' : '_32.png';
    const scale = isLarge ? 2 : 1;

    let baseHotspot: [number, number] = [0, 0];
    let assetKey = '';

    if (isMinecraft) {
      const tool =
        presetId === 'minecraft-sword'
          ? 'sword'
          : presetId === 'minecraft-pickaxe'
            ? 'pickaxe'
            : 'axe';
      const variant = variantId || 'diamond';
      baseHotspot = [0, 0];

      if (resolvedState === 'pointer') {
        assetKey = `mc_${tool}_${variant}_pointer${suffix}`;
      } else {
        assetKey = `mc_${tool}_${variant}${suffix}`;
      }
    } else if (isDota) {
      const variant = variantId || 'classic';
      if (resolvedState === 'pointer') {
        baseHotspot = [4, 4];
        assetKey =
          variant === 'classic' ? `dota2_pointer${suffix}` : `dota2_${variant}_pointer${suffix}`;
      } else if (resolvedState === 'text') {
        baseHotspot = [24, 24];
        assetKey = `dota2_text${suffix}`;
      } else if (resolvedState === 'grab' || resolvedState === 'grabbing') {
        baseHotspot = [16, 16];
        assetKey = `dota2_grab${suffix}`;
      } else if (resolvedState === 'not-allowed') {
        baseHotspot = [4, 4];
        assetKey = `dota2_not_allowed${suffix}`;
      } else {
        baseHotspot = [4, 4];
        assetKey = variant === 'classic' ? `dota2_default${suffix}` : `dota2_${variant}${suffix}`;
      }
    }

    const hX = baseHotspot[0] * scale;
    const hY = baseHotspot[1] * scale;

    const base64 = CURSOR_BASE64_ASSETS[assetKey];
    if (base64) {
      return `url("${base64}") ${hX} ${hY}, ${fallback}`;
    }
    return `url("/cursors/${assetKey}") ${hX} ${hY}, ${fallback}`;
  }

  // 2. Vector SVG presets (Pixel 3D, Katana, Cyberpunk, Magic Wand)
  let hotspot: [number, number] = [2, 2];
  if (preset) {
    hotspot = preset.hotspots[resolvedState] || preset.hotspots.default || [2, 2];
  }

  const scale = size / 32;
  const hX = Math.round(hotspot[0] * scale);
  const hY = Math.round(hotspot[1] * scale);

  const svg = generateCursorSvg(presetId, variantId, resolvedState, size);
  const encodedSvg = encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22');

  return `url("data:image/svg+xml,${encodedSvg}") ${hX} ${hY}, ${fallback}`;
}

/**
 * Applies cursor CSS custom properties directly to the DOM for all states.
 */
export function applyCursorToDOM(
  enabled: boolean,
  presetId: string,
  variantId = '',
  size = 32,
): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (!enabled || presetId === 'default') {
    root.removeAttribute('data-custom-cursor');
    root.removeAttribute('data-cursor-id');
    root.style.removeProperty('--custom-cursor-default');
    root.style.removeProperty('--custom-cursor-pointer');
    root.style.removeProperty('--custom-cursor-text');
    root.style.removeProperty('--custom-cursor-grab');
    root.style.removeProperty('--custom-cursor-grabbing');
    root.style.removeProperty('--custom-cursor-not-allowed');
    return;
  }

  const defaultCursorCss = getCursorCssValue(presetId, variantId, 'default', size);
  const pointerCursorCss = getCursorCssValue(presetId, variantId, 'pointer', size);
  const textCursorCss = getCursorCssValue(presetId, variantId, 'text', size);
  const grabCursorCss = getCursorCssValue(presetId, variantId, 'grab', size);
  const grabbingCursorCss = getCursorCssValue(presetId, variantId, 'grabbing', size);
  const notAllowedCursorCss = getCursorCssValue(presetId, variantId, 'not-allowed', size);

  root.setAttribute('data-custom-cursor', 'true');
  root.setAttribute('data-cursor-id', presetId);
  root.style.setProperty('--custom-cursor-default', defaultCursorCss);
  root.style.setProperty('--custom-cursor-pointer', pointerCursorCss);
  root.style.setProperty('--custom-cursor-text', textCursorCss);
  root.style.setProperty('--custom-cursor-grab', grabCursorCss);
  root.style.setProperty('--custom-cursor-grabbing', grabbingCursorCss);
  root.style.setProperty('--custom-cursor-not-allowed', notAllowedCursorCss);
}
