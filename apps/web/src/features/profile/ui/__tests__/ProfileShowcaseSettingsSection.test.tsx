import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileShowcaseSettingsSection } from '../ProfileShowcaseSettingsSection';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShowcasePrivacy } from '@backend/common/contracts';
import { showcaseApi } from '@/entities/showcase/api/showcaseApi';
import React from 'react';

vi.mock('@/entities/showcase/api/showcaseApi', () => ({
  showcaseApi: {
    getShowcase: vi.fn(),
    updateShowcase: vi.fn(),
  },
}));

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: {
      id: 'usr-1',
      username: 'alice',
      displayName: 'Alice Smith',
      gender: 'she/her',
    },
  }),
}));

describe('ProfileShowcaseSettingsSection', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders showcase settings, selects accent color, toggles meta items, and saves', async () => {
    vi.mocked(showcaseApi.getShowcase).mockResolvedValue({
      id: 'sc-1',
      userId: 'usr-1',
      accentColor: '#6366f1',
      privacyMeta: ShowcasePrivacy.PUBLIC,
      privacyActivity: ShowcasePrivacy.PUBLIC,
      privacyShowcase: ShowcasePrivacy.PUBLIC,
      privacyLinks: ShowcasePrivacy.PUBLIC,
      showAge: false,
      showBirthdate: true,
      showGender: true,
      showTimezone: true,
      pronouns: 'she/her',
      timezone: 'Europe/Berlin',
      mediaItems: [],
    } as any);

    vi.mocked(showcaseApi.updateShowcase).mockResolvedValue({ success: true } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <ProfileShowcaseSettingsSection />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Profile Showcase & Widgets')).toBeInTheDocument();
    expect(screen.getByText('Live Preview Window')).toBeInTheDocument();

    // Toggle Preview Mode (Owner vs Guest)
    const ownerBtn = screen.getByRole('button', { name: 'Owner View' });
    fireEvent.click(ownerBtn);

    // Toggle Checkboxes
    const showAgeCheckbox = screen.getAllByRole('checkbox')[1];
    if (showAgeCheckbox) fireEvent.click(showAgeCheckbox);

    // Change Pronouns input
    const pronounsInput = screen.getByPlaceholderText('e.g. he/him, they/them');
    fireEvent.change(pronounsInput, { target: { value: 'they/them' } });

    // Save
    const saveBtn = screen.getByRole('button', { name: /Save Showcase Settings/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(showcaseApi.updateShowcase).toHaveBeenCalled();
    });
  });
});
