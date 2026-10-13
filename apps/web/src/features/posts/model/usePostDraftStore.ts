import { create } from 'zustand';
import { registerSessionResetHandler } from '@/shared/model/resetSession';

interface PostDraftState {
  text: string;
  revision: number;
  setText: (text: string | ((previous: string) => string)) => void;
  clearIfUnchanged: (submittedRevision: number) => void;
}

// Only the feed's unsent text survives route changes within this session.
// Files, polls and other composers retain their existing local lifetimes.
export const usePostDraftStore = create<PostDraftState>((set) => ({
  text: '',
  revision: 0,
  setText: (text) =>
    set((state) => ({
      text: typeof text === 'function' ? text(state.text) : text,
      revision: state.revision + 1,
    })),
  clearIfUnchanged: (submittedRevision) =>
    set((state) =>
      state.revision === submittedRevision ? { text: '', revision: state.revision + 1 } : state,
    ),
}));

registerSessionResetHandler(() => {
  usePostDraftStore.setState((state) => ({ text: '', revision: state.revision + 1 }));
});
