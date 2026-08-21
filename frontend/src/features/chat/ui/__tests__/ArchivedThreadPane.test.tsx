import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ArchivedThreadPane from '../ArchivedThreadPane';
import { ConversationView } from '@/entities/chat/model/types';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../model/useMessages', () => ({
  useMessages: () => ({
    messages: [],
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock('../../model/useMessageActions', () => ({
  useMessageActions: () => ({
    deleteMessage: vi.fn(),
    pinMessage: vi.fn(),
    unpinMessage: vi.fn(),
    editMessage: vi.fn(),
    addReaction: vi.fn(),
    removeReaction: vi.fn(),
  }),
}));

const mockArchiveMutate = vi.fn();
vi.mock('../../model/useConversationMutations', () => ({
  useArchiveConversation: () => ({
    mutate: mockArchiveMutate,
  }),
}));

describe('ArchivedThreadPane', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: 'u1', isAuthenticated: true });
    vi.clearAllMocks();
  });

  const mockConversation = {
    id: 'c1',
    type: 'DIRECT' as const,
    isArchived: true,
    updatedAt: '2026-01-01',
    unreadCount: 0,
    participants: [
      {
        userId: 'u1',
        role: 'MEMBER' as const,
        joinedAt: '2026-01-01',
        user: { id: 'u1', username: 'me', displayName: 'Me', avatar: null },
      },
      {
        userId: 'u2',
        role: 'MEMBER' as const,
        joinedAt: '2026-01-01',
        user: { id: 'u2', username: 'alice', displayName: 'Alice', avatar: null },
      },
    ],
  } as unknown as ConversationView;

  it('renders archived header and triggers unarchive', () => {
    const onUnarchive = vi.fn();
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ArchivedThreadPane conversation={mockConversation} onUnarchived={onUnarchive} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Secured archived chat')).toBeInTheDocument();

    const unarchiveBtn = screen.getByRole('button', { name: /unarchive/i });
    fireEvent.click(unarchiveBtn);

    expect(mockArchiveMutate).toHaveBeenCalledWith({ conversationId: 'c1', archived: false });
    expect(onUnarchive).toHaveBeenCalled();
  });
});
