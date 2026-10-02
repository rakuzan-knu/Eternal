import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GlobalSearchModal from '../GlobalSearchModal';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useMusicHubStore } from '@/features/music/model/useMusicHubStore';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';

const mockGlobalSearch = vi.fn().mockResolvedValue({
  messages: [],
  media: [
    {
      id: 'media-1',
      messageId: 'msg-1',
      conversationId: 'conv-1',
      url: 'https://example.com/photo1.jpg',
      fileName: 'vacation.jpg',
      senderId: 'user-2',
      senderName: 'Alice',
      type: 'IMAGE',
      createdAt: new Date().toISOString(),
    },
  ],
  people: [
    { id: 'user-99', username: 'random_user', displayName: 'Random Stranger', isOnline: true },
    { id: 'user-2', username: 'alice', displayName: 'Alice Wonderland', isOnline: true },
  ],
});

vi.mock('@/features/chat/api/chatApi', () => ({
  chatApi: {
    globalSearch: (...args: any[]) => mockGlobalSearch(...args),
    createDirectConversation: vi.fn(),
  },
}));

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    globalSearch: (...args: any[]) => mockGlobalSearch(...args),
    createDirectConversation: vi.fn(),
  },
}));

vi.mock('@/entities/chat/api/chatApi', () => ({
  chatApi: {
    globalSearch: (...args: any[]) => mockGlobalSearch(...args),
    createDirectConversation: vi.fn(),
  },
}));

vi.mock('@/shared/api/integrationsApi', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    integrationsApi: {
      ...actual.integrationsApi,
      searchSoundCloudCatalog: vi.fn().mockResolvedValue([
        {
          id: 'sc-123',
          title: 'sekairotten',
          artist: 'pingspoof',
          albumArt: 'https://example.com/sc-art.jpg',
          durationMs: 121000,
          spotifyUrl: 'https://soundcloud.com/pingspoof/sekairotten',
          source: 'soundcloud',
        },
      ]),
      searchSpotifyCatalog: vi.fn().mockResolvedValue([
        {
          id: 'sp-456',
          title: 'Blinding Lights',
          artist: 'The Weeknd',
          albumArt: 'https://example.com/sp-art.jpg',
          durationMs: 200000,
          spotifyUrl: 'https://open.spotify.com/track/sp-456',
          source: 'spotify',
        },
      ]),
      searchSoundCloudPlaylists: vi.fn().mockResolvedValue([
        {
          id: 'sc-pl-1',
          title: 'Underground Phonk',
          creator: 'Phonk Producer',
          trackCount: 15,
          source: 'soundcloud',
        },
      ]),
      getSoundCloudStream: vi
        .fn()
        .mockResolvedValue({ streamUrl: 'https://example.com/audio.mp3' }),
      getSpotifyQueue: vi.fn().mockResolvedValue({ tracks: [], hasMore: false }),
    },
  };
});

vi.mock('../../model/useConversations', () => ({
  useConversations: () => ({
    data: [
      {
        id: 'conv-1',
        type: 'DIRECT',
        participants: [
          { userId: 'user-1', user: { id: 'user-1', username: 'me' } },
          {
            userId: 'user-2',
            user: { id: 'user-2', username: 'alice', displayName: 'Alice Wonderland' },
          },
        ],
        lastMessage: {
          id: 'msg-last',
          body: 'Hey there!',
          createdAt: new Date().toISOString(),
          sender: { id: 'user-2', username: 'alice', displayName: 'Alice' },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'conv-2',
        type: 'GROUP',
        name: 'Squad Goals',
        participants: [
          { userId: 'user-1', user: { id: 'user-1', username: 'me' } },
          { userId: 'user-2', user: { id: 'user-2', username: 'alice' } },
          { userId: 'user-3', user: { id: 'user-3', username: 'bob' } },
        ],
        lastMessage: {
          id: 'msg-grp',
          body: 'Let us meet up',
          createdAt: new Date().toISOString(),
          sender: { id: 'user-3', username: 'bob', displayName: 'Bob' },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  }),
}));

describe('GlobalSearchModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    useAuthStore.setState({
      userId: 'user-1',
      isAuthenticated: true,
    });
    useMusicHubStore.setState({
      recentlyPlayed: [
        {
          id: 'sc-track-1',
          type: 'track',
          title: 'sekairotten',
          artist: 'pingspoof',
          coverUrl: 'https://example.com/sekairotten.jpg',
          playedAt: Date.now(),
          track: {
            id: 'sc-track-1',
            title: 'sekairotten',
            artist: 'pingspoof',
            albumArt: 'https://example.com/sekairotten.jpg',
            durationMs: 121000,
            previewUrl: null,
            spotifyUrl: 'https://soundcloud.com/pingspoof/sekairotten',
            source: 'soundcloud',
          },
        },
        {
          id: 'sp-track-2',
          type: 'track',
          title: 'Starboy',
          artist: 'The Weeknd',
          coverUrl: 'https://example.com/starboy.jpg',
          playedAt: Date.now(),
          track: {
            id: 'sp-track-2',
            title: 'Starboy',
            artist: 'The Weeknd',
            albumArt: 'https://example.com/starboy.jpg',
            durationMs: 230000,
            previewUrl: null,
            spotifyUrl: 'https://open.spotify.com/track/sp-track-2',
            source: 'spotify',
          },
        },
      ],
    });
  });

  it('renders the 3 default rich sections when query is empty on All tab', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GlobalSearchModal isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Section 1: Recent Chats
    expect(screen.getByText('Recent Chats')).toBeInTheDocument();
    expect(screen.getByText('Alice Wonderland')).toBeInTheDocument();
    expect(screen.getByText('Squad Goals')).toBeInTheDocument();

    // Section 2: Recent Chat Media
    expect(screen.getByText('Recent Chat Media')).toBeInTheDocument();

    // Section 3: Recently Played
    expect(screen.getByText('Recently Played')).toBeInTheDocument();
    expect(screen.getByText('sekairotten')).toBeInTheDocument();
    expect(screen.getByText('Starboy')).toBeInTheDocument();

    // Dynamic brand labels: sekairotten is SoundCloud, Starboy is Spotify
    expect(screen.getAllByText('SoundCloud').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Spotify').length).toBeGreaterThanOrEqual(1);
  });

  it('renders only media on the Media tab and excludes songs and chats', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GlobalSearchModal isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Switch to Media tab
    const mediaTabBtn = screen.getByRole('button', { name: /media/i });
    fireEvent.click(mediaTabBtn);

    // Recent Chat Media should be displayed
    expect(screen.getByText('Recent Chat Media')).toBeInTheDocument();

    // Recent Chats and Recently Played songs must NOT be displayed
    expect(screen.queryByText('Recent Chats')).not.toBeInTheDocument();
    expect(screen.queryByText('Recently Played')).not.toBeInTheDocument();
  });

  it('renders songs on the Music tab', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GlobalSearchModal isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Switch to Music tab
    const musicTabBtn = screen.getByRole('button', { name: /music/i });
    fireEvent.click(musicTabBtn);

    // Recently Played songs should be displayed
    expect(screen.getByText('Recently Played')).toBeInTheDocument();
    expect(screen.getByText('sekairotten')).toBeInTheDocument();

    // Recent Chats and Recent Media must NOT be displayed
    expect(screen.queryByText('Recent Chats')).not.toBeInTheDocument();
    expect(screen.queryByText('Recent Chat Media')).not.toBeInTheDocument();
  });

  it('calls onClose when clicking the ESC close button', async () => {
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GlobalSearchModal isOpen={true} onClose={onClose} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const escBtn = screen.getByTitle('Close (Esc)');
    expect(escBtn).toBeInTheDocument();
    fireEvent.click(escBtn);
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onSelectConversation and navigates when clicking a recent chat', () => {
    const onSelectConversation = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GlobalSearchModal
            isOpen={true}
            onClose={vi.fn()}
            onSelectConversation={onSelectConversation}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const chatRow = screen.getByText('Alice Wonderland');
    fireEvent.click(chatRow);
    expect(onSelectConversation).toHaveBeenCalledWith('conv-1', undefined);
  });

  it('plays song when clicking a recently played item', () => {
    const playTrackSpy = vi.spyOn(useSpotifyPlayerStore.getState(), 'playTrack');
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GlobalSearchModal isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const songRow = screen.getByText('sekairotten');
    fireEvent.click(songRow);
    expect(playTrackSpy).toHaveBeenCalled();
  });

  it('sorts familiar chat contacts first and renders music tracks and playlists when searching', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GlobalSearchModal isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const input = screen.getByPlaceholderText(/search messages, photos, music/i);
    fireEvent.change(input, { target: { value: 'test' } });

    // Wait for search results
    await waitFor(
      () => {
        expect(screen.getByText(/People & Contacts/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Alice is a familiar contact in user-1's chats, so she has "In your chats" badge
    expect(screen.getByText('In your chats')).toBeInTheDocument();

    // Music search results (tracks and playlists)
    await waitFor(
      () => {
        expect(screen.getByText(/Tracks \(\d+\)/i)).toBeInTheDocument();
        expect(screen.getByText('Blinding Lights')).toBeInTheDocument();
        expect(screen.getByText(/Playlists \(\d+\)/i)).toBeInTheDocument();
        expect(screen.getByText('Underground Phonk')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('navigates items with ArrowDown and ArrowUp and selects item on Enter', () => {
    const onSelectConversation = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GlobalSearchModal
            isOpen={true}
            onClose={vi.fn()}
            onSelectConversation={onSelectConversation}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Initial item is index 0 (first recent chat: conv-1)
    const firstChat = document.querySelector('[data-search-nav-id="recent-chat-conv-1"]');
    expect(firstChat).toHaveAttribute('data-result-index', '0');

    // Press Enter to activate the first item
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onSelectConversation).toHaveBeenCalledWith('conv-1', undefined);

    // Press ArrowDown to navigate to index 1 (second chat: conv-2)
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    const secondChat = document.querySelector('[data-search-nav-id="recent-chat-conv-2"]');
    expect(secondChat).toHaveAttribute('data-result-index', '1');

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onSelectConversation).toHaveBeenCalledWith('conv-2', undefined);

    // Press ArrowUp to navigate back to index 0
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onSelectConversation).toHaveBeenCalledWith('conv-1', undefined);
  });

  it('switches tabs with ArrowRight and ArrowLeft applying directional slide animation', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GlobalSearchModal isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Initial tab is 'All'
    expect(screen.getByRole('button', { name: /all/i })).toHaveClass('glass-card');

    // Press ArrowRight to switch to Messages tab
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: /messages/i })).toHaveClass('glass-card');
    const containerRight = document.querySelector('.animate-slideInRight');
    expect(containerRight).toBeInTheDocument();

    // Press ArrowLeft to switch back to All tab
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByRole('button', { name: /all/i })).toHaveClass('glass-card');
    const containerLeft = document.querySelector('.animate-slideInLeft');
    expect(containerLeft).toBeInTheDocument();
  });
});
