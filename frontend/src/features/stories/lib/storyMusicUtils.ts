/**
 * Utilities for Instagram-style Story Music Customizer & Waveform
 */

export const STORY_STICKER_COLOR_PALETTES = [
  '#A855F7', // Vivid Purple (Signature Brand)
  '#FFFFFF', // Clean White
  '#18181B', // Midnight Zinc / Dark
  '#8B5CF6', // Violet
  '#C084FC', // Light Orchid Purple
  '#6366F1', // Indigo Electric
  '#38BDF8', // Sky Cyan
  '#10B981', // Emerald Mint
  '#EC4899', // Fuchsia / Pink
  '#EF4444', // Crimson Red
];

/**
 * Deterministic pseudo-random waveform generator (0ms cost, 0 network bandwidth).
 * Generates an organic envelope mimicking real track dynamics.
 */
export function generateSeededWaveform(seed: string, count = 60): number[] {
  let hash = 0;
  const str = seed || 'default-music-track';
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }

  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    const progress = i / count;
    // Primary envelope (rises in middle / chorus)
    const sin1 = Math.sin(progress * Math.PI);
    const sin2 = Math.sin(progress * Math.PI * 4 + hash);
    const noise = Math.abs(Math.sin((hash + 1) * (i + 13) * 9301 + 49297));

    // Dynamic wave height between 18% and 100%
    const raw = 0.2 + 0.55 * sin1 * (0.6 + 0.4 * noise) + 0.25 * Math.abs(sin2);
    bars.push(Math.max(18, Math.min(100, Math.round(raw * 100))));
  }

  return bars;
}

/**
 * Format milliseconds to MM:SS
 */
export function formatTimeMs(ms?: number): string {
  if (!ms || isNaN(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * Format seconds to e.g. "15s" or "20s"
 */
export function formatSeconds(sec: number): string {
  return `${sec}s`;
}
