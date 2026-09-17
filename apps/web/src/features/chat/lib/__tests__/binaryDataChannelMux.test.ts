import { describe, it, expect, vi } from 'vitest';
import { MemorySlabAllocator } from '../webrtc/memorySlabAllocator';
import {
  BinaryDataChannelMux,
  MULTIPLEXED_STREAM_IDS,
  FRAME_FLAGS,
  HEADER_SIZE,
} from '../webrtc/binaryDataChannelMux';

describe('MemorySlabAllocator', () => {
  it('allocates 16MB buffer and provides aligned slices', () => {
    const allocator = new MemorySlabAllocator(1024);
    const slice1 = allocator.allocate(100);
    expect(slice1.byteLength).toBe(100);

    const stats1 = allocator.getStats();
    expect(stats1.capacityBytes).toBe(1024);
    expect(stats1.allocationsCount).toBe(1);

    const slice2 = allocator.allocate(50);
    expect(slice2.byteLength).toBe(50);
    const stats2 = allocator.getStats();
    expect(stats2.allocationsCount).toBe(2);
  });

  it('wraps circularly when allocation exceeds remaining pool capacity', () => {
    const allocator = new MemorySlabAllocator(256);
    allocator.allocate(200);

    // Next 100 byte request exceeds 256, wraps back to start
    const sliceWrap = allocator.allocate(100);
    expect(sliceWrap.byteLength).toBe(100);
    expect(allocator.getStats().wrapCount).toBe(1);
  });

  it('copies data into slab without additional allocations', () => {
    const allocator = new MemorySlabAllocator(1024);
    const original = new Uint8Array([10, 20, 30, 40, 50]);
    const copied = allocator.copyIntoSlab(original);

    expect(copied.byteLength).toBe(original.byteLength);
    expect(Array.from(copied)).toEqual([10, 20, 30, 40, 50]);
  });
});

describe('BinaryDataChannelMux', () => {
  function createMockDataChannel() {
    return {
      readyState: 'open' as RTCDataChannelState,
      binaryType: 'blob',
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onclose: null,
      onmessage: null,
    } as unknown as RTCDataChannel;
  }

  it('binds channel and transmits binary framed packets', () => {
    const rawChannel = createMockDataChannel();
    const mux = new BinaryDataChannelMux();
    mux.bindDataChannel(rawChannel);

    const stream = mux.getStream(MULTIPLEXED_STREAM_IDS.REACTION_EMOTES);
    const payload = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);

    stream.send(payload, FRAME_FLAGS.PRIORITY);

    expect(rawChannel.send).toHaveBeenCalledTimes(1);
    const sentBuffer = vi.mocked(rawChannel.send).mock.calls[0][0] as unknown as ArrayBuffer;
    const sentView = new Uint8Array(sentBuffer);

    expect(sentView.byteLength).toBe(HEADER_SIZE + payload.byteLength);
    expect(sentView[0]).toBe(MULTIPLEXED_STREAM_IDS.REACTION_EMOTES); // Stream ID
    expect((sentView[1] << 8) | sentView[2]).toBe(payload.byteLength); // Length
    expect(sentView[3]).toBe(FRAME_FLAGS.PRIORITY); // Flags
    expect(sentView.subarray(4)).toEqual(payload); // Payload
  });

  it('decodes and demultiplexes incoming frames to the matching virtual stream', () => {
    const rawChannel = createMockDataChannel();
    const mux = new BinaryDataChannelMux();
    mux.bindDataChannel(rawChannel);

    const whiteboardStream = mux.getStream(MULTIPLEXED_STREAM_IDS.WHITEBOARD);
    const syncplayStream = mux.getStream(MULTIPLEXED_STREAM_IDS.SYNCPLAY);

    const wbMessageSpy = vi.fn();
    const syncMessageSpy = vi.fn();

    whiteboardStream.onmessage = wbMessageSpy;
    syncplayStream.onmessage = syncMessageSpy;

    // Construct Whiteboard frame: Stream 0x04, Length 3, Flags 0, [1, 2, 3]
    const wbFrame = new Uint8Array([MULTIPLEXED_STREAM_IDS.WHITEBOARD, 0x00, 0x03, 0x00, 1, 2, 3]);
    mux.handleIncomingMessage(wbFrame.buffer);

    expect(wbMessageSpy).toHaveBeenCalledTimes(1);
    expect(syncMessageSpy).not.toHaveBeenCalled();
    const receivedData = wbMessageSpy.mock.calls[0][0].data as Uint8Array;
    expect(Array.from(receivedData)).toEqual([1, 2, 3]);

    // Construct Syncplay frame: Stream 0x03, Length 2, Flags 0x01, [88, 99]
    const syncFrame = new Uint8Array([MULTIPLEXED_STREAM_IDS.SYNCPLAY, 0x00, 0x02, 0x01, 88, 99]);
    mux.handleIncomingMessage(syncFrame.buffer);

    expect(syncMessageSpy).toHaveBeenCalledTimes(1);
    expect(syncMessageSpy.mock.calls[0][0].flags).toBe(0x01);
  });

  it('handles text JSON payloads cleanly over virtual streams', () => {
    const rawChannel = createMockDataChannel();
    const mux = new BinaryDataChannelMux();
    mux.bindDataChannel(rawChannel);

    const chatStream = mux.getStream(MULTIPLEXED_STREAM_IDS.CONTROL_PTT);
    const msgSpy = vi.fn();
    chatStream.onmessage = msgSpy;

    const jsonText = JSON.stringify({ type: 'PTT_ACTIVE', speaking: true });
    const textBytes = new TextEncoder().encode(jsonText);

    const frame = new Uint8Array(HEADER_SIZE + textBytes.byteLength);
    frame[0] = MULTIPLEXED_STREAM_IDS.CONTROL_PTT;
    frame[1] = (textBytes.byteLength >> 8) & 0xff;
    frame[2] = textBytes.byteLength & 0xff;
    frame[3] = 0;
    frame.set(textBytes, HEADER_SIZE);

    mux.handleIncomingMessage(frame.buffer);

    expect(msgSpy).toHaveBeenCalledTimes(1);
    expect(msgSpy.mock.calls[0][0].data).toBe(jsonText);
  });
});
