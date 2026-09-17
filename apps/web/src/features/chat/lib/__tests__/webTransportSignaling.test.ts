import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebTransportSignalingClient, WT_DATAGRAM_TYPES } from '../webrtc/webTransportSignaling';

describe('WebTransportSignalingClient', () => {
  let fallbackEmit: ReturnType<typeof vi.fn>;
  let client: WebTransportSignalingClient;

  beforeEach(() => {
    fallbackEmit = vi.fn();
    client = new WebTransportSignalingClient(fallbackEmit);
  });

  it('packs and unpacks binary datagrams accurately', () => {
    const candidate = {
      candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host',
      sdpMid: '0',
      sdpMLineIndex: 0,
    };
    const callId = 'call-uuid-1234';

    const packed = WebTransportSignalingClient.packDatagram(
      WT_DATAGRAM_TYPES.ICE_CANDIDATE,
      callId,
      { candidate },
    );

    expect(packed).toBeInstanceOf(Uint8Array);
    expect(packed.length).toBeGreaterThan(10);
    expect(packed[0]).toBe(0x51); // 'Q'
    expect(packed[1]).toBe(WT_DATAGRAM_TYPES.ICE_CANDIDATE);

    const unpacked = WebTransportSignalingClient.unpackDatagram(packed);
    expect(unpacked).not.toBeNull();
    expect(unpacked?.type).toBe(WT_DATAGRAM_TYPES.ICE_CANDIDATE);
    expect(unpacked?.callId).toBe(callId);
    expect((unpacked?.payload as { candidate: typeof candidate }).candidate).toEqual(candidate);
  });

  it('gracefully handles malformed or truncated datagrams', () => {
    const invalidHeader = new Uint8Array([0x00, 0x01, 0x02]);
    expect(WebTransportSignalingClient.unpackDatagram(invalidHeader)).toBeNull();

    const empty = new Uint8Array([]);
    expect(WebTransportSignalingClient.unpackDatagram(empty)).toBeNull();
  });

  it('falls back to WebSocket emit when WebTransport is unsupported or disconnected', () => {
    expect(client.getTransportMode()).toBe('websocket');

    const candidate = { candidate: 'test-cand', sdpMid: '0', sdpMLineIndex: 0 };
    const sent = client.sendIceCandidate('call-1', candidate, 'remote-user-2');

    expect(sent).toBe(true);
    expect(fallbackEmit).toHaveBeenCalledWith('call:ice-candidate', {
      callId: 'call-1',
      candidate,
      targetUserId: 'remote-user-2',
    });
  });

  it('returns initial stats accurately', () => {
    const stats = client.getStats();
    expect(stats.transportMode).toBe('websocket');
    expect(stats.isConnected).toBe(false);
    expect(stats.datagramsSent).toBe(0);
    expect(stats.datagramsReceived).toBe(0);
  });
});
