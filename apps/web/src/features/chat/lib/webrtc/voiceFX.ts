/**
 * Voice FX / Modifiers Audio Engine (Web Audio API)
 * Filters: Robot, Walkie-Talkie Radio, Deep Announcer, and Cosmic Echo.
 */

export type VoiceFXMode = 'none' | 'robot' | 'radio' | 'deep' | 'cosmic';

export class VoiceFXProcessor {
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private currentMode: VoiceFXMode = 'none';

  // Output destination
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private processedTrack: MediaStreamTrack | null = null;

  // Active filter nodes for cleanup
  private activeNodes: Array<{ disconnect: () => void; stop?: () => void }> = [];

  constructor(private readonly inputTrack: MediaStreamTrack) {
    this.init();
  }

  private init(): void {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtx) {
        this.processedTrack = this.inputTrack;
        return;
      }

      this.audioCtx = new AudioCtx();
      this.sourceNode = this.audioCtx.createMediaStreamSource(new MediaStream([this.inputTrack]));
      this.destinationNode = this.audioCtx.createMediaStreamDestination();
      this.processedTrack = this.destinationNode.stream.getAudioTracks()[0] || this.inputTrack;

      this.applyMode(this.currentMode);

      if (this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume();
      }
    } catch {
      this.processedTrack = this.inputTrack;
    }
  }

  public getProcessedTrack(): MediaStreamTrack {
    return this.processedTrack || this.inputTrack;
  }

  public setMode(mode: VoiceFXMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.applyMode(mode);
  }

  public getMode(): VoiceFXMode {
    return this.currentMode;
  }

  private applyMode(mode: VoiceFXMode): void {
    if (!this.audioCtx || !this.sourceNode || !this.destinationNode) return;

    // Disconnect and stop previous filter nodes
    this.activeNodes.forEach((node) => {
      try {
        node.stop?.();
        node.disconnect();
      } catch {
        // Cleanup ignore
      }
    });
    this.activeNodes = [];
    this.sourceNode.disconnect();

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    switch (mode) {
      case 'robot': {
        // Ring modulation: Oscillator * Voice + Bandpass filter
        const osc = ctx.createOscillator();
        const modGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(55, now); // 55 Hz robotic drone

        modGain.gain.setValueAtTime(0.5, now);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.Q.setValueAtTime(2.5, now);

        osc.connect(modGain.gain);
        this.sourceNode.connect(modGain);
        modGain.connect(filter);
        filter.connect(this.destinationNode);

        osc.start(now);
        this.activeNodes.push(osc, modGain, filter);
        break;
      }

      case 'radio': {
        // Walkie-talkie: Sharp bandpass 400Hz-3200Hz + Waveshaper distortion
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.setValueAtTime(450, now);

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(3000, now);

        const shaper = ctx.createWaveShaper();
        shaper.curve = this.createDistortionCurve(15);
        shaper.oversample = '2x';

        this.sourceNode.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(shaper);
        shaper.connect(this.destinationNode);

        this.activeNodes.push(highpass, lowpass, shaper);
        break;
      }

      case 'deep': {
        // Deep Announcer: Low shelf bass boost + warm treble cut
        const bass = ctx.createBiquadFilter();
        bass.type = 'lowshelf';
        bass.frequency.setValueAtTime(160, now);
        bass.gain.setValueAtTime(9, now); // +9dB deep low-end

        const treble = ctx.createBiquadFilter();
        treble.type = 'lowpass';
        treble.frequency.setValueAtTime(2600, now);

        this.sourceNode.connect(bass);
        bass.connect(treble);
        treble.connect(this.destinationNode);

        this.activeNodes.push(bass, treble);
        break;
      }

      case 'cosmic': {
        // Cosmic Reverb / Echo: DelayNode + Feedback Gain + Filter
        const delay = ctx.createDelay();
        delay.delayTime.setValueAtTime(0.18, now); // 180ms delay

        const feedback = ctx.createGain();
        feedback.gain.setValueAtTime(0.38, now);

        const wetGain = ctx.createGain();
        wetGain.gain.setValueAtTime(0.55, now);

        // Dry path
        this.sourceNode.connect(this.destinationNode);

        // Wet echo loop
        this.sourceNode.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(wetGain);
        wetGain.connect(this.destinationNode);

        this.activeNodes.push(delay, feedback, wetGain);
        break;
      }

      case 'none':
      default: {
        // Clean direct pass-through
        this.sourceNode.connect(this.destinationNode);
        break;
      }
    }
  }

  private createDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const k = amount;
    const nSamples = 22050;
    const buffer = new ArrayBuffer(nSamples * Float32Array.BYTES_PER_ELEMENT);
    const curve = new Float32Array(buffer);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  public destroy(): void {
    this.activeNodes.forEach((node) => {
      try {
        node.stop?.();
        node.disconnect();
      } catch {
        // Cleanup ignore
      }
    });
    this.activeNodes = [];

    try {
      this.sourceNode?.disconnect();
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        void this.audioCtx.close();
      }
    } catch {
      // Cleanup catch
    }

    this.sourceNode = null;
    this.destinationNode = null;
    this.processedTrack = null;
    this.audioCtx = null;
  }
}
