import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommentItem } from '../CommentItem';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CommentType } from '../../model/types';

describe('CommentItem', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const mockComment: CommentType = {
    id: 'c-1',
    text: 'Hello @alice this is a comment!',
    time: '2h',
    handle: 'bob_dev',
    author: 'Bob Developer',
    userId: 'usr-bob',
    likesCount: 5,
    isLiked: false,
    isPinned: false,
    isDeleted: false,
  };

  it('renders author info, text, and like button', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentItem comment={mockComment} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Bob Developer')).toBeInTheDocument();
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('triggers onLike callback when like button is clicked', () => {
    const onLike = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentItem comment={mockComment} onLike={onLike} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const likeBtn = screen.getByTitle('Like');
    fireEvent.click(likeBtn);

    expect(onLike).toHaveBeenCalledWith('c-1');
  });

  it('renders Author badge when comment author matches postAuthorId', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentItem comment={mockComment} postAuthorId="usr-bob" />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Author')).toBeInTheDocument();
  });

  it('renders Pinned badge when isPinned is true', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentItem comment={{ ...mockComment, isPinned: true }} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Pinned')).toBeInTheDocument();
  });

  it('renders [Comment deleted] when isDeleted is true', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentItem comment={{ ...mockComment, isDeleted: true }} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('[Comment deleted]')).toBeInTheDocument();
    expect(screen.queryByTitle('Like')).not.toBeInTheDocument();
  });
});
