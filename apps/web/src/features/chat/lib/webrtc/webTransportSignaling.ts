/**
 * WebTransport (HTTP/3 QUIC) Signaling Fallback Layer
 *
 * Implements ultra-low latency signaling over HTTP/3 QUIC Unreliable Datagrams,
 * eliminating TCP Head-of-Line Blocking during packet loss (30-40%).
 * Seamlessly falls back to WebSocket (TCP) if WebTransport is unavailable.
 */

export const WT_DATAGRAM_TYPES = {
  ICE_CANDIDATE: 1,
  TELEMETRY: 2,
  PING: 3,
  PONG: 4,
  STATE_SYNC: 5,
} as const;
export type WtDatagramType = (typeof WT_DATAGRAM_TYPES)[keyof typeof WT_DATAGRAM_TYPES];

export interface WebTransportSignalingStats {
  transportMode: 'quic' | 'websocket';
  isConnected: boolean;
  datagramsSent: number;
  datagramsReceived: number;
  bytesSent: number;
  bytesReceived: number;
  rttMs: number;
}

export type WebTransportIceCandidateHandler = (
  candidate: RTCIceCandidateInit,
  callId: string,
) => void;
export type WebTransportTelemetryHandler = (
  telemetry: Record<string, unknown>,
  callId: string,
) => void;

// Magic byte 0x51 ('Q' for QUIC)
const WT_MAGIC_BYTE = 0x51;

export class WebTransportSignalingClient {
  private transport: any | null = null;
  private writer: any | null = null;
  private reader: any | null = null;
  private isConnected = false;
  private transportMode: 'quic' | 'websocket' = 'websocket';

  private datagramsSent = 0;
  private datagramsReceived = 0;
  private bytesSent = 0;
  private bytesReceived = 0;
  private lastPingTime = 0;
  private rttMs = 0;

  private onIceCandidateCallback: WebTransportIceCandidateHandler | null = null;
  private onTelemetryCallback: WebTransportTelemetryHandler | null = null;
  private onStateChangeCallback: ((mode: 'quic' | 'websocket', connected: boolean) => void) | null =
    null;

  constructor(private readonly onFallbackSocketEmit?: (event: string, data: unknown) => void) {}

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'WebTransport' in window;
  }

  public getTransportMode(): 'quic' | 'websocket' {
    return this.transportMode;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public onIceCandidate(cb: WebTransportIceCandidateHandler): void {
    this.onIceCandidateCallback = cb;
  }

  public onTelemetry(cb: WebTransportTelemetryHandler): void {
    this.onTelemetryCallback = cb;
  }

  public onStateChange(cb: (mode: 'quic' | 'websocket', connected: boolean) => void): void {
    this.onStateChangeCallback = cb;
  }

  /**
   * Connect to WebTransport HTTP/3 server with session ticket
   */
  public async connect(endpointUrl: string, sessionTicket: string): Promise<boolean> {
    if (!this.isSupported()) {
      this.switchToFallback('WebTransport API is not supported in this environment');
      return false;
    }

    try {
      const url = new URL(endpointUrl);
      url.searchParams.set('ticket', sessionTicket);

      const WebTransportClass = (window as unknown as { WebTransport: new (url: string) => any })
        .WebTransport;
      this.transport = new WebTransportClass(url.toString());

      // Wait for QUIC handshake completion
      await this.transport.ready;

      this.isConnected = true;
      this.transportMode = 'quic';
      this.writer = this.transport.datagrams.writable.getWriter();
      this.reader = this.transport.datagrams.readable.getReader();

      this.startDatagramReaderLoop();
      this.startKeepalivePing();

      this.onStateChangeCallback?.('quic', true);
      return true;
    } catch (err) {
      this.switchToFallback(`WebTransport QUIC handshake failed: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Pack message into binary datagram envelope
   * Format:
   * [0]: Magic byte 0x51
   * [1]: Datagram type (1 byte)
   * [2]: CallId length N (1 byte)
   * [3 .. 3+N-1]: CallId (UTF-8)
   * [3+N .. 3+N+1]: Payload length M (2 bytes Uint16 BE)
   * [3+N+2 .. end]: Payload (UTF-8 JSON string)
   */
  public static packDatagram(type: WtDatagramType, callId: string, payload: unknown): Uint8Array {
    const encoder = new TextEncoder();
    const callIdBytes = encoder.encode(callId);
    const payloadBytes = encoder.encode(JSON.stringify(payload));

    const totalLen = 1 + 1 + 1 + callIdBytes.length + 2 + payloadBytes.length;
    const buffer = new Uint8Array(totalLen);
    const view = new DataView(buffer.buffer);

    let offset = 0;
    buffer[offset++] = WT_MAGIC_BYTE;
    buffer[offset++] = type;
    buffer[offset++] = callIdBytes.length;

    buffer.set(callIdBytes, offset);
    offset += callIdBytes.length;

    view.setUint16(offset, payloadBytes.length, false);
    offset += 2;

    buffer.set(payloadBytes, offset);
    return buffer;
  }

  /**
   * Unpack binary datagram envelope
   */
  public static unpackDatagram(buffer: Uint8Array): {
    type: WtDatagramType;
    callId: string;
    payload: unknown;
  } | null {
    if (buffer.length < 5) return null;
    if (buffer[0] !== WT_MAGIC_BYTE) return null;

    const type = buffer[1] as WtDatagramType;
    const callIdLen = buffer[2];
    if (buffer.length < 3 + callIdLen + 2) return null;

    const decoder = new TextDecoder();
    const callId = decoder.decode(buffer.subarray(3, 3 + callIdLen));

    const offset = 3 + callIdLen;
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const payloadLen = view.getUint16(offset, false);

    const payloadOffset = offset + 2;
    if (buffer.length < payloadOffset + payloadLen) return null;

    try {
      const payloadStr = decoder.decode(buffer.subarray(payloadOffset, payloadOffset + payloadLen));
      const payload = JSON.parse(payloadStr);
      return { type, callId, payload };
    } catch {
      return null;
    }
  }

  /**
   * Send an ICE candidate via QUIC Unreliable Datagram.
   * If WebTransport is not connected, falls back to WebSocket.
   */
  public sendIceCandidate(
    callId: string,
    candidate: RTCIceCandidateInit,
    targetUserId?: string,
  ): boolean {
    if (this.transportMode === 'quic' && this.writer && this.isConnected) {
      try {
        const packed = WebTransportSignalingClient.packDatagram(
          WT_DATAGRAM_TYPES.ICE_CANDIDATE,
          callId,
          { candidate, targetUserId },
        );
        void this.writer.write(packed);
        this.datagramsSent++;
        this.bytesSent += packed.byteLength;
        return true;
      } catch {
        // Fallback to socket if datagram write errors out
      }
    }

    // Fallback socket send
    if (this.onFallbackSocketEmit) {
      this.onFallbackSocketEmit('call:ice-candidate', {
        callId,
        candidate,
        targetUserId,
      });
      return true;
    }

    return false;
  }

  /**
   * Send live telemetry over QUIC Unreliable Datagram
   */
  public sendTelemetry(callId: string, telemetry: Record<string, unknown>): boolean {
    if (this.transportMode === 'quic' && this.writer && this.isConnected) {
      try {
        const packed = WebTransportSignalingClient.packDatagram(
          WT_DATAGRAM_TYPES.TELEMETRY,
          callId,
          telemetry,
        );
        void this.writer.write(packed);
        this.datagramsSent++;
        this.bytesSent += packed.byteLength;
        return true;
      } catch {
        // Ignored
      }
    }

    if (this.onFallbackSocketEmit) {
      this.onFallbackSocketEmit('call:telemetry-ping', { callId, telemetry });
      return true;
    }

    return false;
  }

  public getStats(): WebTransportSignalingStats {
    return {
      transportMode: this.transportMode,
      isConnected: this.isConnected,
      datagramsSent: this.datagramsSent,
      datagramsReceived: this.datagramsReceived,
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
      rttMs: this.rttMs,
    };
  }

  public disconnect(): void {
    this.isConnected = false;
    this.writer?.releaseLock?.();
    this.reader?.releaseLock?.();
    this.writer = null;
    this.reader = null;
    try {
      this.transport?.close?.();
    } catch {
      // Ignored
    }
    this.transport = null;
    this.transportMode = 'websocket';
    this.onStateChangeCallback?.('websocket', false);
  }

  private switchToFallback(_reason?: string): void {
    this.isConnected = false;
    this.transportMode = 'websocket';
    this.onStateChangeCallback?.('websocket', false);
  }

  private startDatagramReaderLoop(): void {
    const read = async () => {
      if (!this.reader || !this.isConnected) return;
      try {
        const { value, done } = await this.reader.read();
        if (done) return;

        if (value instanceof Uint8Array) {
          this.datagramsReceived++;
          this.bytesReceived += value.byteLength;
          this.handleIncomingDatagram(value);
        }

        void read();
      } catch {
        this.switchToFallback('WebTransport reader stream closed');
      }
    };
    void read();
  }

  private handleIncomingDatagram(buffer: Uint8Array): void {
    const unpacked = WebTransportSignalingClient.unpackDatagram(buffer);
    if (!unpacked) return;

    switch (unpacked.type) {
      case WT_DATAGRAM_TYPES.ICE_CANDIDATE: {
        const data = unpacked.payload as { candidate: RTCIceCandidateInit };
        if (data?.candidate) {
          this.onIceCandidateCallback?.(data.candidate, unpacked.callId);
        }
        break;
      }
      case WT_DATAGRAM_TYPES.TELEMETRY: {
        this.onTelemetryCallback?.(unpacked.payload as Record<string, unknown>, unpacked.callId);
        break;
      }
      case WT_DATAGRAM_TYPES.PONG: {
        if (this.lastPingTime > 0) {
          this.rttMs = Math.round(performance.now() - this.lastPingTime);
        }
        break;
      }
      default:
        break;
    }
  }

  private startKeepalivePing(): void {
    if (!this.isConnected || !this.writer) return;

    const interval = setInterval(() => {
      if (!this.isConnected || !this.writer) {
        clearInterval(interval);
        return;
      }
      try {
        this.lastPingTime = performance.now();
        const pingPacket = WebTransportSignalingClient.packDatagram(
          WT_DATAGRAM_TYPES.PING,
          'ping',
          { ts: this.lastPingTime },
        );
        void this.writer.write(pingPacket);
      } catch {
        // Handled in reader
      }
    }, 5000);
  }
}
