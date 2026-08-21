import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PrivacySettingPanel from '../PrivacySettingPanel';
import { privacyApi } from '../../../api/privacyApi';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PRIVACY_KEY } from '@/shared/api/queryKeys';
import React from 'react';

vi.mock('../../../api/privacyApi', () => ({
  privacyApi: {
    getPrivacy: vi.fn(),
    updatePrivacy: vi.fn(),
    listExceptions: vi.fn(),
    addException: vi.fn(),
    removeException: vi.fn(),
  },
}));

vi.mock('@/features/profile/api/privacyApi', () => ({
  privacyApi: {
    getPrivacy: vi.fn(),
    updatePrivacy: vi.fn(),
    listExceptions: vi.fn(),
    addException: vi.fn(),
    removeException: vi.fn(),
  },
}));

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: { id: 'u1', username: 'alex', displayName: 'Alex' },
  }),
}));

describe('PrivacySettingPanel', () => {
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

  it('renders privacy setting radio options and exception sections', async () => {
    vi.mocked(privacyApi.updatePrivacy).mockResolvedValue({
      lastSeen: 'NOBODY',
    } as unknown as never);
    vi.mocked(privacyApi.listExceptions).mockResolvedValue({
      allow: [],
      deny: [],
    } as unknown as never);
    queryClient.setQueryData([PRIVACY_KEY], { lastSeen: 'EVERYBODY' });

    render(
      <QueryClientProvider client={queryClient}>
        <PrivacySettingPanel dimension="LAST_SEEN" title="Last Seen" onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Who can see this')).toBeInTheDocument();
    expect(screen.getByText('Always share with')).toBeInTheDocument();
    expect(screen.getByText('Never share with')).toBeInTheDocument();

    const nobodyOption = screen.getByText('Nobody');
    fireEvent.click(nobodyOption);

    await waitFor(() => {
      expect(privacyApi.updatePrivacy).toHaveBeenCalledWith({ lastSeen: 'NOBODY' });
    });
  });
});
