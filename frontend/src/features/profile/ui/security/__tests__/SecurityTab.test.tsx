import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SecurityTab from '../SecurityTab';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SESSIONS_KEY, PRIVACY_KEY } from '@/shared/api/queryKeys';
import { privacyApi } from '../../../api/privacyApi';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

vi.mock('../../../api/sessionsApi', () => ({
  sessionsApi: {
    list: vi.fn(),
    revoke: vi.fn(),
    revokeAllOthers: vi.fn(),
  },
}));

vi.mock('../../../api/privacyApi', () => ({
  privacyApi: {
    getPrivacy: vi.fn(),
    updatePrivacy: vi.fn(),
  },
}));

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: { id: 'user-1', username: 'testuser', displayName: 'Test User' },
  }),
}));

describe('SecurityTab', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    useAuthStore.setState({ isAuthenticated: true, userId: 'u1' });
    vi.clearAllMocks();
    vi.mocked(privacyApi.getPrivacy).mockResolvedValue({
      isPrivate: false,
      allowNearbyRecommendations: true,
      lastSeen: 'EVERYBODY',
      autoDeletePeriod: 'OFF',
    } as any);
  });

  it('renders all security settings rows and triggers modals', () => {
    queryClient.setQueryData(
      [SESSIONS_KEY],
      [{ id: 'sess-1', deviceName: 'Chrome', isCurrent: true, lastActiveAt: '2026-01-01' }],
    );
    queryClient.setQueryData([PRIVACY_KEY], { autoDeletePeriod: 'OFF' });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SecurityTab />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Change password')).toBeInTheDocument();
    expect(screen.getByText('Auto-Delete Timer')).toBeInTheDocument();
    expect(screen.getByText('Blocked users')).toBeInTheDocument();
    expect(screen.getByText('Active sessions')).toBeInTheDocument();
    expect(screen.getByText('Account Deletion')).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(deleteBtn);
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });
});
