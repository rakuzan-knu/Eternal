import { describe, it, expect } from 'vitest';
import { EbuR128NormalizerDSP } from '../ebuR128Normalizer';

describe('EbuR128NormalizerDSP', () => {
  it('correctly calculates momentary LUFS of a 1kHz sine wave', () => {
    const dsp = new EbuR128NormalizerDSP({ sampleRate: 48000, targetLufs: -23 });
    const numSamples = 4800; // 100ms at 48kHz
    const buffer = new Float32Array(numSamples);

    // Generate 1kHz sine wave at peak amplitude 0.5 (-6 dBFS)
    for (let i = 0; i < numSamples; i++) {
      buffer[i] = 0.5 * Math.sin((2 * Math.PI * 1000 * i) / 48000);
    }

    const stats = dsp.process(buffer);
    // Measured LUFS for 0.5 amplitude sine with K-weighting is typically around -8 to -10 LUFS
    expect(stats.momentaryLufs).toBeGreaterThan(-15);
    expect(stats.momentaryLufs).toBeLessThan(-5);
    expect(stats.peakDbFs).toBeCloseTo(-6.0, 0.5);
  });

  it('boosts quiet audio towards target LUFS', () => {
    const dsp = new EbuR128NormalizerDSP({
      sampleRate: 48000,
      targetLufs: -18,
      attackMs: 10,
      releaseMs: 10,
    });

    // Quiet sine wave at amplitude 0.01 (~ -40 dBFS)
    const buffer = new Float32Array(4800);
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = 0.01 * Math.sin((2 * Math.PI * 500 * i) / 48000);
    }

    // Process multiple blocks to let smoothed gain ramp up
    let stats = dsp.process(buffer);
    for (let b = 0; b < 10; b++) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = 0.01 * Math.sin((2 * Math.PI * 500 * i) / 48000);
      }
      stats = dsp.process(buffer);
    }

    // Gain should be positive (boost applied)
    expect(stats.appliedGainDb).toBeGreaterThan(0);
  });

  it('attenuates loud audio to avoid ear fatigue and limits peaks to <= 1.0', () => {
    const dsp = new EbuR128NormalizerDSP({
      sampleRate: 48000,
      targetLufs: -23,
      attackMs: 5,
    });

    const buffer = new Float32Array(4800);
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = 0.95 * Math.sin((2 * Math.PI * 400 * i) / 48000);
    }

    // Process multiple blocks so gain reduces
    let stats = dsp.process(buffer);
    for (let b = 0; b < 10; b++) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = 0.95 * Math.sin((2 * Math.PI * 400 * i) / 48000);
      }
      stats = dsp.process(buffer);
    }

    expect(stats.appliedGainDb).toBeLessThan(0); // Attenuation
    for (let i = 0; i < buffer.length; i++) {
      expect(Math.abs(buffer[i]!)).toBeLessThanOrEqual(1.0);
    }
  });

  it('respects silence gate and does not endlessly amplify pure silence', () => {
    const dsp = new EbuR128NormalizerDSP({
      sampleRate: 48000,
      targetLufs: -23,
      silenceGateLufs: -60,
    });

    const silentBuffer = new Float32Array(2400); // 50ms silence
    const stats = dsp.process(silentBuffer);

    expect(stats.momentaryLufs).toBeLessThan(-60);
    // Unity gain should be maintained for silence
    expect(stats.appliedGainDb).toBeCloseTo(0, 1.0);
  });
});
