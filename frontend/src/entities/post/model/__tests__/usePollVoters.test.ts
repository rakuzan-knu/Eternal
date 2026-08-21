import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePollVoters } from '../usePollVoters';
import { postsApi } from '../../api/postsApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/postsApi', () => ({
  postsApi: {
    getPollVoters: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('usePollVoters', () => {
  it('fetches poll voters for a given post id', async () => {
    const mockVoters = [
      {
        optionId: 'opt-1',
        voters: [{ id: 'u1', username: 'user1', displayName: 'User One', avatar: null }],
      },
    ];
    vi.mocked(postsApi.getPollVoters).mockResolvedValue(mockVoters);

    const { result } = renderHook(() => usePollVoters('post-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockVoters);
    expect(postsApi.getPollVoters).toHaveBeenCalledWith('post-123');
  });
});
