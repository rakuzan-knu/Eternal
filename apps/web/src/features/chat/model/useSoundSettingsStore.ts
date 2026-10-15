import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DISCORD_SOUND_ITEMS, playSingleSound } from '../lib/soundEffectsEngine';

export interface SoundSettingsState {
  soundToggles: Record<string, boolean>;
  isSoundListExpanded: boolean;
  setSoundToggle: (soundId: string, enabled: boolean) => void;
  toggleSound: (soundId: string) => void;
  isSoundEnabled: (soundId: string) => boolean;
  setIsSoundListExpanded: (expanded: boolean) => void;
  toggleSoundListExpanded: () => void;
  setAllSounds: (enabled: boolean) => void;
}

const defaultToggles: Record<string, boolean> = {};
DISCORD_SOUND_ITEMS.forEach((item) => {
  defaultToggles[item.id] = true;
});

export const useSoundSettingsStore = create<SoundSettingsState>()(
  persist(
    (set, get) => ({
      soundToggles: defaultToggles,
      isSoundListExpanded: false,

      setSoundToggle: (soundId: string, enabled: boolean) => {
        set((state) => ({
          soundToggles: {
            ...state.soundToggles,
            [soundId]: enabled,
          },
        }));
      },

      toggleSound: (soundId: string) => {
        const current = get().soundToggles[soundId] ?? true;
        get().setSoundToggle(soundId, !current);
      },

      isSoundEnabled: (soundId: string) => {
        return get().soundToggles[soundId] ?? true;
      },

      setIsSoundListExpanded: (expanded: boolean) => {
        set({ isSoundListExpanded: expanded });
      },

      toggleSoundListExpanded: () => {
        set((state) => ({ isSoundListExpanded: !state.isSoundListExpanded }));
      },

      setAllSounds: (enabled: boolean) => {
        const updated: Record<string, boolean> = {};
        DISCORD_SOUND_ITEMS.forEach((item) => {
          updated[item.id] = enabled;
        });
        set({ soundToggles: updated });
      },
    }),
    {
      name: 'voice_sound_settings_store',
      partialize: (state) => ({
        soundToggles: state.soundToggles,
        isSoundListExpanded: state.isSoundListExpanded,
      }),
    },
  ),
);

/**
 * Plays an action sound effect if it is enabled in settings.
 */
export function playActionSound(soundId: string): void {
  const isEnabled = useSoundSettingsStore.getState().isSoundEnabled(soundId);
  if (isEnabled) {
    playSingleSound(soundId);
  }
}
