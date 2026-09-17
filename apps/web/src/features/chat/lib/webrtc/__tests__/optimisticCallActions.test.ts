import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OptimisticReconciliationManager } from '../../../model/useOptimisticCallActions';

describe('OptimisticReconciliationManager', () => {
  let manager: OptimisticReconciliationManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new OptimisticReconciliationManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    manager.clear();
  });

  it('immediately applies optimistic state and settles on ACK', () => {
    let state = false;
    const onApply = vi.fn((v: boolean) => {
      state = v;
    });
    const onRollback = vi.fn();
    const dispatch = vi.fn();

    const actionId = manager.executeOptimistic({
      actionName: 'toggleMute',
      optimisticValue: true,
      currentValue: false,
      onApply,
      onRollback,
      dispatchSignaling: dispatch,
      enableAudioClick: false,
    });

    expect(state).toBe(true);
    expect(onApply).toHaveBeenCalledWith(true);
    expect(dispatch).toHaveBeenCalled();
    expect(manager.getPendingCount()).toBe(1);

    // Server sends ACK
    const ackSuccess = manager.reconcileAck(actionId);
    expect(ackSuccess).toBe(true);
    expect(manager.getPendingCount()).toBe(0);
    expect(onRollback).not.toHaveBeenCalled();
  });

  it('reverts state and invokes onRollback when ACK times out after 1500ms', () => {
    let state = 'off';
    const onApply = vi.fn((v: string) => {
      state = v;
    });
    const onRollback = vi.fn((prev: string) => {
      state = prev;
    });

    manager.executeOptimistic({
      actionName: 'raiseHand',
      optimisticValue: 'raised',
      currentValue: 'off',
      onApply,
      onRollback,
      dispatchSignaling: vi.fn(),
      timeoutMs: 1500,
      enableAudioClick: false,
    });

    expect(state).toBe('raised');

    // Advance timers by 1501ms
    vi.advanceTimersByTime(1501);

    // State reverted back to 'off'
    expect(state).toBe('off');
    expect(onRollback).toHaveBeenCalledWith('off', expect.stringContaining('Ошибка сети'));
    expect(manager.getPendingCount()).toBe(0);
  });

  it('reverts state immediately upon explicit rejection', () => {
    let state = true;
    const onRollback = vi.fn((prev: boolean) => {
      state = prev;
    });

    const actionId = manager.executeOptimistic({
      actionName: 'toggleVideo',
      optimisticValue: false,
      currentValue: true,
      onApply: (v) => {
        state = v;
      },
      onRollback,
      dispatchSignaling: vi.fn(),
      enableAudioClick: false,
    });

    expect(state).toBe(false);

    manager.reconcileReject(actionId, 'Камера занята другим приложением');
    expect(state).toBe(true);
    expect(onRollback).toHaveBeenCalledWith(true, 'Камера занята другим приложением');
  });
});
