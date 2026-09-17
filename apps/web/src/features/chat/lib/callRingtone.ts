/**
 * Lightweight synthetic Web Audio API ringtone & chime generator.
 * Eliminates dependencies on external mp3 assets, ensuring zero latency
 * and zero network failure risk.
 */

let audioCtx: AudioContext | null = null;
let ringInterval: ReturnType<typeof setInterval> | null = null;
let vibrationInterval: ReturnType<typeof setInterval> | null = null;

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
  startIncomingVibration();

  const playChime = () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Gentle modern dual-harmonic chime (440Hz + 880Hz fading to 523Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

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

  const playPulse = () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(425, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.setValueAtTime(0.08, now + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.1);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  playPulse();
  ringInterval = setInterval(playPulse, 3000);

  return stopRingtone;
}

export function playCallEndSound(): void {
  stopRingtone();
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.35);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  } catch {
    // Audio autoplay policy fallback
  }
}

export function stopRingtone(): void {
  stopIncomingVibration();
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
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

/**
 * Tactical Radio / Walkie-Talkie Key-Up Kermung sound (PTT Press)
 */
export function playPTTPressChirp(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.045);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.055);
  } catch {
    // Audio autoplay policy fallback
  }
}

/**
 * Tactical Radio / Walkie-Talkie Key-Release Kermung click (PTT Release)
 */
export function playPTTReleaseChirp(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.038);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.042);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.046);
  } catch {
    // Audio autoplay policy fallback
  }
}
