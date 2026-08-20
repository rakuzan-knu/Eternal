import { create } from 'zustand';

export interface ClearHistoryUndoItem {
  conversationId: string;
  conversationTitle: string;
  forAll: boolean;
  remainingSeconds: number;
  rollback: () => void;
  execute: () => void;
}

interface ClearHistoryUndoState {
  activeUndo: ClearHistoryUndoItem | null;
  startUndo: (item: Omit<ClearHistoryUndoItem, 'remainingSeconds'>) => void;
  cancelUndo: () => void;
  commitUndo: () => void;
  decrementTimer: () => void;
}

let timerInterval: ReturnType<typeof setInterval> | null = null;

export const useClearHistoryUndoStore = create<ClearHistoryUndoState>((set, get) => ({
  activeUndo: null,

  startUndo: (item) => {
    // If there is already an active undo, execute it immediately before starting a new one
    const current = get().activeUndo;
    if (current) {
      if (timerInterval) clearInterval(timerInterval);
      current.execute();
    }

    set({
      activeUndo: {
        ...item,
        remainingSeconds: 5,
      },
    });

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
      get().decrementTimer();
    }, 1000);
  },

  cancelUndo: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    const current = get().activeUndo;
    if (current) {
      current.rollback();
    }
    set({ activeUndo: null });
  },

  commitUndo: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    const current = get().activeUndo;
    if (current) {
      current.execute();
    }
    set({ activeUndo: null });
  },

  decrementTimer: () => {
    const current = get().activeUndo;
    if (!current) {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      return;
    }

    if (current.remainingSeconds <= 1) {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      current.execute();
      set({ activeUndo: null });
    } else {
      set({
        activeUndo: {
          ...current,
          remainingSeconds: current.remainingSeconds - 1,
        },
      });
    }
  },
}));
