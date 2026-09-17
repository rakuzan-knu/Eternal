import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useConversations } from '../useConversations';
import { chatApi } from '../../api/chatApi';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    getConversations: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches conversations when authenticated', async () => {
    useAuthStore.setState({ isAuthenticated: true, userId: 'u1' });
    const mockConversations = [{ id: 'conv-1', title: 'General' }];
    vi.mocked(chatApi.getConversations).mockResolvedValue(mockConversations as unknown as never);

    const { result } = renderHook(() => useConversations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockConversations);
  });
});
