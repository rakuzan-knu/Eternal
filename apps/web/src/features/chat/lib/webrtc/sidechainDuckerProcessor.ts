/**
 * WebRTC Sidechain Ducking & Dynamic Limiter AudioWorklet DSP
 *
 * Implements real-time voice-activated sidechain ducking and soft-knee peak limiting
 * directly within the 128-sample render quantum of the Web Audio API AudioWorkletProcessor.
 *
 * Input 0: Voice Microphone
 * Input 1: Background / Screen share audio
 * Output 0: Mixed, ducked, and limited stereo/mono master
 */

export interface SidechainDuckerConfig {
  thresholdDb?: number; // e.g. -36 dBFS
  attackMs?: number; // e.g. 10 ms
  releaseMs?: number; // e.g. 200 ms
  duckingDepthDb?: number; // e.g. -18 dB (gain ~ 0.125)
  limiterThreshold?: number; // e.g. 0.95 (~ -0.45 dBFS)
  sampleRate?: number; // default 48000 Hz
}

export class SidechainDuckerDSP {
  public thresholdDb: number;
  public attackMs: number;
  public releaseMs: number;
  public duckingDepthDb: number;
  public limiterThreshold: number;
  public sampleRate: number;

  private currentGain = 1.0;
  private envelope = 0.0;

  constructor(config: SidechainDuckerConfig = {}) {
    this.thresholdDb = config.thresholdDb ?? -36.0;
    this.attackMs = config.attackMs ?? 10.0;
    this.releaseMs = config.releaseMs ?? 200.0;
    this.duckingDepthDb = config.duckingDepthDb ?? -18.0;
    this.limiterThreshold = config.limiterThreshold ?? 0.95;
    this.sampleRate = config.sampleRate ?? 48000;
  }

  /**
   * Process a single 128-sample quantum buffer
   */
  public process(
    micChannel: Float32Array,
    bgChannel: Float32Array,
    outputChannel: Float32Array,
  ): { currentGain: number; isDucking: boolean } {
    const len = micChannel.length;

    // 1. Calculate RMS speech power of primary voice input
    let sumSquares = 0;
    for (let i = 0; i < len; i++) {
      const sample = micChannel[i] ?? 0;
      sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / Math.max(1, len));
    const voiceDb = 20 * Math.log10(rms + 1e-6);

    // 2. Attack and Release filter coefficients
    const attackSamples = Math.max(1, (this.attackMs / 1000) * this.sampleRate);
    const releaseSamples = Math.max(1, (this.releaseMs / 1000) * this.sampleRate);
    const alphaAtt = Math.exp(-len / attackSamples);
    const alphaRel = Math.exp(-len / releaseSamples);

    // 3. Determine target ducking gain
    const isDucking = voiceDb > this.thresholdDb;
    const targetGain = isDucking ? Math.pow(10, this.duckingDepthDb / 20) : 1.0;

    // Smooth gain transition
    if (targetGain < this.currentGain) {
      this.currentGain = alphaAtt * this.currentGain + (1 - alphaAtt) * targetGain;
    } else {
      this.currentGain = alphaRel * this.currentGain + (1 - alphaRel) * targetGain;
    }

    // 4. Mix channels with smoothed gain and apply dynamic soft-knee limiter
    for (let i = 0; i < len; i++) {
      const mic = micChannel[i] ?? 0;
      const bg = (bgChannel[i] ?? 0) * this.currentGain;
      const rawMix = mic + bg;

      // Soft-knee limiter preventing digital clipping (>0 dBFS)
      outputChannel[i] = this.applyLimiter(rawMix);
    }

    return {
      currentGain: this.currentGain,
      isDucking,
    };
  }

  /**
   * Soft-knee polynomial & hyperbolic tangent limiter
   */
  public applyLimiter(sample: number): number {
    const thresh = this.limiterThreshold;
    const abs = Math.abs(sample);

    if (abs <= thresh) {
      return sample;
    }

    // Above threshold: smooth compressive saturation
    const sign = sample >= 0 ? 1 : -1;
    const over = abs - thresh;
    const compressed = thresh + (1 - thresh) * Math.tanh(over / (1 - thresh));
    return sign * Math.min(0.9999, compressed);
  }

  public getGain(): number {
    return this.currentGain;
  }

  public reset(): void {
    this.currentGain = 1.0;
    this.envelope = 0.0;
  }
}

/**
 * Raw AudioWorkletProcessor code string to be registered into AudioContext
 */
export const SIDECHAIN_DUCKER_PROCESSOR_CODE = `
class SidechainDuckerProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.thresholdDb = options.processorOptions?.thresholdDb ?? -36.0;
    this.attackMs = options.processorOptions?.attackMs ?? 10.0;
    this.releaseMs = options.processorOptions?.releaseMs ?? 200.0;
    this.duckingDepthDb = options.processorOptions?.duckingDepthDb ?? -18.0;
    this.limiterThreshold = options.processorOptions?.limiterThreshold ?? 0.95;
    this.currentGain = 1.0;
  }

  process(inputs, outputs) {
    const mic = inputs[0]?.[0];
    const bg = inputs[1]?.[0];
    const out = outputs[0]?.[0];

    if (!out) return true;
    const len = out.length;

    let sumSquares = 0;
    if (mic) {
      for (let i = 0; i < len; i++) {
        sumSquares += mic[i] * mic[i];
      }
    }
    const rms = Math.sqrt(sumSquares / Math.max(1, len));
    const voiceDb = 20 * Math.log10(rms + 1e-6);

    const isDucking = voiceDb > this.thresholdDb;
    const targetGain = isDucking ? Math.pow(10, this.duckingDepthDb / 20) : 1.0;

    const alphaAtt = Math.exp(-len / (48 * this.attackMs));
    const alphaRel = Math.exp(-len / (48 * this.releaseMs));

    if (targetGain < this.currentGain) {
      this.currentGain = alphaAtt * this.currentGain + (1 - alphaAtt) * targetGain;
    } else {
      this.currentGain = alphaRel * this.currentGain + (1 - alphaRel) * targetGain;
    }

    for (let i = 0; i < len; i++) {
      const micVal = mic ? mic[i] : 0;
      const bgVal = bg ? bg[i] * this.currentGain : 0;
      const mix = micVal + bgVal;

      if (Math.abs(mix) <= this.limiterThreshold) {
        out[i] = mix;
      } else {
        const sign = mix >= 0 ? 1 : -1;
        const over = Math.abs(mix) - this.limiterThreshold;
        out[i] = sign * (this.limiterThreshold + (1 - this.limiterThreshold) * Math.tanh(over / (1 - this.limiterThreshold)));
      }
    }

    return true;
  }
}

registerProcessor('sidechain-ducker-processor', SidechainDuckerProcessor);
`;

/**
 * Helper to register and create a SidechainDucker AudioWorkletNode
 */
export async function createSidechainDuckerNode(
  audioCtx: AudioContext,
  config?: SidechainDuckerConfig,
): Promise<AudioWorkletNode | null> {
  if (typeof audioCtx.audioWorklet === 'undefined') {
    return null;
  }

  try {
    const blob = new Blob([SIDECHAIN_DUCKER_PROCESSOR_CODE], { type: 'application/javascript' });
    const moduleUrl = URL.createObjectURL(blob);
    await audioCtx.audioWorklet.addModule(moduleUrl);
    URL.revokeObjectURL(moduleUrl);

    return new AudioWorkletNode(audioCtx, 'sidechain-ducker-processor', {
      numberOfInputs: 2,
      numberOfOutputs: 1,
      processorOptions: config,
    });
  } catch (err) {
    console.warn(
      '[SidechainDucker] AudioWorklet initialization failed, fallback to gain/compressor:',
      err,
    );
    return null;
  }
}
