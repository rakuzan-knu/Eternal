import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGitHubPRCount } from '../useGitHubPRCount';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useGitHubPRCount', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 0 when githubUsername is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useGitHubPRCount(''), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });

  it('counts merged PRs matching the username', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { merged_at: '2026-01-01', user: { login: 'octocat' } },
        { merged_at: '2026-01-02', user: { login: 'octocat' } },
        { merged_at: null, user: { login: 'octocat' } },
        { merged_at: '2026-01-03', user: { login: 'other' } },
      ],
    });

    const { result } = renderHook(() => useGitHubPRCount('octocat'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(2);
  });

  it('handles network error gracefully and returns 0', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useGitHubPRCount('octocat'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });
});
