import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalConversationOverrides } from '../useLocalConversationOverrides';

describe('useLocalConversationOverrides', () => {
  it('toggles pin, respects max limit (5) and fires onLimitReached callback', () => {
    const { result } = renderHook(() => useLocalConversationOverrides());
    const onLimitReached = vi.fn();

    // Pin 5 items
    for (let i = 1; i <= 5; i++) {
      act(() => {
        result.current.togglePinLocally(`conv-${i}`, onLimitReached);
      });
    }
    expect(result.current.pinnedLocally.size).toBe(5);
    expect(onLimitReached).not.toHaveBeenCalled();

    // Try pinning 6th item
    act(() => {
      result.current.togglePinLocally('conv-6', onLimitReached);
    });
    expect(result.current.pinnedLocally.size).toBe(5);
    expect(result.current.pinnedLocally.has('conv-6')).toBe(false);
    expect(onLimitReached).toHaveBeenCalledTimes(1);

    // Unpin 1st item
    act(() => {
      result.current.togglePinLocally('conv-1', onLimitReached);
    });
    expect(result.current.pinnedLocally.size).toBe(4);
  });

  it('toggles forced unread locally on and off, and marks conversations read', () => {
    const { result } = renderHook(() => useLocalConversationOverrides());

    // Toggle on
    act(() => {
      result.current.toggleUnreadLocally('conv-1');
    });
    expect(result.current.forcedUnreadLocally.has('conv-1')).toBe(true);

    // Toggle off
    act(() => {
      result.current.toggleUnreadLocally('conv-1');
    });
    expect(result.current.forcedUnreadLocally.has('conv-1')).toBe(false);

    // Mark read
    act(() => {
      result.current.toggleUnreadLocally('conv-2');
      result.current.markConversationsRead(['conv-2']);
    });
    expect(result.current.forcedUnreadLocally.has('conv-2')).toBe(false);
    expect(result.current.locallyReadConversations.has('conv-2')).toBe(true);
  });

  it('safely guards within batched state update when multiple pins are queued synchronously', () => {
    const { result } = renderHook(() => useLocalConversationOverrides());

    // Call 6 toggle pins in the same act tick before state re-renders
    act(() => {
      result.current.togglePinLocally('conv-1');
      result.current.togglePinLocally('conv-2');
      result.current.togglePinLocally('conv-3');
      result.current.togglePinLocally('conv-4');
      result.current.togglePinLocally('conv-5');
      result.current.togglePinLocally('conv-6');
    });

    expect(result.current.pinnedLocally.size).toBe(5);
    expect(result.current.pinnedLocally.has('conv-6')).toBe(false);
  });
});
