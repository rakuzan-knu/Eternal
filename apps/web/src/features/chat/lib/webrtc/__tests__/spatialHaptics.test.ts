import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpatialHapticsEngine } from '../spatialHaptics';

describe('SpatialHapticsEngine', () => {
  let engine: SpatialHapticsEngine;

  beforeEach(() => {
    engine = new SpatialHapticsEngine({
      enabled: true,
      minIntensityThreshold: 0.1,
      throttleMs: 50,
    });
  });

  it('calculates higher left motor magnitude for left-side speaker', () => {
    // Far left position (x = -1.0)
    const result = engine.calculateStereoMagnitudes({ x: -1.0, y: 0 }, 0.8);
    expect(result.leftMotor).toBeGreaterThan(0.7);
    expect(result.rightMotor).toBe(0);
    expect(result.durationMs).toBeGreaterThan(100);
  });

  it('calculates higher right motor magnitude for right-side speaker', () => {
    // Far right position (x = 1.0)
    const result = engine.calculateStereoMagnitudes({ x: 1.0, y: 0 }, 0.8);
    expect(result.rightMotor).toBeGreaterThan(0.7);
    expect(result.leftMotor).toBe(0);
  });

  it('balances stereo motors equally for center speaker', () => {
    // Center position (x = 0.0)
    const result = engine.calculateStereoMagnitudes({ x: 0.0, y: 0 }, 0.6);
    expect(result.leftMotor).toBeCloseTo(result.rightMotor, 2);
    expect(result.leftMotor).toBeCloseTo(0.3, 2);
  });

  it('ignores triggers below minimum intensity threshold or when disabled', () => {
    expect(engine.triggerSpeechHaptic({ x: 0, y: 0 }, 0.05)).toBe(false);

    engine.setEnabled(false);
    expect(engine.triggerSpeechHaptic({ x: 0, y: 0 }, 0.9)).toBe(false);
  });

  it('triggers mobile navigator.vibrate when gamepad actuator is absent', () => {
    const vibrateSpy = vi.fn();
    vi.stubGlobal('navigator', {
      vibrate: vibrateSpy,
      getGamepads: () => [],
    });

    const success = engine.triggerSpeechHaptic({ x: -0.5, y: 0 }, 0.5);
    expect(success).toBe(true);
    expect(vibrateSpy).toHaveBeenCalledWith([30, 40, 20]); // Left double tap pattern
  });
});
