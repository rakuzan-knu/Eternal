import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { StoriesBar } from '../StoriesBar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStoryEditorStore } from '@/features/stories/model/useStoryEditorStore';

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: {
      id: 'u-1',
      username: 'alice',
      displayName: 'Alice Wonderland',
      avatar: 'https://example.com/alice.jpg',
    },
  }),
}));

vi.mock('@/features/stories/model/useStories', () => ({
  useStoriesFeed: () => ({
    data: [
      {
        user: { id: 'u-2', username: 'bob', displayName: 'Bob', avatar: null },
        hasUnviewed: true,
        hasCloseFriendsStory: false,
        latestStoryTimestamp: new Date().toISOString(),
        stories: [
          {
            id: 's-1',
            authorId: 'u-2',
            mediaUrl: 'https://example.com/s1.jpg',
            mediaType: 'IMAGE',
            author: { id: 'u-2', username: 'bob', displayName: 'Bob', avatar: null },
          },
        ],
      },
    ],
    isLoading: false,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('StoriesBar', () => {
  it('renders current user add story button and followed users', () => {
    render(<StoriesBar />, { wrapper: createWrapper() });

    expect(screen.getByText('Добавить')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();
  });

  it('opens story editor modal when clicking on own add story button', () => {
    render(<StoriesBar />, { wrapper: createWrapper() });

    const ownButton = screen.getByText('Добавить').parentElement;
    if (ownButton) {
      fireEvent.click(ownButton.querySelector('button')!);
    }

    expect(useStoryEditorStore.getState().isOpen).toBe(true);
  });
});
