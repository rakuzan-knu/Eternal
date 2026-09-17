/**
 * Smart Bandwidth Adaptation Engine for WebRTC
 *
 * Continuously samples RTCPeerConnection.getStats() every 2 seconds.
 * Detects packet loss, jitter spikes, and RTT inflation, automatically
 * downscaling video resolution and tuning Opus audio parameters via RTCRtpSender.setParameters().
 */

import { SatelliteGCC, type SatelliteMode, type SatelliteGCCDecision } from './satelliteGCC';

export interface NetworkStats {
  packetLoss: number; // percentage (0 - 100)
  rtt: number; // ms
  jitter: number; // ms
  bitrate: number; // kbps
  quality: 'good' | 'fair' | 'poor';
  isSatellite?: boolean;
  baselineRtt?: number;
  delayGradient?: number;
}

export interface BandwidthAdapterCallbacks {
  onStatsUpdate?: (stats: NetworkStats) => void;
  onQualityChange?: (quality: 'good' | 'fair' | 'poor') => void;
  onSatelliteDecision?: (decision: SatelliteGCCDecision) => void;
  onAudioOnlyFallback?: (enabled: boolean, reason: string | null) => void;
}

export class BandwidthAdapter {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private prevPacketsLost = 0;
  private prevPacketsSent = 0;
  private prevBytesSent = 0;
  private consecutiveGoodIntervals = 0;
  private consecutiveSevereIntervals = 0;
  private consecutiveRecoveryIntervals = 0;
  private isAudioOnlyFallback = false;
  private currentDegradationLevel = 0; // 0: None, 1: Moderate, 2: Heavy
  private satelliteGcc: SatelliteGCC;

  constructor(
    private readonly pc: RTCPeerConnection,
    private readonly callbacks: BandwidthAdapterCallbacks = {},
    satelliteMode: SatelliteMode = 'auto',
  ) {
    this.satelliteGcc = new SatelliteGCC(satelliteMode);
  }

  public setSatelliteMode(mode: SatelliteMode): void {
    this.satelliteGcc.setMode(mode);
  }

  public getSatelliteMode(): SatelliteMode {
    return this.satelliteGcc.getMode();
  }

  start(intervalMs = 2000): void {
    this.stop();
    this.intervalId = setInterval(() => {
      void this.sampleStats();
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async sampleStats(): Promise<void> {
    if (this.pc.connectionState === 'closed') {
      this.stop();
      return;
    }

    try {
      const stats = await this.pc.getStats();
      let packetsSent = 0;
      let packetsLost = 0;
      let bytesSent = 0;
      let rtt = 0;
      let jitter = 0;

      stats.forEach((report) => {
        if (report.type === 'outbound-rtp') {
          packetsSent += (report.packetsSent as number) || 0;
          bytesSent += (report.bytesSent as number) || 0;
        } else if (report.type === 'remote-inbound-rtp') {
          packetsLost += (report.packetsLost as number) || 0;
          if (typeof report.roundTripTime === 'number') {
            rtt = Math.max(rtt, report.roundTripTime * 1000);
          }
          if (typeof report.jitter === 'number') {
            jitter = Math.max(jitter, report.jitter * 1000);
          }
        } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          if (typeof report.currentRoundTripTime === 'number') {
            rtt = Math.max(rtt, report.currentRoundTripTime * 1000);
          }
        }
      });

      // Calculate deltas
      const deltaSent = Math.max(0, packetsSent - this.prevPacketsSent);
      const deltaLost = Math.max(0, packetsLost - this.prevPacketsLost);
      const deltaBytes = Math.max(0, bytesSent - this.prevBytesSent);

      this.prevPacketsSent = packetsSent;
      this.prevPacketsLost = packetsLost;
      this.prevBytesSent = bytesSent;

      const totalDelta = deltaSent + deltaLost;
      const packetLossPercent =
        totalDelta > 0 ? Math.min(100, Math.round((deltaLost / totalDelta) * 100)) : 0;
      const bitrateKbps = Math.round((deltaBytes * 8) / 2000); // 2-second interval

      const satDecision = this.satelliteGcc.processStats(
        rtt,
        packetLossPercent,
        jitter,
        bitrateKbps,
      );
      this.callbacks.onSatelliteDecision?.(satDecision);

      const isSatelliteActive =
        satDecision.isSatelliteDetected || this.satelliteGcc.getMode() === 'enabled';

      let quality: 'good' | 'fair' | 'poor' = 'good';

      if (isSatelliteActive) {
        quality = satDecision.quality;
        if (satDecision.state === 'OVERUSE') {
          quality = 'poor';
          this.consecutiveGoodIntervals = 0;
          await this.adaptDown(2); // Heavy reduction
        } else if (satDecision.quality === 'fair') {
          this.consecutiveGoodIntervals = 0;
          await this.adaptDown(1); // Moderate reduction
        } else {
          this.consecutiveGoodIntervals++;
          if (this.consecutiveGoodIntervals >= 3 && this.currentDegradationLevel > 0) {
            await this.adaptUp();
          }
        }
      } else {
        if (packetLossPercent > 10 || jitter > 100 || rtt > 350) {
          quality = 'poor';
          this.consecutiveGoodIntervals = 0;
          await this.adaptDown(2); // Heavy reduction
        } else if (packetLossPercent > 3 || jitter > 50 || rtt > 180) {
          quality = 'fair';
          this.consecutiveGoodIntervals = 0;
          await this.adaptDown(1); // Moderate reduction
        } else {
          quality = 'good';
          this.consecutiveGoodIntervals++;
          if (this.consecutiveGoodIntervals >= 3 && this.currentDegradationLevel > 0) {
            await this.adaptUp();
          }
        }
      }

      // Automatic Audio-Only Fallback detection & Jitter Buffer Adaptation
      const isSevere = rtt > 300 || packetLossPercent > 8 || jitter > 60;
      if (isSevere) {
        this.consecutiveSevereIntervals++;
        this.consecutiveRecoveryIntervals = 0;
        if (this.consecutiveSevereIntervals >= 2 && !this.isAudioOnlyFallback) {
          const reason =
            rtt > 300
              ? `RTT exceeded ${Math.round(rtt)}ms`
              : packetLossPercent > 8
                ? `High packet loss (${packetLossPercent}%)`
                : `Jitter spike (${Math.round(jitter)}ms)`;
          await this.enableAudioOnlyFallback(reason);
        }
      } else {
        this.consecutiveSevereIntervals = 0;
        if (this.isAudioOnlyFallback && rtt < 180 && packetLossPercent < 2 && jitter < 30) {
          this.consecutiveRecoveryIntervals++;
          if (this.consecutiveRecoveryIntervals >= 2) {
            await this.disableAudioOnlyFallback();
          }
        } else {
          this.consecutiveRecoveryIntervals = 0;
        }
      }

      const summary: NetworkStats = {
        packetLoss: packetLossPercent,
        rtt: Math.round(rtt),
        jitter: Math.round(jitter),
        bitrate: bitrateKbps,
        quality,
        isSatellite: satDecision.isSatelliteDetected,
        baselineRtt: satDecision.baselineRttMs,
        delayGradient: satDecision.delayGradientMs,
      };

      this.callbacks.onStatsUpdate?.(summary);
      this.callbacks.onQualityChange?.(quality);
    } catch {
      // getStats error during connection renegotiation or teardown
    }
  }

  /**
   * Degrades video resolution and audio bitrate to maintain call fluency
   */
  private async adaptDown(targetLevel: number): Promise<void> {
    if (this.currentDegradationLevel >= targetLevel) return;
    this.currentDegradationLevel = targetLevel;

    const senders = this.pc.getSenders();
    for (const sender of senders) {
      if (!sender.track) continue;

      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }

      if (sender.track.kind === 'video') {
        if (targetLevel === 2) {
          // Heavy: 4x downscale, cap at 300kbps
          params.encodings[0].scaleResolutionDownBy = 4;
          params.encodings[0].maxBitrate = 300_000;
          params.degradationPreference = 'maintain-framerate';
        } else {
          // Moderate: 2x downscale, cap at 750kbps
          params.encodings[0].scaleResolutionDownBy = 2;
          params.encodings[0].maxBitrate = 750_000;
          params.degradationPreference = 'balanced';
        }
        await sender.setParameters(params).catch(() => {});
      } else if (sender.track.kind === 'audio') {
        // Opus bandwidth reduction
        params.encodings[0].maxBitrate = targetLevel === 2 ? 20_000 : 32_000;
        await sender.setParameters(params).catch(() => {});
      }
    }
  }

  /**
   * Restores video resolution and bitrate when conditions improve
   */
  private async adaptUp(): Promise<void> {
    this.currentDegradationLevel = Math.max(0, this.currentDegradationLevel - 1);
    this.consecutiveGoodIntervals = 0;

    const senders = this.pc.getSenders();
    for (const sender of senders) {
      if (!sender.track) continue;

      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) continue;

      if (sender.track.kind === 'video') {
        if (this.currentDegradationLevel === 1) {
          params.encodings[0].scaleResolutionDownBy = 2;
          params.encodings[0].maxBitrate = 900_000;
          params.degradationPreference = 'balanced';
        } else {
          // Full HD restoration
          params.encodings[0].scaleResolutionDownBy = 1;
          params.encodings[0].maxBitrate = 2_500_000;
          params.degradationPreference = 'maintain-resolution';
        }
        await sender.setParameters(params).catch(() => {});
      } else if (sender.track.kind === 'audio') {
        params.encodings[0].maxBitrate = 64_000;
        await sender.setParameters(params).catch(() => {});
      }
    }
  }

  public isAudioOnlyFallbackActive(): boolean {
    return this.isAudioOnlyFallback;
  }

  public async enableAudioOnlyFallback(reason: string): Promise<void> {
    if (this.isAudioOnlyFallback) return;
    this.isAudioOnlyFallback = true;

    // 1. Suspend outgoing video tracks
    const senders = this.pc.getSenders();
    for (const sender of senders) {
      if (sender.track && sender.track.kind === 'video') {
        sender.track.enabled = false;
      } else if (sender.track && sender.track.kind === 'audio') {
        // Boost Opus FEC protection & clamp to 24kbps for maximum intelligibility
        const params = sender.getParameters();
        if (params.encodings && params.encodings[0]) {
          params.encodings[0].maxBitrate = 24_000;
          await sender.setParameters(params).catch(() => {});
        }
      }
    }

    // 2. Adapt receiver jitter buffer via playoutDelayHint to absorb severe jitter spikes
    try {
      const receivers = this.pc.getReceivers();
      for (const receiver of receivers) {
        if (receiver.track && receiver.track.kind === 'audio') {
          if ('playoutDelayHint' in (receiver as any)) {
            (receiver as any).playoutDelayHint = 0.2; // 200ms target jitter buffer
          }
        }
      }
    } catch {
      // Ignore in unsupported environments
    }

    this.callbacks.onAudioOnlyFallback?.(true, reason);
  }

  public async disableAudioOnlyFallback(): Promise<void> {
    if (!this.isAudioOnlyFallback) return;
    this.isAudioOnlyFallback = false;

    // 1. Restore video tracks
    const senders = this.pc.getSenders();
    for (const sender of senders) {
      if (sender.track && sender.track.kind === 'video') {
        sender.track.enabled = true;
      } else if (sender.track && sender.track.kind === 'audio') {
        const params = sender.getParameters();
        if (params.encodings && params.encodings[0]) {
          params.encodings[0].maxBitrate = 64_000;
          await sender.setParameters(params).catch(() => {});
        }
      }
    }

    // 2. Restore receiver jitter buffer
    try {
      const receivers = this.pc.getReceivers();
      for (const receiver of receivers) {
        if (receiver.track && receiver.track.kind === 'audio') {
          if ('playoutDelayHint' in (receiver as any)) {
            (receiver as any).playoutDelayHint = 0.05; // 50ms standard delay
          }
        }
      }
    } catch {
      // Ignore
    }

    this.callbacks.onAudioOnlyFallback?.(false, null);
  }
}
