import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PrivateAccountToggle from '../PrivateAccountToggle';
import { privacyApi } from '../../../api/privacyApi';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PRIVACY_KEY } from '@/shared/api/queryKeys';
import React from 'react';

vi.mock('../../../api/privacyApi', () => ({
  privacyApi: {
    getPrivacy: vi.fn(),
    updatePrivacy: vi.fn(),
  },
}));

vi.mock('@/features/profile/api/privacyApi', () => ({
  privacyApi: {
    getPrivacy: vi.fn(),
    updatePrivacy: vi.fn(),
  },
}));

describe('PrivateAccountToggle', () => {
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

  it('opens confirmation modal before turning account private', async () => {
    vi.mocked(privacyApi.updatePrivacy).mockResolvedValue({ isPrivate: true } as unknown as never);
    queryClient.setQueryData([PRIVACY_KEY], { isPrivate: false });

    render(
      <QueryClientProvider client={queryClient}>
        <PrivateAccountToggle />
      </QueryClientProvider>,
    );

    const toggle = screen.getByRole('switch', { name: 'Private account' });
    fireEvent.click(toggle);

    expect(screen.getByText('Make account private?')).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: 'Make private' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(privacyApi.updatePrivacy).toHaveBeenCalledWith({ isPrivate: true });
    });
  });
});
