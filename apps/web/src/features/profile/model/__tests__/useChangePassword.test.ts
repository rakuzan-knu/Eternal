import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChangePassword } from '../useChangePassword';
import { securityApi } from '../../api/securityApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/securityApi', () => ({
  securityApi: {
    changePassword: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useChangePassword', () => {
  it('calls changePassword endpoint', async () => {
    vi.mocked(securityApi.changePassword).mockResolvedValue({ success: true } as unknown as never);

    const { result } = renderHook(() => useChangePassword(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ currentPassword: 'old', newPassword: 'new' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(securityApi.changePassword).toHaveBeenCalledWith({
      currentPassword: 'old',
      newPassword: 'new',
    });
  });
});
