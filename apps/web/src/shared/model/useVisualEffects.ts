import { create } from 'zustand';

const key = 'eternal-visual-effects';
const motionKey = 'eternal-motion';
export type MotionPreference = 'system' | 'full' | 'reduced';
function readMotion(): MotionPreference {
  try {
    const value = localStorage.getItem(motionKey);
    return value === 'full' || value === 'reduced' ? value : 'system';
  } catch {
    return 'system';
  }
}
function readPreference(): boolean {
  try {
    return localStorage.getItem(key) === 'reduced';
  } catch {
    return false;
  }
}

interface VisualEffectsState {
  motion: MotionPreference;
  setMotion: (value: MotionPreference) => void;
  simplified: boolean;
  setSimplified: (value: boolean) => void;
}

export const useVisualEffects = create<VisualEffectsState>((set) => ({
  motion: readMotion(),
  setMotion: (motion) => {
    try {
      localStorage.setItem(motionKey, motion);
    } catch {
      /* Session still works. */
    }
    set({ motion });
  },
  simplified: readPreference(),
  setSimplified: (simplified) => {
    try {
      localStorage.setItem(key, simplified ? 'reduced' : 'full');
    } catch {
      /* Session still works. */
    }
    set({ simplified });
  },
}));

/** Install once at startup; retain the user's preference across tabs. */
export function initializeVisualEffects() {
  const apply = () => {
    document.documentElement.dataset.motion = useVisualEffects.getState().motion;
    document.documentElement.dataset.visualEffects = useVisualEffects.getState().simplified
      ? 'reduced'
      : 'full';
  };
  apply();
  const unsubscribe = useVisualEffects.subscribe(apply);
  const sync = (event: StorageEvent) => {
    if (event.key === key || event.key === null)
      useVisualEffects.setState({ simplified: readPreference() });
    if (event.key === motionKey || event.key === null)
      useVisualEffects.setState({ motion: readMotion() });
  };
  window.addEventListener('storage', sync);
  return () => {
    unsubscribe();
    window.removeEventListener('storage', sync);
  };
}

/** Resolve explicit interface motion before consulting the device setting. */
export function shouldReduceMotion(): boolean {
  const { motion } = useVisualEffects.getState();
  if (motion !== 'system') return motion === 'reduced';
  return (
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  );
}
