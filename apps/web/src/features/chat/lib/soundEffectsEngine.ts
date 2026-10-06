export interface DiscordSoundItem {
  id: string;
  name: string;
  file: string;
}

export const DISCORD_SOUND_ITEMS: DiscordSoundItem[] = [
  { id: 'mute', name: 'Mute', file: '/sounds/mute.wav' },
  { id: 'undeafen', name: 'Undeafen', file: '/sounds/undeafen.wav' },
  { id: 'deafen', name: 'Deafen', file: '/sounds/deafen.wav' },
  { id: 'unmute', name: 'Unmute', file: '/sounds/unmute.wav' },

  { id: 'camera_on', name: 'Camera On', file: '/sounds/camera_on.wav' },
  { id: 'camera_off', name: 'Camera Off', file: '/sounds/camera_off.wav' },
  { id: 'disconnect', name: 'Voice Disconnected', file: '/sounds/disconnect.wav' },
  { id: 'ptt_activate', name: 'PTT Activate', file: '/sounds/ptt_activate.wav' },
  { id: 'ptt_deactivate', name: 'PTT Deactivate', file: '/sounds/ptt_deactivate.wav' },
  { id: 'user_join', name: 'User Join', file: '/sounds/user_join.wav' },
  { id: 'user_leave', name: 'User Leave', file: '/sounds/user_leave.wav' },
  { id: 'user_moved', name: 'User Moved', file: '/sounds/user_moved.wav' },
  { id: 'outgoing_call', name: 'Outgoing Call', file: '/sounds/outgoing_call.wav' },
  { id: 'stream_start', name: 'Stream Started', file: '/sounds/stream_start.wav' },
  { id: 'stream_stop', name: 'Stream Stopped', file: '/sounds/stream_stop.wav' },
  { id: 'viewer_join', name: 'Viewer Joined', file: '/sounds/viewer_join.wav' },
  { id: 'viewer_leave', name: 'Viewer Left', file: '/sounds/viewer_leave.wav' },
  { id: 'activity_start', name: 'Activity Started', file: '/sounds/activity_start.wav' },
  { id: 'activity_end', name: 'Activity Ended', file: '/sounds/activity_end.wav' },
  {
    id: 'activity_user_join',
    name: 'User Joined Activity',
    file: '/sounds/activity_user_join.wav',
  },
  {
    id: 'activity_user_leave',
    name: 'User Left Activity',
    file: '/sounds/activity_user_leave.wav',
  },
  { id: 'stage_speak_invite', name: 'Stage Speak Invite', file: '/sounds/stage_speak_invite.wav' },
];

let currentAudio: HTMLAudioElement | null = null;
let currentTimeout: ReturnType<typeof setTimeout> | null = null;
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioCtxClass();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Fallback Web Audio API synthesizer for instant zero-latency tone generation
 */
function playSyntheticToneFallback(id: string): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    switch (id) {
      case 'mute':
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.15);
        break;
      case 'unmute':
      case 'undeafen':
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(540, now + 0.18);
        break;
      case 'deafen':
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.22);
        break;
      case 'disconnect':
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.35);
        break;
      case 'outgoing_call':
        osc.frequency.setValueAtTime(440, now);
        break;
      default:
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.16);
        break;
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Autoplay restrictions
  }
}

/**
 * Stops any active sound immediately.
 */
export function stopAllSounds(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = '';
    } catch {
      // Ignore
    }
    currentAudio = null;
  }
  if (currentTimeout) {
    clearTimeout(currentTimeout);
    currentTimeout = null;
  }
}

export function playSingleSound(soundId: string, onEnded?: () => void): void {
  stopAllSounds();

  const item = DISCORD_SOUND_ITEMS.find((s) => s.id === soundId);
  if (!item) {
    onEnded?.();
    return;
  }

  try {
    const audio = new Audio(item.file);
    audio.loop = false; // Strictly 1 time without loop
    currentAudio = audio;

    const cleanup = () => {
      if (currentAudio === audio) {
        currentAudio = null;
      }
      if (currentTimeout) {
        clearTimeout(currentTimeout);
        currentTimeout = null;
      }
      onEnded?.();
    };

    audio.onended = cleanup;
    audio.onerror = () => {
      playSyntheticToneFallback(soundId);
      cleanup();
    };

    // Safety timeout in case onended doesn't fire
    currentTimeout = setTimeout(cleanup, 2500);

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        playSyntheticToneFallback(soundId);
        cleanup();
      });
    }
  } catch {
    playSyntheticToneFallback(soundId);
    onEnded?.();
  }
}

/**
 * Formats sound counter:
 * 1 sound, 2 sounds, etc.
 */
export function formatSoundCount(count: number): string {
  return `${count} ${Math.abs(count) === 1 ? 'sound' : 'sounds'}`;
}

export const formatRussianSoundCount = formatSoundCount;
