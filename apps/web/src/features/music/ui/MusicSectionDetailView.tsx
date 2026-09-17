import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Music2, Clock } from 'lucide-react';
import { useMusicHubStore } from '../model/useMusicHubStore';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import type { SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';
import { useSpotifyDockOffset } from '@/shared/model/useSpotifyDockOffset';
import { PlaylistActionMenu } from './PlaylistActionMenu';
import { TrackActionMenu } from './TrackActionMenu';
import type { MusicPlaylist, MusicRecentlyPlayedItem } from '../model/types';

interface MusicSectionDetailViewProps {
  sectionId: string;
}

export const MusicSectionDetailView: React.FC<MusicSectionDetailViewProps> = ({
  sectionId: _sectionId,
}) => {
  const navigate = useNavigate();
  const { dockOffset } = useSpotifyDockOffset(24);

  const { recentlyPlayed, playlists, catalogPlaylists, setSelectedPlaylistId } = useMusicHubStore();

  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const isPlaying = useSpotifyPlayerStore((s) => s.isPlaying);
  const playTrack = useSpotifyPlayerStore((s) => s.playTrack);
  const togglePlay = useSpotifyPlayerStore((s) => s.togglePlay);

  // Context menus
  const [activePlaylistMenu, setActivePlaylistMenu] = useState<{
    playlist: MusicPlaylist;
    rect: DOMRect;
  } | null>(null);

  const [activeTrackMenu, setActiveTrackMenu] = useState<{
    track: SpotifyTrack;
    rect: DOMRect;
  } | null>(null);

  // Up to 20 recently played items
  const items = useMemo(() => {
    return recentlyPlayed.slice(0, 20);
  }, [recentlyPlayed]);

  const handleOpenPlaylist = (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    navigate(`/music/playlist/${playlistId}`);
  };

  const handleOpenTrack = (trackId: string) => {
    navigate(`/music/track/${trackId}`);
  };

  const handlePlayCard = (e: React.MouseEvent, item: MusicRecentlyPlayedItem) => {
    e.stopPropagation();

    if (item.type === 'playlist') {
      const pl =
        playlists.find((p) => p.id === item.id) ||
        catalogPlaylists.find((p) => p.id === item.id) ||
        useMusicHubStore.getState().getPlaylistById(item.id);

      if (!pl || pl.tracks.length === 0) return;

      const isThisPlaying =
        isPlaying && currentTrack && pl.tracks.some((t) => t.id === currentTrack.id);
      if (isThisPlaying) {
        togglePlay();
      } else {
        playTrack(pl.tracks[0], pl.tracks.slice(1), pl.title);
        useMusicHubStore.getState().recordRecentlyPlayed({
          id: pl.id,
          type: 'playlist',
          title: pl.title,
          subtitle: pl.creator ? `Playlist • ${pl.creator}` : 'Playlist',
          coverUrl: pl.coverUrl,
          tracksCount: pl.tracks.length,
          playlistId: pl.id,
          genre: pl.title,
        });
      }
      return;
    }

    if (item.track) {
      if (currentTrack?.id === item.track.id) {
        togglePlay();
      } else {
        playTrack(item.track, [], item.track.title);
        useMusicHubStore.getState().recordRecentlyPlayed({
          id: item.track.id,
          type: 'track',
          title: item.track.title,
          artist: item.track.artist,
          coverUrl: item.track.albumArt,
          track: item.track,
        });
      }
    }
  };

  const handlePlaylistContextMenu = (e: React.MouseEvent, pl: MusicPlaylist) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveTrackMenu(null);
    setActivePlaylistMenu({
      playlist: pl,
      rect: DOMRectReadOnly.fromRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 }),
    });
  };

  const handleTrackContextMenu = (e: React.MouseEvent, tr: SpotifyTrack) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePlaylistMenu(null);
    setActiveTrackMenu({
      track: tr,
      rect: DOMRectReadOnly.fromRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 }),
    });
  };

  return (
    <div
      style={{ paddingBottom: `${dockOffset + 56}px` }}
      className="p-8 overflow-y-auto custom-scrollbar select-none min-h-full"
    >
      {/* Header bar matching Spotify Screenshot 4 */}
      <div className="flex items-center gap-4 mb-8">
        <button
          type="button"
          onClick={() => navigate('/music')}
          aria-label="Back to home"
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all hover:scale-105 active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Recently Played</h1>
          <p className="text-xs text-gray-400 mt-1">
            Recently played playlists and tracks on our platform
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/30 mb-4 border border-white/10">
            <Clock size={30} />
          </div>
          <h2 className="text-lg font-bold text-white mb-1.5">Listening history is empty</h2>
          <p className="text-xs text-gray-400 max-w-sm mb-6">
            Playlists and tracks will appear here when you play them.
          </p>
          <button
            type="button"
            onClick={() => navigate('/music')}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95"
          >
            Explore catalog
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {items.map((item, idx) => {
            const isThisPlaying =
              isPlaying &&
              currentTrack &&
              (item.id === currentTrack.id || item.playlistId === currentTrack.contextName);

            return (
              <div
                key={`sec-${item.id}-${idx}`}
                onClick={() => {
                  if (item.type === 'playlist') handleOpenPlaylist(item.id);
                  else handleOpenTrack(item.id);
                }}
                onContextMenu={(e) => {
                  if (item.type === 'playlist') {
                    const pl =
                      playlists.find((p) => p.id === item.id) ||
                      catalogPlaylists.find((p) => p.id === item.id) ||
                      useMusicHubStore.getState().getPlaylistById(item.id);
                    if (pl) handlePlaylistContextMenu(e, pl);
                  } else {
                    const tr: SpotifyTrack = item.track || {
                      id: item.id,
                      title: item.title,
                      artist: item.artist || item.subtitle || 'Unknown Artist',
                      album: item.title,
                      albumArt: item.coverUrl || '',
                      durationMs: 180000,
                      previewUrl: null,
                      spotifyUrl: `https://open.spotify.com/track/${item.id}`,
                      source: 'soundcloud',
                    };
                    handleTrackContextMenu(e, tr);
                  }
                }}
                className="group relative p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/10 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 flex flex-col"
              >
                {/* Artwork container */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3.5 bg-black/40 shadow-lg">
                  {item.coverUrl ? (
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-purple-950/70">
                      <Music2 size={36} className="text-white/40" />
                    </div>
                  )}

                  {/* Floating Play/Pause Button */}
                  <div className="absolute right-2.5 bottom-2.5">
                    <button
                      type="button"
                      onClick={(e) => handlePlayCard(e, item)}
                      aria-label={`Play ${item.title}`}
                      className={`w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-600/40 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 ${
                        isThisPlaying
                          ? 'opacity-100 translate-y-0'
                          : 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'
                      }`}
                    >
                      {isThisPlaying ? (
                        <Pause size={20} className="fill-white" />
                      ) : (
                        <Play size={20} className="fill-white ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-white truncate group-hover:text-purple-300 group-hover:underline transition-colors">
                  {item.title}
                </h3>

                {/* Clean Subtitle - NO 'Playlist added' */}
                <span className="text-xs text-gray-400 truncate mt-1">
                  {item.type === 'playlist'
                    ? item.subtitle || (item.artist ? `Playlist • ${item.artist}` : 'Playlist')
                    : item.artist || item.subtitle || 'Artist'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Menu Portals */}
      {activePlaylistMenu && (
        <PlaylistActionMenu
          isOpen={Boolean(activePlaylistMenu)}
          onClose={() => setActivePlaylistMenu(null)}
          anchorRect={activePlaylistMenu.rect}
          playlist={activePlaylistMenu.playlist}
        />
      )}

      {activeTrackMenu && (
        <TrackActionMenu
          isOpen={Boolean(activeTrackMenu)}
          onClose={() => setActiveTrackMenu(null)}
          anchorRect={activeTrackMenu.rect}
          track={activeTrackMenu.track}
        />
      )}
    </div>
  );
};
