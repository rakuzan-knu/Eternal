import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDeleteAccount } from '../useDeleteAccount';
import { securityApi } from '../../api/securityApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/securityApi', () => ({
  securityApi: {
    deleteAccount: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useDeleteAccount', () => {
  it('calls deleteAccount endpoint with credentials', async () => {
    vi.mocked(securityApi.deleteAccount).mockResolvedValue({ success: true } as unknown as never);

    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ userId: 'u1', password: 'secretpassword' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(securityApi.deleteAccount).toHaveBeenCalledWith('u1', 'secretpassword');
  });
});
