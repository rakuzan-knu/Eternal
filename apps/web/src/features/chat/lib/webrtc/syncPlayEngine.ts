/**
 * Frame-Accurate SyncPlay Engine (P2P Watch Together)
 *
 * Implements P2P NTP (Network Time Protocol) over RTCDataChannel ('p2p-syncplay')
 * for microsecond-accurate clock offset estimation, latency-compensated play/pause/seek,
 * and dynamic drift compensation using video playback rate adjustment.
 */

export interface NTPPingMessage {
  type: 'NTP_PING';
  t0: number; // Sender local timestamp
}

export interface NTPPongMessage {
  type: 'NTP_PONG';
  t0: number;
  t1: number; // Receiver arrival timestamp
  t2: number; // Receiver departure timestamp
}

export interface SyncPlayStateMessage {
  type: 'PLAY' | 'PAUSE' | 'SEEK' | 'SOURCE_CHANGE' | 'HEARTBEAT';
  currentTime: number;
  isPlaying: boolean;
  sentAt: number; // Sender local timestamp
  sourceUrl?: string;
  sourceTitle?: string;
}

export type SyncPlayMessage = NTPPingMessage | NTPPongMessage | SyncPlayStateMessage;

export interface SyncPlayEngineCallbacks {
  onSourceChange?: (url: string, title?: string) => void;
  onDriftUpdate?: (driftMs: number, rttMs: number) => void;
  onSyncStateChange?: (isPlaying: boolean, currentTime: number) => void;
}

export class SyncPlayEngine {
  private channel: RTCDataChannel | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private isHost = false;
  private isApplyingRemoteAction = false;

  // Clock Synchronization (NTP)
  private clockOffset = 0; // remoteTime = localTime + clockOffset
  private roundTripTime = 0; // ms
  private readonly offsetSamples: number[] = [];
  private ntpInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly callbacks: SyncPlayEngineCallbacks = {}) {}

  /**
   * Bind an RTCDataChannel dedicated to SyncPlay
   */
  bindDataChannel(channel: RTCDataChannel, isHost = false): void {
    this.channel = channel;
    this.isHost = isHost;

    channel.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as SyncPlayMessage;
        this.handleMessage(msg);
      } catch (err) {
        console.warn('[SyncPlay] Malformed message:', err);
      }
    };

    channel.onopen = () => {
      this.startNTP();
      if (this.isHost) {
        this.startHeartbeat();
      }
    };

    channel.onclose = () => {
      this.stopIntervals();
    };

    if (channel.readyState === 'open') {
      this.startNTP();
      if (this.isHost) {
        this.startHeartbeat();
      }
    }
  }

  /**
   * Attach video element to synchronize
   */
  attachVideo(video: HTMLVideoElement): void {
    this.videoElement = video;
  }

  detachVideo(): void {
    this.videoElement = null;
  }

  /**
   * Local user triggers Play
   */
  notifyPlay(): void {
    if (this.isApplyingRemoteAction || !this.videoElement) return;
    this.sendState({
      type: 'PLAY',
      currentTime: this.videoElement.currentTime,
      isPlaying: true,
      sentAt: Date.now(),
    });
  }

  /**
   * Local user triggers Pause
   */
  notifyPause(): void {
    if (this.isApplyingRemoteAction || !this.videoElement) return;
    this.sendState({
      type: 'PAUSE',
      currentTime: this.videoElement.currentTime,
      isPlaying: false,
      sentAt: Date.now(),
    });
  }

  /**
   * Local user seeks video
   */
  notifySeek(time: number): void {
    if (this.isApplyingRemoteAction) return;
    this.sendState({
      type: 'SEEK',
      currentTime: time,
      isPlaying: this.videoElement ? !this.videoElement.paused : false,
      sentAt: Date.now(),
    });
  }

  /**
   * Change video source across peers
   */
  notifySourceChange(url: string, title?: string): void {
    this.sendState({
      type: 'SOURCE_CHANGE',
      currentTime: 0,
      isPlaying: false,
      sentAt: Date.now(),
      sourceUrl: url,
      ...(title ? { sourceTitle: title } : {}),
    });
  }

  /**
   * Calculate Clock Offset using simplified NTP algorithm
   * t0: Client Ping Sent
   * t1: Remote Ping Received
   * t2: Remote Pong Sent
   * t3: Client Pong Received
   */
  calculateNTPOffset(
    t0: number,
    t1: number,
    t2: number,
    t3: number,
  ): { offset: number; rtt: number } {
    const rtt = Math.max(0, t3 - t0 - (t2 - t1));
    const offset = (t1 - t0 + (t2 - t3)) / 2;
    return { offset, rtt };
  }

  private handleMessage(msg: SyncPlayMessage): void {
    switch (msg.type) {
      case 'NTP_PING': {
        const t1 = Date.now();
        const pong: NTPPongMessage = {
          type: 'NTP_PONG',
          t0: msg.t0,
          t1,
          t2: Date.now(),
        };
        this.send(pong);
        break;
      }
      case 'NTP_PONG': {
        const t3 = Date.now();
        const { offset, rtt } = this.calculateNTPOffset(msg.t0, msg.t1, msg.t2, t3);
        this.roundTripTime = rtt;

        this.offsetSamples.push(offset);
        if (this.offsetSamples.length > 5) {
          this.offsetSamples.shift();
        }

        // Rolling median offset
        const sorted = [...this.offsetSamples].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        this.clockOffset = sorted[mid] ?? offset;

        this.callbacks.onDriftUpdate?.(this.clockOffset, this.roundTripTime);
        break;
      }
      case 'SOURCE_CHANGE': {
        if (msg.sourceUrl) {
          this.callbacks.onSourceChange?.(msg.sourceUrl, msg.sourceTitle);
        }
        break;
      }
      case 'PLAY': {
        this.applyRemotePlayback(msg, true);
        break;
      }
      case 'PAUSE': {
        this.applyRemotePlayback(msg, false);
        break;
      }
      case 'SEEK': {
        this.applyRemoteSeek(msg);
        break;
      }
      case 'HEARTBEAT': {
        this.applyPeriodicDriftCorrection(msg);
        break;
      }
    }
  }

  private applyRemotePlayback(msg: SyncPlayStateMessage, shouldPlay: boolean): void {
    if (!this.videoElement) return;

    this.isApplyingRemoteAction = true;

    // Latency compensation: calculate elapsed time since remote sent action
    const remoteNow = Date.now() + this.clockOffset;
    const transmissionLatencySec = Math.max(0, (remoteNow - msg.sentAt) / 1000);
    const predictedTime = shouldPlay ? msg.currentTime + transmissionLatencySec : msg.currentTime;

    // Adjust position if discrepancy > 40ms
    if (Math.abs(this.videoElement.currentTime - predictedTime) > 0.04) {
      this.videoElement.currentTime = predictedTime;
    }

    if (shouldPlay) {
      this.videoElement.playbackRate = 1.0;
      void this.videoElement.play().catch(() => {});
    } else {
      this.videoElement.pause();
    }

    this.callbacks.onSyncStateChange?.(shouldPlay, predictedTime);

    setTimeout(() => {
      this.isApplyingRemoteAction = false;
    }, 150);
  }

  private applyRemoteSeek(msg: SyncPlayStateMessage): void {
    if (!this.videoElement) return;

    this.isApplyingRemoteAction = true;
    this.videoElement.currentTime = msg.currentTime;
    this.callbacks.onSyncStateChange?.(!this.videoElement.paused, msg.currentTime);

    setTimeout(() => {
      this.isApplyingRemoteAction = false;
    }, 150);
  }

  /**
   * Smooth drift compensation using video playback rate
   */
  private applyPeriodicDriftCorrection(msg: SyncPlayStateMessage): void {
    if (
      !this.videoElement ||
      this.isApplyingRemoteAction ||
      this.videoElement.paused !== !msg.isPlaying
    ) {
      return;
    }

    const remoteNow = Date.now() + this.clockOffset;
    const latencySec = Math.max(0, (remoteNow - msg.sentAt) / 1000);
    const expectedTime = msg.currentTime + (msg.isPlaying ? latencySec : 0);
    const driftSec = this.videoElement.currentTime - expectedTime;
    const absDrift = Math.abs(driftSec);

    this.callbacks.onDriftUpdate?.(Math.round(driftSec * 1000), this.roundTripTime);

    if (absDrift < 0.05) {
      // Well within tolerance (<50ms), keep normal rate
      if (this.videoElement.playbackRate !== 1.0) {
        this.videoElement.playbackRate = 1.0;
      }
    } else if (absDrift <= 0.8) {
      // Subtle pitch-neutral speed adjustment to gently align clocks without audio cuts
      if (driftSec < 0) {
        // We are behind, slightly speed up
        this.videoElement.playbackRate = 1.05;
      } else {
        // We are ahead, slightly slow down
        this.videoElement.playbackRate = 0.95;
      }
    } else {
      // Large drift (>800ms), snap to frame
      this.videoElement.currentTime = expectedTime;
      this.videoElement.playbackRate = 1.0;
    }
  }

  private startNTP(): void {
    if (this.ntpInterval) clearInterval(this.ntpInterval);
    const sendPing = () => {
      if (this.channel?.readyState === 'open') {
        const ping: NTPPingMessage = {
          type: 'NTP_PING',
          t0: Date.now(),
        };
        this.send(ping);
      }
    };
    sendPing();
    this.ntpInterval = setInterval(sendPing, 5000);
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.videoElement && this.channel?.readyState === 'open') {
        this.sendState({
          type: 'HEARTBEAT',
          currentTime: this.videoElement.currentTime,
          isPlaying: !this.videoElement.paused,
          sentAt: Date.now(),
        });
      }
    }, 2000);
  }

  private stopIntervals(): void {
    if (this.ntpInterval) {
      clearInterval(this.ntpInterval);
      this.ntpInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendState(state: SyncPlayStateMessage): void {
    this.send(state);
  }

  private send(msg: SyncPlayMessage): void {
    if (this.channel && this.channel.readyState === 'open') {
      try {
        this.channel.send(JSON.stringify(msg));
      } catch (err) {
        console.warn('[SyncPlay] Failed to send message:', err);
      }
    }
  }

  get currentOffset(): number {
    return this.clockOffset;
  }

  get currentRTT(): number {
    return this.roundTripTime;
  }

  destroy(): void {
    this.stopIntervals();
    this.videoElement = null;
    this.channel = null;
    this.offsetSamples.length = 0;
  }
}
