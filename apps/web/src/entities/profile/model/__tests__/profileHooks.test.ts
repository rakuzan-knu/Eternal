import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCurrentUser } from '../useCurrentUser';
import { useUserByUsername } from '../useUserByUsername';
import { useGitHubPRCount } from '../useGitHubPRCount';
import { useCheckUsername } from '../useCheckUsername';
import { userApi } from '../../api/userApi';
import { useAuthStore } from '@/shared/model/useAuthStore';

vi.mock('../../api/userApi', () => ({
  userApi: {
    getProfile: vi.fn(),
    getByUsername: vi.fn(),
    checkUsername: vi.fn(),
  },
}));

describe('Profile Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    useAuthStore.setState({ userId: 'user-123', isAuthenticated: true });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('useCurrentUser fetches current user profile', async () => {
    const mockUser = { id: 'user-123', username: 'john', displayName: 'John' };
    vi.mocked(userApi.getProfile).mockResolvedValueOnce(mockUser as any);

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockUser);
    expect(userApi.getProfile).toHaveBeenCalledWith('user-123');
  });

  it('useUserByUsername fetches user by username and handles empty username refetch', async () => {
    const mockUser = { id: 'user-456', username: 'sarah', displayName: 'Sarah' };
    vi.mocked(userApi.getByUsername).mockResolvedValueOnce(mockUser as any);

    const { result } = renderHook(() => useUserByUsername('sarah'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockUser);
    expect(userApi.getByUsername).toHaveBeenCalledWith('sarah');

    const { result: emptyResult } = renderHook(() => useUserByUsername(undefined), { wrapper });
    expect(emptyResult.current.fetchStatus).toBe('idle');
    const refetchRes = await emptyResult.current.refetch();
    expect(refetchRes.isError).toBe(true);
    expect(refetchRes.error?.message).toBe('Username not specified');
  });

  it('useCheckUsername checks username availability', async () => {
    vi.mocked(userApi.checkUsername).mockResolvedValueOnce({ isAvailable: true } as any);

    const { result } = renderHook(() => useCheckUsername('@newuser', true), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ isAvailable: true });
    expect(userApi.checkUsername).toHaveBeenCalledWith('@newuser');
  });

  it('useGitHubPRCount handles success, error response, non-array response, and network exceptions', async () => {
    const mockPRs = [
      { merged_at: '2026-01-01', user: { login: 'octocat' } },
      { merged_at: '2026-01-02', user: { login: 'octocat' } },
      { merged_at: null, user: { login: 'octocat' } },
      { merged_at: '2026-01-03', user: { login: 'other' } },
    ];

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    // 1. Success with username
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPRs,
    } as any);

    const { result } = renderHook(() => useGitHubPRCount('octocat'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(2);

    // 2. !res.ok
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as any);
    const { result: errResult } = renderHook(() => useGitHubPRCount('octocat-err'), { wrapper });
    await waitFor(() => expect(errResult.current.isSuccess).toBe(true));
    expect(errResult.current.data).toBe(0);

    // 3. Non-array response
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'API rate limit exceeded' }),
    } as any);
    const { result: nonArrayResult } = renderHook(() => useGitHubPRCount('octocat-nonarray'), {
      wrapper,
    });
    await waitFor(() => expect(nonArrayResult.current.isSuccess).toBe(true));
    expect(nonArrayResult.current.data).toBe(0);

    // 4. Empty username provided
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPRs,
    } as any);
    const { result: noUserResult } = renderHook(() => useGitHubPRCount(''), { wrapper });
    await waitFor(() => expect(noUserResult.current.isSuccess).toBe(true));
    expect(noUserResult.current.data).toBe(0);

    // 5. Network throws
    fetchSpy.mockRejectedValueOnce(new Error('Network failure'));
    const { result: throwResult } = renderHook(() => useGitHubPRCount('octocat-throw'), {
      wrapper,
    });
    await waitFor(() => expect(throwResult.current.isSuccess).toBe(true));
    expect(throwResult.current.data).toBe(0);
  });
});
