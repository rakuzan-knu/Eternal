import { useNotificationSettingsStore } from '@/shared/model/useNotificationSettingsStore';

const MESSAGE_NOTIFICATION_SOUND_SRC = '/sounds/message-received.wav';

let audio: HTMLAudioElement | null = null;
let isInitialized = false;
let isUnlocked = false;

function getAudio() {
  if (typeof window === 'undefined') return null;
  if (!audio) {
    audio = new Audio(MESSAGE_NOTIFICATION_SOUND_SRC);
    audio.preload = 'auto';
    audio.volume = 1;
  }
  return audio;
}

async function unlockAudio() {
  const sound = getAudio();
  if (!sound || isUnlocked) return;

  try {
    const previousVolume = sound.volume;
    sound.volume = 0;
    await sound.play();
    sound.pause();
    sound.currentTime = 0;
    sound.volume = previousVolume;
    isUnlocked = true;
  } catch {
    // Browsers may still block autoplay until a stronger user gesture occurs.
  }
}

export function initializeMessageNotificationSound() {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;
  getAudio();

  const unlock = () => {
    void unlockAudio();
  };

  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock, { passive: true });
}

export function playMessageNotificationSound(customVolume?: number) {
  const sound = getAudio();
  if (!sound) return;

  const { allowSound, volume: storeVolume } = useNotificationSettingsStore.getState();
  if (!allowSound && customVolume === undefined) return;

  const targetVolPercent = customVolume !== undefined ? customVolume : storeVolume;
  const targetVolume = Math.max(0, Math.min(1, targetVolPercent / 100));

  if (targetVolume === 0) return;

  sound.volume = targetVolume;
  sound.currentTime = 0;
  void sound.play().catch(() => {
    void unlockAudio();
  });
}

export function playPreviewNotificationSound(volumePercent: number) {
  playMessageNotificationSound(volumePercent);
}
