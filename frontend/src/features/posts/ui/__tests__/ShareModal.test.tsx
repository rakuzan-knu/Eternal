import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShareModal } from '../ShareModal';
import { useUIStore } from '@/shared/model/useUIStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { PostType } from '@/entities/post/model/types';

describe('ShareModal', () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    useUIStore.setState({
      isShareModalOpen: true,
      activePostForShare: {
        id: 'post-99',
        handle: 'creator',
        author: 'Content Creator',
        text: 'Sharing is caring!',
        createdAt: new Date().toISOString(),
      } as unknown as PostType,
    });
  });

  it('renders share modal with header and close button', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ShareModal />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Spread')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();

    const closeBtn = container.querySelector('button');
    if (closeBtn) fireEvent.click(closeBtn);

    expect(useUIStore.getState().isShareModalOpen).toBe(false);
  });
});
