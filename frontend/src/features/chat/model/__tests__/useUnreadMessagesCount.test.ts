import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUnreadMessagesCount } from '../useUnreadMessagesCount';

vi.mock('../useConversations', () => ({
  useConversations: () => ({
    data: [
      { id: 'c1', unreadCount: 3 },
      { id: 'c2', unreadCount: 5 },
      { id: 'c3', unreadCount: 2 },
    ],
  }),
}));

vi.mock('../useMessengerRealtime', () => ({
  useMessengerRealtime: vi.fn(),
}));

describe('useUnreadMessagesCount', () => {
  it('sums unread count excluding the currently active conversation', () => {
    const { result } = renderHook(() => useUnreadMessagesCount('c1'));
    // Total of c2 (5) + c3 (2) = 7
    expect(result.current).toBe(7);
  });
});
