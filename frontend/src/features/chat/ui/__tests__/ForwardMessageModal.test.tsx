import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ForwardMessageModal from '../ForwardMessageModal';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../model/useConversations', () => ({
  useConversations: () => ({
    data: [
      {
        id: 'c1',
        type: 'DIRECT',
        isArchived: false,
        unreadCount: 0,
        participants: [
          {
            userId: 'u1',
            role: 'MEMBER',
            joinedAt: '2026-01-01',
            user: { id: 'u1', username: 'me', displayName: 'Me', avatar: null },
          },
          {
            userId: 'u2',
            role: 'MEMBER',
            joinedAt: '2026-01-01',
            user: { id: 'u2', username: 'bob', displayName: 'Bob', avatar: null },
          },
        ],
      },
    ],
  }),
}));

vi.mock('@/features/chat/model/useConversations', () => ({
  useConversations: () => ({
    data: [
      {
        id: 'c1',
        type: 'DIRECT',
        isArchived: false,
        unreadCount: 0,
        participants: [
          {
            userId: 'u1',
            role: 'MEMBER',
            joinedAt: '2026-01-01',
            user: { id: 'u1', username: 'me', displayName: 'Me', avatar: null },
          },
          {
            userId: 'u2',
            role: 'MEMBER',
            joinedAt: '2026-01-01',
            user: { id: 'u2', username: 'bob', displayName: 'Bob', avatar: null },
          },
        ],
      },
    ],
  }),
}));

describe('ForwardMessageModal', () => {
  it('selects conversation and forwards message', () => {
    useAuthStore.setState({ userId: 'u1' });
    const onClose = vi.fn();
    const onForward = vi.fn();
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ForwardMessageModal onClose={onClose} onForward={onForward} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Forward message')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Bob'));

    const forwardBtn = screen.getByRole('button', { name: /forward \(1\)/i });
    fireEvent.click(forwardBtn);

    expect(onForward).toHaveBeenCalledWith(['c1'], false);
  });
});
