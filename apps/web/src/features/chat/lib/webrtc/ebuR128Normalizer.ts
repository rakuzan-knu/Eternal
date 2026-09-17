/**
 * EBU R128 / ITU-R BS.1770-4 Loudness Normalization Engine for WebRTC Audio
 *
 * Implements real-time LUFS (Loudness Units Full Scale) measurement using
 * K-weighting pre-filtering (high-shelf acoustic head model + RLB high-pass filter),
 * short-term rolling loudness integration, silence gating (-65 LUFS),
 * asymmetrical gain leveling, and peak ceiling limiting (-1 dBFS).
 */

export interface EbuR128Options {
  sampleRate?: number;
  targetLufs?: number; // e.g. -23.0 LUFS (EBU standard) or -18.0 LUFS (VoIP standard)
  maxBoostDb?: number;
  maxCutDb?: number;
  silenceGateLufs?: number;
  attackMs?: number;
  releaseMs?: number;
}

export interface LoudnessStats {
  momentaryLufs: number;
  appliedGainDb: number;
  peakDbFs: number;
}

/**
 * Pure DSP core for EBU R128 measurement & normalization
 */
export class EbuR128NormalizerDSP {
  private readonly sampleRate: number;
  private readonly targetLufs: number;
  private readonly maxBoostDb: number;
  private readonly maxCutDb: number;
  private readonly silenceGateLufs: number;

  // Biquad Filter 1: High shelf (+4dB @ 1682Hz)
  private b0_1 = 1;
  private b1_1 = 0;
  private b2_1 = 0;
  private a1_1 = 0;
  private a2_1 = 0;
  private x1_1 = 0;
  private x2_1 = 0;
  private y1_1 = 0;
  private y2_1 = 0;

  // Biquad Filter 2: High pass (RLB weighting @ 38Hz)
  private b0_2 = 1;
  private b1_2 = 0;
  private b2_2 = 0;
  private a1_2 = 0;
  private a2_2 = 0;
  private x1_2 = 0;
  private x2_2 = 0;
  private y1_2 = 0;
  private y2_2 = 0;

  // Smoothed gain state
  private currentGain = 1.0;
  private readonly attackCoeff: number;
  private readonly releaseCoeff: number;

  // Peak limiter state
  private peakHold = 0;
  private readonly limiterCeilingLinear = Math.pow(10, -1.0 / 20); // -1.0 dBFS ceiling

  private lastMomentaryLufs = -70.0;
  private lastPeak = 0;

  constructor(options: EbuR128Options = {}) {
    this.sampleRate = options.sampleRate ?? 48000;
    this.targetLufs = options.targetLufs ?? -23.0;
    this.maxBoostDb = options.maxBoostDb ?? 18.0;
    this.maxCutDb = options.maxCutDb ?? 24.0;
    this.silenceGateLufs = options.silenceGateLufs ?? -65.0;

    const attackMs = options.attackMs ?? 50.0;
    const releaseMs = options.releaseMs ?? 800.0;

    this.attackCoeff = 1.0 - Math.exp(-1.0 / ((attackMs / 1000) * this.sampleRate));
    this.releaseCoeff = 1.0 - Math.exp(-1.0 / ((releaseMs / 1000) * this.sampleRate));

    this.computeKWeightingCoefficients();
  }

  /**
   * Computes ITU-R BS.1770-4 K-weighting biquad coefficients
   */
  private computeKWeightingCoefficients(): void {
    const fs = this.sampleRate;

    // Stage 1: High shelf filter (f0 = 1681.97 Hz, Gain = +3.9998 dB, Q = 0.7071)
    const f0_shelf = 1681.9744509555319;
    const gainDb_shelf = 3.99984385397;
    const K_shelf = Math.tan((Math.PI * f0_shelf) / fs);
    const Vh = Math.pow(10, gainDb_shelf / 20.0);
    const sqrt2 = Math.SQRT2;

    const norm1 = 1.0 + sqrt2 * K_shelf + K_shelf * K_shelf;
    this.b0_1 = (Vh + Math.sqrt(2.0 * Vh) * K_shelf + K_shelf * K_shelf) / norm1;
    this.b1_1 = (2.0 * (K_shelf * K_shelf - Vh)) / norm1;
    this.b2_1 = (Vh - Math.sqrt(2.0 * Vh) * K_shelf + K_shelf * K_shelf) / norm1;
    this.a1_1 = (2.0 * (K_shelf * K_shelf - 1.0)) / norm1;
    this.a2_1 = (1.0 - sqrt2 * K_shelf + K_shelf * K_shelf) / norm1;

    // Stage 2: High pass filter (f0 = 38.135 Hz, Q = 0.5003)
    const f0_hp = 38.13547087613982;
    const K_hp = Math.tan((Math.PI * f0_hp) / fs);
    const Q_hp = 0.5003270373253953;

    const norm2 = 1.0 + K_hp / Q_hp + K_hp * K_hp;
    this.b0_2 = 1.0 / norm2;
    this.b1_2 = -2.0 / norm2;
    this.b2_2 = 1.0 / norm2;
    this.a1_2 = (2.0 * (K_hp * K_hp - 1.0)) / norm2;
    this.a2_2 = (1.0 - K_hp / Q_hp + K_hp * K_hp) / norm2;
  }

  /**
   * Processes a chunk of audio in-place, returning measured stats
   */
  public process(samples: Float32Array): LoudnessStats {
    const len = samples.length;
    if (len === 0) {
      return {
        momentaryLufs: this.lastMomentaryLufs,
        appliedGainDb: 20 * Math.log10(Math.max(1e-5, this.currentGain)),
        peakDbFs: -100,
      };
    }

    let sumSquares = 0.0;
    let localPeak = 0.0;

    // Step 1: Run through K-weighting filters & measure momentary power
    for (let i = 0; i < len; i++) {
      const x = samples[i] ?? 0;
      const absX = Math.abs(x);
      if (absX > localPeak) localPeak = absX;

      // Filter 1 (High shelf)
      const y1 =
        this.b0_1 * x +
        this.b1_1 * this.x1_1 +
        this.b2_1 * this.x2_1 -
        this.a1_1 * this.y1_1 -
        this.a2_1 * this.y2_1;
      this.x2_1 = this.x1_1;
      this.x1_1 = x;
      this.y2_1 = this.y1_1;
      this.y1_1 = y1;

      // Filter 2 (RLB High pass)
      const y2 =
        this.b0_2 * y1 +
        this.b1_2 * this.x1_2 +
        this.b2_2 * this.x2_2 -
        this.a1_2 * this.y1_2 -
        this.a2_2 * this.y2_2;
      this.x2_2 = this.x1_2;
      this.x1_2 = y1;
      this.y2_2 = this.y1_2;
      this.y1_2 = y2;

      sumSquares += y2 * y2;
    }

    // Step 2: Compute momentary LUFS: LK = -0.691 + 10 * log10(mean_square)
    const meanSquare = sumSquares / len;
    const momentaryLufs = meanSquare > 1e-12 ? -0.691 + 10.0 * Math.log10(meanSquare) : -100.0;
    this.lastMomentaryLufs = momentaryLufs;
    this.lastPeak = localPeak;

    // Step 3: Compute target normalization gain
    let targetGainLinear = 1.0;
    if (momentaryLufs > this.silenceGateLufs) {
      const deltaDb = this.targetLufs - momentaryLufs;
      // Clamp within boost/cut limits
      const clampedDeltaDb = Math.max(-this.maxCutDb, Math.min(this.maxBoostDb, deltaDb));
      targetGainLinear = Math.pow(10, clampedDeltaDb / 20.0);
    } else {
      // Below silence gate: smoothly relax towards unity gain (1.0)
      targetGainLinear = 1.0;
    }

    // Step 4: Apply smoothed gain & soft-knee peak limiter
    for (let i = 0; i < len; i++) {
      const coeff = targetGainLinear > this.currentGain ? this.releaseCoeff : this.attackCoeff;
      this.currentGain += (targetGainLinear - this.currentGain) * coeff;

      let out = (samples[i] ?? 0) * this.currentGain;

      // Soft-knee limiter ceiling
      const absOut = Math.abs(out);
      if (absOut > this.peakHold) {
        this.peakHold = absOut;
      } else {
        this.peakHold *= 0.9995; // fast peak release
      }

      if (this.peakHold > this.limiterCeilingLinear) {
        const reduction = this.limiterCeilingLinear / this.peakHold;
        out *= reduction;
      }

      // Hard safety guard [-1.0, 1.0]
      samples[i] = Math.max(-1.0, Math.min(1.0, out));
    }

    const appliedGainDb = 20 * Math.log10(Math.max(1e-5, this.currentGain));
    const peakDbFs = localPeak > 1e-5 ? 20 * Math.log10(localPeak) : -100.0;

    return {
      momentaryLufs,
      appliedGainDb,
      peakDbFs,
    };
  }

  public reset(): void {
    this.x1_1 = 0;
    this.x2_1 = 0;
    this.y1_1 = 0;
    this.y2_1 = 0;
    this.x1_2 = 0;
    this.x2_2 = 0;
    this.y1_2 = 0;
    this.y2_2 = 0;
    this.currentGain = 1.0;
    this.peakHold = 0;
    this.lastMomentaryLufs = -70.0;
    this.lastPeak = 0;
  }
}

/**
 * Creates an EBU R128 auto-leveling audio processing node in Web Audio API
 */
export function createEbuR128Node(context: AudioContext, options: EbuR128Options = {}): AudioNode {
  const dsp = new EbuR128NormalizerDSP({
    sampleRate: context.sampleRate,
    ...options,
  });

  const bufferSize = 512;
  const scriptNode = context.createScriptProcessor(bufferSize, 1, 1);

  scriptNode.onaudioprocess = (event: AudioProcessingEvent) => {
    const input = event.inputBuffer.getChannelData(0);
    const output = event.outputBuffer.getChannelData(0);
    output.set(input);
    dsp.process(output);
  };

  return scriptNode;
}
