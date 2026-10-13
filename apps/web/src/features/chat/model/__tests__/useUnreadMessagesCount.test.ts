import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUnreadMessagesCount } from '../useUnreadMessagesCount';
import * as convHookModule from '../useConversations';
import { queryKeys } from '@/shared/api/queryKeys';

vi.mock('../useMessengerRealtime', () => ({
  useMessengerRealtime: vi.fn(),
}));

function createWrapper(count?: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (count !== undefined) client.setQueryData(queryKeys.conversations.unreadCount, { count });
  return Object.assign(
    ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children),
    { client },
  );
}

describe('useUnreadMessagesCount', () => {
  it('subtracts only the active non-archived conversation from the authoritative count', async () => {
    vi.spyOn(convHookModule, 'useConversations').mockReturnValue({
      data: [
        { id: 'c1', unreadCount: 3, isArchived: false } as any,
        { id: 'c2', unreadCount: 5, isArchived: false } as any,
        { id: 'c3', unreadCount: 2, isArchived: true } as any, // Archived should be excluded
        { id: 'c4', unreadCount: null, isArchived: false } as any,
      ],
    } as any);

    const { result } = renderHook(
      () => useUnreadMessagesCount('c1', { showPushNotifications: true }),
      { wrapper: createWrapper(8) },
    );
    // Total of c2 (5) only = 5
    await waitFor(() => expect(result.current).toBe(5));
  });

  it('keeps unread messages outside the loaded conversation page in the badge', async () => {
    vi.spyOn(convHookModule, 'useConversations').mockReturnValue({
      data: [{ id: 'c1', unreadCount: 3, isArchived: false }],
      hasNextPage: true,
    } as any);
    const wrapper = createWrapper(1013);
    const { result } = renderHook(() => useUnreadMessagesCount('c1'), { wrapper });
    expect(wrapper.client.getQueryData(queryKeys.conversations.unreadCount)).toEqual({
      count: 1013,
    });
    await waitFor(() => expect(result.current).toBe(1010));
  });

  it('keeps the authoritative count when no metadata page is loaded', async () => {
    vi.spyOn(convHookModule, 'useConversations').mockReturnValue({ data: undefined } as any);
    const { result } = renderHook(() => useUnreadMessagesCount(null), {
      wrapper: createWrapper(23),
    });
    await waitFor(() => expect(result.current).toBe(23));
  });

  it('returns 0 when conversations data is undefined', () => {
    vi.spyOn(convHookModule, 'useConversations').mockReturnValue({
      data: undefined,
    } as any);

    const { result } = renderHook(() => useUnreadMessagesCount(null), { wrapper: createWrapper() });
    expect(result.current).toBe(0);
  });
});
