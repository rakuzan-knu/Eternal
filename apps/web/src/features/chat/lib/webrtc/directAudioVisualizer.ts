/**
 * Direct CSS Variable Audio Visualizer (Zero-Re-render 60 FPS Engine)
 *
 * Connects Web Audio AnalyserNode to a media stream or audio track and mutates
 * CSS Custom Properties (`--volume`, `--speech-scale`, `--volume-glow`) directly on the DOM
 * element within requestAnimationFrame.
 *
 * Completely eliminates React component re-renders (zero setState calls) during
 * active speech, achieving 60 FPS performance without V8 GC churn.
 */

import { useEffect, useRef, type RefObject } from 'react';

export interface DirectAudioVisualizerOptions {
  fftSize?: number;
  minVolumeThreshold?: number; // Volume threshold considered "speaking" (0.0 - 1.0)
  smoothingFactor?: number;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

export class DirectAudioVisualizer {
  private readonly targetElement: HTMLElement;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private animId: number | null = null;
  private isDestroyed = false;

  private smoothedVolume = 0;
  private lastSpeakingState = false;
  private isPaused = false;

  private readonly fftSize: number;
  private readonly minVolumeThreshold: number;
  private readonly onSpeakingChange?: (isSpeaking: boolean) => void;

  constructor(
    targetElement: HTMLElement,
    stream: MediaStream,
    options: DirectAudioVisualizerOptions = {},
  ) {
    this.targetElement = targetElement;
    this.fftSize = options.fftSize || 256;
    this.minVolumeThreshold = options.minVolumeThreshold || 0.04;
    this.onSpeakingChange = options.onSpeakingChange;

    this.initAudio(stream);
  }

  private initAudio(stream: MediaStream): void {
    if (typeof window === 'undefined') return;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.5;

      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyser);

      this.dataArray = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
      this.startLoop();
    } catch (err) {
      console.warn('[DirectAudioVisualizer] Failed to initialize AudioContext:', err);
    }
  }

  private startLoop = (): void => {
    if (this.isDestroyed) return;

    const render = () => {
      if (this.isDestroyed) return;

      if (!this.isPaused && this.analyser && this.dataArray) {
        this.analyser.getByteFrequencyData(this.dataArray);

        let sum = 0;
        const length = this.dataArray.length;
        for (let i = 0; i < length; i++) {
          sum += this.dataArray[i];
        }

        const rawVolume = length > 0 ? sum / (length * 255) : 0;

        // Asymmetric attack/decay smoothing: fast attack, gentle decay
        const attack = 0.45;
        const decay = 0.12;
        const factor = rawVolume > this.smoothedVolume ? attack : decay;
        this.smoothedVolume = this.smoothedVolume + (rawVolume - this.smoothedVolume) * factor;

        const volume = Math.max(0, Math.min(1, this.smoothedVolume));
        const glowPx = (volume * 22).toFixed(1);
        const scale = (1 + volume * 0.12).toFixed(3);

        // Mutate CSS Custom Properties directly on the DOM element without React re-render
        this.targetElement.style.setProperty('--volume', volume.toFixed(3));
        this.targetElement.style.setProperty('--volume-glow', `${glowPx}px`);
        this.targetElement.style.setProperty('--speech-scale', scale);

        const isSpeaking = volume >= this.minVolumeThreshold;
        if (isSpeaking !== this.lastSpeakingState) {
          this.lastSpeakingState = isSpeaking;
          this.onSpeakingChange?.(isSpeaking);
        }
      }

      this.animId = requestAnimationFrame(render);
    };

    this.animId = requestAnimationFrame(render);
  };

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (paused) {
      this.smoothedVolume = 0;
      this.targetElement.style.setProperty('--volume', '0');
      this.targetElement.style.setProperty('--volume-glow', '0px');
      this.targetElement.style.setProperty('--speech-scale', '1');
      if (this.lastSpeakingState) {
        this.lastSpeakingState = false;
        this.onSpeakingChange?.(false);
      }
    }
  }

  public destroy(): void {
    this.isDestroyed = true;

    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    try {
      this.sourceNode?.disconnect();
      this.analyser?.disconnect();
      if (this.audioContext && this.audioContext.state !== 'closed') {
        void this.audioContext.close();
      }
    } catch {
      // AudioContext close error ignore
    }

    this.sourceNode = null;
    this.analyser = null;
    this.audioContext = null;
    this.dataArray = null;

    // Reset styles
    this.targetElement.style.removeProperty('--volume');
    this.targetElement.style.removeProperty('--volume-glow');
    this.targetElement.style.removeProperty('--speech-scale');
  }
}

/**
 * React hook connecting a DOM container to direct 60 FPS CSS custom property animation
 */
export function useDirectAudioVisualizer(
  elementRef: RefObject<HTMLElement | null>,
  stream: MediaStream | null,
  isMuted: boolean = false,
  options: DirectAudioVisualizerOptions = {},
) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const el = elementRef.current;
    if (!el || !stream) return;

    const visualizer = new DirectAudioVisualizer(el, stream, optionsRef.current);
    visualizer.setPaused(isMuted);

    return () => {
      visualizer.destroy();
    };
  }, [elementRef, stream, isMuted]);
}
