/**
 * P2P Hole Punching Mesh (Peer-as-a-TURN Relay)
 *
 * Provides decentralized NAT traversal routing WebRTC packets across
 * strict/symmetric NATs through open-NAT community peers over RTCDataChannel
 * ('p2p-turn-relay') with $0 paid infrastructure cost. Relayed bytes stay
 * opaque to forwarders whenever frame encryption negotiated it.
 */

export interface RelayForwardingStats {
  bytesForwarded: number;
  packetsForwarded: number;
  isActive: boolean;
  relaySessionId: string | null;
}

export type NatClassification = 'open' | 'full-cone' | 'restricted-cone' | 'symmetric';

export class P2PTurnRelayManager {
  private channelA: RTCDataChannel | null = null;
  private channelB: RTCDataChannel | null = null;
  private isRelayNode = false;
  private relaySessionId: string | null = null;
  private bytesForwarded = 0;
  private packetsForwarded = 0;
  private natType: NatClassification = 'full-cone';

  private onPacketReceived?: (data: ArrayBuffer | string) => void;
  private onStatsUpdated?: (stats: RelayForwardingStats) => void;

  constructor(
    options: {
      onPacketReceived?: (data: ArrayBuffer | string) => void;
      onStatsUpdated?: (stats: RelayForwardingStats) => void;
    } = {},
  ) {
    this.onPacketReceived = options.onPacketReceived;
    this.onStatsUpdated = options.onStatsUpdated;
  }

  /**
   * Determine NAT type based on ICE candidate types
   */
  assessNatType(candidateTypes: string[]): NatClassification {
    if (candidateTypes.includes('srflx') && !candidateTypes.includes('prflx')) {
      this.natType = 'full-cone';
    } else if (candidateTypes.includes('relay')) {
      this.natType = 'symmetric';
    } else if (candidateTypes.includes('host')) {
      this.natType = 'open';
    } else {
      this.natType = 'restricted-cone';
    }
    return this.natType;
  }

  getNatType(): NatClassification {
    return this.natType;
  }

  /**
   * Configure this node as a blind packet forwarder between Peer A and Peer B
   */
  setupAsRelayNode(sessionId: string, channelA: RTCDataChannel, channelB: RTCDataChannel): void {
    this.isRelayNode = true;
    this.relaySessionId = sessionId;
    this.channelA = channelA;
    this.channelB = channelB;

    // Cross-shuttle packets without reading or decrypting contents
    channelA.onmessage = (event: MessageEvent<ArrayBuffer | string>) => {
      if (channelB.readyState === 'open') {
        if (typeof event.data === 'string') {
          channelB.send(event.data);
        } else {
          channelB.send(event.data);
        }
        this.trackPacket(event.data);
      }
    };

    channelB.onmessage = (event: MessageEvent<ArrayBuffer | string>) => {
      if (channelA.readyState === 'open') {
        if (typeof event.data === 'string') {
          channelA.send(event.data);
        } else {
          channelA.send(event.data);
        }
        this.trackPacket(event.data);
      }
    };

    this.emitStats();
  }

  /**
   * Bind as a client node using a relay peer to reach remote destination
   */
  bindClientRelayChannel(channel: RTCDataChannel, sessionId: string): void {
    this.isRelayNode = false;
    this.relaySessionId = sessionId;
    this.channelA = channel;

    channel.onmessage = (event: MessageEvent<ArrayBuffer | string>) => {
      this.onPacketReceived?.(event.data);
      this.trackPacket(event.data);
    };

    this.emitStats();
  }

  /**
   * Send data through the relay channel
   */
  sendRelayedPacket(data: ArrayBuffer | string): boolean {
    if (!this.channelA || this.channelA.readyState !== 'open') {
      return false;
    }
    try {
      if (typeof data === 'string') {
        this.channelA.send(data);
      } else {
        this.channelA.send(data);
      }
      this.trackPacket(data);
      return true;
    } catch {
      return false;
    }
  }

  private trackPacket(data: ArrayBuffer | string): void {
    this.packetsForwarded++;
    const length = typeof data === 'string' ? data.length : data.byteLength;
    this.bytesForwarded += length;
    this.emitStats();
  }

  private emitStats(): void {
    this.onStatsUpdated?.(this.getStats());
  }

  getStats(): RelayForwardingStats {
    return {
      bytesForwarded: this.bytesForwarded,
      packetsForwarded: this.packetsForwarded,
      isActive: Boolean(this.channelA && this.channelA.readyState === 'open'),
      relaySessionId: this.relaySessionId,
    };
  }

  isRelaying(): boolean {
    return this.isRelayNode;
  }

  destroy(): void {
    if (this.channelA) {
      this.channelA.onmessage = null;
      this.channelA = null;
    }
    if (this.channelB) {
      this.channelB.onmessage = null;
      this.channelB = null;
    }
    this.isRelayNode = false;
    this.relaySessionId = null;
    this.bytesForwarded = 0;
    this.packetsForwarded = 0;
  }
}
