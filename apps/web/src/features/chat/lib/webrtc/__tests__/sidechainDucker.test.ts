import { describe, it, expect } from 'vitest';
import { SidechainDuckerDSP } from '../sidechainDuckerProcessor';

describe('SidechainDuckerDSP', () => {
  it('keeps background gain at 1.0 when speech is below threshold', () => {
    const dsp = new SidechainDuckerDSP({ thresholdDb: -30, duckingDepthDb: -18 });
    const mic = new Float32Array(128); // silent mic
    const bg = new Float32Array(128).fill(0.5); // constant bg
    const out = new Float32Array(128);

    const res = dsp.process(mic, bg, out);
    expect(res.isDucking).toBe(false);
    expect(res.currentGain).toBeCloseTo(1.0, 2);
    expect(out[0]).toBeCloseTo(0.5, 2);
  });

  it('smoothly ducks background audio when speech exceeds threshold (Attack phase)', () => {
    const dsp = new SidechainDuckerDSP({
      thresholdDb: -30,
      attackMs: 5,
      duckingDepthDb: -18,
      sampleRate: 48000,
    });

    const micLoud = new Float32Array(128).fill(0.4); // ~ -8 dBFS, clearly above -30 dB
    const bg = new Float32Array(128).fill(0.5);
    const out = new Float32Array(128);

    let initialGain = 1.0;
    // Process multiple 128-sample frames to observe exponential attack ramp
    for (let f = 0; f < 10; f++) {
      const res = dsp.process(micLoud, bg, out);
      expect(res.isDucking).toBe(true);
      expect(res.currentGain).toBeLessThan(initialGain);
      initialGain = res.currentGain;
    }

    // Gain should be deeply ducked towards -18 dB (~ 0.125)
    expect(dsp.getGain()).toBeLessThan(0.4);
  });

  it('smoothly recovers background gain when speaker stops talking (Release phase)', () => {
    const dsp = new SidechainDuckerDSP({
      thresholdDb: -30,
      attackMs: 2,
      releaseMs: 10,
      duckingDepthDb: -18,
      sampleRate: 48000,
    });

    const micLoud = new Float32Array(128).fill(0.5);
    const micSilent = new Float32Array(128).fill(0.0);
    const bg = new Float32Array(128).fill(0.5);
    const out = new Float32Array(128);

    // 1. Duck first
    for (let f = 0; f < 15; f++) {
      dsp.process(micLoud, bg, out);
    }
    const duckedGain = dsp.getGain();
    expect(duckedGain).toBeLessThan(0.3);

    // 2. Release with silence
    for (let f = 0; f < 30; f++) {
      dsp.process(micSilent, bg, out);
    }
    const releasedGain = dsp.getGain();
    expect(releasedGain).toBeGreaterThan(duckedGain);
    expect(releasedGain).toBeGreaterThan(0.85);
  });

  it('dynamic soft-knee limiter strictly prevents digital clipping > 1.0', () => {
    const dsp = new SidechainDuckerDSP({ limiterThreshold: 0.95 });

    // Under threshold: linear pass-through
    expect(dsp.applyLimiter(0.5)).toBeCloseTo(0.5, 4);
    expect(dsp.applyLimiter(-0.5)).toBeCloseTo(-0.5, 4);

    // Extreme high inputs that would clip without limiter
    const clippedPositive = dsp.applyLimiter(2.5);
    const clippedNegative = dsp.applyLimiter(-3.0);

    expect(clippedPositive).toBeLessThan(1.0);
    expect(clippedPositive).toBeGreaterThan(0.95);

    expect(clippedNegative).toBeGreaterThan(-1.0);
    expect(clippedNegative).toBeLessThan(-0.95);
  });
});
