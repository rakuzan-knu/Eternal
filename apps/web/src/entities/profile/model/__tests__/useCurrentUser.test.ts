import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCurrentUser } from '../useCurrentUser';
import { userApi } from '../../api/userApi';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/userApi', () => ({
  userApi: {
    getProfile: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useCurrentUser', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: null, isAuthenticated: false });
    vi.clearAllMocks();
  });

  it('stays idle when unauthenticated and throws on explicit refetch', async () => {
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(userApi.getProfile).not.toHaveBeenCalled();

    const refetchResult = await result.current.refetch();
    expect(refetchResult.isError).toBe(true);
    expect(refetchResult.error?.message).toBe('User not identified');
  });

  it('fetches profile for authenticated user', async () => {
    useAuthStore.setState({ userId: 'u-123', isAuthenticated: true });
    const mockProfile = { id: 'u-123', username: 'john_doe' };
    vi.mocked(userApi.getProfile).mockResolvedValue(mockProfile as unknown as never);

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProfile);
    expect(userApi.getProfile).toHaveBeenCalledWith('u-123');
  });
});
