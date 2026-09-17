import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  ListPlus,
  User,
  AlertOctagon,
  Folder,
  ChevronRight,
  Share2,
  Copy,
  MessageCircle,
  ExternalLink,
  FolderPlus,
  Edit3,
  Trash2,
  Lock,
  Globe,
  UserPlus,
  Pin,
  PinOff,
} from 'lucide-react';
import type { MusicPlaylist } from '../model/types';
import { useMusicHubStore, CATALOG_PLAYLISTS } from '../model/useMusicHubStore';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { isSoundCloudUrl } from '@/shared/lib/urlSecurity';
import { useUpdateShowcase } from '@/entities/showcase/model/useShowcase';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { MusicShareToChatModal } from './MusicShareToChatModal';
import { EditPlaylistDetailsModal } from './EditPlaylistDetailsModal';
import { DeletePlaylistConfirmModal } from './DeletePlaylistConfirmModal';
import { PlaylistCollaboratorsModal } from './PlaylistCollaboratorsModal';

interface PlaylistActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRect: DOMRect | null;
  playlist: MusicPlaylist;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const PlaylistActionMenu: React.FC<PlaylistActionMenuProps> = ({
  isOpen,
  onClose,
  anchorRect,
  playlist,
  triggerRef,
}) => {
  const {
    isPlaylistSaved,
    toggleSavePlaylist,
    togglePlaylistPrivacy,
    musicFolders,
    createMusicFolder,
    movePlaylistToFolder,
    isItemPinned,
    togglePinItem,
    customPlaylists,
  } = useMusicHubStore();

  const { data: currentUser } = useCurrentUser();
  const updateShowcaseMutation = useUpdateShowcase();
  const hasCurrentTrack = useSpotifyPlayerStore((s) => Boolean(s.currentTrack));

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

  const [activeSubmenu, setActiveSubmenu] = useState<'folder' | 'share' | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);

  const [folderSubmenuPos, setFolderSubmenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [shareSubmenuPos, setShareSubmenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );

  const menuRef = useRef<HTMLDivElement>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isSaved = isPlaylistSaved(playlist.id);

  // Role detection
  const currentUserId = currentUser?.id;
  const isExternalPlatform = Boolean(
    playlist.id === 'liked-songs' ||
    playlist.id.startsWith('sc-pl-') ||
    playlist.id.startsWith('sp-pl-') ||
    playlist.id.startsWith('playlist-') ||
    playlist.id.startsWith('pl-') ||
    CATALOG_PLAYLISTS.some((cp) => cp.id === playlist.id),
  );

  const isSelfCreatedPlaylist = Boolean(
    !isExternalPlatform &&
    (customPlaylists.some(
      (p) =>
        p.id === playlist.id &&
        (p.creatorId === currentUserId ||
          p.creator === 'You' ||
          (currentUser?.displayName && p.creator === currentUser.displayName) ||
          (!currentUserId && !p.creatorId)),
    ) ||
      (currentUserId && playlist.creatorId === currentUserId) ||
      playlist.creator === 'You') &&
    !(currentUserId && playlist.creatorId && playlist.creatorId !== currentUserId),
  );

  const isOwner = Boolean(
    !isExternalPlatform &&
    ((currentUserId && playlist.creatorId === currentUserId) ||
      playlist.creator === 'You' ||
      (currentUser?.displayName && playlist.creator === currentUser.displayName)),
  );
  const isCollaborator = Boolean(
    !isExternalPlatform &&
    !isOwner &&
    currentUserId &&
    playlist.collaborators?.some((c) => c.id === currentUserId),
  );

  // Close on Escape or outside click (only when no child modal is open)
  const isAnyModalOpen =
    isDeleteModalOpen || isEditModalOpen || isCollabModalOpen || isShareModalOpen;

  useEffect(() => {
    if (!isOpen || isAnyModalOpen) return;

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
  }, [isOpen, onClose, triggerRef, isAnyModalOpen]);

  if (!isOpen || !anchorRect) return null;

  // Calculate menu position cleanly anchored next to the button or mouse coordinates
  const menuWidth = 260;
  const menuHeight = isOwner || isCollaborator ? 360 : 300;

  const isDockActive = hasCurrentTrack;
  const bottomClearance = isDockActive ? 92 : 16;

  const isPointAnchor = !anchorRect.width || anchorRect.width === 0;

  let top: number;
  let left: number;

  if (isPointAnchor) {
    // Right-Click Context Menu (RMB): Anchor is mouse coordinates
    const fitsBelow = anchorRect.top + menuHeight <= window.innerHeight - bottomClearance;
    if (fitsBelow) {
      top = anchorRect.top + 2;
    } else {
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
    // Button Anchor: Anchor is a button element
    const fitsBelow = anchorRect.bottom + menuHeight + 4 <= window.innerHeight - bottomClearance;
    if (fitsBelow) {
      top = anchorRect.bottom + 4;
    } else {
      top = anchorRect.top - menuHeight - 4;
    }
    top = Math.max(8, Math.min(top, window.innerHeight - bottomClearance - menuHeight));

    if (anchorRect.left > window.innerWidth / 2) {
      left = (anchorRect.right || anchorRect.left) - menuWidth;
    } else {
      left = anchorRect.left;
    }
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
  }

  const handleSubmenuEnter = (type: 'folder' | 'share', e: React.MouseEvent<HTMLDivElement>) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const subWidth = 230;
    const subHeight = type === 'folder' ? 220 : 120;

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

    if (type === 'folder') {
      setFolderSubmenuPos({ top: subTop, left: subLeft });
      setShareSubmenuPos(null);
    } else {
      setShareSubmenuPos({ top: subTop, left: subLeft });
      setFolderSubmenuPos(null);
    }
    setActiveSubmenu(type);
  };

  const handleSubmenuLeave = () => {
    leaveTimeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null);
      setFolderSubmenuPos(null);
      setShareSubmenuPos(null);
    }, 300);
  };

  const handleSubmenuMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  // Add to Queue
  const handleAddToQueue = () => {
    if (playlist.tracks.length === 0) {
      showToast('Queue', 'There are no tracks in this playlist to queue.');
      onClose();
      return;
    }

    const playerStore = useSpotifyPlayerStore.getState();
    const currentQueue = playerStore.queue;
    const curId = playerStore.currentTrack?.id;
    const newTracks = playlist.tracks.filter(
      (t) => !currentQueue.some((q) => q.id === t.id) && t.id !== curId,
    );

    useSpotifyPlayerStore.setState({
      queue: [...currentQueue, ...newTracks],
      unshuffledQueue: [...(playerStore.unshuffledQueue || currentQueue), ...newTracks],
    });

    showToast(
      'Playback Queue',
      `Added ${newTracks.length} tracks from "${playlist.title}" to queue.`,
    );
    onClose();
  };

  // Add to Profile Anthem
  const handleAddToProfileAnthem = () => {
    if (playlist.tracks.length === 0) {
      showToast('Profile Anthem', 'No tracks in playlist to set as Profile Anthem.');
      onClose();
      return;
    }

    const track = playlist.tracks[0];
    const isSoundCloud =
      track.source === 'soundcloud' ||
      track.id.startsWith('sc-') ||
      isSoundCloudUrl(track.spotifyUrl);

    updateShowcaseMutation.mutate(
      {
        anthemTrack: {
          trackId: track.id,
          title: track.title,
          artist: track.artist,
          albumArt: track.albumArt,
          previewUrl: track.previewUrl || undefined,
          spotifyUrl: track.spotifyUrl || (isSoundCloud ? 'https://soundcloud.com' : undefined),
        },
      },
      {
        onSuccess: () => {
          showToast('Profile Anthem Updated', `Track "${track.title}" set as your Profile Anthem!`);
        },
        onError: () => {
          showToast('Error', 'Failed to update Profile Anthem.');
        },
      },
    );
    onClose();
  };

  // Report
  const handleReport = () => {
    showToast(
      'Report Submitted',
      'Thank you for your feedback. We will review this playlist for community guidelines compliance.',
    );
    onClose();
  };

  // Create folder
  const handleCreateFolder = () => {
    const name = window.prompt('Enter name for the new music folder:');
    if (name && name.trim()) {
      const folder = createMusicFolder(name.trim());
      movePlaylistToFolder(folder.id, playlist.id);
      showToast('Folder Created', `Playlist added to folder "${folder.name}".`);
      onClose();
    }
  };

  // Copy link
  const playlistUrl = `${window.location.origin}/music/playlist/${playlist.id}`;
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(playlistUrl);
      showToast('Link Copied', 'Playlist link copied to clipboard!');
    } catch {
      showToast('Link', playlistUrl);
    }
    onClose();
  };

  // Toggle Privacy
  const handleTogglePrivacy = () => {
    togglePlaylistPrivacy(playlist.id);
    const nextState = !playlist.isPrivate;
    showToast(
      nextState ? 'Private Playlist' : 'Public Playlist',
      nextState
        ? `Playlist "${playlist.title}" is now private to you and collaborators.`
        : `Playlist "${playlist.title}" is now public to everyone.`,
    );
    onClose();
  };

  return (
    <>
      {!isAnyModalOpen &&
        createPortal(
          <div
            ref={menuRef}
            data-menu-portal="true"
            style={{ top, left, width: menuWidth }}
            className="fixed z-[9999] rounded-2xl bg-[#202025]/95 backdrop-blur-2xl border border-white/10 shadow-2xl p-1.5 text-white select-none animate-fadeIn flex flex-col gap-0.5"
          >
            {/* Pin / Unpin playlist */}
            <div
              onClick={() => {
                togglePinItem(playlist.id);
                onClose();
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200 group"
            >
              {isItemPinned(playlist.id) ? (
                <>
                  <PinOff size={16} className="text-gray-400 group-hover:text-white shrink-0" />
                  <span>Unpin playlist</span>
                </>
              ) : (
                <>
                  <Pin
                    size={16}
                    className="text-gray-400 group-hover:text-white shrink-0 rotate-45"
                  />
                  <span>Pin playlist</span>
                </>
              )}
            </div>

            <div className="my-1 border-t border-white/5" />

            {/* 1. Add to queue */}
            <div
              onClick={handleAddToQueue}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200"
            >
              <ListPlus size={16} className="text-gray-400 shrink-0" />
              <span>Add to Queue</span>
            </div>

            {/* 2. Set as Profile Anthem */}
            <div
              onClick={handleAddToProfileAnthem}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200"
            >
              <User size={16} className="text-gray-400 shrink-0" />
              <span>Set as Profile Anthem</span>
            </div>

            <div className="my-1 border-t border-white/5" />

            {/* Owner & Collaborator Controls (Spotify screenshot 2) */}
            {isOwner || isCollaborator ? (
              <>
                {/* Edit details */}
                <div
                  onClick={() => {
                    setIsEditModalOpen(true);
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200"
                >
                  <Edit3 size={16} className="text-gray-400 shrink-0" />
                  <span>Edit Details</span>
                </div>

                {/* Delete */}
                <div
                  onClick={() => {
                    setIsDeleteModalOpen(true);
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200"
                >
                  <Trash2 size={16} className="text-gray-400 shrink-0" />
                  <span>{isCollaborator ? 'Leave Playlist' : 'Delete'}</span>
                </div>

                {/* Make private / public */}
                <div
                  onClick={handleTogglePrivacy}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200"
                >
                  {playlist.isPrivate ? (
                    <>
                      <Globe size={16} className="text-gray-400 shrink-0" />
                      <span>Make Public</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} className="text-gray-400 shrink-0" />
                      <span>Make Private</span>
                    </>
                  )}
                </div>

                {/* Invite collaborators */}
                {isSelfCreatedPlaylist && (
                  <div
                    onClick={() => {
                      setIsCollabModalOpen(true);
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200"
                  >
                    <UserPlus size={16} className="text-gray-400 shrink-0" />
                    <span>Invite Collaborators</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Non-owner: Add / remove library */}
                {isSaved ? (
                  <div
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200"
                  >
                    <Trash2 size={16} className="text-gray-400 shrink-0" />
                    <span>Remove from Library</span>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      toggleSavePlaylist(playlist.id);
                      showToast(
                        'Saved to Library',
                        `Playlist "${playlist.title}" saved to your library.`,
                      );
                      onClose();
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200"
                  >
                    <Plus size={16} className="text-gray-400 shrink-0" />
                    <span>Add to Library</span>
                  </div>
                )}

                {/* Report */}
                <div
                  onClick={handleReport}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200"
                >
                  <AlertOctagon size={16} className="text-gray-400 shrink-0" />
                  <span className="flex-1">Report</span>
                  <ExternalLink size={12} className="text-gray-500" />
                </div>
              </>
            )}

            <div className="my-1 border-t border-white/5" />

            {/* Move to folder */}
            <div
              onMouseEnter={(e) => handleSubmenuEnter('folder', e)}
              onMouseLeave={handleSubmenuLeave}
              className="relative flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200 group"
            >
              <div className="flex items-center gap-3">
                <Folder size={16} className="text-gray-400 shrink-0" />
                <span>Move to Folder</span>
              </div>
              <ChevronRight size={14} className="text-gray-500 group-hover:text-white" />
            </div>

            {/* Share */}
            <div
              onMouseEnter={(e) => handleSubmenuEnter('share', e)}
              onMouseLeave={handleSubmenuLeave}
              className="relative flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold text-gray-200 group"
            >
              <div className="flex items-center gap-3">
                <Share2 size={16} className="text-gray-400 shrink-0" />
                <span>Share</span>
              </div>
              <ChevronRight size={14} className="text-gray-500 group-hover:text-white" />
            </div>
          </div>,
          document.body,
        )}

      {/* Submenu: Move to folder */}
      {activeSubmenu === 'folder' &&
        folderSubmenuPos &&
        createPortal(
          <div
            data-menu-portal="true"
            onMouseEnter={handleSubmenuMouseEnter}
            onMouseLeave={handleSubmenuLeave}
            style={{
              top: folderSubmenuPos.top,
              left: folderSubmenuPos.left,
              width: 230,
            }}
            className="fixed z-[10000] rounded-2xl bg-[#24242b]/95 backdrop-blur-2xl border border-white/10 shadow-2xl p-1.5 text-white select-none animate-fadeIn flex flex-col gap-0.5"
          >
            <div
              onClick={handleCreateFolder}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer text-xs font-semibold text-purple-400"
            >
              <FolderPlus size={15} />
              <span>+ Create New Folder</span>
            </div>

            {musicFolders.length > 0 && <div className="my-1 border-t border-white/5" />}

            {musicFolders.map((folder) => {
              const isInFolder = folder.playlistIds.includes(playlist.id);
              return (
                <div
                  key={folder.id}
                  onClick={() => {
                    movePlaylistToFolder(folder.id, playlist.id);
                    showToast('Folders', `Playlist added to "${folder.name}".`);
                    onClose();
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer text-xs font-medium text-gray-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </div>
                  {isInFolder && <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />}
                </div>
              );
            })}
          </div>,
          document.body,
        )}

      {/* Submenu: Share */}
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
              width: 230,
            }}
            className="fixed z-[10000] rounded-2xl bg-[#24242b]/95 backdrop-blur-2xl border border-white/10 shadow-2xl p-1.5 text-white select-none animate-fadeIn flex flex-col gap-0.5"
          >
            {/* Copy link */}
            <div
              onClick={handleCopyLink}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer text-xs font-semibold text-gray-200"
            >
              <Copy size={15} className="text-gray-400 shrink-0" />
              <span>Copy Link</span>
            </div>

            {/* Share to chat */}
            <div
              onClick={() => {
                setActiveSubmenu(null);
                setIsShareModalOpen(true);
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer text-xs font-semibold text-purple-400"
            >
              <MessageCircle size={15} className="shrink-0" />
              <span>Share to Chat</span>
            </div>
          </div>,
          document.body,
        )}

      {/* Share to Chat Messenger Modal */}
      <MusicShareToChatModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          onClose();
        }}
        title={`Playlist "${playlist.title}"`}
        shareUrl={playlistUrl}
      />

      {/* Edit Details Modal */}
      <EditPlaylistDetailsModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          onClose();
        }}
        playlist={playlist}
      />

      {/* Delete Confirmation Modal */}
      <DeletePlaylistConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          onClose();
        }}
        playlist={playlist}
      />

      {/* Collaborators Modal */}
      <PlaylistCollaboratorsModal
        isOpen={isCollabModalOpen}
        onClose={() => {
          setIsCollabModalOpen(false);
          onClose();
        }}
        playlist={playlist}
      />
    </>
  );
};
