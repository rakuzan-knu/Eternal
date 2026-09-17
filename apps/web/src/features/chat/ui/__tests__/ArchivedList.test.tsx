import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ArchivedList from '../ArchivedList';
import { ConversationView, ParticipantView } from '@/entities/chat/model/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../model/useConversationMutations', () => ({
  useArchiveConversation: () => ({
    mutate: vi.fn(),
  }),
}));

describe('ArchivedList', () => {
  const mockConversations = [
    {
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
        } as unknown as ParticipantView,
        {
          userId: 'u2',
          role: 'MEMBER' as const,
          joinedAt: '2026-01-01',
          user: { id: 'u2', username: 'partner', displayName: 'Partner', avatar: null },
        } as unknown as ParticipantView,
      ],
    } as unknown as ConversationView,
  ];

  it('renders list of archived conversations and selects a conversation', () => {
    const onSelect = vi.fn();
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ArchivedList
          conversations={mockConversations}
          currentUserId="u1"
          activeId={null}
          onSelect={onSelect}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Partner')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Partner'));
    expect(onSelect).toHaveBeenCalledWith('c1');

    // Unarchive button click
    const unarchiveBtn = screen.getByTitle('Unarchive chat');
    fireEvent.click(unarchiveBtn);
  });

  it('renders group conversation and empty state', () => {
    const queryClient = new QueryClient();
    const groupConv = {
      id: 'c2',
      type: 'GROUP' as const,
      name: 'Group 1',
      isArchived: true,
      updatedAt: '2026-01-01',
      unreadCount: 0,
      participants: [
        {
          userId: 'u1',
          user: { id: 'u1', username: 'u1', displayName: 'User 1', avatar: null },
        },
        {
          userId: 'u2',
          user: { id: 'u2', username: 'u2', displayName: 'User 2', avatar: null },
        },
      ],
    } as unknown as ConversationView;

    render(
      <QueryClientProvider client={queryClient}>
        <ArchivedList
          conversations={[groupConv]}
          currentUserId="u1"
          activeId="c2"
          onSelect={vi.fn()}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Group 1')).toBeInTheDocument();

    // Empty state
    render(
      <QueryClientProvider client={queryClient}>
        <ArchivedList conversations={[]} currentUserId="u1" activeId={null} onSelect={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.getByText('No archived chats')).toBeInTheDocument();
  });
});
