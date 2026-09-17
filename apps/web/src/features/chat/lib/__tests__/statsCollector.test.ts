import { describe, it, expect, vi } from 'vitest';
import { LiveStatsCollector } from '../webrtc/statsCollector';

describe('LiveStatsCollector', () => {
  it('parses WebRTC getStats reports and calculates bitrate, jitter, and codec detection', async () => {
    const mockReports = new Map<string, Record<string, unknown>>([
      [
        'codec-video',
        {
          id: 'codec-video',
          type: 'codec',
          mimeType: 'video/AV1',
        },
      ],
      [
        'inbound-video',
        {
          type: 'inbound-rtp',
          kind: 'video',
          bytesReceived: 250000,
          packetsReceived: 300,
          packetsLost: 3,
          jitter: 0.012, // 12ms
          framesPerSecond: 30,
          frameWidth: 1920,
          frameHeight: 1080,
          codecId: 'codec-video',
        },
      ],
      [
        'candidate-pair-1',
        {
          type: 'candidate-pair',
          state: 'succeeded',
          currentRoundTripTime: 0.045, // 45ms
          localCandidateId: 'cand-local',
          remoteCandidateId: 'cand-remote',
        },
      ],
      [
        'cand-local',
        {
          type: 'local-candidate',
          candidateType: 'host',
        },
      ],
      [
        'cand-remote',
        {
          type: 'remote-candidate',
          candidateType: 'host',
        },
      ],
    ]);

    const mockPc = {
      connectionState: 'connected',
      getStats: vi.fn().mockResolvedValue(mockReports),
    } as unknown as RTCPeerConnection;

    const collector = new LiveStatsCollector(() => mockPc);

    const stats = await collector.sample();

    expect(stats.videoCodec).toBe('AV1');
    expect(stats.resolution).toBe('1920x1080');
    expect(stats.rttMs).toBe(45);
    expect(stats.jitterMs).toBe(12);
    expect(stats.connectionType).toBe('Direct P2P (Local)');
    expect(stats.history.fps.length).toBe(1);
    expect(stats.history.fps[0]).toBe(30);

    collector.destroy();
  });

  it('detects TURN Relay routing when candidateType is relay', async () => {
    const mockReports = new Map<string, Record<string, unknown>>([
      [
        'candidate-pair-1',
        {
          type: 'candidate-pair',
          state: 'succeeded',
          currentRoundTripTime: 0.08,
          localCandidateId: 'cand-local-relay',
          remoteCandidateId: 'cand-remote-relay',
        },
      ],
      [
        'cand-local-relay',
        {
          type: 'local-candidate',
          candidateType: 'relay',
        },
      ],
      [
        'cand-remote-relay',
        {
          type: 'remote-candidate',
          candidateType: 'srflx',
        },
      ],
    ]);

    const mockPc = {
      connectionState: 'connected',
      getStats: vi.fn().mockResolvedValue(mockReports),
    } as unknown as RTCPeerConnection;

    const collector = new LiveStatsCollector(() => mockPc);
    const stats = await collector.sample();

    expect(stats.connectionType).toBe('TURN Relay');
    expect(stats.rttMs).toBe(80);

    collector.destroy();
  });
});
