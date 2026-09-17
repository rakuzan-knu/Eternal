import React, { useState, useEffect, useMemo, useOptimistic, useTransition, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useUIStore } from '../../shared/model/useUIStore';
import { useUserByUsername } from '../../entities/profile/model/useUserByUsername';
import { useCurrentUser } from '../../entities/profile/model/useCurrentUser';
import { useAuthStore } from '../../shared/model/useAuthStore';
import { useUserReposts } from '../../entities/post/model/useUserReposts';
import { useCreatePost } from '@/features/posts/model/useCreatePost';
import { USER_POSTS_KEY, USER_REPOSTS_KEY } from '@/shared/api/queryKeys';
import { useUserPosts } from '../../entities/post/model/useUserPosts';
import ProfileHeader from '@/widgets/profile/ui/ProfileHeader';
import ProfileTabs, { ProfileTabType } from '../../shared/ui/ProfileTabs';
import CreatePost from '../../features/posts/ui/CreatePost';
import { PostCard } from '@/widgets/post/ui/PostCard';
import { SkeletonFeed } from '../../entities/post/ui/SkeletonPostCard';
import { SavedPostsView } from '@/widgets/profile';
import { UserReelsView } from '@/features/reels';
import { isReservedUsername } from '@/features/profile/model/profileSchema';
import { SEOHead } from '@/shared/seo';
import { storiesApi } from '@/features/stories/api/storiesApi';
import { useStoryViewerStore } from '@/features/stories/model/useStoryViewerStore';

const ProfileShowcaseSidebar = React.lazy(() =>
  import('@/widgets/profile/showcase/ProfileShowcaseSidebar').then((m) => ({
    default: m.ProfileShowcaseSidebar,
  })),
);

function SkeletonProfileHeader() {
  return (
    <div className="w-full animate-pulse">
      <div className="h-44 w-full bg-white/3" />
      <div className="px-6 pb-6 relative">
        <div className="absolute -top-16 left-6 w-28 h-28 rounded-full bg-white/6 border-4 border-[#0b0b0c]" />
        <div className="pt-20 flex flex-col gap-2">
          <div className="h-6 w-40 bg-white/5 rounded" />
          <div className="h-4 w-24 bg-white/4 rounded" />
          <div className="h-4 w-full max-w-sm bg-white/3 rounded mt-2" />
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { username: rawUsername } = useParams();
  const { data: currentUser } = useCurrentUser();
  const myUserId = useAuthStore((s) => s.userId);
  const [searchParams, setSearchParams] = useSearchParams();

  const isReserved = !!rawUsername && isReservedUsername(rawUsername);

  const effectiveUsername = isReserved
    ? '__reserved__'
    : rawUsername || currentUser?.username || 'my_profile';

  const { data: user, isLoading, error } = useUserByUsername(effectiveUsername);

  const isOwnProfile = Boolean(
    user && (user.id === myUserId || user.username === currentUser?.username),
  );

  const tabParam = searchParams.get('tab') as ProfileTabType | null;
  const [localTab, setLocalTab] = useState<ProfileTabType>('posts');

  const baseTab: ProfileTabType =
    tabParam &&
    (tabParam === 'posts' || tabParam === 'reposts' || (tabParam === 'saved' && isOwnProfile))
      ? tabParam
      : localTab;

  const [, startTabTransition] = useTransition();
  const [activeTab, setOptimisticTab] = useOptimistic(
    baseTab,
    (_current, next: ProfileTabType) => next,
  );

  const handleTabChange = (tab: ProfileTabType) => {
    startTabTransition(() => {
      setOptimisticTab(tab);
      setLocalTab(tab);
      setSearchParams(tab === 'posts' ? {} : { tab });
    });
  };

  const openEditProfile = useUIStore((state) => state.openEditProfile);

  const postsQuery = useUserPosts(user?.id ?? '');
  const repostsQuery = useUserReposts(user?.id ?? '');
  const createPost = useCreatePost([USER_POSTS_KEY, user?.id ?? '']);

  const posts = useMemo(() => {
    const raw =
      postsQuery.data?.pages
        ?.flatMap((p) => (Array.isArray(p?.posts) ? p.posts : []))
        .filter(Boolean) ?? [];
    const pinned = raw.filter((p) => p.isPinned);
    const unpinned = raw.filter((p) => !p.isPinned);
    return [...pinned, ...unpinned];
  }, [postsQuery.data]);

  const reposts = useMemo(() => {
    return (
      repostsQuery.data?.pages
        ?.flatMap((p) => (Array.isArray(p?.posts) ? p.posts : []))
        .filter(Boolean) ?? []
    );
  }, [repostsQuery.data]);

  useEffect(() => {
    if (!postsQuery.isLoading && window.location.hash) {
      setTimeout(() => {
        const el = document.querySelector(window.location.hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [postsQuery.isLoading]);

  const storyParam = searchParams.get('story');
  useEffect(() => {
    if (!storyParam || !user?.id) return;

    let isMounted = true;
    (async () => {
      try {
        const userGroup = await storiesApi.getUserStories(user.id);
        if (!isMounted) return;
        if (userGroup && userGroup.stories.length > 0) {
          const storyIdx = userGroup.stories.findIndex((s) => s.id === storyParam);
          useStoryViewerStore.getState().openViewer([userGroup], 0, storyIdx !== -1 ? storyIdx : 0);
          return;
        }

        const feed = await storiesApi.getFeed();
        if (!isMounted) return;
        const gIdx = feed.findIndex((g) => g.stories.some((s) => s.id === storyParam));
        if (gIdx !== -1) {
          const sIdx = feed[gIdx].stories.findIndex((s) => s.id === storyParam);
          useStoryViewerStore.getState().openViewer(feed, gIdx, sIdx !== -1 ? sIdx : 0);
        }
      } catch (err) {
        console.error('Failed to open story from URL param', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [storyParam, user?.id]);

  const activeFeed = activeTab === 'posts' ? posts : reposts;
  const activeQuery = activeTab === 'posts' ? postsQuery : repostsQuery;
  const feedQueryKey =
    activeTab === 'posts' ? [USER_POSTS_KEY, user?.id] : [USER_REPOSTS_KEY, user?.id];

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      setScrollMargin(containerRef.current.offsetTop);
    }
  }, [activeTab]);

  const postVirtualizer = useWindowVirtualizer({
    count: activeFeed.length,
    estimateSize: () => 240,
    overscan: 5,
    scrollMargin,
  });

  const virtualItems = postVirtualizer.getVirtualItems();
  const lastVirtualItem = virtualItems[virtualItems.length - 1];

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = activeQuery;
  useEffect(() => {
    if (!lastVirtualItem) return;
    if (lastVirtualItem.index >= activeFeed.length - 2 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [lastVirtualItem, activeFeed.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash && hash.startsWith('#post-') && activeFeed.length > 0) {
      const targetPostId = hash.replace('#post-', '');
      const targetIndex = activeFeed.findIndex((p) => String(p.id) === targetPostId);
      if (targetIndex !== -1) {
        postVirtualizer.scrollToIndex(targetIndex, { align: 'center', behavior: 'smooth' });
      }
    }
  }, [activeFeed, postVirtualizer]);

  if (isReserved) {
    return (
      <div className="w-full min-h-112.5 flex flex-col items-center justify-center bg-white/2 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 text-center shadow-[0_12px_40px_rgba(0,0,0,0.6)] animate-fadeIn">
        <h3 className="text-lg font-bold text-white mb-2">Page Not Found</h3>
        <p className="text-xs text-gray-500 max-w-xs mb-6">
          The requested system page or profile does not exist.
        </p>
        <Link
          to="/"
          className="flex items-center gap-2 bg-white/7 hover:bg-white/12 border border-white/8 text-white font-medium text-xs px-5 py-3 rounded-xl transition-all duration-200"
        >
          Return to Feed
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full flex justify-center gap-6 xl:gap-8 animate-fadeIn">
        <div className="w-full max-w-2xl flex flex-col">
          <div className="bg-white/2 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)] mb-6">
            <SkeletonProfileHeader />
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="w-full min-h-112.5 flex flex-col items-center justify-center bg-white/2 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 text-center shadow-[0_12px_40px_rgba(0,0,0,0.6)] animate-fadeIn">
        <SEOHead
          title="Profile Not Found • Eternal"
          description="The requested user profile does not exist or has been removed."
          noindex={true}
        />
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl animate-pulse w-24 h-24" />
          <div className="relative w-20 h-20 flex items-center justify-center bg-[#0b0b0c] border border-red-500/30 rounded-2xl animate-bounce shadow-2xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-10 h-10 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          </div>
        </div>

        <h3 className="text-base font-medium text-red-400/90 tracking-wide mb-1">
          Failed to load profile. Please try again later.
        </h3>
        <p className="text-xs text-gray-500 max-w-xs mb-6">
          The server connection was lost or the requested user profile does not exist.
        </p>

        <Link
          to="/"
          className="flex items-center gap-2 bg-white/7 hover:bg-white/12 border border-white/8 text-white font-medium text-xs px-5 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
        >
          Return to Feed
        </Link>
      </div>
    );
  }

  const profileName = user.displayName || user.username;
  const profileDescription =
    user.bio ||
    `Check out ${profileName} (@${user.username}) on Eternal. Follow to see their photos, videos and updates.`;

  return (
    <div className="w-full flex justify-center gap-6 xl:gap-8 animate-fadeIn">
      {/* Central Profile & Feed Column (Smoothly centered) */}
      <div className="w-full max-w-2xl flex flex-col transition-all duration-300 ease-in-out">
        <SEOHead
          title={`${profileName} (@${user.username}) • Eternal Profile`}
          description={profileDescription}
          image={user.avatar || undefined}
          canonical={`/@${user.username}`}
          type="profile"
          structuredData={{
            type: 'ProfilePage',
            name: profileName,
            username: user.username,
            bio: user.bio || undefined,
            avatar: user.avatar || undefined,
            breadcrumbs: [{ name: profileName, url: `/@${user.username}` }],
          }}
        />
        <div className="bg-white/2 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)] mb-6">
          <ProfileHeader
            userId={user.id}
            displayName={user.displayName}
            username={user.username}
            bio={user.bio}
            avatar={user.avatar}
            banner={user.banner}
            bannerPosition={user.bannerPosition}
            createdAt={user.createdAt}
            isOwnProfile={isOwnProfile}
            isFollowing={Boolean(user.isFollowing || user.followStatus === 'following')}
            followStatus={user.followStatus}
            followsYou={user.followsYou}
            isVerified={user.isVerified}
            primaryBadge={user.primaryBadge}
            badges={user.badges}
            mergedPrsCount={user.mergedPrsCount}
            reportCount={user.reportCount}
            subscriptionMonths={user.subscriptionMonths}
            subscriptionDate={user.subscriptionDate}
            followersCount={user.followersCount}
            followingCount={user.followingCount}
            onEditClick={() => openEditProfile('account')}
          />

          {/* Mobile Showcase View (< 1024px) */}
          <div className="px-6 pt-2 lg:hidden relative z-20">
            <React.Suspense fallback={null}>
              <ProfileShowcaseSidebar
                username={user.username}
                userId={user.id}
                isOwner={isOwnProfile}
                variant="mobile"
              />
            </React.Suspense>
          </div>

          <ProfileTabs
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            showSavedTab={isOwnProfile}
          />
        </div>

        {isOwnProfile && activeTab === 'posts' && (
          <div className="mb-4">
            <CreatePost
              onSubmitFormData={(fd, optimisticPost) =>
                createPost.mutateAsync({ formData: fd, optimisticPost })
              }
              isPending={createPost.isPending}
            />
          </div>
        )}

        {activeTab === 'saved' && isOwnProfile ? (
          <SavedPostsView userId={user.id} />
        ) : activeTab === 'reels' ? (
          <UserReelsView userId={user.id} />
        ) : activeQuery.isLoading ? (
          <SkeletonFeed count={4} />
        ) : activeFeed.length > 0 ? (
          <div
            ref={containerRef}
            style={{
              height: `${postVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualItem) => {
              const post = activeFeed[virtualItem.index];
              if (!post) return null;
              return (
                <div
                  key={virtualItem.key}
                  ref={postVirtualizer.measureElement}
                  data-index={virtualItem.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start - postVirtualizer.options.scrollMargin}px)`,
                    paddingBottom: '16px',
                  }}
                >
                  <PostCard post={post} queryKey={feedQueryKey} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/5 rounded-4xl bg-white/1">
            <p className="text-gray-500 font-medium text-base">
              {activeTab === 'posts' ? 'No posts have been created yet.' : 'No reposts yet'}
            </p>
          </div>
        )}
      </div>

      {/* Desktop Sticky Profile Showcase Sidebar (>= 1024px) */}
      <React.Suspense fallback={null}>
        <ProfileShowcaseSidebar
          username={user.username}
          userId={user.id}
          isOwner={isOwnProfile}
          variant="desktop"
        />
      </React.Suspense>
    </div>
  );
}
