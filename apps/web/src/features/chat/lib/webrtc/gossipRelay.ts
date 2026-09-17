/**
 * P2P Gossip Signaling Relay
 *
 * Decentralized mesh signaling over RTCDataChannel ('p2p-gossip-signaling').
 * Allows connected peers to relay SDP offers/answers and ICE candidates to each other
 * and to new incoming participants when the backend WebSocket drops or is unavailable (e.g. Render spin-down).
 */

export interface GossipMessage {
  id: string;
  type: 'SDP_OFFER' | 'SDP_ANSWER' | 'ICE_CANDIDATE' | 'ICE_RESTART' | 'PEER_ANNOUNCE';
  senderId: string;
  targetUserId?: string;
  payload: unknown;
  ttl: number;
  timestamp: number;
}

export type GossipSignalHandler = (msg: GossipMessage) => void;

export class GossipRelayManager {
  private readonly myUserId: string;
  private readonly channels = new Map<string, RTCDataChannel>();
  private readonly seenMessageIds = new Map<string, number>(); // id -> timestamp
  private readonly signalHandlers = new Set<GossipSignalHandler>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(myUserId: string) {
    this.myUserId = myUserId;
    // Prune seen messages older than 60 seconds
    this.cleanupInterval = setInterval(() => this.pruneSeenMessages(), 30000);
  }

  /**
   * Registers an RTCDataChannel from a connected peer for gossip propagation.
   */
  bindDataChannel(peerId: string, channel: RTCDataChannel): void {
    if (channel.label !== 'p2p-gossip-signaling') return;

    this.channels.set(peerId, channel);

    const onMessage = (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as GossipMessage;
        this.handleIncomingMessage(msg, peerId);
      } catch (err) {
        console.warn('[GossipRelay] Failed to parse message:', err);
      }
    };

    const onClose = () => {
      this.channels.delete(peerId);
      channel.removeEventListener('message', onMessage);
      channel.removeEventListener('close', onClose);
      channel.removeEventListener('error', onClose);
    };

    channel.addEventListener('message', onMessage);
    channel.addEventListener('close', onClose);
    channel.addEventListener('error', onClose);
  }

  /**
   * Unbinds a peer channel.
   */
  unbindPeer(peerId: string): void {
    const ch = this.channels.get(peerId);
    if (ch) {
      this.channels.delete(peerId);
    }
  }

  /**
   * Subscribes to signals received via the gossip mesh that are directed to this client.
   */
  onSignal(handler: GossipSignalHandler): () => void {
    this.signalHandlers.add(handler);
    return () => {
      this.signalHandlers.delete(handler);
    };
  }

  /**
   * Broadcasts or routes a signaling message through the mesh.
   */
  broadcast(
    type: GossipMessage['type'],
    payload: unknown,
    targetUserId?: string,
    ttl = 3,
  ): GossipMessage {
    const msg: GossipMessage = {
      id: `${this.myUserId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      senderId: this.myUserId,
      payload,
      ttl,
      timestamp: Date.now(),
      ...(targetUserId ? { targetUserId } : {}),
    };

    this.seenMessageIds.set(msg.id, Date.now());
    this.relayToPeers(msg);
    return msg;
  }

  /**
   * Handles incoming message from a neighbor peer.
   */
  handleIncomingMessage(msg: GossipMessage, receivedFromPeerId?: string): void {
    if (!msg || !msg.id || typeof msg.ttl !== 'number') return;

    // Deduplication check
    if (this.seenMessageIds.has(msg.id)) {
      return;
    }
    this.seenMessageIds.set(msg.id, Date.now());

    // Check if target matches self or is a broadcast
    const isForMe = !msg.targetUserId || msg.targetUserId === this.myUserId;
    if (isForMe && msg.senderId !== this.myUserId) {
      this.signalHandlers.forEach((handler) => {
        try {
          handler(msg);
        } catch (err) {
          console.error('[GossipRelay] Error handling signal:', err);
        }
      });
    }

    // Forward to mesh if TTL permits and it's not exclusively for me
    const shouldRelay = !msg.targetUserId || msg.targetUserId !== this.myUserId;
    if (shouldRelay && msg.ttl > 1) {
      const forwardedMsg: GossipMessage = {
        ...msg,
        ttl: msg.ttl - 1,
      };
      this.relayToPeers(forwardedMsg, receivedFromPeerId);
    }
  }

  /**
   * Relays message to all open data channels except the origin.
   */
  private relayToPeers(msg: GossipMessage, excludePeerId?: string): void {
    const serialized = JSON.stringify(msg);
    this.channels.forEach((channel, peerId) => {
      if (peerId !== excludePeerId && channel.readyState === 'open') {
        try {
          channel.send(serialized);
        } catch (err) {
          console.warn(`[GossipRelay] Failed to send to peer ${peerId}:`, err);
        }
      }
    });
  }

  /**
   * Prune messages seen more than 60 seconds ago.
   */
  private pruneSeenMessages(): void {
    const threshold = Date.now() - 60000;
    for (const [id, time] of this.seenMessageIds.entries()) {
      if (time < threshold) {
        this.seenMessageIds.delete(id);
      }
    }
  }

  /**
   * Total active channels in mesh
   */
  get activeChannelCount(): number {
    return Array.from(this.channels.values()).filter((ch) => ch.readyState === 'open').length;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.channels.clear();
    this.seenMessageIds.clear();
    this.signalHandlers.clear();
  }
}
