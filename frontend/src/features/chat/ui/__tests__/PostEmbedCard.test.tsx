import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostEmbedCard } from '../PostEmbedCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { postsApi } from '@/entities/post/api/postsApi';
import type { PostType } from '@/entities/post/model/types';

describe('PostEmbedCard', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders post preview when post query resolves', async () => {
    vi.spyOn(postsApi, 'getPostById').mockResolvedValue({
      id: 'post-1',
      handle: 'alice',
      author: 'Alice Smith',
      text: 'Embedded post snippet',
      avatar: null,
      likes: 5,
      commentsCount: 2,
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
  });
});
