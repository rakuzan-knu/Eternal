import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommentModal } from '../CommentModal';
import { useUIStore } from '@/shared/model/useUIStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { PostType } from '@/entities/post/model/types';

describe('CommentModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    useUIStore.setState({
      isCommentModalOpen: true,
      activePostForComments: {
        id: 'post-123',
        author: 'John Doe',
        handle: 'johndoe',
        authorId: 'usr-1',
        text: 'This is my awesome post!',
        createdAt: new Date().toISOString(),
        commentsCount: 1,
        commentList: [
          {
            id: 'c-1',
            text: 'Great post!',
            time: '1h',
            handle: 'janedoe',
            author: 'Jane',
          },
        ],
      } as unknown as PostType,
    });
  });

  it('renders active post content and existing comments', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentModal />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('This is my awesome post!')).toBeInTheDocument();
    expect(screen.getByText('Great post!')).toBeInTheDocument();
  });

  it('closes modal when close button is clicked', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentModal />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const closeBtn = container.querySelector('button');
    if (closeBtn) fireEvent.click(closeBtn);

    expect(useUIStore.getState().isCommentModalOpen).toBe(false);
  });
});
