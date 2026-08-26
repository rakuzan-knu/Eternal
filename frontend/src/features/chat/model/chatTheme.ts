export type BackgroundType = 'solid' | 'gradient' | 'image' | 'preset' | 'shader';
export type BubbleType = 'solid' | 'gradient' | 'preset';

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
    description: 'Жидкий неоновый дым с турбулентными флюидами и фиолетово-циановым свечением',
    previewGradient: 'radial-gradient(circle at 30% 30%, #9333ea 0%, #06b6d4 50%, #0a0416 100%)',
    colors: ['#9333ea', '#06b6d4', '#3b82f6'],
  },
  {
    id: 'cosmic-aurora',
    name: 'Cosmic Aurora',
    category: 'Cosmic Plasma',
    description: 'Северное космическое сияние с волнами изумрудного и пурпурного света',
    previewGradient: 'radial-gradient(circle at 50% 20%, #10b981 0%, #8b5cf6 50%, #030712 100%)',
    colors: ['#10b981', '#8b5cf6', '#064e3b'],
  },
  {
    id: 'synthwave-grid',
    name: 'Retro Synthwave',
    category: 'Cyber Retro',
    description: '3D-перспективная сетка горизонта Synthwave с неоновым солнцем и лазерными лучами',
    previewGradient: 'linear-gradient(180deg, #1e0533 0%, #f43f5e 60%, #06b6d4 100%)',
    colors: ['#f43f5e', '#8b5cf6', '#06b6d4'],
  },
  {
    id: 'starlight-drift',
    name: 'Starlight Hyperspace',
    category: 'Deep Space',
    description: 'Звездный гиперпространственный дрейф с миллионом светящихся частиц',
    previewGradient: 'radial-gradient(circle at 50% 50%, #38bdf8 0%, #6366f1 40%, #020617 100%)',
    colors: ['#38bdf8', '#6366f1', '#1e1b4b'],
  },
  {
    id: 'cyber-matrix',
    name: 'Cyber Hologram',
    category: 'Digital Hologram',
    description: 'Кибер-голографическая сетка с переливающимися световыми волнами',
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
}

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
