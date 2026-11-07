import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ChatListPanel from '../ChatListPanel';

const { fetchNextPage, paging } = vi.hoisted(() => ({
  fetchNextPage: vi.fn(),
  paging: { inFlight: false },
}));
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
    isFetchingNextPage: paging.inFlight,
    fetchNextPage,
  }),
}));
vi.mock('../../lib/e2ee/x3dhRatchet', () => ({
  initializeAndPublishPrekeys: vi.fn().mockResolvedValue(undefined),
}));

describe('chat keyboard paging', () => {
  beforeEach(() => {
    paging.inFlight = false;
    fetchNextPage.mockReset();
  });

  it('selects the next dialog when the boundary page is already loading', async () => {
    paging.inFlight = true;
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
    expect(fetchNextPage).toHaveBeenCalledWith({ cancelRefetch: false });
  });

  it('navigates back to the previous dialog with Alt+ArrowUp without index drift', async () => {
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

    fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true });
    await waitFor(() => expect(onSelectConversation).toHaveBeenCalledWith('first'));
  });
});
