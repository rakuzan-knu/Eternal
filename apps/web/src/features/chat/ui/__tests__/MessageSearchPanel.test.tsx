import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MessageSearchPanel from '../MessageSearchPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { chatApi } from '../../api/chatApi';

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    searchMessages: vi.fn(),
  },
}));

vi.mock('../../model/useConversations', () => ({
  useConversations: () => ({
    data: [
      {
        id: 'conv-1',
        type: 'DIRECT',
        participants: [
          { userId: 'u1', user: { id: 'u1', username: 'alice', displayName: 'Alice' } },
        ],
      },
      {
        id: 'conv-2',
        type: 'DIRECT',
        participants: [{ userId: 'u2', user: { id: 'u2', username: 'bob', displayName: 'Bob' } }],
      },
    ],
  }),
}));

describe('MessageSearchPanel', () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  it('renders search input, searches messages, highlights matches, and jumps to message', async () => {
    const onClose = vi.fn();
    const onJumpToMessage = vi.fn();

    const mockResults = [
      {
        id: 'msg-s1',
        body: 'Here is important meeting details',
        createdAt: '2026-01-01T12:00:00Z',
        sender: { id: 'u1', username: 'alice', displayName: 'Alice', avatar: null },
      },
      {
        id: 'msg-s2',
        body: null, // attachment message
        createdAt: '2026-01-01T13:00:00Z',
        sender: { id: 'u2', username: 'bob', displayName: null, avatar: null },
      },
    ];

    vi.mocked(chatApi.searchMessages).mockResolvedValue(mockResults as any);

    const { container } = render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <MessageSearchPanel
            conversationId="conv-1"
            onClose={onClose}
            onJumpToMessage={onJumpToMessage}
          />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Search for messages')).toBeInTheDocument();
    expect(screen.getByText('Search messages in')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Search in chat...');
    fireEvent.change(input, { target: { value: 'meeting' } });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Sent an attachment')).toBeInTheDocument();
    });

    // Jump to message
    fireEvent.click(screen.getByText('Alice'));
    expect(onJumpToMessage).toHaveBeenCalledWith('msg-s1');

    // Clear query
    const clearBtn = container.querySelector('.relative.flex-1 button')!;
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(input).toHaveValue('');

    // Close panel
    vi.useFakeTimers();
    const closeBtn = container.querySelector('button')!;
    fireEvent.click(closeBtn);
    // second close click while isClosing
    fireEvent.click(closeBtn);
    vi.advanceTimersByTime(200);
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('toggles chat selection dropdown smoothly', () => {
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <MessageSearchPanel conversationId="conv-1" onClose={vi.fn()} onJumpToMessage={vi.fn()} />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    const triggerBtn = screen.getByText('This Chat');
    expect(triggerBtn).toBeInTheDocument();

    fireEvent.click(triggerBtn);
    expect(screen.getByText('Current conversation')).toBeInTheDocument();

    // Click again to close smoothly
    fireEvent.click(triggerBtn);
  });

  it('shows no messages found when search returns empty', async () => {
    vi.mocked(chatApi.searchMessages).mockResolvedValue([] as any);

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <MessageSearchPanel conversationId="conv-1" onClose={vi.fn()} onJumpToMessage={vi.fn()} />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText('Search in chat...');
    fireEvent.change(input, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No Results')).toBeInTheDocument();
      expect(screen.getByText(/There were no results for/)).toBeInTheDocument();
    });
  });

  it('triggers onOpenDatePicker when date button is clicked', () => {
    const onOpenDatePicker = vi.fn();
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <MessageSearchPanel
            conversationId="conv-1"
            onClose={vi.fn()}
            onJumpToMessage={vi.fn()}
            onOpenDatePicker={onOpenDatePicker}
          />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    const jumpToDateBtn = screen.getByTitle('Jump to date');
    fireEvent.click(jumpToDateBtn);
    expect(onOpenDatePicker).toHaveBeenCalled();
  });
});
