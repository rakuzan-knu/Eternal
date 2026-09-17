/**
 * Client WebRTC Stats Engine & IndexedDB Persistence
 *
 * Continuously polls pc.getStats() every 1000ms, calculates real-time deltas
 * (Jitter Buffer Delay, Packet Loss Ratio, Frame Drop Rate, Bitrate),
 * determines connection health quality, and persists metrics into IndexedDB.
 */

export interface WebRtcMetricSample {
  id?: number;
  callId: string;
  timestamp: number;
  rttMs: number;
  jitterMs: number;
  packetLossRatio: number; // 0 to 1
  frameDropRate: number; // 0 to 1
  audioBitrateKbps: number;
  videoBitrateKbps: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface WebRtcStatsEngineOptions {
  callId: string;
  intervalMs?: number;
  onSample?: (sample: WebRtcMetricSample) => void;
  onQualityChange?: (quality: 'excellent' | 'good' | 'fair' | 'poor') => void;
}

interface PreviousRawStats {
  timestamp: number;
  audioBytesReceived: number;
  audioPacketsReceived: number;
  audioPacketsLost: number;
  videoBytesReceived: number;
  videoPacketsReceived: number;
  videoPacketsLost: number;
  framesReceived: number;
  framesDropped: number;
}

const DB_NAME = 'webrtc_telemetry';
const DB_VERSION = 1;
const STORE_NAME = 'call_stats';

export class WebRtcStatsEngine {
  private timer: NodeJS.Timeout | null = null;
  private db: IDBDatabase | null = null;
  private prevStats: PreviousRawStats | null = null;
  private currentQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
  private readonly callId: string;
  private readonly intervalMs: number;
  private readonly onSample?: (sample: WebRtcMetricSample) => void;
  private readonly onQualityChange?: (quality: 'excellent' | 'good' | 'fair' | 'poor') => void;

  constructor(options: WebRtcStatsEngineOptions) {
    this.callId = options.callId;
    this.intervalMs = options.intervalMs ?? 1000;
    this.onSample = options.onSample;
    this.onQualityChange = options.onQualityChange;
  }

  /**
   * Initializes IndexedDB database
   */
  public async initDb(): Promise<void> {
    if (typeof indexedDB === 'undefined') return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('by_callId', 'callId', { unique: false });
          store.createIndex('by_timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Starts periodic polling of RTCPeerConnection statistics
   */
  public start(pc: RTCPeerConnection): void {
    if (this.timer) {
      this.stop();
    }

    void this.initDb().catch(() => {});

    this.timer = setInterval(async () => {
      try {
        await this.collectSample(pc);
      } catch {
        // Silently handle transient getStats failures during ICE negotiation
      }
    }, this.intervalMs);
  }

  /**
   * Stops stats polling
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.prevStats = null;
  }

  /**
   * Collect a single sample delta from RTCPeerConnection.getStats()
   */
  public async collectSample(pc: RTCPeerConnection): Promise<WebRtcMetricSample | null> {
    if (!pc || pc.connectionState === 'closed') return null;

    const statsReport = await pc.getStats();
    const now = Date.now();

    let rttMs = 0;
    let jitterMs = 0;
    let audioBytesReceived = 0;
    let audioPacketsReceived = 0;
    let audioPacketsLost = 0;
    let videoBytesReceived = 0;
    let videoPacketsReceived = 0;
    let videoPacketsLost = 0;
    let framesReceived = 0;
    let framesDropped = 0;

    statsReport.forEach((report) => {
      // Round-trip time from candidate-pair
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        const currentRtt = report.currentRoundTripTime ?? report.roundTripTime;
        if (typeof currentRtt === 'number') {
          rttMs = Math.round(currentRtt * 1000);
        }
      }

      // Inbound RTP streams
      if (report.type === 'inbound-rtp') {
        if (report.kind === 'audio' || report.mediaType === 'audio') {
          audioBytesReceived += report.bytesReceived ?? 0;
          audioPacketsReceived += report.packetsReceived ?? 0;
          audioPacketsLost += report.packetsLost ?? 0;
          if (typeof report.jitter === 'number') {
            jitterMs = Math.max(jitterMs, Math.round(report.jitter * 1000));
          }
        } else if (report.kind === 'video' || report.mediaType === 'video') {
          videoBytesReceived += report.bytesReceived ?? 0;
          videoPacketsReceived += report.packetsReceived ?? 0;
          videoPacketsLost += report.packetsLost ?? 0;
          framesReceived += report.framesReceived ?? 0;
          framesDropped += report.framesDropped ?? 0;
        }
      }
    });

    let packetLossRatio = 0;
    let frameDropRate = 0;
    let audioBitrateKbps = 0;
    let videoBitrateKbps = 0;

    if (this.prevStats) {
      const timeDeltaSec = Math.max(0.001, (now - this.prevStats.timestamp) / 1000);
      if (timeDeltaSec > 0) {
        // Bitrates
        const dAudioBytes = Math.max(0, audioBytesReceived - this.prevStats.audioBytesReceived);
        const dVideoBytes = Math.max(0, videoBytesReceived - this.prevStats.videoBytesReceived);
        audioBitrateKbps = Math.round((dAudioBytes * 8) / (timeDeltaSec * 1000));
        videoBitrateKbps = Math.round((dVideoBytes * 8) / (timeDeltaSec * 1000));

        // Packet loss delta
        const dPacketsLost = Math.max(
          0,
          audioPacketsLost +
            videoPacketsLost -
            (this.prevStats.audioPacketsLost + this.prevStats.videoPacketsLost),
        );
        const dPacketsReceived = Math.max(
          0,
          audioPacketsReceived +
            videoPacketsReceived -
            (this.prevStats.audioPacketsReceived + this.prevStats.videoPacketsReceived),
        );
        const totalPackets = dPacketsReceived + dPacketsLost;
        if (totalPackets > 0) {
          packetLossRatio = Math.min(1, Math.max(0, dPacketsLost / totalPackets));
        }

        // Frame drop rate delta
        const dFramesReceived = Math.max(0, framesReceived - this.prevStats.framesReceived);
        const dFramesDropped = Math.max(0, framesDropped - this.prevStats.framesDropped);
        if (dFramesReceived > 0) {
          frameDropRate = Math.min(1, Math.max(0, dFramesDropped / dFramesReceived));
        }
      }
    }

    this.prevStats = {
      timestamp: now,
      audioBytesReceived,
      audioPacketsReceived,
      audioPacketsLost,
      videoBytesReceived,
      videoPacketsReceived,
      videoPacketsLost,
      framesReceived,
      framesDropped,
    };

    // Calculate quality tier
    let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    if (rttMs > 400 || packetLossRatio > 0.15 || frameDropRate > 0.2) {
      quality = 'poor';
    } else if (rttMs > 200 || packetLossRatio > 0.05 || frameDropRate > 0.1) {
      quality = 'fair';
    } else if (rttMs > 100 || packetLossRatio > 0.02) {
      quality = 'good';
    }

    if (quality !== this.currentQuality) {
      this.currentQuality = quality;
      this.onQualityChange?.(quality);
    }

    const sample: WebRtcMetricSample = {
      callId: this.callId,
      timestamp: now,
      rttMs,
      jitterMs,
      packetLossRatio: Math.round(packetLossRatio * 1000) / 1000,
      frameDropRate: Math.round(frameDropRate * 1000) / 1000,
      audioBitrateKbps,
      videoBitrateKbps,
      quality,
    };

    this.onSample?.(sample);
    void this.saveSampleToDb(sample);

    return sample;
  }

  /**
   * Persists the metric sample to IndexedDB
   */
  private async saveSampleToDb(sample: WebRtcMetricSample): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.add(sample);
    } catch {
      // DB write error (e.g. quota exceeded)
    }
  }

  /**
   * Query historical samples from IndexedDB for this call
   */
  public async getHistory(limit = 100): Promise<WebRtcMetricSample[]> {
    if (!this.db) {
      await this.initDb().catch(() => {});
    }
    if (!this.db) return [];

    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('by_callId');
      const request = index.getAll(IDBKeyRange.only(this.callId));

      request.onsuccess = () => {
        const results = (request.result as WebRtcMetricSample[]) || [];
        resolve(results.slice(-limit));
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  }

  /**
   * Cleans up historical metrics for a given call
   */
  public async clearHistory(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('by_callId');
      const request = index.openKeyCursor(IDBKeyRange.only(this.callId));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        resolve();
      };
    });
  }
}
