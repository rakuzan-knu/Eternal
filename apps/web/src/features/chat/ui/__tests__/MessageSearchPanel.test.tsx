import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MessageSearchPanel from '../MessageSearchPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { chatApi } from '../../api/chatApi';

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    searchMessages: vi.fn(),
  },
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
      <QueryClientProvider client={queryClient}>
        <MessageSearchPanel
          conversationId="conv-1"
          onClose={onClose}
          onJumpToMessage={onJumpToMessage}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Type to search messages in this chat')).toBeInTheDocument();

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

  it('shows no messages found when search returns empty', async () => {
    vi.mocked(chatApi.searchMessages).mockResolvedValue([] as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MessageSearchPanel conversationId="conv-1" onClose={vi.fn()} onJumpToMessage={vi.fn()} />
      </QueryClientProvider>,
    );

    const input = screen.getByPlaceholderText('Search in chat...');
    fireEvent.change(input, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No messages found')).toBeInTheDocument();
    });
  });

  it('triggers onOpenDatePicker when date button is clicked', () => {
    const onOpenDatePicker = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <MessageSearchPanel
          conversationId="conv-1"
          onClose={vi.fn()}
          onJumpToMessage={vi.fn()}
          onOpenDatePicker={onOpenDatePicker}
        />
      </QueryClientProvider>,
    );

    const jumpToDateBtn = screen.getByTitle('Jump to date');
    fireEvent.click(jumpToDateBtn);
    expect(onOpenDatePicker).toHaveBeenCalled();
  });
});
