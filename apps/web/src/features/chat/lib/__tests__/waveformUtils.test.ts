import { describe, it, expect } from 'vitest';
import {
  samplePeaks,
  formatVoiceTime,
  formatVoiceDuration,
  generateDefaultWaveform,
} from '../waveformUtils';

describe('waveformUtils', () => {
  describe('samplePeaks', () => {
    it('returns 45 bars by default when input is null or empty', () => {
      const defaultBars = samplePeaks(null);
      expect(defaultBars).toHaveLength(45);
      expect(defaultBars.every((b) => b >= 0.12 && b <= 1.0)).toBe(true);

      const emptyBars = samplePeaks([]);
      expect(emptyBars).toHaveLength(45);
    });

    it('downsamples larger arrays to exactly targetCount bars', () => {
      const largePeaks = new Array(200).fill(0).map((_, i) => Math.sin(i / 10) * 0.5 + 0.5);
      const resampled = samplePeaks(largePeaks, 45);
      expect(resampled).toHaveLength(45);
      expect(resampled.every((b) => b >= 0.12 && b <= 1.0)).toBe(true);
    });

    it('upsamples smaller arrays to exactly targetCount bars', () => {
      const smallPeaks = [0.2, 0.8, 0.5, 0.9, 0.1];
      const resampled = samplePeaks(smallPeaks, 45);
      expect(resampled).toHaveLength(45);
      expect(resampled.every((b) => b >= 0.12 && b <= 1.0)).toBe(true);
    });

    it('normalizes peak values between 0.12 and 1.0', () => {
      const rawPeaks = [0.01, 0.02, 0.05, 0.03];
      const resampled = samplePeaks(rawPeaks, 45);
      expect(Math.max(...resampled)).toBe(1.0);
      expect(Math.min(...resampled)).toBeGreaterThanOrEqual(0.12);
    });

    it('handles exact targetCount length directly and non-numeric peaks array', () => {
      const exactPeaks = new Array(45).fill(0.5);
      const resampled = samplePeaks(exactPeaks, 45);
      expect(resampled).toHaveLength(45);
      expect(resampled.every((b) => b === 1.0)).toBe(true);

      const invalidPeaks = [NaN, Infinity, 'abc' as any];
      const fallback = samplePeaks(invalidPeaks, 45);
      expect(fallback).toHaveLength(45);
    });

    it('returns default waveform when validPeaks is empty after map (simulated via monkey-patch)', () => {
      const origMap = Array.prototype.map;
      try {
        // Simulate the case where all mapped values result in empty validPeaks
        Array.prototype.map = function () {
          return [];
        };
        const resFallback = samplePeaks([1, 2, 3], 45, 'empty-seed');
        expect(resFallback).toHaveLength(45);
        expect(resFallback.every((b) => b >= 0.12 && b <= 1.0)).toBe(true);
      } finally {
        Array.prototype.map = origMap;
      }
    });
  });

  describe('formatVoiceTime', () => {
    it('formats seconds into mm:ss correctly', () => {
      expect(formatVoiceTime(0)).toBe('00:00');
      expect(formatVoiceTime(2)).toBe('00:02');
      expect(formatVoiceTime(26)).toBe('00:26');
      expect(formatVoiceTime(65)).toBe('01:05');
      expect(formatVoiceTime(162)).toBe('02:42');
      expect(formatVoiceTime(3600)).toBe('60:00');
    });

    it('handles negative or invalid values gracefully', () => {
      expect(formatVoiceTime(-5)).toBe('00:00');
      expect(formatVoiceTime(NaN)).toBe('00:00');
      expect(formatVoiceTime(Infinity)).toBe('00:00');
    });
  });

  describe('formatVoiceDuration', () => {
    it('returns mm:ss when not playing', () => {
      expect(formatVoiceDuration(5, 30, false)).toBe('00:30');
      expect(formatVoiceDuration(0, 162, false)).toBe('02:42');
    });

    it('returns current / total when playing', () => {
      expect(formatVoiceDuration(2, 26, true)).toBe('00:02 / 00:26');
      expect(formatVoiceDuration(30, 162, true)).toBe('00:30 / 02:42');
    });
  });

  describe('generateDefaultWaveform', () => {
    it('generates deterministic peaks for identical seeds', () => {
      const wave1 = generateDefaultWaveform(45, 'seed-123');
      const wave2 = generateDefaultWaveform(45, 'seed-123');
      expect(wave1).toEqual(wave2);
    });
  });
});
