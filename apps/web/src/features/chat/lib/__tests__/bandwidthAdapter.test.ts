import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BandwidthAdapter, type NetworkStats } from '../webrtc/bandwidthAdapter';

describe('BandwidthAdapter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts and stops sampling intervals cleanly', () => {
    const mockPc = {
      connectionState: 'connected',
      getStats: vi.fn().mockResolvedValue(new Map()),
      getSenders: vi.fn().mockReturnValue([]),
    } as unknown as RTCPeerConnection;

    const adapter = new BandwidthAdapter(mockPc);
    adapter.start(1000);

    vi.advanceTimersByTime(1000);
    expect(mockPc.getStats).toHaveBeenCalled();

    adapter.stop();
    vi.advanceTimersByTime(2000);
    expect(mockPc.getStats).toHaveBeenCalledTimes(1);
  });

  it('computes network metrics from RTP reports and triggers callbacks', async () => {
    const statsMap = new Map();
    statsMap.set('out-1', {
      type: 'outbound-rtp',
      packetsSent: 100,
      bytesSent: 50000,
    });
    statsMap.set('in-1', {
      type: 'remote-inbound-rtp',
      packetsLost: 2,
      roundTripTime: 0.045, // 45ms
      jitter: 0.005, // 5ms
    });

    const mockPc = {
      connectionState: 'connected',
      getStats: vi.fn().mockResolvedValue(statsMap),
      getSenders: vi.fn().mockReturnValue([]),
    } as unknown as RTCPeerConnection;

    let receivedStats: NetworkStats | null = null;
    let receivedQuality: string | null = null;

    const adapter = new BandwidthAdapter(mockPc, {
      onStatsUpdate: (s) => {
        receivedStats = s;
      },
      onQualityChange: (q) => {
        receivedQuality = q;
      },
    });

    adapter.start(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(receivedStats).not.toBeNull();
    expect((receivedStats as unknown as NetworkStats)?.rtt).toBe(45);
    expect((receivedStats as unknown as NetworkStats)?.jitter).toBe(5);
    expect(receivedQuality).toBe('good');

    adapter.stop();
  });

  it('triggers Audio-Only Fallback when RTT > 300ms and disables video tracks', async () => {
    const videoTrack = { kind: 'video', enabled: true };
    const audioTrack = { kind: 'audio', enabled: true };

    const setParametersMock = vi.fn().mockResolvedValue(undefined);
    const audioSender = {
      track: audioTrack,
      getParameters: vi.fn().mockReturnValue({ encodings: [{}] }),
      setParameters: setParametersMock,
    };
    const videoSender = {
      track: videoTrack,
      getParameters: vi.fn().mockReturnValue({ encodings: [{}] }),
      setParameters: vi.fn().mockResolvedValue(undefined),
    };

    const audioReceiver = {
      track: { kind: 'audio' },
      playoutDelayHint: 0,
    };

    const severeStatsMap = new Map();
    severeStatsMap.set('out-1', { type: 'outbound-rtp', packetsSent: 100, bytesSent: 50000 });
    severeStatsMap.set('in-1', {
      type: 'remote-inbound-rtp',
      packetsLost: 25,
      roundTripTime: 0.38, // 380ms RTT (> 300ms)
      jitter: 0.08, // 80ms jitter (> 60ms)
    });

    const mockPc = {
      connectionState: 'connected',
      getStats: vi.fn().mockResolvedValue(severeStatsMap),
      getSenders: vi.fn().mockReturnValue([videoSender, audioSender]),
      getReceivers: vi.fn().mockReturnValue([audioReceiver]),
    } as unknown as RTCPeerConnection;

    let fallbackTriggered = false;
    let fallbackReason: string | null = null;

    const adapter = new BandwidthAdapter(mockPc, {
      onAudioOnlyFallback: (enabled, reason) => {
        fallbackTriggered = enabled;
        fallbackReason = reason;
      },
    });

    adapter.start(1000);

    // 1st interval (detects severe, counter = 1)
    await vi.advanceTimersByTimeAsync(1000);
    expect(fallbackTriggered).toBe(false);

    // 2nd interval (persists, counter = 2 -> triggers fallback)
    await vi.advanceTimersByTimeAsync(1000);
    expect(fallbackTriggered).toBe(true);
    expect(fallbackReason).toContain('RTT exceeded');
    expect(videoTrack.enabled).toBe(false);
    expect(audioReceiver.playoutDelayHint).toBe(0.2); // 200ms target jitter buffer
    expect(adapter.isAudioOnlyFallbackActive()).toBe(true);

    // Now test recovery
    const healthyStatsMap = new Map();
    healthyStatsMap.set('out-1', { type: 'outbound-rtp', packetsSent: 200, bytesSent: 100000 });
    healthyStatsMap.set('in-1', {
      type: 'remote-inbound-rtp',
      packetsLost: 25, // 0 delta lost
      roundTripTime: 0.05, // 50ms RTT
      jitter: 0.01,
    });

    (mockPc.getStats as any).mockResolvedValue(healthyStatsMap);

    // 3 good intervals needed for recovery
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(fallbackTriggered).toBe(false);
    expect(videoTrack.enabled).toBe(true);
    expect(audioReceiver.playoutDelayHint).toBe(0.05);
    expect(adapter.isAudioOnlyFallbackActive()).toBe(false);

    adapter.stop();
  });
});
