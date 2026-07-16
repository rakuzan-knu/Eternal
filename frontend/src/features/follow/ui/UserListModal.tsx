import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from '@/shared/ui/Avatar';
import { FollowButton } from './FollowButton';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useRemoveFollowerMutation } from '../model/useRemoveFollowerMutation';
import { useFollowList } from '../model/useFollowList';

interface UserListModalProps {
  userId: string;
  mode: 'followers' | 'following';
  isOwnProfile: boolean;
  onClose: () => void;
}

export function UserListModal({ userId, mode, isOwnProfile, onClose }: UserListModalProps) {
  const [search, setSearch] = useState('');
  const { userId: myUserId } = useAuthStore();
  const removeFollowerMutation = useRemoveFollowerMutation(userId);

  const query = useFollowList(userId, mode);

  const allUsers = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const filteredUsers = search.trim()
    ? allUsers.filter(
        (u) =>
          u.username.toLowerCase().includes(search.toLowerCase()) ||
          (u.displayName ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : allUsers;

  const title = mode === 'followers' ? 'Readers' : 'Tracked';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm max-h-[75vh] flex flex-col bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-[2rem] shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-3">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full bg-white/[0.05] border border-white/[0.06] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          {query.isLoading ? (
            <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Nobody here yet</p>
          ) : (
            filteredUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-2 py-2.5 rounded-2xl hover:bg-white/[0.04] transition-colors"
              >
                <Link to={`/${u.username}`} onClick={onClose}>
                  <Avatar size="md" src={u.avatar} />
                </Link>
                <Link to={`/${u.username}`} onClick={onClose} className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{u.username}</p>
                  <p className="text-xs text-gray-500 truncate">{u.displayName}</p>
                </Link>

                {u.id === myUserId ? null : mode === 'followers' && isOwnProfile ? (
                  <button
                    type="button"
                    disabled={removeFollowerMutation.isPending}
                    onClick={() => removeFollowerMutation.mutate(u.id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full border border-white/[0.08] text-gray-300 hover:bg-white/[0.06] transition-colors disabled:opacity-40 shrink-0"
                  >
                    Remove
                  </button>
                ) : (
                  <FollowButton authorId={u.id} isFollowing={!!u.isFollowing} />
                )}
              </div>
            ))
          )}

          {query.hasNextPage && (
            <button
              type="button"
              onClick={() => query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
              className="w-full text-xs text-gray-500 hover:text-gray-300 py-3 disabled:opacity-40"
            >
              {query.isFetchingNextPage ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
