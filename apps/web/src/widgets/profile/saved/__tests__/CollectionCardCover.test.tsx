import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CollectionCardCover } from '../CollectionCardCover';
import type { PostType } from '@/entities/post/model/types';

describe('CollectionCardCover', () => {
  it('renders cover image when coverImg is provided', () => {
    const { container } = render(<CollectionCardCover coverImg="https://example.com/cover.jpg" />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');
  });

  it('renders post preview when post is provided', () => {
    const post: Partial<PostType> = {
      id: 'post-1',
      handle: 'author',
      text: 'Saved post quote snippet',
      avatar: null,
    };

    render(<CollectionCardCover post={post as PostType} />);
    expect(screen.getByText(/saved post quote snippet/i)).toBeInTheDocument();
    expect(screen.getByText('@author')).toBeInTheDocument();
  });

  it('renders default empty bookmark icon when no coverImg or post', () => {
    const { container } = render(<CollectionCardCover />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders poll badge when post has a poll', () => {
    const post: Partial<PostType> = {
      id: 'post-poll-1',
      handle: 'author',
      text: '',
      avatar: null,
      poll: { id: 'poll-1', options: [], totalVotes: 0, myVoteOptionId: null },
    };

    render(<CollectionCardCover post={post as PostType} />);
    expect(screen.getByText('Poll')).toBeInTheDocument();
  });
});
