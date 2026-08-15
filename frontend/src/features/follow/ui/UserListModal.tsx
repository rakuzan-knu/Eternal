import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Users, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from '@/shared/ui/Avatar';
import { FollowButton } from './FollowButton';
import { UserNameWithBadges } from '@/entities/profile/ui/UserNameWithBadges';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useRemoveFollowerMutation } from '../model/useRemoveFollowerMutation';
import { useFollowList } from '../model/useFollowList';

interface UserListModalProps {
  userId: string;
  mode: 'followers' | 'following';
  isOwnProfile: boolean;
  onClose: () => void;
}

function UserListSkeleton() {
  return (
    <div className="space-y-2 py-1 px-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl">
          <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div
              className="h-3.5 bg-white/10 rounded-md animate-pulse"
              style={{ width: `${55 + (i % 3) * 15}%` }}
            />
            <div className="h-2.5 w-20 bg-white/5 rounded-md animate-pulse" />
          </div>
          <div className="w-20 h-7 rounded-full bg-white/5 animate-pulse shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function UserListModal({ userId, mode, isOwnProfile, onClose }: UserListModalProps) {
  const [search, setSearch] = useState('');
  const { userId: myUserId } = useAuthStore();
  const removeFollowerMutation = useRemoveFollowerMutation(userId);

  const query = useFollowList(userId, mode);

  const allUsers = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allUsers;
    return allUsers.filter(
      (u) =>
        u.username.toLowerCase().includes(term) ||
        (u.displayName ?? '').toLowerCase().includes(term),
    );
  }, [allUsers, search]);

  const title = mode === 'followers' ? 'Followers' : 'Following';

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[80vh] flex flex-col bg-[#121216] border border-white/10 rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-popIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-lg">{title}</h3>
            {allUsers.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                {allUsers.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-5 pt-3 pb-2">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or username..."
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-9 pr-8 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/25 focus:bg-white/[0.07] transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* User List Body */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          {query.isLoading ? (
            <UserListSkeleton />
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mb-3">
                {search ? <Search size={24} /> : <Users size={24} />}
              </div>
              <h4 className="text-white font-semibold text-sm">
                {search
                  ? 'No users found'
                  : mode === 'followers'
                    ? 'No followers yet'
                    : 'Not following anyone'}
              </h4>
              <p className="text-xs text-gray-400 mt-1 max-w-[240px] leading-relaxed">
                {search
                  ? `No matching results for "${search}"`
                  : 'Find friends here and start building your network!'}
              </p>
              {!search && (
                <Link
                  to="/search"
                  onClick={onClose}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-gray-200 transition-colors shadow-sm cursor-pointer"
                >
                  <UserPlus size={14} />
                  Find friends here
                </Link>
              )}
            </div>
          ) : (
            filteredUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/[0.04] transition-colors"
              >
                <Link to={`/${u.username}`} onClick={onClose} className="shrink-0 cursor-pointer">
                  <Avatar size="md" src={u.avatar} />
                </Link>
                <Link
                  to={`/${u.username}`}
                  onClick={onClose}
                  className="flex-1 min-w-0 flex flex-col gap-0.5 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <UserNameWithBadges
                      displayName={u.displayName}
                      username={u.username}
                      isVerified={u.isVerified}
                      primaryBadge={u.primaryBadge}
                      size="sm"
                    />
                    {u.followsYou && u.id !== myUserId && (
                      <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white/10 text-gray-300 border border-white/5 tracking-tight select-none">
                        Follows You
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">@{u.username}</p>
                </Link>

                {/* Actions */}
                {u.id === myUserId ? null : mode === 'followers' && isOwnProfile ? (
                  <button
                    type="button"
                    disabled={removeFollowerMutation.isPending}
                    onClick={() => removeFollowerMutation.mutate(u.id)}
                    className="text-xs font-semibold px-4 py-1.5 rounded-full border border-white/10 text-gray-300 bg-white/5 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30 transition-all disabled:opacity-40 shrink-0 cursor-pointer"
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
              className="w-full text-xs font-medium text-gray-400 hover:text-white py-3 transition-colors disabled:opacity-40 cursor-pointer"
            >
              {query.isFetchingNextPage ? 'Loading more...' : 'Load more'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
