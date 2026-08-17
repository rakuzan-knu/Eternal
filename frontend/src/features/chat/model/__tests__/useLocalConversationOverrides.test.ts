import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalConversationOverrides } from '../useLocalConversationOverrides';

describe('useLocalConversationOverrides', () => {
  it('toggles pin and forced unread locally', () => {
    const { result } = renderHook(() => useLocalConversationOverrides());

    expect(result.current.pinnedLocally.has('conv-1')).toBe(false);

    act(() => {
      result.current.togglePinLocally('conv-1');
    });
    expect(result.current.pinnedLocally.has('conv-1')).toBe(true);

    act(() => {
      result.current.togglePinLocally('conv-1');
    });
    expect(result.current.pinnedLocally.has('conv-1')).toBe(false);

    act(() => {
      result.current.toggleUnreadLocally('conv-1');
    });
    expect(result.current.forcedUnreadLocally.has('conv-1')).toBe(true);

    act(() => {
      result.current.markConversationsRead(['conv-1']);
    });
    expect(result.current.forcedUnreadLocally.has('conv-1')).toBe(false);
    expect(result.current.locallyReadConversations.has('conv-1')).toBe(true);
  });
});
