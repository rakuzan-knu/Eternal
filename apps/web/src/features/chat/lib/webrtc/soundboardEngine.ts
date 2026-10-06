/**
 * Interactive Soundboard Engine with Automatic Sidechain Ducking
 *
 * Capabilities:
 * - High-impact procedurally synthesized memes, gaming, anime, reactions, and cinematic audio effects.
 * - Zero external mp3 dependencies for built-in catalog: 100% offline & instantaneous zero-latency playback.
 * - Support for user-uploaded custom audio files (My Sounds & Chat Sounds) via Web Audio API AudioBuffer cache.
 * - Automatic Sidechain Ducking: Monitors local microphone volume via AnalyserNode.
 *   When speaker speech is detected (RMS > threshold), smoothly attenuates the soundboard
 *   gain by 50% (-6dB) with 40ms attack and 150ms release.
 * - Local stereo output directly to speakers (audioCtx.destination), preventing mono degradation and Krisp filtering.
 * - RTCDataChannel / WebSocket broadcast support.
 */

export type SoundCategory = 'memes' | 'anime' | 'gaming' | 'reactions' | 'cinema';

export type SoundEffectId =
  | 'airhorn'
  | 'rimshot'
  | 'applause'
  | 'tada'
  | 'badumtss'
  | 'boing'
  | 'quack'
  | 'bruh'
  | 'sadhorn'
  | 'oof'
  | 'nani'
  | 'slash'
  | 'teleport'
  | 'sparkle'
  | 'bell'
  | 'coin'
  | 'levelup'
  | 'gameover'
  | 'hitmarker'
  | 'bomb'
  | 'shield'
  | 'golfclap'
  | 'drumroll'
  | 'ding'
  | 'buzzer'
  | 'crickets'
  | 'braam'
  | 'impact'
  | 'whoosh'
  | 'thunder'
  | 'heartbeat';

export interface SoundEffectMetadata {
  id: SoundEffectId;
  name: string;
  emoji: string;
  category: 'hype' | 'reaction' | 'humor' | SoundCategory;
  durationMs: number;
}

export interface CatalogSoundItem {
  id: SoundEffectId;
  name: string;
  emoji: string;
  category: SoundCategory;
  durationMs: number;
  description?: string;
}

/** Legacy presets array for test & backwards compatibility */
export const SOUNDBOARD_PRESETS: SoundEffectMetadata[] = [
  { id: 'airhorn', name: 'Airhorn', emoji: '📢', category: 'hype', durationMs: 1200 },
  { id: 'tada', name: 'Ta-Da Fanfare', emoji: '🎉', category: 'hype', durationMs: 1400 },
  { id: 'applause', name: 'Applause', emoji: '👏', category: 'reaction', durationMs: 1800 },
  { id: 'rimshot', name: 'Rimshot', emoji: '🥁', category: 'humor', durationMs: 800 },
  { id: 'badumtss', name: 'Ba-Dum-Tss', emoji: '🤣', category: 'humor', durationMs: 1200 },
  { id: 'boing', name: 'Cartoon Boing', emoji: '🌀', category: 'humor', durationMs: 700 },
];

/** Full categorized global catalog available out of the box */
export const GLOBAL_SOUNDBOARD_CATALOG: CatalogSoundItem[] = [
  // 1. Memes
  {
    id: 'quack',
    name: 'Quack',
    emoji: '🦆',
    category: 'memes',
    durationMs: 500,
    description: 'Classic duck quack',
  },
  {
    id: 'airhorn',
    name: 'Airhorn',
    emoji: '📢',
    category: 'memes',
    durationMs: 1200,
    description: 'Reggae hype horn',
  },
  {
    id: 'bruh',
    name: 'Bruh',
    emoji: '🗿',
    category: 'memes',
    durationMs: 800,
    description: 'Sub bass drop',
  },
  {
    id: 'sadhorn',
    name: 'Sad Trombone',
    emoji: '🎺',
    category: 'memes',
    durationMs: 2200,
    description: 'Wah wah wah waaah',
  },
  {
    id: 'badumtss',
    name: 'Ba-Dum-Tss',
    emoji: '🤣',
    category: 'memes',
    durationMs: 1200,
    description: 'Punchline sting',
  },
  {
    id: 'boing',
    name: 'Boing',
    emoji: '🌀',
    category: 'memes',
    durationMs: 700,
    description: 'Spring cartoon bounce',
  },
  {
    id: 'oof',
    name: 'Oof',
    emoji: '💀',
    category: 'memes',
    durationMs: 400,
    description: 'Death sound',
  },
  {
    id: 'rimshot',
    name: 'Rimshot',
    emoji: '🥁',
    category: 'memes',
    durationMs: 800,
    description: 'Snare pop hit',
  },

  // 2. Anime
  {
    id: 'nani',
    name: 'Nani?!',
    emoji: '✨',
    category: 'anime',
    durationMs: 650,
    description: 'Surprise high chime',
  },
  {
    id: 'slash',
    name: 'Katana Slash',
    emoji: '⚔️',
    category: 'anime',
    durationMs: 450,
    description: 'Crisp blade slice',
  },
  {
    id: 'teleport',
    name: 'Shunpo Teleport',
    emoji: '⚡',
    category: 'anime',
    durationMs: 500,
    description: 'Instant flash step',
  },
  {
    id: 'sparkle',
    name: 'Chime Sparkle',
    emoji: '🌸',
    category: 'anime',
    durationMs: 900,
    description: 'Crystalline glitter',
  },
  {
    id: 'bell',
    name: 'Temple Bell',
    emoji: '🔔',
    category: 'anime',
    durationMs: 1600,
    description: 'Resonant harmonic bell',
  },

  // 3. Gaming
  {
    id: 'coin',
    name: '8-Bit Coin',
    emoji: '🪙',
    category: 'gaming',
    durationMs: 450,
    description: 'Classic retro coin pickup',
  },
  {
    id: 'levelup',
    name: 'Level Up',
    emoji: '🆙',
    category: 'gaming',
    durationMs: 850,
    description: 'Ascending victory arpeggio',
  },
  {
    id: 'gameover',
    name: 'Game Over',
    emoji: '👾',
    category: 'gaming',
    durationMs: 1400,
    description: 'Descending 8-bit defeat',
  },
  {
    id: 'hitmarker',
    name: 'Hitmarker',
    emoji: '🎯',
    category: 'gaming',
    durationMs: 250,
    description: 'Crisp double click tick',
  },
  {
    id: 'bomb',
    name: 'Bomb Armed',
    emoji: '💣',
    category: 'gaming',
    durationMs: 500,
    description: 'Tactical digital double pip',
  },
  {
    id: 'shield',
    name: 'Shield Deflect',
    emoji: '🛡️',
    category: 'gaming',
    durationMs: 600,
    description: 'Armor bounce clang',
  },

  // 4. Reactions
  {
    id: 'golfclap',
    name: 'Golf Clap',
    emoji: '👏',
    category: 'reactions',
    durationMs: 1100,
    description: 'Polite audience applause',
  },
  {
    id: 'applause',
    name: 'Ovation',
    emoji: '🎉',
    category: 'reactions',
    durationMs: 1800,
    description: 'Full crowd cheering',
  },
  {
    id: 'drumroll',
    name: 'Drum Roll',
    emoji: '🥁',
    category: 'reactions',
    durationMs: 1500,
    description: 'Snare crescendo into hit',
  },
  {
    id: 'tada',
    name: 'Ta-Da Fanfare',
    emoji: '🎺',
    category: 'reactions',
    durationMs: 1400,
    description: 'Celebratory fanfare',
  },
  {
    id: 'ding',
    name: 'Correct Ding',
    emoji: '✅',
    category: 'reactions',
    durationMs: 1000,
    description: 'Bright pure sine chime',
  },
  {
    id: 'buzzer',
    name: 'Wrong Buzzer',
    emoji: '❌',
    category: 'reactions',
    durationMs: 700,
    description: 'Dissonant low buzzer',
  },
  {
    id: 'crickets',
    name: 'Crickets',
    emoji: '🦗',
    category: 'reactions',
    durationMs: 1600,
    description: 'Awkward silence chirps',
  },

  // 5. Cinematic SFX
  {
    id: 'braam',
    name: 'Inception Braam',
    emoji: '🔊',
    category: 'cinema',
    durationMs: 2200,
    description: 'Deep cinematic brass roar',
  },
  {
    id: 'impact',
    name: 'Epic Impact',
    emoji: '💥',
    category: 'cinema',
    durationMs: 1600,
    description: 'Heavy trailer sub hit',
  },
  {
    id: 'whoosh',
    name: 'Sub Whoosh',
    emoji: '🛸',
    category: 'cinema',
    durationMs: 900,
    description: 'Atmospheric riser sweep',
  },
  {
    id: 'thunder',
    name: 'Thunder Strike',
    emoji: '⚡',
    category: 'cinema',
    durationMs: 1800,
    description: 'Sharp strike and rumble',
  },
  {
    id: 'heartbeat',
    name: 'Tension Heartbeat',
    emoji: '💓',
    category: 'cinema',
    durationMs: 1200,
    description: 'Double muffled low thump',
  },
];

export class SoundboardEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private broadcastGain: GainNode | null = null;
  private sidechainGain: GainNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;

  // Buffer cache for custom uploaded sounds
  private bufferCache = new Map<string, AudioBuffer>();

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

  // Active playing sources to cancel on re-trigger or stop cleanly from 0
  private activeSources: Array<{ stop: (time?: number) => void }> = [];
  private currentPlayToken = 0;

  constructor(customAudioContext?: AudioContext) {
    if (typeof window !== 'undefined') {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.audioCtx = customAudioContext || new AudioCtx();
          this.wrapAudioContextSources(this.audioCtx);
          this.initAudioGraph();
        }
      } catch (err) {
        console.warn('[SoundboardEngine] AudioContext initialization failed:', err);
      }
    }
  }

  public ensureAudioContext(): void {
    if (!this.audioCtx && typeof window !== 'undefined') {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.audioCtx = new AudioCtx();
          this.wrapAudioContextSources(this.audioCtx);
          this.initAudioGraph();
        }
      } catch (err) {
        console.warn('[SoundboardEngine] AudioContext initialization failed:', err);
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume().catch(() => {});
    }
  }

  private wrapAudioContextSources(ctx: AudioContext): void {
    try {
      const origCreateOscillator = ctx.createOscillator?.bind(ctx);
      if (origCreateOscillator) {
        const originalMock = (ctx.createOscillator as unknown as { mock?: unknown })?.mock;
        const wrappedOsc: any = () => {
          const osc = origCreateOscillator();
          this.trackSource(osc);
          return osc;
        };
        if (originalMock) {
          wrappedOsc.mock = originalMock;
        }
        ctx.createOscillator = wrappedOsc;
      }

      const origCreateBufferSource = ctx.createBufferSource?.bind(ctx);
      if (origCreateBufferSource) {
        const originalMock = (ctx.createBufferSource as unknown as { mock?: unknown })?.mock;
        const wrappedBuf: any = () => {
          const src = origCreateBufferSource();
          this.trackSource(src);
          return src;
        };
        if (originalMock) {
          wrappedBuf.mock = originalMock;
        }
        ctx.createBufferSource = wrappedBuf;
      }
    } catch (e) {
      console.warn('[SoundboardEngine] Could not wrap AudioContext sources:', e);
    }
  }

  public trackSource(source: { stop?: (time?: number) => void }): void {
    if (typeof source?.stop === 'function') {
      this.activeSources.push(source as { stop: (time?: number) => void });
      const origOnended = (source as any).onended;
      (source as any).onended = (ev: Event) => {
        const idx = this.activeSources.indexOf(source as any);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (typeof origOnended === 'function') {
          origOnended.call(source, ev);
        }
      };
    }
  }

  public stopCurrentPlayback(): void {
    this.currentPlayToken++;
    const sources = [...this.activeSources];
    this.activeSources = [];
    for (const src of sources) {
      try {
        src.stop();
      } catch {
        // Source might have ended or already been stopped
      }
    }
  }

  public hasCustomAudio(key: string): boolean {
    return this.bufferCache.has(key);
  }

  public getCachedBuffer(key: string): AudioBuffer | undefined {
    return this.bufferCache.get(key);
  }

  public setCachedBuffer(key: string, buffer: AudioBuffer): void {
    this.bufferCache.set(key, buffer);
  }

  private initAudioGraph(): void {
    if (!this.audioCtx) return;

    // Master volume gain (plays locally to user's headphones/speakers)
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 1.0;

    // Broadcast gain node (controls output into WebRTC destination stream; muted during preview)
    this.broadcastGain = this.audioCtx.createGain();
    this.broadcastGain.gain.value = 1.0;

    // Sidechain ducking gain node (modulated dynamically between 1.0 and 0.5)
    this.sidechainGain = this.audioCtx.createGain();
    this.sidechainGain.gain.value = 1.0;

    // Stream destination for legacy destination checks & WebRTC pipeline
    this.destinationNode = this.audioCtx.createMediaStreamDestination();

    // Chain: Generators -> SidechainGain -> MasterGain -> AudioCtx.destination (local speakers)
    //                                                  -> BroadcastGain -> DestinationNode (WebRTC stream)
    this.sidechainGain.connect(this.masterGain);
    this.masterGain.connect(this.audioCtx.destination);
    this.masterGain.connect(this.broadcastGain);
    this.broadcastGain.connect(this.destinationNode);
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

      const buffer = new Float32Array(this.micAnalyser.fftSize);

      this.sidechainMonitorTimer = setInterval(() => {
        if (!this.micAnalyser || !this.sidechainGain || !this.audioCtx) return;

        this.micAnalyser.getFloatTimeDomainData(buffer);
        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i++) {
          sumSquares += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sumSquares / buffer.length);

        const isSpeaking = rms > this.duckingThreshold;

        if (isSpeaking) {
          this.speechHoldCount = 4; // Hold ducking for ~200ms
          if (!this.isDucking) {
            this.isDucking = true;
            this.notifyDucking(true);
            const now = this.audioCtx.currentTime;
            this.sidechainGain.gain.cancelScheduledValues?.(now);
            this.sidechainGain.gain.setTargetAtTime(this.duckingFactor, now, 0.04);
          }
        } else if (this.speechHoldCount > 0) {
          this.speechHoldCount--;
        } else if (this.isDucking) {
          this.isDucking = false;
          this.notifyDucking(false);
          const now = this.audioCtx.currentTime;
          this.sidechainGain.gain.cancelScheduledValues?.(now);
          this.sidechainGain.gain.setTargetAtTime(1.0, now, 0.15);
        }
      }, 50);
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
   * Play procedural sound effect or user-uploaded audio data.
   * If isPreview is true, audio is played strictly into local headphones/speakers and muted from WebRTC broadcast.
   */
  public play(id: string, customAudioData?: string, volume = 1.0, isPreview = false): void {
    if (this.isMuted || !this.audioCtx || !this.sidechainGain) return;

    // Immediately stop any existing active sounds so repeated clicks restart cleanly from 0
    this.stopCurrentPlayback();
    const token = this.currentPlayToken;

    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }

    if (this.broadcastGain) {
      const now = this.audioCtx.currentTime;
      try {
        this.broadcastGain.gain.cancelScheduledValues?.(now);
        this.broadcastGain.gain.setValueAtTime(isPreview ? 0.0 : 1.0, now);
      } catch {
        this.broadcastGain.gain.value = isPreview ? 0.0 : 1.0;
      }
    }

    if (customAudioData) {
      void this.playCustomAudio(customAudioData, volume, token);
      return;
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
      case 'quack':
        this.synthQuack(now);
        break;
      case 'bruh':
        this.synthBruh(now);
        break;
      case 'sadhorn':
        this.synthSadhorn(now);
        break;
      case 'oof':
        this.synthOof(now);
        break;
      case 'nani':
        this.synthNani(now);
        break;
      case 'slash':
        this.synthSlash(now);
        break;
      case 'teleport':
        this.synthTeleport(now);
        break;
      case 'sparkle':
        this.synthSparkle(now);
        break;
      case 'bell':
        this.synthBell(now);
        break;
      case 'coin':
        this.synthCoin(now);
        break;
      case 'levelup':
        this.synthLevelup(now);
        break;
      case 'gameover':
        this.synthGameover(now);
        break;
      case 'hitmarker':
        this.synthHitmarker(now);
        break;
      case 'bomb':
        this.synthBomb(now);
        break;
      case 'shield':
        this.synthShield(now);
        break;
      case 'golfclap':
        this.synthGolfclap(now);
        break;
      case 'drumroll':
        this.synthDrumroll(now);
        break;
      case 'ding':
        this.synthDing(now);
        break;
      case 'buzzer':
        this.synthBuzzer(now);
        break;
      case 'crickets':
        this.synthCrickets(now);
        break;
      case 'braam':
        this.synthBraam(now);
        break;
      case 'impact':
        this.synthImpact(now);
        break;
      case 'whoosh':
        this.synthWhoosh(now);
        break;
      case 'thunder':
        this.synthThunder(now);
        break;
      case 'heartbeat':
        this.synthHeartbeat(now);
        break;
      default:
        this.synthDing(now);
        break;
    }
  }

  /**
   * Decode and play custom audio data (base64 data URL, blob url, or CDN).
   */
  public async playCustomAudio(audioData: string, volume = 1.0, token?: number): Promise<void> {
    if (this.isMuted || !this.audioCtx || !this.sidechainGain) return;

    try {
      let buffer = this.bufferCache.get(audioData);
      if (!buffer) {
        const response = await fetch(audioData);
        const arrayBuffer = await response.arrayBuffer();
        if (token !== undefined && token !== this.currentPlayToken) {
          // Playback was cancelled or restarted during arrayBuffer download
          return;
        }
        buffer = await this.audioCtx.decodeAudioData(arrayBuffer);
        this.bufferCache.set(audioData, buffer);
      }

      if (token !== undefined && token !== this.currentPlayToken) {
        // Playback was cancelled or restarted during audio decoding
        return;
      }

      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;

      const gain = this.audioCtx.createGain();
      gain.gain.value = Math.max(0, Math.min(2.0, volume));

      source.connect(gain);
      gain.connect(this.sidechainGain);

      source.start();
    } catch (err) {
      console.warn('[SoundboardEngine] Failed to play custom audio:', err);
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

    this.createNoiseBurst(startTime, 0.12, 2200, 0.35);
  }

  /** Ta-Da Fanfare: Major triad chime arpeggio (C5 - E5 - G5 - C6) */
  private synthTada(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.18 }, // C5
      { freq: 659.25, time: 0.15, dur: 0.18 }, // E5
      { freq: 783.99, time: 0.3, dur: 0.18 }, // G5
      { freq: 1046.5, time: 0.45, dur: 0.7 }, // C6
    ];

    notes.forEach(({ freq, time, dur }) => {
      const t = startTime + time;
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gain);
      gain.connect(this.sidechainGain!);

      osc.start(t);
      osc.stop(t + dur);
    });
  }

  /** Applause: Realistic stereo layered crowd cheering noise */
  private synthApplause(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    for (let c = 0; c < 6; c++) {
      const delay = c * 0.1 + Math.random() * 0.05;
      const dur = 1.4 + Math.random() * 0.4;
      const cutoff = 1600 + Math.random() * 800;
      this.createNoiseBurst(startTime + delay, dur, cutoff, 0.18, 'bandpass');
    }
  }

  /** Ba-Dum-Tss: Standup comedy rimshot tag */
  private synthBadumtss(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    // Ba (Tom 1)
    const tom1 = this.audioCtx.createOscillator();
    const tom1Gain = this.audioCtx.createGain();
    tom1.type = 'sine';
    tom1.frequency.setValueAtTime(180, startTime);
    tom1.frequency.exponentialRampToValueAtTime(90, startTime + 0.15);
    tom1Gain.gain.setValueAtTime(0.5, startTime);
    tom1Gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
    tom1.connect(tom1Gain);
    tom1Gain.connect(this.sidechainGain);
    tom1.start(startTime);
    tom1.stop(startTime + 0.18);

    // Dum (Tom 2)
    const t2 = startTime + 0.22;
    const tom2 = this.audioCtx.createOscillator();
    const tom2Gain = this.audioCtx.createGain();
    tom2.type = 'sine';
    tom2.frequency.setValueAtTime(140, t2);
    tom2.frequency.exponentialRampToValueAtTime(70, t2 + 0.15);
    tom2Gain.gain.setValueAtTime(0.55, t2);
    tom2Gain.gain.exponentialRampToValueAtTime(0.001, t2 + 0.18);
    tom2.connect(tom2Gain);
    tom2Gain.connect(this.sidechainGain);
    tom2.start(t2);
    tom2.stop(t2 + 0.18);

    // Tss (Crash Cymbal)
    const t3 = startTime + 0.45;
    this.createNoiseBurst(t3, 0.7, 5000, 0.4, 'highpass');
  }

  /** Cartoon Boing: Whimsical flexatone/spring bounce */
  private synthBoing(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const vibrato = this.audioCtx.createOscillator();
    const vibratoGain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, startTime);
    osc.frequency.exponentialRampToValueAtTime(620, startTime + 0.35);

    vibrato.frequency.setValueAtTime(18, startTime);
    vibratoGain.gain.setValueAtTime(35, startTime);

    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.65);

    osc.connect(gain);
    gain.connect(this.sidechainGain);

    vibrato.start(startTime);
    osc.start(startTime);
    vibrato.stop(startTime + 0.65);
    osc.stop(startTime + 0.65);
  }

  private synthQuack(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const dur = 0.28;
    const osc = this.audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(460, startTime);
    osc.frequency.exponentialRampToValueAtTime(260, startTime + dur);

    // Formant filter 1 (~700Hz vowel)
    const filter1 = this.audioCtx.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(750, startTime);
    filter1.Q.setValueAtTime(4.5, startTime);

    // Formant filter 2 (~1300Hz nasal)
    const filter2 = this.audioCtx.createBiquadFilter();
    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(1350, startTime);
    filter2.Q.setValueAtTime(5.0, startTime);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.45, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

    osc.connect(filter1);
    osc.connect(filter2);
    filter1.connect(gain);
    filter2.connect(gain);
    gain.connect(this.sidechainGain);

    osc.start(startTime);
    osc.stop(startTime + dur);
  }

  /** Bruh: Deep 808 sub bass drop */
  private synthBruh(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, startTime);
    osc.frequency.exponentialRampToValueAtTime(32, startTime + 0.6);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.7, startTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.7);

    osc.connect(gain);
    gain.connect(this.sidechainGain);

    osc.start(startTime);
    osc.stop(startTime + 0.7);
  }

  /** Sadhorn: Classic 4-note descending trombone wah-wah-wah-waaah */
  private synthSadhorn(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const notes = [
      { freq: 293.66, delay: 0.0, dur: 0.32 }, // D4
      { freq: 277.18, delay: 0.36, dur: 0.32 }, // Db4
      { freq: 261.63, delay: 0.72, dur: 0.32 }, // C4
      { freq: 246.94, delay: 1.08, dur: 0.85 }, // B3
    ];

    notes.forEach(({ freq, delay, dur }, idx) => {
      const t = startTime + delay;
      const osc = this.audioCtx!.createOscillator();
      const filter = this.audioCtx!.createBiquadFilter();
      const gain = this.audioCtx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      if (idx === 3) {
        osc.frequency.exponentialRampToValueAtTime(freq * 0.92, t + dur);
      }

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.linearRampToValueAtTime(1400, t + 0.06);
      filter.frequency.exponentialRampToValueAtTime(600, t + dur);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sidechainGain!);

      osc.start(t);
      osc.stop(t + dur);
    });
  }

  /** Oof: Punchy vocal pitch drop */
  private synthOof(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, startTime);
    osc.frequency.exponentialRampToValueAtTime(75, startTime + 0.2);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

    osc.connect(gain);
    gain.connect(this.sidechainGain);

    osc.start(startTime);
    osc.stop(startTime + 0.25);
  }

  /** Nani?!: High-pitched rising anime chime shimmer */
  private synthNani(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, startTime);
    osc.frequency.exponentialRampToValueAtTime(1850, startTime + 0.35);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.35, startTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.55);

    osc.connect(gain);
    gain.connect(this.sidechainGain);

    osc.start(startTime);
    osc.stop(startTime + 0.55);
  }

  /** Katana Slash: Crisp highpass blade slice */
  private synthSlash(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    this.createNoiseBurst(startTime, 0.25, 3500, 0.45, 'highpass');

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, startTime);
    osc.frequency.exponentialRampToValueAtTime(1200, startTime + 0.15);

    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

    osc.connect(gain);
    gain.connect(this.sidechainGain);
    osc.start(startTime);
    osc.stop(startTime + 0.18);
  }

  /** Shunpo Teleport: Rapid frequency swoosh riser */
  private synthTeleport(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, startTime);
    osc.frequency.exponentialRampToValueAtTime(2200, startTime + 0.28);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.35, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.38);

    osc.connect(gain);
    gain.connect(this.sidechainGain);
    osc.start(startTime);
    osc.stop(startTime + 0.38);
  }

  /** Chime Sparkle: High crystalline arpeggio */
  private synthSparkle(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const freqs = [1046.5, 1318.5, 1567.98, 1975.5, 2093.0];
    freqs.forEach((freq, idx) => {
      const t = startTime + idx * 0.05;
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      osc.connect(gain);
      gain.connect(this.sidechainGain!);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  /** Temple Bell: Resonant harmonic bell */
  private synthBell(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const overtones = [520, 1045, 1560, 2090];
    overtones.forEach((freq, i) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      const amp = 0.35 / (i + 1);
      gain.gain.setValueAtTime(amp, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.4);

      osc.connect(gain);
      gain.connect(this.sidechainGain!);
      osc.start(startTime);
      osc.stop(startTime + 1.4);
    });
  }

  /** 8-Bit Coin: Authentic retro pickup */
  private synthCoin(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(987.77, startTime); // B5
    osc.frequency.setValueAtTime(1318.51, startTime + 0.08); // E6

    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.setValueAtTime(0.25, startTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.38);

    osc.connect(gain);
    gain.connect(this.sidechainGain);
    osc.start(startTime);
    osc.stop(startTime + 0.38);
  }

  /** Level Up: Ascending 8-bit fanfare */
  private synthLevelup(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const t = startTime + i * 0.06;
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.sidechainGain!);
      osc.start(t);
      osc.stop(t + 0.14);
    });
  }

  /** Game Over: Descending 8-bit defeat */
  private synthGameover(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const notes = [523.25, 493.88, 466.16, 440.0, 220.0];
    notes.forEach((freq, i) => {
      const t = startTime + i * 0.16;
      const dur = i === 4 ? 0.6 : 0.18;
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gain);
      gain.connect(this.sidechainGain!);
      osc.start(t);
      osc.stop(t + dur);
    });
  }

  /** Hitmarker: Crisp double click tick */
  private synthHitmarker(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    [0.0, 0.035].forEach((del) => {
      const t = startTime + del;
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(4200, t);
      osc.frequency.exponentialRampToValueAtTime(2100, t + 0.025);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

      osc.connect(gain);
      gain.connect(this.sidechainGain!);
      osc.start(t);
      osc.stop(t + 0.03);
    });
  }

  /** Bomb Armed: Tactical digital double pip */
  private synthBomb(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    [0.0, 0.12].forEach((del, i) => {
      const t = startTime + del;
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 1200 : 1800, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.sidechainGain!);
      osc.start(t);
      osc.stop(t + 0.08);
    });
  }

  /** Shield Deflect: Armor bounce clang */
  private synthShield(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(950, startTime);
    osc.frequency.exponentialRampToValueAtTime(320, startTime + 0.2);

    gain.gain.setValueAtTime(0.4, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

    osc.connect(gain);
    gain.connect(this.sidechainGain);
    osc.start(startTime);
    osc.stop(startTime + 0.3);

    this.createNoiseBurst(startTime, 0.18, 4000, 0.3, 'highpass');
  }

  /** Golf Clap: Polite sparse claps */
  private synthGolfclap(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    [0.0, 0.18, 0.38, 0.62].forEach((delay) => {
      this.createNoiseBurst(startTime + delay, 0.06, 1800, 0.25, 'bandpass');
    });
  }

  /** Drum Roll: Snare crescendo into hit */
  private synthDrumroll(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const numHits = 18;
    for (let i = 0; i < numHits; i++) {
      const t = startTime + (i / numHits) * 0.95;
      const vol = 0.05 + (i / numHits) * 0.35;
      this.createNoiseBurst(t, 0.04, 2400, vol, 'bandpass');
    }

    // Final rimshot hit
    this.synthRimshot(startTime + 1.05);
  }

  /** Correct Ding: Pure sine chime */
  private synthDing(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const notes = [
      { freq: 1046.5, delay: 0.0, dur: 0.6 },
      { freq: 2093.0, delay: 0.08, dur: 0.8 },
    ];

    notes.forEach(({ freq, delay, dur }) => {
      const t = startTime + delay;
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gain);
      gain.connect(this.sidechainGain!);
      osc.start(t);
      osc.stop(t + dur);
    });
  }

  /** Wrong Buzzer: Dissonant low buzzer */
  private synthBuzzer(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    [130, 138].forEach((freq) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.55);

      osc.connect(gain);
      gain.connect(this.sidechainGain!);
      osc.start(startTime);
      osc.stop(startTime + 0.55);
    });
  }

  /** Crickets: Awkward silence chirps */
  private synthCrickets(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    [0.0, 0.45, 0.9].forEach((chirpStart) => {
      for (let p = 0; p < 3; p++) {
        const t = startTime + chirpStart + p * 0.04;
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(4600, t);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

        osc.connect(gain);
        gain.connect(this.sidechainGain!);
        osc.start(t);
        osc.stop(t + 0.025);
      }
    });
  }

  /** Inception Braam: Deep cinematic brass roar */
  private synthBraam(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    [55, 55.5, 110].forEach((freq) => {
      const osc = this.audioCtx!.createOscillator();
      const filter = this.audioCtx!.createBiquadFilter();
      const gain = this.audioCtx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, startTime);
      filter.frequency.linearRampToValueAtTime(800, startTime + 0.3);
      filter.frequency.exponentialRampToValueAtTime(100, startTime + 1.8);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.9);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sidechainGain!);

      osc.start(startTime);
      osc.stop(startTime + 1.9);
    });
  }

  /** Epic Impact: Heavy trailer sub hit */
  private synthImpact(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, startTime);
    osc.frequency.exponentialRampToValueAtTime(26, startTime + 0.9);

    gain.gain.setValueAtTime(0.8, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);

    osc.connect(gain);
    gain.connect(this.sidechainGain);
    osc.start(startTime);
    osc.stop(startTime + 1.2);

    this.createNoiseBurst(startTime, 0.4, 600, 0.4, 'lowpass');
  }

  /** Sub Whoosh: Atmospheric riser sweep */
  private synthWhoosh(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    this.createNoiseBurst(startTime, 0.75, 1400, 0.35, 'bandpass');
  }

  /** Thunder Strike: Sharp strike and rumble */
  private synthThunder(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    this.createNoiseBurst(startTime, 0.15, 3000, 0.5, 'highpass');
    this.createNoiseBurst(startTime + 0.05, 1.4, 250, 0.45, 'lowpass');
  }

  /** Tension Heartbeat: Double muffled low thump */
  private synthHeartbeat(startTime: number): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    [0.0, 0.28].forEach((del, i) => {
      const t = startTime + del;
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 56 : 48, t);
      osc.frequency.exponentialRampToValueAtTime(32, t + 0.18);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.sidechainGain!);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  /** Helper: Noise burst generator */
  private createNoiseBurst(
    startTime: number,
    duration: number,
    cutoffFreq: number,
    volume: number,
    filterType: BiquadFilterType = 'bandpass',
  ): void {
    if (!this.audioCtx || !this.sidechainGain) return;

    const sampleRate = this.audioCtx.sampleRate || 48000;
    const bufferSize = Math.floor(sampleRate * duration);
    if (bufferSize <= 0) return;

    const buffer = this.audioCtx.createBuffer(1, bufferSize, sampleRate);
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

  public broadcastPlay(
    id: string,
    dataChannel?: RTCDataChannel | null,
    metadata?: {
      name?: string;
      emoji?: string;
      audioData?: string;
      volume?: number;
      senderUserId?: string;
    },
  ): void {
    this.play(id, metadata?.audioData, metadata?.volume);

    if (dataChannel && dataChannel.readyState === 'open') {
      try {
        dataChannel.send(
          JSON.stringify({
            type: 'SOUNDBOARD_PLAY',
            soundId: id,
            name: metadata?.name,
            emoji: metadata?.emoji,
            audioData: metadata?.audioData,
            volume: metadata?.volume ?? 1.0,
            senderUserId: metadata?.senderUserId,
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
      const message = JSON.parse(payload) as {
        type?: string;
        soundId?: string;
        audioData?: string;
        volume?: number;
      };
      if (message.type === 'SOUNDBOARD_PLAY' && message.soundId) {
        this.play(message.soundId, message.audioData, message.volume);
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
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1.0, this.audioCtx.currentTime, 0.02);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsDucking(): boolean {
    return this.isDucking;
  }

  public getDestinationStream(): MediaStream | null {
    if (!this.destinationNode && typeof window !== 'undefined') {
      this.ensureAudioContext();
    }
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
    this.stopCurrentPlayback();
    this.detachLocalMicStream();
    this.duckingListeners.clear();
    this.bufferCache.clear();
    this.masterGain?.disconnect();
    this.broadcastGain?.disconnect();
    this.sidechainGain?.disconnect();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      void this.audioCtx.close();
    }
    this.masterGain = null;
    this.broadcastGain = null;
    this.sidechainGain = null;
    this.destinationNode = null;
    this.audioCtx = null;
  }
}

export const globalSoundboardEngine = new SoundboardEngine();
