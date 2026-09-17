/**
 * Multi-Tab WebRTC Call Coordinator (Web Locks API + BroadcastChannel)
 *
 * Prevents multiple browser tabs from simultaneously playing incoming ringtones,
 * competing for microphone/camera access, or duplicate WebSocket signaling.
 * Uses Web Locks API for atomic Leader Election and BroadcastChannel for
 * inter-tab synchronization and failover.
 */

export type TabCallRole = 'MASTER' | 'SLAVE' | 'STANDBY';

export type TabSyncMessageType =
  | 'RINGING_ANNOUNCED'
  | 'LEADER_ELECTED'
  | 'CALL_STATE_SYNC'
  | 'SLAVE_ACTION_ACCEPT'
  | 'SLAVE_ACTION_DECLINE'
  | 'SLAVE_ACTION_MUTE'
  | 'SLAVE_ACTION_END'
  | 'CALL_TERMINATED';

export interface TabSyncMessage {
  type: TabSyncMessageType;
  tabId: string;
  callId: string;
  timestamp: number;
  payload?: unknown;
}

export interface MultiTabCallCoordinatorCallbacks {
  onRoleChange?: (role: TabCallRole) => void;
  onRemoteCommand?: (command: 'ACCEPT' | 'DECLINE' | 'MUTE' | 'END') => void;
  onStateSync?: (state: unknown) => void;
}

export class MultiTabCallCoordinator {
  public readonly tabId: string;
  private currentCallId: string | null = null;
  private role: TabCallRole = 'STANDBY';
  private broadcastChannel: BroadcastChannel | null = null;
  private lockAbortController: AbortController | null = null;
  private lockReleaseResolve: (() => void) | null = null;
  private isMasterRinging = false;
  private callbacks: MultiTabCallCoordinatorCallbacks = {};

  constructor(callbacks: MultiTabCallCoordinatorCallbacks = {}) {
    this.tabId = `tab_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    this.callbacks = callbacks;
  }

  /**
   * Begins multi-tab coordination for a given callId and optional userId scope
   */
  public async coordinateCall(callId: string, userId?: string): Promise<TabCallRole> {
    this.stop();
    this.currentCallId = callId;
    this.initBroadcastChannel(callId, userId);

    // If Web Locks API is not supported, fallback directly to MASTER
    if (
      typeof navigator === 'undefined' ||
      !navigator.locks ||
      typeof navigator.locks.request !== 'function'
    ) {
      this.setRole('MASTER');
      return 'MASTER';
    }

    this.setRole('SLAVE');
    this.lockAbortController = new AbortController();

    const userPrefix = userId ? `${userId}_` : '';
    const lockName = `webrtc_call_master_${userPrefix}${callId}`;

    // Request exclusive lock for Leader Election
    navigator.locks
      .request(
        lockName,
        {
          mode: 'exclusive',
          signal: this.lockAbortController.signal,
        },
        async () => {
          // This block runs ONLY when this tab has won/acquired the exclusive lock
          this.setRole('MASTER');
          this.postMessage('LEADER_ELECTED', { tabId: this.tabId });

          // Keep lock alive until call finishes or tab leaves
          return new Promise<void>((resolve) => {
            this.lockReleaseResolve = resolve;
          });
        },
      )
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          console.warn('[MultiTabCoordinator] Lock request error:', err);
        }
      });

    return this.role;
  }

  private initBroadcastChannel(callId: string, userId?: string): void {
    if (typeof BroadcastChannel === 'undefined') return;

    try {
      const userPrefix = userId ? `${userId}_` : '';
      this.broadcastChannel = new BroadcastChannel(`webrtc_call_channel_${userPrefix}${callId}`);
      this.broadcastChannel.onmessage = (event: MessageEvent<TabSyncMessage>) => {
        this.handleIncomingMessage(event.data);
      };
    } catch (err) {
      console.warn('[MultiTabCoordinator] BroadcastChannel error:', err);
    }
  }

  private handleIncomingMessage(msg: TabSyncMessage): void {
    if (!msg || msg.tabId === this.tabId || msg.callId !== this.currentCallId) return;

    switch (msg.type) {
      case 'RINGING_ANNOUNCED':
        this.isMasterRinging = true;
        break;

      case 'LEADER_ELECTED':
        if (this.role !== 'MASTER') {
          this.setRole('SLAVE');
        }
        break;

      case 'SLAVE_ACTION_ACCEPT':
        if (this.role === 'MASTER') {
          this.callbacks.onRemoteCommand?.('ACCEPT');
        }
        break;

      case 'SLAVE_ACTION_DECLINE':
        if (this.role === 'MASTER') {
          this.callbacks.onRemoteCommand?.('DECLINE');
        }
        break;

      case 'SLAVE_ACTION_MUTE':
        if (this.role === 'MASTER') {
          this.callbacks.onRemoteCommand?.('MUTE');
        }
        break;

      case 'SLAVE_ACTION_END':
        if (this.role === 'MASTER') {
          this.callbacks.onRemoteCommand?.('END');
        }
        break;

      case 'CALL_STATE_SYNC':
        this.callbacks.onStateSync?.(msg.payload);
        break;

      case 'CALL_TERMINATED':
        this.isMasterRinging = false;
        break;
    }
  }

  /**
   * Broadcasts a message to all peer tabs
   */
  public postMessage(type: TabSyncMessageType, payload?: unknown): void {
    if (!this.broadcastChannel || !this.currentCallId) return;

    try {
      const msg: TabSyncMessage = {
        type,
        tabId: this.tabId,
        callId: this.currentCallId,
        timestamp: Date.now(),
        payload,
      };
      this.broadcastChannel.postMessage(msg);
    } catch {
      // Channel might be closed
    }
  }

  /**
   * Announces incoming ringing. If master, signals slaves to mute local ringtones.
   */
  public announceRinging(): void {
    if (this.role === 'MASTER') {
      this.isMasterRinging = true;
      this.postMessage('RINGING_ANNOUNCED');
    }
  }

  /**
   * Whether this tab should suppress local audio ringtone (e.g. slave tab)
   */
  public shouldSuppressRingtone(): boolean {
    return this.role === 'SLAVE' && this.isMasterRinging;
  }

  public isLeader(): boolean {
    return this.role === 'MASTER';
  }

  public getRole(): TabCallRole {
    return this.role;
  }

  public sendSlaveAction(action: 'ACCEPT' | 'DECLINE' | 'MUTE' | 'END'): void {
    const typeMap: Record<string, TabSyncMessageType> = {
      ACCEPT: 'SLAVE_ACTION_ACCEPT',
      DECLINE: 'SLAVE_ACTION_DECLINE',
      MUTE: 'SLAVE_ACTION_MUTE',
      END: 'SLAVE_ACTION_END',
    };
    this.postMessage(typeMap[action]);
  }

  public syncStateToSlaves(state: unknown): void {
    if (this.role === 'MASTER') {
      this.postMessage('CALL_STATE_SYNC', state);
    }
  }

  private setRole(newRole: TabCallRole): void {
    if (this.role !== newRole) {
      this.role = newRole;
      this.callbacks.onRoleChange?.(newRole);
    }
  }

  /**
   * Releases lock and closes broadcast channel
   */
  public stop(): void {
    if (this.role === 'MASTER') {
      this.postMessage('CALL_TERMINATED');
    }

    if (this.lockReleaseResolve) {
      this.lockReleaseResolve();
      this.lockReleaseResolve = null;
    }

    if (this.lockAbortController) {
      this.lockAbortController.abort();
      this.lockAbortController = null;
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {
        // Safe close
      }
      this.broadcastChannel = null;
    }

    this.currentCallId = null;
    this.isMasterRinging = false;
    this.setRole('STANDBY');
  }
}
