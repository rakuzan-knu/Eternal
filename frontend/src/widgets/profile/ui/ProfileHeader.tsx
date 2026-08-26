import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Edit3, MessageSquare } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import Banner from '../../../shared/ui/Banner';
import FormattedText from '@/shared/ui/FormattedText';
import { FollowButton } from '@/features/follow/ui/FollowButton';
import { UserListModal } from '@/features/follow/ui/UserListModal';
import { UserNameWithBadges } from '@/entities/profile/ui/UserNameWithBadges';
import BadgeList from '@/features/profile/ui/BadgeList';
import { getBadgeById, Badge } from '@/entities/profile/model/badges';
import { chatApi } from '@/features/chat/api/chatApi';

interface ProfileHeaderProps {
  userId: string;
  username: string;
  displayName?: string | null;
  bio?: string | null;
  avatar?: string | null;
  banner?: string | null;
  bannerPosition?: number;
  createdAt?: string | Date | null;
  isOwnProfile: boolean;
  isFollowing?: boolean;
  followsYou?: boolean;
  isFriend?: boolean;
  isVerified?: boolean;
  primaryBadge?: string | null;
  badges?: string[];
  followersCount?: number;
  followingCount?: number;
  onEditClick: () => void;
}

function formatJoinedDate(createdAt?: string | Date | null): string {
  if (!createdAt) return 'recently';
  try {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return 'recently';
    return d.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'recently';
  }
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
  followsYou = false,
  isFriend = false,
  isVerified = false,
  primaryBadge = null,
  badges = [],
  followersCount = 0,
  followingCount = 0,
  onEditClick,
}: ProfileHeaderProps) {
  const navigate = useNavigate();
  const [openList, setOpenList] = useState<'followers' | 'following' | null>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);

  const handleStartChat = async () => {
    try {
      setIsStartingChat(true);
      const conv = await chatApi.createDirectConversation(userId);
      if (conv?.id) {
        navigate(`/messages/${conv.id}`);
      } else {
        navigate('/messages');
      }
    } catch {
      navigate('/messages');
    } finally {
      setIsStartingChat(false);
    }
  };

  const mappedBadges: Badge[] =
    badges && badges.length > 0
      ? (badges.map((bId) => getBadgeById(bId)).filter(Boolean) as Badge[])
      : [];

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

        <div className="flex items-center gap-2 justify-end pt-4">
          {isOwnProfile ? (
            <button
              type="button"
              onClick={() => onEditClick?.()}
              className="flex items-center gap-2 bg-white/[0.07] hover:bg-white/[0.14] hover:border-white/20 active:scale-[0.98] border border-white/[0.08] text-white font-medium text-xs px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer shadow-sm"
            >
              <Edit3 size={14} />
              <span>Edit</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleStartChat}
                disabled={isStartingChat}
                className="flex items-center gap-1.5 bg-white/[0.07] hover:bg-white/[0.14] hover:border-white/20 active:scale-[0.98] border border-white/[0.08] text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <MessageSquare size={14} />
                <span>Message</span>
              </button>
              <FollowButton
                authorId={userId}
                isFollowing={!!isFollowing}
                isFriend={isFriend}
                followsYou={followsYou}
              />
            </>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <UserNameWithBadges
            displayName={displayName}
            username={username}
            isVerified={isVerified}
            primaryBadge={primaryBadge}
            size="lg"
          />
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-400 font-medium">@{username}</p>
            {!isOwnProfile && followsYou && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/10 text-gray-300 border border-white/5 tracking-tight">
                Follows You
              </span>
            )}
            {mappedBadges.length > 0 && <BadgeList badges={mappedBadges} />}
          </div>
        </div>

        {(bio || isOwnProfile) && (
          <div className="text-sm text-gray-300 mt-3 leading-relaxed">
            {bio ? (
              <FormattedText text={bio} />
            ) : (
              <p className="text-gray-400 italic">
                There is no bio yet. You can add a bio to your profile to let others know more about
                you.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-400 mt-4 font-medium">
          <Calendar size={14} className="text-gray-500" />
          <span>Joined {formatJoinedDate(createdAt)}</span>
        </div>

        <div className="flex items-center gap-6 mt-5">
          <button
            type="button"
            onClick={() => setOpenList('followers')}
            className="group flex items-center gap-1.5 cursor-pointer transition-all duration-200"
          >
            <span className="text-white font-bold text-sm sm:text-base tracking-tight group-hover:text-blue-400 transition-colors">
              {followersCount}
            </span>
            <span className="text-gray-400 group-hover:text-gray-200 text-xs sm:text-sm font-medium transition-colors">
              Followers
            </span>
          </button>

          <button
            type="button"
            onClick={() => setOpenList('following')}
            className="group flex items-center gap-1.5 cursor-pointer transition-all duration-200"
          >
            <span className="text-white font-bold text-sm sm:text-base tracking-tight group-hover:text-blue-400 transition-colors">
              {followingCount}
            </span>
            <span className="text-gray-400 group-hover:text-gray-200 text-xs sm:text-sm font-medium transition-colors">
              Following
            </span>
          </button>
        </div>
      </div>

      {openList !== null && (
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
