import { create } from 'zustand';

interface HiddenPostsState {
  hiddenIds: Set<string | number>;
  hidePost: (id: string | number) => void;
}

export const useHiddenPostsStore = create<HiddenPostsState>((set) => ({
  hiddenIds: new Set(),
  hidePost: (id) => set((state) => ({ hiddenIds: new Set(state.hiddenIds).add(id) })),
}));
