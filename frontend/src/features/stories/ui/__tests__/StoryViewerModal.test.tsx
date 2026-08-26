import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { StoryViewerModal } from '../StoryViewerModal';
import { useStoryViewerStore } from '../../model/useStoryViewerStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: {
      id: 'u-1',
      username: 'alice',
      displayName: 'Alice',
      avatar: null,
    },
  }),
}));

const mockFeed = [
  {
    user: { id: 'u-2', username: 'bob', displayName: 'Bob', avatar: null },
    hasUnviewed: true,
    hasCloseFriendsStory: false,
    latestStoryTimestamp: new Date().toISOString(),
    stories: [
      {
        id: 's-1',
        authorId: 'u-2',
        mediaUrl: 'https://example.com/story.jpg',
        mediaType: 'IMAGE' as const,
        caption: 'Hello from Bob',
        overlays: null,
        privacy: 'ALL_FOLLOWERS' as const,
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        viewsCount: 1,
        hasViewed: false,
        userReaction: null,
        reactionsCount: {},
        pollResult: null,
        author: { id: 'u-2', username: 'bob', displayName: 'Bob', avatar: null },
      },
    ],
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('StoryViewerModal', () => {
  beforeEach(() => {
    useStoryViewerStore.getState().closeViewer();
  });

  it('does not render when closed', () => {
    const { container } = render(<StoryViewerModal />, { wrapper: createWrapper() });
    expect(container.firstChild).toBeNull();
  });

  it('renders story when viewer is open', () => {
    useStoryViewerStore.getState().openViewer(mockFeed, 0, 0);
    render(<StoryViewerModal />, { wrapper: createWrapper() });

    expect(screen.getByText('Bob')).toBeDefined();
    expect(screen.getByPlaceholderText(/Ответить Bob/)).toBeDefined();
  });

  it('closes viewer on clicking close button', () => {
    useStoryViewerStore.getState().openViewer(mockFeed, 0, 0);
    render(<StoryViewerModal />, { wrapper: createWrapper() });

    const closeBtn = screen.getByLabelText('Close story viewer');
    fireEvent.click(closeBtn);

    expect(useStoryViewerStore.getState().isOpen).toBe(false);
  });
});
