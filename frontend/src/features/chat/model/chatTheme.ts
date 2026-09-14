export type BackgroundType = 'solid' | 'gradient' | 'image' | 'preset' | 'shader';
export type BubbleType = 'solid' | 'gradient' | 'preset';
export type BubbleShapeType =
  | 'default'
  | 'ios-classic'
  | 'telegram-modern'
  | 'cyber-glass'
  | 'retro-pixel'
  | 'gummy'
  | 'prisma'
  | 'capybara'
  | 'frog'
  | 'cat-dog'
  | 'doge'
  | 'dino'
  | 'heart-pepe'
  | 'liquid-neon'
  | 'star-bubble'
  | 'pink-cream'
  | 'sheetbook-note'
  | 'moon-bubble'
  | 'cloudy-bubble'
  | 'evil-bubble'
  | 'halo-bubble'
  | 'system-bubble';

export interface BubbleShapePreset {
  id: BubbleShapeType;
  name: string;
  subtitle: string;
  description: string;
  tag: string;
  category: 'animals' | 'fx' | 'classic';
  previewColors?: string[];
  recommendedType?: 'solid' | 'gradient';
  bubbleColor?: string;
  incomingBubbleColor?: string;
  gradientColors?: string[];
  textColor?: string;
}

export const BUBBLE_SHAPE_PRESETS: BubbleShapePreset[] = [
  // 1. TikTok Animals & Characters
  {
    id: 'capybara',
    name: 'Capybara',
    subtitle: 'Capybara with Tangerine',
    description: 'Cozy caramel bubble featuring a sleeping capybara with a tangerine on top',
    tag: 'TikTok Animal',
    category: 'animals',
    previewColors: ['#c58f59', '#a06a38'],
    recommendedType: 'solid',
    bubbleColor: '#b5804c',
    incomingBubbleColor: '#8a5c32',
    textColor: '#ffffff',
  },
  {
    id: 'frog',
    name: 'Frog',
    subtitle: 'Froggy Eyes',
    description: 'Emerald bubble with peeking frog eyes on top and an orange belly below',
    tag: 'TikTok Animal',
    category: 'animals',
    previewColors: ['#10b981', '#059669'],
    recommendedType: 'solid',
    bubbleColor: '#10b981',
    incomingBubbleColor: '#059669',
    textColor: '#ffffff',
  },
  {
    id: 'cat-dog',
    name: 'Cat & Dog',
    subtitle: 'Cat & Puppy',
    description: 'Pastel cream bubble with cute kitten and puppy in the top corners',
    tag: 'Cute Friends',
    category: 'animals',
    previewColors: ['#fef3c7', '#fde68a'],
    recommendedType: 'solid',
    bubbleColor: '#fef3c7',
    incomingBubbleColor: '#fde68a',
    textColor: '#78350f',
  },
  {
    id: 'doge',
    name: 'Doge',
    subtitle: 'Shiba Inu Doge',
    description: 'Golden bubble featuring the iconic Shiba Inu Doge with resting paws',
    tag: 'Meme Doge',
    category: 'animals',
    previewColors: ['#fbbf24', '#f59e0b'],
    recommendedType: 'solid',
    bubbleColor: '#fbbf24',
    incomingBubbleColor: '#f59e0b',
    textColor: '#451a03',
  },
  {
    id: 'dino',
    name: 'Dino',
    subtitle: 'Little Dino',
    description: 'Mint-teal bubble with friendly spikes and a cute little dino face',
    tag: 'Baby Dino',
    category: 'animals',
    previewColors: ['#14b8a6', '#0d9488'],
    recommendedType: 'solid',
    bubbleColor: '#14b8a6',
    incomingBubbleColor: '#0d9488',
    textColor: '#ffffff',
  },
  {
    id: 'heart-pepe',
    name: 'Heart Pepe',
    subtitle: 'Pepe with Hearts',
    description: 'Blush pink bubble featuring Pepe in love with floating hearts',
    tag: 'Romantic Meme',
    category: 'animals',
    previewColors: ['#fbcfe8', '#f472b6'],
    recommendedType: 'solid',
    bubbleColor: '#fbcfe8',
    incomingBubbleColor: '#f472b6',
    textColor: '#831843',
  },

  // 2. Animated & FX Styles
  {
    id: 'gummy',
    name: 'Gummy',
    subtitle: 'Jelly Bounce Animation',
    description: 'Pastel jelly reflections, 3D glossy highlight, and smooth elastic stretch',
    tag: 'Animated Gummy',
    category: 'fx',
    previewColors: ['#f472b6', '#c084fc', '#38bdf8', '#34d399'],
    recommendedType: 'gradient',
    gradientColors: ['#f472b6', '#c084fc', '#38bdf8'],
    textColor: '#ffffff',
  },
  {
    id: 'prisma',
    name: 'Prisma',
    subtitle: 'Rainbow Shimmer',
    description: 'Smooth spectral rainbow cycling continuously from left to right',
    tag: 'Animated Rainbow',
    category: 'fx',
    previewColors: ['#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'],
    recommendedType: 'gradient',
    gradientColors: ['#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316'],
    textColor: '#ffffff',
  },
  {
    id: 'cyber-glass',
    name: 'Cyber Glass',
    subtitle: 'Neon Glow & Border',
    description: 'Neon outline with gradient border and luminous cyber glow',
    tag: 'Cyber Neon',
    category: 'fx',
    previewColors: ['#06b6d4', '#9333ea'],
    recommendedType: 'gradient',
    gradientColors: ['#06b6d4', '#9333ea'],
    textColor: '#ffffff',
  },
  {
    id: 'retro-pixel',
    name: 'Retro Pixel',
    subtitle: '8-Bit Pixels & Sparks',
    description: 'Retro 8-bit pixel outline, arcade drop shadow, and twinkling pixel stars',
    tag: '8-Bit Arcade',
    category: 'fx',
    previewColors: ['#1e1b4b', '#4338ca'],
    recommendedType: 'solid',
    bubbleColor: '#1e1b4b',
    incomingBubbleColor: '#0f172a',
    textColor: '#ffffff',
  },
  {
    id: 'liquid-neon',
    name: 'Liquid Neon',
    subtitle: 'Moving Neon Beam',
    description: 'Glossy dark glass with a running neon purple laser tracer along the edge',
    tag: 'Animated Neon',
    category: 'fx',
    previewColors: ['#0f0b1e', '#a855f7', '#c084fc'],
    recommendedType: 'solid',
    bubbleColor: '#0f0b1e',
    incomingBubbleColor: '#0c0818',
    textColor: '#ffffff',
  },
  {
    id: 'star-bubble',
    name: 'Star Bubble',
    subtitle: 'Sunny Star',
    description: 'Warm golden bubble with an embossed 3D star in the corner',
    tag: '3D Star',
    category: 'fx',
    previewColors: ['#fbbf24', '#f59e0b', '#d97706'],
    recommendedType: 'solid',
    bubbleColor: '#f59e0b',
    incomingBubbleColor: '#d97706',
    textColor: '#451a03',
  },
  {
    id: 'pink-cream',
    name: 'Pink Cream',
    subtitle: 'Melting Ice Cream',
    description: 'Soft pink bubble with dripping melted ice cream along the bottom',
    tag: 'Melting Ice Cream',
    category: 'fx',
    previewColors: ['#fbcfe8', '#f472b6', '#fb7185'],
    recommendedType: 'solid',
    bubbleColor: '#f472b6',
    incomingBubbleColor: '#fb7185',
    textColor: '#831843',
  },
  {
    id: 'sheetbook-note',
    name: 'Sheetbook Note',
    subtitle: 'Grid Notebook & Tape',
    description: 'Grid notebook paper texture accented with translucent tape corners',
    tag: 'Notebook Paper',
    category: 'fx',
    previewColors: ['#ffffff', '#93c5fd', '#e2e8f0'],
    recommendedType: 'solid',
    bubbleColor: '#ffffff',
    incomingBubbleColor: '#f8fafc',
    textColor: '#1e293b',
  },
  {
    id: 'moon-bubble',
    name: 'Moon Bubble',
    subtitle: 'Galaxy & Saturn',
    description: 'Deep space with twinkling stars and a 3D ringed Saturn planet',
    tag: 'Galaxy Saturn',
    category: 'fx',
    previewColors: ['#181135', '#29154e', '#c084fc'],
    recommendedType: 'gradient',
    gradientColors: ['#181135', '#29154e', '#120c2b'],
    textColor: '#ffffff',
  },
  {
    id: 'cloudy-bubble',
    name: 'Cloudy Bubble',
    subtitle: 'Cloud Waves',
    description: 'Vibrant blue bubble with soft drifting clouds undulating along the bottom',
    tag: 'Cloud Waves',
    category: 'fx',
    previewColors: ['#60a5fa', '#3b82f6', '#1d4ed8'],
    recommendedType: 'solid',
    bubbleColor: '#3b82f6',
    incomingBubbleColor: '#2563eb',
    textColor: '#ffffff',
  },
  {
    id: 'evil-bubble',
    name: 'Evil Bubble',
    subtitle: 'Devil Horns',
    description: 'Crimson frosted glass with scarlet neon edge glow and 3D devil horns',
    tag: 'Devil Horns',
    category: 'fx',
    previewColors: ['#260a12', '#dc2626', '#f87171'],
    recommendedType: 'solid',
    bubbleColor: '#260a12',
    incomingBubbleColor: '#1a060d',
    textColor: '#ffe4e6',
  },
  {
    id: 'halo-bubble',
    name: 'Halo Bubble',
    subtitle: 'Angel Halo',
    description: 'Pristine white bubble with gilded border and a radiant floating angel halo',
    tag: 'Angel Halo',
    category: 'fx',
    previewColors: ['#ffffff', '#facc15', '#eab308'],
    recommendedType: 'solid',
    bubbleColor: '#ffffff',
    incomingBubbleColor: '#fafaf9',
    textColor: '#1f2937',
  },
  {
    id: 'system-bubble',
    name: 'System Bubble',
    subtitle: 'Hacker Console & Cursor',
    description: 'Dark terminal with CRT green outline, >_ prompt, and typing effect',
    tag: 'Terminal Hacker',
    category: 'fx',
    previewColors: ['#050805', '#22c55e', '#4ade80'],
    recommendedType: 'solid',
    bubbleColor: '#050805',
    incomingBubbleColor: '#040604',
    textColor: '#4ade80',
  },
];

export interface ShaderWallpaperPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  previewGradient: string;
  colors: string[];
}

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

export const PROCEDURAL_SHADER_PRESETS: ShaderWallpaperPreset[] = [
  {
    id: 'neon-smoke',
    name: 'Liquid Neon Smoke',
    category: 'Fluid Glow',
    description: 'Liquid neon smoke with turbulent fluids and violet-cyan glow',
    previewGradient: 'radial-gradient(circle at 30% 30%, #9333ea 0%, #06b6d4 50%, #0a0416 100%)',
    colors: ['#9333ea', '#06b6d4', '#3b82f6'],
  },
  {
    id: 'cosmic-aurora',
    name: 'Cosmic Aurora',
    category: 'Cosmic Plasma',
    description: 'Cosmic northern lights with undulating waves of emerald and magenta rays',
    previewGradient: 'radial-gradient(circle at 50% 20%, #10b981 0%, #8b5cf6 50%, #030712 100%)',
    colors: ['#10b981', '#8b5cf6', '#064e3b'],
  },
  {
    id: 'synthwave-grid',
    name: 'Retro Synthwave',
    category: 'Cyber Retro',
    description: '3D Synthwave perspective grid horizon with neon sunset and laser flares',
    previewGradient: 'linear-gradient(180deg, #1e0533 0%, #f43f5e 60%, #06b6d4 100%)',
    colors: ['#f43f5e', '#8b5cf6', '#06b6d4'],
  },
  {
    id: 'starlight-drift',
    name: 'Starlight Hyperspace',
    category: 'Deep Space',
    description: 'Interstellar hyperspace drift with a million luminous particles',
    previewGradient: 'radial-gradient(circle at 50% 50%, #38bdf8 0%, #6366f1 40%, #020617 100%)',
    colors: ['#38bdf8', '#6366f1', '#1e1b4b'],
  },
  {
    id: 'cyber-matrix',
    name: 'Cyber Hologram',
    category: 'Digital Hologram',
    description: 'Cyber-holographic matrix with shimmering light waves',
    previewGradient: 'linear-gradient(135deg, #052e16 0%, #10b981 50%, #022c22 100%)',
    colors: ['#10b981', '#34d399', '#064e3b'],
  },
];

export interface ChatThemeConfig {
  id?: string;
  name?: string;

  // Background
  backgroundType: BackgroundType;
  backgroundColor: string; // solid RGB / HEX e.g. '#0b0b0c'
  gradientColors: string[]; // 2 or 3 colors e.g. ['#120726', '#2d0b4e', '#0a0416']
  gradientAngle: number; // 0 to 360 deg
  bgImageUrl?: string; // image or animated GIF (url or blob)
  bgBrightness?: number; // 0.1 to 1.0 (overlay darkness for text readability)
  bgBlur?: number; // 0 to 20 px
  shaderPresetId?: string; // 'neon-smoke' | 'cosmic-aurora' | 'synthwave-grid' | 'starlight-drift' | 'cyber-matrix'
  audioReactive?: boolean; // Audio-reactive glow on music / voice playback
  parallax3d?: boolean; // 3D Gyroscope parallax on mobile

  // Outgoing Message Bubbles (My Messages)
  bubbleType: BubbleType;
  bubbleColor: string; // solid RGB / HEX e.g. '#9333ea'
  bubbleGradientColors: string[]; // 2 or 3 colors
  bubbleGradientAngle: number; // 0 to 360 deg
  bubbleContinuousGradient: boolean; // Continuous viewport-wide gradient across all messages
  bubbleShape?: BubbleShapeType; // 'default' | 'ios-classic' | 'telegram-modern' | 'cyber-glass' | 'retro-pixel'
  bubbleTextColor: string; // 'auto' or custom HEX (e.g. '#ffffff' or '#0f172a')
  bubbleOpacity?: number; // 0.2 to 1.0 (Frosted glass transparency)
  bubbleBlur?: number; // 0 to 30 px (Backdrop blur)

  // Incoming Message Bubbles (Other participants)
  incomingBubbleType?: BubbleType;
  incomingBubbleColor?: string;
  incomingBubbleGradientColors?: string[];
  incomingBubbleGradientAngle?: number;
  incomingBubbleTextColor?: string;
  incomingBubbleOpacity?: number;
  incomingBubbleBlur?: number;

  // Custom Typography & Text Styling (Discord-style Text tab)
  textFont?: string;
  textEffect?: string;
  textColor?: string;
  textApplyToAll?: boolean;
}

export interface ChatFontMeta {
  id: string;
  name: string;
  fontFamily: string;
  googleFontName?: string;
  scale?: number;
  lineHeight?: string;
  letterSpacing?: string;
  sampleText?: string;
}

export const CHAT_FONTS: ChatFontMeta[] = [
  // Row 1
  {
    id: 'default',
    name: 'Default (GG Sans)',
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    sampleText: 'Gg',
    scale: 1,
    lineHeight: '1.4',
  },
  {
    id: 'serif',
    name: 'Playfair (Serif)',
    fontFamily: "'Playfair Display', Georgia, serif",
    googleFontName: 'Playfair Display',
    sampleText: 'Gg',
    scale: 1,
    lineHeight: '1.4',
  },
  {
    id: 'bubble',
    name: 'Bubbles',
    fontFamily: "'Rubik Bubbles', cursive",
    googleFontName: 'Rubik Bubbles',
    sampleText: 'Gg',
    scale: 1.05,
    lineHeight: '1.35',
  },
  {
    id: 'medieval',
    name: 'Medieval',
    fontFamily: "'Ruslan Display', serif",
    googleFontName: 'Ruslan Display',
    sampleText: 'Gg',
    scale: 1,
    lineHeight: '1.4',
  },

  // Row 2
  {
    id: 'comfortaa',
    name: 'Rounded',
    fontFamily: "'Comfortaa', cursive, sans-serif",
    googleFontName: 'Comfortaa',
    sampleText: 'Gg',
    scale: 0.98,
    lineHeight: '1.4',
  },
  {
    id: 'pixel-arcade',
    name: '8-Bit Arcade',
    fontFamily: "'Press Start 2P', monospace",
    googleFontName: 'Press Start 2P',
    sampleText: 'Gg',
    scale: 0.8,
    lineHeight: '1.6',
    letterSpacing: '-0.03em',
  },
  {
    id: 'pixel-clean',
    name: 'Pixel Minimal',
    fontFamily: "'Pixelify Sans', monospace",
    googleFontName: 'Pixelify Sans',
    sampleText: 'Gg',
    scale: 0.95,
    lineHeight: '1.45',
  },
  {
    id: 'journal',
    name: 'Journal',
    fontFamily: "'Caveat', cursive",
    googleFontName: 'Caveat',
    sampleText: 'Gg',
    scale: 1.15,
    lineHeight: '1.3',
  },

  // Row 3
  {
    id: 'cyber',
    name: 'Cyberpunk',
    fontFamily: "'Exo 2', sans-serif",
    googleFontName: 'Exo 2',
    sampleText: 'Gg',
    scale: 1,
    lineHeight: '1.4',
  },
  {
    id: 'mono',
    name: 'Terminal Mono',
    fontFamily: "'JetBrains Mono', monospace",
    googleFontName: 'JetBrains Mono',
    sampleText: 'Gg',
    scale: 0.92,
    lineHeight: '1.45',
  },
  {
    id: 'gothic',
    name: 'Gothic Slab',
    fontFamily: "'Kelly Slab', cursive, serif",
    googleFontName: 'Kelly Slab',
    sampleText: 'Gg',
    scale: 1.02,
    lineHeight: '1.4',
  },
  {
    id: 'cursive',
    name: 'Cursive Script',
    fontFamily: "'Pacifico', cursive",
    googleFontName: 'Pacifico',
    sampleText: 'Gg',
    scale: 1.02,
    lineHeight: '1.4',
  },
];

export interface ChatTextEffectOption {
  id: string;
  name: string;
  label: string;
}

export const CHAT_TEXT_EFFECTS: ChatTextEffectOption[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    label: 'Minimal',
  },
  {
    id: 'gradient',
    name: 'Gradient',
    label: 'Gradient',
  },
  {
    id: 'neon',
    name: 'Neon',
    label: 'Neon',
  },
  {
    id: 'cartoon',
    name: 'Cartoon',
    label: 'Cartoon',
  },
  {
    id: 'highlight',
    name: 'Accent',
    label: 'Accent',
  },
  {
    id: 'gummy',
    name: 'Gummy',
    label: 'Gummy',
  },
  {
    id: 'prism',
    name: 'Prisma',
    label: 'Prisma',
  },
];

export const DISCORD_TEXT_COLORS = [
  { name: 'Auto', color: 'auto' },
  { name: 'Mint', color: '#34d399' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Sky Blue', color: '#38bdf8' },
  { name: 'Lavender', color: '#c084fc' },
  { name: 'Rose', color: '#f43f5e' },
  { name: 'Gold', color: '#eab308' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Teal', color: '#059669' },
  { name: 'Forest', color: '#16a34a' },
  { name: 'Ocean', color: '#0284c7' },
  { name: 'Purple', color: '#9333ea' },
  { name: 'Crimson', color: '#e11d48' },
  { name: 'Red', color: '#dc2626' },
  { name: 'White', color: '#ffffff' },
];

export interface PresetTheme {
  id: string;
  name: string;
  category: 'solid' | 'gradient' | 'special';
  previewBg: string; // CSS background snippet for palette tile
  config: ChatThemeConfig;
}

export interface PresetBubble {
  id: string;
  name: string;
  previewBg: string;
  bubbleType: BubbleType;
  bubbleColor?: string;
  bubbleGradientColors?: string[];
  bubbleGradientAngle?: number;
  bubbleContinuousGradient?: boolean;
}

export const DEFAULT_DARK_THEME_CONFIG: ChatThemeConfig = {
  id: 'default',
  name: 'Default Dark',
  backgroundType: 'solid',
  backgroundColor: '#0b0b0c',
  gradientColors: ['#0b0b0c', '#14151b'],
  gradientAngle: 135,
  bgBrightness: 0.8,
  bgBlur: 0,
  bubbleShape: 'telegram-modern',
  bubbleType: 'gradient',
  bubbleColor: '#9333ea',
  bubbleGradientColors: ['#9333ea', '#6366f1'],
  bubbleGradientAngle: 135,
  bubbleContinuousGradient: false,
  bubbleTextColor: 'auto',
  bubbleOpacity: 0.9,
  bubbleBlur: 16,
  incomingBubbleColor: '#12131b',
  incomingBubbleTextColor: 'auto',
  incomingBubbleOpacity: 0.8,
  incomingBubbleBlur: 16,
  textFont: 'default',
  textEffect: 'minimal',
  textColor: 'auto',
  textApplyToAll: false,
};

export const BUILT_IN_PRESETS: PresetTheme[] = [
  {
    id: 'default',
    name: 'Eternal Dark',
    category: 'solid',
    previewBg: '#0b0b0c',
    config: { ...DEFAULT_DARK_THEME_CONFIG },
  },
  {
    id: 'pure-black',
    name: 'Pure Black (OLED)',
    category: 'solid',
    previewBg: '#000000',
    config: {
      ...DEFAULT_DARK_THEME_CONFIG,
      id: 'pure-black',
      name: 'Pure Black (OLED)',
      backgroundType: 'solid',
      backgroundColor: '#000000',
      bubbleGradientColors: ['#3b82f6', '#1d4ed8'],
    },
  },
  {
    id: 'pure-white',
    name: 'Clean White (Light)',
    category: 'solid',
    previewBg: '#f8fafc',
    config: {
      ...DEFAULT_DARK_THEME_CONFIG,
      id: 'pure-white',
      name: 'Clean White (Light)',
      backgroundType: 'solid',
      backgroundColor: '#f1f5f9',
      bubbleGradientColors: ['#3b82f6', '#60a5fa'],
      incomingBubbleColor: '#e2e8f0',
    },
  },
  {
    id: 'discord-slate',
    name: 'Discord Slate (Full Gray)',
    category: 'solid',
    previewBg: '#1e1f29',
    config: {
      ...DEFAULT_DARK_THEME_CONFIG,
      id: 'discord-slate',
      name: 'Discord Slate (Full Gray)',
      backgroundType: 'solid',
      backgroundColor: '#1e1f29',
      bubbleGradientColors: ['#5865F2', '#7289da'],
    },
  },
  {
    id: 'midnight-purple',
    name: 'Midnight Purple',
    category: 'gradient',
    previewBg: 'linear-gradient(135deg, #120726, #2d0b4e, #0a0416)',
    config: {
      ...DEFAULT_DARK_THEME_CONFIG,
      id: 'midnight-purple',
      name: 'Midnight Purple',
      backgroundType: 'gradient',
      gradientColors: ['#120726', '#2d0b4e', '#0a0416'],
      gradientAngle: 135,
      bubbleGradientColors: ['#a855f7', '#ec4899'],
    },
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    category: 'gradient',
    previewBg: 'linear-gradient(135deg, #061321, #0c2b48, #030a12)',
    config: {
      ...DEFAULT_DARK_THEME_CONFIG,
      id: 'deep-ocean',
      name: 'Deep Ocean',
      backgroundType: 'gradient',
      gradientColors: ['#061321', '#0c2b48', '#030a12'],
      gradientAngle: 135,
      bubbleGradientColors: ['#0ea5e9', '#2563eb'],
    },
  },
  {
    id: 'emerald-forest',
    name: 'Emerald Forest',
    category: 'gradient',
    previewBg: 'linear-gradient(135deg, #061c14, #0d3829, #030d09)',
    config: {
      ...DEFAULT_DARK_THEME_CONFIG,
      id: 'emerald-forest',
      name: 'Emerald Forest',
      backgroundType: 'gradient',
      gradientColors: ['#061c14', '#0d3829', '#030d09'],
      gradientAngle: 135,
      bubbleGradientColors: ['#10b981', '#059669'],
    },
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    category: 'gradient',
    previewBg: 'linear-gradient(135deg, #1c0624, #3d0c4e, #0d0211)',
    config: {
      ...DEFAULT_DARK_THEME_CONFIG,
      id: 'cyberpunk-neon',
      name: 'Cyberpunk Neon',
      backgroundType: 'gradient',
      gradientColors: ['#1c0624', '#3d0c4e', '#0d0211'],
      gradientAngle: 135,
      bubbleGradientColors: ['#f43f5e', '#a855f7'],
    },
  },
  {
    id: 'sunset-mirage',
    name: 'Sunset Mirage',
    category: 'gradient',
    previewBg: 'linear-gradient(135deg, #2e081f, #541c2c, #702e1b)',
    config: {
      ...DEFAULT_DARK_THEME_CONFIG,
      id: 'sunset-mirage',
      name: 'Sunset Mirage',
      backgroundType: 'gradient',
      gradientColors: ['#2e081f', '#541c2c', '#702e1b'],
      gradientAngle: 135,
      bubbleGradientColors: ['#f97316', '#e11d48'],
    },
  },
  {
    id: 'cosmic-aurora',
    name: 'Cosmic Aurora',
    category: 'gradient',
    previewBg: 'linear-gradient(135deg, #091e2b, #113f38, #182848)',
    config: {
      ...DEFAULT_DARK_THEME_CONFIG,
      id: 'cosmic-aurora',
      name: 'Cosmic Aurora',
      backgroundType: 'gradient',
      gradientColors: ['#091e2b', '#113f38', '#182848'],
      gradientAngle: 135,
      bubbleGradientColors: ['#06b6d4', '#8b5cf6'],
    },
  },
  {
    id: 'telegram-sky',
    name: 'Telegram Sky',
    category: 'gradient',
    previewBg: 'linear-gradient(135deg, #0f1c3f, #1e3a8a, #0b1120)',
    config: {
      ...DEFAULT_DARK_THEME_CONFIG,
      id: 'telegram-sky',
      name: 'Telegram Sky',
      backgroundType: 'gradient',
      gradientColors: ['#0f1c3f', '#1e3a8a', '#0b1120'],
      gradientAngle: 135,
      bubbleGradientColors: ['#0284c7', '#38bdf8'],
    },
  },
  {
    id: 'instagram-velvet',
    name: 'Instagram Velvet',
    category: 'gradient',
    previewBg: 'linear-gradient(135deg, #4c1d95, #c026d3, #f43f5e)',
    config: {
      ...DEFAULT_DARK_THEME_CONFIG,
      id: 'instagram-velvet',
      name: 'Instagram Velvet',
      backgroundType: 'gradient',
      gradientColors: ['#4c1d95', '#c026d3', '#f43f5e'],
      gradientAngle: 135,
      bubbleGradientColors: ['#d946ef', '#f43f5e', '#fbbf24'],
      bubbleContinuousGradient: true,
    },
  },
];

export const BUILT_IN_BUBBLE_PRESETS: PresetBubble[] = [
  {
    id: 'purple-glow',
    name: 'Purple Glow',
    previewBg: 'linear-gradient(135deg, #9333ea, #6366f1)',
    bubbleType: 'gradient',
    bubbleGradientColors: ['#9333ea', '#6366f1'],
    bubbleGradientAngle: 135,
  },
  {
    id: 'telegram-blue',
    name: 'Telegram Sky',
    previewBg: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
    bubbleType: 'gradient',
    bubbleGradientColors: ['#0284c7', '#0ea5e9'],
    bubbleGradientAngle: 135,
  },
  {
    id: 'instagram-sunset',
    name: 'Instagram Sunset',
    previewBg: 'linear-gradient(135deg, #ec4899, #f43f5e)',
    bubbleType: 'gradient',
    bubbleGradientColors: ['#ec4899', '#f43f5e'],
    bubbleGradientAngle: 135,
  },
  {
    id: 'emerald-mint',
    name: 'Emerald Mint',
    previewBg: 'linear-gradient(135deg, #059669, #10b981)',
    bubbleType: 'gradient',
    bubbleGradientColors: ['#059669', '#10b981'],
    bubbleGradientAngle: 135,
  },
  {
    id: 'cyberpunk-fuchsia',
    name: 'Cyberpunk Fuchsia',
    previewBg: 'linear-gradient(135deg, #d946ef, #8b5cf6)',
    bubbleType: 'gradient',
    bubbleGradientColors: ['#d946ef', '#8b5cf6'],
    bubbleGradientAngle: 135,
  },
  {
    id: 'crimson-flame',
    name: 'Crimson Flame',
    previewBg: 'linear-gradient(135deg, #dc2626, #ea580c)',
    bubbleType: 'gradient',
    bubbleGradientColors: ['#dc2626', '#ea580c'],
    bubbleGradientAngle: 135,
  },
  {
    id: 'golden-amber',
    name: 'Golden Amber',
    previewBg: 'linear-gradient(135deg, #d97706, #f59e0b)',
    bubbleType: 'gradient',
    bubbleGradientColors: ['#d97706', '#f59e0b'],
    bubbleGradientAngle: 135,
  },
  {
    id: 'discord-blurple',
    name: 'Discord Blurple',
    previewBg: '#5865F2',
    bubbleType: 'solid',
    bubbleColor: '#5865F2',
  },
  {
    id: 'pure-white-bubble',
    name: 'Pure White (Light)',
    previewBg: '#ffffff',
    bubbleType: 'solid',
    bubbleColor: '#ffffff',
  },
  {
    id: 'pastel-lemon',
    name: 'Pastel Lemon',
    previewBg: '#fef08a',
    bubbleType: 'solid',
    bubbleColor: '#fef08a',
  },
  {
    id: 'instagram-continuous',
    name: 'Instagram Continuous 3-Color Flow',
    previewBg: 'linear-gradient(180deg, #ec4899, #8b5cf6, #3b82f6)',
    bubbleType: 'gradient',
    bubbleGradientColors: ['#ec4899', '#8b5cf6', '#3b82f6'],
    bubbleGradientAngle: 180,
    bubbleContinuousGradient: true,
  },
];

export interface ThemeProposalData {
  proposedTheme: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  proposedByUserId: string;
  proposedByUsername?: string;
  respondedByUserId?: string;
  createdAt: string;
  expiresAt: string;
}
