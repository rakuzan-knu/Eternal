import { describe, it, expect } from 'vitest';
import { calculateSpectralFrame } from '../synestheticVisualizer';

describe('calculateSpectralFrame (Synesthetic Visualizer)', () => {
  it('detects low pitch (bass voice) and assigns blue/cyan color (#38bdf8)', () => {
    // 128 bins over 24000 Hz = ~187.5 Hz per bin
    const freqData = new Uint8Array(128);
    // Heavy energy in bin 0 and 1 (<300 Hz)
    freqData[0] = 250;
    freqData[1] = 200;

    const frame = calculateSpectralFrame(freqData, 48000);
    expect(frame.isSpeaking).toBe(true);
    expect(frame.pitchHz).toBeLessThan(320);
    expect(frame.color).toBe('#38bdf8'); // Sky blue for bass
    expect(frame.intensity).toBeGreaterThan(0.7);
  });

  it('detects mid pitch (warm speech 400-800 Hz) and assigns emerald color (#10b981)', () => {
    const freqData = new Uint8Array(128);
    // Heavy energy around bin 3-4 (~600 Hz)
    freqData[3] = 220;
    freqData[4] = 240;

    const frame = calculateSpectralFrame(freqData, 48000);
    expect(frame.isSpeaking).toBe(true);
    expect(frame.pitchHz).toBeGreaterThan(320);
    expect(frame.pitchHz).toBeLessThan(900);
    expect(frame.color).toBe('#10b981'); // Emerald
  });

  it('detects high pitch / sharp emphasis (>1800 Hz) and assigns red color (#ef4444)', () => {
    const freqData = new Uint8Array(128);
    // Heavy energy around bin 15-20 (>3000 Hz)
    freqData[15] = 200;
    freqData[18] = 255;

    const frame = calculateSpectralFrame(freqData, 48000);
    expect(frame.isSpeaking).toBe(true);
    expect(frame.pitchHz).toBeGreaterThan(1800);
    expect(frame.color).toBe('#ef4444'); // Crimson for high pitch/stress
  });

  it('correctly marks silence as non-speaking with zero intensity', () => {
    const freqData = new Uint8Array(128); // All zeros
    const frame = calculateSpectralFrame(freqData, 48000);

    expect(frame.isSpeaking).toBe(false);
    expect(frame.intensity).toBe(0);
  });
});
