import React, { useMemo, useState } from 'react';
import { X, Search, Ban, Loader2 } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import Modal from '../../../shared/ui/Modal';
import { useUserSearch } from '../model/useUserSearch';
import { useConversations } from '../model/useConversations';
import { useBlockedUsers } from '../model/useBlockedUsers';
import { useBlockUser } from '../model/useConversationMutations';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { BlockCandidate } from '../model/chatUiTypes';
import type { UserSearchResult } from '../api/userSearchApi';

import { UserSnapshot } from '../../../entities/chat/model/types';

interface BlockUserModalProps {
  onClose: () => void;
}

export default function BlockUserModal({ onClose }: BlockUserModalProps) {
  const [query, setQuery] = useState('');
  const { userId } = useAuthStore();
  const { results, isSearching } = useUserSearch(query);
  const { data: conversations } = useConversations();
  const { data: blockedUsers } = useBlockedUsers();
  const blockUser = useBlockUser();

  const blockedIds = useMemo(
    () => new Set((blockedUsers ?? []).map((u: UserSnapshot) => u.id)),
    [blockedUsers],
  );

  const chattedWith = useMemo<BlockCandidate[]>(() => {
    const map = new Map<string, BlockCandidate>();
    for (const conv of conversations ?? []) {
      for (const p of conv.participants) {
        if (p.userId === userId) continue;
        if (!map.has(p.userId)) {
          map.set(p.userId, {
            id: p.userId,
            username: p.user.username,
            displayName: p.user.displayName,
            avatar: p.user.avatar,
          });
        }
      }
    }
    return [...map.values()].sort((a, b) =>
      (a.displayName ?? a.username).localeCompare(b.displayName ?? b.username),
    );
  }, [conversations, userId]);

  const trimmed = query.trim();

  const candidates = useMemo<BlockCandidate[]>(() => {
    const source: BlockCandidate[] = trimmed
      ? results.map((u: UserSearchResult) => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatar: u.avatar,
        }))
      : chattedWith;
    return source.filter((u: BlockCandidate) => u.id !== userId && !blockedIds.has(u.id));
  }, [trimmed, results, chattedWith, userId, blockedIds]);

  return (
    <Modal onClose={onClose} className="w-full max-w-md max-h-[75vh] flex flex-col">
      {(close) => {
        const handleBlock = (id: string) => {
          if (blockUser.isPending) return;
          blockUser.mutate(id, { onSuccess: close });
        };

        return (
          <div className="bg-[#1c1c20] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[75vh]">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
              <h2 className="text-lg font-bold text-white">Block someone</h2>
              <button
                onClick={close}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 pb-3 flex-shrink-0">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by username"
                  className="w-full h-10 pl-10 pr-4 rounded-full bg-white/5 border border-white/5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>
            </div>

            {!trimmed && (
              <div className="px-6 pb-1 flex-shrink-0 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                People you&apos;ve chatted with
              </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
              {isSearching && (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              )}

              {!isSearching && candidates.length === 0 && (
                <p className="text-center text-sm text-gray-500 mt-8 px-6">
                  {trimmed ? 'No users found' : 'No one to block yet'}
                </p>
              )}

              {candidates.map((user) => (
                <div
                  key={user.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <Avatar size="sm" src={user.avatar} alt={user.displayName ?? user.username} />
                  <span className="flex-1 text-left min-w-0">
                    <span className="block text-sm font-semibold text-white truncate">
                      {user.displayName ?? user.username}
                    </span>
                    <span className="block text-xs text-gray-500 truncate">@{user.username}</span>
                  </span>
                  <button
                    onClick={() => handleBlock(user.id)}
                    disabled={blockUser.isPending}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-300 bg-red-500/10 hover:bg-red-500/20 transition-colors active:scale-95 disabled:opacity-50"
                  >
                    {blockUser.isPending && blockUser.variables === user.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Ban size={13} />
                    )}
                    Block
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      }}
    </Modal>
  );
}
