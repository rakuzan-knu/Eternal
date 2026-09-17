export interface StoryFilterPreset {
  id: string;
  name: string;
  css: string;
  previewBg: string;
}

export const STORY_FILTERS: StoryFilterPreset[] = [
  {
    id: 'none',
    name: 'Normal',
    css: 'none',
    previewBg: 'linear-gradient(135deg, #27272a, #09090b)',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    css: 'contrast(1.15) saturate(1.4) hue-rotate(-10deg) brightness(1.05)',
    previewBg: 'linear-gradient(135deg, #f97316, #ec4899)',
  },
  {
    id: '8k',
    name: '8K Ultra',
    css: 'contrast(1.22) saturate(1.25) brightness(1.02)',
    previewBg: 'linear-gradient(135deg, #ef4444, #8b5cf6)',
  },
  {
    id: '4k',
    name: '4K Sharp',
    css: 'contrast(1.15) brightness(1.06) saturate(1.12)',
    previewBg: 'linear-gradient(135deg, #eab308, #3b82f6)',
  },
  {
    id: 'vintage',
    name: 'Vintage',
    css: 'sepia(0.38) contrast(0.95) brightness(0.96) saturate(1.25)',
    previewBg: 'linear-gradient(135deg, #d97706, #78350f)',
  },
  {
    id: 'noir',
    name: 'Noir',
    css: 'grayscale(1) contrast(1.3) brightness(0.95)',
    previewBg: 'linear-gradient(135deg, #71717a, #18181b)',
  },
  {
    id: 'tokyo-neon',
    name: 'Tokyo Neon',
    css: 'hue-rotate(35deg) saturate(1.65) contrast(1.15)',
    previewBg: 'linear-gradient(135deg, #06b6d4, #d946ef)',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    css: 'contrast(1.3) saturate(1.8) hue-rotate(-25deg)',
    previewBg: 'linear-gradient(135deg, #ec4899, #3b82f6)',
  },
  {
    id: 'warm-gold',
    name: 'Warm Gold',
    css: 'sepia(0.25) saturate(1.5) brightness(1.08)',
    previewBg: 'linear-gradient(135deg, #f59e0b, #b45309)',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    css: 'hue-rotate(85deg) saturate(1.25) contrast(1.1)',
    previewBg: 'linear-gradient(135deg, #10b981, #064e3b)',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    css: 'contrast(1.25) brightness(0.92) saturate(1.15)',
    previewBg: 'linear-gradient(135deg, #3b82f6, #1e1b4b)',
  },
];

export function getStoryFilterCss(filterId?: string): string {
  const found = STORY_FILTERS.find((f) => f.id === filterId);
  return found ? found.css : 'none';
}
