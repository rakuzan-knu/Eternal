import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FollowRequestsPanel from '../FollowRequestsPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FOLLOW_REQUESTS_KEY } from '@/shared/api/queryKeys';
import { followRequestsApi } from '../../../api/followRequestsApi';
import { useAuthStore } from '@/shared/model/useAuthStore';
import React from 'react';

vi.mock('../../../api/followRequestsApi', () => ({
  followRequestsApi: {
    list: vi.fn(),
    accept: vi.fn(),
    reject: vi.fn(),
  },
}));

vi.mock('@/features/profile/api/followRequestsApi', () => ({
  followRequestsApi: {
    list: vi.fn(),
    accept: vi.fn(),
    reject: vi.fn(),
  },
}));

describe('FollowRequestsPanel', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    useAuthStore.setState({ isAuthenticated: true, userId: 'u1' });
    vi.clearAllMocks();
    vi.mocked(followRequestsApi.list).mockResolvedValue({
      data: [],
      meta: { nextCursor: null, hasNextPage: false },
    } as any);
  });

  it('renders pending follow requests and handles accept', async () => {
    vi.mocked(followRequestsApi.accept).mockResolvedValue({ success: true } as unknown as never);

    queryClient.setQueryData([FOLLOW_REQUESTS_KEY, 'list'], {
      data: [{ id: 'req-1', username: 'requester', displayName: 'Requester', avatar: null }],
      meta: { nextCursor: null, hasNextPage: false },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <FollowRequestsPanel onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Requester')).toBeInTheDocument();
    expect(screen.getByText('@requester')).toBeInTheDocument();

    const acceptBtn = screen.getByRole('button', { name: /accept/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(followRequestsApi.accept).toHaveBeenCalledWith('req-1');
    });
  });

  it('handles reject follow request', async () => {
    vi.mocked(followRequestsApi.reject).mockResolvedValue({ success: true } as unknown as never);

    queryClient.setQueryData([FOLLOW_REQUESTS_KEY, 'list'], {
      data: [{ id: 'req-2', username: 'requester2', displayName: 'Requester 2', avatar: null }],
      meta: { nextCursor: null, hasNextPage: false },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <FollowRequestsPanel onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Requester 2')).toBeInTheDocument();
    expect(screen.getByText('@requester2')).toBeInTheDocument();

    const rejectBtn = screen.getByRole('button', { name: /reject/i });
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(followRequestsApi.reject).toHaveBeenCalledWith('req-2');
    });
  });
});
