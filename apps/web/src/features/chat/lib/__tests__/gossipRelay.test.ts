import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GossipRelayManager, GossipMessage } from '../webrtc/gossipRelay';

class MockDataChannel {
  label: string;
  readyState: 'connecting' | 'open' | 'closing' | 'closed' = 'open';
  private listeners: Record<string, ((event: unknown) => void)[]> = {};
  sentData: string[] = [];

  constructor(label: string) {
    this.label = label;
  }

  addEventListener(type: string, listener: (event: unknown) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (event: unknown) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
    }
  }

  send(data: string) {
    this.sentData.push(data);
  }

  simulateMessage(data: string) {
    const event = { data };
    this.listeners['message']?.forEach((cb) => cb(event));
  }
}

describe('GossipRelayManager', () => {
  let manager: GossipRelayManager;

  beforeEach(() => {
    manager = new GossipRelayManager('user-self');
  });

  it('broadcasts signaling messages to bound open channels', () => {
    const channel1 = new MockDataChannel('p2p-gossip-signaling') as unknown as RTCDataChannel;
    const channel2 = new MockDataChannel('p2p-gossip-signaling') as unknown as RTCDataChannel;

    manager.bindDataChannel('peer-1', channel1);
    manager.bindDataChannel('peer-2', channel2);

    const msg = manager.broadcast('ICE_CANDIDATE', { candidate: 'candidate:foo' });

    expect(msg.type).toBe('ICE_CANDIDATE');
    expect(msg.senderId).toBe('user-self');
    expect((channel1 as unknown as MockDataChannel).sentData.length).toBe(1);
    expect((channel2 as unknown as MockDataChannel).sentData.length).toBe(1);

    const sentPayload = JSON.parse((channel1 as unknown as MockDataChannel).sentData[0]!);
    expect(sentPayload.id).toBe(msg.id);
  });

  it('delivers incoming signal to local listener when target matches self', () => {
    const signalHandler = vi.fn();
    manager.onSignal(signalHandler);

    const incoming: GossipMessage = {
      id: 'msg-100',
      type: 'SDP_OFFER',
      senderId: 'peer-1',
      targetUserId: 'user-self',
      payload: { sdp: 'v=0...' },
      ttl: 3,
      timestamp: Date.now(),
    };

    manager.handleIncomingMessage(incoming, 'peer-1');
    expect(signalHandler).toHaveBeenCalledWith(incoming);
  });

  it('relays message to other peers and decrements TTL when not targeted solely to self', () => {
    const channel2 = new MockDataChannel('p2p-gossip-signaling') as unknown as RTCDataChannel;
    manager.bindDataChannel('peer-2', channel2);

    const incoming: GossipMessage = {
      id: 'msg-200',
      type: 'SDP_OFFER',
      senderId: 'peer-1',
      targetUserId: 'peer-3', // meant for peer-3, relayed through us
      payload: { sdp: 'v=0...' },
      ttl: 3,
      timestamp: Date.now(),
    };

    manager.handleIncomingMessage(incoming, 'peer-1');

    const mockCh2 = channel2 as unknown as MockDataChannel;
    expect(mockCh2.sentData.length).toBe(1);
    const forwarded = JSON.parse(mockCh2.sentData[0]!) as GossipMessage;
    expect(forwarded.ttl).toBe(2);
    expect(forwarded.id).toBe('msg-200');
  });

  it('deduplicates duplicate messages and does not re-relay or fire handlers twice', () => {
    const signalHandler = vi.fn();
    manager.onSignal(signalHandler);

    const incoming: GossipMessage = {
      id: 'msg-dup-1',
      type: 'ICE_CANDIDATE',
      senderId: 'peer-1',
      targetUserId: 'user-self',
      payload: { candidate: 'candidate:bar' },
      ttl: 2,
      timestamp: Date.now(),
    };

    manager.handleIncomingMessage(incoming);
    manager.handleIncomingMessage(incoming); // Duplicate

    expect(signalHandler).toHaveBeenCalledTimes(1);
  });
});
