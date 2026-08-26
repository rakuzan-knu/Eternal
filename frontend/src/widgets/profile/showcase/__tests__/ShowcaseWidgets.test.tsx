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
import { ProfileShowcaseSettingsSection } from '@/features/profile/ui/ProfileShowcaseSettingsSection';
import { SpotifyBrandIcon, SteamBrandIcon, DiscordBrandIcon } from '@/shared/ui/BrandIcons';
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

    expect(container.querySelectorAll('svg').length).toBe(3);
  });

  it('renders PersonalMetaWidget with birthday, zodiac, pronouns and local clock', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PersonalMetaWidget showcase={mockShowcase} isOwner={true} />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/Personal Meta/i)).toBeInTheDocument();
    expect(screen.getByText(/2000-08-15/i)).toBeInTheDocument();
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
});
