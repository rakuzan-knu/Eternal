import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebRtcStatsEngine } from '../webRtcStatsEngine';

describe('WebRtcStatsEngine', () => {
  let engine: WebRtcStatsEngine;

  beforeEach(() => {
    vi.restoreAllMocks();
    engine = new WebRtcStatsEngine({ callId: 'test-call-123', intervalMs: 500 });
  });

  it('calculates metrics and quality tier from getStats report', async () => {
    const mockReports = new Map<string, Record<string, unknown>>([
      [
        'cand-pair-1',
        {
          type: 'candidate-pair',
          state: 'succeeded',
          currentRoundTripTime: 0.045, // 45ms
        },
      ],
      [
        'inbound-audio-1',
        {
          type: 'inbound-rtp',
          kind: 'audio',
          bytesReceived: 10000,
          packetsReceived: 200,
          packetsLost: 2,
          jitter: 0.005, // 5ms
        },
      ],
      [
        'inbound-video-1',
        {
          type: 'inbound-rtp',
          kind: 'video',
          bytesReceived: 50000,
          packetsReceived: 800,
          packetsLost: 8,
          framesReceived: 120,
          framesDropped: 2,
        },
      ],
    ]);

    const mockPc = {
      connectionState: 'connected',
      getStats: vi.fn().mockResolvedValue(mockReports),
    } as unknown as RTCPeerConnection;

    const sample1 = await engine.collectSample(mockPc);
    expect(sample1).not.toBeNull();
    expect(sample1?.rttMs).toBe(45);
    expect(sample1?.jitterMs).toBe(5);
    expect(sample1?.quality).toBe('excellent');

    // Second sample 1 sec later with packet loss spike
    const mockReports2 = new Map<string, Record<string, unknown>>([
      [
        'cand-pair-1',
        {
          type: 'candidate-pair',
          state: 'succeeded',
          currentRoundTripTime: 0.45, // 450ms -> poor
        },
      ],
      [
        'inbound-audio-1',
        {
          type: 'inbound-rtp',
          kind: 'audio',
          bytesReceived: 20000,
          packetsReceived: 350,
          packetsLost: 50,
          jitter: 0.02,
        },
      ],
      [
        'inbound-video-1',
        {
          type: 'inbound-rtp',
          kind: 'video',
          bytesReceived: 100000,
          packetsReceived: 1400,
          packetsLost: 100,
          framesReceived: 240,
          framesDropped: 30,
        },
      ],
    ]);

    const mockPc2 = {
      connectionState: 'connected',
      getStats: vi.fn().mockResolvedValue(mockReports2),
    } as unknown as RTCPeerConnection;

    const sample2 = await engine.collectSample(mockPc2);
    expect(sample2).not.toBeNull();
    expect(sample2?.rttMs).toBe(450);
    expect(sample2?.quality).toBe('poor');
    expect(sample2?.packetLossRatio).toBeGreaterThan(0);
  });

  it('stops and cleans up polling interval', () => {
    const mockPc = {
      connectionState: 'connected',
      getStats: vi.fn().mockResolvedValue(new Map()),
    } as unknown as RTCPeerConnection;

    engine.start(mockPc);
    engine.stop();
    // After stop, interval is cleared
    expect(engine['timer']).toBeNull();
  });
});
