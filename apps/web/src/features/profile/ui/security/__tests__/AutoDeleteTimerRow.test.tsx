import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AutoDeleteTimerRow from '../AutoDeleteTimerRow';
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

describe('AutoDeleteTimerRow', () => {
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

  it('opens panel and handles period selection confirmation', async () => {
    vi.mocked(privacyApi.updatePrivacy).mockResolvedValue({
      autoDeletePeriod: 'DAY',
    } as unknown as never);
    queryClient.setQueryData([PRIVACY_KEY], { autoDeletePeriod: 'OFF' });

    render(
      <QueryClientProvider client={queryClient}>
        <AutoDeleteTimerRow />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Auto-Delete Timer')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Auto-Delete Timer'));

    // SlideOverPanel is open
    expect(screen.getByText('After 1 day')).toBeInTheDocument();
    fireEvent.click(screen.getByText('After 1 day'));

    // Confirmation modal is open
    expect(screen.getByText('Enable Auto-Delete Timer?')).toBeInTheDocument();
    const enableBtn = screen.getByRole('button', { name: 'Enable' });
    fireEvent.click(enableBtn);

    await waitFor(() => {
      expect(privacyApi.updatePrivacy).toHaveBeenCalledWith({ autoDeletePeriod: 'DAY' });
    });
  });

  it('handles selecting OFF directly and cancelling confirmation modal', async () => {
    vi.mocked(privacyApi.updatePrivacy).mockResolvedValue({
      autoDeletePeriod: 'OFF',
    } as unknown as never);
    queryClient.setQueryData([PRIVACY_KEY], { autoDeletePeriod: 'DAY' });

    render(
      <QueryClientProvider client={queryClient}>
        <AutoDeleteTimerRow />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByText('Auto-Delete Timer'));

    // Select Disabled (OFF)
    fireEvent.click(screen.getByText('Disabled'));
    await waitFor(() => {
      expect(privacyApi.updatePrivacy).toHaveBeenCalledWith({ autoDeletePeriod: 'OFF' });
    });

    // Reopen and test cancel
    fireEvent.click(screen.getByText('Auto-Delete Timer'));
    fireEvent.click(screen.getByText('After 1 week'));
    expect(screen.getByText('Enable Auto-Delete Timer?')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('Enable Auto-Delete Timer?')).not.toBeInTheDocument();
    });
  });
});
