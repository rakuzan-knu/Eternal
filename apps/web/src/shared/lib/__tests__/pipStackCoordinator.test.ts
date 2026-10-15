import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePiPStackStore, usePiPStackOffset } from '../pipStackCoordinator';

describe('pipStackCoordinator', () => {
  beforeEach(() => {
    usePiPStackStore.setState({ activeOrder: [] });
  });

  it('registers and unregisters widgets in active order without duplicates', () => {
    act(() => {
      usePiPStackStore.getState().registerDefault('call');
    });
    expect(usePiPStackStore.getState().activeOrder).toEqual(['call']);

    // Duplicate registration should be ignored
    act(() => {
      usePiPStackStore.getState().registerDefault('call');
    });
    expect(usePiPStackStore.getState().activeOrder).toEqual(['call']);

    // Add player
    act(() => {
      usePiPStackStore.getState().registerDefault('player');
    });
    expect(usePiPStackStore.getState().activeOrder).toEqual(['call', 'player']);

    // Unregister call
    act(() => {
      usePiPStackStore.getState().unregisterDefault('call');
    });
    expect(usePiPStackStore.getState().activeOrder).toEqual(['player']);
  });

  it('determines stacking: first widget is at bottom, second widget is stacked above', () => {
    // 1. Call is active at default
    const { result: callHook, rerender: rerenderCall } = renderHook(
      ({ atDefault }) => usePiPStackOffset('call', atDefault),
      { initialProps: { atDefault: true } },
    );
    expect(callHook.current).toBe(false); // First at bottom

    // 2. Player becomes active at default while Call is already active
    const { result: playerHook, rerender: rerenderPlayer } = renderHook(
      ({ atDefault }) => usePiPStackOffset('player', atDefault),
      { initialProps: { atDefault: true } },
    );
    expect(callHook.current).toBe(false); // Call remains at bottom
    expect(playerHook.current).toBe(true); // Player stacks above call

    // 3. Call ends or gets dragged away (atDefault: false)
    act(() => {
      rerenderCall({ atDefault: false });
    });
    expect(callHook.current).toBe(false);
    expect(playerHook.current).toBe(false); // Player smoothly drops down to bottom!
  });

  it('handles reverse order: player active first, call appears second and stacks above', () => {
    // 1. Player is active first
    const { result: playerHook, rerender: rerenderPlayer } = renderHook(
      ({ atDefault }) => usePiPStackOffset('player', atDefault),
      { initialProps: { atDefault: true } },
    );
    expect(playerHook.current).toBe(false); // Player is at bottom

    // 2. Call becomes active
    const { result: callHook } = renderHook(
      ({ atDefault }) => usePiPStackOffset('call', atDefault),
      { initialProps: { atDefault: true } },
    );
    expect(playerHook.current).toBe(false); // Player remains at bottom
    expect(callHook.current).toBe(true); // Call stacks above player!

    // 3. Player closes
    act(() => {
      rerenderPlayer({ atDefault: false });
    });
    expect(playerHook.current).toBe(false);
    expect(callHook.current).toBe(false); // Call drops down to bottom!
  });
});
