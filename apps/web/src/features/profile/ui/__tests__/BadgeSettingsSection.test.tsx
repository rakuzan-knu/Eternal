import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BadgeSettingsSection } from '../BadgeSettingsSection';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { userApi } from '@/entities/profile/api/userApi';

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: vi.fn(() => ({
    data: {
      id: 'usr-1',
      username: 'alice',
      displayName: 'Alice Smith',
      avatar: null,
      banner: null,
      isVerified: true,
      primaryBadge: null,
      badges: ['PREMIUM', 'CONTRIBUTOR'],
      subscriptionMonths: 3,
      prCount: 5,
      reportCount: 2,
    },
  })),
}));

vi.mock('@/entities/profile/api/userApi', () => ({
  userApi: {
    updatePrimaryBadge: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('BadgeSettingsSection', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders badge settings section title and preview card', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BadgeSettingsSection />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Profile Badges')).toBeInTheDocument();
  });

  it('handles badge selection, save changes, remove badge, and modal previews', async () => {
    vi.mocked(userApi.updatePrimaryBadge).mockResolvedValueOnce({ success: true } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <BadgeSettingsSection />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Your Available Badges:')).toBeInTheDocument();

    // Select Premium badge
    const badgeCards = screen.getAllByRole('button', { name: /View 7 Tier Levels/i });
    expect(badgeCards.length).toBeGreaterThan(0);

    // Open premium modal
    fireEvent.click(badgeCards[0]);
    expect(screen.getByText('Evolving Profile Badges')).toBeInTheDocument();

    // Close modal
    const closeBtn = document.querySelectorAll('button')[0];
    fireEvent.click(closeBtn);

    // Select contributor badge card
    const contributorText = screen.getByText('Contributor');
    fireEvent.click(contributorText);

    // Save changes
    const saveBtn = screen.getByRole('button', { name: 'Save changes' });
    expect(saveBtn).toBeEnabled();
    fireEvent.click(saveBtn);

    // Remove badge
    const removeBtn = await screen.findByRole('button', { name: 'Remove Badge' });
    fireEvent.click(removeBtn);
  });
});
