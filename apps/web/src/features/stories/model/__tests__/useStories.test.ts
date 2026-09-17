import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useStoriesFeed,
  useUserStories,
  useCreateStory,
  useViewStory,
  useReactStory,
  useVoteStoryPoll,
  useReplyStory,
  useDeleteStory,
  useCloseFriends,
  useToggleCloseFriend,
} from '../useStories';
import { storiesApi } from '../../api/storiesApi';
import { STORIES_FEED_KEY } from '@/shared/api/queryKeys';

vi.mock('../../api/storiesApi', () => ({
  storiesApi: {
    getFeed: vi.fn(),
    getUserStories: vi.fn(),
    createStory: vi.fn(),
    viewStory: vi.fn(),
    reactToStory: vi.fn(),
    votePoll: vi.fn(),
    replyToStory: vi.fn(),
    deleteStory: vi.fn(),
    getCloseFriends: vi.fn(),
    toggleCloseFriend: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

describe('useStories hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useStoriesFeed and useUserStories fetch data properly', async () => {
    vi.mocked(storiesApi.getFeed).mockResolvedValueOnce([
      { user: { id: 'u1', username: 'u1', displayName: 'U1', avatar: null }, stories: [] },
    ] as any);
    vi.mocked(storiesApi.getUserStories).mockResolvedValueOnce({
      user: { id: 'u2', username: 'u2', displayName: 'U2', avatar: null },
      stories: [],
    } as any);

    const { wrapper } = createWrapper();

    const { result: feedResult } = renderHook(() => useStoriesFeed(), { wrapper });
    const { result: userStoriesResult } = renderHook(() => useUserStories('u2'), { wrapper });

    await waitFor(() => {
      expect(feedResult.current.isSuccess).toBe(true);
      expect(userStoriesResult.current.isSuccess).toBe(true);
    });

    expect(feedResult.current.data).toHaveLength(1);
    expect(userStoriesResult.current.data?.user.id).toBe('u2');
  });

  it('mutations (useCreateStory, useViewStory, useReactStory, useVoteStoryPoll, useReplyStory, useDeleteStory, useToggleCloseFriend) work', async () => {
    vi.mocked(storiesApi.createStory).mockResolvedValueOnce({ id: 's1' } as any);
    vi.mocked(storiesApi.viewStory).mockResolvedValueOnce(undefined);
    vi.mocked(storiesApi.reactToStory).mockResolvedValueOnce({ emoji: '❤️' });
    vi.mocked(storiesApi.votePoll).mockResolvedValueOnce({ totalVotes: 5, options: [] } as any);
    vi.mocked(storiesApi.replyToStory).mockResolvedValueOnce({ conversationId: 'c1', message: {} });
    vi.mocked(storiesApi.deleteStory).mockResolvedValueOnce(undefined);
    vi.mocked(storiesApi.toggleCloseFriend).mockResolvedValueOnce({ isCloseFriend: true });

    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(
      [STORIES_FEED_KEY],
      [{ user: { id: 'u1' }, stories: [{ id: 's1', pollResult: null }] }],
    );

    const { result: createMut } = renderHook(() => useCreateStory(), { wrapper });
    const { result: viewMut } = renderHook(() => useViewStory(), { wrapper });
    const { result: reactMut } = renderHook(() => useReactStory(), { wrapper });
    const { result: voteMut } = renderHook(() => useVoteStoryPoll(), { wrapper });
    const { result: replyMut } = renderHook(() => useReplyStory(), { wrapper });
    const { result: deleteMut } = renderHook(() => useDeleteStory(), { wrapper });
    const { result: toggleFriendMut } = renderHook(() => useToggleCloseFriend(), { wrapper });

    await act(async () => {
      await createMut.current.mutateAsync({} as any);
      await viewMut.current.mutateAsync('s1');
      await reactMut.current.mutateAsync({ storyId: 's1', emoji: '❤️' });
      await voteMut.current.mutateAsync({ storyId: 's1', optionIndex: 0 });
      await replyMut.current.mutateAsync({ storyId: 's1', text: 'hi' });
      await deleteMut.current.mutateAsync('s1');
      await toggleFriendMut.current.mutateAsync('u-friend-1');
    });

    expect(storiesApi.createStory).toHaveBeenCalled();
    expect(storiesApi.viewStory).toHaveBeenCalledWith('s1');
    expect(storiesApi.reactToStory).toHaveBeenCalledWith('s1', '❤️');
    expect(storiesApi.votePoll).toHaveBeenCalledWith('s1', 0);
    expect(storiesApi.replyToStory).toHaveBeenCalledWith('s1', 'hi');
    expect(storiesApi.deleteStory).toHaveBeenCalledWith('s1');
    expect(storiesApi.toggleCloseFriend).toHaveBeenCalledWith('u-friend-1');
  });

  it('useCloseFriends fetches close friends', async () => {
    vi.mocked(storiesApi.getCloseFriends).mockResolvedValueOnce([
      { id: 'f1', username: 'friend1' },
    ] as any);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCloseFriends(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});
