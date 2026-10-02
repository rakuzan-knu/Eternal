/**
 * Theme Sound FX Engine (Linear / Discord style tactile micro-feedback)
 * Synthesizes ultra-short, soft mechanical clicks using the Web Audio API.
 * Requires 0 external network requests, runs with 0ms latency.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      try {
        audioCtx = new AudioCtxClass();
      } catch {
        audioCtx = null;
      }
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a subtle, tactile micro-click.
 * pitch: frequency in Hz (default 850Hz)
 * volume: normalized volume 0.0 to 1.0 (default 0.08 - very quiet and crisp)
 */
export function playMicroClick(pitch = 850, volume = 0.08): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Short pitch drop simulates a physical switch snap
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.4, now + 0.018);

    // Fast exponential decay
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.022);
  } catch {
    // Ignore audio playback errors (e.g. strict autoplay policy before first gesture)
  }
}

/**
 * Subtle pop sound for swatch selection.
 */
export function playPresetSelectSound(): void {
  playMicroClick(980, 0.07);
}

/**
 * Soft tick for toggle switches and sliders.
 */
export function playToggleSound(): void {
  playMicroClick(720, 0.06);
}
