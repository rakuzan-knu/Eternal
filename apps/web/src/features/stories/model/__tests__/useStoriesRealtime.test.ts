import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStoriesRealtime } from '../useStoriesRealtime';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useStoryViewerStore } from '../useStoryViewerStore';
import * as socketModule from '@/shared/api/socket';
import { STORIES_FEED_KEY } from '@/shared/api/queryKeys';

describe('useStoriesRealtime', () => {
  let queryClient: QueryClient;
  const mockListeners: Record<string, (...args: any[]) => void> = {};
  const mockSocket = {
    on: vi.fn((event: string, cb: (...args: any[]) => void) => {
      mockListeners[event] = cb;
    }),
    off: vi.fn((event: string) => {
      delete mockListeners[event];
    }),
    emit: vi.fn(),
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(socketModule, 'getSocket').mockReturnValue(mockSocket as any);
  });

  it('subscribes to story events on mount and cleans up on unmount', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { unmount } = renderHook(() => useStoriesRealtime(), { wrapper });

    expect(mockSocket.on).toHaveBeenCalledWith('story:new', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('story:viewed', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('story:poll_voted', expect.any(Function));

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('story:new', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('story:viewed', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('story:poll_voted', expect.any(Function));
  });

  it('invalidates queries and updates viewer store when story:new is received', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    useStoryViewerStore.setState({
      groups: [
        {
          user: { id: 'u-1', username: 'alice', displayName: 'Alice', avatar: null },
          hasUnviewed: false,
          hasCloseFriendsStory: false,
          stories: [],
          latestStoryTimestamp: new Date().toISOString(),
        },
      ],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    renderHook(() => useStoriesRealtime(), { wrapper });

    // Trigger story:new event
    mockListeners['story:new']({
      authorId: 'u-1',
      story: {
        id: 'new-story-1',
        authorId: 'u-1',
        mediaUrl: 'https://example.com/story.jpg',
        mediaType: 'IMAGE',
        createdAt: new Date().toISOString(),
      },
    });

    expect(invalidateSpy).toHaveBeenCalled();
    const updatedGroups = useStoryViewerStore.getState().groups;
    expect(updatedGroups[0].hasUnviewed).toBe(true);
    expect(updatedGroups[0].stories.length).toBe(1);
  });

  it('updates cache on story:viewed and story:poll_voted events', () => {
    queryClient.setQueryData(
      [STORIES_FEED_KEY],
      [
        {
          user: { id: 'u-1' },
          stories: [{ id: 's-1', viewsCount: 1, pollResult: null }],
        },
      ],
    );

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    renderHook(() => useStoriesRealtime(), { wrapper });

    // Trigger story:viewed
    mockListeners['story:viewed']({
      storyId: 's-1',
      authorId: 'u-1',
      viewerId: 'v-1',
      viewer: {},
      viewedAt: '',
    });

    let feed = queryClient.getQueryData<any>([STORIES_FEED_KEY]);
    expect(feed[0].stories[0].viewsCount).toBe(2);

    // Trigger story:poll_voted
    mockListeners['story:poll_voted']({
      storyId: 's-1',
      authorId: 'u-1',
      userId: 'u-voter',
      pollResult: { totalVotes: 10 },
    });

    feed = queryClient.getQueryData<any>([STORIES_FEED_KEY]);
    expect(feed[0].stories[0].pollResult).toEqual({ totalVotes: 10 });
  });

  it('handles exception when getSocket throws', () => {
    vi.spyOn(socketModule, 'getSocket').mockImplementation(() => {
      throw new Error('Socket not initialized');
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    expect(() => renderHook(() => useStoriesRealtime(), { wrapper })).not.toThrow();
  });
});
