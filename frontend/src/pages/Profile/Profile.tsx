import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useUIStore } from '../../shared/model/useUIStore';
import { useUserByUsername } from '../../entities/profile/model/useUserByUsername';
import { useAuthStore } from '../../shared/model/useAuthStore';
import { useUserReposts } from '../../entities/post/model/useUserReposts';
import { useCreatePost } from '@/features/posts/model/useCreatePost';
import { USER_POSTS_KEY, USER_REPOSTS_KEY } from '@/shared/api/queryKeys';
import { useUserPosts } from '../../entities/post/model/useUserPosts';
import ProfileHeader from '@/widgets/profile/ui/ProfileHeader';
import ProfileTabs, { ProfileTabType } from '../../shared/ui/ProfileTabs';
import CreatePost from '../../features/posts/ui/CreatePost';
import { PostCard } from '@/widgets/post/ui/PostCard';
import { CommentModal } from '../../features/comment/ui/CommentModal';
import { SkeletonFeed } from '../../entities/post/ui/SkeletonPostCard';
import { SavedPostsView } from '@/features/profile/ui/saved/SavedPostsView';

function SkeletonProfileHeader() {
  return (
    <div className="w-full animate-pulse">
      <div className="h-44 w-full bg-white/[0.03]" />
      <div className="px-6 pb-6 relative">
        <div className="absolute -top-16 left-6 w-28 h-28 rounded-full bg-white/[0.06] border-4 border-[#0b0b0c]" />
        <div className="pt-20 flex flex-col gap-2">
          <div className="h-6 w-40 bg-white/[0.05] rounded" />
          <div className="h-4 w-24 bg-white/[0.04] rounded" />
          <div className="h-4 w-full max-w-sm bg-white/[0.03] rounded mt-2" />
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { username } = useParams();
  const { userId: myUserId } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const effectiveUsername = username || 'my_profile';
  const { data: user, isLoading, error } = useUserByUsername(effectiveUsername);
  const isOwnProfile = Boolean(user && user.id === myUserId);

  const tabParam = searchParams.get('tab') as ProfileTabType | null;
  const [localTab, setLocalTab] = useState<ProfileTabType>('posts');

  const activeTab: ProfileTabType =
    tabParam &&
    (tabParam === 'posts' || tabParam === 'reposts' || (tabParam === 'saved' && isOwnProfile))
      ? tabParam
      : localTab;

  const handleTabChange = (tab: ProfileTabType) => {
    setLocalTab(tab);
    setSearchParams(tab === 'posts' ? {} : { tab });
  };

  const openEditProfile = useUIStore((state) => state.openEditProfile);

  const postsQuery = useUserPosts(user?.id ?? '');
  const repostsQuery = useUserReposts(user?.id ?? '');
  const createPost = useCreatePost([USER_POSTS_KEY, user?.id ?? '']);

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

  if (isLoading) {
    return (
      <div className="w-full flex flex-col animate-fadeIn">
        <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)] mb-6">
          <SkeletonProfileHeader />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="w-full min-h-[450px] flex flex-col items-center justify-center bg-white/[0.02] backdrop-blur-2xl border border-white/[0.05] rounded-[2.5rem] p-8 text-center shadow-[0_12px_40px_rgba(0,0,0,0.6)] animate-fadeIn">
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
          className="flex items-center gap-2 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] text-white font-medium text-xs px-5 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
        >
          Here's the link to the Home Page
        </Link>
      </div>
    );
  }

  const posts = postsQuery.data?.pages.flatMap((p) => p.posts) ?? [];
  const reposts = repostsQuery.data?.pages.flatMap((p) => p.posts) ?? [];

  const activeFeed = activeTab === 'posts' ? posts : reposts;
  const activeQuery = activeTab === 'posts' ? postsQuery : repostsQuery;
  const feedQueryKey =
    activeTab === 'posts' ? [USER_POSTS_KEY, user.id] : [USER_REPOSTS_KEY, user.id];

  return (
    <div className="w-full flex flex-col animate-fadeIn">
      <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)] mb-6">
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
          isFollowing={user.isFollowing}
          followsYou={user.followsYou}
          isVerified={user.isVerified}
          primaryBadge={user.primaryBadge}
          badges={user.badges}
          followersCount={user.followersCount}
          followingCount={user.followingCount}
          onEditClick={openEditProfile}
        />
        <ProfileTabs
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          showSavedTab={isOwnProfile}
        />
      </div>

      {isOwnProfile && activeTab === 'posts' && (
        <div className="mb-4">
          <CreatePost onSubmitFormData={(fd) => createPost.mutate(fd)} />
        </div>
      )}

      {activeTab === 'saved' && isOwnProfile ? (
        <SavedPostsView userId={user.id} />
      ) : activeQuery.isLoading ? (
        <SkeletonFeed count={4} />
      ) : activeFeed.length > 0 ? (
        <div className="flex flex-col gap-4">
          {activeFeed.map((post) => (
            <PostCard key={post.id} post={post} queryKey={feedQueryKey} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
          <p className="text-gray-500 font-medium text-base">
            {activeTab === 'posts' ? 'No posts have been created yet.' : 'No reposts yet'}
          </p>
        </div>
      )}
      <CommentModal />
    </div>
  );
}
