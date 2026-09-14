import React, { useState } from 'react';
import { X, Search, UserPlus, Check, Loader2 } from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import Modal from '@/shared/ui/Modal';
import { useUserSearch } from '@/features/chat/model/useUserSearch';
import type { UserSearchResult } from '@/features/chat/api/userSearchApi';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useMusicHubStore, CATALOG_PLAYLISTS } from '../model/useMusicHubStore';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import type { MusicPlaylist } from '../model/types';

interface PlaylistCollaboratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: MusicPlaylist;
}

export const PlaylistCollaboratorsModal: React.FC<PlaylistCollaboratorsModalProps> = ({
  isOpen,
  onClose,
  playlist,
}) => {
  const [query, setQuery] = useState('');
  const { results, isSearching } = useUserSearch(query);
  const { data: currentUser } = useCurrentUser();
  const sendPlaylistInvite = useMusicHubStore((s) => s.sendPlaylistInvite);
  const playlistInvites = useMusicHubStore((s) => s.playlistInvites || []);
  const customPlaylists = useMusicHubStore((s) => s.customPlaylists || []);

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
        (p.creatorId === currentUser?.id ||
          p.creator === 'You' ||
          (currentUser?.displayName && p.creator === currentUser.displayName) ||
          (!currentUser?.id && !p.creatorId)),
    ) ||
      (currentUser?.id && playlist.creatorId === currentUser.id) ||
      playlist.creator === 'You') &&
    !(currentUser?.id && playlist.creatorId && playlist.creatorId !== currentUser.id),
  );

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

  if (!isOpen || !isSelfCreatedPlaylist) return null;

  // Filter out current user
  const filteredUsers = results.filter((u: UserSearchResult) => u.id !== currentUser?.id);

  // Check if a user is already a collaborator
  const isAlreadyCollaborator = (userId: string, username: string) => {
    return (
      playlist.creator === username ||
      playlist.creatorId === userId ||
      playlist.collaborators?.some((c) => c.id === userId || c.username === username)
    );
  };

  // Check if an invite is already pending for this user
  const isInvitePending = (userId: string, username: string) => {
    return playlistInvites.some(
      (inv) =>
        inv.playlistId === playlist.id &&
        inv.status === 'pending' &&
        (inv.inviteeId === userId || inv.inviteeUsername === username),
    );
  };

  const handleSendInvite = (user: UserSearchResult) => {
    if (!currentUser) return;

    sendPlaylistInvite(
      playlist.id,
      {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
      },
      {
        id: currentUser.id,
        username: currentUser.username,
        displayName: currentUser.displayName,
        avatar: currentUser.avatar,
      },
    );

    showToast(
      'Invite sent',
      `Invitation to collaborate on playlist «${playlist.title}» sent to @${user.username}`,
    );
  };

  return (
    <Modal onClose={onClose} className="w-full max-w-md max-h-[80vh] flex flex-col">
      {(close) => (
        <div className="bg-[#1c1c22]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden text-white select-none">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5 shrink-0">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus size={20} className="text-purple-400" />
                <span>Add collaborator</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Playlist "{playlist.title}»</p>
            </div>
            <button
              onClick={close}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-6 pt-4 pb-2 shrink-0">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users by name or username..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                autoFocus
              />
              {isSearching && (
                <Loader2
                  size={16}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-purple-400"
                />
              )}
            </div>
          </div>

          {/* Users List */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                {query.trim() ? (
                  <>
                    <p className="text-sm font-semibold text-gray-400">No users found</p>
                    <p className="text-xs mt-1">Try searching for a different username or name</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-400">Start searching</p>
                    <p className="text-xs mt-1">
                      Enter a username or display name to send an invite
                    </p>
                  </>
                )}
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isCollaborator = isAlreadyCollaborator(user.id, user.username);
                const hasPending = isInvitePending(user.id, user.username);

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar
                        size="md"
                        src={user.avatar}
                        name={user.displayName || user.username}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white truncate">
                          {user.displayName || user.username}
                        </div>
                        <div className="text-xs text-gray-400 truncate">@{user.username}</div>
                      </div>
                    </div>

                    <div className="shrink-0 pl-2">
                      {isCollaborator ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-purple-400 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                          <Check size={13} />
                          <span>Collaborator</span>
                        </span>
                      ) : hasPending ? (
                        <span className="text-xs font-semibold text-gray-400 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                          Invite sent
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendInvite(user)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-md shadow-purple-600/30"
                        >
                          <UserPlus size={14} />
                          <span>Invite</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
