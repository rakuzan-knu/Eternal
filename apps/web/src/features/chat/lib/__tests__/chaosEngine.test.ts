import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChaosEngine } from '../webrtc/chaosEngine';

describe('ChaosEngine', () => {
  let engine: ChaosEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = new ChaosEngine();
  });

  afterEach(() => {
    engine.stopFlapping();
    vi.useRealTimers();
  });

  it('initializes with clean preset and updates configs', () => {
    expect(engine.getConfig().preset).toBe('clean');
    expect(engine.getConfig().packetLossRatio).toBe(0);

    engine.setPreset('tunnel_hell');
    const tunnelConfig = engine.getConfig();
    expect(tunnelConfig.preset).toBe('tunnel_hell');
    expect(tunnelConfig.packetLossRatio).toBe(0.3);
    expect(tunnelConfig.jitterMs).toBe(300);
    expect(tunnelConfig.bandwidthLimitKbps).toBe(32);
  });

  it('simulates packet loss accurately according to ratio', () => {
    engine.updateConfig({ packetLossRatio: 0.0 });
    expect(engine.shouldDropPacket()).toBe(false);

    engine.updateConfig({ packetLossRatio: 1.0 });
    expect(engine.shouldDropPacket()).toBe(true);

    // Statistical check: 50% loss over 200 packets
    engine.updateConfig({ packetLossRatio: 0.5 });
    let drops = 0;
    for (let i = 0; i < 200; i++) {
      if (engine.shouldDropPacket()) drops++;
    }
    // Should be reasonably close to 100 drops
    expect(drops).toBeGreaterThan(50);
    expect(drops).toBeLessThan(150);
  });

  it('calculates delay incorporating base RTT and jitter', () => {
    engine.updateConfig({ rttDelayMs: 600, jitterMs: 50 });
    const delay = engine.calculatePacketDelay();

    // Base one-way is 300ms, with +/- 50ms jitter => range [250, 350]
    expect(delay).toBeGreaterThanOrEqual(250);
    expect(delay).toBeLessThanOrEqual(350);
  });

  it('applies bandwidth throttling parameters to RTCRtpSender', async () => {
    const mockSender = {
      track: { kind: 'video' },
      getParameters: vi.fn().mockReturnValue({
        encodings: [{ maxBitrate: undefined }],
      }),
      setParameters: vi.fn().mockResolvedValue(undefined),
    };
    const mockPc = {
      getSenders: () => [mockSender],
    } as unknown as RTCPeerConnection;

    engine.updateConfig({ bandwidthLimitKbps: 64 });
    await engine.applyToPeerConnection(mockPc);

    expect(mockSender.setParameters).toHaveBeenCalledWith({
      encodings: [{ maxBitrate: 64000 }],
    });
  });

  it('wraps DataChannel to inject loss and artificial latency', () => {
    const originalSend = vi.fn();
    const mockChannel = {
      readyState: 'open',
      send: originalSend,
    } as unknown as RTCDataChannel;

    // Test dropping packets
    engine.updateConfig({ packetLossRatio: 1.0 });
    const wrappedChannel = engine.wrapDataChannel(mockChannel);
    const sent = wrappedChannel.send('hello');
    expect(sent).toBe(false);
    expect(originalSend).not.toHaveBeenCalled();

    // Test zero loss with delay
    engine.updateConfig({ packetLossRatio: 0.0, rttDelayMs: 200, jitterMs: 0 });
    wrappedChannel.send('delayed message');
    expect(originalSend).not.toHaveBeenCalled(); // Queued in setTimeout

    vi.advanceTimersByTime(100); // one-way 100ms
    expect(originalSend).toHaveBeenCalledWith('delayed message');
  });

  it('executes network flapping cycles every specified interval', () => {
    const flapCallback = vi.fn();
    engine.startFlapping(flapCallback, 5000);

    expect(engine.getConfig().isFlapping).toBe(true);

    vi.advanceTimersByTime(5000);
    expect(flapCallback).toHaveBeenCalledWith('disconnected');

    vi.advanceTimersByTime(5000);
    expect(flapCallback).toHaveBeenCalledWith('reconnected');

    engine.stopFlapping();
    expect(engine.getConfig().isFlapping).toBe(false);
  });
});
