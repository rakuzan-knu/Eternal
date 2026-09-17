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

    const diag = analyzeConnectionQuality(metrics, 'Иван', false);

    expect(diag.quality).toBe('poor');
    expect(diag.primaryIssue).toBe('packet_loss');
    expect(diag.plainLanguageHint).toBe('У Иван слабый Wi-Fi (потери пакетов)');
    expect(diag.headline).toBe('Слабый Wi-Fi');
    expect(diag.colorHex).toBe('#ef4444');
  });

  it('identifies CPU overload when FPS drops while network packet loss is minimal', () => {
    const metrics: RawQualityMetrics = {
      packetLossPercent: 0.5,
      fps: 9,
      jitterMs: 15,
      rttMs: 45,
    };

    const diag = analyzeConnectionQuality(metrics, 'Анна', false);

    expect(diag.quality).toBe('poor');
    expect(diag.primaryIssue).toBe('cpu_overload');
    expect(diag.plainLanguageHint).toBe('У Анна перегружен процессор (просадка FPS)');
    expect(diag.headline).toBe('Перегружен процессор');
    expect(diag.colorHex).toBe('#f97316');
  });

  it('identifies high latency and jitter', () => {
    const metrics: RawQualityMetrics = {
      packetLossPercent: 1.0,
      fps: 30,
      jitterMs: 95,
      rttMs: 420,
    };

    const diag = analyzeConnectionQuality(metrics, 'Максим', false);

    expect(diag.quality).toBe('fair');
    expect(diag.primaryIssue).toBe('high_latency');
    expect(diag.plainLanguageHint).toBe('У Максим нестабильный интернет (высокая задержка)');
  });

  it('identifies low camera lighting', () => {
    const metrics: RawQualityMetrics = {
      packetLossPercent: 0,
      fps: 30,
      jitterMs: 10,
      rttMs: 30,
      luminance: 15,
    };

    const diag = analyzeConnectionQuality(metrics, 'Елена', false);

    expect(diag.quality).toBe('fair');
    expect(diag.primaryIssue).toBe('low_light');
    expect(diag.plainLanguageHint).toBe('У Елена слабое освещение (темная камера)');
    expect(diag.headline).toBe('Слабое освещение');
  });

  it('returns excellent status for healthy network and video parameters', () => {
    const metrics: RawQualityMetrics = {
      packetLossPercent: 0.2,
      fps: 30,
      jitterMs: 10,
      rttMs: 25,
      luminance: 120,
    };

    const diag = analyzeConnectionQuality(metrics, 'Иван', false);

    expect(diag.quality).toBe('excellent');
    expect(diag.primaryIssue).toBe('none');
    expect(diag.plainLanguageHint).toBe('Связь стабильная и плавная');
  });

  it('handles local user perspectives correctly', () => {
    const metrics: RawQualityMetrics = {
      packetLossPercent: 15,
      fps: 30,
      jitterMs: 10,
      rttMs: 30,
    };

    const diag = analyzeConnectionQuality(metrics, null, true);
    expect(diag.plainLanguageHint).toContain('У вас слабый Wi-Fi');
  });

  describe('VisualQualityRadarTracker', () => {
    let tracker: VisualQualityRadarTracker;

    beforeEach(() => {
      tracker = new VisualQualityRadarTracker('Иван', false);
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
