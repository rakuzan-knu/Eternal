import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import StoryAvatar from '../StoryAvatar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { STORIES_FEED_KEY } from '@/shared/api/queryKeys';
import { useStoryViewerStore } from '../../model/useStoryViewerStore';

const createWrapper = (initialFeedData?: any) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (initialFeedData) {
    queryClient.setQueryData([STORIES_FEED_KEY], initialFeedData);
  }
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('StoryAvatar', () => {
  it('renders standard avatar when user has no active stories', () => {
    const { container } = render(
      <StoryAvatar src="https://example.com/avatar.jpg" name="Alice" hasStory={false} />,
      { wrapper: createWrapper() },
    );

    expect(container.querySelector('img')).toBeDefined();
    expect(screen.queryByTitle('View active stories')).not.toBeInTheDocument();
    expect(screen.queryByTitle('View watched stories')).not.toBeInTheDocument();
  });

  it('resolves story status from queryClient feed and opens story viewer on click', () => {
    const openViewerSpy = vi.spyOn(useStoryViewerStore.getState(), 'openViewer');
    const mockFeed = [
      {
        user: { id: 'u1', username: 'alice' },
        hasUnviewed: true,
        hasCloseFriendsStory: true,
        stories: [{ id: 's1' }],
      },
    ];

    render(<StoryAvatar src="https://example.com/avatar.jpg" userId="u1" username="alice" />, {
      wrapper: createWrapper(mockFeed),
    });

    const avatar = screen.getByTitle('View active stories');
    expect(avatar).toBeInTheDocument();

    fireEvent.click(avatar);
    expect(openViewerSpy).toHaveBeenCalledWith(mockFeed, 0);
  });

  it('renders subtle viewed ring for watched stories', () => {
    const { container } = render(
      <StoryAvatar
        src="https://example.com/avatar.jpg"
        name="Alice"
        hasStory={true}
        hasUnviewed={false}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByTitle('View watched stories')).toBeInTheDocument();
    const ringDiv = container.firstChild as HTMLElement;
    expect(ringDiv).toHaveClass('bg-white/20');
  });

  it('renders glowing gradient ring for unviewed regular story', () => {
    const { container } = render(
      <StoryAvatar
        src="https://example.com/avatar.jpg"
        name="Alice"
        hasStory={true}
        hasUnviewed={true}
        hasCloseFriendsStory={false}
      />,
      { wrapper: createWrapper() },
    );

    const ringDiv = container.firstChild as HTMLElement;
    expect(ringDiv.style.background).toContain('linear-gradient');
  });

  it('renders emerald green ring for close friends story with star badge', () => {
    render(
      <StoryAvatar
        src="https://example.com/avatar.jpg"
        name="Alice"
        hasStory={true}
        hasUnviewed={true}
        hasCloseFriendsStory={true}
        showBadge={true}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByTitle('Close Friends Story')).toBeDefined();
  });

  it('triggers custom onClick when provided', () => {
    const handleClick = vi.fn();
    render(
      <StoryAvatar
        src="https://example.com/avatar.jpg"
        hasStory={true}
        hasUnviewed={true}
        onClick={handleClick}
      />,
      { wrapper: createWrapper() },
    );

    const el = screen.getByTitle('View active stories');
    fireEvent.click(el);
    expect(handleClick).toHaveBeenCalled();
  });
});
