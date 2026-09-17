import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShowcaseQuickEditor } from '../ShowcaseQuickEditor';
import {
  ShowcaseMediaType,
  ShowcasePrivacy,
  type ProfileShowcaseDto,
} from '@backend/common/contracts';

const mockShowcase: ProfileShowcaseDto = {
  id: 'showcase-1',
  userId: 'user-1',
  hasVisibleWidgets: true,
  relationship: 'SELF',
  privacyMeta: ShowcasePrivacy.PUBLIC,
  privacyActivity: ShowcasePrivacy.PUBLIC,
  privacyShowcase: ShowcasePrivacy.PUBLIC,
  privacyLinks: ShowcasePrivacy.PUBLIC,
  accentColor: '#6366f1',
  showAge: true,
  showBirthdate: true,
  showGender: true,
  showTimezone: true,
  pronouns: 'he/him',
  timezone: 'UTC',
  birthDate: '2000-08-15',
  age: 26,
  gender: 'Male',
  zodiacSign: '♌ Leo',
  localTime: '18:30 (UTC)',
  connectedAccounts: {
    github: 'ayatedev',
    steam: 'ayate_steam',
    spotify: 'ayate_spotify',
    discord: 'ayate#0001',
    twitch: 'ayate_live',
  },
  activityStatus: null,
  spotlightMedia: {
    title: 'Dota 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg',
    customBannerUrl: 'https://media.giphy.com/media/dota.gif',
    subtitle: 'Pos 1 Carry',
    tags: ['🎮 Looking for teammates', '🔥 Main'],
    rating: 9.5,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/570/Dota_2/',
  },
  anthemTrack: {
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    albumArt: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17',
    previewUrl: 'https://audio-ssl.itunes.apple.com/preview.mp3',
    spotifyUrl: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
    durationMs: 200000,
  },
  mediaItems: [
    {
      id: 'm-1',
      type: ShowcaseMediaType.GAME,
      isWishlist: false,
      title: 'Minecraft',
      posterUrl: 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025',
      rating: 9.5,
      releaseYear: 2011,
      position: 0,
      tags: ['💖 Favorite'],
      userComment: 'Best sandbox game ever',
    },
    {
      id: 'm-2',
      type: ShowcaseMediaType.GAME,
      isWishlist: true,
      title: 'Hollow Knight: Silksong',
      posterUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f',
      rating: 10,
      releaseYear: 2025,
      position: 0,
      tags: ['⏳ Anticipated Release'],
    },
  ],
};

const mockMutateAsync = vi.fn().mockResolvedValue({});
vi.mock('@/entities/showcase/model/useShowcase', () => ({
  useMediaSearch: vi.fn(() => ({ data: [] })),
  useTrackSearch: vi.fn(() => ({ data: [] })),
  useUpdateShowcase: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

describe('ShowcaseQuickEditor', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockMutateAsync.mockClear();
  });

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof ShowcaseQuickEditor>> = {},
  ) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ShowcaseQuickEditor isOpen={true} onClose={vi.fn()} showcase={mockShowcase} {...props} />
      </QueryClientProvider>,
    );
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ShowcaseQuickEditor isOpen={false} onClose={vi.fn()} showcase={mockShowcase} />
      </QueryClientProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders tabs and allows switching between tabs', () => {
    renderComponent();

    expect(screen.getByText('Customize Profile Showcase')).toBeInTheDocument();
    expect(screen.getByText('Favorite')).toBeInTheDocument();
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByText('Profile Anthem')).toBeInTheDocument();
    expect(screen.getByText('Wishlist Backlog')).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();

    // Switch to Spotlight
    fireEvent.click(screen.getByText('Favorite'));
    expect(screen.getByText('Dota 2')).toBeInTheDocument();

    // Switch to Personal Meta
    fireEvent.click(screen.getByText('Personal Information'));
    expect(screen.getByText('Show Age')).toBeInTheDocument();

    // Switch to Anthem
    fireEvent.click(screen.getByText('Profile Anthem'));
    expect(screen.getByText('Blinding Lights')).toBeInTheDocument();

    // Switch to Wishlist
    fireEvent.click(screen.getByText('Wishlist Backlog'));
    expect(screen.getByText('Hollow Knight: Silksong')).toBeInTheDocument();

    // Switch to Privacy & Theme
    fireEvent.click(screen.getByText('Privacy'));
    expect(screen.getByText('Accent Glow Theme Color:')).toBeInTheDocument();
  });

  it('saves changes when clicking Save button', async () => {
    const onClose = vi.fn();
    renderComponent({ onClose });

    const saveBtn = screen.getByText('Save Showcase');
    fireEvent.click(saveBtn);

    expect(mockMutateAsync).toHaveBeenCalled();
  });

  it('modifies spotlight fields and saves', () => {
    renderComponent({ initialTab: 'spotlight' });

    const subtitleInput = screen.getByDisplayValue('Pos 1 Carry');
    fireEvent.change(subtitleInput, { target: { value: 'Pos 2 Mid' } });

    const saveBtn = screen.getByText('Save Showcase');
    fireEvent.click(saveBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        spotlightMedia: expect.objectContaining({
          subtitle: 'Pos 2 Mid',
        }),
      }),
    );
  });

  it('modifies meta fields and toggles', () => {
    renderComponent({ initialTab: 'meta' });

    const pronounsInput = screen.getByDisplayValue('he/him');
    fireEvent.change(pronounsInput, { target: { value: 'they/them' } });

    const saveBtn = screen.getByText('Save Showcase');
    fireEvent.click(saveBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        pronouns: 'they/them',
      }),
    );
  });

  it('modifies privacy fields and saves', () => {
    renderComponent({ initialTab: 'privacy' });

    // Click on an accent color circle
    const colorButtons = screen.getAllByRole('button');
    const purpleButton = colorButtons.find((btn) =>
      btn.getAttribute('style')?.includes('rgb(168, 85, 247)'),
    );
    if (purpleButton) fireEvent.click(purpleButton);

    const saveBtn = screen.getByText('Save Showcase');
    fireEvent.click(saveBtn);

    expect(mockMutateAsync).toHaveBeenCalled();
  });
});
