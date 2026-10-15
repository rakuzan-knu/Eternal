import { create } from 'zustand';

const key = 'eternal-visual-effects';
function readPreference(): boolean {
  try {
    return localStorage.getItem(key) === 'reduced';
  } catch {
    return false;
  }
}

interface VisualEffectsState {
  simplified: boolean;
  setSimplified: (value: boolean) => void;
}

export const useVisualEffects = create<VisualEffectsState>((set) => ({
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
    document.documentElement.dataset.visualEffects = useVisualEffects.getState().simplified
      ? 'reduced'
      : 'full';
  };
  apply();
  const unsubscribe = useVisualEffects.subscribe(apply);
  const sync = (event: StorageEvent) => {
    if (event.key === key || event.key === null)
      useVisualEffects.setState({ simplified: readPreference() });
  };
  window.addEventListener('storage', sync);
  return () => {
    unsubscribe();
    window.removeEventListener('storage', sync);
  };
}
