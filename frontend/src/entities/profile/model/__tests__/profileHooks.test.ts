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

  it('useUserByUsername fetches user by username', async () => {
    const mockUser = { id: 'user-456', username: 'sarah', displayName: 'Sarah' };
    vi.mocked(userApi.getByUsername).mockResolvedValueOnce(mockUser as any);

    const { result } = renderHook(() => useUserByUsername('sarah'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockUser);
    expect(userApi.getByUsername).toHaveBeenCalledWith('sarah');
  });

  it('useCheckUsername checks username availability', async () => {
    vi.mocked(userApi.checkUsername).mockResolvedValueOnce({ isAvailable: true } as any);

    const { result } = renderHook(() => useCheckUsername('@newuser', true), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ isAvailable: true });
    expect(userApi.checkUsername).toHaveBeenCalledWith('@newuser');
  });

  it('useGitHubPRCount fetches merged PR count for a github username', async () => {
    const mockPRs = [
      { merged_at: '2026-01-01', user: { login: 'octocat' } },
      { merged_at: '2026-01-02', user: { login: 'octocat' } },
      { merged_at: null, user: { login: 'octocat' } },
      { merged_at: '2026-01-03', user: { login: 'other' } },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockPRs,
    } as any);

    const { result } = renderHook(() => useGitHubPRCount('octocat'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(2);
  });
});
