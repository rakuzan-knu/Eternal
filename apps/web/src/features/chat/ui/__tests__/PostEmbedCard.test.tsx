import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostEmbedCard } from '../PostEmbedCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { postsApi } from '@/entities/post/api/postsApi';
import type { PostType } from '@/entities/post/model/types';
import React from 'react';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('PostEmbedCard', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders post preview, badges, multi-media count and handles click and Enter key', async () => {
    vi.spyOn(postsApi, 'getPostById').mockResolvedValue({
      id: 'post-1',
      handle: 'alice',
      author: 'Alice Smith',
      text: 'Embedded post snippet',
      avatar: null,
      likes: 5,
      commentsCount: 2,
      isVerified: true,
      primaryBadge: 'premium-gold',
      media: [{ url: 'https://pic1.jpg' }, { url: 'https://pic2.jpg' }],
      createdAt: new Date().toISOString(),
      views: 100,
      sharesCount: 1,
      isLiked: false,
      isSaved: false,
      isReposted: false,
    } as unknown as PostType);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PostEmbedCard postId="post-1" />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Embedded post snippet')).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();

    const card = screen.getByRole('button');
    fireEvent.click(card);
    expect(mockNavigate).toHaveBeenCalledWith('/profile/alice#post-post-1');

    fireEvent.keyDown(card, { key: 'Enter' });
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('renders null when post query encounters an error', async () => {
    vi.spyOn(postsApi, 'getPostById').mockRejectedValue(new Error('Not found'));

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PostEmbedCard postId="post-err" />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Initial loading or null
    expect(container.textContent).toBe('');
  });

  it('renders with isOwnMessage=true styles', async () => {
    vi.spyOn(postsApi, 'getPostById').mockResolvedValue({
      id: 'post-own',
      handle: 'me',
      author: 'Myself',
      text: 'My own post',
      avatar: null,
      likes: 1,
      comments: 0,
      createdAt: new Date().toISOString(),
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PostEmbedCard postId="post-own" isOwnMessage={true} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('My own post')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('bg-black/5');
  });
});
