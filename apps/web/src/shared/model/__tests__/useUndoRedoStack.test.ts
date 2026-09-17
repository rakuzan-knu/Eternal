import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoRedoStack } from '../useUndoRedoStack';

describe('useUndoRedoStack', () => {
  it('handles commit, undo, and redo transitions correctly', () => {
    const { result } = renderHook(() => useUndoRedoStack<string>());

    expect(result.current.current).toBeNull();
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.commit('State 1');
    });
    expect(result.current.current).toBe('State 1');
    expect(result.current.canUndo).toBe(false);

    act(() => {
      result.current.commit('State 2');
    });
    expect(result.current.current).toBe('State 2');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.undo();
    });
    expect(result.current.current).toBe('State 1');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });
    expect(result.current.current).toBe('State 2');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('clears redo stack on new commit', () => {
    const { result } = renderHook(() => useUndoRedoStack<number>());

    act(() => {
      result.current.commit(1);
    });
    act(() => {
      result.current.commit(2);
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.commit(3);
    });
    expect(result.current.current).toBe(3);
    expect(result.current.canRedo).toBe(false);
  });

  it('handles keyboard shortcuts: Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y', () => {
    const { result } = renderHook(() => useUndoRedoStack<string>());

    act(() => {
      result.current.commit('A');
      result.current.commit('B');
    });

    // Press Ctrl+Z
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }),
      );
    });
    expect(result.current.current).toBe('A');

    // Press Ctrl+Shift+Z
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true }),
      );
    });
    expect(result.current.current).toBe('B');

    // Undo again
    act(() => {
      result.current.undo();
    });
    expect(result.current.current).toBe('A');

    // Press Ctrl+Y
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true }),
      );
    });
    expect(result.current.current).toBe('B');

    // Non-modifier key should do nothing
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: false, bubbles: true }),
      );
    });
    expect(result.current.current).toBe('B');
  });

  it('handles undo/redo when stacks are empty', () => {
    const { result } = renderHook(() => useUndoRedoStack<string>());
    act(() => {
      result.current.undo();
      result.current.redo();
    });
    expect(result.current.current).toBeNull();
  });
});
