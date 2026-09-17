/**
 * Dominant Speaker Hysteresis Engine with EMA Smoothing
 *
 * Prevents UI thrashing and jittery speaker-focus flipping during multi-party calls
 * when participants speak simultaneously, cough, or tap their microphone:
 * 1. Exponential Moving Average (EMA) smoothing over audio levels (alpha = 0.25).
 * 2. Hysteresis margin (15% higher energy required to challenge dominant speaker).
 * 3. Minimum sustained speech threshold (350ms) to filter out throat-clearing and transients.
 * 4. Hangover retention (1200ms) to preserve focus during natural pauses between sentences.
 */

import { useEffect, useRef } from 'react';
import { useCallStore } from '../../model/callStore';

export interface SpeakerSample {
  userId: string;
  volume: number; // 0.0 to 1.0 (RMS / audio level)
}

export interface DominantSpeakerConfig {
  emaAlpha?: number; // Smoothing factor (0.0 to 1.0, default: 0.25)
  hysteresisMargin?: number; // Additional volume ratio required to steal dominance (default: 0.15)
  minSpeechDurationMs?: number; // Minimum sustained speech time to become dominant (default: 350ms)
  hangoverDurationMs?: number; // Duration to retain dominance during silence (default: 1200ms)
  silenceThreshold?: number; // Minimum volume to be considered speaking (default: 0.05)
}

export class DominantSpeakerHysteresisEngine {
  private emaLevels = new Map<string, number>();
  private currentDominantId: string | null = null;
  private candidateId: string | null = null;
  private candidateStartTime = 0;
  private lastDominantSpeechTime = 0;

  public readonly emaAlpha: number;
  public readonly hysteresisMargin: number;
  public readonly minSpeechDurationMs: number;
  public readonly hangoverDurationMs: number;
  public readonly silenceThreshold: number;

  constructor(config: DominantSpeakerConfig = {}) {
    this.emaAlpha = config.emaAlpha ?? 0.25;
    this.hysteresisMargin = config.hysteresisMargin ?? 0.15;
    this.minSpeechDurationMs = config.minSpeechDurationMs ?? 350;
    this.hangoverDurationMs = config.hangoverDurationMs ?? 1200;
    this.silenceThreshold = config.silenceThreshold ?? 0.05;
  }

  /**
   * Processes a batch of audio volume samples from all active participants
   * and returns the current dominant speaker ID.
   */
  public processSamples(samples: SpeakerSample[], now = Date.now()): string | null {
    // 1. Update EMA for all reporting participants
    for (const sample of samples) {
      const prevEma = this.emaLevels.get(sample.userId) ?? 0;
      const updatedEma = this.emaAlpha * sample.volume + (1 - this.emaAlpha) * prevEma;
      this.emaLevels.set(sample.userId, updatedEma);
    }

    // 2. Find highest active speaker in this cycle
    let highestUserId: string | null = null;
    let highestEma = 0;

    for (const [userId, ema] of this.emaLevels.entries()) {
      if (ema > highestEma && ema >= this.silenceThreshold) {
        highestEma = ema;
        highestUserId = userId;
      }
    }

    // 3. Track current dominant speaker's speech activity using raw sample
    const dominantSample = this.currentDominantId
      ? samples.find((s) => s.userId === this.currentDominantId)
      : undefined;

    if (
      this.currentDominantId &&
      dominantSample &&
      dominantSample.volume >= this.silenceThreshold
    ) {
      this.lastDominantSpeechTime = now;
    }

    // Case A: No dominant speaker yet established
    if (!this.currentDominantId) {
      if (highestUserId) {
        if (this.candidateId === highestUserId) {
          if (now - this.candidateStartTime >= this.minSpeechDurationMs) {
            this.currentDominantId = highestUserId;
            this.lastDominantSpeechTime = now;
            this.candidateId = null;
          }
        } else {
          this.candidateId = highestUserId;
          this.candidateStartTime = now;
        }
      } else {
        this.candidateId = null;
      }
      return this.currentDominantId;
    }

    // Case B: Dominant speaker is established
    const currentDominantEma = this.emaLevels.get(this.currentDominantId) ?? 0;

    // Check if current speaker is still within hangover window
    const isWithinHangover = now - this.lastDominantSpeechTime < this.hangoverDurationMs;

    if (highestUserId && highestUserId !== this.currentDominantId) {
      // Challenger must exceed current dominant by hysteresis margin
      const thresholdRequired = currentDominantEma * (1 + this.hysteresisMargin);

      if (highestEma >= thresholdRequired || !isWithinHangover) {
        if (this.candidateId === highestUserId) {
          // Check sustained speech duration
          if (now - this.candidateStartTime >= this.minSpeechDurationMs) {
            this.currentDominantId = highestUserId;
            this.lastDominantSpeechTime = now;
            this.candidateId = null;
          }
        } else {
          this.candidateId = highestUserId;
          this.candidateStartTime = now;
        }
      } else {
        // Challenger failed hysteresis margin check
        this.candidateId = null;
      }
    } else {
      // Current dominant is still highest or everyone is silent
      this.candidateId = null;
    }

    // If dominant speaker has ceased speaking and hangover window has expired, release dominance
    const isDominantSilent = !dominantSample || dominantSample.volume < this.silenceThreshold;
    if (isDominantSilent && !isWithinHangover) {
      this.currentDominantId = null;
    }

    return this.currentDominantId;
  }

  public getDominantSpeakerId(): string | null {
    return this.currentDominantId;
  }

  public getEmaLevel(userId: string): number {
    return this.emaLevels.get(userId) ?? 0;
  }

  public reset(): void {
    this.emaLevels.clear();
    this.currentDominantId = null;
    this.candidateId = null;
    this.candidateStartTime = 0;
    this.lastDominantSpeechTime = 0;
  }
}

export const globalDominantSpeakerEngine = new DominantSpeakerHysteresisEngine();

/**
 * React hook tracking dominant speaker across local and remote streams
 */
export function useDominantSpeakerTracker(
  localStream: MediaStream | null,
  remoteStreams: Record<string, MediaStream>,
  currentUserId: string,
) {
  const engineRef = useRef<DominantSpeakerHysteresisEngine>(globalDominantSpeakerEngine);
  const setDominantSpeakerId = useCallStore((s) => s.setDominantSpeakerId);

  const remoteStreamsKey = Object.entries(remoteStreams)
    .map(([k, s]) => `${k}:${s.id}`)
    .sort()
    .join(';');

  useEffect(() => {
    if (typeof window === 'undefined' || typeof AudioContext === 'undefined') {
      return;
    }

    let audioContext: AudioContext | null = null;
    let animId: number | null = null;
    let lastDominantId: string | null = null;
    const analysers = new Map<string, AnalyserNode>();

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContext = new AudioCtx();

      // Hook local stream
      if (localStream && localStream.getAudioTracks().length > 0) {
        const source = audioContext.createMediaStreamSource(localStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analysers.set(currentUserId, analyser);
      }

      // Hook remote streams
      for (const [userId, stream] of Object.entries(remoteStreams)) {
        if (stream.getAudioTracks().length > 0) {
          try {
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analysers.set(userId, analyser);
          } catch {
            // Ignore track binding errors
          }
        }
      }

      const buffer = new Uint8Array(128);

      const loop = () => {
        const samples: SpeakerSample[] = [];

        analysers.forEach((analyser, userId) => {
          analyser.getByteTimeDomainData(buffer);
          let sumSquares = 0;
          for (let i = 0; i < buffer.length; i++) {
            const normalized = (buffer[i] - 128) / 128;
            sumSquares += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquares / buffer.length);
          samples.push({ userId, volume: rms });
        });

        const dominantId = engineRef.current.processSamples(samples);
        if (dominantId !== lastDominantId) {
          lastDominantId = dominantId;
          setDominantSpeakerId(dominantId);
        }

        animId = requestAnimationFrame(loop);
      };

      animId = requestAnimationFrame(loop);
    } catch {
      // AudioContext failure fallback
    }

    const engine = engineRef.current;

    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
      if (audioContext && audioContext.state !== 'closed') {
        void audioContext.close();
      }
      engine.reset();
      if (useCallStore.getState().dominantSpeakerId !== null) {
        setDominantSpeakerId(null);
      }
    };
  }, [
    localStream?.id,
    remoteStreamsKey,
    currentUserId,
    setDominantSpeakerId,
    localStream,
    remoteStreams,
  ]);
}
