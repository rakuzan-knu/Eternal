import { describe, it, expect, vi } from 'vitest';
import { TelemetryCollector } from '../webrtc/telemetryCollector';
import { apiClient } from '@/shared/api/httpClient';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ data: { status: 'ok' } }),
  },
}));

describe('TelemetryCollector', () => {
  it('records samples, averages metrics, and sends payload to POST /calls/telemetry', async () => {
    const collector = new TelemetryCollector('call-abc-123');

    collector.recordSample(50, 2, 4);
    collector.recordSample(70, 0, 6);

    const payload = await collector.finalizeAndSend('ENDED_BY_USER');

    expect(payload).not.toBeNull();
    expect(payload?.callId).toBe('call-abc-123');
    expect(payload?.avgRttMs).toBe(60);
    expect(payload?.maxRttMs).toBe(70);
    expect(payload?.jitterMs).toBe(5);
    expect(payload?.endReason).toBe('ENDED_BY_USER');
    expect(apiClient.post).toHaveBeenCalledWith('/calls/telemetry', payload);

    // Double finalize returns null
    const second = await collector.finalizeAndSend();
    expect(second).toBeNull();
  });
});
