import { describe, it, expect, vi } from 'vitest';
import { P2PTurnRelayManager } from '../webrtc/p2pTurnRelay';

describe('P2PTurnRelayManager', () => {
  it('correctly classifies NAT types from ICE candidates', () => {
    const manager = new P2PTurnRelayManager();
    expect(manager.assessNatType(['host'])).toBe('open');
    expect(manager.assessNatType(['srflx'])).toBe('full-cone');
    expect(manager.assessNatType(['relay'])).toBe('symmetric');
    expect(manager.assessNatType(['unknown'])).toBe('restricted-cone');
  });

  it('cross-shuttles packets between peers when acting as relay node', () => {
    const manager = new P2PTurnRelayManager();

    const channelA = {
      label: 'p2p-turn-relay',
      readyState: 'open',
      send: vi.fn(),
      onmessage: null as ((ev: { data: string }) => void) | null,
    };
    const channelB = {
      label: 'p2p-turn-relay',
      readyState: 'open',
      send: vi.fn(),
      onmessage: null as ((ev: { data: string }) => void) | null,
    };

    manager.setupAsRelayNode(
      'sess-123',
      channelA as unknown as RTCDataChannel,
      channelB as unknown as RTCDataChannel,
    );

    expect(manager.isRelaying()).toBe(true);

    // Simulate packet from A -> forwarded to B
    channelA.onmessage?.({ data: 'encrypted-frame-data-1' });
    expect(channelB.send).toHaveBeenCalledWith('encrypted-frame-data-1');

    // Simulate packet from B -> forwarded to A
    channelB.onmessage?.({ data: 'encrypted-frame-data-2' });
    expect(channelA.send).toHaveBeenCalledWith('encrypted-frame-data-2');

    const stats = manager.getStats();
    expect(stats.packetsForwarded).toBe(2);
    expect(stats.relaySessionId).toBe('sess-123');

    manager.destroy();
    expect(manager.isRelaying()).toBe(false);
  });

  it('sends and receives relayed packets when acting as client', () => {
    const onPacketReceived = vi.fn();
    const manager = new P2PTurnRelayManager({ onPacketReceived });

    const channel = {
      label: 'p2p-turn-relay',
      readyState: 'open',
      send: vi.fn(),
      onmessage: null as ((ev: { data: string }) => void) | null,
    };

    manager.bindClientRelayChannel(channel as unknown as RTCDataChannel, 'session-abc');

    const sent = manager.sendRelayedPacket('my-media-chunk');
    expect(sent).toBe(true);
    expect(channel.send).toHaveBeenCalledWith('my-media-chunk');

    channel.onmessage?.({ data: 'incoming-relayed-chunk' });
    expect(onPacketReceived).toHaveBeenCalledWith('incoming-relayed-chunk');

    manager.destroy();
  });
});
