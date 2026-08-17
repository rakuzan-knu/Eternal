import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageReactionsModal from '../MessageReactionsModal';
import type { ReactionSummary } from '@/entities/chat/model/types';

describe('MessageReactionsModal', () => {
  const mockReactions: ReactionSummary[] = [
    {
      emoji: '🔥',
      count: 1,
      selfReacted: false,
      users: [{ id: 'usr-1', username: 'alice', displayName: 'Alice', avatar: null }],
    },
  ];

  it('renders reactions header and list of users who reacted', () => {
    render(
      <MessageReactionsModal
        reactions={mockReactions}
        currentUserId="me"
        onClose={vi.fn()}
        onRemoveOwn={vi.fn()}
      />,
    );

    expect(screen.getByText('Message reactions')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('All 1')).toBeInTheDocument();
  });
});
