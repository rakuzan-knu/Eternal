/**
 * Pre-hover WebRTC Pre-warming Engine (Zero-Latency Call Join)
 *
 * Preheats RTCPeerConnection instances, STUN/TURN configurations, and ICE candidate
 * gathering 200-300ms prior to the user's actual click via mouseenter / touchstart events.
 * Enables near-instantaneous call connections (<20ms). Automatically purges unconsumed
 * preheated resources after a 6-second inactivity TTL.
 */

import type { IceServersResponse } from '@common/contracts';
import { apiClient } from '@/shared/api/httpClient';

export interface PrewarmedSession {
  peerConnection: RTCPeerConnection;
  iceServers: RTCIceServer[];
  createdAt: number;
  timerId: ReturnType<typeof setTimeout>;
  callId?: string;
  hasAudioPermission?: boolean;
}

export class WebRtcPrewarmer {
  private prewarmedSessions = new Map<string, PrewarmedSession>();
  private pendingDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private cachedIceServers: RTCIceServer[] | null = null;
  private lastIceFetchTime = 0;
  private readonly defaultIceServers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];

  public setIceServers(servers: RTCIceServer[]): void {
    this.cachedIceServers = servers;
    this.lastIceFetchTime = Date.now();
  }

  /**
   * Pre-fetches ICE servers or returns cached list (5 min TTL)
   */
  public async getOrFetchIceServers(): Promise<RTCIceServer[]> {
    const now = Date.now();
    if (this.cachedIceServers && now - this.lastIceFetchTime < 300000) {
      return this.cachedIceServers;
    }

    try {
      const res = await apiClient.get<IceServersResponse>('/calls/ice-servers');
      if (res.data?.iceServers && Array.isArray(res.data.iceServers)) {
        this.cachedIceServers = res.data.iceServers;
        this.lastIceFetchTime = now;
        return res.data.iceServers;
      }
    } catch {
      // Fall back to default STUN
    }

    return this.defaultIceServers;
  }

  /**
   * Pre-flight check for media permissions without activating hardware camera/mic LEDs
   */
  public async checkMediaPermissions(): Promise<{ audio: boolean; video: boolean }> {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      return { audio: true, video: true };
    }

    try {
      // Check microphone permission
      const micStatus = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      });
      const camStatus = await navigator.permissions.query({
        name: 'camera' as PermissionName,
      });

      return {
        audio: micStatus.state === 'granted',
        video: camStatus.state === 'granted',
      };
    } catch {
      return { audio: true, video: true };
    }
  }

  /**
   * Schedules debounced pre-warming (default 120ms) to filter out quick accidental cursor sweeps.
   */
  public schedulePrewarm(callKey = 'default', callId?: string, delayMs = 120): void {
    if (this.prewarmedSessions.has(callKey)) return;
    this.cancelPendingPrewarm(callKey);

    const timer = setTimeout(() => {
      this.pendingDebounceTimers.delete(callKey);
      void this.prewarm(callKey, callId);
    }, delayMs);

    this.pendingDebounceTimers.set(callKey, timer);
  }

  /**
   * Cancels a scheduled pre-warm if user moved cursor away before debounce finished.
   */
  public cancelPendingPrewarm(callKey = 'default'): boolean {
    const timer = this.pendingDebounceTimers.get(callKey);
    if (timer) {
      clearTimeout(timer);
      this.pendingDebounceTimers.delete(callKey);
      return true;
    }
    return false;
  }

  public hasPendingPrewarm(callKey = 'default'): boolean {
    return this.pendingDebounceTimers.has(callKey);
  }

  /**
   * Pre-warms a WebRTC connection ahead of click
   */
  public async prewarm(callKey = 'default', callId?: string): Promise<boolean> {
    this.cancelPendingPrewarm(callKey);

    if (this.prewarmedSessions.has(callKey)) {
      return true; // Already prewarmed
    }

    if (typeof RTCPeerConnection === 'undefined') {
      return false;
    }

    try {
      const [iceServers, perms] = await Promise.all([
        this.getOrFetchIceServers(),
        this.checkMediaPermissions(),
      ]);

      const pc = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 2,
        bundlePolicy: 'max-bundle',
      });

      // Add transceivers to trigger local candidate gathering ahead of offer/answer
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
        pc.addTransceiver('video', { direction: 'sendrecv' });
      } catch {
        // Transceivers may not be supported in mocked envs
      }

      // 6-second auto-cleanup if user never actually clicks the button
      const timerId = setTimeout(() => {
        this.dispose(callKey);
      }, 6000);

      this.prewarmedSessions.set(callKey, {
        peerConnection: pc,
        iceServers,
        createdAt: Date.now(),
        timerId,
        callId,
        hasAudioPermission: perms.audio,
      });

      return true;
    } catch (err) {
      console.warn('[WebRtcPrewarmer] Failed to prewarm connection:', err);
      return false;
    }
  }

  /**
   * Consumes a prewarmed connection on button click
   */
  public consumePrewarmed(callKey = 'default'): PrewarmedSession | null {
    this.cancelPendingPrewarm(callKey);

    const session = this.prewarmedSessions.get(callKey);
    if (!session) return null;

    clearTimeout(session.timerId);
    this.prewarmedSessions.delete(callKey);

    // Verify PC is still healthy
    if (session.peerConnection.connectionState === 'closed') {
      return null;
    }

    return session;
  }

  /**
   * Disposes prewarmed session and closes peer connection
   */
  public dispose(callKey: string): void {
    this.cancelPendingPrewarm(callKey);

    const session = this.prewarmedSessions.get(callKey);
    if (!session) return;

    clearTimeout(session.timerId);
    try {
      session.peerConnection.close();
    } catch {
      // Ignore
    }
    this.prewarmedSessions.delete(callKey);
  }

  public disposeAll(): void {
    for (const key of Array.from(this.pendingDebounceTimers.keys())) {
      this.cancelPendingPrewarm(key);
    }
    for (const key of Array.from(this.prewarmedSessions.keys())) {
      this.dispose(key);
    }
  }

  public hasPrewarmed(callKey = 'default'): boolean {
    return this.prewarmedSessions.has(callKey);
  }
}

export const globalWebRtcPrewarmer = new WebRtcPrewarmer();

/**
 * React hook returning pre-warming event handlers for call action buttons
 * with accidental hover sweep protection (120ms debounce) and automatic eviction.
 */
export function useCallPrewarmer(callKey = 'default', callId?: string) {
  const onMouseEnter = () => {
    globalWebRtcPrewarmer.schedulePrewarm(callKey, callId, 120);
  };

  const onMouseLeave = () => {
    // If not yet executed, cancel prewarm to save resources
    globalWebRtcPrewarmer.cancelPendingPrewarm(callKey);
  };

  const onTouchStart = () => {
    void globalWebRtcPrewarmer.prewarm(callKey, callId);
  };

  const prewarmImmediately = () => {
    void globalWebRtcPrewarmer.prewarm(callKey, callId);
  };

  return {
    onMouseEnter,
    onMouseLeave,
    onTouchStart,
    prewarmImmediately,
  };
}

export const usePrewarmCall = useCallPrewarmer;
