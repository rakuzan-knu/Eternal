import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useClearHistoryUndoStore } from '../useClearHistoryUndoStore';

describe('useClearHistoryUndoStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useClearHistoryUndoStore.setState({ activeUndo: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts undo countdown and auto-executes when timer expires', () => {
    const execute = vi.fn();
    const rollback = vi.fn();

    useClearHistoryUndoStore.getState().startUndo({
      conversationId: 'c1',
      conversationTitle: 'Chat 1',
      forAll: false,
      execute,
      rollback,
    });

    expect(useClearHistoryUndoStore.getState().activeUndo?.remainingSeconds).toBe(5);

    // Advance 2 seconds
    vi.advanceTimersByTime(2000);
    expect(useClearHistoryUndoStore.getState().activeUndo?.remainingSeconds).toBe(3);

    // Advance remaining seconds
    vi.advanceTimersByTime(3000);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(rollback).not.toHaveBeenCalled();
    expect(useClearHistoryUndoStore.getState().activeUndo).toBeNull();
  });

  it('cancels undo and triggers rollback callback', () => {
    const execute = vi.fn();
    const rollback = vi.fn();

    useClearHistoryUndoStore.getState().startUndo({
      conversationId: 'c2',
      conversationTitle: 'Chat 2',
      forAll: true,
      execute,
      rollback,
    });

    useClearHistoryUndoStore.getState().cancelUndo();

    expect(rollback).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
    expect(useClearHistoryUndoStore.getState().activeUndo).toBeNull();
  });

  it('commits undo immediately and executes callback', () => {
    const execute = vi.fn();
    const rollback = vi.fn();

    useClearHistoryUndoStore.getState().startUndo({
      conversationId: 'c3',
      conversationTitle: 'Chat 3',
      forAll: true,
      execute,
      rollback,
    });

    useClearHistoryUndoStore.getState().commitUndo();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(rollback).not.toHaveBeenCalled();
    expect(useClearHistoryUndoStore.getState().activeUndo).toBeNull();
  });

  it('executes active undo if a new undo is started before the previous one finishes', () => {
    const execute1 = vi.fn();
    const rollback1 = vi.fn();
    const execute2 = vi.fn();
    const rollback2 = vi.fn();

    useClearHistoryUndoStore.getState().startUndo({
      conversationId: 'c1',
      conversationTitle: 'Chat 1',
      forAll: false,
      execute: execute1,
      rollback: rollback1,
    });

    useClearHistoryUndoStore.getState().startUndo({
      conversationId: 'c2',
      conversationTitle: 'Chat 2',
      forAll: false,
      execute: execute2,
      rollback: rollback2,
    });

    expect(execute1).toHaveBeenCalledTimes(1);
    expect(useClearHistoryUndoStore.getState().activeUndo?.conversationId).toBe('c2');
  });

  it('safely handles decrementTimer when no active undo exists', () => {
    useClearHistoryUndoStore.getState().decrementTimer();
    expect(useClearHistoryUndoStore.getState().activeUndo).toBeNull();
  });
});
