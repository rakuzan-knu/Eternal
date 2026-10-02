import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, MapPin, Sparkles, Compass } from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import { VerifiedCheckmark } from '@/entities/profile/ui/VerifiedCheckmark';
import { FollowButton } from '@/features/follow/ui/FollowButton';
import { MiniProfileHoverCard } from '@/widgets/profile';
import {
  useSuggestedUsers,
  useDismissSuggestedUser,
} from '@/entities/user/model/useSuggestedUsers';
import type { FollowUserSummary } from '@/features/follow/api/followApi';

interface SuggestedUsersCarouselProps {
  title?: string;
  limit?: number;
  onEmpty?: () => void;
}

export function SuggestedUsersCarousel({
  title = 'Suggested for you',
  limit = 8,
  onEmpty,
}: SuggestedUsersCarouselProps) {
  const { data: users = [], isLoading } = useSuggestedUsers(limit);
  const dismissMutation = useDismissSuggestedUser();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Drag to scroll state
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [users, checkScroll]);

  useEffect(() => {
    if (!isLoading && (!users || users.length === 0)) {
      onEmpty?.();
    }
  }, [users, isLoading, onEmpty]);

  const scrollByAmount = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && scrollRef.current) {
      scrollRef.current.scrollBy({ left: e.deltaY * 2, behavior: 'smooth' });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  const handleDismiss = (e: React.MouseEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    dismissMutation.mutate(targetId);
  };

  if (isLoading) {
    return (
      <div className="w-full py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between px-2">
          <div className="h-4 w-32 rounded-lg bg-white/5 animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-hidden px-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-44 h-60 rounded-3xl bg-white/[0.02] border border-white/5 p-4 flex flex-col items-center justify-between animate-pulse shrink-0"
            >
              <div className="w-16 h-16 rounded-full bg-white/5" />
              <div className="w-24 h-3.5 rounded bg-white/5" />
              <div className="w-16 h-2.5 rounded bg-white/5" />
              <div className="w-full h-8 rounded-full bg-white/5 mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return null;
  }

  return (
    <div className="w-full py-3 flex flex-col gap-3 group/carousel relative select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
            {title}
          </span>
        </div>
        <Link
          to="/search"
          className="text-xs text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white flex items-center gap-1 transition-colors"
        >
          <Compass className="w-3.5 h-3.5 text-purple-400" />
          <span>See all</span>
        </Link>
      </div>

      {/* Carousel Track Container */}
      <div className="relative w-full">
        {/* Left Navigation Chevron Button */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollByAmount(-220)}
            aria-label="Scroll left"
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white dark:bg-[#111115]/90 dark:hover:bg-black/95 border border-black/10 dark:border-white/15 backdrop-blur-xl text-gray-800 dark:text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Right Navigation Chevron Button */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollByAmount(220)}
            aria-label="Scroll right"
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white dark:bg-[#111115]/90 dark:hover:bg-black/95 border border-black/10 dark:border-white/15 backdrop-blur-xl text-gray-800 dark:text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Left Soft Fade Gradient Mask */}
        <div
          className={`pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white/80 dark:from-[#070709] to-transparent z-10 transition-opacity duration-300 ${
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Right Soft Fade Gradient Mask */}
        <div
          className={`pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/80 dark:from-[#070709] to-transparent z-10 transition-opacity duration-300 ${
            canScrollRight ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Horizontal Scrollable Container */}
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="flex items-stretch gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth px-1 py-1"
        >
          {users.map((user: FollowUserSummary) => (
            <SuggestedCreatorCard
              key={user.id}
              user={user}
              onDismiss={(e) => handleDismiss(e, user.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SuggestedCreatorCard({
  user,
  onDismiss,
}: {
  user: FollowUserSummary;
  onDismiss: (e: React.MouseEvent) => void;
}) {
  const displayName = user.displayName || user.username;
  const reason = user.recommendationReason;

  return (
    <div className="w-44 shrink-0 flex flex-col items-center justify-between p-4 rounded-3xl glass-card border border-black/10 dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/[0.2] backdrop-blur-2xl transition-all duration-300 group/card relative text-center shadow-md hover:shadow-xl">
      {/* Dismiss Button ✕ */}
      <button
        type="button"
        onClick={onDismiss}
        title="Hide recommendation"
        aria-label={`Hide recommendation for ${user.username}`}
        className="absolute top-3 right-3 p-1 rounded-full text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all z-10"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Creator Info Link */}
      <div className="flex flex-col items-center w-full min-w-0">
        {/* Avatar */}
        <MiniProfileHoverCard username={user.username} side="top">
          <Link to={`/profile/${user.username}`} className="relative mb-2.5 mt-1 block">
            <div className="p-0.5 rounded-full bg-gradient-to-tr from-purple-500/30 to-blue-500/30">
              <Avatar src={user.avatar} alt={displayName} size="lg" />
            </div>
            {user.isVerified && (
              <span className="absolute bottom-0 right-0 p-0.5 rounded-full bg-[#070709] flex items-center justify-center">
                <VerifiedCheckmark isVerified size="xs" />
              </span>
            )}
          </Link>
        </MiniProfileHoverCard>

        {/* Name & Handle */}
        <div className="w-full flex flex-col items-center min-w-0">
          <div className="flex items-center justify-center gap-1 max-w-full">
            <MiniProfileHoverCard username={user.username} side="top">
              <Link
                to={`/profile/${user.username}`}
                className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate group-hover/card:text-blue-600 dark:group-hover/card:text-white hover:underline transition-colors block"
              >
                {displayName}
              </Link>
            </MiniProfileHoverCard>
            <VerifiedCheckmark
              isVerified={user.isVerified}
              primaryBadge={user.primaryBadge}
              size="xs"
            />
          </div>
          <Link
            to={`/profile/${user.username}`}
            className="text-[11px] text-gray-600 dark:text-gray-400 truncate w-full text-center hover:text-gray-900 dark:hover:text-gray-300 block"
          >
            @{user.username}
          </Link>
        </div>

        {/* Recommendation Reason Context */}
        <div className="h-9 w-full flex items-center justify-center mt-2 px-1">
          {reason?.type === 'MUTUAL_FRIENDS' &&
          reason.mutualFriends &&
          reason.mutualFriends.length > 0 ? (
            <div className="flex items-center gap-1.5 min-w-0 max-w-full justify-center">
              <div className="flex -space-x-1.5 shrink-0">
                {reason.mutualFriends.map((m, idx) => (
                  <Avatar
                    key={m.id || idx}
                    src={m.avatar}
                    alt={m.username}
                    size="2xs"
                    className="w-3.5 h-3.5 ring-1 ring-[#070709] border-0 shrink-0"
                  />
                ))}
              </div>
              <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate leading-tight text-left">
                {reason.text}
              </span>
            </div>
          ) : reason?.type === 'NEARBY' || reason?.type === 'SAME_CITY' ? (
            <div className="flex items-center gap-1 text-blue-500 dark:text-blue-400 text-[10px] justify-center truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{reason.text}</span>
            </div>
          ) : (
            <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate">
              {reason?.text || 'Suggested for you'}
            </span>
          )}
        </div>
      </div>

      {/* Follow Button */}
      <div className="w-full mt-3">
        <FollowButton
          authorId={user.id}
          isFollowing={user.isFollowing}
          isFriend={user.isFriend}
          followsYou={user.followsYou}
          className="w-full py-1.5 text-xs font-semibold rounded-full justify-center"
        />
      </div>
    </div>
  );
}
