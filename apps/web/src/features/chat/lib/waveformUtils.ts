/**
 * Utility functions for sampling, normalizing, and rendering Telegram-style voice waveforms.
 */

export const DEFAULT_WAVEFORM_BAR_COUNT = 45;

/**
 * Deterministically generates an organic voice waveform envelope from a seed string.
 */
export function generateDefaultWaveform(
  targetCount = DEFAULT_WAVEFORM_BAR_COUNT,
  seed = 'voice-note',
): number[] {
  const bars: number[] = new Array<number>(targetCount);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  for (let i = 0; i < targetCount; i++) {
    // Generate pseudo-random value based on hash and index
    const pseudo = Math.abs(Math.sin((hash + i * 19.37) * 43758.5453));
    // Apply envelope curve (gentle swell and taper like speech)
    const envelope = Math.sin((i / (targetCount - 1)) * Math.PI);
    const speechMod = 0.3 + 0.7 * Math.abs(Math.sin(i * 0.7 + hash));
    const value = 0.12 + 0.78 * pseudo * (0.35 + 0.65 * envelope) * speechMod;
    bars[i] = Number(Math.max(0.12, Math.min(1.0, value)).toFixed(2));
  }

  return bars;
}

/**
 * Resamples any raw peaks array (whether 5, 32, 100, or 1000 items) into exactly `targetCount` bars.
 * Normalizes all peak amplitudes to [0.12, 1.0].
 */
export function samplePeaks(
  rawPeaks?: number[] | null,
  targetCount = DEFAULT_WAVEFORM_BAR_COUNT,
  seed = 'voice',
): number[] {
  if (!rawPeaks || !Array.isArray(rawPeaks) || rawPeaks.length === 0) {
    return generateDefaultWaveform(targetCount, seed);
  }

  // Filter valid numbers
  const validPeaks = rawPeaks.map((v) =>
    typeof v === 'number' && !isNaN(v) && isFinite(v) ? Math.abs(v) : 0,
  );
  if (validPeaks.length === 0) {
    return generateDefaultWaveform(targetCount, seed);
  }

  // Find max peak for normalization
  const maxVal = Math.max(...validPeaks, 0.01);

  if (validPeaks.length === targetCount) {
    return validPeaks.map((p) => Number(Math.max(0.12, Math.min(1.0, p / maxVal)).toFixed(2)));
  }

  const result: number[] = new Array<number>(targetCount);
  const step = validPeaks.length / targetCount;

  for (let i = 0; i < targetCount; i++) {
    const start = i * step;
    const end = (i + 1) * step;
    const startIdx = Math.floor(start);
    const endIdx = Math.min(validPeaks.length, Math.ceil(end));

    let maxInBucket = 0;
    let sum = 0;
    let count = 0;

    for (let j = startIdx; j < endIdx; j++) {
      const val = validPeaks[j] ?? 0;
      maxInBucket = Math.max(maxInBucket, val);
      sum += val;
      count++;
    }

    // Blend average and peak for natural speech representation
    const avg = count > 0 ? sum / count : validPeaks[startIdx] || 0;
    const combined = maxInBucket * 0.65 + avg * 0.35;
    const normalized = Math.max(0.12, Math.min(1.0, combined / maxVal));

    result[i] = Number(normalized.toFixed(2));
  }

  return result;
}

/**
 * Formats seconds into Telegram standard mm:ss (e.g. 00:02, 02:42).
 */
export function formatVoiceTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) {
    return '00:00';
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Formats timecode for voice message:
 * When playing: "00:02 / 00:26"
 * When idle/paused: "00:26"
 */
export function formatVoiceDuration(
  currentSec: number,
  totalSec: number,
  isPlaying: boolean,
): string {
  const formattedTotal = formatVoiceTime(totalSec);
  if (isPlaying) {
    const formattedCurrent = formatVoiceTime(currentSec);
    return `${formattedCurrent} / ${formattedTotal}`;
  }
  return formattedTotal;
}

/**
 * Normalizes an audio amplitude sample stream into an array of 40-60 integer peaks
 * scaled from 0 to 100 (Telegram standard waveform integer array).
 */
export function normalizePeaksTo100(
  samples: number[],
  targetBarCount = DEFAULT_WAVEFORM_BAR_COUNT,
): number[] {
  if (!samples || samples.length === 0) {
    return new Array(targetBarCount).fill(15);
  }

  const validSamples = samples.map((v) =>
    typeof v === 'number' && !isNaN(v) && isFinite(v) ? Math.abs(v) : 0,
  );
  const max = Math.max(...validSamples, 0.01);
  const step = validSamples.length / targetBarCount;
  const result: number[] = new Array(targetBarCount);

  for (let i = 0; i < targetBarCount; i++) {
    const startIdx = Math.floor(i * step);
    const endIdx = Math.min(validSamples.length, Math.floor((i + 1) * step));
    let peak = 0;
    let sum = 0;
    let count = 0;

    for (let j = startIdx; j < endIdx; j++) {
      const v = validSamples[j] || 0;
      if (v > peak) peak = v;
      sum += v;
      count++;
    }

    const avg = count > 0 ? sum / count : validSamples[startIdx] || 0;
    // 65% peak + 35% average for speech envelope
    const blended = peak * 0.65 + avg * 0.35;
    const normalized = Math.min(100, Math.max(8, Math.round((blended / max) * 100)));
    result[i] = normalized;
  }

  return result;
}
