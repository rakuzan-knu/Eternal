import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Plus,
  ListPlus,
  ListMusic,
  ListMinus,
  Disc,
  Info,
  Share2,
  Copy,
  FolderPlus,
  Folder,
  Search,
  Check,
  MessageCircle,
  ChevronRight,
} from 'lucide-react';
import type { SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';
import type { MusicPlaylist, MusicFolder } from '../model/types';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { useMusicHubStore } from '../model/useMusicHubStore';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { TrackDetailsModal } from './TrackDetailsModal';
import { MusicShareToChatModal } from './MusicShareToChatModal';

interface TrackActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRect: DOMRect | null;
  track: SpotifyTrack;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const TrackActionMenu: React.FC<TrackActionMenuProps> = ({
  isOpen,
  onClose,
  anchorRect,
  track,
  triggerRef,
}) => {
  const navigate = useNavigate();
  const {
    customPlaylists,
    musicFolders,
    addTrackToPlaylist,
    createPlaylist,
    isTrackLiked,
    toggleLikeTrack,
  } = useMusicHubStore();

  const { queue, addToQueue, removeFromQueue } = useSpotifyPlayerStore();

  const [activeSubmenu, setActiveSubmenu] = useState<'playlist' | 'share' | null>(null);
  const [playlistSearch, setPlaylistSearch] = useState('');
  const [playlistSubmenuPos, setPlaylistSubmenuPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [shareSubmenuPos, setShareSubmenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Nested folder hover in playlist submenu
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const [folderSubmenuPos, setFolderSubmenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const folderLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isLiked = isTrackLiked(track.id);
  const isInQueue = queue.some((t) => t.id === track.id);

  const showToast = (title: string, body: string) => {
    useMessageToastStore.getState().addToast({
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conversationId: '',
      messageId: '',
      title,
      body,
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
  };

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (triggerRef?.current && triggerRef.current.contains(target)) {
        return;
      }
      if (
        target &&
        (target.closest('[data-menu-portal]') || target.closest('[data-menu-trigger]'))
      ) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  // Playlists belonging to folders
  const allFolderPlaylistIds = useMemo(() => {
    const ids = new Set<string>();
    musicFolders.forEach((f) => f.playlistIds.forEach((id) => ids.add(id)));
    customPlaylists.forEach((p) => {
      if ((p as any).folderId) ids.add(p.id);
    });
    return ids;
  }, [musicFolders, customPlaylists]);

  // Root playlists (not in any folder)
  const rootPlaylists = useMemo(() => {
    let list = customPlaylists.filter((p) => !allFolderPlaylistIds.has(p.id));
    if (playlistSearch.trim()) {
      const q = playlistSearch.toLowerCase().trim();
      list = list.filter((p) => p.title.toLowerCase().includes(q));
    }
    return list;
  }, [customPlaylists, allFolderPlaylistIds, playlistSearch]);

  // Filtered folders
  const filteredFoldersList = useMemo(() => {
    let list = [...musicFolders];
    if (playlistSearch.trim()) {
      const q = playlistSearch.toLowerCase().trim();
      list = list.filter((f) => {
        if (f.name.toLowerCase().includes(q)) return true;
        const inner = customPlaylists.filter(
          (p) => f.playlistIds.includes(p.id) || (p as any).folderId === f.id,
        );
        return inner.some((p) => p.title.toLowerCase().includes(q));
      });
    }
    return list;
  }, [musicFolders, customPlaylists, playlistSearch]);

  const activeHoveredFolder = useMemo(() => {
    if (!hoveredFolderId) return null;
    return musicFolders.find((f) => f.id === hoveredFolderId) || null;
  }, [musicFolders, hoveredFolderId]);

  const activeHoveredFolderPlaylists = useMemo(() => {
    if (!activeHoveredFolder) return [];
    let list = customPlaylists.filter(
      (p) =>
        activeHoveredFolder.playlistIds.includes(p.id) ||
        (p as any).folderId === activeHoveredFolder.id,
    );
    if (playlistSearch.trim()) {
      const q = playlistSearch.toLowerCase().trim();
      list = list.filter((p) => p.title.toLowerCase().includes(q));
    }
    return list;
  }, [customPlaylists, activeHoveredFolder, playlistSearch]);

  if (!isOpen || !anchorRect) {
    return (
      <>
        {isDetailsModalOpen && (
          <TrackDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={() => setIsDetailsModalOpen(false)}
            track={track}
          />
        )}
        {isShareModalOpen && (
          <MusicShareToChatModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            title={track.title}
            shareUrl={`${window.location.origin}/music/track/${track.id}`}
          />
        )}
      </>
    );
  }

  // Calculate menu position with flip() and shift()
  const menuWidth = 260;
  const menuHeight = 290;

  // Dock clearance: only apply when dock has an active track in the player store
  const isDockActive = Boolean(useSpotifyPlayerStore.getState?.()?.currentTrack);
  const bottomClearance = isDockActive ? 92 : 16;

  const isPointAnchor = !anchorRect.width || anchorRect.width === 0;

  let top: number;
  let left: number;

  if (isPointAnchor) {
    // 1. Right-Click Context Menu (RMB): Anchor is the mouse cursor position
    const fitsBelow = anchorRect.top + menuHeight <= window.innerHeight - bottomClearance;
    if (fitsBelow) {
      top = anchorRect.top + 2;
    } else {
      // Open upwards from mouse cursor (bottom of menu aligns with cursor)
      top = anchorRect.top - menuHeight - 2;
    }
    top = Math.max(8, Math.min(top, window.innerHeight - bottomClearance - menuHeight));

    const fitsRight = anchorRect.left + menuWidth <= window.innerWidth - 12;
    if (fitsRight) {
      left = anchorRect.left + 2;
    } else {
      left = anchorRect.left - menuWidth - 2;
    }
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
  } else {
    // 2. Button Anchor (e.g. 3-dots button): Anchor is an element rect
    const fitsBelow = anchorRect.bottom + menuHeight + 4 <= window.innerHeight - bottomClearance;
    if (fitsBelow) {
      top = anchorRect.bottom + 4;
    } else {
      top = anchorRect.top - menuHeight - 4;
    }
    top = Math.max(8, Math.min(top, window.innerHeight - bottomClearance - menuHeight));

    // Align right edges if on right half of screen, otherwise align left edges
    if (anchorRect.left > window.innerWidth / 2) {
      left = (anchorRect.right || anchorRect.left) - menuWidth;
    } else {
      left = anchorRect.left;
    }
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
  }

  // Submenu positioning with flip() and shift()
  const handleSubmenuEnter = (type: 'playlist' | 'share', e: React.MouseEvent<HTMLDivElement>) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const subWidth = 240;
    const subHeight = type === 'playlist' ? 240 : 120;

    let subLeft = rect.right - 2;
    if (subLeft + subWidth > window.innerWidth - 12) {
      subLeft = rect.left - subWidth + 2;
    }
    subLeft = Math.max(8, Math.min(subLeft, window.innerWidth - subWidth - 8));

    let subTop = rect.top - 4;
    if (subTop + subHeight > window.innerHeight - bottomClearance) {
      subTop = Math.max(8, window.innerHeight - subHeight - bottomClearance);
    }
    subTop = Math.max(8, Math.min(subTop, window.innerHeight - subHeight - 8));

    if (type === 'playlist') {
      setPlaylistSubmenuPos({ top: subTop, left: subLeft });
      setShareSubmenuPos(null);
    } else {
      setShareSubmenuPos({ top: subTop, left: subLeft });
      setPlaylistSubmenuPos(null);
    }
    setActiveSubmenu(type);
  };

  const handleSubmenuLeave = () => {
    leaveTimeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null);
      setPlaylistSubmenuPos(null);
      setShareSubmenuPos(null);
      setHoveredFolderId(null);
      setFolderSubmenuPos(null);
    }, 300);
  };

  const handleSubmenuMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  // 1. Add to Playlist
  const handleAddTrackToCustomPlaylist = (playlistId: string, playlistTitle: string) => {
    addTrackToPlaylist(playlistId, track);
    showToast('Added to Playlist', `Track "${track.title}" added to playlist "${playlistTitle}".`);
    onClose();
  };

  const handleCreateAndAdd = () => {
    const title = `My Playlist #${customPlaylists.length + 1}`;
    const newPl = createPlaylist(title);
    addTrackToPlaylist(newPl.id, track);
    showToast('Playlist Created', `Track "${track.title}" added to "${title}".`);
    onClose();
  };

  const handleCreateAndAddToFolder = (folderId: string, folderName: string) => {
    const title = `My Playlist #${customPlaylists.length + 1}`;
    const newPl = createPlaylist(
      title,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      folderId,
    );
    addTrackToPlaylist(newPl.id, track);
    showToast(
      'Playlist Created',
      `Track "${track.title}" added to "${title}" (folder "${folderName}").`,
    );
    onClose();
  };

  const handleFolderEnter = (folderId: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (folderLeaveTimeoutRef.current) {
      clearTimeout(folderLeaveTimeoutRef.current);
      folderLeaveTimeoutRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const subWidth = 220;
    const subHeight = 180;
    let subLeft = rect.right - 2;
    if (subLeft + subWidth > window.innerWidth - 12) {
      subLeft = rect.left - subWidth + 2;
    }
    subLeft = Math.max(8, Math.min(subLeft, window.innerWidth - subWidth - 8));
    let subTop = rect.top - 4;
    if (subTop + subHeight > window.innerHeight - bottomClearance) {
      subTop = Math.max(8, window.innerHeight - subHeight - bottomClearance);
    }
    setFolderSubmenuPos({ top: subTop, left: subLeft });
    setHoveredFolderId(folderId);
  };

  const handleFolderLeave = () => {
    folderLeaveTimeoutRef.current = setTimeout(() => {
      setHoveredFolderId(null);
      setFolderSubmenuPos(null);
    }, 300);
  };

  // 2. Toggle Like
  const handleToggleLike = () => {
    toggleLikeTrack(track);
    showToast(
      isLiked ? 'Removed from Liked' : 'Saved to Liked',
      `Track "${track.title}" ${isLiked ? 'removed from liked tracks' : 'saved to liked tracks'}.`,
    );
    onClose();
  };

  // 3. Toggle Queue
  const handleToggleQueue = () => {
    if (isInQueue) {
      const idx = queue.findIndex((t) => t.id === track.id);
      if (idx !== -1) {
        removeFromQueue(idx);
        showToast('Queue', `Track "${track.title}" removed from queue.`);
      }
    } else {
      addToQueue(track);
      showToast('Queue', `Track "${track.title}" added to playback queue.`);
    }
    onClose();
  };

  // 4. View Track Page
  const handleViewTrackPage = () => {
    onClose();
    navigate(`/music/track/${track.id}`);
  };

  // 5. View Details
  const handleOpenDetails = () => {
    onClose();
    setIsDetailsModalOpen(true);
  };

  // 6. Share
  const trackUrl = `${window.location.origin}/music/track/${track.id}`;
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(trackUrl);
      showToast('Link Copied', 'Direct link to song copied to clipboard!');
    } catch {
      showToast('Link', trackUrl);
    }
    onClose();
  };

  const filteredPlaylists = customPlaylists.filter((p) =>
    p.title.toLowerCase().includes(playlistSearch.toLowerCase().trim()),
  );

  return (
    <>
      {createPortal(
        <div
          ref={menuRef}
          data-menu-portal="true"
          style={{ top, left, width: menuWidth }}
          className="fixed z-[9999] rounded-2xl bg-[#202025]/95 backdrop-blur-2xl border border-white/10 shadow-2xl p-1.5 text-white select-none animate-fadeIn flex flex-col gap-0.5"
        >
          {/* 1. Add to playlist */}
          <div
            onMouseEnter={(e) => handleSubmenuEnter('playlist', e)}
            onMouseLeave={handleSubmenuLeave}
            className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors text-xs font-semibold ${
              activeSubmenu === 'playlist'
                ? 'bg-white/15 text-white'
                : 'hover:bg-white/10 text-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Plus size={16} className="text-gray-400" />
              <span>Add to Playlist</span>
            </div>
            <ChevronRight
              size={14}
              className="text-gray-500 group-hover:text-white transition-colors"
            />
          </div>

          {/* 2. Like / Unlike */}
          <div
            onClick={handleToggleLike}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200"
          >
            <Heart
              size={16}
              className={isLiked ? 'text-purple-400 fill-purple-400' : 'text-gray-400'}
            />
            <span>{isLiked ? 'Remove from Liked Songs' : 'Save to your Liked Songs'}</span>
          </div>

          {/* 3. Queue */}
          <div
            onClick={handleToggleQueue}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200"
          >
            {isInQueue ? (
              <>
                <ListMinus size={16} className="text-purple-400" />
                <span>Remove from Queue</span>
              </>
            ) : (
              <>
                <ListMusic size={16} className="text-gray-400" />
                <span>Add to Queue</span>
              </>
            )}
          </div>

          <div className="h-px bg-white/10 my-0.5 mx-2" />

          {/* 4. View track page */}
          <div
            onClick={handleViewTrackPage}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200"
          >
            <Disc size={16} className="text-purple-400" />
            <span>Go to Song</span>
          </div>

          {/* 5. Credits */}
          <div
            onClick={handleOpenDetails}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200"
          >
            <Info size={16} className="text-gray-400" />
            <span>View Credits</span>
          </div>

          {/* 6. Share */}
          <div
            onMouseEnter={(e) => handleSubmenuEnter('share', e)}
            onMouseLeave={handleSubmenuLeave}
            className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors text-xs font-semibold ${
              activeSubmenu === 'share'
                ? 'bg-white/15 text-white'
                : 'hover:bg-white/10 text-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Share2 size={16} className="text-gray-400" />
              <span>Share</span>
            </div>
            <ChevronRight
              size={14}
              className="text-gray-500 group-hover:text-white transition-colors"
            />
          </div>
        </div>,
        document.body,
      )}

      {/* Playlist Submenu Portal */}
      {activeSubmenu === 'playlist' &&
        playlistSubmenuPos &&
        createPortal(
          <div
            data-menu-portal="true"
            onMouseEnter={handleSubmenuMouseEnter}
            onMouseLeave={handleSubmenuLeave}
            style={{
              top: playlistSubmenuPos.top,
              left: playlistSubmenuPos.left,
              width: 240,
            }}
            className="fixed z-[10000] rounded-2xl bg-[#25252c]/98 backdrop-blur-2xl border border-white/10 shadow-2xl p-2 text-white select-none animate-fadeIn flex flex-col gap-1"
          >
            {/* Search Input */}
            <div className="relative mb-1">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={playlistSearch}
                onChange={(e) => setPlaylistSearch(e.target.value)}
                placeholder="Search playlist"
                className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
              />
            </div>

            {/* Create new playlist button */}
            <div
              onClick={handleCreateAndAdd}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors text-xs font-medium text-purple-400"
            >
              <FolderPlus size={14} />
              <span>+ New Playlist</span>
            </div>

            <div className="h-px bg-white/10 my-0.5" />

            {/* Existing playlists and folders list */}
            <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
              {rootPlaylists.length === 0 && filteredFoldersList.length === 0 ? (
                <div className="text-[11px] text-gray-500 text-center py-2">No playlists found</div>
              ) : (
                <>
                  {/* Root Playlists */}
                  {rootPlaylists.map((pl: MusicPlaylist, idx: number) => (
                    <div
                      key={`root-pl-${pl.id}-${idx}`}
                      onClick={() => handleAddTrackToCustomPlaylist(pl.id, pl.title)}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors text-xs font-medium text-gray-200 hover:text-white"
                    >
                      <span className="truncate">{pl.title}</span>
                      {pl.tracks.some((t: SpotifyTrack) => t.id === track.id) && (
                        <Check size={12} className="text-purple-400 shrink-0" />
                      )}
                    </div>
                  ))}

                  {/* Folders with Nested Flyout */}
                  {filteredFoldersList.map((fld: MusicFolder, idx: number) => (
                    <div
                      key={`fld-${fld.id}-${idx}`}
                      onMouseEnter={(e) => handleFolderEnter(fld.id, e)}
                      onMouseLeave={handleFolderLeave}
                      className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors text-xs font-medium text-gray-200 hover:text-white"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Folder
                          size={13}
                          className="text-gray-400 group-hover:text-purple-400 shrink-0"
                        />
                        <span className="truncate">{fld.name}</span>
                      </div>
                      <ChevronRight
                        size={12}
                        className="text-gray-500 group-hover:text-white shrink-0"
                      />
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>,
          document.body,
        )}

      {/* Nested Folder Submenu Portal */}
      {activeSubmenu === 'playlist' &&
        activeHoveredFolder &&
        folderSubmenuPos &&
        createPortal(
          <div
            data-menu-portal="true"
            onMouseEnter={() => {
              if (leaveTimeoutRef.current) {
                clearTimeout(leaveTimeoutRef.current);
                leaveTimeoutRef.current = null;
              }
              if (folderLeaveTimeoutRef.current) {
                clearTimeout(folderLeaveTimeoutRef.current);
                folderLeaveTimeoutRef.current = null;
              }
            }}
            onMouseLeave={() => {
              handleFolderLeave();
              handleSubmenuLeave();
            }}
            style={{
              top: folderSubmenuPos.top,
              left: folderSubmenuPos.left,
              width: 220,
            }}
            className="fixed z-[10001] rounded-2xl bg-[#25252c]/98 backdrop-blur-2xl border border-white/10 shadow-2xl p-2 text-white select-none animate-fadeIn flex flex-col gap-1"
          >
            {/* Folder Name Badge */}
            <div className="px-2 py-1 text-[11px] font-bold text-gray-400 border-b border-white/5 truncate flex items-center gap-1.5">
              <Folder size={12} className="text-purple-400 shrink-0" />
              <span className="truncate">{activeHoveredFolder.name}</span>
            </div>

            {/* Create new playlist inside this folder */}
            <div
              onClick={() =>
                handleCreateAndAddToFolder(activeHoveredFolder.id, activeHoveredFolder.name)
              }
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors text-xs font-medium text-purple-400"
            >
              <FolderPlus size={13} />
              <span>+ New Playlist</span>
            </div>

            <div className="h-px bg-white/10 my-0.5" />

            {/* Playlists inside this folder */}
            <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
              {activeHoveredFolderPlaylists.length === 0 ? (
                <div className="text-[11px] text-gray-500 text-center py-2">
                  No playlists in folder
                </div>
              ) : (
                activeHoveredFolderPlaylists.map((pl: MusicPlaylist, idx: number) => (
                  <div
                    key={`hfld-pl-${pl.id}-${idx}`}
                    onClick={() => handleAddTrackToCustomPlaylist(pl.id, pl.title)}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors text-xs font-medium text-gray-200 hover:text-white"
                  >
                    <span className="truncate">{pl.title}</span>
                    {pl.tracks.some((t: SpotifyTrack) => t.id === track.id) && (
                      <Check size={12} className="text-purple-400 shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}

      {/* Share Submenu Portal */}
      {activeSubmenu === 'share' &&
        shareSubmenuPos &&
        createPortal(
          <div
            data-menu-portal="true"
            onMouseEnter={handleSubmenuMouseEnter}
            onMouseLeave={handleSubmenuLeave}
            style={{
              top: shareSubmenuPos.top,
              left: shareSubmenuPos.left,
              width: 220,
            }}
            className="fixed z-[10000] rounded-2xl bg-[#25252c]/98 backdrop-blur-2xl border border-white/10 shadow-2xl p-1.5 text-white select-none animate-fadeIn flex flex-col gap-0.5"
          >
            <div
              onClick={handleCopyLink}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-medium text-gray-200"
            >
              <Copy size={14} className="text-gray-400" />
              <span>Copy Link</span>
            </div>

            <div
              onClick={() => {
                onClose();
                setIsShareModalOpen(true);
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-medium text-gray-200"
            >
              <MessageCircle size={14} className="text-purple-400" />
              <span>Send in Chat</span>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal Dialogs */}
      {isDetailsModalOpen && (
        <TrackDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          track={track}
        />
      )}

      {isShareModalOpen && (
        <MusicShareToChatModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          title={track.title}
          shareUrl={trackUrl}
        />
      )}
    </>
  );
};
