import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MusicNowPlayingSidebar } from '../ui/MusicNowPlayingSidebar';
import { useSpotifyPlayerStore, type SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';
import { useMusicHubStore } from '../model/useMusicHubStore';

describe('MusicNowPlayingSidebar', () => {
  const currentTrackMock: SpotifyTrack = {
    id: 'sc-123',
    title: 'Fruity 2.0',
    artist: 'RightOn',
    albumArt: 'https://example.com/fruity.jpg',
    durationMs: 180000,
    previewUrl: null,
    spotifyUrl: 'https://soundcloud.com/righton/fruity',
    source: 'soundcloud',
  };

  const nextTrackMock: SpotifyTrack = {
    id: 'sc-456',
    title: 'Fashion Killa x...',
    artist: '13Aurora, Sapphi...',
    albumArt: 'https://example.com/fashion.jpg',
    durationMs: 150000,
    previewUrl: null,
    spotifyUrl: 'https://soundcloud.com/aurora/fashion',
    source: 'soundcloud',
  };

  beforeEach(() => {
    useSpotifyPlayerStore.setState({
      currentTrack: currentTrackMock,
      isPlaying: true,
      queue: [nextTrackMock],
      isLiked: false,
    });
    useMusicHubStore.setState({
      isNowPlayingPanelOpen: true,
    });
  });

  const renderSidebar = () =>
    render(
      <MemoryRouter>
        <MusicNowPlayingSidebar />
      </MemoryRouter>,
    );

  it('renders Now Playing sidebar with track details and next-in-line card', () => {
    renderSidebar();

    expect(screen.getByTestId('music-now-playing-sidebar')).toBeInTheDocument();
    expect(screen.getByText('Now Playing')).toBeInTheDocument();
    expect(screen.getByText('Fruity 2.0')).toBeInTheDocument();
    expect(screen.getAllByText('RightOn').length).toBeGreaterThan(0);

    // Verify Next in line card renders queue[0]
    expect(screen.getByText('Next in Queue')).toBeInTheDocument();
    expect(screen.getByText('Fashion Killa x...')).toBeInTheDocument();
    expect(screen.getByText('13Aurora, Sapphi...')).toBeInTheDocument();
  });

  it('collapses into right-edge tab when clicking collapse button or close button', () => {
    const { rerender } = renderSidebar();

    // Click collapse button
    const collapseBtn = screen.getByTestId('now-playing-collapse-btn');
    fireEvent.click(collapseBtn);

    expect(useMusicHubStore.getState().isNowPlayingPanelOpen).toBe(false);

    rerender(
      <MemoryRouter>
        <MusicNowPlayingSidebar />
      </MemoryRouter>,
    );

    // Sidebar is replaced by collapsed narrow tab with chevron
    expect(screen.queryByTestId('music-now-playing-sidebar')).not.toBeInTheDocument();
    const collapsedTab = screen.getByTestId('music-now-playing-collapsed-tab');
    expect(collapsedTab).toBeInTheDocument();

    // Click collapsed tab to restore sidebar
    fireEvent.click(collapsedTab);
    expect(useMusicHubStore.getState().isNowPlayingPanelOpen).toBe(true);

    rerender(
      <MemoryRouter>
        <MusicNowPlayingSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('music-now-playing-sidebar')).toBeInTheDocument();
  });

  it('opens context menu when clicking 3-dots button or right clicking cover/title', () => {
    renderSidebar();

    // Click 3-dots button
    const threeDotsBtn = screen.getByTestId('now-playing-threedots-btn');
    fireEvent.click(threeDotsBtn);

    // TrackActionMenu appears with standard options
    expect(screen.getByText('Add to Playlist')).toBeInTheDocument();

    // Close menu by clicking outside / pressing escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Add to Playlist')).not.toBeInTheDocument();

    // Right-click cover art
    const coverArt = screen.getByAltText('Fruity 2.0');
    fireEvent.contextMenu(coverArt);
    expect(screen.getByText('Add to Playlist')).toBeInTheDocument();
  });

  it('plays next track when clicking Next in Line track card', () => {
    const playTrackSpy = vi.fn();
    useSpotifyPlayerStore.setState({
      playTrack: playTrackSpy,
    });

    renderSidebar();

    const nextTrackCard = screen.getByText('Fashion Killa x...').closest('div');
    fireEvent.click(nextTrackCard!);

    expect(playTrackSpy).toHaveBeenCalledWith(nextTrackMock, [], undefined, true);
  });

  it('toggles player queue when clicking Open Queue button in Next in Line card', () => {
    const toggleQueueSpy = vi.fn();
    useSpotifyPlayerStore.setState({
      toggleQueue: toggleQueueSpy,
    });

    renderSidebar();

    const openQueueBtn = screen.getByText('Open Queue');
    fireEvent.click(openQueueBtn);

    expect(toggleQueueSpy).toHaveBeenCalled();
  });
});
