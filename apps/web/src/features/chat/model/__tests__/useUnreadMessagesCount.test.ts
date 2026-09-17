import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUnreadMessagesCount } from '../useUnreadMessagesCount';
import * as convHookModule from '../useConversations';

vi.mock('../useMessengerRealtime', () => ({
  useMessengerRealtime: vi.fn(),
}));

describe('useUnreadMessagesCount', () => {
  it('sums unread count excluding active and archived conversations', () => {
    vi.spyOn(convHookModule, 'useConversations').mockReturnValue({
      data: [
        { id: 'c1', unreadCount: 3, isArchived: false } as any,
        { id: 'c2', unreadCount: 5, isArchived: false } as any,
        { id: 'c3', unreadCount: 2, isArchived: true } as any, // Archived should be excluded
        { id: 'c4', unreadCount: null, isArchived: false } as any,
      ],
    } as any);

    const { result } = renderHook(() =>
      useUnreadMessagesCount('c1', { showPushNotifications: true }),
    );
    // Total of c2 (5) only = 5
    expect(result.current).toBe(5);
  });

  it('returns 0 when conversations data is undefined', () => {
    vi.spyOn(convHookModule, 'useConversations').mockReturnValue({
      data: undefined,
    } as any);

    const { result } = renderHook(() => useUnreadMessagesCount(null));
    expect(result.current).toBe(0);
  });
});
