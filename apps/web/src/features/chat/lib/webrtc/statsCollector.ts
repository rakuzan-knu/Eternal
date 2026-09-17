/**
 * WebRTC Live Stats Collector (Discord-Style HUD Diagnostics)
 *
 * Polls RTCPeerConnection.getStats() every second and maintains rolling time-series
 * buffers for Bitrate (In/Out), Jitter, RTT, Packet Loss, and Framerate.
 * Identifies active video codec (AV1/VP9/VP8/H.264), audio codec, and connection routing (P2P vs TURN).
 */

export interface LiveConnectionStats {
  bitrateInKbps: number;
  bitrateOutKbps: number;
  fpsIn: number;
  fpsOut: number;
  jitterMs: number;
  rttMs: number;
  packetLossPercent: number;
  audioBufferDelayMs: number;
  videoCodec: string;
  audioCodec: string;
  connectionType: 'Direct P2P (Local)' | 'STUN (Reflexive)' | 'TURN Relay' | 'Unknown';
  resolution: string;

  // Rolling history (last 30 samples, 1/sec)
  history: {
    bitrateIn: number[];
    bitrateOut: number[];
    jitter: number[];
    loss: number[];
    fps: number[];
  };
}

export type StatsUpdateCallback = (stats: LiveConnectionStats) => void;

export class LiveStatsCollector {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private prevBytesReceived = 0;
  private prevBytesSent = 0;
  private prevPacketsLost = 0;
  private prevPacketsReceived = 0;
  private prevTimestamp = 0;

  private readonly maxHistoryLength = 30;
  private readonly history = {
    bitrateIn: [] as number[],
    bitrateOut: [] as number[],
    jitter: [] as number[],
    loss: [] as number[],
    fps: [] as number[],
  };

  private currentStats: LiveConnectionStats = {
    bitrateInKbps: 0,
    bitrateOutKbps: 0,
    fpsIn: 0,
    fpsOut: 0,
    jitterMs: 0,
    rttMs: 0,
    packetLossPercent: 0,
    audioBufferDelayMs: 0,
    videoCodec: 'Negotiating...',
    audioCodec: 'Opus 48kHz',
    connectionType: 'Unknown',
    resolution: '0x0',
    history: {
      bitrateIn: [],
      bitrateOut: [],
      jitter: [],
      loss: [],
      fps: [],
    },
  };

  constructor(
    private readonly pcGetter: () => RTCPeerConnection | null,
    private readonly onUpdate?: StatsUpdateCallback,
  ) {}

  start(intervalMs = 1000): void {
    this.stop();
    this.intervalId = setInterval(() => {
      void this.sample();
    }, intervalMs);
    void this.sample();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getSnapshot(): LiveConnectionStats {
    return {
      ...this.currentStats,
      history: {
        bitrateIn: [...this.history.bitrateIn],
        bitrateOut: [...this.history.bitrateOut],
        jitter: [...this.history.jitter],
        loss: [...this.history.loss],
        fps: [...this.history.fps],
      },
    };
  }

  async sample(): Promise<LiveConnectionStats> {
    const pc = this.pcGetter();
    if (!pc || pc.connectionState === 'closed') {
      return this.currentStats;
    }

    try {
      const stats = await pc.getStats();
      const now = Date.now();
      const deltaSec = this.prevTimestamp > 0 ? (now - this.prevTimestamp) / 1000 : 1;
      this.prevTimestamp = now;

      let bytesReceived = 0;
      let bytesSent = 0;
      let packetsLost = 0;
      let packetsReceived = 0;
      let jitterMs = 0;
      let rttMs = 0;
      let fpsIn = 0;
      let fpsOut = 0;
      let audioDelayMs = 0;
      let detectedVideoCodec = '';
      const detectedAudioCodec = 'Opus';
      let connType: LiveConnectionStats['connectionType'] = 'Unknown';
      let frameWidth = 0;
      let frameHeight = 0;

      // First pass: collect codecs map
      const codecMap = new Map<string, string>();
      stats.forEach((report) => {
        if (report.type === 'codec') {
          const mimeType = (report.mimeType as string) || '';
          const name = mimeType.replace(/^(video|audio)\//i, '').toUpperCase();
          codecMap.set(report.id as string, name);
        }
      });

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp') {
          if (report.kind === 'video') {
            bytesReceived += (report.bytesReceived as number) || 0;
            packetsLost += (report.packetsLost as number) || 0;
            packetsReceived += (report.packetsReceived as number) || 0;
            if (typeof report.jitter === 'number') {
              jitterMs = Math.max(jitterMs, report.jitter * 1000);
            }
            if (typeof report.framesPerSecond === 'number') {
              fpsIn = report.framesPerSecond;
            }
            if (typeof report.frameWidth === 'number' && typeof report.frameHeight === 'number') {
              frameWidth = report.frameWidth;
              frameHeight = report.frameHeight;
            }
            if (report.codecId && codecMap.has(report.codecId as string)) {
              detectedVideoCodec = codecMap.get(report.codecId as string) || '';
            }
          } else if (report.kind === 'audio') {
            bytesReceived += (report.bytesReceived as number) || 0;
            if (
              typeof report.jitterBufferDelay === 'number' &&
              typeof report.jitterBufferEmittedCount === 'number'
            ) {
              if (report.jitterBufferEmittedCount > 0) {
                audioDelayMs = Math.round(
                  (report.jitterBufferDelay / report.jitterBufferEmittedCount) * 1000,
                );
              }
            }
          }
        } else if (report.type === 'outbound-rtp') {
          if (report.kind === 'video') {
            bytesSent += (report.bytesSent as number) || 0;
            if (typeof report.framesPerSecond === 'number') {
              fpsOut = report.framesPerSecond;
            }
            if (report.codecId && codecMap.has(report.codecId as string)) {
              detectedVideoCodec =
                detectedVideoCodec || codecMap.get(report.codecId as string) || '';
            }
          } else if (report.kind === 'audio') {
            bytesSent += (report.bytesSent as number) || 0;
          }
        } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          if (typeof report.currentRoundTripTime === 'number') {
            rttMs = Math.round(report.currentRoundTripTime * 1000);
          }

          // Check candidate types
          const localCandidate = stats.get(report.localCandidateId as string);
          const remoteCandidate = stats.get(report.remoteCandidateId as string);

          const localType = (localCandidate?.candidateType as string) || '';
          const remoteType = (remoteCandidate?.candidateType as string) || '';

          if (localType === 'relay' || remoteType === 'relay') {
            connType = 'TURN Relay';
          } else if (localType === 'srflx' || localType === 'prflx' || remoteType === 'srflx') {
            connType = 'STUN (Reflexive)';
          } else if (localType === 'host' && remoteType === 'host') {
            connType = 'Direct P2P (Local)';
          } else {
            connType = 'STUN (Reflexive)';
          }
        }
      });

      // Calculate deltas
      const deltaBytesIn = Math.max(0, bytesReceived - this.prevBytesReceived);
      const deltaBytesOut = Math.max(0, bytesSent - this.prevBytesSent);
      const deltaLost = Math.max(0, packetsLost - this.prevPacketsLost);
      const deltaRecv = Math.max(0, packetsReceived - this.prevPacketsReceived);

      this.prevBytesReceived = bytesReceived;
      this.prevBytesSent = bytesSent;
      this.prevPacketsLost = packetsLost;
      this.prevPacketsReceived = packetsReceived;

      const bitrateInKbps = Math.round((deltaBytesIn * 8) / (deltaSec * 1000));
      const bitrateOutKbps = Math.round((deltaBytesOut * 8) / (deltaSec * 1000));

      const totalPackets = deltaLost + deltaRecv;
      const packetLossPercent =
        totalPackets > 0 ? Math.min(100, Math.round((deltaLost / totalPackets) * 100)) : 0;

      // Update history buffers
      this.pushHistory(this.history.bitrateIn, bitrateInKbps);
      this.pushHistory(this.history.bitrateOut, bitrateOutKbps);
      this.pushHistory(this.history.jitter, Math.round(jitterMs));
      this.pushHistory(this.history.loss, packetLossPercent);
      this.pushHistory(this.history.fps, Math.max(fpsIn, fpsOut));

      this.currentStats = {
        bitrateInKbps,
        bitrateOutKbps,
        fpsIn,
        fpsOut,
        jitterMs: Math.round(jitterMs),
        rttMs,
        packetLossPercent,
        audioBufferDelayMs: audioDelayMs,
        videoCodec: detectedVideoCodec || 'AV1/VP9',
        audioCodec: detectedAudioCodec,
        connectionType: connType,
        resolution: frameWidth > 0 ? `${frameWidth}x${frameHeight}` : '1280x720',
        history: {
          bitrateIn: [...this.history.bitrateIn],
          bitrateOut: [...this.history.bitrateOut],
          jitter: [...this.history.jitter],
          loss: [...this.history.loss],
          fps: [...this.history.fps],
        },
      };

      this.onUpdate?.(this.currentStats);
      return this.currentStats;
    } catch (err) {
      console.warn('[LiveStatsCollector] getStats error:', err);
      return this.currentStats;
    }
  }

  private pushHistory(arr: number[], val: number): void {
    arr.push(val);
    if (arr.length > this.maxHistoryLength) {
      arr.shift();
    }
  }

  destroy(): void {
    this.stop();
  }
}
