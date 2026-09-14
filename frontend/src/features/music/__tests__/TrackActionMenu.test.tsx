import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackActionMenu } from '../ui/TrackActionMenu';
import { useMusicHubStore } from '../model/useMusicHubStore';
import { useSpotifyPlayerStore, type SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe('TrackActionMenu', () => {
  const sampleTrack: SpotifyTrack = {
    id: 'sc-test-vyzee',
    title: 'VYZEE',
    artist: 'SOPHIE',
    album: 'Product',
    albumArt: 'https://example.com/vyzee.jpg',
    durationMs: 202000,
    previewUrl: null,
    spotifyUrl: 'https://soundcloud.com/sophie/vyzee',
    source: 'soundcloud',
  };

  beforeEach(() => {
    mockedNavigate.mockClear();
    useMusicHubStore.setState({
      likedTracks: [],
      customPlaylists: [
        {
          id: 'pl-custom-1',
          title: 'My Vibe',
          creator: 'You',
          tracks: [],
          coverUrl: '',
          createdAt: '2026-09-11',
        },
      ],
    });
    useSpotifyPlayerStore.setState({
      queue: [],
    });
  });

  it('renders all 6 main action buttons when open', () => {
    const handleClose = vi.fn();
    const anchorRect = DOMRectReadOnly.fromRect({ x: 200, y: 300, width: 20, height: 20 });

    render(
      <TrackActionMenu
        isOpen={true}
        onClose={handleClose}
        anchorRect={anchorRect}
        track={sampleTrack}
      />,
    );

    expect(screen.getByText('Add to Playlist')).toBeInTheDocument();
    expect(screen.getByText('Save to your Liked Songs')).toBeInTheDocument();
    expect(screen.getByText('Add to Queue')).toBeInTheDocument();
    expect(screen.getByText('Go to Song')).toBeInTheDocument();
    expect(screen.getByText('View Credits')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('toggles liking track and closes on click', () => {
    const handleClose = vi.fn();
    const anchorRect = DOMRectReadOnly.fromRect({ x: 100, y: 100, width: 0, height: 0 });

    render(
      <TrackActionMenu
        isOpen={true}
        onClose={handleClose}
        anchorRect={anchorRect}
        track={sampleTrack}
      />,
    );

    const likeBtn = screen.getByText('Save to your Liked Songs');
    fireEvent.click(likeBtn);

    expect(useMusicHubStore.getState().isTrackLiked(sampleTrack.id)).toBe(true);
    expect(handleClose).toHaveBeenCalled();
  });

  it('adds track to active queue on click', () => {
    const handleClose = vi.fn();
    const anchorRect = DOMRectReadOnly.fromRect({ x: 100, y: 100, width: 0, height: 0 });

    render(
      <TrackActionMenu
        isOpen={true}
        onClose={handleClose}
        anchorRect={anchorRect}
        track={sampleTrack}
      />,
    );

    const queueBtn = screen.getByText('Add to Queue');
    fireEvent.click(queueBtn);

    expect(useSpotifyPlayerStore.getState().queue).toContainEqual(sampleTrack);
    expect(handleClose).toHaveBeenCalled();
  });

  it('navigates to track detail page on click', () => {
    const handleClose = vi.fn();
    const anchorRect = DOMRectReadOnly.fromRect({ x: 100, y: 100, width: 0, height: 0 });

    render(
      <TrackActionMenu
        isOpen={true}
        onClose={handleClose}
        anchorRect={anchorRect}
        track={sampleTrack}
      />,
    );

    const viewPageBtn = screen.getByText('Go to Song');
    fireEvent.click(viewPageBtn);

    expect(mockedNavigate).toHaveBeenCalledWith(`/music/track/${sampleTrack.id}`);
    expect(handleClose).toHaveBeenCalled();
  });

  it('opens details modal when clicking "View Credits"', async () => {
    const handleClose = vi.fn();
    const anchorRect = DOMRectReadOnly.fromRect({ x: 100, y: 100, width: 0, height: 0 });

    const { rerender } = render(
      <TrackActionMenu
        isOpen={true}
        onClose={handleClose}
        anchorRect={anchorRect}
        track={sampleTrack}
      />,
    );

    const detailsBtn = screen.getByText('View Credits');
    fireEvent.click(detailsBtn);

    // After click, parent closes menu, so TrackActionMenu rerenders with isOpen=false
    rerender(
      <TrackActionMenu
        isOpen={false}
        onClose={handleClose}
        anchorRect={anchorRect}
        track={sampleTrack}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Track Info')).toBeInTheDocument();
      expect(screen.getByText('Report an issue')).toBeInTheDocument();
    });
  });
});
