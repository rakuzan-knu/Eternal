/**
 * W3C Perfect Negotiation Pattern & Glare Collision Finite State Machine (FSM)
 *
 * Provides deterministic, collision-free WebRTC peer renegotiation with polite/impolite
 * role arbitration, state rollbacks, and non-destructive transceiver direction switching.
 */

export interface PerfectNegotiationSignal {
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface PerfectNegotiationOptions {
  pc: RTCPeerConnection;
  isPolite: boolean;
  sendSignal: (signal: PerfectNegotiationSignal) => void | Promise<void>;
  onTrack?: (event: RTCTrackEvent) => void;
}

export class PerfectNegotiationFSM {
  private readonly pc: RTCPeerConnection;
  public readonly isPolite: boolean;
  private readonly sendSignal: (signal: PerfectNegotiationSignal) => void | Promise<void>;

  private isMakingOffer = false;
  private ignoreOffer = false;
  private isSettingRemoteAnswerPending = false;

  constructor(options: PerfectNegotiationOptions) {
    this.pc = options.pc;
    this.isPolite = options.isPolite;
    this.sendSignal = options.sendSignal;

    this.bindEvents(options.onTrack);
  }

  private bindEvents(onTrack?: (event: RTCTrackEvent) => void): void {
    // 1. Negotiation Needed listener
    this.pc.onnegotiationneeded = async () => {
      if (this.pc.signalingState !== 'stable') {
        return;
      }
      try {
        this.isMakingOffer = true;
        await this.pc.setLocalDescription();
        if (this.pc.localDescription) {
          await this.sendSignal({ description: this.pc.localDescription });
        }
      } catch (err) {
        console.warn('[PerfectNegotiation] Negotiation needed error:', err);
      } finally {
        this.isMakingOffer = false;
      }
    };

    // 2. Track arrival listener
    if (onTrack) {
      this.pc.ontrack = onTrack;
    }
  }

  /**
   * Processes incoming offer description with glare collision handling.
   * If collision occurs:
   * - Polite peer rolls back local description and accepts the remote offer.
   * - Impolite peer drops/ignores the remote offer and stays on its own offer.
   */
  public async handleOffer(
    offer: RTCSessionDescriptionInit,
  ): Promise<{ ignored: boolean; answer?: RTCSessionDescriptionInit }> {
    const offerCollision = this.isMakingOffer || this.pc.signalingState !== 'stable';
    this.ignoreOffer = !this.isPolite && offerCollision;

    if (this.ignoreOffer) {
      return { ignored: true };
    }

    if (offerCollision) {
      // Polite peer rolls back its local draft offer
      await Promise.all([
        this.pc.setLocalDescription({ type: 'rollback' }),
        this.pc.setRemoteDescription(offer),
      ]);
    } else {
      await this.pc.setRemoteDescription(offer);
    }

    await this.pc.setLocalDescription();
    const answer = this.pc.localDescription ?? undefined;

    if (answer) {
      await this.sendSignal({ description: answer });
    }

    return { ignored: false, answer };
  }

  /**
   * Processes incoming answer description
   */
  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    this.isSettingRemoteAnswerPending = true;
    try {
      await this.pc.setRemoteDescription(answer);
    } finally {
      this.isSettingRemoteAnswerPending = false;
    }
  }

  /**
   * Adds remote ICE candidate safely, guarding against ignored offers
   */
  public async handleCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.pc.addIceCandidate(candidate);
    } catch (err) {
      if (!this.ignoreOffer) {
        console.warn('[PerfectNegotiation] Failed to add ICE candidate:', err);
      }
    }
  }

  /**
   * Updates transceiver stream direction without track re-creation churn
   * (e.g., 'sendrecv' -> 'sendonly' -> 'inactive')
   */
  public setTransceiverDirection(
    kind: 'audio' | 'video',
    direction: RTCRtpTransceiverDirection,
  ): boolean {
    const transceivers = this.pc.getTransceivers ? this.pc.getTransceivers() : [];
    const target = transceivers.find(
      (t) =>
        (t.sender.track && t.sender.track.kind === kind) ||
        (t.receiver.track && t.receiver.track.kind === kind),
    );

    if (target && target.direction !== direction) {
      target.direction = direction;
      return true;
    }
    return false;
  }

  /**
   * Queries internal FSM status
   */
  public getStatus() {
    return {
      isPolite: this.isPolite,
      isMakingOffer: this.isMakingOffer,
      ignoreOffer: this.ignoreOffer,
      isSettingRemoteAnswerPending: this.isSettingRemoteAnswerPending,
      signalingState: this.pc.signalingState,
    };
  }
}

export type SignalingFSMState =
  'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'disconnected';

export type SignalingFSMEvent =
  | { type: 'OFFER_ARRIVED'; offer: RTCSessionDescriptionInit }
  | { type: 'ANSWER_ARRIVED'; answer: RTCSessionDescriptionInit }
  | { type: 'ICE_ARRIVED'; candidate: RTCIceCandidateInit }
  | { type: 'RECONNECT' }
  | { type: 'DISCONNECT' }
  | { type: 'MUTE'; kind: 'audio' | 'video'; muted: boolean }
  | { type: 'DROP_CONNECTION' }
  | { type: 'CONNECTED' };

export class WebRTCSignalingFSM {
  private currentState: SignalingFSMState = 'idle';
  private readonly negotiationFSM: PerfectNegotiationFSM;
  private readonly pc: RTCPeerConnection;

  constructor(options: PerfectNegotiationOptions) {
    this.pc = options.pc;
    this.negotiationFSM = new PerfectNegotiationFSM(options);
  }

  get state(): SignalingFSMState {
    return this.currentState;
  }

  get isPolite(): boolean {
    return this.negotiationFSM.isPolite;
  }

  public async dispatch(event: SignalingFSMEvent): Promise<void> {
    switch (event.type) {
      case 'OFFER_ARRIVED': {
        if (this.currentState === 'idle' || this.currentState === 'reconnecting') {
          this.currentState = 'connecting';
        }
        const res = await this.negotiationFSM.handleOffer(event.offer);
        if (!res.ignored && this.currentState === 'connecting') {
          this.currentState = 'connected';
        }
        break;
      }
      case 'ANSWER_ARRIVED': {
        await this.negotiationFSM.handleAnswer(event.answer);
        if (this.currentState === 'connecting' || this.currentState === 'reconnecting') {
          this.currentState = 'connected';
        }
        break;
      }
      case 'ICE_ARRIVED': {
        await this.negotiationFSM.handleCandidate(event.candidate);
        break;
      }
      case 'CONNECTED': {
        if (this.currentState !== 'disconnected' && this.currentState !== 'failed') {
          this.currentState = 'connected';
        }
        break;
      }
      case 'MUTE': {
        const direction = event.muted ? 'sendonly' : 'sendrecv';
        this.negotiationFSM.setTransceiverDirection(event.kind, direction);
        break;
      }
      case 'DROP_CONNECTION': {
        if (this.currentState === 'connected' || this.currentState === 'connecting') {
          this.currentState = 'reconnecting';
        }
        break;
      }
      case 'RECONNECT': {
        if (this.currentState !== 'connected') {
          this.currentState = 'connecting';
        }
        break;
      }
      case 'DISCONNECT': {
        this.currentState = 'disconnected';
        break;
      }
    }
  }

  public getStatus() {
    return {
      state: this.currentState,
      ...this.negotiationFSM.getStatus(),
    };
  }
}
