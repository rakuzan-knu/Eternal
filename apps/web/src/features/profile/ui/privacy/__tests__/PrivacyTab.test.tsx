import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    count: vi.fn().mockResolvedValue(2),
    list: vi.fn().mockResolvedValue({ data: [], meta: { nextCursor: null, hasNextPage: false } }),
    accept: vi.fn().mockResolvedValue({ success: true }),
    reject: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/features/profile/api/followRequestsApi', () => ({
  followRequestsApi: {
    count: vi.fn().mockResolvedValue(2),
    list: vi.fn().mockResolvedValue({ data: [], meta: { nextCursor: null, hasNextPage: false } }),
    accept: vi.fn().mockResolvedValue({ success: true }),
    reject: vi.fn().mockResolvedValue({ success: true }),
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

  it('renders private account toggle, follow requests button, and privacy dimension list', async () => {
    queryClient.setQueryData([PRIVACY_KEY], {
      isPrivate: true,
      allowNearbyRecommendations: true,
      lastSeen: 'EVERYBODY',
    });
    queryClient.setQueryData([FOLLOW_REQUESTS_KEY, 'count'], 2);
    queryClient.setQueryData([FOLLOW_REQUESTS_KEY, 'list'], {
      data: [],
      meta: { nextCursor: null, hasNextPage: false },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PrivacyTab />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Private account')).toBeInTheDocument();
    expect(screen.getByText('Follow Requests')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Who can see you and contact you')).toBeInTheDocument();

    // Click Follow Requests
    fireEvent.click(screen.getByText('Follow Requests'));
    expect(await screen.findByText('No pending requests')).toBeInTheDocument();

    // Click Last Seen
    fireEvent.click(screen.getByText('Last Seen'));
    expect(screen.getByText('Who can see this')).toBeInTheDocument();
  });

  it('renders error message on load failure', async () => {
    vi.mocked(privacyApi.getPrivacy).mockRejectedValueOnce(new Error('Network error'));
    queryClient.clear();

    render(
      <QueryClientProvider client={queryClient}>
        <PrivacyTab />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Failed to load privacy settings')).toBeInTheDocument();
  });
});
