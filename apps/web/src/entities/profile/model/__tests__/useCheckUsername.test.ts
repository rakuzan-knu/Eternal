import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCheckUsername } from '../useCheckUsername';
import { userApi } from '../../api/userApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/userApi', () => ({
  userApi: {
    checkUsername: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useCheckUsername', () => {
  it('checks username availability via userApi', async () => {
    vi.mocked(userApi.checkUsername).mockResolvedValue({ isAvailable: true });

    const { result } = renderHook(() => useCheckUsername('available_user', true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ isAvailable: true });
    expect(userApi.checkUsername).toHaveBeenCalledWith('available_user');
  });
});
