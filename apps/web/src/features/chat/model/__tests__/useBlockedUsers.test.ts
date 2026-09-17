import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBlockedUsers } from '../useBlockedUsers';
import { chatApi } from '../../api/chatApi';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

describe('useBlockedUsers', () => {
  it('fetches blocked users when authenticated', async () => {
    useAuthStore.setState({ isAuthenticated: true, userId: 'me' });
    vi.spyOn(chatApi, 'getBlockedUsers').mockResolvedValue([
      { id: 'usr-bad', username: 'spammer', displayName: 'Spammer', avatar: null },
    ]);

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useBlockedUsers(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
    });

    expect(result.current.data?.[0].username).toBe('spammer');
  });
});
