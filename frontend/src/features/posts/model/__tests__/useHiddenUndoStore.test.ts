import { describe, it, expect, beforeEach } from 'vitest';
import { useHiddenUndoStore } from '../useHiddenUndoStore';

describe('useHiddenUndoStore', () => {
  beforeEach(() => {
    useHiddenUndoStore.setState({ activeUndo: null });
  });

  it('shows undo with 5 seconds and decrements timer to null', () => {
    useHiddenUndoStore.getState().showUndo('post-123');
    expect(useHiddenUndoStore.getState().activeUndo).toEqual({
      postId: 'post-123',
      remainingSeconds: 5,
    });

    useHiddenUndoStore.getState().decrementTimer();
    expect(useHiddenUndoStore.getState().activeUndo?.remainingSeconds).toBe(4);

    useHiddenUndoStore.setState({ activeUndo: { postId: 'post-123', remainingSeconds: 1 } });
    useHiddenUndoStore.getState().decrementTimer();
    expect(useHiddenUndoStore.getState().activeUndo).toBeNull();
  });

  it('clears undo on clearUndo', () => {
    useHiddenUndoStore.getState().showUndo('post-123');
    useHiddenUndoStore.getState().clearUndo();
    expect(useHiddenUndoStore.getState().activeUndo).toBeNull();
  });
});
