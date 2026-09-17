import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePostsFeed } from '../usePostsFeed';
import { useUserPosts } from '../useUserPosts';
import { useUserReposts } from '../useUserReposts';
import { useSavedPosts } from '../useSavedPosts';
import { usePollVoters } from '../usePollVoters';
import { postsApi } from '../../api/postsApi';

vi.mock('../../api/postsApi', () => ({
  postsApi: {
    getFeed: vi.fn(),
    getUserPosts: vi.fn(),
    getUserReposts: vi.fn(),
    getSavedPosts: vi.fn(),
    getPollVoters: vi.fn(),
  },
}));

describe('Post Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('usePostsFeed fetches feed page', async () => {
    const mockFeed = { posts: [{ id: 1, text: 'Hello' }], nextCursor: null };
    vi.mocked(postsApi.getFeed).mockResolvedValueOnce(mockFeed as any);

    const { result } = renderHook(() => usePostsFeed(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]).toEqual(mockFeed);
    expect(postsApi.getFeed).toHaveBeenCalledWith(undefined);
  });

  it('useUserPosts fetches user posts', async () => {
    const mockPosts = { posts: [{ id: 2, text: 'User post' }], nextCursor: null };
    vi.mocked(postsApi.getUserPosts).mockResolvedValueOnce(mockPosts as any);

    const { result } = renderHook(() => useUserPosts('user-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]).toEqual(mockPosts);
    expect(postsApi.getUserPosts).toHaveBeenCalledWith('user-1', undefined);
  });

  it('useUserReposts fetches user reposts', async () => {
    const mockReposts = { posts: [{ id: 3, text: 'Reposted post' }], nextCursor: null };
    vi.mocked(postsApi.getUserReposts).mockResolvedValueOnce(mockReposts as any);

    const { result } = renderHook(() => useUserReposts('user-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]).toEqual(mockReposts);
    expect(postsApi.getUserReposts).toHaveBeenCalledWith('user-1', undefined);
  });

  it('useSavedPosts fetches saved posts', async () => {
    const mockSaved = { posts: [{ id: 4, text: 'Saved post' }], nextCursor: null };
    vi.mocked(postsApi.getSavedPosts).mockResolvedValueOnce(mockSaved as any);

    const { result } = renderHook(() => useSavedPosts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]).toEqual(mockSaved);
    expect(postsApi.getSavedPosts).toHaveBeenCalledWith(undefined);
  });

  it('usePollVoters fetches voters for a poll', async () => {
    const mockVoters = [{ optionId: 'opt-1', voters: [{ id: 'u-1', username: 'voter1' }] }];
    vi.mocked(postsApi.getPollVoters).mockResolvedValueOnce(mockVoters as any);

    const { result } = renderHook(() => usePollVoters(1), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockVoters);
    expect(postsApi.getPollVoters).toHaveBeenCalledWith(1);
  });
});
