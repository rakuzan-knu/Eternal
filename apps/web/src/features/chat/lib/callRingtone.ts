/**
 * Lightweight synthetic Web Audio API ringtone & chime generator.
 * Eliminates dependencies on external mp3 assets, ensuring zero latency
 * and zero network failure risk.
 */

import { playActionSound } from '../model/useSoundSettingsStore';
import { useCallStore } from '../model/callStore';

let audioCtx: AudioContext | null = null;
let ringInterval: ReturnType<typeof setInterval> | null = null;
let vibrationInterval: ReturnType<typeof setInterval> | null = null;
let activeGains: GainNode[] = [];

/**
 * Starts rhythmic haptic vibration pulses for incoming calls (Tactile Accessibility)
 */
export function startIncomingVibration(): void {
  stopIncomingVibration();

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    const pulsePattern = [500, 250, 500, 250]; // 500ms vibe, 250ms pause, 500ms vibe
    try {
      navigator.vibrate(pulsePattern);
      vibrationInterval = setInterval(() => {
        try {
          navigator.vibrate(pulsePattern);
        } catch {
          // Vibration API blocked or unsupported
        }
      }, 2000);
    } catch {
      // Ignored if user has disabled vibration permissions
    }
  }
}

/**
 * Stops tactile vibration pulses immediately
 */
export function stopIncomingVibration(): void {
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(0);
    } catch {
      // Ignore
    }
  }
}

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

export function playIncomingRingtone(): () => void {
  stopRingtone();

  // If call was already accepted or connected, never start ringtone
  const state = useCallStore.getState();
  if (state.callStatus === 'connected' || !state.incomingCall) {
    return stopRingtone;
  }

  startIncomingVibration();

  const playChime = () => {
    try {
      const currentState = useCallStore.getState();
      if (currentState.callStatus === 'connected' || !currentState.incomingCall) {
        stopRingtone();
        return;
      }

      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Gentle modern dual-harmonic chime (440Hz + 880Hz fading to 523Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      activeGains.push(gain);

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.3);
      osc1.frequency.exponentialRampToValueAtTime(587, now + 0.7);

      osc2.frequency.setValueAtTime(660, now);
      osc2.frequency.exponentialRampToValueAtTime(1046, now + 0.3);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.3);
      osc2.stop(now + 1.3);

      setTimeout(() => {
        activeGains = activeGains.filter((g) => g !== gain);
      }, 1400);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  playChime();
  ringInterval = setInterval(playChime, 2500);

  return stopRingtone;
}

export function playOutgoingRingtone(): () => void {
  stopRingtone();

  const state = useCallStore.getState();
  if (state.callStatus === 'connected') {
    return stopRingtone;
  }

  const playPulse = () => {
    const currentState = useCallStore.getState();
    if (currentState.callStatus === 'connected') {
      stopRingtone();
      return;
    }
    playActionSound('outgoing_call');
  };

  playPulse();
  ringInterval = setInterval(playPulse, 3000);

  return stopRingtone;
}

export function playCallEndSound(): void {
  stopRingtone();
  playActionSound('disconnect');
}

export function stopRingtone(): void {
  stopIncomingVibration();
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  activeGains.forEach((g) => {
    try {
      g.gain.setValueAtTime(0, audioCtx?.currentTime || 0);
      g.disconnect();
    } catch {
      // Ignore
    }
  });
  activeGains = [];
}

let reconnectInterval: ReturnType<typeof setInterval> | null = null;

export function playReconnectingChime(): () => void {
  stopReconnectingChime();

  const playSoftPulse = () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Soft dual-frequency radar tone (520Hz + 660Hz) for waiting grace period
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(520, now);
      osc2.frequency.setValueAtTime(659.25, now); // Musical E5

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.55);
      osc2.stop(now + 0.55);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  playSoftPulse();
  reconnectInterval = setInterval(playSoftPulse, 1800);

  return stopReconnectingChime;
}

export function stopReconnectingChime(): void {
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
  }
}

export function playReconnectedSuccessSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.18); // G5

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  } catch {
    // Audio autoplay policy fallback
  }
}

export function playPTTPressChirp(): void {
  playActionSound('ptt_activate');
}

export function playPTTReleaseChirp(): void {
  playActionSound('ptt_deactivate');
}
