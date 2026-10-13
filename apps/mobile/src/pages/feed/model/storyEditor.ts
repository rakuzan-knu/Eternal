import { StoryOverlaySchema, type StoryOverlay } from '@social-network/shared-contracts';

export const STORY_COLORS = [
  '#ffffff',
  '#000000',
  '#5865f2',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
  '#64748b',
];
export const STORY_BACKGROUNDS = [
  ['#181824', '#0b0c10'],
  ['#2d124d', '#110726'],
  ['#093028', '#021612'],
  ['#1f2937', '#111827'],
  ['#4c0519', '#1f020a'],
  ['#1e1b4b', '#312e81', '#4c1d95'],
  ['#1e3a8a', '#0f172a'],
  ['#431407', '#1c0a00'],
] as const;
export const STORY_FONTS = [
  'modern',
  'classic',
  'signature',
  'neon',
  'typewriter',
  'cyberpunk',
  'poster',
] as const;
export const STORY_ANIMATIONS = ['none', 'typewriter', 'float', 'bounce', 'glow', 'wave'] as const;
export const STORY_TEXT_BACKGROUNDS = ['none', 'solid', 'neon', 'glass', 'highlight'] as const;
export const STORY_FILTERS = [
  { id: 'none', name: 'Normal', operations: [] },
  {
    id: 'sunset',
    name: 'Sunset',
    operations: [
      ['contrast', 1.15],
      ['saturate', 1.4],
      ['hueRotate', -10],
      ['brightness', 1.05],
    ],
  },
  {
    id: '8k',
    name: '8K Ultra',
    operations: [
      ['contrast', 1.22],
      ['saturate', 1.25],
      ['brightness', 1.02],
    ],
  },
  {
    id: '4k',
    name: '4K Sharp',
    operations: [
      ['contrast', 1.15],
      ['brightness', 1.06],
      ['saturate', 1.12],
    ],
  },
  {
    id: 'vintage',
    name: 'Vintage',
    operations: [
      ['sepia', 0.38],
      ['contrast', 0.95],
      ['brightness', 0.96],
      ['saturate', 1.25],
    ],
  },
  {
    id: 'noir',
    name: 'Noir',
    operations: [
      ['saturate', 0],
      ['contrast', 1.3],
      ['brightness', 0.95],
    ],
  },
  {
    id: 'tokyo-neon',
    name: 'Tokyo Neon',
    operations: [
      ['hueRotate', 35],
      ['saturate', 1.65],
      ['contrast', 1.15],
    ],
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    operations: [
      ['contrast', 1.3],
      ['saturate', 1.8],
      ['hueRotate', -25],
    ],
  },
  {
    id: 'warm-gold',
    name: 'Warm Gold',
    operations: [
      ['sepia', 0.25],
      ['saturate', 1.5],
      ['brightness', 1.08],
    ],
  },
  {
    id: 'emerald',
    name: 'Emerald',
    operations: [
      ['hueRotate', 85],
      ['saturate', 1.25],
      ['contrast', 1.1],
    ],
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    operations: [
      ['contrast', 1.25],
      ['brightness', 0.92],
      ['saturate', 1.15],
    ],
  },
] as const;
export function backgroundPreset(index: number) {
  const colors = STORY_BACKGROUNDS[index % STORY_BACKGROUNDS.length];
  return `linear-gradient(180deg, ${colors.map((color, i) => `${color} ${Math.round((i / (colors.length - 1)) * 100)}%`).join(', ')})`;
}
export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
export function snapCoordinate(value: number) {
  return Math.abs(value - 50) < 2 ? 50 : clamp(value, 0, 100);
}
export function snapAngle(value: number) {
  const normalized = ((((value + 180) % 360) + 360) % 360) - 180;
  const snapped = Math.round(normalized / 45) * 45;
  return Math.abs(normalized - snapped) < 4 ? snapped : normalized;
}
let sequence = 0;
export function makeOverlay(input: Record<string, unknown>): StoryOverlay {
  return StoryOverlaySchema.parse({
    id: `layer-${Date.now()}-${++sequence}`,
    xPercent: 50,
    yPercent: 50,
    ...input,
  });
}
export function updateLayer(layers: StoryOverlay[], next: StoryOverlay) {
  return layers.map((layer) => (layer.id === next.id ? StoryOverlaySchema.parse(next) : layer));
}
export function safeStoryLink(input: string) {
  const value = input.trim();
  const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  if (
    !/^https?:$/.test(url.protocol) ||
    !url.hostname.includes('.') ||
    url.username ||
    url.password
  )
    throw new Error('Enter a valid http or https link.');
  return url.href;
}
