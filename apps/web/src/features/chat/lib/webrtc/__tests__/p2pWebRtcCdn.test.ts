import { describe, it, expect, vi, beforeEach } from 'vitest';
import { P2PWebRtcCdnSwarm } from '../p2pWebRtcCdn';

function createMockDataChannel(label = 'cdn-swarm-mesh'): RTCDataChannel & {
  simulateMessage: (data: string) => void;
  sentMessages: string[];
} {
  const listeners = new Map<string, Array<(event: unknown) => void>>();
  const sentMessages: string[] = [];

  return {
    label,
    readyState: 'open',
    send: vi.fn((data: string) => {
      sentMessages.push(data);
    }),
    addEventListener: vi.fn((evt: string, fn: (event: unknown) => void) => {
      if (!listeners.has(evt)) listeners.set(evt, []);
      listeners.get(evt)!.push(fn);
    }),
    removeEventListener: vi.fn(),
    simulateMessage(data: string) {
      const handlers = listeners.get('message') || [];
      for (const h of handlers) {
        h({ data });
      }
    },
    sentMessages,
  } as unknown as RTCDataChannel & {
    simulateMessage: (data: string) => void;
    sentMessages: string[];
  };
}

describe('P2PWebRtcCdnSwarm', () => {
  let swarm: P2PWebRtcCdnSwarm;

  beforeEach(() => {
    swarm = new P2PWebRtcCdnSwarm();
  });

  it('registers peer and handles HAVE announcement', () => {
    const channel = createMockDataChannel();
    swarm.registerPeer('peer-1', channel);

    // Peer announces having chunk-A and chunk-B
    channel.simulateMessage(
      JSON.stringify({
        type: 'HAVE',
        chunkIds: ['chunk-A', 'chunk-B'],
      }),
    );

    const stats = swarm.getStats();
    expect(stats.activePeers).toBe(1);
  });

  it('requests piece from peer when available and returns P2P buffer', async () => {
    const channel = createMockDataChannel();
    swarm.registerPeer('peer-1', channel);

    // Peer announces chunk-42
    channel.simulateMessage(
      JSON.stringify({
        type: 'HAVE',
        chunkIds: ['chunk-42'],
      }),
    );

    const originFetch = vi.fn(async () => new Uint8Array([9, 9, 9]).buffer);

    // Request chunk with 500ms deadline
    const reqPromise = swarm.requestChunk('chunk-42', 500, originFetch);

    // Peer receives REQUEST and replies with PIECE
    const lastSent = JSON.parse(channel.sentMessages[channel.sentMessages.length - 1]!);
    expect(lastSent.type).toBe('REQUEST');
    expect(lastSent.chunkId).toBe('chunk-42');

    // Simulate peer sending piece base64
    const sampleBytes = new Uint8Array([1, 2, 3, 4]);
    const b64 = btoa(String.fromCharCode(...sampleBytes));
    channel.simulateMessage(
      JSON.stringify({
        type: 'PIECE',
        chunkId: 'chunk-42',
        dataBase64: b64,
      }),
    );

    const resultBuffer = await reqPromise;
    expect(new Uint8Array(resultBuffer)).toEqual(sampleBytes);
    expect(originFetch).not.toHaveBeenCalled();

    const stats = swarm.getStats();
    expect(stats.p2pBytesReceived).toBe(4);
    expect(stats.serverBytesReceived).toBe(0);
    expect(stats.savingsRatio).toBe(1.0);
  });

  it('falls back to server origin when deadline is urgent (<150ms)', async () => {
    const channel = createMockDataChannel();
    swarm.registerPeer('peer-1', channel);
    channel.simulateMessage(JSON.stringify({ type: 'HAVE', chunkIds: ['chunk-urgent'] }));

    const serverData = new Uint8Array([7, 7, 7]).buffer;
    const originFetch = vi.fn(async () => serverData);

    // Deadline 100ms: urgent playout safeguard triggers immediate server fetch
    const result = await swarm.requestChunk('chunk-urgent', 100, originFetch);

    expect(result).toBe(serverData);
    expect(originFetch).toHaveBeenCalledTimes(1);

    const stats = swarm.getStats();
    expect(stats.serverBytesReceived).toBe(3);
    expect(stats.p2pBytesReceived).toBe(0);
    expect(stats.savingsRatio).toBe(0);
  });

  it('calculates bandwidth savings ratio accurately across mixed traffic', async () => {
    const channel = createMockDataChannel();
    swarm.registerPeer('peer-1', channel);
    channel.simulateMessage(
      JSON.stringify({ type: 'HAVE', chunkIds: ['p2p-1', 'p2p-2', 'p2p-3', 'p2p-4'] }),
    );

    // 4 chunks from P2P (100 bytes each)
    for (const id of ['p2p-1', 'p2p-2', 'p2p-3', 'p2p-4']) {
      const p = swarm.requestChunk(id, 600, vi.fn());
      const bytes = new Uint8Array(100).fill(1);
      const b64 = btoa(String.fromCharCode(...bytes));
      channel.simulateMessage(JSON.stringify({ type: 'PIECE', chunkId: id, dataBase64: b64 }));
      await p;
    }

    // 1 chunk from server (100 bytes)
    await swarm.requestChunk('server-1', 50, async () => new Uint8Array(100).fill(2).buffer);

    // Total: 400 bytes P2P, 100 bytes Server -> 80% savings
    const stats = swarm.getStats();
    expect(stats.p2pBytesReceived).toBe(400);
    expect(stats.serverBytesReceived).toBe(100);
    expect(stats.savingsRatio).toBe(0.8);
  });
});
