/**
 * WebRTC Voice Activity Detection (VAD) & Discord-style Noise Gate
 *
 * Real-time audio energy analysis with hangover window smoothing and
 * microphone transmission gating.
 */

export interface VADEngineOptions {
  thresholdDb?: number; // default -45 dB
  hangoverMs?: number; // default 250 ms to avoid clipping word endings
  enabled?: boolean;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onVolumeChange?: (db: number, normalizedPercent: number) => void;
}

export class VADEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private pcmData: Float32Array<ArrayBuffer> | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  private thresholdDb = -45;
  private hangoverMs = 250;
  private isEnabled = true;
  private isSpeaking = false;
  private lastSpokeTime = 0;

  private onSpeakingChange?: (isSpeaking: boolean) => void;
  private onVolumeChange?: (db: number, normalizedPercent: number) => void;

  constructor(
    private readonly stream: MediaStream,
    options: VADEngineOptions = {},
  ) {
    this.thresholdDb = options.thresholdDb ?? -45;
    this.hangoverMs = options.hangoverMs ?? 250;
    this.isEnabled = options.enabled ?? true;
    this.onSpeakingChange = options.onSpeakingChange;
    this.onVolumeChange = options.onVolumeChange;

    this.init();
  }

  private init(): void {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.2;

      this.source = this.audioCtx.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      this.pcmData = new Float32Array(this.analyser.fftSize);

      if (this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume();
      }

      this.intervalId = setInterval(() => this.analyze(), 50);
    } catch {
      // AudioContext fallback
    }
  }

  private analyze(): void {
    if (!this.analyser || !this.pcmData) return;

    this.analyser.getFloatTimeDomainData(this.pcmData);

    let sum = 0;
    for (let i = 0; i < this.pcmData.length; i++) {
      sum += this.pcmData[i] * this.pcmData[i];
    }
    const rms = Math.sqrt(sum / this.pcmData.length);
    const db = rms > 0.00001 ? 20 * Math.log10(rms) : -100;

    // Normalize -80 dB ... 0 dB to 0% ... 100%
    const clampedDb = Math.max(-80, Math.min(0, db));
    const normalizedPercent = Math.round(((clampedDb + 80) / 80) * 100);

    this.onVolumeChange?.(Math.round(clampedDb), normalizedPercent);

    if (!this.isEnabled) {
      if (this.isSpeaking) {
        this.isSpeaking = false;
        this.onSpeakingChange?.(false);
      }
      return;
    }

    const now = Date.now();
    const isAboveThreshold = clampedDb >= this.thresholdDb;

    if (isAboveThreshold) {
      this.lastSpokeTime = now;
      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.onSpeakingChange?.(true);
      }
    } else {
      // Check hangover duration
      if (this.isSpeaking && now - this.lastSpokeTime > this.hangoverMs) {
        this.isSpeaking = false;
        this.onSpeakingChange?.(false);
      }
    }
  }

  public setThreshold(thresholdDb: number): void {
    this.thresholdDb = thresholdDb;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    try {
      this.source?.disconnect();
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        void this.audioCtx.close();
      }
    } catch {
      // Cleanup catch
    }
    this.source = null;
    this.analyser = null;
    this.pcmData = null;
    this.audioCtx = null;
  }
}
