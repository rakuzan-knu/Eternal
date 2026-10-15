import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  analyzeConnectionQuality,
  VisualQualityRadarTracker,
  RawQualityMetrics,
} from '../visualQualityRadar';

describe('visualQualityRadar', () => {
  it('identifies severe packet loss and generates user-friendly Wi-Fi warning', () => {
    const metrics: RawQualityMetrics = {
      packetLossPercent: 14.5,
      fps: 28,
      jitterMs: 40,
      rttMs: 120,
    };

    const diag = analyzeConnectionQuality(metrics, 'Ivan', false);

    expect(diag.quality).toBe('poor');
    expect(diag.primaryIssue).toBe('packet_loss');
    expect(diag.plainLanguageHint).toBe('Ivan has weak Wi-Fi (packet loss)');
    expect(diag.headline).toBe('Weak Wi-Fi');
    expect(diag.colorHex).toBe('#ef4444');
  });

  it('identifies CPU overload when FPS drops while network packet loss is minimal', () => {
    const metrics: RawQualityMetrics = {
      packetLossPercent: 0.5,
      fps: 9,
      jitterMs: 15,
      rttMs: 45,
    };

    const diag = analyzeConnectionQuality(metrics, 'Anna', false);

    expect(diag.quality).toBe('poor');
    expect(diag.primaryIssue).toBe('cpu_overload');
    expect(diag.plainLanguageHint).toBe("Anna's CPU is overloaded (dropping FPS)");
    expect(diag.headline).toBe('CPU Overload');
    expect(diag.colorHex).toBe('#f97316');
  });

  it('identifies high latency and jitter', () => {
    const metrics: RawQualityMetrics = {
      packetLossPercent: 1.0,
      fps: 30,
      jitterMs: 95,
      rttMs: 420,
    };

    const diag = analyzeConnectionQuality(metrics, 'Max', false);

    expect(diag.quality).toBe('fair');
    expect(diag.primaryIssue).toBe('high_latency');
    expect(diag.plainLanguageHint).toBe('Max has unstable internet (high latency)');
  });

  it('identifies low camera lighting', () => {
    const metrics: RawQualityMetrics = {
      packetLossPercent: 0,
      fps: 30,
      jitterMs: 10,
      rttMs: 30,
      luminance: 15,
    };

    const diag = analyzeConnectionQuality(metrics, 'Elena', false);

    expect(diag.quality).toBe('fair');
    expect(diag.primaryIssue).toBe('low_light');
    expect(diag.plainLanguageHint).toBe('Elena has low lighting (dark camera)');
    expect(diag.headline).toBe('Low Lighting');
  });

  it('returns excellent status for healthy network and video parameters', () => {
    const metrics: RawQualityMetrics = {
      packetLossPercent: 0.2,
      fps: 30,
      jitterMs: 10,
      rttMs: 25,
      luminance: 120,
    };

    const diag = analyzeConnectionQuality(metrics, 'Ivan', false);

    expect(diag.quality).toBe('excellent');
    expect(diag.primaryIssue).toBe('none');
    expect(diag.plainLanguageHint).toBe('Connection is stable and smooth');
  });

  it('handles local user perspectives correctly', () => {
    const metrics: RawQualityMetrics = {
      packetLossPercent: 15,
      fps: 30,
      jitterMs: 10,
      rttMs: 30,
    };

    const diag = analyzeConnectionQuality(metrics, null, true);
    expect(diag.plainLanguageHint).toContain('You have weak Wi-Fi');
  });

  describe('VisualQualityRadarTracker', () => {
    let tracker: VisualQualityRadarTracker;

    beforeEach(() => {
      tracker = new VisualQualityRadarTracker('Ivan', false);
    });

    afterEach(() => {
      tracker.dispose();
    });

    it('subscribes to diagnosis changes when metrics update', () => {
      const listener = vi.fn();
      const unsub = tracker.subscribe(listener);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ quality: 'excellent' }));

      tracker.updateMetrics({ packetLossPercent: 16 });

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith(
        expect.objectContaining({
          quality: 'poor',
          primaryIssue: 'packet_loss',
        }),
      );

      unsub();
      tracker.updateMetrics({ packetLossPercent: 0 });
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });
});
