/**
 * Synesthetic Speech Audio Visualizer Engine (A11Y Lip-Reading Tile Overlay)
 *
 * Designed for deaf and hard-of-hearing users who read lips.
 * Connects a Web Audio AnalyserNode to incoming speaker streams and calculates
 * real-time spectral centroid and RMS volume. Translates vocal intonation and pitch
 * into a high-contrast pulsating glowing border around the participant's video tile:
 * - Low pitch (80-280 Hz, calm bass) -> Deep Blue / Cyan (#38bdf8)
 * - Mid pitch (280-1200 Hz, warm speech) -> Emerald / Teal (#10b981)
 * - High pitch / stress / laughter (>1200 Hz) -> Amber / Crimson (#f59e0b, #ef4444)
 */

import { useState, useEffect, useRef } from 'react';

export interface SynestheticVisualFrame {
  intensity: number; // 0.0 to 1.0
  pitchHz: number; // Approximate spectral centroid in Hz
  color: string; // CSS color string (hex or rgb)
  isSpeaking: boolean;
}

export interface SynestheticOverlayStyle {
  borderColor: string;
  boxShadow: string;
  borderWidth: string;
  isSpeaking: boolean;
}

/**
 * Pure helper to compute spectral centroid and pitch color from frequency bins
 */
export function calculateSpectralFrame(
  freqData: Uint8Array,
  sampleRate = 48000,
): SynestheticVisualFrame {
  const binCount = freqData.length;
  if (binCount === 0) {
    return { intensity: 0, pitchHz: 0, color: '#38bdf8', isSpeaking: false };
  }

  const nyquist = sampleRate / 2;
  const binWidth = nyquist / binCount;

  let weightedFreqSum = 0;
  let totalMagnitude = 0;
  let maxVal = 0;

  for (let i = 0; i < binCount; i++) {
    const mag = freqData[i]!;
    if (mag > maxVal) maxVal = mag;
    const freq = (i + 0.5) * binWidth;
    weightedFreqSum += freq * mag;
    totalMagnitude += mag;
  }

  const intensity = Math.min(1.0, maxVal / 255.0);
  const isSpeaking = intensity > 0.12;

  const centroidHz = totalMagnitude > 0 ? weightedFreqSum / totalMagnitude : 200;

  // Map Centroid Frequency to Emotion / Intonation Color
  let color = '#38bdf8'; // Low / Deep Bass (Sky Blue)
  if (centroidHz < 320) {
    color = '#38bdf8'; // Bass / Calm (#38bdf8)
  } else if (centroidHz < 900) {
    color = '#10b981'; // Warm Mid Speech (#10b981)
  } else if (centroidHz < 1800) {
    color = '#f59e0b'; // Excited / Energetic (#f59e0b)
  } else {
    color = '#ef4444'; // Sharp pitch / Sibilance / Stress (#ef4444)
  }

  return {
    intensity,
    pitchHz: Math.round(centroidHz),
    color,
    isSpeaking,
  };
}

export class SynestheticVisualizerEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private freqBuffer = new Uint8Array(128);

  public attachStream(stream: MediaStream): boolean {
    if (!stream || stream.getAudioTracks().length === 0) {
      return false;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;

      this.audioCtx = new AudioCtx();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.7;

      this.source = this.audioCtx.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      this.freqBuffer = new Uint8Array(this.analyser.frequencyBinCount);
      return true;
    } catch {
      return false;
    }
  }

  public sampleFrame(): SynestheticVisualFrame {
    if (!this.analyser || !this.audioCtx) {
      return { intensity: 0, pitchHz: 0, color: '#38bdf8', isSpeaking: false };
    }

    this.analyser.getByteFrequencyData(this.freqBuffer);
    return calculateSpectralFrame(this.freqBuffer, this.audioCtx.sampleRate);
  }

  public destroy(): void {
    try {
      this.source?.disconnect();
      this.analyser?.disconnect();
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        void this.audioCtx.close();
      }
    } catch {
      // Ignored
    }
    this.source = null;
    this.analyser = null;
    this.audioCtx = null;
  }
}

/**
 * React hook connecting Synesthetic visualizer to a participant's MediaStream
 */
export function useSynestheticVisualizer(
  stream: MediaStream | null | undefined,
  enabled = false,
): SynestheticOverlayStyle {
  const [frame, setFrame] = useState<SynestheticVisualFrame>({
    intensity: 0,
    pitchHz: 200,
    color: '#38bdf8',
    isSpeaking: false,
  });

  const engineRef = useRef<SynestheticVisualizerEngine | null>(null);

  useEffect(() => {
    if (!enabled || !stream) {
      engineRef.current?.destroy();
      engineRef.current = null;
      setFrame({ intensity: 0, pitchHz: 200, color: '#38bdf8', isSpeaking: false });
      return;
    }

    const engine = new SynestheticVisualizerEngine();
    const success = engine.attachStream(stream);
    if (!success) return;

    engineRef.current = engine;

    let animId: number;
    const loop = () => {
      const current = engine.sampleFrame();
      setFrame(current);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      engine.destroy();
      engineRef.current = null;
    };
  }, [stream, enabled]);

  if (!enabled || !frame.isSpeaking) {
    return {
      borderColor: 'rgba(255, 255, 255, 0.1)',
      boxShadow: 'none',
      borderWidth: '1px',
      isSpeaking: false,
    };
  }

  return {
    borderColor: frame.color,
    boxShadow: `0 0 ${Math.round(10 + frame.intensity * 30)}px ${frame.color}99, inset 0 0 10px ${frame.color}44`,
    borderWidth: `${Math.round(2 + frame.intensity * 3)}px`,
    isSpeaking: true,
  };
}
