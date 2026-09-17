import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MessageReactionsModal from '../MessageReactionsModal';
import type { ReactionSummary } from '@/entities/chat/model/types';
import React from 'react';

describe('MessageReactionsModal', () => {
  const mockReactions: ReactionSummary[] = [
    {
      emoji: '🔥',
      count: 1,
      selfReacted: false,
      users: [{ id: 'usr-1', username: 'alice', displayName: 'Alice', avatar: null }],
    },
    {
      emoji: '❤️',
      count: 1,
      selfReacted: true,
      users: [{ id: 'me', username: 'myuser', displayName: 'My User', avatar: null }],
    },
  ];

  it('renders reactions header, switches tabs, removes own reaction and closes modal', async () => {
    const onClose = vi.fn();
    const onRemoveOwn = vi.fn();

    render(
      <MessageReactionsModal
        reactions={mockReactions}
        currentUserId="me"
        onClose={onClose}
        onRemoveOwn={onRemoveOwn}
      />,
    );

    expect(screen.getByText('Message reactions')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('All 2')).toBeInTheDocument();

    // Switch tab to 🔥
    const fireTab = screen.getByRole('button', { name: /🔥/ });
    fireEvent.click(fireTab);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('My User')).not.toBeInTheDocument();

    // Switch tab to all
    const allTab = screen.getByText('All 2');
    fireEvent.click(allTab);

    // Remove own reaction
    const removeReactionBtn = screen.getByText('Click to remove');
    fireEvent.click(removeReactionBtn);
    expect(onRemoveOwn).toHaveBeenCalledWith('❤️');

    // Close modal
    const closeBtn = document.querySelector('button')!;
    fireEvent.click(closeBtn);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('falls back to username when displayName is null', () => {
    const noDisplayReactions: ReactionSummary[] = [
      {
        emoji: '👍',
        count: 1,
        selfReacted: false,
        users: [{ id: 'usr-3', username: 'bob_the_builder', displayName: null, avatar: null }],
      },
    ];

    render(
      <MessageReactionsModal
        reactions={noDisplayReactions}
        currentUserId="me"
        onClose={vi.fn()}
        onRemoveOwn={vi.fn()}
      />,
    );

    expect(screen.getByText('bob_the_builder')).toBeInTheDocument();
  });
});
