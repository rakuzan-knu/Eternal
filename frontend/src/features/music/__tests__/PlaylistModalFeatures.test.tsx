import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DeletePlaylistConfirmModal } from '../ui/DeletePlaylistConfirmModal';
import { EditPlaylistDetailsModal } from '../ui/EditPlaylistDetailsModal';
import { useMusicHubStore } from '../model/useMusicHubStore';
import {
  isPlaylistSearchDiscoverable,
  isDefaultPlaylistTitle,
  canViewPlaylist,
} from '../model/types';
import type { MusicPlaylist } from '../model/types';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/music/playlist/pl-1' }),
  };
});

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: { id: 'user-owner', username: 'owner_user', displayName: 'Owner User' },
  }),
}));

describe('DeletePlaylistConfirmModal & EditPlaylistDetailsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders owner delete modal with warning and calls deletePlaylistPermanently with redirect', () => {
    const testPlaylist: MusicPlaylist = {
      id: 'pl-1',
      title: 'My Rock',
      description: '',
      creator: 'Owner User',
      creatorId: 'user-owner',
      coverUrl: '',
      tracks: [],
      createdAt: new Date().toISOString(),
    };

    render(
      <MemoryRouter>
        <DeletePlaylistConfirmModal isOpen={true} onClose={vi.fn()} playlist={testPlaylist} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Delete playlist permanently?')).toBeInTheDocument();
    expect(
      screen.getByText(/will be permanently deleted for all users and collaborators/i),
    ).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/music', { replace: true });
  });

  it('renders EditPlaylistDetailsModal with Spotify disclaimer and allows privacy toggle and title editing', () => {
    const testPlaylist: MusicPlaylist = {
      id: 'pl-2',
      title: 'Workout Beats',
      description: 'Gym motivation',
      creator: 'Owner User',
      creatorId: 'user-owner',
      coverUrl: '',
      tracks: [],
      isPrivate: false,
      createdAt: new Date().toISOString(),
    };

    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <EditPlaylistDetailsModal isOpen={true} onClose={onClose} playlist={testPlaylist} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Edit details')).toBeInTheDocument();
    expect(
      screen.getByText(/By continuing, you agree to grant Eternal access/i),
    ).toBeInTheDocument();

    // Check privacy toggle button
    const privacyBtn = screen.getByText(/make private/i);
    expect(privacyBtn).toBeInTheDocument();
    fireEvent.click(privacyBtn);
    expect(screen.getByText(/make public/i)).toBeInTheDocument();

    // Check save button
    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);
    expect(onClose).toHaveBeenCalled();
  });

  describe('Visibility & Anti-spam rules', () => {
    it('isDefaultPlaylistTitle correctly detects default titles', () => {
      expect(isDefaultPlaylistTitle('My Playlist')).toBe(true);
      expect(isDefaultPlaylistTitle('My Playlist #1')).toBe(true);
      expect(isDefaultPlaylistTitle('My playlist #2')).toBe(true);
      expect(isDefaultPlaylistTitle('My Playlist #3')).toBe(true);
      expect(isDefaultPlaylistTitle('Evening Relax')).toBe(false);
    });

    it('isPlaylistSearchDiscoverable hides empty default playlists from other users', () => {
      const emptyDefaultPlaylist: MusicPlaylist = {
        id: 'pl-other',
        title: 'My Playlist #1',
        creator: 'Other Guy',
        creatorId: 'user-other',
        coverUrl: '',
        tracks: [],
        createdAt: '',
      };

      // Hidden from third party
      expect(isPlaylistSearchDiscoverable(emptyDefaultPlaylist, 'user-visitor')).toBe(false);

      // Visible to owner
      expect(isPlaylistSearchDiscoverable(emptyDefaultPlaylist, 'user-other')).toBe(true);

      // With tracks and custom name, becomes visible to everyone
      const populatedPlaylist: MusicPlaylist = {
        ...emptyDefaultPlaylist,
        title: 'Rock Classics',
        tracks: [
          {
            id: 't1',
            title: 'Track 1',
            artist: 'Artist 1',
            album: 'Alb',
            durationMs: 180000,
            albumArt: '',
            previewUrl: null,
            spotifyUrl: 'https://spotify.com',
          },
        ],
      };
      expect(isPlaylistSearchDiscoverable(populatedPlaylist, 'user-visitor')).toBe(true);
    });

    it('canViewPlaylist prevents third party from accessing private playlists', () => {
      const privatePlaylist: MusicPlaylist = {
        id: 'pl-private',
        title: 'Secret Beats',
        creator: 'Owner User',
        creatorId: 'user-owner',
        coverUrl: '',
        tracks: [],
        isPrivate: true,
        collaborators: [
          {
            id: 'user-collab',
            username: 'collab',
            displayName: 'Collab',
            role: 'editor',
            joinedAt: new Date().toISOString(),
          },
        ],
        createdAt: '',
      };

      expect(canViewPlaylist(privatePlaylist, 'user-owner')).toBe(true);
      expect(canViewPlaylist(privatePlaylist, 'user-collab')).toBe(true);
      expect(canViewPlaylist(privatePlaylist, 'user-stranger')).toBe(false);
    });
  });
});
