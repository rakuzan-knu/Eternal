import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePrivacyExceptions, useAddException, useRemoveException } from '../usePrivacyExceptions';
import { privacyApi } from '../../api/privacyApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/privacyApi', () => ({
  privacyApi: {
    listExceptions: vi.fn(),
    addException: vi.fn(),
    removeException: vi.fn(),
  },
}));

describe('usePrivacyExceptions hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('fetches exceptions for dimension, adds and removes exceptions', async () => {
    vi.mocked(privacyApi.listExceptions).mockResolvedValue({
      alwaysAllow: [],
      neverAllow: [],
    } as unknown as never);
    vi.mocked(privacyApi.addException).mockResolvedValue({ success: true } as unknown as never);
    vi.mocked(privacyApi.removeException).mockResolvedValue({ success: true } as unknown as never);

    const { result: listResult } = renderHook(() => usePrivacyExceptions('MESSAGES'), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));

    const { result: addResult } = renderHook(() => useAddException('MESSAGES'), { wrapper });
    addResult.current.mutate({ targetId: 'u2', mode: 'ALLOW' });
    await waitFor(() => expect(addResult.current.isSuccess).toBe(true));
    expect(privacyApi.addException).toHaveBeenCalledWith('MESSAGES', 'u2', 'ALLOW');

    const { result: removeResult } = renderHook(() => useRemoveException('MESSAGES'), { wrapper });
    removeResult.current.mutate('u2');
    await waitFor(() => expect(removeResult.current.isSuccess).toBe(true));
    expect(privacyApi.removeException).toHaveBeenCalledWith('MESSAGES', 'u2');
  });
});
