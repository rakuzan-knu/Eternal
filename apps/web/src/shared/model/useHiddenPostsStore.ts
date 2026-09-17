import { create } from 'zustand';

interface HiddenPostsState {
  hiddenIds: Set<string | number>;
  hidePost: (id: string | number) => void;
  unhidePost: (id: string | number) => void;
}

export const useHiddenPostsStore = create<HiddenPostsState>((set) => ({
  hiddenIds: new Set(),
  hidePost: (id) =>
    set((state) => {
      const next = new Set(state.hiddenIds);
      next.add(id);
      return { hiddenIds: next };
    }),
  unhidePost: (id) =>
    set((state) => {
      const next = new Set(state.hiddenIds);
      next.delete(id);
      return { hiddenIds: next };
    }),
}));
