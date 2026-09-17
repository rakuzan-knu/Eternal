import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUserByUsername } from '../useUserByUsername';
import { userApi } from '../../api/userApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/userApi', () => ({
  userApi: {
    getByUsername: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useUserByUsername', () => {
  it('stays idle when username is undefined', () => {
    const { result } = renderHook(() => useUserByUsername(undefined), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(userApi.getByUsername).not.toHaveBeenCalled();
  });

  it('fetches profile by username when provided', async () => {
    const mockProfile = { id: 'u1', username: 'alex' };
    vi.mocked(userApi.getByUsername).mockResolvedValue(mockProfile as unknown as never);

    const { result } = renderHook(() => useUserByUsername('alex'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProfile);
    expect(userApi.getByUsername).toHaveBeenCalledWith('alex');
  });
});
