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
