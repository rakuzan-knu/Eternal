import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SessionsPanel from '../SessionsPanel';
import { sessionsApi } from '../../../api/sessionsApi';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SESSIONS_KEY } from '@/shared/api/queryKeys';
import React from 'react';

vi.mock('../../../api/sessionsApi', () => ({
  sessionsApi: {
    list: vi.fn(),
    revoke: vi.fn(),
    revokeAllOthers: vi.fn(),
  },
}));

vi.mock('@/features/profile/api/sessionsApi', () => ({
  sessionsApi: {
    list: vi.fn(),
    revoke: vi.fn(),
    revokeAllOthers: vi.fn(),
  },
}));

describe('SessionsPanel', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    useAuthStore.setState({ isAuthenticated: true, userId: 'u1' });
    vi.clearAllMocks();
    vi.mocked(sessionsApi.list).mockResolvedValue([] as any);
  });

  it('renders active sessions list and revokes session', async () => {
    vi.mocked(sessionsApi.revoke).mockResolvedValue({ success: true } as unknown as never);

    queryClient.setQueryData(
      [SESSIONS_KEY],
      [
        {
          id: 's1',
          deviceName: 'MacBook',
          isCurrent: true,
          lastActiveAt: '2026-01-01',
          ip: '127.0.0.1',
        },
        {
          id: 's2',
          deviceName: 'iPhone',
          isCurrent: false,
          lastActiveAt: '2026-01-01',
          ip: '127.0.0.2',
        },
      ],
    );

    render(
      <QueryClientProvider client={queryClient}>
        <SessionsPanel onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Active sessions')).toBeInTheDocument();
    expect(screen.getByText('This device')).toBeInTheDocument();
    expect(screen.getByText('iPhone')).toBeInTheDocument();

    const revokeBtn = screen.getByRole('button', { name: 'Revoke' });
    fireEvent.click(revokeBtn);

    await waitFor(() => {
      expect(sessionsApi.revoke).toHaveBeenCalledWith('s2');
    });
  });

  it('terminates all other sessions', async () => {
    vi.mocked(sessionsApi.revokeAllOthers).mockResolvedValue({ success: true } as unknown as never);

    queryClient.setQueryData(
      [SESSIONS_KEY],
      [
        {
          id: 's1',
          deviceName: 'MacBook',
          isCurrent: true,
          lastActiveAt: '2026-01-01',
          ip: '127.0.0.1',
        },
        {
          id: 's2',
          deviceName: 'iPhone',
          isCurrent: false,
          lastActiveAt: '2026-01-01',
          ip: '127.0.0.2',
        },
      ],
    );

    render(
      <QueryClientProvider client={queryClient}>
        <SessionsPanel onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    const terminateAllBtn = screen.getByRole('button', { name: /terminate all other sessions/i });
    fireEvent.click(terminateAllBtn);

    await waitFor(() => {
      expect(sessionsApi.revokeAllOthers).toHaveBeenCalled();
    });
  });
});
