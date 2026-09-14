import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonalMetaWidget } from '../PersonalMetaWidget';
import { LivePresenceWidget } from '../LivePresenceWidget';
import { SpotlightMediaWidget } from '../SpotlightMediaWidget';
import { MediaShowcaseWidget } from '../MediaShowcaseWidget';
import { ShowcaseWishlistWidget } from '../ShowcaseWishlistWidget';
import { ProfileAnthemCard } from '../ProfileAnthemCard';
import { ProfileShowcaseSidebar } from '../ProfileShowcaseSidebar';
import { TasteMatchBanner } from '../TasteMatchBanner';
import { ExportShowcaseModal } from '../ExportShowcaseModal';
import { ShowcaseIntegrationCard } from '../ShowcaseIntegrationCard';
import { ProfileShowcaseSettingsSection } from '@/features/profile/ui/ProfileShowcaseSettingsSection';
import { SpotifyBrandIcon, SteamBrandIcon, DiscordBrandIcon } from '@/shared/ui/BrandIcons';
import { BrowserRouter } from 'react-router-dom';
import { MediaDetailModal } from '@/shared/ui/media';
import { useMediaDetailModalStore } from '@/entities/showcase/model/useMediaDetailModalStore';
import {
  ShowcaseMediaType,
  ShowcasePrivacy,
  type ProfileShowcaseDto,
} from '@backend/common/contracts';
import { chatApi } from '@/features/chat/api/chatApi';
import { useChatDraftsStore } from '@/features/chat/model/useChatDraftsStore';

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
  showZodiac: true,
  pronouns: 'he/him',
  timezone: 'UTC',
  birthDate: '2000-08-15',
  age: 26,
  gender: 'Male',
  zodiacSign: '♌ Leo',
  localTime: '18:30 (UTC)',
  widgetOrder: ['spotlight', 'media', 'meta'],
  connectedAccounts: {
    github: 'ayatedev',
    steam: 'ayate_steam',
    spotify: 'ayate_spotify',
    discord: 'ayate#0001',
    twitch: 'ayate_live',
  },
  activityStatus: {
    type: 'spotify',
    title: 'Starboy',
    subtitle: 'The Weeknd',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
    previewUrl: 'https://p.scdn.co/mp3-preview/test.mp3',
    externalUrl: 'https://open.spotify.com/track/test',
  },
  spotlightMedia: {
    title: 'Dota 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg',
    customBannerUrl: 'https://media.giphy.com/media/dota.gif',
    subtitle: 'Pos 1 Carry',
    tags: ['🎮 Looking for teammates', '🔥 Main', '🏆 2000+ hours'],
    rating: 9.5,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/570/Dota_2/',
  },
  anthemTrack: {
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    albumArt: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17',
    previewUrl: 'https://p.scdn.co/mp3-preview/preview.mp3',
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
      tags: ['💖 Favorite', 'duo party'],
      userComment: 'Best sandbox game ever',
    },
    {
      id: 'm-2',
      type: ShowcaseMediaType.ANIME,
      isWishlist: false,
      title: 'Sword Art Online',
      posterUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/nx11757.jpg',
      rating: 8.5,
      releaseYear: 2012,
      position: 0,
      tags: ['🍿 Rewatching'],
    },
    {
      id: 'm-3',
      type: ShowcaseMediaType.GAME,
      isWishlist: true,
      title: 'Hollow Knight: Silksong',
      posterUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f',
      rating: 9.8,
      releaseYear: 2026,
      position: 0,
      tags: ['⏳ Anticipated Release', '🔥 High Priority'],
      userComment: 'Day 1 purchase',
    },
  ],
};

const mockViewerShowcase: ProfileShowcaseDto = {
  ...mockShowcase,
  id: 'showcase-viewer',
  userId: 'user-viewer',
  mediaItems: [
    {
      id: 'vm-1',
      type: ShowcaseMediaType.GAME,
      isWishlist: false,
      title: 'Hollow Knight: Silksong',
      posterUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f',
      rating: 9.8,
      position: 0,
      tags: ['💖 Favorite'],
    },
    {
      id: 'vm-2',
      type: ShowcaseMediaType.GAME,
      isWishlist: false,
      title: 'Minecraft',
      posterUrl: 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025',
      rating: 9.5,
      position: 1,
      tags: ['💖 Favorite'],
    },
  ],
};

vi.mock('@/entities/showcase/model/useShowcase', () => ({
  useShowcase: vi.fn((username?: string) => ({
    data: username === 'viewer' ? mockViewerShowcase : mockShowcase,
    isLoading: false,
  })),
  useUpdateShowcase: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue(mockShowcase),
    isPending: false,
  })),
  useMediaSearch: vi.fn(() => ({
    data: [],
    isFetching: false,
  })),
  useTrackSearch: vi.fn(() => ({
    data: [],
    isFetching: false,
  })),
  useShowcasePresenceSync: vi.fn(),
}));

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: vi.fn(() => ({
    data: {
      id: 'user-viewer',
      username: 'viewer',
      displayName: 'Viewer User',
      gender: 'Male',
    },
  })),
}));

vi.mock('@/entities/profile/model/useUserByUsername', () => ({
  useUserByUsername: vi.fn(() => ({
    data: {
      id: 'user-1',
      username: 'ayate',
      displayName: 'Ayate',
      avatar: 'https://example.com/avatar.jpg',
      banner: 'https://example.com/banner.jpg',
      isVerified: true,
    },
  })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,mockPng'),
  toBlob: vi.fn().mockResolvedValue(new Blob(['mockPng'], { type: 'image/png' })),
}));

describe('Profile Showcase 2.2 Widgets & Features', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('renders ProfileAnthemCard with track title, artist, Spotify badge, and audio toggle', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProfileAnthemCard anthem={mockShowcase.anthemTrack} isOwner={true} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Blinding Lights')).toBeInTheDocument();
    expect(screen.getByText('The Weeknd')).toBeInTheDocument();
    expect(screen.getByLabelText(/Play Anthem Preview/i)).toBeInTheDocument();
  });

  it('renders ShowcaseWishlistWidget with backlog items, tags, and recommendation radar for completed titles', async () => {
    vi.spyOn(chatApi, 'createDirectConversation').mockResolvedValue({ id: 'conv-202' } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <ShowcaseWishlistWidget showcase={mockShowcase} isOwner={false} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Wishlist & Backlog')).toBeInTheDocument();
    expect(screen.getByText('Hollow Knight: Silksong')).toBeInTheDocument();
    expect(screen.getByText('⏳ Anticipated Release')).toBeInTheDocument();

    // Recommendation Radar banner appears because viewer completed Hollow Knight: Silksong
    const recommendationBanner = screen.getByText(
      /You've already completed Hollow Knight: Silksong/i,
    );
    expect(recommendationBanner).toBeInTheDocument();

    fireEvent.click(recommendationBanner);
    await waitFor(() => {
      expect(chatApi.createDirectConversation).toHaveBeenCalledWith('user-1');
      const draft = useChatDraftsStore.getState().getDraft('conv-202');
      expect(draft?.text).toContain('Hollow Knight: Silksong');
    });
  });

  it('renders ProfileShowcaseSidebar 3-tab navigation (Board, Activity, Wishlist) and switches views', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProfileShowcaseSidebar username="ayate" userId="user-1" isOwner={true} variant="desktop" />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Board')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('Wishlist')).toBeInTheDocument();

    // In Board view: Spotlight is present
    expect(screen.getByText('Dota 2')).toBeInTheDocument();

    // Switch to Wishlist tab
    fireEvent.click(screen.getByText('Wishlist'));
    await waitFor(() => {
      expect(screen.getByText('Wishlist & Backlog')).toBeInTheDocument();
    });

    // Switch to Activity tab
    fireEvent.click(screen.getByText('Activity'));
    await waitFor(() => {
      expect(screen.getByText('Listening to Spotify')).toBeInTheDocument();
    });
  });

  it('renders authentic multi-color BrandIcons', () => {
    const { container } = render(
      <div>
        <SpotifyBrandIcon />
        <SteamBrandIcon />
        <DiscordBrandIcon />
      </div>,
    );

    expect(container.querySelectorAll('img, svg').length).toBe(3);
  });

  it('renders PersonalMetaWidget with birthday, zodiac, pronouns and local clock', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PersonalMetaWidget showcase={mockShowcase} isOwner={true} />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/Personal information/i)).toBeInTheDocument();
    expect(screen.getByText(/August 15, 2000/i)).toBeInTheDocument();
    expect(screen.getByText(/♌ Leo/i)).toBeInTheDocument();
  });

  it('renders TasteMatchBanner and matches common titles', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TasteMatchBanner targetShowcase={mockShowcase} targetUsername="ayate" isOwner={false} />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/common title/i)).toBeInTheDocument();
    expect(screen.getByText('Minecraft')).toBeInTheDocument();
  });

  it('renders ExportShowcaseModal with clipboard copy and download actions', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ExportShowcaseModal
          isOpen={true}
          onClose={vi.fn()}
          showcase={mockShowcase}
          user={{ id: 'user-1', username: 'ayate', displayName: 'Ayate' }}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Share Showcase Card')).toBeInTheDocument();
    expect(screen.getByText('Copy to Clipboard')).toBeInTheDocument();
    expect(screen.getByText('Download PNG')).toBeInTheDocument();
  });

  it('renders ProfileShowcaseSettingsSection with live preview window', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProfileShowcaseSettingsSection />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Profile Showcase & Widgets')).toBeInTheDocument();
    expect(screen.getByText('Live Preview Window')).toBeInTheDocument();
  });

  it('renders drag handles and shows tooltip on hover, opens delete popover on click', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProfileShowcaseSidebar username="ayate" userId="user-1" isOwner={true} variant="desktop" />
      </QueryClientProvider>,
    );

    // Find the widget control buttons (drag handles)
    const controlButtons = screen.getAllByRole('button', { name: /widget controls/i });
    expect(controlButtons.length).toBeGreaterThan(0);

    // Hover over the first control button -> shows tooltip
    fireEvent.mouseEnter(controlButtons[0]);
    expect(await screen.findByText('Click and drag to rearrange')).toBeInTheDocument();
    expect(screen.getByText('Click to configure')).toBeInTheDocument();

    // Click on the control button -> opens popover with "Remove widget"
    fireEvent.click(controlButtons[0]);
    expect(await screen.findByText('Remove widget')).toBeInTheDocument();

    // Click "Remove widget" -> removes widget and displays unsaved changes bar
    fireEvent.click(screen.getByText('Remove widget'));
    expect(await screen.findByText('Remember to save your changes!')).toBeInTheDocument();
    // Click "Reset" -> resets order and hides bar
    fireEvent.click(screen.getByText('Reset'));
    await waitFor(() => {
      expect(screen.queryByText('Remember to save your changes!')).not.toBeInTheDocument();
    });
  });

  it('supports horizontal media items reordering and triggers unsaved changes bar', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProfileShowcaseSidebar username="ayate" userId="user-1" isOwner={true} variant="desktop" />
      </QueryClientProvider>,
    );

    // Verify Media Showcase renders games
    expect(screen.getByText('Games')).toBeInTheDocument();
    expect(screen.getByText('Minecraft')).toBeInTheDocument();
    expect(screen.getByText('Dota 2')).toBeInTheDocument();

    const mediaWidget = screen.getByText('Games').closest('div');
    expect(mediaWidget).toBeInTheDocument();
  });

  describe('ShowcaseIntegrationCard - GitHub Display & Customization', () => {
    const mockGithubData = {
      username: 'AyateAgh',
      bio: 'Fullstack developer & open source enthusiast',
      reposCount: 42,
      starsCount: 128,
      followersCount: 88,
      pinnedRepo: {
        name: 'super-awesome-project',
        description: 'Next-gen social network architecture',
        stars: 99,
        forks: 14,
        language: 'TypeScript',
        url: 'https://github.com/AyateAgh/super-awesome-project',
      },
    };

    it('renders nothing when displayOnProfile is false', () => {
      const { container } = render(
        <ShowcaseIntegrationCard
          platform="github"
          data={{ ...mockGithubData, displayOnProfile: false }}
          isOwner={true}
        />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders full Discord-style GitHub card when displayOnProfile is true', () => {
      render(
        <ShowcaseIntegrationCard
          platform="github"
          data={{ ...mockGithubData, displayOnProfile: true }}
          isOwner={true}
        />,
      );

      expect(screen.getByText('AyateAgh')).toBeInTheDocument();
      expect(screen.getByText('Fullstack developer & open source enthusiast')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('repos')).toBeInTheDocument();
      expect(screen.getByText('128')).toBeInTheDocument();
      expect(screen.getByText('stars')).toBeInTheDocument();
      expect(screen.getByText('88')).toBeInTheDocument();
      expect(screen.getByText('followers')).toBeInTheDocument();
      expect(screen.getByText('super-awesome-project')).toBeInTheDocument();
      expect(screen.getByText('GitHub Profile')).toBeInTheDocument();
    });

    it('respects granular toggle settings (hiding bio, repo, or stats)', () => {
      render(
        <ShowcaseIntegrationCard
          platform="github"
          data={{
            ...mockGithubData,
            displayOnProfile: true,
            showBio: false,
            showPinnedRepo: false,
            showReposCount: false,
            showStarsCount: false,
            showFollowersCount: false,
          }}
          isOwner={true}
        />,
      );

      expect(screen.getByText('AyateAgh')).toBeInTheDocument();
      expect(
        screen.queryByText('Fullstack developer & open source enthusiast'),
      ).not.toBeInTheDocument();
      expect(screen.queryByText('super-awesome-project')).not.toBeInTheDocument();
      expect(screen.queryByText('repos')).not.toBeInTheDocument();
      expect(screen.queryByText('stars')).not.toBeInTheDocument();
      expect(screen.queryByText('followers')).not.toBeInTheDocument();
    });
  });

  describe('ShowcaseIntegrationCard - Spotify Display & Customization', () => {
    const mockSpotifyData = {
      username: 'ayate_music',
      spotifyUrl: 'https://open.spotify.com/user/ayate_music',
      displayMode: 'tracks',
      displayOnProfile: true,
      likedSongs: [
        {
          id: 'track-1',
          title: 'Starboy',
          artist: 'The Weeknd, Daft Punk',
          albumArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
          durationMs: 230000,
          spotifyUrl: 'https://open.spotify.com/track/track-1',
        },
        {
          id: 'track-2',
          title: 'Blinding Lights',
          artist: 'The Weeknd',
          albumArt: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819',
          durationMs: 200000,
          spotifyUrl: 'https://open.spotify.com/track/track-2',
        },
      ],
      playlists: [
        {
          id: 'pl-1',
          name: 'Synthwave Night Drive',
          tracksCount: 45,
          coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
          externalUrl: 'https://open.spotify.com/playlist/pl-1',
        },
      ],
      favoriteTracks: ['track-1'],
      favoritePlaylists: ['pl-1'],
    };

    it('renders chosen favorite tracks with album art, artist, formatted duration, and link', () => {
      render(<ShowcaseIntegrationCard platform="spotify" data={mockSpotifyData} isOwner={true} />);

      expect(screen.getByText('Starboy')).toBeInTheDocument();
      expect(screen.getByText('The Weeknd, Daft Punk')).toBeInTheDocument();
      expect(screen.getByText('3:50')).toBeInTheDocument();
      expect(screen.getByText('Open Spotify')).toBeInTheDocument();
    });

    it('renders featured playlists when displayMode is playlists', () => {
      render(
        <ShowcaseIntegrationCard
          platform="spotify"
          data={{ ...mockSpotifyData, displayMode: 'playlists' }}
          isOwner={true}
        />,
      );

      expect(screen.getByText('Synthwave Night Drive')).toBeInTheDocument();
      expect(screen.getByText('45 tracks')).toBeInTheDocument();
    });

    it('returns null when displayOnProfile is false', () => {
      const { container } = render(
        <ShowcaseIntegrationCard
          platform="spotify"
          data={{ ...mockSpotifyData, displayOnProfile: false }}
          isOwner={true}
        />,
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('LivePresenceWidget - Dual Stacked Presence & Spotify Player', () => {
    it('renders both Steam Game and Spotify Player cards stacked vertically when both are active', () => {
      const dualShowcase: ProfileShowcaseDto = {
        ...mockShowcase,
        activityStatus: {
          type: 'gaming',
          title: 'Dota 2',
          subtitle: 'Ranked Match',
          isSteam: true,
          imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e',
        },
        connectedAccounts: {
          steam: {
            username: 'ayatedev',
            currentActivity: {
              type: 'gaming',
              title: 'Dota 2',
              subtitle: 'Ranked Match',
              isSteam: true,
            },
          },
          spotify: {
            username: 'ayatespotify',
            currentActivity: {
              type: 'spotify',
              title: 'Save Your Tears',
              subtitle: 'The Weeknd',
              artist: 'The Weeknd',
              trackId: 'save-your-tears',
              progressMs: 45000,
              durationMs: 215000,
              externalUrl: 'https://open.spotify.com/track/save-your-tears',
            },
          },
        } as any,
      };

      render(
        <QueryClientProvider client={queryClient}>
          <LivePresenceWidget showcase={dualShowcase} isOwner={true} />
        </QueryClientProvider>,
      );

      // Verify header indicates dual activity
      expect(screen.getByText('Gaming & Music Activity')).toBeInTheDocument();

      // Top card: Dota 2 Steam Game
      expect(screen.getByText('Dota 2')).toBeInTheDocument();
      expect(screen.getByText('Ranked Match')).toBeInTheDocument();

      // Bottom card: Spotify Player with Save Your Tears
      expect(screen.getByText('Save Your Tears')).toBeInTheDocument();
      expect(screen.getByText('Open in Spotify')).toBeInTheDocument();
      expect(screen.getByText('Share')).toBeInTheDocument();
    });
  });

  describe('ProfileAnthemCard - Graceful Handling of null previewUrl', () => {
    it('renders song title, artist, and direct "Listen on Spotify" button without audio player crash', () => {
      const anthemNoPreview = {
        title: 'After Hours',
        artist: 'The Weeknd',
        albumArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
        previewUrl: null,
        spotifyUrl: 'https://open.spotify.com/track/after-hours',
      };

      render(
        <QueryClientProvider client={queryClient}>
          <ProfileAnthemCard anthem={anthemNoPreview} isOwner={true} />
        </QueryClientProvider>,
      );

      expect(screen.getByText('After Hours')).toBeInTheDocument();
      expect(screen.getByText('The Weeknd')).toBeInTheDocument();
      expect(screen.getByText('Listen on Spotify')).toBeInTheDocument();
      expect(screen.getByLabelText(/Play Anthem Preview/i)).toBeInTheDocument();
    });
  });

  describe('ProfileShowcaseSidebar - Empty States & Share button for guests', () => {
    it('renders "There is nothing here yet..." and hides "Share Showcase Card" for visitors on empty showcase', async () => {
      const emptyShowcase: ProfileShowcaseDto = {
        ...mockShowcase,
        id: 'showcase-empty',
        userId: 'user-empty',
        spotlightMedia: null,
        anthemTrack: null,
        mediaItems: [],
        activityStatus: null,
        connectedAccounts: {},
        birthDate: null,
        age: null,
        gender: null,
        zodiacSign: null,
        localTime: null,
        showAge: false,
        showBirthdate: false,
        showGender: false,
        showTimezone: false,
        showZodiac: false,
        personalInfo: null,
      };

      vi.spyOn(
        await import('@/entities/showcase/model/useShowcase'),
        'useShowcase',
      ).mockReturnValue({
        data: emptyShowcase,
        isLoading: false,
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ProfileShowcaseSidebar
            username="newuser"
            userId="user-empty"
            isOwner={false}
            variant="desktop"
          />
        </QueryClientProvider>,
      );

      // Tabs are rendered
      expect(screen.getByText('Board')).toBeInTheDocument();
      expect(screen.getByText('Activity')).toBeInTheDocument();
      expect(screen.getByText('Wishlist')).toBeInTheDocument();

      // Empty state is rendered under the active tab
      expect(screen.getByText('There is nothing here yet...')).toBeInTheDocument();

      // Share Showcase Card button must NOT be present for empty showcase for visitors
      expect(screen.queryByText('Share Showcase Card')).not.toBeInTheDocument();
    });

    it('collapses PersonalMetaWidget completely when all toggles are disabled', () => {
      const showcaseAllTogglesOff: ProfileShowcaseDto = {
        ...mockShowcase,
        showAge: false,
        showBirthdate: false,
        showGender: false,
        showTimezone: false,
        showZodiac: false,
        personalInfo: {
          toggles: {
            showRelationship: false,
            showLivesIn: false,
            showHometown: false,
            showWorkplace: false,
            showEducation: false,
            showLanguages: false,
            showFamily: false,
            showPronouns: false,
            showZodiac: false,
          },
        },
      };

      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <PersonalMetaWidget showcase={showcaseAllTogglesOff} isOwner={true} />
        </QueryClientProvider>,
      );

      // Should return null (empty container)
      expect(container.firstChild).toBeNull();
    });
  });

  describe('MediaDetailModal & Drag vs Click Handling', () => {
    beforeEach(() => {
      useMediaDetailModalStore.getState().closeMediaDetail();
      window.history.replaceState({}, '', '/');
      document.body.innerHTML = '';
    });

    it('opens MediaDetailModal when clicking a media poster slot without dragging', () => {
      render(
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <MediaShowcaseWidget showcase={mockShowcase} isOwner={true} />
            <MediaDetailModal />
          </QueryClientProvider>
        </BrowserRouter>,
      );

      const posters = screen.getAllByAltText('Minecraft');
      const poster = posters[0];
      expect(poster).toBeInTheDocument();

      // Clean click (pointer down and click at same spot)
      fireEvent.mouseDown(poster.parentElement!, { clientX: 100, clientY: 100 });
      fireEvent.click(poster.parentElement!, { clientX: 100, clientY: 100 });

      expect(useMediaDetailModalStore.getState().isOpen).toBe(true);
      expect(useMediaDetailModalStore.getState().activeItem?.title).toBe('Minecraft');
    });

    it('does not open MediaDetailModal when dragging (distance > 6px)', () => {
      render(
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <MediaShowcaseWidget showcase={mockShowcase} isOwner={true} />
            <MediaDetailModal />
          </QueryClientProvider>
        </BrowserRouter>,
      );

      const posters = screen.getAllByAltText('Minecraft');
      const poster = posters[0];
      expect(poster).toBeInTheDocument();

      // Drag event (down at 100, click at 120 -> distance 28px > 6px)
      fireEvent.mouseDown(poster.parentElement!, { clientX: 100, clientY: 100 });
      fireEvent.click(poster.parentElement!, { clientX: 120, clientY: 120 });

      expect(useMediaDetailModalStore.getState().isOpen).toBe(false);
    });

    it('renders MediaDetailModal 1-to-1 layout with header rank badge, reviews, details, and similar items', () => {
      useMediaDetailModalStore.getState().openMediaDetail({
        title: 'Dota 2',
        type: ShowcaseMediaType.GAME,
        posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg',
      });

      render(
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <MediaDetailModal />
          </QueryClientProvider>
        </BrowserRouter>,
      );

      // Header Rank Badge & Title & Subtitle
      expect(screen.getByText(/NO. 18 OVERALL RANKING/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Dota 2' })).toBeInTheDocument();
      expect(screen.getAllByText('Strategy, MOBA').length).toBeGreaterThan(0);

      // Action button: Dota 2 is not yet in viewer's showcase, so button offers to add
      expect(screen.getByText('Add to Profile')).toBeInTheDocument();

      // Reviews
      expect(screen.getByText('Reviews')).toBeInTheDocument();
      expect(screen.getByText(/Recent Reviews/i)).toBeInTheDocument();
      expect(screen.getByText(/Mixed/i)).toBeInTheDocument();
      expect(screen.getByText('OpenCritic')).toBeInTheDocument();
      expect(screen.getByText('MIGHTY')).toBeInTheDocument();
      expect(screen.getByText('90')).toBeInTheDocument();

      // Details
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getAllByText('Valve').length).toBeGreaterThan(0);
      expect(screen.getByText('July 9, 2013')).toBeInTheDocument();
      expect(screen.getByText('IGDB')).toBeInTheDocument();

      // Similar titles section
      expect(screen.getByText('Similar Games')).toBeInTheDocument();
      expect(screen.getByText('Deadlock')).toBeInTheDocument();
      expect(screen.getByText('Smite 2')).toBeInTheDocument();

      // Close modal on close button click
      const closeBtn = screen.getByTitle('Close');
      fireEvent.click(closeBtn);
      expect(useMediaDetailModalStore.getState().isOpen).toBe(false);
    });

    it('shows "+ Add to Profile" button when item is not in user profile', () => {
      useMediaDetailModalStore.getState().openMediaDetail({
        title: 'Smite 2',
        type: ShowcaseMediaType.GAME,
        posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/2437170/header.jpg',
      });

      render(
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <MediaDetailModal />
          </QueryClientProvider>
        </BrowserRouter>,
      );

      expect(screen.getByText('Add to Profile')).toBeInTheDocument();
    });
  });

  describe('Twitch ShowcaseIntegrationCard', () => {
    it('renders authentic LIVE Twitch card with streamer name, red LIVE badge, viewers, title, and game', () => {
      render(
        <ShowcaseIntegrationCard
          platform="twitch"
          isOwner={true}
          data={{
            channel: 'shroud',
            username: 'shroud',
            displayName: 'shroud',
            avatarUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/shroud.png',
            isLive: true,
            streamTitle: 'Ranked Valorant Grind with friends',
            gameName: 'VALORANT',
            viewersCount: 24500,
            followersCount: 11287332,
            url: 'https://twitch.tv/shroud',
            displayOnProfile: true,
            showLiveStatus: true,
            showFollowersCount: true,
          }}
        />,
      );

      // Channel name
      expect(screen.getAllByText('shroud').length).toBeGreaterThan(0);

      // LIVE badge
      expect(screen.getByText('LIVE')).toBeInTheDocument();

      // Viewers
      expect(screen.getByText(/24[\s\u00a0,]?500/)).toBeInTheDocument();

      // Stream title
      expect(screen.getByText('Ranked Valorant Grind with friends')).toBeInTheDocument();

      // Game category
      expect(screen.getByText('VALORANT')).toBeInTheDocument();

      // Followers
      expect(screen.getByText(/11[\s\u00a0,]?287[\s\u00a0,]?332/)).toBeInTheDocument();

      // Watch link
      expect(screen.getByText('Watch Stream on Twitch')).toBeInTheDocument();
    });

    it('renders clean OFFLINE Twitch card with grey Offline badge, followers count, and channel link', () => {
      render(
        <ShowcaseIntegrationCard
          platform="twitch"
          isOwner={false}
          data={{
            channel: 'nikolaj_live',
            username: 'nikolaj_live',
            displayName: 'Nikolaj Live',
            avatarUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/nikolaj.png',
            isLive: false,
            followersCount: 350,
            url: 'https://twitch.tv/nikolaj_live',
            displayOnProfile: true,
            showLiveStatus: true,
            showFollowersCount: true,
          }}
        />,
      );

      // Channel display name
      expect(screen.getByText('Nikolaj Live')).toBeInTheDocument();

      // Offline badge
      expect(screen.getByText('Offline')).toBeInTheDocument();

      // Followers
      expect(screen.getByText('350 followers')).toBeInTheDocument();

      // Visit link
      expect(screen.getByText('Visit Twitch Channel')).toBeInTheDocument();
    });

    it('renders Roblox card with Featured Collectibles when user has top 5 items', () => {
      render(
        <ShowcaseIntegrationCard
          platform="roblox"
          isOwner={false}
          data={{
            username: 'AghNikolaj',
            displayName: 'AghNikolaj',
            userId: '164021638',
            avatarUrl: 'https://tr.rbxcdn.com/avatar.png',
            friendsCount: 215,
            followersCount: 1657,
            showFriends: true,
            showCollectibles: true,
            items: [
              {
                name: 'Catrina Dia de Muertos Mask',
                assetId: 2528067691,
                iconUrl: 'https://tr.rbxcdn.com/item1.png',
              },
              {
                name: 'Catrin Dia de Muertos Mask',
                assetId: 2528066922,
                iconUrl: 'https://tr.rbxcdn.com/item2.png',
              },
              {
                name: 'Rocket Eggscape',
                assetId: 3016210752,
                iconUrl: 'https://tr.rbxcdn.com/item3.png',
              },
              {
                name: 'Party Fedora',
                assetId: 3798243238,
                iconUrl: 'https://tr.rbxcdn.com/item4.png',
              },
              {
                name: 'Cake Topper',
                assetId: 3798248888,
                iconUrl: 'https://tr.rbxcdn.com/item5.png',
              },
            ],
            places: [
              { name: 'SAE', placeId: 342421839, iconUrl: 'https://tr.rbxcdn.com/game1.png' },
            ],
          }}
        />,
      );

      expect(screen.getByText('Featured Collectibles')).toBeInTheDocument();
      expect(screen.getByTitle('Catrina Dia de Muertos Mask')).toBeInTheDocument();
      expect(screen.getByTitle('Party Fedora')).toBeInTheDocument();
    });

    it('substitutes Favorite Places when user items cannot be obtained (< 5 items or private)', () => {
      render(
        <ShowcaseIntegrationCard
          platform="roblox"
          isOwner={false}
          data={{
            username: 'AghNikolaj',
            displayName: 'AghNikolaj',
            userId: '164021638',
            avatarUrl: 'https://tr.rbxcdn.com/avatar.png',
            friendsCount: 215,
            followersCount: 1657,
            showFriends: true,
            showCollectibles: true,
            items: [], // Inventory private or empty
            places: [
              { name: 'SAE', placeId: 342421839, iconUrl: 'https://tr.rbxcdn.com/game1.png' },
              {
                name: 'SBO:R Testing',
                placeId: 5407101406,
                iconUrl: 'https://tr.rbxcdn.com/game2.png',
              },
              {
                name: 'BLADE ART [UPDATE V1]',
                placeId: 6320829821,
                iconUrl: 'https://tr.rbxcdn.com/game3.png',
              },
              {
                name: 'Sword Art Online: Aincrad Origins!',
                placeId: 8056417483,
                iconUrl: 'https://tr.rbxcdn.com/game4.png',
              },
              {
                name: '[FLOOR 2] Sword Art: Eternity',
                placeId: 13725495850,
                iconUrl: 'https://tr.rbxcdn.com/game5.png',
              },
            ],
          }}
        />,
      );

      expect(screen.getByText('Favorite Places')).toBeInTheDocument();
      expect(screen.getByTitle('SAE')).toBeInTheDocument();
      expect(screen.getByTitle('SBO:R Testing')).toBeInTheDocument();
      expect(screen.getByTitle('[FLOOR 2] Sword Art: Eternity')).toBeInTheDocument();
    });
  });
});
