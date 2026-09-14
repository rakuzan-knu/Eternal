import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ChatThread from '../ChatThread';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ConversationView } from '@/entities/chat/model/types';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';

describe('ChatThread', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const mockConv = {
    id: 'conv-1',
    type: 'DIRECT',
    name: null,
    avatar: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadCount: 0,
    myMuteLevel: 'NONE',
    isPinned: false,
    participants: [
      {
        userId: 'usr-1',
        role: 'MEMBER',
        mutedUntil: null,
        joinedAt: new Date().toISOString(),
        nickname: null,
        theme: 'DEFAULT',
        muteLevel: 'NONE',
        user: {
          id: 'usr-1',
          username: 'alice',
          displayName: 'Alice Smith',
          avatar: null,
        },
      },
    ],
  } as unknown as ConversationView;

  beforeEach(() => {
    act(() => {
      useSpotifyPlayerStore.setState({
        currentTrack: null,
        isDockVisible: false,
        isDockMinimized: false,
        isGameModeOpen: false,
      });
    });
    window.innerWidth = 1024;
  });

  it('renders chat thread header and message composer', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatThread conversation={mockConv} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('dynamically raises composer padding when SpotifyBottomDock is full or minimized', () => {
    const { container, rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatThread conversation={mockConv} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Initial state: dock closed -> paddingBottom is 8px
    const composerWrapper = screen.getByTestId('composer-outer-wrapper');
    expect(composerWrapper).toHaveStyle({ paddingBottom: '8px' });

    // State 1: Dock full -> paddingBottom is 108px
    act(() => {
      useSpotifyPlayerStore.setState({
        currentTrack: {
          id: 'test-sc-track',
          title: 'Sunny Afternoon',
          artist: 'JNK',
          albumArt: '',
          durationMs: 180000,
          previewUrl: null,
          spotifyUrl: '',
        },
        isDockVisible: true,
        isDockMinimized: false,
      });
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatThread conversation={mockConv} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByTestId('composer-outer-wrapper')).toHaveStyle({ paddingBottom: '108px' });

    // State 2: Dock minimized -> paddingBottom is 50px
    act(() => {
      useSpotifyPlayerStore.setState({
        isDockMinimized: true,
      });
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatThread conversation={mockConv} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByTestId('composer-outer-wrapper')).toHaveStyle({ paddingBottom: '50px' });

    // State 3: Dock closed -> smoothly returns to 8px
    act(() => {
      useSpotifyPlayerStore.setState({
        isDockVisible: false,
      });
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatThread conversation={mockConv} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByTestId('composer-outer-wrapper')).toHaveStyle({ paddingBottom: '8px' });
  });
});
