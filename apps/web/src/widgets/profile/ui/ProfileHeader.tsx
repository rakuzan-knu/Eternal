import React, { useState } from 'react';
import type { AvatarDecorationDto } from '@social-network/shared-contracts';
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
  decoration?: AvatarDecorationDto | null | undefined;
  displayNameStyle?: import('@social-network/shared-contracts').DisplayNameStyleDto | null;
  profileTheme?: import('@social-network/shared-contracts').ProfileThemeDto | null;
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
  followStatus?: string;
  followsYou?: boolean;
  isFriend?: boolean;
  isVerified?: boolean;
  primaryBadge?: string | null;
  badges?: string[];
  mergedPrsCount?: number;
  reportCount?: number;
  subscriptionMonths?: number;
  subscriptionDate?: string;
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
  displayNameStyle,
  profileTheme,
  bio,
  avatar,
  decoration,
  banner,
  bannerPosition,
  createdAt,
  isOwnProfile,
  isFollowing,
  followStatus,
  followsYou = false,
  isFriend = false,
  isVerified = false,
  primaryBadge = null,
  badges = [],
  mergedPrsCount = 0,
  reportCount = 0,
  subscriptionMonths = 0,
  subscriptionDate,
  followersCount = 0,
  followingCount = 0,
  onEditClick,
}: ProfileHeaderProps) {
  const navigate = useNavigate();
  const [openList, setOpenList] = useState<'followers' | 'following' | null>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);

  const hasProfileTheme = Boolean(profileTheme?.primary && profileTheme?.accent);

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

  // Deduplicate: if user has multiple contributor or premium tier badges, collapse into single highest tier badge
  const contributorTierOrder = [
    'CONTRIBUTOR_OPAL',
    'CONTRIBUTOR_RUBY',
    'CONTRIBUTOR_DIAMOND',
    'CONTRIBUTOR_PLATINUM',
    'CONTRIBUTOR_GOLD',
    'CONTRIBUTOR_SILVER',
    'CONTRIBUTOR_BRONZE',
  ];
  const userBadgesUpper = (badges || []).map((b) => b.toUpperCase());
  const bestContributorBadge =
    contributorTierOrder.find((tier) => userBadgesUpper.includes(tier)) ||
    (userBadgesUpper.includes('CONTRIBUTOR') ? 'CONTRIBUTOR' : null);

  const premiumTierOrder = [
    'PREMIUM_OPAL',
    'PREMIUM_RUBY',
    'PREMIUM_DIAMOND',
    'PREMIUM_PLATINUM',
    'PREMIUM_GOLD',
    'PREMIUM_SILVER',
    'PREMIUM_BRONZE',
  ];
  const bestPremiumBadge =
    premiumTierOrder.find((tier) => userBadgesUpper.includes(tier)) ||
    (userBadgesUpper.includes('PREMIUM') ? 'PREMIUM' : null);

  const otherBadges = (badges || []).filter(
    (bId) =>
      !bId.toUpperCase().startsWith('CONTRIBUTOR') && !bId.toUpperCase().startsWith('PREMIUM'),
  );

  const finalBadgeIds = [
    ...otherBadges,
    ...(bestContributorBadge ? [bestContributorBadge] : []),
    ...(bestPremiumBadge ? [bestPremiumBadge] : []),
  ];

  const mappedBadges: Badge[] = finalBadgeIds
    .map((bId) => getBadgeById(bId))
    .filter(Boolean) as Badge[];

  return (
    <div className="w-full relative">
      <div className="h-44 w-full relative">
        <Banner
          src={banner}
          positionY={bannerPosition}
          fallbackGradient={
            hasProfileTheme
              ? `linear-gradient(135deg, ${profileTheme!.primary} 0%, rgba(0,0,0,0.55) 100%)`
              : undefined
          }
        />
      </div>

      <div className="px-6 pb-6 relative">
        <div data-profile-effect-avatar className="absolute -top-16 left-6">
          <div
            className={
              hasProfileTheme
                ? 'p-1.5 bg-[#111214]/85 backdrop-blur-md rounded-full shadow-2xl border border-white/10'
                : 'p-1 bg-white dark:bg-[#0b0b0c] dark:bg-[var(--app-surface-card,#0b0b0c)] rounded-full shadow-2xl transition-colors'
            }
          >
            <Avatar src={avatar} size="xl" decoration={decoration} />
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end pt-4">
          {isOwnProfile ? (
            <button
              type="button"
              onClick={() => onEditClick?.()}
              className={
                hasProfileTheme
                  ? 'flex items-center gap-2 bg-black/40 hover:bg-black/60 text-white border border-white/15 backdrop-blur-md font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer'
                  : 'flex items-center gap-2 bg-black/5 hover:bg-black/10 dark:bg-white/[0.07] dark:hover:bg-white/[0.14] border border-black/10 dark:border-white/[0.08] text-gray-900 dark:text-white font-medium text-xs px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98]'
              }
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
                className={
                  hasProfileTheme
                    ? 'flex items-center gap-1.5 bg-black/40 hover:bg-black/60 text-white border border-white/15 backdrop-blur-md font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50'
                    : 'flex items-center gap-1.5 bg-black/5 hover:bg-black/10 dark:bg-white/[0.07] dark:hover:bg-white/[0.14] border border-black/10 dark:border-white/[0.08] text-gray-900 dark:text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 shadow-sm active:scale-[0.98]'
                }
              >
                <MessageSquare size={14} />
                <span>Message</span>
              </button>
              <FollowButton
                authorId={userId}
                isFollowing={Boolean(isFollowing || followStatus === 'following')}
                followStatus={followStatus}
                isFriend={isFriend}
                followsYou={followsYou}
              />
            </>
          )}
        </div>

        <div
          className={
            hasProfileTheme
              ? 'mt-4 bg-black/35 backdrop-blur-xl rounded-3xl p-5 border border-white/10 shadow-lg flex flex-col gap-3'
              : 'mt-4 flex flex-col gap-1.5'
          }
        >
          <div className="flex flex-col gap-1.5">
            <UserNameWithBadges
              displayName={displayName}
              username={username}
              nameStyle={displayNameStyle}
              userId={userId}
              isCurrentUser={isOwnProfile}
              isVerified={isVerified}
              primaryBadge={primaryBadge}
              prCount={mergedPrsCount}
              reportCount={reportCount}
              subscriptionMonths={subscriptionMonths}
              subscriptionDate={subscriptionDate}
              size="lg"
            />
            <div className="flex items-center gap-2">
              <p
                className={
                  hasProfileTheme
                    ? 'text-sm text-gray-300 font-medium'
                    : 'text-sm text-gray-500 dark:text-gray-400 font-medium'
                }
              >
                @{username}
              </p>
              {!isOwnProfile && followsYou && (
                <span
                  className={
                    hasProfileTheme
                      ? 'text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/10 text-gray-200 border border-white/10 tracking-tight'
                      : 'text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-black/10 dark:border-white/5 tracking-tight'
                  }
                >
                  Follows You
                </span>
              )}
              {mappedBadges.length > 0 && (
                <BadgeList
                  badges={mappedBadges}
                  prCount={mergedPrsCount}
                  reportCount={reportCount}
                  subscriptionMonths={subscriptionMonths}
                  subscriptionDate={subscriptionDate}
                />
              )}
            </div>
          </div>

          {hasProfileTheme && <div className="w-full h-px bg-white/10 my-0.5" />}

          {(bio || isOwnProfile) && (
            <div
              className={
                hasProfileTheme
                  ? 'text-sm text-gray-200 leading-relaxed'
                  : 'text-sm text-gray-700 dark:text-gray-300 mt-3 leading-relaxed'
              }
            >
              <span
                className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${
                  hasProfileTheme ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                BIO
              </span>
              {bio ? (
                <div
                  className="overflow-y-auto custom-scrollbar whitespace-pre-wrap break-words transition-all duration-300"
                  style={{ maxHeight: 'min(50lh, 81.25em)' }}
                >
                  <FormattedText text={bio} />
                </div>
              ) : (
                <p
                  className={
                    hasProfileTheme
                      ? 'text-gray-400 italic text-xs'
                      : 'text-gray-500 dark:text-gray-400 italic'
                  }
                >
                  There is no bio yet. You can add a bio to your profile to let others know more
                  about you.
                </p>
              )}
            </div>
          )}

          <div
            className={
              hasProfileTheme
                ? 'flex items-center gap-2 text-xs text-gray-300 font-medium mt-0.5'
                : 'flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-4 font-medium'
            }
          >
            <Calendar
              size={14}
              className={hasProfileTheme ? 'text-gray-300' : 'text-gray-400 dark:text-gray-500'}
            />
            <span>Joined {formatJoinedDate(createdAt)}</span>
          </div>

          <div
            className={
              hasProfileTheme
                ? 'flex items-center gap-6 mt-1 pt-3 border-t border-white/10'
                : 'flex items-center gap-6 mt-5'
            }
          >
            <button
              type="button"
              onClick={() => setOpenList('followers')}
              className="group flex items-center gap-1.5 cursor-pointer transition-all duration-200"
            >
              <span
                className={
                  hasProfileTheme
                    ? 'text-white font-bold text-sm sm:text-base tracking-tight group-hover:text-blue-400 transition-colors'
                    : 'text-gray-900 dark:text-white font-bold text-sm sm:text-base tracking-tight group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors'
                }
              >
                {followersCount}
              </span>
              <span
                className={
                  hasProfileTheme
                    ? 'text-gray-300 group-hover:text-white text-xs sm:text-sm font-medium transition-colors'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 text-xs sm:text-sm font-medium transition-colors'
                }
              >
                Followers
              </span>
            </button>

            <button
              type="button"
              onClick={() => setOpenList('following')}
              className="group flex items-center gap-1.5 cursor-pointer transition-all duration-200"
            >
              <span
                className={
                  hasProfileTheme
                    ? 'text-white font-bold text-sm sm:text-base tracking-tight group-hover:text-blue-400 transition-colors'
                    : 'text-gray-900 dark:text-white font-bold text-sm sm:text-base tracking-tight group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors'
                }
              >
                {followingCount}
              </span>
              <span
                className={
                  hasProfileTheme
                    ? 'text-gray-300 group-hover:text-white text-xs sm:text-sm font-medium transition-colors'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 text-xs sm:text-sm font-medium transition-colors'
                }
              >
                Following
              </span>
            </button>
          </div>
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
