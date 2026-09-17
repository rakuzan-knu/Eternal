import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatListSkeleton, ChatListMoreSkeleton } from '../ChatListSkeletons';

describe('ChatListSkeletons', () => {
  it('renders chat list skeleton with 9 skeleton rows', () => {
    render(<ChatListSkeleton />);
    const status = screen.getByRole('status', { name: /loading chats/i });
    expect(status).toBeInTheDocument();
    expect(status.children).toHaveLength(9);
  });

  it('renders chat list more skeleton with 2 rows', () => {
    render(<ChatListMoreSkeleton />);
    const status = screen.getByRole('status', { name: /loading more chats/i });
    expect(status).toBeInTheDocument();
    expect(status.children).toHaveLength(2);
  });
});
