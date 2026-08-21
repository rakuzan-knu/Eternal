import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NearbyRecommendationsToggle from '../NearbyRecommendationsToggle';
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

describe('NearbyRecommendationsToggle', () => {
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

  it('renders toggle and triggers update on click', async () => {
    vi.mocked(privacyApi.updatePrivacy).mockResolvedValue({
      allowNearbyRecommendations: false,
    } as unknown as never);
    queryClient.setQueryData([PRIVACY_KEY], { allowNearbyRecommendations: true });

    render(
      <QueryClientProvider client={queryClient}>
        <NearbyRecommendationsToggle />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Show me in nearby recommendations')).toBeInTheDocument();
    const toggle = screen.getByRole('switch', { name: 'Show in nearby recommendations' });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(privacyApi.updatePrivacy).toHaveBeenCalledWith({ allowNearbyRecommendations: false });
    });
  });
});
