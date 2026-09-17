/**
 * WebRTC Telemetry Collector
 *
 * Aggregates call quality metrics (RTT, packet loss, jitter, codecs, duration)
 * and dispatches them to POST /calls/telemetry upon call termination.
 */

import { apiClient } from '@/shared/api/httpClient';

export interface TelemetryData {
  callId: string;
  avgRttMs: number;
  maxRttMs?: number;
  packetLossRatio: number;
  jitterMs?: number;
  audioCodec?: string;
  videoCodec?: string;
  durationMs: number;
  endReason?: string;
}

export class TelemetryCollector {
  private rttSamples: number[] = [];
  private lossSamples: number[] = [];
  private jitterSamples: number[] = [];
  private audioCodec = 'opus';
  private videoCodec?: string;
  private startTime = 0;
  private isDispatched = false;

  constructor(
    private readonly callId: string,
    private readonly pc?: RTCPeerConnection | null,
  ) {
    this.startTime = Date.now();
  }

  public recordSample(rtt: number, lossPercent: number, jitter: number): void {
    if (rtt >= 0) this.rttSamples.push(rtt);
    if (lossPercent >= 0) this.lossSamples.push(lossPercent / 100);
    if (jitter >= 0) this.jitterSamples.push(jitter);
  }

  public async detectCodecs(): Promise<void> {
    if (!this.pc) return;
    try {
      const stats = await this.pc.getStats();
      stats.forEach((report) => {
        if (report.type === 'codec') {
          const mime = (report.mimeType as string) || '';
          if (mime.toLowerCase().includes('audio/')) {
            this.audioCodec = mime.split('/')[1] || 'opus';
          } else if (mime.toLowerCase().includes('video/')) {
            this.videoCodec = mime.split('/')[1] || 'VP9';
          }
        }
      });
    } catch {
      // getStats failed
    }
  }

  public async finalizeAndSend(endReason = 'ENDED_BY_USER'): Promise<TelemetryData | null> {
    if (this.isDispatched) return null;
    this.isDispatched = true;

    await this.detectCodecs();

    const durationMs = Math.max(0, Date.now() - this.startTime);

    const avgRttMs =
      this.rttSamples.length > 0
        ? Math.round((this.rttSamples.reduce((a, b) => a + b, 0) / this.rttSamples.length) * 10) /
          10
        : 0;

    const maxRttMs = this.rttSamples.length > 0 ? Math.max(...this.rttSamples) : undefined;

    const packetLossRatio =
      this.lossSamples.length > 0
        ? Math.round(
            (this.lossSamples.reduce((a, b) => a + b, 0) / this.lossSamples.length) * 1000,
          ) / 1000
        : 0;

    const jitterMs =
      this.jitterSamples.length > 0
        ? Math.round(
            (this.jitterSamples.reduce((a, b) => a + b, 0) / this.jitterSamples.length) * 10,
          ) / 10
        : undefined;

    const payload: TelemetryData = {
      callId: this.callId,
      avgRttMs,
      maxRttMs,
      packetLossRatio,
      jitterMs,
      audioCodec: this.audioCodec,
      videoCodec: this.videoCodec,
      durationMs,
      endReason,
    };

    try {
      await apiClient.post('/calls/telemetry', payload);
    } catch {
      // Ignore background telemetry errors
    }

    return payload;
  }
}
