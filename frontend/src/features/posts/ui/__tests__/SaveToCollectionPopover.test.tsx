import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { SaveToCollectionPopover } from '../SaveToCollectionPopover';
import { useSavedCollectionsStore } from '@/entities/post/model/useSavedCollectionsStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('SaveToCollectionPopover', () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    useSavedCollectionsStore.setState({
      collections: [
        {
          id: 'col-1',
          userId: 'test-user',
          name: 'Tech Articles',
          postIds: [],
          createdAt: new Date().toISOString(),
        },
      ],
    });
  });

  it('renders null when not open', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <SaveToCollectionPopover postId="post-1" isOpen={false} onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(container.firstChild).toBeNull();
  });
});
