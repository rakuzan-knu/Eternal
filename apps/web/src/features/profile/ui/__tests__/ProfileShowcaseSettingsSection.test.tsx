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

  it('renders redesigned showcase settings, tests custom color picker, custom privacy select, and saves', async () => {
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

    // Verify "Listening to music" appears and "Listening on Spotify" does NOT
    expect(screen.getByText('Listening to music')).toBeInTheDocument();
    expect(screen.queryByText(/Listening on Spotify/i)).toBeNull();

    // Verify mini widgets appear
    expect(screen.getByText('ELDEN RING')).toBeInTheDocument();
    expect(screen.getByText('Top 5 Slots')).toBeInTheDocument();
    expect(screen.getByText('Slot 5')).toBeInTheDocument();

    // Pick custom RGB color
    const colorInput = screen.getByLabelText('Custom RGB color picker');
    fireEvent.change(colorInput, { target: { value: '#ff0055' } });

    // Custom Privacy Select interaction
    const privacyButtons = screen.getAllByRole('button', { name: /Public \(Everyone\)/i });
    expect(privacyButtons.length).toBeGreaterThan(0);
    fireEvent.click(privacyButtons[0]);

    // Select "Only Me"
    const onlyMeOption = await screen.findByRole('option', { name: /Only Me/i });
    fireEvent.click(onlyMeOption);

    // Save
    const saveBtn = screen.getByRole('button', { name: /Save Showcase Settings/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(showcaseApi.updateShowcase).toHaveBeenCalledWith(
        expect.objectContaining({
          accentColor: '#ff0055',
          privacyMeta: ShowcasePrivacy.PRIVATE,
          showAge: false,
          showBirthdate: true,
          showGender: true,
          showTimezone: true,
          pronouns: 'she/her',
          timezone: 'Europe/Berlin',
        }),
      );
    });
  });
});
