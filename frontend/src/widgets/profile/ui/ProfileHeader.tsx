import React, { useState } from 'react';
import { Calendar, Edit3 } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import Banner from '../../../shared/ui/Banner';
import { FollowButton } from '@/features/follow/ui/FollowButton';
import { UserListModal } from '@/features/follow/ui/UserListModal';

interface ProfileHeaderProps {
  userId: string;
  username: string;
  displayName?: string | null;
  bio?: string | null;
  avatar?: string | null;
  banner?: string | null;
  bannerPosition?: number;
  createdAt?: string;
  isOwnProfile: boolean;
  isFollowing?: boolean;
  followersCount?: number;
  followingCount?: number;
  onEditClick: () => void;
}

export default function ProfileHeader({
  userId,
  username,
  displayName,
  bio,
  avatar,
  banner,
  bannerPosition,
  createdAt,
  isOwnProfile,
  isFollowing,
  followersCount = 0,
  followingCount = 0,
  onEditClick,
}: ProfileHeaderProps) {
  const [openList, setOpenList] = useState<'followers' | 'following' | null>(null);

  return (
    <div className="w-full relative">
      <div className="h-44 w-full relative">
        <Banner src={banner} positionY={bannerPosition} />
      </div>

      <div className="px-6 pb-6 relative">
        <div className="absolute -top-16 left-6">
          <div className="p-1 bg-[#0b0b0c] rounded-full shadow-2xl">
            <Avatar src={avatar} size="xl" />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          {isOwnProfile ? (
            <button
              onClick={onEditClick}
              className="flex items-center gap-2 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] text-white font-medium text-xs px-4 py-2 rounded-xl transition-all duration-200"
            >
              <Edit3 size={14} /> Edit
            </button>
          ) : (
            <FollowButton authorId={userId} isFollowing={!!isFollowing} />
          )}
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white tracking-wide">{displayName || username}</h2>
          <p className="text-sm text-gray-400 font-medium">@{username}</p>
        </div>

        <p className="text-sm text-gray-300 mt-3 leading-relaxed whitespace-pre-wrap">
          {bio ||
            'There is no bio yet. You can add a bio to your profile to let others know more about you.'}
        </p>

        <div className="flex items-center gap-2 text-xs text-gray-500 mt-4 font-medium">
          <Calendar size={14} />{' '}
          <span>Register: {createdAt ? new Date(createdAt).toLocaleDateString() : 'Unknown'}</span>
        </div>

        <div className="flex gap-6 mt-4 text-sm text-gray-300 border-t border-white/[0.03] pt-4">
          <button
            type="button"
            className="cursor-pointer hover:underline"
            onClick={() => setOpenList('followers')}
          >
            <strong className="text-white font-semibold">{followersCount.toLocaleString()}</strong>{' '}
            followers
          </button>
          <button
            type="button"
            className="cursor-pointer hover:underline"
            onClick={() => setOpenList('following')}
          >
            <strong className="text-white font-semibold">{followingCount.toLocaleString()}</strong>{' '}
            following
          </button>
        </div>
      </div>

      {openList && (
        <UserListModal
          userId={userId}
          mode={openList}
          isOwnProfile={isOwnProfile}
          onClose={() => setOpenList(null)}
        />
      )}
    </div>
  );
}
