import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSessions, useRevokeSession, useRevokeAllSessions } from '../useSessions';
import { sessionsApi } from '../../api/sessionsApi';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/sessionsApi', () => ({
  sessionsApi: {
    list: vi.fn(),
    revoke: vi.fn(),
    revokeAllOthers: vi.fn(),
  },
}));

describe('useSessions hooks', () => {
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

  it('fetches sessions, revokes single session, and revokes all others', async () => {
    vi.mocked(sessionsApi.list).mockResolvedValue([]);
    vi.mocked(sessionsApi.revoke).mockResolvedValue({ success: true } as unknown as never);
    vi.mocked(sessionsApi.revokeAllOthers).mockResolvedValue({ success: true } as unknown as never);

    const { result: listResult } = renderHook(() => useSessions(), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));

    const { result: revokeResult } = renderHook(() => useRevokeSession(), { wrapper });
    revokeResult.current.mutate('sess-1');
    await waitFor(() => expect(revokeResult.current.isSuccess).toBe(true));
    expect(sessionsApi.revoke).toHaveBeenCalledWith('sess-1');

    const { result: revokeAllResult } = renderHook(() => useRevokeAllSessions(), { wrapper });
    revokeAllResult.current.mutate();
    await waitFor(() => expect(revokeAllResult.current.isSuccess).toBe(true));
    expect(sessionsApi.revokeAllOthers).toHaveBeenCalled();
  });
});
