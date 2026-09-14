import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MusicHomeOverview } from '../ui/MusicHomeOverview';
import { useMusicHubStore } from '../model/useMusicHubStore';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import type { SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';

describe('MusicHomeOverview', () => {
  beforeEach(() => {
    localStorage.clear();
    useMusicHubStore.setState({
      likedTracks: [],
      playlists: [],
      recentlyPlayed: [],
      lastActiveGenre: undefined,
      lastActiveSeed: undefined,
      homeCategory: 'all',
    });
    useSpotifyPlayerStore.setState({
      currentTrack: null,
      isPlaying: false,
    });
  });

  it('renders category pills and switches category', () => {
    render(
      <BrowserRouter>
        <MusicHomeOverview />
      </BrowserRouter>,
    );

    const allBtn = screen.getByRole('button', { name: 'All' });
    const musicBtn = screen.getByRole('button', { name: 'Music' });
    const podcastsBtn = screen.getByRole('button', { name: 'Podcasts' });

    expect(allBtn).toBeInTheDocument();
    expect(musicBtn).toBeInTheDocument();
    expect(podcastsBtn).toBeInTheDocument();

    // Switch to podcasts
    fireEvent.click(podcastsBtn);
    expect(screen.getByText('Podcasts Coming Soon')).toBeInTheDocument();

    // Switch back to music
    fireEvent.click(musicBtn);
    expect(screen.queryByText('Podcasts Coming Soon')).not.toBeInTheDocument();
  });

  it('features playing track in Slot 0 of Top Grid when music is playing', () => {
    const activeTrack: SpotifyTrack = {
      id: 'sc-playing-123',
      title: 'Current Awesome Track',
      artist: 'Electric Sound',
      albumArt: 'https://example.com/cover.jpg',
      durationMs: 195000,
      previewUrl: null,
      spotifyUrl: '',
      source: 'soundcloud',
    };

    useSpotifyPlayerStore.setState({
      currentTrack: activeTrack,
      isPlaying: true,
    });

    render(
      <BrowserRouter>
        <MusicHomeOverview />
      </BrowserRouter>,
    );

    expect(screen.getByText('Current Awesome Track')).toBeInTheDocument();
    expect(screen.getByText('Electric Sound')).toBeInTheDocument();
  });

  it('hides "Recently Played" initially when empty, and shows it when user plays a track', () => {
    const { unmount } = render(
      <BrowserRouter>
        <MusicHomeOverview />
      </BrowserRouter>,
    );

    // Initial state: user hasn't played anything, so "Recently Played" is not rendered
    expect(screen.queryByRole('heading', { name: 'Recently Played' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show all' })).not.toBeInTheDocument();
    unmount();

    // User plays a track
    useMusicHubStore.getState().recordRecentlyPlayed({
      id: 'sc-test-recent-1',
      type: 'track',
      title: 'Recently Played Jam',
      artist: 'DJ Sonic',
      playedAt: Date.now(),
    });

    render(
      <BrowserRouter>
        <MusicHomeOverview />
      </BrowserRouter>,
    );

    // Now "Recently Played" appears with "Show all"
    expect(screen.getByRole('heading', { name: 'Recently Played' })).toBeInTheDocument();
    expect(screen.getAllByText('Recently Played Jam').length).toBeGreaterThanOrEqual(1);
    const showAllBtn = screen.getByRole('button', { name: 'Show all' });
    expect(showAllBtn).toBeInTheDocument();
  });

  it('updates recommendation supertitle dynamically when genre changes', () => {
    useMusicHubStore.setState({
      lastActiveGenre: 'Rock',
    });

    render(
      <BrowserRouter>
        <MusicHomeOverview />
      </BrowserRouter>,
    );

    expect(screen.getByText('Based on recent activity: Rock')).toBeInTheDocument();
  });
});
