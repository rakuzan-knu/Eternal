/**
 * Adaptive Satellite & Extreme Network Congestion Control (Satellite-GCC)
 *
 * Tailored for Non-Terrestrial Networks (NTN):
 * - Starlink Low-Earth Orbit (LEO) satellite constellations
 * - Geostationary (GEO) satellite links (Inmarsat, Viasat, HughesNet)
 * - In-flight Airplane Wi-Fi (600+ ms high propagation latency)
 * - Maritime & offshore satellite communications
 *
 * Key Capabilities:
 * 1. Dynamic Baseline RTT Tracker (RTT_base): Evaluates relative gradient d(Δd)/dt
 *    rather than absolute RTT. High RTT (600-900 ms) is recognized as physical
 *    propagation delay rather than bufferbloat, preventing bitrate collapse.
 * 2. LEO Satellite Beam Handoff Damper: Filters momentary (1-2s) jitter spikes
 *    caused by 15-second satellite track transitions.
 * 3. High Delay-Bandwidth Product (BDP) queue tolerance with packet loss resilience up to 20%.
 * 4. Forward Error Correction (FEC) dynamic tuning for Opus audio.
 */

export type CongestionState = 'NORMAL' | 'OVERUSE' | 'UNDERUSE';
export type SatelliteMode = 'auto' | 'enabled' | 'disabled';

export interface SatelliteGCCDecision {
  state: CongestionState;
  recommendedBitrateKbps: number;
  quality: 'good' | 'fair' | 'poor';
  isSatelliteDetected: boolean;
  baselineRttMs: number;
  delayGradientMs: number;
}

export class SatelliteGCC {
  private rttWindow: number[] = [];
  private readonly windowSize = 15;
  private mode: SatelliteMode = 'auto';
  private consecutiveSpikes = 0;
  private currentBitrateKbps = 1200; // Default 1.2 Mbps
  private minBitrateKbps = 128;
  private maxBitrateKbps = 2500;
  private isSatellite = false;

  constructor(mode: SatelliteMode = 'auto') {
    this.mode = mode;
  }

  public setMode(mode: SatelliteMode): void {
    this.mode = mode;
  }

  public getMode(): SatelliteMode {
    return this.mode;
  }

  public isSatelliteLinkDetected(): boolean {
    return this.isSatellite;
  }

  /**
   * Process periodic network statistics (every 1-2s) and compute optimal target bitrate
   */
  public processStats(
    rttMs: number,
    lossPercent: number,
    jitterMs: number,
    currentBitrate?: number,
  ): SatelliteGCCDecision {
    if (currentBitrate && currentBitrate > 0) {
      this.currentBitrateKbps = currentBitrate;
    }

    // 1. Maintain sliding RTT window
    if (rttMs > 0) {
      this.rttWindow.push(rttMs);
      if (this.rttWindow.length > this.windowSize) {
        this.rttWindow.shift();
      }
    }

    // Baseline RTT (minimum propagation time in the observation window)
    const baselineRttMs =
      this.rttWindow.length > 0 ? Math.min(...this.rttWindow) : Math.max(rttMs, 50);

    // Current delay gradient over baseline: Δd = RTT_t - RTT_base
    const delayGradientMs = Math.max(0, rttMs - baselineRttMs);

    // 2. Satellite Link Detection (Auto mode)
    // Starlink / In-flight Wi-Fi typically exhibits RTT >= 450ms with relatively low loss (<10%)
    if (this.mode === 'enabled') {
      this.isSatellite = true;
    } else if (this.mode === 'disabled') {
      this.isSatellite = false;
    } else {
      // Auto detection: sustained RTT >= 400ms across recent 5 samples
      const recentSamples = this.rttWindow.slice(-5);
      const recentMin = recentSamples.length > 0 ? Math.min(...recentSamples) : rttMs;
      if (recentMin >= 400 && recentSamples.length >= 5) {
        this.isSatellite = true;
      } else if (baselineRttMs < 250 && this.rttWindow.length >= 8) {
        this.isSatellite = false;
      }
    }

    // 3. Congestion State & Trendline Analysis
    let state: CongestionState = 'NORMAL';

    if (this.isSatellite) {
      // SATELLITE OPTIMIZED GCC LOGIC:
      // Tolerates high physical RTT (600-1000 ms) without downscaling!
      // Only triggers OVERUSE if the delay gradient grows rapidly (queuing) OR loss exceeds 18%
      const gradientThreshold = 250; // 250ms queuing delay gradient tolerance
      const lossThreshold = 18; // 18% wireless loss tolerance before downscale

      // Beam Handoff Damper: Single-sample jitter spikes (e.g., 200ms) are suppressed
      if (jitterMs > 150 && lossPercent < 5 && delayGradientMs < gradientThreshold) {
        this.consecutiveSpikes++;
        // If spike lasts only 1-2 intervals, treat as transient LEO beam handoff
        if (this.consecutiveSpikes <= 2) {
          state = 'NORMAL';
        } else {
          state = 'OVERUSE';
        }
      } else {
        this.consecutiveSpikes = 0;

        if (delayGradientMs > gradientThreshold || lossPercent > lossThreshold) {
          state = 'OVERUSE';
        } else {
          state = 'NORMAL';
        }
      }
    } else {
      // STANDARD TERRESTRIAL GCC LOGIC:
      // Strict thresholds for fiber/5G networks
      if (lossPercent > 10 || jitterMs > 100 || rttMs > 350) {
        state = 'OVERUSE';
      } else if (lossPercent < 2 && jitterMs < 20 && rttMs < 80) {
        state = 'UNDERUSE';
      } else {
        state = 'NORMAL';
      }
    }

    // 4. Rate Adaptation Engine (Additive Increase / Multiplicative Decrease)
    let quality: 'good' | 'fair' | 'poor' = 'good';

    if (state === 'OVERUSE') {
      quality = 'poor';
      // Multiplicative decrease: back off by 15% in satellite, 25% in terrestrial
      const backoffFactor = this.isSatellite ? 0.85 : 0.75;
      this.currentBitrateKbps = Math.max(
        this.minBitrateKbps,
        Math.round(this.currentBitrateKbps * backoffFactor),
      );
    } else if (state === 'UNDERUSE') {
      quality = 'good';
      // Additive increase: probe bandwidth with +100 kbps
      const increaseKbps = this.isSatellite ? 75 : 120;
      this.currentBitrateKbps = Math.min(
        this.maxBitrateKbps,
        this.currentBitrateKbps + increaseKbps,
      );
    } else {
      quality = lossPercent > 5 || delayGradientMs > 120 ? 'fair' : 'good';
    }

    return {
      state,
      recommendedBitrateKbps: this.currentBitrateKbps,
      quality,
      isSatelliteDetected: this.isSatellite,
      baselineRttMs,
      delayGradientMs,
    };
  }

  /**
   * Generates Opus audio SDP parameter tuning for extreme satellite resilience
   */
  public getOpusSdpFormatParams(): string {
    if (this.isSatellite) {
      // Force in-band FEC and 25% loss resilience for crystal clear voice over satellite
      return 'minptime=10;useinbandfec=1;maxaveragebitrate=64000;packetlosspercentage=25';
    }
    return 'minptime=10;useinbandfec=1;maxaveragebitrate=128000';
  }
}
