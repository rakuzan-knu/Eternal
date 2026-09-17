/**
 * Decoupled WebRTC External Store & Finite State Machine (FSM)
 *
 * Decouples RTCPeerConnection lifecycle events from React component tree.
 * Prevents re-render cascades and race conditions via a strict FSM and
 * fine-grained useSyncExternalStore subscriptions.
 */

import { useSyncExternalStore, useRef } from 'react';

export type CallFSMState =
  'IDLE' | 'CALLING' | 'RINGING' | 'SIGNALING' | 'CONNECTED' | 'RECONNECTING' | 'ENDED';

export const VALID_FSM_TRANSITIONS: Record<CallFSMState, readonly CallFSMState[]> = {
  IDLE: ['CALLING', 'RINGING'],
  CALLING: ['SIGNALING', 'ENDED'],
  RINGING: ['SIGNALING', 'ENDED'],
  SIGNALING: ['CONNECTED', 'RECONNECTING', 'ENDED'],
  CONNECTED: ['RECONNECTING', 'ENDED'],
  RECONNECTING: ['CONNECTED', 'ENDED'],
  ENDED: ['IDLE'],
};

export interface CallExternalSnapshot {
  fsmState: CallFSMState;
  callId: string | null;
  callType: 'audio' | 'video';
  peerConnectionState: RTCPeerConnectionState | 'new';
  iceConnectionState: RTCIceConnectionState | 'new';
  iceGatheringState: RTCIceGatheringState | 'new';
  signalingState: RTCSignalingState | 'stable';
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  isMuted: boolean;
  isVideoOff: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  lastError: string | null;
  updatedAt: number;
}

const INITIAL_SNAPSHOT: CallExternalSnapshot = {
  fsmState: 'IDLE',
  callId: null,
  callType: 'audio',
  peerConnectionState: 'new',
  iceConnectionState: 'new',
  iceGatheringState: 'new',
  signalingState: 'stable',
  localStream: null,
  remoteStreams: {},
  isMuted: false,
  isVideoOff: false,
  connectionQuality: 'good',
  lastError: null,
  updatedAt: Date.now(),
};

export class WebRTCCallExternalStore {
  private snapshot: CallExternalSnapshot = { ...INITIAL_SNAPSHOT };
  private readonly listeners = new Set<() => void>();

  /**
   * Validates and performs state transition according to the FSM rules
   */
  public transition(nextState: CallFSMState, reason?: string): boolean {
    const currentState = this.snapshot.fsmState;

    if (currentState === nextState) return true;

    const allowed = VALID_FSM_TRANSITIONS[currentState];
    if (!allowed || !allowed.includes(nextState)) {
      console.warn(
        `[CallFSM] Invalid transition rejected: ${currentState} -> ${nextState} (Reason: ${reason || 'unspecified'})`,
      );
      return false;
    }

    this.snapshot = {
      ...this.snapshot,
      fsmState: nextState,
      updatedAt: Date.now(),
    };

    this.notifyListeners();
    return true;
  }

  /**
   * Updates partial state fields outside the React render cycle
   */
  public update(partial: Partial<Omit<CallExternalSnapshot, 'fsmState'>>): void {
    let hasChange = false;

    for (const [key, value] of Object.entries(partial)) {
      if (!Object.is((this.snapshot as unknown as Record<string, unknown>)[key], value)) {
        hasChange = true;
        break;
      }
    }

    if (!hasChange) return;

    this.snapshot = {
      ...this.snapshot,
      ...partial,
      updatedAt: Date.now(),
    };

    this.notifyListeners();
  }

  /**
   * Resets store back to IDLE
   */
  public reset(): void {
    this.snapshot = {
      ...INITIAL_SNAPSHOT,
      updatedAt: Date.now(),
    };
    this.notifyListeners();
  }

  public getSnapshot = (): CallExternalSnapshot => {
    return this.snapshot;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.warn('[CallExternalStore] Listener exception:', err);
      }
    }
  }
}

// Global shared instance for application-wide WebRTC store decoupling
export const globalCallExternalStore = new WebRTCCallExternalStore();

/**
 * Fine-grained useSyncExternalStore selector hook.
 * React component re-renders ONLY when the slice returned by selector changes.
 */
export function useCallExternalStore<T>(
  selector: (state: CallExternalSnapshot) => T,
  store: WebRTCCallExternalStore = globalCallExternalStore,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const lastSelectedRef = useRef<T | undefined>(undefined);

  const getSelection = () => {
    const nextSelected = selector(store.getSnapshot());
    if (lastSelectedRef.current !== undefined && isEqual(lastSelectedRef.current, nextSelected)) {
      return lastSelectedRef.current;
    }
    lastSelectedRef.current = nextSelected;
    return nextSelected;
  };

  return useSyncExternalStore(store.subscribe, getSelection, getSelection);
}
