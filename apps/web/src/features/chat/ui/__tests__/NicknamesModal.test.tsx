import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NicknamesModal from '../NicknamesModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ConversationView } from '@/entities/chat/model/types';
import { chatApi } from '../../api/chatApi';
import React from 'react';

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    setNickname: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('NicknamesModal', () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const mockConv = {
    id: 'conv-1',
    type: 'DIRECT',
    name: null,
    avatar: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadCount: 0,
    myMuteLevel: 'NONE',
    isPinned: false,
    participants: [
      {
        userId: 'usr-1',
        role: 'MEMBER',
        mutedUntil: null,
        joinedAt: new Date().toISOString(),
        nickname: null,
        theme: 'DEFAULT',
        muteLevel: 'NONE',
        user: {
          id: 'usr-1',
          username: 'alice',
          displayName: 'Alice Smith',
          avatar: null,
        },
      },
    ],
  } as unknown as ConversationView;

  it('renders nicknames modal, edits nickname, confirms with check button and cancels with Escape', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NicknamesModal conversation={mockConv} onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Nicknames')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();

    // Start editing
    const editBtn = document.querySelectorAll('button')[1];
    fireEvent.click(editBtn);

    const input = screen.getByPlaceholderText('Alice Smith');
    fireEvent.change(input, { target: { value: 'Ally' } });

    // Cancel with escape
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByPlaceholderText('Alice Smith')).not.toBeInTheDocument();

    // Start editing again and confirm
    fireEvent.click(document.querySelectorAll('button')[1]);
    const input2 = screen.getByPlaceholderText('Alice Smith');
    fireEvent.change(input2, { target: { value: 'Ally' } });
    fireEvent.keyDown(input2, { key: 'Enter' });

    await waitFor(() => {
      expect(chatApi.setNickname).toHaveBeenCalledWith('conv-1', 'usr-1', 'Ally');
    });
  });

  it('renders existing nickname and username fallback when displayName is null', () => {
    const convWithNickname: any = {
      ...mockConv,
      participants: [
        {
          userId: 'usr-2',
          nickname: 'Speedy',
          user: { id: 'usr-2', username: 'bob', displayName: 'Robert', avatar: null },
        },
        {
          userId: 'usr-3',
          nickname: null,
          user: { id: 'usr-3', username: 'carol_99', displayName: null, avatar: null },
        },
      ],
    };

    render(
      <QueryClientProvider client={queryClient}>
        <NicknamesModal conversation={convWithNickname} onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Speedy')).toBeInTheDocument();
    expect(screen.getByText('carol_99')).toBeInTheDocument();
  });
});
