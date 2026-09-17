/**
 * Custom Binary DataChannel Multiplexer + Framing Protocol
 *
 * Multiplexes multiple logical data streams (chat, cursors, syncplay,
 * whiteboard CRDT, webcodecs video, reaction particles) over a single
 * underlying RTCDataChannel using a 4-byte binary framing header and
 * a pre-allocated 16MB slab allocator for zero-GC operations.
 */

import { MemorySlabAllocator, globalSlabAllocator } from './memorySlabAllocator';

export const MULTIPLEXED_STREAM_IDS = {
  FILE_TRANSFER: 0x01,
  GOSSIP_SIGNALING: 0x02,
  SYNCPLAY: 0x03,
  WHITEBOARD: 0x04,
  WEBCODECS: 0x05,
  REACTION_EMOTES: 0x06,
  CONTROL_PTT: 0x07,
} as const;

export const FRAME_FLAGS = {
  PRIORITY: 0x01,
  COMPRESSED: 0x02,
  FRAGMENT_END: 0x04,
} as const;

export const HEADER_SIZE = 4; // 1 byte StreamID, 2 bytes PayloadLength, 1 byte Flags

export interface VirtualMessageEvent {
  data: Uint8Array | string;
  flags: number;
  streamId: number;
}

export interface VirtualDataChannel {
  streamId: number;
  send: (data: Uint8Array | string, flags?: number) => void;
  onmessage: ((event: VirtualMessageEvent) => void) | null;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  readyState: RTCDataChannelState;
}

export class BinaryDataChannelMux {
  private dataChannel: RTCDataChannel | null = null;
  private readonly slabAllocator: MemorySlabAllocator;
  private readonly virtualChannels = new Map<number, VirtualDataChannel>();
  private readonly textEncoder = new TextEncoder();
  private readonly textDecoder = new TextDecoder();

  constructor(slabAllocator: MemorySlabAllocator = globalSlabAllocator) {
    this.slabAllocator = slabAllocator;
  }

  /**
   * Binds an underlying raw RTCDataChannel to this multiplexer
   */
  public bindDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;
    this.dataChannel.binaryType = 'arraybuffer';

    this.dataChannel.onopen = () => {
      this.virtualChannels.forEach((vc) => {
        vc.readyState = 'open';
        vc.onopen?.();
      });
    };

    this.dataChannel.onclose = () => {
      this.virtualChannels.forEach((vc) => {
        vc.readyState = 'closed';
        vc.onclose?.();
      });
    };

    this.dataChannel.onmessage = (event: MessageEvent) => {
      this.handleIncomingMessage(event.data);
    };
  }

  /**
   * Gets or creates a virtual data channel handle for a specific Stream ID
   */
  public getStream(streamId: number): VirtualDataChannel {
    let vc = this.virtualChannels.get(streamId);
    if (vc) return vc;

    vc = {
      streamId,
      readyState: this.dataChannel ? this.dataChannel.readyState : 'connecting',
      onmessage: null,
      onopen: null,
      onclose: null,
      send: (data: Uint8Array | string, flags = 0) => {
        this.sendFrame(streamId, data, flags);
      },
    };

    this.virtualChannels.set(streamId, vc);
    return vc;
  }

  /**
   * Encodes and sends a multiplexed binary frame
   */
  public sendFrame(streamId: number, data: Uint8Array | string, flags = 0): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      return;
    }

    let payloadBytes: Uint8Array;
    if (typeof data === 'string') {
      payloadBytes = this.textEncoder.encode(data);
    } else {
      payloadBytes = data;
    }

    const payloadLen = payloadBytes.byteLength;
    if (payloadLen > 65535) {
      throw new Error(`Payload length ${payloadLen} exceeds max 16-bit frame size (65535)`);
    }

    // Allocate 4 bytes header + payload bytes from 16MB slab pool
    const frame = this.slabAllocator.allocate(HEADER_SIZE + payloadLen);

    // Byte 0: Stream ID (0..255)
    frame[0] = streamId & 0xff;
    // Bytes 1-2: Payload Length Big-Endian (Uint16)
    frame[1] = (payloadLen >> 8) & 0xff;
    frame[2] = payloadLen & 0xff;
    // Byte 3: Flags
    frame[3] = flags & 0xff;

    // Set payload
    frame.set(payloadBytes, HEADER_SIZE);

    try {
      const bufferSlice = (frame.buffer as ArrayBuffer).slice(
        frame.byteOffset,
        frame.byteOffset + frame.byteLength,
      );
      this.dataChannel.send(bufferSlice);
    } catch (err) {
      console.warn(`[BinaryMux] Send error on stream 0x${streamId.toString(16)}:`, err);
    }
  }

  /**
   * Decodes incoming message from underlying RTCDataChannel
   */
  public handleIncomingMessage(raw: unknown): void {
    let bufferView: Uint8Array;

    if (raw instanceof ArrayBuffer) {
      bufferView = new Uint8Array(raw);
    } else if (ArrayBuffer.isView(raw)) {
      bufferView = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
    } else if (typeof raw === 'string') {
      // Legacy or string payload
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.streamId === 'number') {
          const vc = this.virtualChannels.get(parsed.streamId);
          vc?.onmessage?.({
            streamId: parsed.streamId,
            data: parsed.data,
            flags: 0,
          });
        }
      } catch {
        // Discard malformed string
      }
      return;
    } else {
      return;
    }

    if (bufferView.byteLength < HEADER_SIZE) {
      return;
    }

    // Parse Binary Framing Header
    const streamId = bufferView[0];
    const payloadLen = (bufferView[1] << 8) | bufferView[2];
    const flags = bufferView[3];

    const actualAvailable = bufferView.byteLength - HEADER_SIZE;
    const lenToRead = Math.min(payloadLen, actualAvailable);
    const payload = bufferView.subarray(HEADER_SIZE, HEADER_SIZE + lenToRead);

    const vc = this.virtualChannels.get(streamId);
    if (!vc || !vc.onmessage) return;

    // Check if payload is UTF-8 text string or binary data
    let decodedData: Uint8Array | string = payload;
    try {
      // If flags indicate priority text / control or valid json
      if (flags === 0 || flags & FRAME_FLAGS.PRIORITY) {
        const textCandidate = this.textDecoder.decode(payload);
        if (textCandidate.startsWith('{') || textCandidate.startsWith('[')) {
          decodedData = textCandidate;
        }
      }
    } catch {
      // Keep as Uint8Array
    }

    vc.onmessage({
      streamId,
      data: decodedData,
      flags,
    });
  }

  public getChannelState(): RTCDataChannelState {
    return this.dataChannel ? this.dataChannel.readyState : 'closed';
  }

  public close(): void {
    this.virtualChannels.forEach((vc) => {
      vc.readyState = 'closed';
      vc.onclose?.();
    });
    this.virtualChannels.clear();
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch {
        // Ignored
      }
      this.dataChannel = null;
    }
  }
}
