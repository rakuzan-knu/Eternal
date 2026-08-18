import { create } from 'zustand';

interface HiddenUndoItem {
  postId: string | number;
  remainingSeconds: number;
}

interface HiddenUndoState {
  activeUndo: HiddenUndoItem | null;
  showUndo: (postId: string | number) => void;
  clearUndo: () => void;
  decrementTimer: () => void;
}

export const useHiddenUndoStore = create<HiddenUndoState>((set, get) => ({
  activeUndo: null,
  showUndo: (postId) => set({ activeUndo: { postId, remainingSeconds: 5 } }),
  clearUndo: () => set({ activeUndo: null }),
  decrementTimer: () => {
    const current = get().activeUndo;
    if (!current) return;
    if (current.remainingSeconds <= 1) {
      set({ activeUndo: null });
    } else {
      set({ activeUndo: { ...current, remainingSeconds: current.remainingSeconds - 1 } });
    }
  },
}));
