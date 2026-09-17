import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Maximize2,
  Minimize2,
  Search,
  X,
  Pin,
  PinOff,
  Heart,
  Volume2,
  Trash2,
  BookOpen,
  Music2,
  Folder,
  ListPlus,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Pause,
  AlignJustify,
  List,
  Grid3X3,
  LayoutGrid,
  Check,
  ChevronLeft,
  MoreHorizontal,
  FolderEdit,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Tooltip from '@/shared/ui/Tooltip';
import { useMusicHubStore } from '../model/useMusicHubStore';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { useSpotifyDockOffset } from '@/shared/model/useSpotifyDockOffset';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { PlaylistActionMenu } from './PlaylistActionMenu';
import {
  type MusicPlaylist,
  type MusicFolder,
  type MusicLibrarySort,
  type MusicLibraryViewMode,
  formatTracksDeclension,
  formatPlaylistsDeclension,
} from '../model/types';
import type { SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';
import { useMusicPanelResizer } from '../model/useMusicPanelResizer';
import { FolderRenameModal } from './FolderRenameModal';
import { DeleteFolderConfirmModal } from './DeleteFolderConfirmModal';

export const MusicLibraryPanel: React.FC = () => {
  const {
    likedTracks,
    playlists,
    musicFolders,
    selectedPlaylistId,
    setSelectedPlaylistId,
    deletePlaylist,
    createPlaylist,
    createMusicFolder,
    isLibraryExpanded,
    toggleLibraryExpanded,
    isLibraryFullWidth,
    toggleLibraryFullWidth,
    setLibraryFullWidth,
    libraryFilter,
    setLibraryFilter,
    librarySearchQuery,
    setLibrarySearchQuery,
    librarySort,
    setLibrarySort,
    libraryViewMode,
    setLibraryViewMode,
    isItemPinned,
    togglePinItem,
  } = useMusicHubStore();

  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const isPlaying = useSpotifyPlayerStore((s) => s.isPlaying);
  const playTrack = useSpotifyPlayerStore((s) => s.playTrack);
  const togglePlay = useSpotifyPlayerStore((s) => s.togglePlay);
  const { dockOffset } = useSpotifyDockOffset(16);

  const {
    width: libraryWidth,
    isResizing: isLibraryResizing,
    isHandleHovered: isLibraryHandleHovered,
    setIsHandleHovered: setIsLibraryHandleHovered,
    handleResizeStart: handleLibraryResizeStart,
  } = useMusicPanelResizer({
    min: 290,
    max: 390,
    defaultWidth: 340,
    direction: 'right',
    storageKey: 'eternal_music_lib_width',
  });

  const [isBookHovered, setIsBookHovered] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSortViewMenuOpen, setIsSortViewMenuOpen] = useState(false);

  const createButtonRef = useRef<HTMLButtonElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sortViewButtonRef = useRef<HTMLButtonElement>(null);
  const sortViewMenuRef = useRef<HTMLDivElement>(null);

  // Blank area context menu state ("Create a playlist" & "Create folder")
  const [emptyAreaMenu, setEmptyAreaMenu] = useState<{ x: number; y: number } | null>(null);

  // Active playlist context menu
  const [activePlaylistMenu, setActivePlaylistMenu] = useState<{
    playlist: MusicPlaylist;
    rect: DOMRect;
  } | null>(null);

  // Liked Songs dedicated context menu (Screenshot 4: ONLY Pin/Unpin)
  const [likedSongsMenu, setLikedSongsMenu] = useState<{ x: number; y: number } | null>(null);

  // Folder and Track context menu for Library
  const [libraryItemMenu, setLibraryItemMenu] = useState<{
    id: string;
    type: 'folder' | 'track';
    title: string;
    x: number;
    y: number;
  } | null>(null);

  // Active folder slide-in view state
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [renameModalFolder, setRenameModalFolder] = useState<MusicFolder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<MusicFolder | null>(null);
  const [isActiveFolderMenuOpen, setIsActiveFolderMenuOpen] = useState(false);
  const folderMenuButtonRef = useRef<HTMLButtonElement>(null);
  const activeFolderMenuRef = useRef<HTMLDivElement>(null);

  // Synchronize playlists and folders freshly with backend on mount
  useEffect(() => {
    if (currentUser?.id) {
      useMusicHubStore.getState().fetchUserPlaylistsFromBackend(currentUser.id);
      useMusicHubStore.getState().fetchUserFoldersFromBackend(currentUser.id);
      useMusicHubStore.getState().fetchUserLikedTracksFromBackend(currentUser.id);
    }
  }, [currentUser?.id]);

  const activeFolder = useMemo(
    () => musicFolders.find((f) => f.id === activeFolderId) || null,
    [musicFolders, activeFolderId],
  );

  const folderPlaylists = useMemo(() => {
    if (!activeFolder) return [];
    return playlists.filter(
      (p) => activeFolder.playlistIds.includes(p.id) || (p as any).folderId === activeFolder.id,
    );
  }, [activeFolder, playlists]);

  // Close folder options menu on outside click
  useEffect(() => {
    if (!isActiveFolderMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (folderMenuButtonRef.current?.contains(target)) return;
      if (activeFolderMenuRef.current && !activeFolderMenuRef.current.contains(target)) {
        setIsActiveFolderMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isActiveFolderMenuOpen]);

  // Storage key per user per device
  const userStorageKey = `spotify_library_prefs_${currentUser?.id || 'guest'}`;

  // Restore user preferences from localStorage on mount or user change
  useEffect(() => {
    try {
      const raw = localStorage.getItem(userStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.viewMode) {
          setLibraryViewMode(parsed.viewMode);
        }
        if (parsed.sortMode) {
          setLibrarySort(parsed.sortMode);
        }
      }
    } catch (e) {
      console.error('Failed to load library preferences', e);
    }
  }, [userStorageKey, setLibraryViewMode, setLibrarySort]);

  // Persist view mode changes
  const handleSelectViewMode = (mode: MusicLibraryViewMode) => {
    setLibraryViewMode(mode);
    try {
      const raw = localStorage.getItem(userStorageKey);
      const existing = raw ? JSON.parse(raw) : {};
      localStorage.setItem(userStorageKey, JSON.stringify({ ...existing, viewMode: mode }));
    } catch {}
  };

  // Persist sort changes
  const handleSelectSort = (sort: MusicLibrarySort) => {
    setLibrarySort(sort);
    try {
      const raw = localStorage.getItem(userStorageKey);
      const existing = raw ? JSON.parse(raw) : {};
      localStorage.setItem(userStorageKey, JSON.stringify({ ...existing, sortMode: sort }));
    } catch {}
  };

  // Close create menu on click outside
  useEffect(() => {
    if (!isCreateMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (createButtonRef.current?.contains(target)) return;
      if (createMenuRef.current && !createMenuRef.current.contains(target)) {
        setIsCreateMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isCreateMenuOpen]);

  // Close search bar on click outside (sidebar mode)
  useEffect(() => {
    if (!isSearchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isSearchOpen]);

  // Close sort & view menu on click outside
  useEffect(() => {
    if (!isSortViewMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (sortViewButtonRef.current?.contains(target)) return;
      if (sortViewMenuRef.current && !sortViewMenuRef.current.contains(target)) {
        setIsSortViewMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSortViewMenuOpen(false);
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isSortViewMenuOpen]);

  // Close empty area context menu on click outside or Escape
  useEffect(() => {
    if (!emptyAreaMenu) return;
    const handleClose = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-empty-menu-portal]')) return;
      setEmptyAreaMenu(null);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEmptyAreaMenu(null);
    };
    window.addEventListener('mousedown', handleClose);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClose);
      window.removeEventListener('keydown', handleKey);
    };
  }, [emptyAreaMenu]);

  // Close liked songs and library item context menus on click outside or Escape
  useEffect(() => {
    if (!likedSongsMenu && !libraryItemMenu) return;
    const handleClose = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest('[data-liked-menu-portal]') ||
        target?.closest('[data-library-item-menu]')
      )
        return;
      setLikedSongsMenu(null);
      setLibraryItemMenu(null);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLikedSongsMenu(null);
        setLibraryItemMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClose);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClose);
      window.removeEventListener('keydown', handleKey);
    };
  }, [likedSongsMenu, libraryItemMenu]);

  const _likedSongsPlaylist: MusicPlaylist = useMemo(
    () => ({
      id: 'liked-songs',
      title: 'Liked Songs',
      description: 'Your personal collection of liked tracks',
      coverUrl: '',
      tracks: likedTracks,
      creator: 'You',
      createdAt: '',
    }),
    [likedTracks],
  );

  const handleLikedSongsContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEmptyAreaMenu(null);
    setActivePlaylistMenu(null);
    setLibraryItemMenu(null);
    setLikedSongsMenu({ x: e.clientX, y: e.clientY });
  };

  const handleFolderContextMenu = (e: React.MouseEvent, folder: MusicFolder) => {
    e.preventDefault();
    e.stopPropagation();
    setEmptyAreaMenu(null);
    setActivePlaylistMenu(null);
    setLikedSongsMenu(null);
    setLibraryItemMenu({
      id: folder.id,
      type: 'folder',
      title: folder.name,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleTrackContextMenu = (e: React.MouseEvent, track: SpotifyTrack) => {
    e.preventDefault();
    e.stopPropagation();
    setEmptyAreaMenu(null);
    setActivePlaylistMenu(null);
    setLikedSongsMenu(null);
    setLibraryItemMenu({
      id: track.id,
      type: 'track',
      title: track.title,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handlePlaylistContextMenu = (e: React.MouseEvent, pl: MusicPlaylist) => {
    e.preventDefault();
    e.stopPropagation();
    setEmptyAreaMenu(null);
    setLikedSongsMenu(null);
    setLibraryItemMenu(null);
    if (activePlaylistMenu?.playlist.id === pl.id) {
      setActivePlaylistMenu(null);
    } else {
      setActivePlaylistMenu({
        playlist: pl,
        rect: DOMRectReadOnly.fromRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 }),
      });
    }
  };

  const handlePanelContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-no-panel-context]')) return;
    e.preventDefault();
    e.stopPropagation();
    setActivePlaylistMenu(null);
    setLikedSongsMenu(null);
    setLibraryItemMenu(null);
    setEmptyAreaMenu({ x: e.clientX, y: e.clientY });
  };

  // Check if active playing track belongs to Liked Songs
  const isPlayingLikedSongs = Boolean(
    isPlaying && currentTrack && likedTracks.some((t) => t.id === currentTrack.id),
  );

  // Normalized search query
  const query = librarySearchQuery.toLowerCase().trim();

  // 1. Folders Filter & Search
  const filteredFolders = useMemo(() => {
    if (libraryFilter === 'tracks') return [];
    let list = [...musicFolders];
    if (query) {
      list = list.filter((f) => f.name.toLowerCase().includes(query));
    }
    if (librarySort === 'alphabetical') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    // Float pinned folders to the top
    list.sort((a, b) => (isItemPinned(b.id) ? 1 : 0) - (isItemPinned(a.id) ? 1 : 0));
    return list;
  }, [musicFolders, libraryFilter, query, librarySort, isItemPinned]);

  // 2. Liked Songs matches query
  const isLikedSongsMatching = useMemo(() => {
    if (likedTracks.length === 0) return false;
    if (libraryFilter === 'tracks') return false;
    if (!query) return true;
    if (
      'liked songs'.includes(query) ||
      'liked songs'.includes(query) ||
      'playlist'.includes(query)
    ) {
      return true;
    }
    return likedTracks.some(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.artist.toLowerCase().includes(query) ||
        t.album?.toLowerCase().includes(query),
    );
  }, [likedTracks, libraryFilter, query]);

  // 3. Playlists Filter & Search (matches title, description, creator, or any track)
  const filteredPlaylists = useMemo(() => {
    if (libraryFilter === 'tracks') return [];
    let list = [...playlists];

    if (query) {
      list = list.filter((p) => {
        if (p.title.toLowerCase().includes(query)) return true;
        if (p.description?.toLowerCase().includes(query)) return true;
        if (p.creator?.toLowerCase().includes(query)) return true;
        return p.tracks.some(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            t.artist.toLowerCase().includes(query) ||
            t.album?.toLowerCase().includes(query),
        );
      });
    }

    if (librarySort === 'alphabetical') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (librarySort === 'recently-added' || librarySort === 'added') {
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } else if (librarySort === 'author') {
      list.sort((a, b) => (a.creator || '').localeCompare(b.creator || ''));
    }

    // Float pinned playlists to the top
    list.sort((a, b) => (isItemPinned(b.id) ? 1 : 0) - (isItemPinned(a.id) ? 1 : 0));

    return list;
  }, [playlists, libraryFilter, query, librarySort, isItemPinned]);

  // 4. Tracks Filter & Search (when libraryFilter === 'tracks')
  const filteredTracks = useMemo(() => {
    if (libraryFilter !== 'tracks') return [];
    const trackMap = new Map<string, SpotifyTrack>();
    likedTracks.forEach((t) => trackMap.set(t.id, t));
    playlists.forEach((p) => p.tracks.forEach((t) => trackMap.set(t.id, t)));
    let list = Array.from(trackMap.values());

    if (query) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query) ||
          t.album?.toLowerCase().includes(query),
      );
    }

    if (librarySort === 'alphabetical') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (librarySort === 'author') {
      list.sort((a, b) => a.artist.localeCompare(b.artist));
    }

    // Float pinned tracks to the top
    list.sort((a, b) => (isItemPinned(b.id) ? 1 : 0) - (isItemPinned(a.id) ? 1 : 0));

    return list;
  }, [likedTracks, playlists, libraryFilter, query, librarySort, isItemPinned]);

  const hasAnyItems =
    isLikedSongsMatching ||
    filteredFolders.length > 0 ||
    filteredPlaylists.length > 0 ||
    filteredTracks.length > 0;

  const isLibraryCompletelyEmpty =
    likedTracks.length === 0 && musicFolders.length === 0 && playlists.length === 0;

  // Presentation labels & options
  const sortOptions: { key: MusicLibrarySort; label: string }[] = [
    { key: 'recent', label: 'Recents' },
    { key: 'recently-added', label: 'Recently Added' },
    { key: 'alphabetical', label: 'Alphabetical' },
    { key: 'author', label: 'Creator' },
  ];

  const viewOptions: { key: MusicLibraryViewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'compact', label: 'Compact', icon: <AlignJustify size={16} /> },
    { key: 'list', label: 'List', icon: <List size={16} /> },
    { key: 'grid-covers', label: 'Cover Grid', icon: <Grid3X3 size={16} /> },
    { key: 'grid-cards', label: 'Card Grid', icon: <LayoutGrid size={16} /> },
  ];

  const sortLabels: Record<string, string> = {
    recent: 'Recents',
    'recently-added': 'Recently Added',
    added: 'Recently Added',
    alphabetical: 'Alphabetical',
    author: 'Creator',
  };

  const viewModeLabels: Record<MusicLibraryViewMode, string> = {
    compact: 'Compact',
    list: 'List',
    'grid-covers': 'Cover Grid',
    'grid-cards': 'Card Grid',
  };

  const renderViewIcon = (mode: MusicLibraryViewMode) => {
    switch (mode) {
      case 'compact':
        return <AlignJustify size={14} className="shrink-0" />;
      case 'grid-covers':
        return <Grid3X3 size={14} className="shrink-0" />;
      case 'grid-cards':
        return <LayoutGrid size={14} className="shrink-0" />;
      case 'list':
      default:
        return <List size={14} className="shrink-0" />;
    }
  };

  return (
    <>
      <aside
        onContextMenu={handlePanelContextMenu}
        style={{
          width: isLibraryFullWidth ? '100%' : isLibraryExpanded ? libraryWidth : 72,
          transition: isLibraryResizing ? 'none' : 'width 300ms cubic-bezier(0.16,1,0.3,1)',
        }}
        className="relative h-full flex flex-col bg-[#121216]/85 backdrop-blur-2xl border-r border-white/5 select-none overflow-hidden z-10 flex-shrink-0"
      >
        {/* ========================================================= */}
        {/* 1. COLLAPSED VIEW HEADER (Width 72px, 1-to-1 with Spotify) */}
        {/* ========================================================= */}
        {!isLibraryExpanded ? (
          <div className="h-16 flex items-center justify-center w-full shrink-0 border-b border-white/5">
            {/* Top Library Expand Button */}
            <Tooltip label="Expand library section" position="right">
              <button
                type="button"
                aria-label="Expand library section"
                onClick={toggleLibraryExpanded}
                onMouseEnter={() => setIsBookHovered(true)}
                onMouseLeave={() => setIsBookHovered(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors active:scale-95 cursor-pointer"
              >
                {isBookHovered ? (
                  <PanelLeftOpen size={20} className="text-purple-400 transition-transform" />
                ) : (
                  <BookOpen size={20} className="transition-transform" />
                )}
              </button>
            </Tooltip>
          </div>
        ) : (
          /* ========================================================= */
          /* 2. EXPANDED VIEW HEADER                                   */
          /* ========================================================= */
          <div
            className={`flex items-center justify-between border-b border-white/5 shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] h-16 ${
              isLibraryFullWidth ? 'px-6' : 'px-4'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Tooltip label="Collapse library section" position="right">
                <button
                  type="button"
                  aria-label="Collapse library section"
                  onClick={toggleLibraryExpanded}
                  onMouseEnter={() => setIsBookHovered(true)}
                  onMouseLeave={() => setIsBookHovered(false)}
                  className="group p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer active:scale-95 shrink-0 flex items-center justify-center"
                >
                  {isBookHovered ? (
                    <PanelLeftClose size={18} className="text-purple-400 transition-transform" />
                  ) : (
                    <BookOpen size={18} className="transition-transform" />
                  )}
                </button>
              </Tooltip>
              <h2
                className={`font-bold text-white tracking-tight truncate ${
                  isLibraryFullWidth ? 'text-lg' : 'text-base'
                }`}
              >
                Your Library
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  ref={createButtonRef}
                  type="button"
                  data-menu-trigger="true"
                  onClick={() => setIsCreateMenuOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                    isCreateMenuOpen
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'bg-white/10 hover:bg-white/15 text-white'
                  }`}
                >
                  <Plus
                    size={14}
                    className={`transition-transform duration-300 ease-out transform ${
                      isCreateMenuOpen ? 'rotate-90 text-purple-400' : 'rotate-0'
                    }`}
                  />
                  <span>Create</span>
                </button>

                {/* Dropdown Menu (Spotify style: 2 buttons only) */}
                {isCreateMenuOpen && (
                  <div
                    ref={createMenuRef}
                    data-menu-portal="true"
                    className="absolute right-0 top-10 w-64 rounded-2xl bg-[#222228]/98 backdrop-blur-2xl border border-white/10 shadow-2xl p-2 z-[70] text-white animate-fadeIn select-none flex flex-col gap-1 origin-top-right"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateMenuOpen(false);
                        const creatorName =
                          currentUser?.displayName || currentUser?.username || 'You';
                        const newPl = createPlaylist(
                          undefined,
                          undefined,
                          undefined,
                          creatorName,
                          currentUser?.id,
                          false,
                          currentUser?.username,
                          currentUser?.avatar,
                        );
                        if (isLibraryFullWidth) setLibraryFullWidth(false);
                        navigate(`/music/playlist/${newPl.id}`);
                      }}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition-colors text-left group w-full cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-300 group-hover:text-white group-hover:bg-purple-600/30 shrink-0 transition-colors">
                        <ListPlus size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                          Playlist
                        </div>
                        <div className="text-xs text-gray-400 leading-snug">
                          Create a playlist with songs
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateMenuOpen(false);
                        createMusicFolder();
                      }}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition-colors text-left group w-full cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-300 group-hover:text-white group-hover:bg-purple-600/30 shrink-0 transition-colors">
                        <Folder size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                          Folder
                        </div>
                        <div className="text-xs text-gray-400 leading-snug">
                          Organize your playlists
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Top-Right Expand / Restore Button */}
              <Tooltip
                label={isLibraryFullWidth ? 'Collapse library panel' : 'Expand library panel'}
                position="bottom"
              >
                <button
                  type="button"
                  aria-label={
                    isLibraryFullWidth ? 'Collapse library panel' : 'Expand library panel'
                  }
                  onClick={toggleLibraryFullWidth}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {isLibraryFullWidth ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </Tooltip>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. FILTERS, SEARCH & PRESENTATION CONTROLS (EXPANDED)    */}
        {/* ========================================================= */}
        {isLibraryExpanded && (
          <>
            {isLibraryFullWidth ? (
              /* ----------------------------------------------------- */
              /* FULL-WIDTH TOOLBAR (1-to-1 with Spotify Screenshot 1) */
              /* ----------------------------------------------------- */
              <div className="px-6 py-3 flex items-center justify-between gap-4 shrink-0 border-b border-white/5">
                {/* Left: Filter Buttons (Larger, more balanced pills) */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setLibraryFilter('all')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                      libraryFilter === 'all'
                        ? 'bg-white text-black font-bold shadow-md'
                        : 'bg-white/10 hover:bg-white/15 text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryFilter('playlists')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                      libraryFilter === 'playlists'
                        ? 'bg-white text-black font-bold shadow-md'
                        : 'bg-white/10 hover:bg-white/15 text-white'
                    }`}
                  >
                    Playlists
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryFilter('tracks')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                      libraryFilter === 'tracks'
                        ? 'bg-white text-black font-bold shadow-md'
                        : 'bg-white/10 hover:bg-white/15 text-white'
                    }`}
                  >
                    Tracks
                  </button>
                </div>

                {/* Right: Always Active Open Search Input + Sort & View Button */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Open search input */}
                  <div className="relative flex items-center w-60 sm:w-72 h-9 px-3.5 rounded-full bg-white/5 border border-white/10 focus-within:border-purple-500/50 focus-within:bg-white/10 transition-all text-white shadow-inner">
                    <Search size={15} className="text-gray-400 shrink-0 mr-2" />
                    <input
                      type="text"
                      value={librarySearchQuery}
                      onChange={(e) => setLibrarySearchQuery(e.target.value)}
                      placeholder="Search in Your Library"
                      data-no-panel-context="true"
                      className="bg-transparent border-none text-xs text-white placeholder-gray-400 focus:outline-none w-full min-w-0"
                    />
                    {librarySearchQuery && (
                      <button
                        type="button"
                        onClick={() => setLibrarySearchQuery('')}
                        aria-label="Clear search"
                        className="text-gray-400 hover:text-white p-0.5 rounded-full hover:bg-white/10 shrink-0 transition-colors cursor-pointer ml-1"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Sort & View Dropdown Button */}
                  <div className="relative shrink-0">
                    <button
                      ref={sortViewButtonRef}
                      type="button"
                      onClick={() => {
                        setIsSortViewMenuOpen((prev) => !prev);
                        setIsCreateMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                        isSortViewMenuOpen
                          ? 'bg-white/20 text-white shadow-md'
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span className="truncate max-w-[120px]">
                        {sortLabels[librarySort] || 'Recents'}
                      </span>
                      {renderViewIcon(libraryViewMode)}
                    </button>

                    {/* Sort & View Dropdown Menu */}
                    {isSortViewMenuOpen && (
                      <div
                        ref={sortViewMenuRef}
                        data-menu-portal="true"
                        className="absolute right-0 top-10 w-64 rounded-2xl bg-[#222228]/98 backdrop-blur-2xl border border-white/10 shadow-2xl p-2 z-50 text-white animate-fadeIn select-none flex flex-col gap-0.5 origin-top-right"
                      >
                        {/* 1. Sorting Header */}
                        <div className="px-3 pt-1 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                          Sort by
                        </div>
                        {sortOptions.map((opt) => {
                          const isSelected =
                            librarySort === opt.key || (opt.key === 'recent' && !librarySort);
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                handleSelectSort(opt.key);
                                setIsSortViewMenuOpen(false);
                              }}
                              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-xs font-semibold cursor-pointer w-full text-left"
                            >
                              <span
                                className={
                                  isSelected ? 'text-purple-400 font-bold' : 'text-gray-200'
                                }
                              >
                                {opt.label}
                              </span>
                              {isSelected && <Check size={16} className="text-purple-400" />}
                            </button>
                          );
                        })}

                        <div className="border-t border-white/10 my-1" />

                        {/* 2. Presentation Header */}
                        <div className="flex items-center justify-between px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                          <span>View</span>
                          <span className="text-gray-300 font-semibold normal-case">
                            {viewModeLabels[libraryViewMode]}
                          </span>
                        </div>

                        {/* Segmented Liquid Glass Bubble Switcher (4 Options) */}
                        <div className="relative flex items-center justify-between bg-black/40 border border-white/5 rounded-xl p-1 gap-1 my-1">
                          {viewOptions.map((opt) => {
                            const isActive = libraryViewMode === opt.key;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                title={opt.label}
                                onClick={() => handleSelectViewMode(opt.key)}
                                className="relative flex-1 flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer z-10"
                              >
                                {isActive && (
                                  <motion.div
                                    layoutId="library-view-bubble-full"
                                    className="absolute inset-0 bg-purple-600/25 backdrop-blur-md rounded-lg border border-purple-500/40 shadow-md"
                                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                                  />
                                )}
                                <span
                                  className={`relative z-20 ${isActive ? 'text-purple-400' : ''}`}
                                >
                                  {opt.icon}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ----------------------------------------------------- */
              /* SIDEBAR TOOLBAR (Width 340px)                         */
              /* ----------------------------------------------------- */
              <div className="px-4 pt-3 pb-2 space-y-2 shrink-0">
                {/* Filter Pills */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLibraryFilter('all')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      libraryFilter === 'all'
                        ? 'bg-white text-black font-bold'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryFilter('playlists')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      libraryFilter === 'playlists'
                        ? 'bg-white text-black font-bold'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Playlists
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryFilter('tracks')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      libraryFilter === 'tracks'
                        ? 'bg-white text-black font-bold'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Tracks
                  </button>
                </div>

                {/* Sub-header: Search Icon Button (Slide-out) + Sort/View Dropdown */}
                <div className="flex items-center justify-between gap-2 pt-0.5 relative min-h-[36px]">
                  {/* Left: Expandable Search Bar */}
                  <div className="flex-1 min-w-0 flex items-center">
                    <AnimatePresence initial={false}>
                      {isSearchOpen ? (
                        <motion.div
                          key="search-input"
                          ref={searchContainerRef}
                          initial={{ width: 36, opacity: 0 }}
                          animate={{ width: '100%', opacity: 1 }}
                          exit={{ width: 36, opacity: 0 }}
                          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white shadow-inner max-w-full"
                        >
                          <Search size={14} className="text-gray-400 shrink-0" />
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={librarySearchQuery}
                            onChange={(e) => setLibrarySearchQuery(e.target.value)}
                            placeholder="Search in Your Library..."
                            data-no-panel-context="true"
                            className="bg-transparent border-none text-xs text-white placeholder-gray-400 focus:outline-none w-full min-w-0"
                            autoFocus
                          />
                          {librarySearchQuery && (
                            <button
                              type="button"
                              onClick={() => setLibrarySearchQuery('')}
                              className="text-gray-400 hover:text-white p-0.5 rounded-full hover:bg-white/10 shrink-0 transition-colors cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </motion.div>
                      ) : (
                        <motion.button
                          key="search-button"
                          type="button"
                          aria-label="Search in library"
                          onClick={() => {
                            setIsSearchOpen(true);
                            setIsSortViewMenuOpen(false);
                          }}
                          className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                        >
                          <Search size={16} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Right: Sort & Presentation Dropdown Button */}
                  <div className="relative shrink-0">
                    <button
                      ref={sortViewButtonRef}
                      type="button"
                      onClick={() => {
                        setIsSortViewMenuOpen((prev) => !prev);
                        setIsCreateMenuOpen(false);
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                        isSortViewMenuOpen
                          ? 'bg-white/20 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate max-w-[85px]">
                        {sortLabels[librarySort] || 'Recents'}
                      </span>
                      {renderViewIcon(libraryViewMode)}
                    </button>

                    {/* Dropdown Menu */}
                    {isSortViewMenuOpen && (
                      <div
                        ref={sortViewMenuRef}
                        data-menu-portal="true"
                        className="absolute right-0 top-10 w-60 rounded-2xl bg-[#222228]/98 backdrop-blur-2xl border border-white/10 shadow-2xl p-2 z-50 text-white animate-fadeIn select-none flex flex-col gap-0.5"
                      >
                        {/* 1. Sorting Header */}
                        <div className="px-3 pt-1 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                          Sort by
                        </div>
                        {sortOptions.map((opt) => {
                          const isSelected =
                            librarySort === opt.key || (opt.key === 'recent' && !librarySort);
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                handleSelectSort(opt.key);
                                setIsSortViewMenuOpen(false);
                              }}
                              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-xs font-semibold cursor-pointer w-full text-left"
                            >
                              <span
                                className={
                                  isSelected ? 'text-purple-400 font-bold' : 'text-gray-200'
                                }
                              >
                                {opt.label}
                              </span>
                              {isSelected && <Check size={16} className="text-purple-400" />}
                            </button>
                          );
                        })}

                        <div className="border-t border-white/10 my-1" />

                        {/* 2. Presentation Header */}
                        <div className="flex items-center justify-between px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                          <span>View</span>
                          <span className="text-gray-300 font-semibold normal-case">
                            {viewModeLabels[libraryViewMode]}
                          </span>
                        </div>

                        {/* Segmented Liquid Glass Bubble Switcher (4 Options) */}
                        <div className="relative flex items-center justify-between bg-black/40 border border-white/5 rounded-xl p-1 gap-1 my-1">
                          {viewOptions.map((opt) => {
                            const isActive = libraryViewMode === opt.key;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                title={opt.label}
                                onClick={() => handleSelectViewMode(opt.key)}
                                className="relative flex-1 flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer z-10"
                              >
                                {isActive && (
                                  <motion.div
                                    layoutId="library-view-bubble"
                                    className="absolute inset-0 bg-purple-600/25 backdrop-blur-md rounded-lg border border-purple-500/40 shadow-md"
                                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                                  />
                                )}
                                <span
                                  className={`relative z-20 ${isActive ? 'text-purple-400' : ''}`}
                                >
                                  {opt.icon}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* 4. CONTENT AREA (FULL-WIDTH vs COLLAPSED vs EXPANDED)     */}
        {/* ========================================================= */}
        {!isLibraryExpanded ? (
          /* --------------------------------------------------------- */
          /* COLLAPSED LIST VIEW (Width 72px, 1-to-1 with Spotify)     */
          /* --------------------------------------------------------- */
          <div
            style={{ paddingBottom: `${dockOffset + 16}px` }}
            className="flex-1 w-full overflow-y-auto custom-scrollbar flex flex-col items-center gap-2.5 py-3 px-0 select-none"
          >
            {/* Circular + Create Button in collapsed mode */}
            <Tooltip label="Create" position="right">
              <button
                ref={createButtonRef}
                type="button"
                aria-label="Create"
                data-menu-trigger="true"
                onClick={() => setIsCreateMenuOpen((prev) => !prev)}
                className={`w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${
                  isCreateMenuOpen ? 'bg-white/20 text-white' : ''
                }`}
              >
                <Plus
                  size={16}
                  className={`transition-transform duration-300 ease-out transform ${
                    isCreateMenuOpen ? 'rotate-90 text-purple-400' : 'rotate-0'
                  }`}
                />
              </button>
            </Tooltip>

            {/* Create Menu Portal when collapsed */}
            {isCreateMenuOpen &&
              createPortal(
                <div
                  ref={createMenuRef}
                  data-menu-portal="true"
                  style={{
                    top: createButtonRef.current
                      ? createButtonRef.current.getBoundingClientRect().top
                      : 60,
                    left: 78,
                  }}
                  className="fixed w-64 rounded-2xl bg-[#222228]/98 backdrop-blur-2xl border border-white/10 shadow-2xl p-2 z-[9999] text-white animate-fadeIn select-none flex flex-col gap-1 origin-top-left"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateMenuOpen(false);
                      const creatorName =
                        currentUser?.displayName || currentUser?.username || 'You';
                      const newPl = createPlaylist(
                        undefined,
                        undefined,
                        undefined,
                        creatorName,
                        currentUser?.id,
                        false,
                        currentUser?.username,
                        currentUser?.avatar,
                      );
                      if (isLibraryFullWidth) setLibraryFullWidth(false);
                      navigate(`/music/playlist/${newPl.id}`);
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition-colors text-left group w-full cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-300 group-hover:text-white group-hover:bg-purple-600/30 shrink-0 transition-colors">
                      <ListPlus size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                        Playlist
                      </div>
                      <div className="text-xs text-gray-400 leading-snug">
                        Create a playlist with songs
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateMenuOpen(false);
                      createMusicFolder();
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition-colors text-left group w-full cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-300 group-hover:text-white group-hover:bg-purple-600/30 shrink-0 transition-colors">
                      <Folder size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                        Folder
                      </div>
                      <div className="text-xs text-gray-400 leading-snug">
                        Organize your playlists
                      </div>
                    </div>
                  </button>
                </div>,
                document.body,
              )}

            {/* 1. Liked Songs Tile */}
            {likedTracks.length > 0 && (
              <Tooltip label="Liked Songs • Playlist" position="right">
                <div
                  onClick={() => {
                    setSelectedPlaylistId('liked-songs');
                    navigate('/music/playlist/liked-songs');
                  }}
                  onContextMenu={handleLikedSongsContextMenu}
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center shadow-md shadow-purple-950/40 cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0 ${
                    selectedPlaylistId === 'liked-songs'
                      ? 'ring-2 ring-purple-500 shadow-purple-500/40'
                      : ''
                  }`}
                >
                  <Heart size={20} className="text-white fill-white" />
                </div>
              </Tooltip>
            )}

            {/* 2. Folders Tiles */}
            {musicFolders.map((folder, idx) => (
              <Tooltip
                key={`lib-col-fld-${folder.id}-${idx}`}
                label={`${folder.name} • Folder`}
                position="right"
              >
                <div
                  onClick={() => {
                    if (!isLibraryExpanded) toggleLibraryExpanded();
                    setActiveFolderId(folder.id);
                  }}
                  onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                  className="w-12 h-12 rounded-xl bg-[#24242b] border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0"
                >
                  <Folder size={22} />
                </div>
              </Tooltip>
            ))}

            {/* 3. Playlists Tiles */}
            {playlists.map((pl, idx) => (
              <Tooltip
                key={`lib-col-pl-${pl.id}-${idx}`}
                label={`${pl.title} • Playlist • ${pl.creator || 'Eternal'}`}
                position="right"
              >
                <div
                  onClick={() => {
                    setSelectedPlaylistId(pl.id);
                    navigate(`/music/playlist/${pl.id}`);
                  }}
                  onContextMenu={(e) => handlePlaylistContextMenu(e, pl)}
                  className={`w-12 h-12 rounded-xl bg-[#282828] border border-white/5 overflow-hidden flex items-center justify-center shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0 ${
                    selectedPlaylistId === pl.id
                      ? 'ring-2 ring-purple-500 shadow-purple-500/40'
                      : ''
                  }`}
                >
                  {pl.coverUrl ? (
                    <img src={pl.coverUrl} alt={pl.title} className="w-full h-full object-cover" />
                  ) : (
                    <Music2 size={22} className="text-[#b3b3b3]" />
                  )}
                </div>
              </Tooltip>
            ))}
          </div>
        ) : (
          /* --------------------------------------------------------- */
          /* EXPANDED & FULL-WIDTH PRESENTATION MODES (4 MODES)        */
          /* --------------------------------------------------------- */
          <div
            style={{ paddingBottom: `${dockOffset + 24}px` }}
            className={`flex-1 overflow-y-auto custom-scrollbar select-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isLibraryFullWidth ? 'p-6' : 'p-2'
            }`}
          >
            {/* Empty States */}
            {isLibraryCompletelyEmpty && (
              <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3 text-gray-400">
                  <BookOpen size={22} />
                </div>
                <p className="text-sm font-bold text-gray-200">Your library is empty</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm leading-relaxed">
                  Save tracks and playlists from the catalog or create your own.
                </p>
              </div>
            )}

            {!isLibraryCompletelyEmpty && !hasAnyItems && (
              <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3 text-gray-400">
                  <Search size={22} />
                </div>
                <p className="text-sm font-bold text-gray-200">No results found</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm leading-relaxed">
                  For "{librarySearchQuery}" has no matches in your library.
                </p>
              </div>
            )}

            {/* ======================================================= */}
            {/* MODE 1: COMPACT */}
            {/* ======================================================= */}
            {hasAnyItems && libraryViewMode === 'compact' && (
              <div className="space-y-1">
                {/* Liked Songs Entry */}
                {isLikedSongsMatching && (
                  <div
                    onClick={() => {
                      if (isLibraryFullWidth) setLibraryFullWidth(false);
                      setSelectedPlaylistId('liked-songs');
                      navigate('/music/playlist/liked-songs');
                    }}
                    onContextMenu={handleLikedSongsContextMenu}
                    className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                      selectedPlaylistId === 'liked-songs'
                        ? 'bg-purple-600/20 border border-purple-500/30'
                        : 'hover:bg-white/5 text-gray-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                      <Heart size={16} className="text-purple-400 fill-purple-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold text-white truncate block group-hover:text-purple-300 transition-colors">
                          Liked Songs
                        </span>
                        <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                          {isItemPinned('liked-songs') && (
                            <Pin size={11} className="text-purple-400 shrink-0 rotate-45" />
                          )}
                          <span>Playlist • {formatTracksDeclension(likedTracks.length)}</span>
                        </p>
                      </div>
                    </div>
                    {isPlayingLikedSongs && (
                      <Volume2 size={16} className="text-purple-400 animate-pulse shrink-0 ml-2" />
                    )}
                  </div>
                )}

                {/* Folders */}
                {filteredFolders.map((folder, idx) => (
                  <div
                    key={`lib-compact-fld-${folder.id}-${idx}`}
                    onClick={() => setActiveFolderId(folder.id)}
                    onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                    className="group flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all hover:bg-white/5 text-gray-200"
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                      <Folder
                        size={16}
                        className="text-gray-400 group-hover:text-white shrink-0 transition-colors"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold text-white truncate block group-hover:text-purple-300 transition-colors">
                          {folder.name}
                        </span>
                        <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                          {isItemPinned(folder.id) && (
                            <Pin size={11} className="text-purple-400 shrink-0 rotate-45" />
                          )}
                          <span>
                            Folder •{' '}
                            {folder.playlistIds.length === 0
                              ? '0 playlists'
                              : `${folder.playlistIds.length} ${formatPlaylistsDeclension(folder.playlistIds.length)}`}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Playlists */}
                {filteredPlaylists.map((pl, idx) => {
                  const isSelected = selectedPlaylistId === pl.id;
                  const isPlayingThis =
                    isPlaying && currentTrack && pl.tracks.some((t) => t.id === currentTrack.id);
                  return (
                    <div
                      key={`lib-compact-pl-${pl.id}-${idx}`}
                      onClick={() => {
                        if (isLibraryFullWidth) setLibraryFullWidth(false);
                        setSelectedPlaylistId(pl.id);
                        navigate(`/music/playlist/${pl.id}`);
                      }}
                      onContextMenu={(e) => handlePlaylistContextMenu(e, pl)}
                      className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-600/20 border border-purple-500/30'
                          : 'hover:bg-white/5 text-gray-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-3">
                        <Music2
                          size={16}
                          className="text-gray-400 group-hover:text-purple-300 shrink-0 transition-colors"
                        />
                        <div className="min-w-0 flex-1">
                          <span
                            className={`text-sm font-semibold truncate block ${
                              isPlayingThis
                                ? 'text-purple-400 font-bold'
                                : 'text-white group-hover:text-purple-300 transition-colors'
                            }`}
                          >
                            {pl.title}
                          </span>
                          <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                            {isItemPinned(pl.id) && (
                              <Pin size={11} className="text-purple-400 shrink-0 rotate-45" />
                            )}
                            <span>Playlist • {pl.creator || 'Eternal'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {isPlayingThis && (
                          <Volume2 size={16} className="text-purple-400 animate-pulse" />
                        )}
                        {(pl.creator === 'You' ||
                          pl.creator === currentUser?.displayName ||
                          pl.creator === currentUser?.username) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePlaylist(pl.id);
                            }}
                            title="Delete playlist"
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition-all cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Tracks list when filter is 'tracks' */}
                {libraryFilter === 'tracks' &&
                  filteredTracks.map((trk, idx) => {
                    const isCurrent = currentTrack?.id === trk.id;
                    return (
                      <div
                        key={`lib-compact-trk-${trk.id}-${idx}`}
                        onClick={() => playTrack(trk, filteredTracks, 'Library')}
                        onContextMenu={(e) => handleTrackContextMenu(e, trk)}
                        className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                          isCurrent
                            ? 'bg-purple-600/20 border border-purple-500/30'
                            : 'hover:bg-white/5 text-gray-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1 flex items-center gap-3">
                          <Music2 size={16} className="text-purple-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span
                              className={`text-sm font-semibold truncate block ${
                                isCurrent
                                  ? 'text-purple-400 font-bold'
                                  : 'text-white group-hover:text-purple-300 transition-colors'
                              }`}
                            >
                              {trk.title}
                            </span>
                            <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                              {isItemPinned(trk.id) && (
                                <Pin size={11} className="text-purple-400 shrink-0 rotate-45" />
                              )}
                              <span>{trk.artist}</span>
                            </p>
                          </div>
                        </div>
                        {isCurrent && isPlaying && (
                          <Volume2
                            size={16}
                            className="text-purple-400 animate-pulse shrink-0 ml-2"
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {/* ======================================================= */}
            {/* MODE 2: LIST */}
            {/* ======================================================= */}
            {hasAnyItems && libraryViewMode === 'list' && (
              <div className="space-y-1.5">
                {/* Liked Songs Entry */}
                {isLikedSongsMatching && (
                  <div
                    onClick={() => {
                      if (isLibraryFullWidth) setLibraryFullWidth(false);
                      setSelectedPlaylistId('liked-songs');
                      navigate('/music/playlist/liked-songs');
                    }}
                    onContextMenu={handleLikedSongsContextMenu}
                    className={`group relative flex items-center justify-between gap-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
                      selectedPlaylistId === 'liked-songs'
                        ? 'bg-purple-600/20 border border-purple-500/30'
                        : 'hover:bg-white/5 text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-lg shadow-purple-900/30 bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Heart size={20} className="text-white fill-white" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-bold truncate ${
                            isPlayingLikedSongs
                              ? 'text-purple-400 font-bold'
                              : 'text-white group-hover:text-purple-300 transition-colors'
                          }`}
                        >
                          Liked Songs
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                          {isItemPinned('liked-songs') && (
                            <Pin size={11} className="text-purple-400 shrink-0 rotate-45" />
                          )}
                          <span>Playlist • {formatTracksDeclension(likedTracks.length)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isPlayingLikedSongs && (
                        <Volume2 size={16} className="text-purple-400 animate-pulse" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (likedTracks.length === 0) return;
                          if (isPlayingLikedSongs) togglePlay();
                          else playTrack(likedTracks[0], likedTracks.slice(1), 'Liked Songs');
                        }}
                        className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md active:scale-95"
                      >
                        {isPlayingLikedSongs ? (
                          <Pause size={14} className="fill-white" />
                        ) : (
                          <Play size={14} className="fill-white ml-0.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Folders */}
                {filteredFolders.map((folder, idx) => (
                  <div
                    key={`lib-list-fld-${folder.id}-${idx}`}
                    onClick={() => setActiveFolderId(folder.id)}
                    onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                    className="group relative flex items-center justify-between gap-3 p-2.5 rounded-2xl cursor-pointer transition-all hover:bg-white/5 text-gray-200"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/5 bg-[#282828] flex items-center justify-center text-[#b3b3b3] group-hover:scale-105 transition-transform">
                        <Folder size={22} className="text-[#b3b3b3]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                          {folder.name}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 truncate mt-0.5">
                          {isItemPinned(folder.id) && (
                            <Pin size={11} className="text-purple-400 shrink-0 rotate-45" />
                          )}
                          <span>
                            Folder •{' '}
                            {folder.playlistIds.length === 0
                              ? '0 playlists'
                              : `${folder.playlistIds.length} ${formatPlaylistsDeclension(folder.playlistIds.length)}`}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Playlists */}
                {filteredPlaylists.map((pl, idx) => {
                  const isSelected = selectedPlaylistId === pl.id;
                  const isPlayingThis =
                    isPlaying && currentTrack && pl.tracks.some((t) => t.id === currentTrack.id);

                  return (
                    <div
                      key={`lib-list-pl-${pl.id}-${idx}`}
                      onClick={() => {
                        if (isLibraryFullWidth) setLibraryFullWidth(false);
                        setSelectedPlaylistId(pl.id);
                        navigate(`/music/playlist/${pl.id}`);
                      }}
                      onContextMenu={(e) => handlePlaylistContextMenu(e, pl)}
                      className={`group relative flex items-center justify-between gap-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-600/20 border border-purple-500/30'
                          : 'hover:bg-white/5 text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/5 bg-[#282828] flex items-center justify-center text-[#b3b3b3] group-hover:scale-105 transition-transform">
                          {pl.coverUrl ? (
                            <img
                              src={pl.coverUrl}
                              alt={pl.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Music2 size={22} className="text-[#b3b3b3]" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-bold truncate ${
                              isPlayingThis
                                ? 'text-purple-400 font-bold'
                                : 'text-white group-hover:text-purple-300 transition-colors'
                            }`}
                          >
                            {pl.title}
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-0.5 flex items-center gap-1">
                            {isItemPinned(pl.id) && (
                              <Pin size={11} className="text-purple-400 shrink-0 rotate-45" />
                            )}
                            <span>Playlist • {pl.creator || 'Eternal'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isPlayingThis && (
                          <Volume2 size={16} className="text-purple-400 animate-pulse" />
                        )}
                        {pl.tracks.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPlayingThis) togglePlay();
                              else playTrack(pl.tracks[0], pl.tracks.slice(1), pl.title);
                            }}
                            className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md active:scale-95"
                          >
                            {isPlayingThis ? (
                              <Pause size={14} className="fill-white" />
                            ) : (
                              <Play size={14} className="fill-white ml-0.5" />
                            )}
                          </button>
                        )}
                        {(pl.creator === 'You' ||
                          pl.creator === currentUser?.displayName ||
                          pl.creator === currentUser?.username) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePlaylist(pl.id);
                            }}
                            title="Delete playlist"
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition-all cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Tracks list when filter is 'tracks' */}
                {libraryFilter === 'tracks' &&
                  filteredTracks.map((trk, idx) => {
                    const isCurrent = currentTrack?.id === trk.id;
                    return (
                      <div
                        key={`lib-list-trk-${trk.id}-${idx}`}
                        onClick={() => playTrack(trk, filteredTracks, 'Library')}
                        onContextMenu={(e) => handleTrackContextMenu(e, trk)}
                        className={`group relative flex items-center justify-between gap-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
                          isCurrent
                            ? 'bg-purple-600/20 border border-purple-500/30'
                            : 'hover:bg-white/5 text-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/5 bg-[#282828] flex items-center justify-center group-hover:scale-105 transition-transform">
                            {trk.albumArt ? (
                              <img
                                src={trk.albumArt}
                                alt={trk.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Music2 size={22} className="text-[#b3b3b3]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-bold truncate ${
                                isCurrent
                                  ? 'text-purple-400 font-bold'
                                  : 'text-white group-hover:text-purple-300 transition-colors'
                              }`}
                            >
                              {trk.title}
                            </p>
                            <p className="text-xs text-gray-400 truncate mt-0.5 flex items-center gap-1">
                              {isItemPinned(trk.id) && (
                                <Pin size={11} className="text-purple-400 shrink-0 rotate-45" />
                              )}
                              <span>{trk.artist}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isCurrent && isPlaying && (
                            <Volume2 size={16} className="text-purple-400 animate-pulse" />
                          )}
                          <button
                            type="button"
                            className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md"
                          >
                            {isCurrent && isPlaying ? (
                              <Pause size={14} className="fill-white" />
                            ) : (
                              <Play size={14} className="fill-white ml-0.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* ======================================================= */}
            {/* MODE 3: GRID COVERS */}
            {/* ======================================================= */}
            {hasAnyItems && libraryViewMode === 'grid-covers' && (
              <div
                className={`grid gap-3.5 ${
                  isLibraryFullWidth
                    ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12'
                    : 'grid-cols-3'
                }`}
              >
                {/* Liked Songs */}
                {isLikedSongsMatching && (
                  <Tooltip label="Liked Songs • Playlist" position="top">
                    <div
                      onClick={() => {
                        if (isLibraryFullWidth) setLibraryFullWidth(false);
                        setSelectedPlaylistId('liked-songs');
                        navigate('/music/playlist/liked-songs');
                      }}
                      onContextMenu={handleLikedSongsContextMenu}
                      className={`w-full aspect-square rounded-2xl bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center shadow-lg cursor-pointer group hover:scale-[1.03] transition-all relative overflow-hidden ${
                        selectedPlaylistId === 'liked-songs'
                          ? 'ring-2 ring-purple-500 shadow-purple-500/40'
                          : 'border border-white/5'
                      }`}
                    >
                      <Heart size={30} className="text-white fill-white drop-shadow-md" />
                      {isItemPinned('liked-songs') && (
                        <div className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center shadow-md">
                          <Pin size={11} className="text-purple-400 rotate-45" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play size={24} className="fill-white text-white ml-0.5" />
                      </div>
                    </div>
                  </Tooltip>
                )}

                {/* Folders */}
                {filteredFolders.map((folder, idx) => (
                  <Tooltip
                    key={`lib-grid-fld-${folder.id}-${idx}`}
                    label={`${folder.name} • Folder`}
                    position="top"
                  >
                    <div
                      onClick={() => setActiveFolderId(folder.id)}
                      onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                      className="w-full aspect-square rounded-2xl bg-[#24242b] border border-white/5 flex items-center justify-center text-gray-400 hover:text-white shadow-lg cursor-pointer group hover:scale-[1.03] transition-all relative overflow-hidden"
                    >
                      <Folder size={30} />
                      {isItemPinned(folder.id) && (
                        <div className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center shadow-md">
                          <Pin size={11} className="text-purple-400 rotate-45" />
                        </div>
                      )}
                    </div>
                  </Tooltip>
                ))}

                {/* Playlists */}
                {filteredPlaylists.map((pl, idx) => (
                  <Tooltip
                    key={`lib-grid-pl-${pl.id}-${idx}`}
                    label={`${pl.title} • Playlist`}
                    position="top"
                  >
                    <div
                      onClick={() => {
                        if (isLibraryFullWidth) setLibraryFullWidth(false);
                        setSelectedPlaylistId(pl.id);
                        navigate(`/music/playlist/${pl.id}`);
                      }}
                      onContextMenu={(e) => handlePlaylistContextMenu(e, pl)}
                      className={`w-full aspect-square rounded-2xl bg-[#282828] border border-white/5 overflow-hidden flex items-center justify-center shadow-lg cursor-pointer group hover:scale-[1.03] transition-all relative ${
                        selectedPlaylistId === pl.id
                          ? 'ring-2 ring-purple-500 shadow-purple-500/40'
                          : ''
                      }`}
                    >
                      {pl.coverUrl ? (
                        <img
                          src={pl.coverUrl}
                          alt={pl.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music2 size={30} className="text-[#b3b3b3]" />
                      )}
                      {isItemPinned(pl.id) && (
                        <div className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center shadow-md">
                          <Pin size={11} className="text-purple-400 rotate-45" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play size={24} className="fill-white text-white ml-0.5" />
                      </div>
                    </div>
                  </Tooltip>
                ))}

                {/* Tracks */}
                {libraryFilter === 'tracks' &&
                  filteredTracks.map((trk, idx) => (
                    <Tooltip
                      key={`lib-grid-trk-${trk.id}-${idx}`}
                      label={`${trk.title} • ${trk.artist}`}
                      position="top"
                    >
                      <div
                        onClick={() => playTrack(trk, filteredTracks, 'Library')}
                        onContextMenu={(e) => handleTrackContextMenu(e, trk)}
                        className="w-full aspect-square rounded-2xl bg-[#282828] border border-white/5 overflow-hidden flex items-center justify-center shadow-lg cursor-pointer group hover:scale-[1.03] transition-all relative"
                      >
                        {trk.albumArt ? (
                          <img
                            src={trk.albumArt}
                            alt={trk.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Music2 size={30} className="text-[#b3b3b3]" />
                        )}
                        {isItemPinned(trk.id) && (
                          <div className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center shadow-md">
                            <Pin size={11} className="text-purple-400 rotate-45" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play size={24} className="fill-white text-white ml-0.5" />
                        </div>
                      </div>
                    </Tooltip>
                  ))}
              </div>
            )}

            {/* ======================================================= */}
            {/* MODE 4: GRID CARDS */}
            {/* ======================================================= */}
            {hasAnyItems && libraryViewMode === 'grid-cards' && (
              <div
                className={`grid gap-4 ${
                  isLibraryFullWidth
                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8'
                    : 'grid-cols-2'
                }`}
              >
                {/* Liked Songs */}
                {isLikedSongsMatching && (
                  <div
                    onClick={() => {
                      if (isLibraryFullWidth) setLibraryFullWidth(false);
                      setSelectedPlaylistId('liked-songs');
                      navigate('/music/playlist/liked-songs');
                    }}
                    onContextMenu={handleLikedSongsContextMenu}
                    className="group flex flex-col p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 cursor-pointer transition-all hover:shadow-xl"
                  >
                    <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center relative shadow-md overflow-hidden mb-2.5">
                      <Heart size={40} className="text-white fill-white drop-shadow" />
                      <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (likedTracks.length === 0) return;
                            if (isPlayingLikedSongs) togglePlay();
                            else playTrack(likedTracks[0], likedTracks.slice(1), 'Liked Songs');
                          }}
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform"
                        >
                          {isPlayingLikedSongs ? (
                            <Pause size={16} className="fill-white" />
                          ) : (
                            <Play size={16} className="fill-white ml-0.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                      Liked Songs
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5 flex items-center gap-1">
                      {isItemPinned('liked-songs') && (
                        <Pin size={11} className="text-purple-400 shrink-0 rotate-45" />
                      )}
                      <span>Playlist • {likedTracks.length}</span>
                    </p>
                  </div>
                )}

                {/* Folders */}
                {filteredFolders.map((folder, idx) => (
                  <div
                    key={`lib-card-fld-${folder.id}-${idx}`}
                    onClick={() => setActiveFolderId(folder.id)}
                    onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                    className="group flex flex-col p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 cursor-pointer transition-all hover:shadow-xl"
                  >
                    <div className="w-full aspect-square rounded-xl bg-[#24242b] border border-white/5 flex items-center justify-center text-gray-400 group-hover:text-white relative shadow-md overflow-hidden mb-2.5">
                      <Folder size={40} />
                    </div>
                    <p className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                      {folder.name}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 truncate mt-0.5">
                      {isItemPinned(folder.id) && (
                        <Pin size={11} className="text-purple-400 shrink-0 rotate-45" />
                      )}
                      <span>
                        Folder •{' '}
                        {folder.playlistIds.length === 0
                          ? '0 playlists'
                          : `${folder.playlistIds.length} ${formatPlaylistsDeclension(folder.playlistIds.length)}`}
                      </span>
                    </p>
                  </div>
                ))}

                {/* Playlists */}
                {filteredPlaylists.map((pl, idx) => {
                  const isPlayingThis =
                    isPlaying && currentTrack && pl.tracks.some((t) => t.id === currentTrack.id);
                  return (
                    <div
                      key={`lib-card-pl-${pl.id}-${idx}`}
                      onClick={() => {
                        if (isLibraryFullWidth) setLibraryFullWidth(false);
                        setSelectedPlaylistId(pl.id);
                        navigate(`/music/playlist/${pl.id}`);
                      }}
                      onContextMenu={(e) => handlePlaylistContextMenu(e, pl)}
                      className="group flex flex-col p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 cursor-pointer transition-all hover:shadow-xl"
                    >
                      <div className="w-full aspect-square rounded-xl bg-[#282828] border border-white/5 relative shadow-md overflow-hidden mb-2.5 flex items-center justify-center">
                        {pl.coverUrl ? (
                          <img
                            src={pl.coverUrl}
                            alt={pl.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <Music2 size={40} className="text-[#b3b3b3]" />
                        )}
                        {pl.tracks.length > 0 && (
                          <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isPlayingThis) togglePlay();
                                else playTrack(pl.tracks[0], pl.tracks.slice(1), pl.title);
                              }}
                              className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform"
                            >
                              {isPlayingThis ? (
                                <Pause size={16} className="fill-white" />
                              ) : (
                                <Play size={16} className="fill-white ml-0.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                        {pl.title}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5 flex items-center gap-1">
                        {isItemPinned(pl.id) && (
                          <Pin size={11} className="text-purple-400 shrink-0 rotate-45" />
                        )}
                        <span>Playlist • {pl.creator || 'Eternal'}</span>
                      </p>
                    </div>
                  );
                })}

                {/* Tracks */}
                {libraryFilter === 'tracks' &&
                  filteredTracks.map((trk, idx) => {
                    const isCurrent = currentTrack?.id === trk.id;
                    return (
                      <div
                        key={`lib-card-trk-${trk.id}-${idx}`}
                        onClick={() => playTrack(trk, filteredTracks, 'Library')}
                        onContextMenu={(e) => handleTrackContextMenu(e, trk)}
                        className="group flex flex-col p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 cursor-pointer transition-all hover:shadow-xl"
                      >
                        <div className="w-full aspect-square rounded-xl bg-[#282828] border border-white/5 relative shadow-md overflow-hidden mb-2.5 flex items-center justify-center">
                          {trk.albumArt ? (
                            <img
                              src={trk.albumArt}
                              alt={trk.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <Music2 size={40} className="text-[#b3b3b3]" />
                          )}
                          <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                            <button
                              type="button"
                              className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-xl"
                            >
                              {isCurrent && isPlaying ? (
                                <Pause size={16} className="fill-white" />
                              ) : (
                                <Play size={16} className="fill-white ml-0.5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                          {trk.title}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5 flex items-center gap-1">
                          {isItemPinned(trk.id) && (
                            <Pin size={11} className="text-purple-400 shrink-0 rotate-45" />
                          )}
                          <span>{trk.artist}</span>
                        </p>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. SLIDE-IN FOLDER PANEL (Spotify UI: Screenshot 1)       */}
        {/* ========================================================= */}
        <AnimatePresence>
          {activeFolder && (
            <motion.div
              key={`active-folder-${activeFolder.id}`}
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 z-40 flex flex-col bg-[#121216] border-r border-white/5 select-none overflow-hidden"
            >
              {/* Folder Header */}
              <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Back button */}
                  <Tooltip label="Back to Your Library" position="bottom">
                    <button
                      type="button"
                      aria-label="Back"
                      onClick={() => setActiveFolderId(null)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer active:scale-95 shrink-0 flex items-center justify-center"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  </Tooltip>

                  {/* Folder Title (Click to rename modal) */}
                  <Tooltip label="Click to rename folder" position="bottom">
                    <button
                      type="button"
                      onClick={() => setRenameModalFolder(activeFolder)}
                      className="flex items-center gap-2 group max-w-[170px] sm:max-w-[200px] text-left hover:bg-white/5 px-2 py-1 rounded-xl transition-colors cursor-pointer"
                    >
                      <span className="text-base font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                        {activeFolder.name}
                      </span>
                      <FolderEdit
                        size={14}
                        className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      />
                    </button>
                  </Tooltip>
                </div>

                {/* Right Header Actions: + Create & ... Options */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Tooltip label="Create playlist in this folder" position="bottom">
                    <button
                      type="button"
                      onClick={() => {
                        const creatorName =
                          currentUser?.displayName || currentUser?.username || 'You';
                        const newPl = createPlaylist(
                          undefined,
                          undefined,
                          undefined,
                          creatorName,
                          currentUser?.id,
                          false,
                          currentUser?.username,
                          currentUser?.avatar,
                          activeFolder.id,
                        );
                        if (isLibraryFullWidth) setLibraryFullWidth(false);
                        navigate(`/music/playlist/${newPl.id}`);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Create</span>
                    </button>
                  </Tooltip>

                  {/* 3-dots Menu for Folder */}
                  <div className="relative">
                    <button
                      ref={folderMenuButtonRef}
                      type="button"
                      aria-label="Folder options"
                      onClick={() => setIsActiveFolderMenuOpen((prev) => !prev)}
                      className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <MoreHorizontal size={18} />
                    </button>

                    {isActiveFolderMenuOpen && (
                      <div
                        ref={activeFolderMenuRef}
                        className="absolute right-0 top-10 w-48 rounded-2xl bg-[#24242b]/98 backdrop-blur-2xl border border-white/10 shadow-2xl p-1.5 text-white select-none animate-fadeIn flex flex-col gap-0.5 z-50 origin-top-right text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsActiveFolderMenuOpen(false);
                            setRenameModalFolder(activeFolder);
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200 hover:text-white group w-full text-left"
                        >
                          <FolderEdit
                            size={14}
                            className="text-gray-400 group-hover:text-purple-400 shrink-0"
                          />
                          <span>Rename</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsActiveFolderMenuOpen(false);
                            setFolderToDelete(activeFolder);
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-500/10 cursor-pointer transition-colors text-xs font-semibold text-red-400 group w-full text-left"
                        >
                          <Trash2 size={14} className="text-red-400 shrink-0" />
                          <span>Delete folder</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Folder Content */}
              <div
                style={{ paddingBottom: `${dockOffset + 24}px` }}
                className="flex-1 overflow-y-auto custom-scrollbar p-3 select-none"
              >
                {folderPlaylists.length === 0 ? (
                  /* Empty State (1-to-1 with Screenshot 1) */
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center px-6 py-12">
                    <h3 className="text-xl font-bold text-white mb-2">This folder is empty</h3>
                    <p className="text-sm text-gray-400 max-w-xs leading-relaxed mb-6">
                      Start adding playlists by creating a new one or moving existing playlists from
                      the playlist menu
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const creatorName =
                          currentUser?.displayName || currentUser?.username || 'You';
                        const newPl = createPlaylist(
                          undefined,
                          undefined,
                          undefined,
                          creatorName,
                          currentUser?.id,
                          false,
                          currentUser?.username,
                          currentUser?.avatar,
                          activeFolder.id,
                        );
                        if (isLibraryFullWidth) setLibraryFullWidth(false);
                        navigate(`/music/playlist/${newPl.id}`);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black hover:bg-gray-200 font-bold text-xs shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Create playlist</span>
                    </button>
                  </div>
                ) : (
                  /* Playlists List inside Folder */
                  <div className="space-y-1">
                    {folderPlaylists.map((pl, idx) => {
                      const isSelected = selectedPlaylistId === pl.id;
                      const isPlayingThis =
                        isPlaying &&
                        currentTrack &&
                        pl.tracks.some((t) => t.id === currentTrack.id);
                      return (
                        <div
                          key={`lib-fld-pl-${pl.id}-${idx}`}
                          onClick={() => {
                            if (isLibraryFullWidth) setLibraryFullWidth(false);
                            setSelectedPlaylistId(pl.id);
                            navigate(`/music/playlist/${pl.id}`);
                          }}
                          onContextMenu={(e) => handlePlaylistContextMenu(e, pl)}
                          className={`group relative flex items-center justify-between gap-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-purple-600/20 border border-purple-500/30'
                              : 'hover:bg-white/5 text-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/5 bg-[#282828] flex items-center justify-center text-[#b3b3b3]">
                              {pl.coverUrl ? (
                                <img
                                  src={pl.coverUrl}
                                  alt={pl.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Music2 size={22} className="text-[#b3b3b3]" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-sm font-bold truncate ${
                                  isPlayingThis
                                    ? 'text-purple-400'
                                    : 'text-white group-hover:text-purple-300 transition-colors'
                                }`}
                              >
                                {pl.title}
                              </p>
                              <p className="text-xs text-gray-400 truncate mt-0.5">
                                Playlist • {formatTracksDeclension(pl.tracks.length)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resizer Handle on Right Border */}
        {isLibraryExpanded && !isLibraryFullWidth && (
          <div
            onMouseDown={handleLibraryResizeStart}
            onMouseEnter={() => setIsLibraryHandleHovered(true)}
            onMouseLeave={() => setIsLibraryHandleHovered(false)}
            className="absolute top-0 right-0 h-full w-2 flex items-center justify-center z-30"
            style={{ cursor: 'col-resize' }}
          >
            <div
              className={`h-full w-px transition-colors duration-150 ${
                isLibraryHandleHovered || isLibraryResizing ? 'bg-white' : 'bg-transparent'
              }`}
            />
          </div>
        )}
      </aside>

      {/* Playlist Specific Context Menu */}
      {activePlaylistMenu && (
        <PlaylistActionMenu
          isOpen={Boolean(activePlaylistMenu)}
          onClose={() => setActivePlaylistMenu(null)}
          anchorRect={activePlaylistMenu.rect}
          playlist={activePlaylistMenu.playlist}
        />
      )}

      {/* Library Blank Area Context Menu ("Create a playlist", "Create folder") */}
      {emptyAreaMenu &&
        createPortal(
          <div
            data-empty-menu-portal="true"
            style={{
              top: Math.min(emptyAreaMenu.y, window.innerHeight - 110),
              left: Math.min(emptyAreaMenu.x, window.innerWidth - 220),
              width: 210,
            }}
            className="fixed z-[10000] rounded-2xl bg-[#24242b]/95 backdrop-blur-2xl border border-white/10 shadow-2xl p-1.5 text-white select-none animate-fadeIn flex flex-col gap-0.5"
          >
            <button
              type="button"
              onClick={() => {
                setEmptyAreaMenu(null);
                const creatorName = currentUser?.displayName || currentUser?.username || 'You';
                const newPl = createPlaylist(
                  undefined,
                  undefined,
                  undefined,
                  creatorName,
                  currentUser?.id,
                  false,
                  currentUser?.username,
                  currentUser?.avatar,
                );
                if (isLibraryFullWidth) setLibraryFullWidth(false);
                navigate(`/music/playlist/${newPl.id}`);
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200 group w-full text-left"
            >
              <ListPlus
                size={16}
                className="text-gray-400 group-hover:text-purple-400 shrink-0 transition-colors"
              />
              <span>Create a playlist</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmptyAreaMenu(null);
                createMusicFolder();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200 group w-full text-left"
            >
              <Plus
                size={16}
                className="text-gray-400 group-hover:text-purple-400 shrink-0 transition-colors"
              />
              <span>Create folder</span>
            </button>
          </div>,
          document.body,
        )}

      {/* Liked Songs Context Menu (Strictly ONLY Pin / Unpin playlist) */}
      {likedSongsMenu &&
        createPortal(
          <div
            data-liked-menu-portal="true"
            style={{
              top: Math.min(likedSongsMenu.y, window.innerHeight - 60),
              left: Math.min(likedSongsMenu.x, window.innerWidth - 180),
              width: 160,
            }}
            className="fixed z-[10000] rounded-xl bg-[#282828]/95 backdrop-blur-2xl border border-white/10 shadow-2xl p-1 text-white select-none animate-fadeIn flex flex-col"
          >
            <button
              type="button"
              onClick={() => {
                togglePinItem('liked-songs');
                setLikedSongsMenu(null);
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200 hover:text-white group w-full text-left"
            >
              {isItemPinned('liked-songs') ? (
                <>
                  <PinOff
                    size={15}
                    className="text-gray-400 group-hover:text-purple-400 shrink-0 transition-colors"
                  />
                  <span>Unpin playlist</span>
                </>
              ) : (
                <>
                  <Pin
                    size={15}
                    className="text-gray-400 group-hover:text-purple-400 shrink-0 transition-colors rotate-45"
                  />
                  <span>Pin playlist</span>
                </>
              )}
            </button>
          </div>,
          document.body,
        )}

      {/* Library Item Context Menu (For Folders & Tracks in Library panel) */}
      {libraryItemMenu &&
        createPortal(
          <div
            data-library-item-menu="true"
            style={{
              top: Math.min(libraryItemMenu.y, window.innerHeight - 120),
              left: Math.min(libraryItemMenu.x, window.innerWidth - 180),
              width: 170,
            }}
            className="fixed z-[10000] rounded-xl bg-[#282828]/95 backdrop-blur-2xl border border-white/10 shadow-2xl p-1 text-white select-none animate-fadeIn flex flex-col gap-0.5"
          >
            <button
              type="button"
              onClick={() => {
                togglePinItem(libraryItemMenu.id);
                setLibraryItemMenu(null);
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200 hover:text-white group w-full text-left"
            >
              {isItemPinned(libraryItemMenu.id) ? (
                <>
                  <PinOff
                    size={15}
                    className="text-gray-400 group-hover:text-purple-400 shrink-0 transition-colors"
                  />
                  <span>{libraryItemMenu.type === 'folder' ? 'Unpin folder' : 'Unpin track'}</span>
                </>
              ) : (
                <>
                  <Pin
                    size={15}
                    className="text-gray-400 group-hover:text-purple-400 shrink-0 transition-colors rotate-45"
                  />
                  <span>{libraryItemMenu.type === 'folder' ? 'Pin folder' : 'Pin track'}</span>
                </>
              )}
            </button>

            {libraryItemMenu.type === 'folder' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const fld = musicFolders.find((f) => f.id === libraryItemMenu.id);
                    setLibraryItemMenu(null);
                    if (fld) setRenameModalFolder(fld);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200 hover:text-white group w-full text-left"
                >
                  <FolderEdit
                    size={15}
                    className="text-gray-400 group-hover:text-purple-400 shrink-0 transition-colors"
                  />
                  <span>Rename</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const fld = musicFolders.find((f) => f.id === libraryItemMenu.id);
                    setLibraryItemMenu(null);
                    if (fld) setFolderToDelete(fld);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-500/10 cursor-pointer transition-colors text-xs font-semibold text-red-400 group w-full text-left"
                >
                  <Trash2 size={15} className="text-red-400 shrink-0 transition-colors" />
                  <span>Delete folder</span>
                </button>
              </>
            )}
          </div>,
          document.body,
        )}

      {/* Rename Folder Modal */}
      <FolderRenameModal
        isOpen={Boolean(renameModalFolder)}
        onClose={() => setRenameModalFolder(null)}
        folder={renameModalFolder}
      />

      {/* Delete Folder Modal */}
      <DeleteFolderConfirmModal
        isOpen={Boolean(folderToDelete)}
        onClose={() => setFolderToDelete(null)}
        folder={folderToDelete}
        onDeleted={() => {
          if (activeFolderId === folderToDelete?.id) {
            setActiveFolderId(null);
          }
        }}
      />
    </>
  );
};
