import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMusicHubStore } from '../model/useMusicHubStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import type { MusicPlaylist } from '../model/types';

interface DeletePlaylistConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: MusicPlaylist;
}

export const DeletePlaylistConfirmModal: React.FC<DeletePlaylistConfirmModalProps> = ({
  isOpen,
  onClose,
  playlist,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: currentUser } = useCurrentUser();

  const deletePlaylistPermanently = useMusicHubStore((s) => s.deletePlaylistPermanently);
  const leavePlaylistCollaboration = useMusicHubStore((s) => s.leavePlaylistCollaboration);
  const toggleSavePlaylist = useMusicHubStore((s) => s.toggleSavePlaylist);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentUserId = currentUser?.id;
  const isOwner = Boolean(
    (currentUserId && playlist.creatorId === currentUserId) ||
    playlist.creator === 'You' ||
    (currentUser?.displayName && playlist.creator === currentUser.displayName),
  );
  const isCollaborator = Boolean(
    !isOwner && currentUserId && playlist.collaborators?.some((c) => c.id === currentUserId),
  );

  let titleText = 'Remove from Your Library?';
  let descriptionText = `Playlist "${playlist.title}" will be removed from your library.`;
  let confirmButtonText = 'Delete';

  if (isOwner) {
    titleText = 'Delete playlist permanently?';
    descriptionText = `Playlist "${playlist.title}" will be permanently deleted for all users and collaborators. This action cannot be undone.`;
    confirmButtonText = 'Delete';
  } else if (isCollaborator) {
    titleText = 'Leave collaboration?';
    descriptionText = `You will be removed from collaborators, and "${playlist.title}" will be removed from your library.`;
    confirmButtonText = 'Leave';
  }

  const handleConfirm = () => {
    if (isOwner) {
      deletePlaylistPermanently(playlist.id);
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}`,
        conversationId: '',
        messageId: '',
        title: 'Playlist deleted',
        body: `Playlist "${playlist.title}" was permanently deleted.`,
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    } else if (isCollaborator && currentUserId) {
      leavePlaylistCollaboration(playlist.id, currentUserId);
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}`,
        conversationId: '',
        messageId: '',
        title: 'Collaboration ended',
        body: `You have left the playlist "${playlist.title}".`,
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    } else {
      toggleSavePlaylist(playlist.id);
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}`,
        conversationId: '',
        messageId: '',
        title: 'Removed from library',
        body: `Playlist "${playlist.title}" was removed from your library.`,
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    }

    onClose();

    // Prevent route hanging: if user is currently on this playlist page, navigate back to /music
    const isOnPlaylistPage =
      location.pathname.includes(`/music/playlist/${playlist.id}`) ||
      location.pathname.includes(`/playlist/${playlist.id}`);

    if (isOnPlaylistPage) {
      navigate('/music', { replace: true });
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      {/* Dark backdrop with blur */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-200"
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-[0_24px_50px_rgba(0,0,0,0.85)] flex flex-col select-none animate-scaleUp border border-white/10"
        style={{
          background:
            'linear-gradient(145deg, rgba(26, 27, 36, 0.95) 0%, rgba(14, 15, 22, 0.98) 100%)',
          backdropFilter: 'blur(40px)',
          boxShadow:
            'inset 0 1px 1px 0 rgba(255, 255, 255, 0.2), 0 24px 60px -12px rgba(0, 0, 0, 0.85)',
        }}
      >
        <h2 className="text-xl font-bold tracking-tight text-white mb-3">{titleText}</h2>

        <p className="text-sm text-gray-300 leading-relaxed mb-8">{descriptionText}</p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-900/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
