import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MusicSectionDetailView } from '../ui/MusicSectionDetailView';
import { useMusicHubStore } from '../model/useMusicHubStore';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';

describe('MusicSectionDetailView', () => {
  beforeEach(() => {
    localStorage.clear();
    useMusicHubStore.setState({
      recentlyPlayed: [],
      playlists: [],
    });
    useSpotifyPlayerStore.setState({
      currentTrack: null,
      isPlaying: false,
    });
  });

  it('renders friendly empty state when no tracks or playlists have been played', () => {
    render(
      <BrowserRouter>
        <MusicSectionDetailView sectionId="0JQ5DAnM3wGh0gz1MXnukz" />
      </BrowserRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Recently Played' })).toBeInTheDocument();
    expect(screen.getByText('Listening history is empty')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /explore catalog/i })).toBeInTheDocument();
  });

  it('renders recently played items without "Playlist added" badges and caps at 20', () => {
    const mockItems = Array.from({ length: 25 }, (_, i) => ({
      id: `sc-track-${i + 1}`,
      type: 'track' as const,
      title: `Track Title ${i + 1}`,
      artist: `Artist ${i + 1}`,
      playedAt: Date.now() - i * 1000,
    }));

    useMusicHubStore.setState({
      recentlyPlayed: mockItems,
    });

    render(
      <BrowserRouter>
        <MusicSectionDetailView sectionId="0JQ5DAnM3wGh0gz1MXnukz" />
      </BrowserRouter>,
    );

    // Should render maximum 20 items
    expect(screen.getByText('Track Title 1')).toBeInTheDocument();
    expect(screen.getByText('Track Title 20')).toBeInTheDocument();
    expect(screen.queryByText('Track Title 21')).not.toBeInTheDocument();

    // Verify absolutely no "Playlist added" anywhere
    expect(screen.queryByText(/Playlist added/i)).not.toBeInTheDocument();
  });
});
