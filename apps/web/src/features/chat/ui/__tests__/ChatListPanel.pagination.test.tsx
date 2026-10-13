import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ChatListPanel from '../ChatListPanel';

const { fetchNextPage } = vi.hoisted(() => ({ fetchNextPage: vi.fn() }));
vi.mock('../../model/useConversations', () => ({
  useConversations: () => ({
    data: [
      {
        id: 'first',
        type: 'GROUP',
        name: 'First',
        participants: [],
        unreadCount: 0,
        isArchived: false,
      },
    ],
    isLoading: false,
    isError: false,
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage,
  }),
}));
vi.mock('../../lib/e2ee/x3dhRatchet', () => ({
  initializeAndPublishPrekeys: vi.fn().mockResolvedValue(undefined),
}));

describe('chat keyboard paging', () => {
  it('loads and selects the next dialog beyond the current page boundary', async () => {
    fetchNextPage.mockResolvedValue({
      data: { pages: [{ data: [{ id: 'first' }] }, { data: [{ id: 'older' }] }] },
    });
    const onSelectConversation = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ChatListPanel onSelectConversation={onSelectConversation} activeConversationId="first" />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.keyDown(window, { key: 'ArrowDown', altKey: true });
    await waitFor(() => expect(onSelectConversation).toHaveBeenCalledWith('older'));
  });
});
