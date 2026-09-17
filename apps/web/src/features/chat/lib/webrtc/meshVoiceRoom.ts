/**
 * P2P WebRTC Mesh Voice Room Manager (Discord Voice Channels UX)
 *
 * Provides a decentralized Full Mesh audio topology for groups of 2-6 peers.
 * Audio streams travel directly peer-to-peer over UDP with 0ms server transcoding overhead
 * and $0 SFU/MCU infrastructure cost.
 * The NestJS WebSocket gateway serves strictly as the signaling relay.
 */

export interface VoiceMeshPeer {
  peerId: string;
  pc: RTCPeerConnection;
  stream: MediaStream;
  audioElement: HTMLAudioElement;
  isSpeaking: boolean;
}

export interface VoiceMeshEvents {
  onPeersChange?: (peers: string[]) => void;
  onSpeakingChange?: (peerId: string, isSpeaking: boolean) => void;
  onLocalSpeakingChange?: (isSpeaking: boolean) => void;
  onError?: (error: string) => void;
}

export interface VoiceMeshSignalPayload {
  type: 'offer' | 'answer' | 'candidate';
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export class MeshVoiceRoomManager {
  private localStream: MediaStream | null = null;
  private peers = new Map<string, VoiceMeshPeer>();
  private audioContext: AudioContext | null = null;
  private vadInterval: ReturnType<typeof setInterval> | null = null;
  private isMuted = false;
  private isDeafened = false;
  private currentRoomId: string | null = null;

  constructor(
    private readonly currentUserId: string,
    private readonly socketEmit: (
      event: string,
      payload: unknown,
      callback?: (res: unknown) => void,
    ) => void,
    private readonly events: VoiceMeshEvents = {},
  ) {}

  public getConnectedPeerIds(): string[] {
    return Array.from(this.peers.keys());
  }

  public getRoomId(): string | null {
    return this.currentRoomId;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsDeafened(): boolean {
    return this.isDeafened;
  }

  /**
   * Joins the P2P Mesh Voice Room for a conversation / room.
   */
  public async join(roomId: string): Promise<void> {
    this.leave();
    this.currentRoomId = roomId;

    try {
      // 1. Acquire local microphone stream with high-fidelity Opus settings
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      this.setupLocalVAD(this.localStream);

      // 2. Announce join to signaling server
      this.socketEmit('voice:mesh-join', { roomId }, (res: unknown) => {
        const response = res as { success?: boolean; existingPeers?: string[] } | undefined;
        if (response?.success && Array.isArray(response.existingPeers)) {
          // For all existing peers already in the room, create connections and send offers
          for (const peerId of response.existingPeers) {
            if (peerId !== this.currentUserId) {
              void this.connectToPeer(peerId, true);
            }
          }
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      this.events.onError?.(msg);
      throw err;
    }
  }

  /**
   * Called when signaling relays that another peer joined the room.
   */
  public async handlePeerJoined(peerId: string): Promise<void> {
    if (peerId === this.currentUserId || this.peers.has(peerId)) return;
    // New peer waits for offer from joining initiator, or we initiate connection
    await this.connectToPeer(peerId, false);
  }

  /**
   * Called when signaling relays that a peer left the room.
   */
  public handlePeerLeft(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    try {
      peer.pc.close();
      peer.audioElement.pause();
      peer.audioElement.srcObject = null;
      peer.audioElement.remove();
    } catch {
      // Safe cleanup
    }

    this.peers.delete(peerId);
    this.events.onPeersChange?.(this.getConnectedPeerIds());
  }

  /**
   * Handles incoming signaling messages (offer, answer, candidate).
   */
  public async handleSignal(senderPeerId: string, signal: VoiceMeshSignalPayload): Promise<void> {
    let peer = this.peers.get(senderPeerId);
    if (!peer) {
      peer = await this.connectToPeer(senderPeerId, false);
    }

    if (signal.type === 'offer') {
      const desc = new RTCSessionDescription(signal.data as RTCSessionDescriptionInit);
      await peer.pc.setRemoteDescription(desc);

      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);

      this.socketEmit('voice:mesh-signal', {
        roomId: this.currentRoomId,
        targetPeerId: senderPeerId,
        signal: { type: 'answer', data: answer },
      });
    } else if (signal.type === 'answer') {
      const desc = new RTCSessionDescription(signal.data as RTCSessionDescriptionInit);
      await peer.pc.setRemoteDescription(desc);
    } else if (signal.type === 'candidate') {
      const candidate = new RTCIceCandidate(signal.data as RTCIceCandidateInit);
      await peer.pc.addIceCandidate(candidate).catch(() => {});
    }
  }

  /**
   * Toggles microphone mute state.
   */
  public toggleMute(explicitState?: boolean): boolean {
    this.isMuted = explicitState !== undefined ? explicitState : !this.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });
    }
    return this.isMuted;
  }

  /**
   * Toggles deafen state (mutes incoming peer audio elements).
   */
  public toggleDeafen(explicitState?: boolean): boolean {
    this.isDeafened = explicitState !== undefined ? explicitState : !this.isDeafened;
    this.peers.forEach((peer) => {
      peer.audioElement.muted = this.isDeafened;
    });
    return this.isDeafened;
  }

  /**
   * Disconnects from the mesh room and cleans up hardware tracks and connections.
   */
  public leave(): void {
    if (this.currentRoomId) {
      this.socketEmit('voice:mesh-leave', { roomId: this.currentRoomId });
      this.currentRoomId = null;
    }

    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // Safe
      }
      this.audioContext = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    this.peers.forEach((peer) => {
      try {
        peer.pc.close();
        peer.audioElement.pause();
        peer.audioElement.srcObject = null;
        peer.audioElement.remove();
      } catch {
        // Safe
      }
    });

    this.peers.clear();
    this.events.onPeersChange?.([]);
  }

  private async connectToPeer(peerId: string, isInitiator: boolean): Promise<VoiceMeshPeer> {
    if (this.peers.has(peerId)) {
      return this.peers.get(peerId)!;
    }

    const pc = new RTCPeerConnection({
      iceServers: DEFAULT_ICE_SERVERS,
      bundlePolicy: 'max-bundle',
    });

    const remoteStream =
      typeof MediaStream !== 'undefined'
        ? new MediaStream()
        : ({ getTracks: () => [], addTrack: () => {} } as unknown as MediaStream);
    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    audioEl.muted = this.isDeafened;
    try {
      audioEl.srcObject = remoteStream;
    } catch {
      // Safe fallback in test DOM
    }

    // Attach local audio track
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      this.setupRemoteVAD(peerId, remoteStream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socketEmit('voice:mesh-signal', {
          roomId: this.currentRoomId,
          targetPeerId: peerId,
          signal: { type: 'candidate', data: event.candidate.toJSON() },
        });
      }
    };

    const peerObj: VoiceMeshPeer = {
      peerId,
      pc,
      stream: remoteStream,
      audioElement: audioEl,
      isSpeaking: false,
    };

    this.peers.set(peerId, peerObj);
    this.events.onPeersChange?.(this.getConnectedPeerIds());

    if (isInitiator) {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);

      this.socketEmit('voice:mesh-signal', {
        roomId: this.currentRoomId,
        targetPeerId: peerId,
        signal: { type: 'offer', data: offer },
      });
    }

    return peerObj;
  }

  private setupLocalVAD(stream: MediaStream): void {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let wasSpeaking = false;

      this.vadInterval = setInterval(() => {
        if (this.isMuted) {
          if (wasSpeaking) {
            wasSpeaking = false;
            this.events.onLocalSpeakingChange?.(false);
          }
          return;
        }

        analyser.getByteFrequencyData(buffer);
        const avg = buffer.reduce((a, b) => a + b, 0) / (buffer.length || 1);
        const isSpeaking = avg > 18; // Voice activity threshold

        if (isSpeaking !== wasSpeaking) {
          wasSpeaking = isSpeaking;
          this.events.onLocalSpeakingChange?.(isSpeaking);
        }
      }, 100);
    } catch {
      // WebAudio not supported in environment
    }
  }

  private setupRemoteVAD(peerId: string, stream: MediaStream): void {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') return;
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let wasSpeaking = false;

      const interval = setInterval(() => {
        const peer = this.peers.get(peerId);
        if (!peer) {
          clearInterval(interval);
          return;
        }

        analyser.getByteFrequencyData(buffer);
        const avg = buffer.reduce((a, b) => a + b, 0) / (buffer.length || 1);
        const isSpeaking = avg > 18;

        if (isSpeaking !== wasSpeaking) {
          wasSpeaking = isSpeaking;
          peer.isSpeaking = isSpeaking;
          this.events.onSpeakingChange?.(peerId, isSpeaking);
        }
      }, 100);
    } catch {
      // Ignored
    }
  }
}
