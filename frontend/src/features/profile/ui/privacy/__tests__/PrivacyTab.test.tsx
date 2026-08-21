import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrivacyTab from '../PrivacyTab';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PRIVACY_KEY, FOLLOW_REQUESTS_KEY } from '@/shared/api/queryKeys';
import { privacyApi } from '../../../api/privacyApi';
import React from 'react';

vi.mock('../../../api/privacyApi', () => ({
  privacyApi: {
    getPrivacy: vi.fn(),
    updatePrivacy: vi.fn(),
  },
}));

vi.mock('../../../api/followRequestsApi', () => ({
  followRequestsApi: {
    count: vi.fn(),
    list: vi.fn(),
    accept: vi.fn(),
    reject: vi.fn(),
  },
}));

describe('PrivacyTab', () => {
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

  it('renders private account toggle, follow requests button, and privacy dimension list', () => {
    queryClient.setQueryData([PRIVACY_KEY], {
      isPrivate: true,
      allowNearbyRecommendations: true,
      lastSeen: 'EVERYBODY',
    });
    queryClient.setQueryData([FOLLOW_REQUESTS_KEY, 'count'], 2);

    render(
      <QueryClientProvider client={queryClient}>
        <PrivacyTab />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Private account')).toBeInTheDocument();
    expect(screen.getByText('Follow Requests')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Who can see you and contact you')).toBeInTheDocument();
  });
});
