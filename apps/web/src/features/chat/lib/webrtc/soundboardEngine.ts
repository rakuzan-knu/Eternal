/**
 * Interactive Soundboard Engine with Automatic Sidechain Ducking
 *
 * Capabilities:
 * - High-impact procedurally synthesized memes and audio effects:
 *   'airhorn' | 'rimshot' | 'applause' | 'tada' | 'badumtss' | 'boing'
 * - Zero external mp3 dependencies: 100% offline & instantaneous zero-latency playback.
 * - Automatic Sidechain Ducking: Monitors local microphone volume via AnalyserNode.
 *   When speaker speech is detected (RMS > threshold), smoothly attenuates the soundboard
 *   gain by 50% (-6dB) with 40ms attack and 150ms release.
 * - RTCDataChannel broadcast: allows sending soundboard triggers to all call peers.
 */

export type SoundEffectId = 'airhorn' | 'rimshot' | 'applause' | 'tada' | 'badumtss' | 'boing';

export interface SoundEffectMetadata {
  id: SoundEffectId;
  name: string;
  emoji: string;
  category: 'hype' | 'reaction' | 'humor';
  durationMs: number;
}

export const SOUNDBOARD_PRESETS: SoundEffectMetadata[] = [
  { id: 'airhorn', name: 'Airhorn', emoji: '📢', category: 'hype', durationMs: 1200 },
  { id: 'tada', name: 'Ta-Da Fanfare', emoji: '🎉', category: 'hype', durationMs: 1400 },
  { id: 'applause', name: 'Applause', emoji: '👏', category: 'reaction', durationMs: 1800 },
  { id: 'rimshot', name: 'Rimshot', emoji: '🥁', category: 'humor', durationMs: 800 },
  { id: 'badumtss', name: 'Ba-Dum-Tss', emoji: '🤣', category: 'humor', durationMs: 1200 },
  { id: 'boing', name: 'Cartoon Boing', emoji: '🌀', category: 'humor', durationMs: 700 },
];

export class SoundboardEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sidechainGain: GainNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;

  // Sidechain microphone monitoring
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private sidechainMonitorTimer: ReturnType<typeof setInterval> | null = null;
  private isDucking = false;
  private speechHoldCount = 0;
  private duckingListeners = new Set<(isDucking: boolean) => void>();

  // Configuration
  private duckingThreshold = 0.035; // RMS threshold for speech detection
  private duckingFactor = 0.5; // Attenuate to 50% when speech detected
  private isMuted = false;

  constructor(customAudioContext?: AudioContext) {
    if (typeof window !== 'undefined') {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.audioCtx = customAudioContext || new AudioCtx();
          this.initAudioGraph();
        }
      } catch (err) {
        console.warn('[SoundboardEngine] AudioContext initialization failed:', err);
      }
    }
  }

  private initAudioGraph(): void {
    if (!this.audioCtx) return;

    // Master volume gain
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 1.0;

    // Sidechain ducking gain node (modulated dynamically between 1.0 and 0.5)
    this.sidechainGain = this.audioCtx.createGain();
    this.sidechainGain.gain.value = 1.0;

    // Stream destination to allow mixing into WebRTC outbound audio
    this.destinationNode = this.audioCtx.createMediaStreamDestination();

    // Chain: Generators -> SidechainGain -> MasterGain -> Destination + AudioCtx.destination
    this.sidechainGain.connect(this.masterGain);
    this.masterGain.connect(this.audioCtx.destination);
    this.masterGain.connect(this.destinationNode);
  }

  /**
   * Attach local microphone stream to monitor for speech and drive sidechain ducking.
   */
  public attachLocalMicStream(stream: MediaStream): void {
    if (!this.audioCtx || stream.getAudioTracks().length === 0) return;

    this.detachLocalMicStream();

    try {
      this.micSource = this.audioCtx.createMediaStreamSource(stream);
      this.micAnalyser = this.audioCtx.createAnalyser();
      this.micAnalyser.fftSize = 256;
      this.micAnalyser.smoothingTimeConstant = 0.3;

      this.micSource.connect(this.micAnalyser);

      // Start sidechain monitoring loop at 30ms intervals
      const timeData = new Float32Array(this.micAnalyser.fftSize);
      this.sidechainMonitorTimer = setInterval(() => {
        if (!this.micAnalyser || !this.audioCtx || !this.sidechainGain) return;

        this.micAnalyser.getFloatTimeDomainData(timeData);
        let sumSquares = 0;
        for (let i = 0; i < timeData.length; i++) {
          sumSquares += timeData[i] * timeData[i];
        }
        const rms = Math.sqrt(sumSquares / timeData.length);

        if (rms > this.duckingThreshold) {
          this.speechHoldCount = 8; // Hold ducking for ~240ms after speech pause
          if (!this.isDucking) {
            this.isDucking = true;
            this.sidechainGain.gain.setTargetAtTime(
              this.duckingFactor,
              this.audioCtx.currentTime,
              0.04, // 40ms attack
            );
            this.notifyDucking(true);
          }
        } else if (this.speechHoldCount > 0) {
          this.speechHoldCount--;
        } else if (this.isDucking) {
          this.isDucking = false;
          this.sidechainGain.gain.setTargetAtTime(
            1.0,
            this.audioCtx.currentTime,
            0.15, // 150ms release
          );
          this.notifyDucking(false);
        }
      }, 30);
    } catch (err) {
      console.warn('[SoundboardEngine] Failed to attach mic for sidechain ducking:', err);
    }
  }

  public detachLocalMicStream(): void {
    if (this.sidechainMonitorTimer) {
      clearInterval(this.sidechainMonitorTimer);
      this.sidechainMonitorTimer = null;
    }
    this.micSource?.disconnect();
    this.micAnalyser?.disconnect();
    this.micSource = null;
    this.micAnalyser = null;
    this.isDucking = false;
    this.speechHoldCount = 0;
  }

  /**
   * Play procedural sound effect.
   */
  public play(id: SoundEffectId): void {
    if (this.isMuted || !this.audioCtx || !this.sidechainGain) return;

    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }

    const now = this.audioCtx.currentTime;

    switch (id) {
      case 'airhorn':
        this.synthAirhorn(now);
        break;
      case 'rimshot':
        this.synthRimshot(now);
        break;
      case 'applause':
        this.synthApplause(now);
        break;
      case 'tada':
        this.synthTada(now);
        break;
      case 'badumtss':
        this.synthBadumtss(now);
        break;
      case 'boing':
        this.synthBoing(now);
        break;
    }
  }

  // --- Procedural Synthesizers ---

  /** Airhorn: High energy multi-tonal reggae horn blast */
  private synthAirhorn(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const pitches = [466.16, 554.37, 622.25]; // Bb4, Db5, Eb5
    const blastDurations = [0.22, 0.22, 0.5];
    const blastDelays = [0.0, 0.28, 0.56];

    for (let b = 0; b < 3; b++) {
      const t = startTime + blastDelays[b];
      const dur = blastDurations[b];

      pitches.forEach((freq) => {
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.98, t + dur);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        osc.connect(gain);
        gain.connect(this.sidechainGain!);

        osc.start(t);
        osc.stop(t + dur);
      });
    }
  }

  /** Rimshot: Punchy snare click and stick pop */
  private synthRimshot(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    // Body click
    const osc = this.audioCtx.createOscillator();
    const oscGain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(650, startTime);
    osc.frequency.exponentialRampToValueAtTime(140, startTime + 0.06);

    oscGain.gain.setValueAtTime(0.45, startTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

    osc.connect(oscGain);
    oscGain.connect(this.sidechainGain);
    osc.start(startTime);
    osc.stop(startTime + 0.08);

    // Rim burst noise
    this.createNoiseBurst(startTime, 0.12, 2200, 0.35);
  }

  /** Ta-Da Fanfare: Major triad chime arpeggio (C5 - E5 - G5 - C6) */
  private synthTada(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.25 }, // C5
      { freq: 659.25, time: 0.18, dur: 0.25 }, // E5
      { freq: 783.99, time: 0.36, dur: 0.3 }, // G5
      { freq: 1046.5, time: 0.54, dur: 0.8 }, // C6
    ];

    notes.forEach(({ freq, time, dur }) => {
      const t = startTime + time;
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gain);
      gain.connect(this.sidechainGain!);

      osc.start(t);
      osc.stop(t + dur);
    });
  }

  /** Ba-Dum-Tss: Kick, Snare, and Crash Cymbal */
  private synthBadumtss(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    // Ba (Kick at 0.0s)
    const kickOsc = this.audioCtx.createOscillator();
    const kickGain = this.audioCtx.createGain();
    kickOsc.frequency.setValueAtTime(160, startTime);
    kickOsc.frequency.exponentialRampToValueAtTime(45, startTime + 0.15);
    kickGain.gain.setValueAtTime(0.5, startTime);
    kickGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
    kickOsc.connect(kickGain);
    kickGain.connect(this.sidechainGain);
    kickOsc.start(startTime);
    kickOsc.stop(startTime + 0.18);

    // Dum (Snare at 0.25s)
    const snareTime = startTime + 0.25;
    const snareOsc = this.audioCtx.createOscillator();
    const snareGain = this.audioCtx.createGain();
    snareOsc.frequency.setValueAtTime(220, snareTime);
    snareOsc.frequency.exponentialRampToValueAtTime(80, snareTime + 0.12);
    snareGain.gain.setValueAtTime(0.4, snareTime);
    snareGain.gain.exponentialRampToValueAtTime(0.001, snareTime + 0.15);
    snareOsc.connect(snareGain);
    snareGain.connect(this.sidechainGain);
    snareOsc.start(snareTime);
    snareOsc.stop(snareTime + 0.15);
    this.createNoiseBurst(snareTime, 0.14, 1800, 0.25);

    // Tss (Cymbal at 0.55s)
    const crashTime = startTime + 0.55;
    this.createNoiseBurst(crashTime, 0.7, 5000, 0.38, 'highpass');
  }

  /** Cartoon Boing: Pitch-modulated spring chime */
  private synthBoing(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, startTime);
    osc.frequency.exponentialRampToValueAtTime(620, startTime + 0.35);
    osc.frequency.exponentialRampToValueAtTime(380, startTime + 0.65);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.45, startTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.65);

    osc.connect(gain);
    gain.connect(this.sidechainGain);

    osc.start(startTime);
    osc.stop(startTime + 0.65);
  }

  /** Applause: Layered filtered noise bursts */
  private synthApplause(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    // Simulate crowd clapping with modulated white noise
    const bufferSize = Math.floor(this.audioCtx.sampleRate * 1.6);
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Clatter amplitude modulation
      const mod = Math.sin((i / this.audioCtx.sampleRate) * 45) * 0.3 + 0.7;
      data[i] = (Math.random() * 2 - 1) * mod;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, startTime);
    filter.Q.setValueAtTime(0.8, startTime);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.35, startTime + 0.3);
    gain.gain.setValueAtTime(0.35, startTime + 1.1);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.6);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sidechainGain);

    noise.start(startTime);
    noise.stop(startTime + 1.6);
  }

  private createNoiseBurst(
    startTime: number,
    duration: number,
    cutoffFreq: number,
    volume: number,
    filterType: BiquadFilterType = 'bandpass',
  ): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const bufferSize = Math.floor(this.audioCtx.sampleRate * duration);
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(cutoffFreq, startTime);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sidechainGain);

    noise.start(startTime);
    noise.stop(startTime + duration);
  }

  // --- Network Broadcasting ---

  public broadcastPlay(id: SoundEffectId, dataChannel?: RTCDataChannel | null): void {
    this.play(id);

    if (dataChannel && dataChannel.readyState === 'open') {
      try {
        dataChannel.send(
          JSON.stringify({
            type: 'SOUNDBOARD_PLAY',
            soundId: id,
            timestamp: Date.now(),
          }),
        );
      } catch (err) {
        console.warn('[SoundboardEngine] Failed to broadcast sound via DataChannel:', err);
      }
    }
  }

  public handleDataChannelMessage(payload: string): boolean {
    try {
      const message = JSON.parse(payload) as { type?: string; soundId?: SoundEffectId };
      if (message.type === 'SOUNDBOARD_PLAY' && message.soundId) {
        this.play(message.soundId);
        return true;
      }
    } catch {
      // Non-soundboard data channel message
    }
    return false;
  }

  // --- Controls & Getters ---

  public setMasterVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1.5, vol));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(clamped, this.audioCtx.currentTime, 0.02);
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public getIsDucking(): boolean {
    return this.isDucking;
  }

  public getDestinationStream(): MediaStream | null {
    return this.destinationNode ? this.destinationNode.stream : null;
  }

  public subscribeDucking(cb: (isDucking: boolean) => void): () => void {
    this.duckingListeners.add(cb);
    return () => this.duckingListeners.delete(cb);
  }

  private notifyDucking(isDucking: boolean): void {
    this.duckingListeners.forEach((cb) => {
      try {
        cb(isDucking);
      } catch {
        // Listener error ignore
      }
    });
  }

  public destroy(): void {
    this.detachLocalMicStream();
    this.duckingListeners.clear();
    this.masterGain?.disconnect();
    this.sidechainGain?.disconnect();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      void this.audioCtx.close();
    }
    this.masterGain = null;
    this.sidechainGain = null;
    this.destinationNode = null;
    this.audioCtx = null;
  }
}

export const globalSoundboardEngine = new SoundboardEngine();
