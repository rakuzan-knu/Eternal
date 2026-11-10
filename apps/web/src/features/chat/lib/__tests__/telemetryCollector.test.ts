import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { TelemetryCollector } from '../webrtc/telemetryCollector';
import { apiClient } from '@/shared/api/httpClient';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ data: { status: 'ok' } }),
  },
}));

describe('TelemetryCollector', () => {
  const fetch = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetch);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('returns local metrics without sending call telemetry', async () => {
    const collector = new TelemetryCollector('call-abc-123');

    collector.recordSample(50, 2, 4);
    collector.recordSample(70, 0, 6);

    const payload = await collector.finalizeAndSend('ENDED_BY_USER');

    expect(payload).not.toBeNull();
    expect(payload?.callId).toBe('call-abc-123');
    expect(payload?.avgRttMs).toBe(60);
    expect(payload?.maxRttMs).toBe(70);
    expect(payload?.jitterMs).toBe(5);
    expect(payload?.packetLossRatio).toBe(0.01);
    expect(payload?.endReason).toBe('ENDED_BY_USER');
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();

    // Double finalize returns null
    const second = await collector.finalizeAndSend();
    expect(second).toBeNull();
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps empty-call defaults local without a network request', async () => {
    const collector = new TelemetryCollector('call-without-samples');
    const payload = await collector.finalizeAndSend('CONNECTION_FAILED');
    expect(payload).toMatchObject({
      callId: 'call-without-samples',
      avgRttMs: 0,
      packetLossRatio: 0,
      audioCodec: 'opus',
      endReason: 'CONNECTION_FAILED',
    });
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
