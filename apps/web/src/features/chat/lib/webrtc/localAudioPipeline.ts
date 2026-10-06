import type { VoiceFXMode } from './voiceFX';

export interface LocalAudioPipelineOptions {
  inputVolume?: number; // 0-100
  isDenoiseEnabled?: boolean;
  isGateOpen?: boolean;
  sampleRate?: number;
  voiceFX?: VoiceFXMode;
  isPTT?: boolean;
  isPTTTalking?: boolean;
  vadThresholdDb?: number;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

export class LocalAudioPipeline {
  // Strong instance references to prevent Chrome GC bug cutting audio after 20 seconds
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private fallbackHighpass: BiquadFilterNode | null = null;
  private fallbackCompressor: DynamicsCompressorNode | null = null;
  private gainNode: GainNode | null = null;
  private gateGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;

  // Voice FX Node Chain
  private currentVoiceFX: VoiceFXMode = 'none';
  private fxInputNode: GainNode | null = null;
  private fxOutputNode: GainNode | null = null;
  private activeFxNodes: Array<{ disconnect: () => void; stop?: () => void }> = [];

  // Soundboard Direct Inject (Full fidelity stereo straight to WebRTC destinationNode)
  private soundboardSourceNode: MediaStreamAudioSourceNode | null = null;
  private soundboardGainNode: GainNode | null = null;
  private attachedSoundboardStream: MediaStream | null = null;

  // VAD & PTT Gate Engine
  private isDestroyed = false;
  private isGateOpenState = true;
  private isPTTMode = false;
  private vadEnabled = false;
  private vadThresholdDb = -45;
  private lastSpokeTime = 0;
  private vadTimer: ReturnType<typeof setInterval> | null = null;
  private onSpeakingChangeCallback?: (isSpeaking: boolean) => void;

  constructor(
    private sourceStream: MediaStream,
    private readonly options: LocalAudioPipelineOptions = {},
  ) {
    this.currentVoiceFX = options.voiceFX || 'none';
    this.isPTTMode = options.isPTT || false;
    this.vadThresholdDb = options.vadThresholdDb ?? -45;
    this.onSpeakingChangeCallback = options.onSpeakingChange;
    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      this.audioContext = new AudioCtx({
        sampleRate: this.options.sampleRate || 48000,
        latencyHint: 'interactive',
      });

      // Auto-resume if suspended (e.g. autoplay policy)
      if (this.audioContext.state === 'suspended') {
        void this.audioContext.resume().catch(() => {});
        const resumeCtx = () => {
          if (this.audioContext && this.audioContext.state === 'suspended') {
            void this.audioContext.resume().catch(() => {});
          }
          window.removeEventListener('click', resumeCtx);
          window.removeEventListener('keydown', resumeCtx);
          window.removeEventListener('touchstart', resumeCtx);
        };
        window.addEventListener('click', resumeCtx, { once: true });
        window.addEventListener('keydown', resumeCtx, { once: true });
        window.addEventListener('touchstart', resumeCtx, { once: true });
      }

      this.sourceNode = this.audioContext.createMediaStreamSource(this.sourceStream);

      // 1. DSP High-pass (80Hz) to cut sub-rumble and fan hum
      this.fallbackHighpass = this.audioContext.createBiquadFilter();
      this.fallbackHighpass.type = 'highpass';
      const denoiseFreq = this.options.isDenoiseEnabled !== false ? 80 : 10;
      this.fallbackHighpass.frequency.setValueAtTime(denoiseFreq, this.audioContext.currentTime);

      // 2. Dynamics Compressor to tame sudden loud transient peaks (keyboard clicks)
      this.fallbackCompressor = this.audioContext.createDynamicsCompressor();
      this.fallbackCompressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
      this.fallbackCompressor.knee.setValueAtTime(10, this.audioContext.currentTime);
      this.fallbackCompressor.ratio.setValueAtTime(8, this.audioContext.currentTime);
      this.fallbackCompressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
      this.fallbackCompressor.release.setValueAtTime(0.15, this.audioContext.currentTime);

      // 3. Voice FX Insert Points
      this.fxInputNode = this.audioContext.createGain();
      this.fxOutputNode = this.audioContext.createGain();

      // 4. Software Input Volume GainNode (0% to 200%)
      this.gainNode = this.audioContext.createGain();
      const initialVol =
        typeof this.options.inputVolume === 'number' ? this.options.inputVolume : 100;
      this.gainNode.gain.setValueAtTime(
        Math.max(0, initialVol) / 100,
        this.audioContext.currentTime,
      );

      // 5. VAD / PTT Noise Gate Node with anti-flutter
      this.gateGainNode = this.audioContext.createGain();
      const gateInitial = this.options.isPTT
        ? this.options.isPTTTalking
          ? 1.0
          : 0.0
        : this.options.isGateOpen !== false
          ? 1.0
          : 0.0;
      this.gateGainNode.gain.setValueAtTime(gateInitial, this.audioContext.currentTime);
      this.isGateOpenState = gateInitial === 1.0;

      // 6. High-precision AnalyserNode for live LED meter & VAD detection
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.25;

      // 7. MediaStreamDestination for WebRTC output
      this.destinationNode = this.audioContext.createMediaStreamDestination();

      this.setupChain();
      this.applyVoiceFX(this.currentVoiceFX);
      this.startVADLoop();
    } catch (err) {
      console.warn('[LocalAudioPipeline] initialization fallback:', err);
    }
  }

  private setupChain(): void {
    if (
      !this.sourceNode ||
      !this.fallbackHighpass ||
      !this.fallbackCompressor ||
      !this.fxInputNode ||
      !this.fxOutputNode ||
      !this.gainNode ||
      !this.gateGainNode ||
      !this.analyserNode ||
      !this.destinationNode
    ) {
      return;
    }

    try {
      // Source ➔ Highpass ➔ Compressor ➔ FX Input ... FX Output ➔ Volume Gain ➔ Gate ➔ Destination
      //                                                                  └─➔ Analyser (Pre-Gate VAD & Metering)
      this.sourceNode.connect(this.fallbackHighpass);
      this.fallbackHighpass.connect(this.fallbackCompressor);
      this.fallbackCompressor.connect(this.fxInputNode);

      this.fxOutputNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);
      this.gainNode.connect(this.gateGainNode);
      this.gateGainNode.connect(this.destinationNode);
    } catch (e) {
      console.warn('[LocalAudioPipeline] failed to connect chain:', e);
    }
  }

  private applyVoiceFX(mode: VoiceFXMode): void {
    if (!this.audioContext || !this.fxInputNode || !this.fxOutputNode) return;

    // Disconnect previous FX nodes
    this.activeFxNodes.forEach((n) => {
      try {
        n.stop?.();
        n.disconnect();
      } catch {
        // Safe
      }
    });
    this.activeFxNodes = [];
    this.fxInputNode.disconnect();

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    switch (mode) {
      case 'robot': {
        // 55 Hz ring modulation oscillator + bandpass filter
        const osc = ctx.createOscillator();
        const modGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(55, now);
        modGain.gain.setValueAtTime(0.6, now);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.Q.setValueAtTime(2.5, now);

        osc.connect(modGain.gain);
        this.fxInputNode.connect(modGain);
        modGain.connect(filter);
        filter.connect(this.fxOutputNode);

        try {
          osc.start(now);
        } catch {
          // Safe
        }

        this.activeFxNodes.push(osc, modGain, filter);
        break;
      }

      case 'radio': {
        // Walkie-talkie bandpass (400-3000 Hz) + telephone crunch
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.setValueAtTime(450, now);

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(2800, now);

        const dist = ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
          const x = (i * 2) / 256 - 1;
          curve[i] = ((Math.PI + 3) * x * 0.45) / (Math.PI + 3 * Math.abs(x));
        }
        dist.curve = curve;

        this.fxInputNode.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(dist);
        dist.connect(this.fxOutputNode);

        this.activeFxNodes.push(highpass, lowpass, dist);
        break;
      }

      case 'deep': {
        // Bass enhancer + lower register resonance
        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.setValueAtTime(220, now);
        bassFilter.gain.setValueAtTime(9.0, now);

        const highcut = ctx.createBiquadFilter();
        highcut.type = 'lowpass';
        highcut.frequency.setValueAtTime(4200, now);

        this.fxInputNode.connect(bassFilter);
        bassFilter.connect(highcut);
        highcut.connect(this.fxOutputNode);

        this.activeFxNodes.push(bassFilter, highcut);
        break;
      }

      case 'cosmic': {
        // Space echo delay + feedback
        const delay = ctx.createDelay(1.0);
        delay.delayTime.setValueAtTime(0.32, now);

        const feedback = ctx.createGain();
        feedback.gain.setValueAtTime(0.4, now);

        const wetGain = ctx.createGain();
        wetGain.gain.setValueAtTime(0.55, now);

        // Dry bypass
        this.fxInputNode.connect(this.fxOutputNode);

        // Wet delay loop
        this.fxInputNode.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(wetGain);
        wetGain.connect(this.fxOutputNode);

        this.activeFxNodes.push(delay, feedback, wetGain);
        break;
      }

      case 'none':
      default: {
        // Direct clean pass-through
        this.fxInputNode.connect(this.fxOutputNode);
        break;
      }
    }
  }

  /**
   * Resumes the underlying AudioContext if suspended by browser autoplay policy
   */
  public resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      void this.audioContext.resume().catch(() => {});
    }
  }

  /**
   * Sets the active voice modifier (robot, radio, deep, cosmic, none)
   */
  public setVoiceFX(mode: VoiceFXMode): void {
    if (this.isDestroyed) return;
    this.resume();
    if (this.currentVoiceFX === mode) return;
    this.currentVoiceFX = mode;
    this.applyVoiceFX(mode);
  }

  /**
   * Updates software input gain multiplier (0-100% or up to 200%)
   * Setting 0% sets gain to exact 0.0 (total silence)
   */
  public setInputVolume(volumePercent: number): void {
    if (this.isDestroyed || !this.gainNode || !this.audioContext) return;
    this.resume();
    const clamped = Math.max(0, Math.min(200, volumePercent));
    const targetGain = clamped / 100;
    const now = this.audioContext.currentTime;

    try {
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.linearRampToValueAtTime(targetGain, now + 0.02);
    } catch {
      this.gainNode.gain.value = targetGain;
    }

    if (clamped === 0) {
      if (this.gateGainNode) {
        try {
          this.gateGainNode.gain.cancelScheduledValues(now);
          this.gateGainNode.gain.setValueAtTime(0, now);
        } catch {
          this.gateGainNode.gain.value = 0;
        }
      }
      this.isGateOpenState = false;
      this.onSpeakingChangeCallback?.(false);
    }
  }

  /**
   * Sets Voice Activity Detection / PTT Gate state with 10ms attack and configurable release hangover
   */
  public setGateOpen(open: boolean, releaseTailMs: number = 200): void {
    if (this.isDestroyed || !this.gateGainNode || !this.audioContext) return;
    if (this.isGateOpenState === open) return;

    this.isGateOpenState = open;
    const now = this.audioContext.currentTime;

    try {
      this.gateGainNode.gain.cancelScheduledValues(now);
      if (open) {
        // Fast attack: 10ms
        this.gateGainNode.gain.linearRampToValueAtTime(1.0, now + 0.01);
      } else {
        // Smooth release hangover tail
        const releaseSeconds = Math.max(0.01, releaseTailMs / 1000);
        this.gateGainNode.gain.linearRampToValueAtTime(0.0, now + releaseSeconds);
      }
    } catch {
      this.gateGainNode.gain.value = open ? 1.0 : 0.0;
    }
  }

  /**
   * Controls Push-to-Talk (PTT) state directly
   */
  public setPTTMode(isPTT: boolean, isTalking: boolean, releaseTailMs: number = 200): void {
    this.isPTTMode = isPTT;
    if (isPTT) {
      if (isTalking) {
        this.setGateOpen(true, 10);
        this.onSpeakingChangeCallback?.(true);
      } else {
        this.setGateOpen(false, releaseTailMs);
        this.onSpeakingChangeCallback?.(false);
      }
    } else {
      // Returned to Voice Activity
      if (!this.vadEnabled) {
        this.setGateOpen(true, 10);
      }
    }
  }

  /**
   * Configures Voice Activity Detection (VAD) / Noise Gate Threshold
   */
  public setVAD(
    enabled: boolean,
    thresholdDb: number,
    onSpeakingChange?: (isSpeaking: boolean) => void,
  ): void {
    this.vadEnabled = enabled;
    this.vadThresholdDb = thresholdDb;
    if (onSpeakingChange) {
      this.onSpeakingChangeCallback = onSpeakingChange;
    }
  }

  /**
   * Background 25ms VAD RMS monitor loop
   */
  private startVADLoop(): void {
    if (this.vadTimer) clearInterval(this.vadTimer);

    const buffer = new Float32Array(128);

    this.vadTimer = setInterval(() => {
      if (this.isDestroyed || !this.analyserNode) return;

      // In PTT mode, VAD does not override manual key hold
      if (this.isPTTMode) return;

      const currentGain = this.gainNode?.gain?.value ?? 1;
      if (currentGain === 0) {
        if (this.isGateOpenState) {
          this.setGateOpen(false, 0);
          this.onSpeakingChangeCallback?.(false);
        }
        return;
      }

      if (!this.vadEnabled) {
        if (!this.isGateOpenState) {
          this.setGateOpen(true, 10);
          this.onSpeakingChangeCallback?.(true);
        }
        return;
      }

      this.analyserNode.getFloatTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
      }
      const rms = Math.sqrt(sum / buffer.length);
      const db = 20 * Math.log10(Math.max(1e-5, rms));

      if (db >= this.vadThresholdDb) {
        this.lastSpokeTime = Date.now();
        if (!this.isGateOpenState) {
          this.setGateOpen(true, 10);
          this.onSpeakingChangeCallback?.(true);
        }
      } else {
        // Hangover: 250ms to keep voice smooth across pauses
        if (this.isGateOpenState && Date.now() - this.lastSpokeTime > 250) {
          this.setGateOpen(false, 250);
          this.onSpeakingChangeCallback?.(false);
        }
      }
    }, 25);
  }

  /**
   * Toggles noise suppression filter (80Hz highpass vs bypass)
   */
  public setDenoiseEnabled(enabled: boolean): void {
    if (this.isDestroyed || !this.fallbackHighpass || !this.audioContext) return;
    try {
      this.fallbackHighpass.frequency.setValueAtTime(
        enabled ? 80 : 10,
        this.audioContext.currentTime,
      );
    } catch {
      // Safe
    }
  }

  /**
   * Seamlessly swaps microphone hardware input stream without tearing down the destination track
   */
  public switchSourceStream(newStream: MediaStream): void {
    if (this.isDestroyed || !this.audioContext || !this.fallbackHighpass) return;
    try {
      this.sourceNode?.disconnect();
      this.sourceStream = newStream;
      this.sourceNode = this.audioContext.createMediaStreamSource(newStream);
      this.sourceNode.connect(this.fallbackHighpass);
    } catch (err) {
      console.warn('[LocalAudioPipeline] switchSourceStream error:', err);
    }
  }

  /**
   * Returns the live AnalyserNode for audio level visualization
   */
  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  /**
   * Returns the processed MediaStreamTrack ready for RTCPeerConnection sender
   */
  public getProcessedTrack(): MediaStreamTrack {
    if (this.destinationNode && this.destinationNode.stream.getAudioTracks().length > 0) {
      return this.destinationNode.stream.getAudioTracks()[0];
    }
    return this.sourceStream.getAudioTracks()[0];
  }

  /**
   * Returns the destination MediaStream
   */
  public getProcessedStream(): MediaStream {
    if (this.destinationNode) {
      return this.destinationNode.stream;
    }
    return this.sourceStream;
  }

  /**
   * Directly mix Soundboard audio into WebRTC outgoing stream and local level meter
   */
  public attachSoundboardStream(stream: MediaStream): void {
    if (!this.audioContext || !this.destinationNode || !stream) return;
    this.attachedSoundboardStream = stream;
    try {
      this.soundboardSourceNode?.disconnect();
      this.soundboardGainNode?.disconnect();

      this.soundboardSourceNode = this.audioContext.createMediaStreamSource(stream);
      this.soundboardGainNode = this.audioContext.createGain();
      this.soundboardGainNode.gain.value = 1.0;

      this.soundboardSourceNode.connect(this.soundboardGainNode);
      // Connect to destinationNode so peers receive clean digital stereo soundboard audio
      this.soundboardGainNode.connect(this.destinationNode);
      // Connect to analyserNode so local speaking meter reflects soundboard playback
      if (this.analyserNode) {
        this.soundboardGainNode.connect(this.analyserNode);
      }
    } catch (err) {
      console.warn('[LocalAudioPipeline] Failed to attach soundboard stream:', err);
    }
  }

  /**
   * Clean destruction: stops all nodes, clears timers, closes AudioContext
   */
  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    if (this.vadTimer) {
      clearInterval(this.vadTimer);
      this.vadTimer = null;
    }

    try {
      this.soundboardSourceNode?.disconnect();
      this.soundboardGainNode?.disconnect();
      this.soundboardSourceNode = null;
      this.soundboardGainNode = null;
      this.attachedSoundboardStream = null;

      this.activeFxNodes.forEach((n) => {
        try {
          n.stop?.();
          n.disconnect();
        } catch {
          // Safe
        }
      });
      this.activeFxNodes = [];

      this.sourceNode?.disconnect();
      this.fallbackHighpass?.disconnect();
      this.fallbackCompressor?.disconnect();
      this.fxInputNode?.disconnect();
      this.fxOutputNode?.disconnect();
      this.gainNode?.disconnect();
      this.gateGainNode?.disconnect();
      this.analyserNode?.disconnect();
      this.destinationNode?.disconnect();
    } catch {
      // Safe
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.close().catch(() => {});
    }

    this.audioContext = null;
    this.sourceNode = null;
    this.fallbackHighpass = null;
    this.fallbackCompressor = null;
    this.fxInputNode = null;
    this.fxOutputNode = null;
    this.gainNode = null;
    this.gateGainNode = null;
    this.analyserNode = null;
    this.destinationNode = null;
    this.sourceStream = null as any;
  }
}
