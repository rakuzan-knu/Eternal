import { create } from 'zustand';

export interface ActiveMediaPlaybackState {
  activeMediaId: string | null;
  isPlaying: boolean;
  playMedia: (id: string) => void;
  pauseMedia: (id?: string) => void;
  stopAll: () => void;
}

export const useActiveMediaPlaybackStore = create<ActiveMediaPlaybackState>((set) => ({
  activeMediaId: null,
  isPlaying: false,
  playMedia: (id: string) => set({ activeMediaId: id, isPlaying: true }),
  pauseMedia: (id?: string) =>
    set((state) => {
      if (!id || state.activeMediaId === id) {
        return { isPlaying: false };
      }
      return {};
    }),
  stopAll: () => set({ activeMediaId: null, isPlaying: false }),
}));
