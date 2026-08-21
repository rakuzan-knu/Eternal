import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePrivacy, useUpdatePrivacy } from '../usePrivacy';
import { privacyApi } from '../../api/privacyApi';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/privacyApi', () => ({
  privacyApi: {
    getPrivacy: vi.fn(),
    updatePrivacy: vi.fn(),
  },
}));

describe('usePrivacy hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    useAuthStore.setState({ userId: 'u1', isAuthenticated: true });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('fetches privacy settings and updates them optimistically', async () => {
    const mockPrivacy = { isPrivate: false, autoDeletePeriod: 'OFF' };
    vi.mocked(privacyApi.getPrivacy).mockResolvedValue(mockPrivacy as unknown as never);
    vi.mocked(privacyApi.updatePrivacy).mockResolvedValue({
      isPrivate: true,
      autoDeletePeriod: 'OFF',
    } as unknown as never);

    const { result: getResult } = renderHook(() => usePrivacy(), { wrapper });
    await waitFor(() => expect(getResult.current.isSuccess).toBe(true));
    expect(getResult.current.data).toEqual(mockPrivacy);

    const { result: updateResult } = renderHook(() => useUpdatePrivacy(), { wrapper });
    updateResult.current.mutate({ isPrivate: true });
    await waitFor(() => expect(updateResult.current.isSuccess).toBe(true));
    expect(privacyApi.updatePrivacy).toHaveBeenCalledWith({ isPrivate: true });
  });
});
