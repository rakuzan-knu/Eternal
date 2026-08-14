import React, { useState, useEffect, useRef } from 'react';
import {
  Search as SearchIcon,
  ArrowLeft,
  X,
  Clock,
  Heart,
  MessageSquare,
  Play,
  CheckCircle2,
  Hash,
  Sparkles,
  TrendingUp,
  Users,
  Film,
  FileText,
  Flame,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import Avatar from '@/shared/ui/Avatar';
import { apiClient as api } from '@/shared/api/httpClient';
import { postsApi } from '@/entities/post/api/postsApi';
import { PostType } from '@/entities/post/model/types';
import { useUIStore } from '@/shared/model/useUIStore';
import { CommentModal } from '@/features/comment/ui/CommentModal';
import { PostCard } from '@/widgets/post/ui/PostCard';
import { FollowButton } from '@/features/follow/ui/FollowButton';
import { useAuthStore } from '@/shared/model/useAuthStore';

interface SearchUserItem {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isVerified?: boolean;
  primaryBadge?: string | null;
  bio?: string | null;
  followersCount?: number;
  isFollowing?: boolean;
}

interface HashtagItem {
  tag: string;
  count: number;
}

type SearchTab = 'All' | 'People' | 'Posts' | 'Hashtags' | 'Media';

const RECENT_SEARCHES_KEY = 'recent_searches';

function formatCount(num?: number): string {
  if (!num) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`.replace('.0M', 'M');
  if (num >= 10_000) return `${(num / 1_000).toFixed(1)}K`.replace('.0K', 'K');
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function GridMediaCard({ post, onClick }: { post: PostType; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const mediaItem =
    post.media?.[0] ?? (post.image ? { type: 'image' as const, url: post.image } : null);
  const isVideo =
    mediaItem?.type === 'video' ||
    (mediaItem?.url && mediaItem.url.match(/\.(mp4|webm|mov)(\?.*)?$/i));

  const handleMouseEnter = () => {
    if (isVideo && videoRef.current) {
      const p = videoRef.current.play();
      if (p !== undefined) {
        playPromiseRef.current = p;
        p.catch(() => {
          // Play request was interrupted safely
        });
      }
    }
  };

  const handleMouseLeave = () => {
    if (isVideo && videoRef.current) {
      if (playPromiseRef.current) {
        playPromiseRef.current
          .then(() => {
            if (videoRef.current) {
              videoRef.current.pause();
              videoRef.current.currentTime = 0;
            }
          })
          .catch(() => {
            if (videoRef.current) {
              videoRef.current.pause();
              videoRef.current.currentTime = 0;
            }
          });
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="aspect-square relative overflow-hidden rounded-2xl bg-[#111114] border border-white/[0.04] group cursor-pointer select-none transition-transform duration-200 hover:scale-[1.01]"
    >
      {isVideo ? (
        <video
          ref={videoRef}
          src={mediaItem?.url}
          poster={mediaItem?.poster}
          className="w-full h-full object-cover"
          muted
          playsInline
          loop
          preload="metadata"
        />
      ) : (
        <img
          src={mediaItem?.url ?? post.image ?? ''}
          alt={post.text || 'Explore post'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {isVideo && (
        <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md rounded-md p-1 text-white shadow-md">
          <Play size={14} className="fill-white" />
        </div>
      )}

      {/* Hover Overlay with Likes & Comments Count */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-6 text-white font-bold text-base z-10">
        <div className="flex items-center gap-2">
          <Heart size={20} className="fill-white text-white" />
          <span>{formatCount(post.likes)}</span>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="fill-white text-white" />
          <span>{formatCount(post.comments)}</span>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialTab = (searchParams.get('tab') as SearchTab) || 'All';

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [debouncedTerm, setDebouncedTerm] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>(initialTab);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchUserItem[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 15);
        }
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.userId);
  const openCommentModal = useUIStore((state) => state.openCommentModal);

  const saveRecentSearch = (user: SearchUserItem) => {
    try {
      const filtered = recentSearches.filter(
        (u) => u.id !== user.id && u.username.toLowerCase() !== user.username.toLowerCase(),
      );
      const updated = [user, ...filtered].slice(0, 15);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const removeRecent = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter((u) => u.id !== userId);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  // Sync with searchParams
  const urlParamQ = searchParams.get('q') || '';
  const [prevUrlQ, setPrevUrlQ] = useState(urlParamQ);
  if (prevUrlQ !== urlParamQ) {
    setPrevUrlQ(urlParamQ);
    setSearchTerm(urlParamQ);
    setDebouncedTerm(urlParamQ);
  }

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
      if (searchTerm) {
        setSearchParams({ q: searchTerm, tab: activeTab }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, activeTab, setSearchParams]);

  // 1. Trending Hashtags
  const { data: trendingHashtags = [] } = useQuery<HashtagItem[]>({
    queryKey: ['trendingHashtags'],
    queryFn: async () => {
      const res = await api.get<HashtagItem[]>('/users/trending-hashtags?limit=6');
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 60 * 1000,
  });

  // 2. Suggested Creators
  const { data: suggestedUsers = [] } = useQuery<SearchUserItem[]>({
    queryKey: ['suggestedUsers'],
    queryFn: async () => {
      const res = await api.get<SearchUserItem[]>('/users/suggested?limit=5');
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 60 * 1000,
  });

  // 3. Top Creators by followers
  const { data: topUsers = [] } = useQuery<SearchUserItem[]>({
    queryKey: ['topFollowedUsers'],
    queryFn: async () => {
      const res = await api.get<SearchUserItem[]>('/users/top?limit=5');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // 4. Live User Search Results (Fuzzy / Smart)
  const isHashtagSearch = debouncedTerm.startsWith('#');
  const cleanSearchTerm = debouncedTerm.replace(/^#+/, '');

  const { data: searchUsers = [] } = useQuery<SearchUserItem[]>({
    queryKey: ['searchUsers', debouncedTerm],
    queryFn: async () => {
      if (!debouncedTerm || isHashtagSearch) return [];
      const res = await api.get<SearchUserItem[]>('/users/search', {
        params: { q: debouncedTerm },
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!debouncedTerm && !isHashtagSearch,
  });

  // 5. Live Hashtag Search Results
  const { data: searchHashtags = [] } = useQuery<HashtagItem[]>({
    queryKey: ['searchHashtags', cleanSearchTerm],
    queryFn: async () => {
      if (!cleanSearchTerm) return [];
      const res = await api.get<HashtagItem[]>('/users/hashtags', {
        params: { q: cleanSearchTerm },
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!cleanSearchTerm,
  });

  // 6. Posts Search Results (Text Posts)
  const {
    data: postsData,
    fetchNextPage: fetchNextPosts,
    hasNextPage: hasNextPosts,
    isFetchingNextPage: isFetchingNextPosts,
  } = useInfiniteQuery({
    queryKey: ['searchPosts', debouncedTerm],
    queryFn: ({ pageParam }) => postsApi.searchPosts(debouncedTerm, pageParam, 10, false),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!debouncedTerm && (activeTab === 'All' || activeTab === 'Posts'),
  });

  const matchingPosts = postsData?.pages.flatMap((p) => p.posts) ?? [];

  // 7. Media Explore Grid (Hashtag feed or Explore media)
  const {
    data: exploreMediaData,
    fetchNextPage: fetchNextExplore,
    hasNextPage: hasNextExplore,
    isFetchingNextPage: isFetchingNextExplore,
  } = useInfiniteQuery({
    queryKey: ['explorePosts', debouncedTerm, isHashtagSearch],
    queryFn: ({ pageParam }) => {
      if (isHashtagSearch) {
        return postsApi.getPostsByHashtag(cleanSearchTerm, pageParam, 9);
      }
      if (debouncedTerm) {
        return postsApi.searchPosts(debouncedTerm, pageParam, 9, true);
      }
      return postsApi.getExplorePosts(pageParam, 9);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const mediaPosts = exploreMediaData?.pages.flatMap((page) => page.posts) ?? [];

  // Infinite Scroll Trigger
  useEffect(() => {
    if (!loadMoreRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (activeTab === 'Posts' && hasNextPosts && !isFetchingNextPosts) {
            fetchNextPosts();
          } else if (hasNextExplore && !isFetchingNextExplore) {
            fetchNextExplore();
          }
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [
    activeTab,
    hasNextPosts,
    isFetchingNextPosts,
    fetchNextPosts,
    hasNextExplore,
    isFetchingNextExplore,
    fetchNextExplore,
  ]);

  const handleUserClick = (user: SearchUserItem) => {
    saveRecentSearch(user);
    navigate(`/profile/${user.username}`);
  };

  const handleHashtagClick = (tag: string) => {
    const formatted = `#${tag}`;
    setSearchTerm(formatted);
    setDebouncedTerm(formatted);
    setIsFocused(false);
  };

  const isSearchActive = !!debouncedTerm.trim();
  const showDropdown = isFocused && !isSearchActive;

  const TABS: { id: SearchTab; label: string; icon: React.ReactNode }[] = [
    { id: 'All', label: 'All', icon: <Sparkles size={14} /> },
    { id: 'People', label: 'People', icon: <Users size={14} /> },
    { id: 'Posts', label: 'Posts', icon: <FileText size={14} /> },
    { id: 'Hashtags', label: 'Hashtags', icon: <Hash size={14} /> },
    { id: 'Media', label: 'Media', icon: <Film size={14} /> },
  ];

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn pb-16">
      {/* 1. Search Header Bar */}
      <div className="flex items-center gap-3 w-full">
        {isFocused && (
          <button
            type="button"
            onClick={() => {
              setIsFocused(false);
              setSearchTerm('');
              setDebouncedTerm('');
            }}
            className="p-2.5 rounded-full hover:bg-white/[0.08] text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <div className="relative flex-1 flex items-center">
          <SearchIcon size={18} className="absolute left-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            maxLength={256}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Search users, #hashtags, posts..."
            className="w-full bg-[#111115] border border-white/[0.08] focus:border-purple-500/50 text-white placeholder-gray-500 rounded-full py-3 pl-12 pr-10 text-sm focus:outline-none transition-all shadow-inner"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setDebouncedTerm('');
                inputRef.current?.focus();
              }}
              className="absolute right-3.5 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Segmented Search Tabs (when searching) */}
      {isSearchActive && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-white/[0.06]">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchParams({ q: searchTerm, tab: tab.id }, { replace: true });
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Empty / Focused View: Recent Searches + Trending Hashtags + Suggested Creators */}
      {showDropdown && (
        <div className="bg-[#111115]/95 backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col gap-6">
          {/* Recent Searches */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-gray-400" />
                <span className="text-white font-bold text-sm">Recent</span>
              </div>
              {recentSearches.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllRecent}
                  className="text-purple-400 hover:text-purple-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {recentSearches.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500">No recent searches</div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {recentSearches.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleUserClick(u)}
                    className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 hover:bg-white/[0.02] rounded-2xl px-2 -mx-2 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Avatar src={u.avatar} size="md" />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-white font-semibold text-sm group-hover:text-purple-300 transition-colors truncate">
                            {u.username}
                          </span>
                          {u.isVerified && (
                            <CheckCircle2
                              size={14}
                              className="text-sky-400 fill-sky-400/20 shrink-0"
                            />
                          )}
                        </div>
                        <span className="text-xs text-gray-400 truncate">
                          {u.displayName || u.username} · {formatCount(u.followersCount)} followers
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => removeRecent(u.id, e)}
                      className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trending Hashtags Section */}
          {trendingHashtags.length > 0 && (
            <div className="flex flex-col gap-3 pt-5 border-t border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-amber-400" />
                <span className="text-white font-bold text-sm">Trending Hashtags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingHashtags.map((h) => (
                  <button
                    key={h.tag}
                    type="button"
                    onClick={() => handleHashtagClick(h.tag)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-sky-400 hover:text-sky-300 transition-all cursor-pointer"
                  >
                    <span>#{h.tag}</span>
                    <span className="text-gray-400 font-normal">· {formatCount(h.count)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Users ("Interesting to you") */}
          {suggestedUsers.length > 0 && (
            <div className="flex flex-col gap-3 pt-5 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-purple-400" />
                  <span className="text-white font-bold text-sm">Suggested for you</span>
                </div>
              </div>
              <div className="flex flex-col divide-y divide-white/[0.03]">
                {suggestedUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleUserClick(u)}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] rounded-2xl px-2 -mx-2 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Avatar src={u.avatar} size="md" />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-white font-semibold text-sm group-hover:text-purple-300 transition-colors truncate">
                            {u.displayName || u.username}
                          </span>
                          {u.isVerified && (
                            <CheckCircle2
                              size={14}
                              className="text-sky-400 fill-sky-400/20 shrink-0"
                            />
                          )}
                        </div>
                        <span className="text-xs text-gray-400 truncate">
                          @{u.username} · {formatCount(u.followersCount)} followers
                        </span>
                      </div>
                    </div>

                    {currentUserId !== u.id && (
                      <FollowButton
                        authorId={u.id}
                        isFollowing={u.isFollowing ?? false}
                        className="shrink-0 text-xs px-3.5 py-1"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Active Search Results or Default Explore Feed */}
      {!showDropdown && (
        <div className="flex flex-col gap-8">
          {/* Default Explore View (when no search active) */}
          {!isSearchActive && (
            <>
              {/* Top by Followers Card */}
              {topUsers.length > 0 && (
                <div className="bg-[#111115]/95 backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-purple-400" />
                      <span className="text-white font-bold text-sm">Top by followers</span>
                    </div>
                    <span className="text-gray-400 text-xs font-medium">Top 5</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {topUsers.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => handleUserClick(u)}
                        className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] rounded-2xl p-3 flex flex-col items-center text-center gap-2 transition-all cursor-pointer group"
                      >
                        <Avatar src={u.avatar} size="lg" />
                        <div className="flex flex-col items-center min-w-0 w-full">
                          <div className="flex items-center gap-1 justify-center max-w-full">
                            <span className="font-semibold text-xs text-white truncate group-hover:text-purple-300">
                              {u.displayName || u.username}
                            </span>
                            {u.isVerified && (
                              <CheckCircle2
                                size={12}
                                className="text-sky-400 fill-sky-400/20 shrink-0"
                              />
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400 truncate">@{u.username}</span>
                          <span className="text-[11px] text-purple-400 font-semibold mt-1">
                            {formatCount(u.followersCount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Explore Media Grid */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold text-base">Explore Media</span>
                  <span className="text-gray-400 text-xs font-medium">Trending clips & photos</span>
                </div>

                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {mediaPosts.map((post) => (
                    <GridMediaCard
                      key={post.id}
                      post={post}
                      onClick={() => openCommentModal(post)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Active Search Tabbed Results */}
          {isSearchActive && (
            <>
              {/* Tab: ALL */}
              {activeTab === 'All' && (
                <div className="flex flex-col gap-8">
                  {/* Matching People Preview */}
                  {searchUsers.length > 0 && (
                    <div className="bg-[#111115]/95 border border-white/[0.06] rounded-3xl p-5 shadow-2xl flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold text-sm">People</span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('People')}
                          className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                        >
                          See all ({searchUsers.length})
                        </button>
                      </div>
                      <div className="divide-y divide-white/[0.03]">
                        {searchUsers.slice(0, 3).map((u) => (
                          <div
                            key={u.id}
                            onClick={() => handleUserClick(u)}
                            className="py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] rounded-2xl px-2 -mx-2 cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar src={u.avatar} size="md" />
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="text-white font-semibold text-sm group-hover:text-purple-300 truncate">
                                    {u.displayName || u.username}
                                  </span>
                                  {u.isVerified && (
                                    <CheckCircle2
                                      size={14}
                                      className="text-sky-400 fill-sky-400/20 shrink-0"
                                    />
                                  )}
                                </div>
                                <span className="text-xs text-gray-400 truncate">
                                  @{u.username} · {formatCount(u.followersCount)} followers
                                </span>
                              </div>
                            </div>
                            {currentUserId !== u.id && (
                              <FollowButton
                                authorId={u.id}
                                isFollowing={u.isFollowing ?? false}
                                className="shrink-0 text-xs px-3 py-1"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Hashtags Preview */}
                  {searchHashtags.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-white font-bold text-sm">Hashtags</span>
                      <div className="flex flex-wrap gap-2">
                        {searchHashtags.map((h) => (
                          <button
                            key={h.tag}
                            type="button"
                            onClick={() => handleHashtagClick(h.tag)}
                            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111115] border border-white/[0.08] text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
                          >
                            <span>#{h.tag}</span>
                            <span className="text-gray-400 font-normal">
                              · {formatCount(h.count)} posts
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Media Grid */}
                  {mediaPosts.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <span className="text-white font-bold text-sm">Media</span>
                      <div className="grid grid-cols-3 gap-2 md:gap-3">
                        {mediaPosts.slice(0, 6).map((post) => (
                          <GridMediaCard
                            key={post.id}
                            post={post}
                            onClick={() => openCommentModal(post)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Posts Feed */}
                  {matchingPosts.length > 0 && (
                    <div className="flex flex-col gap-4">
                      <span className="text-white font-bold text-sm">Posts</span>
                      <div className="flex flex-col gap-4">
                        {matchingPosts.map((post) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            queryKey={['searchPosts', debouncedTerm]}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {searchUsers.length === 0 &&
                    searchHashtags.length === 0 &&
                    mediaPosts.length === 0 &&
                    matchingPosts.length === 0 && (
                      <div className="text-center py-16 text-gray-400 text-sm">
                        No results found for "{debouncedTerm}"
                      </div>
                    )}
                </div>
              )}

              {/* Tab: PEOPLE */}
              {activeTab === 'People' && (
                <div className="bg-[#111115]/95 border border-white/[0.06] rounded-3xl p-5 shadow-2xl flex flex-col gap-3">
                  {searchUsers.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">
                      No users found matching "{debouncedTerm}"
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.03]">
                      {searchUsers.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => handleUserClick(u)}
                          className="py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] rounded-2xl px-2 -mx-2 cursor-pointer group"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <Avatar src={u.avatar} size="md" />
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-white font-semibold text-sm group-hover:text-purple-300 truncate">
                                  {u.displayName || u.username}
                                </span>
                                {u.isVerified && (
                                  <CheckCircle2
                                    size={14}
                                    className="text-sky-400 fill-sky-400/20 shrink-0"
                                  />
                                )}
                              </div>
                              <span className="text-xs text-gray-400 truncate">
                                @{u.username} · {formatCount(u.followersCount)} followers
                              </span>
                              {u.bio && (
                                <span className="text-xs text-gray-300 mt-1 line-clamp-1">
                                  {u.bio}
                                </span>
                              )}
                            </div>
                          </div>
                          {currentUserId !== u.id && (
                            <FollowButton
                              authorId={u.id}
                              isFollowing={u.isFollowing ?? false}
                              className="shrink-0 text-xs px-3.5 py-1"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: POSTS */}
              {activeTab === 'Posts' && (
                <div className="flex flex-col gap-4">
                  {matchingPosts.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">
                      No posts found matching "{debouncedTerm}"
                    </div>
                  ) : (
                    matchingPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        queryKey={['searchPosts', debouncedTerm]}
                      />
                    ))
                  )}
                </div>
              )}

              {/* Tab: HASHTAGS */}
              {activeTab === 'Hashtags' && (
                <div className="bg-[#111115]/95 border border-white/[0.06] rounded-3xl p-5 shadow-2xl flex flex-col gap-2">
                  {searchHashtags.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">
                      No hashtags found matching "#{cleanSearchTerm}"
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.03]">
                      {searchHashtags.map((h) => (
                        <div
                          key={h.tag}
                          onClick={() => handleHashtagClick(h.tag)}
                          className="py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] rounded-2xl px-2 -mx-2 cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                              <Hash size={20} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm text-white group-hover:text-sky-300">
                                #{h.tag}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatCount(h.count)} posts
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: MEDIA */}
              {activeTab === 'Media' && (
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {mediaPosts.length === 0 ? (
                    <div className="col-span-3 text-center py-12 text-gray-400 text-sm">
                      No media found matching "{debouncedTerm}"
                    </div>
                  ) : (
                    mediaPosts.map((post) => (
                      <GridMediaCard
                        key={post.id}
                        post={post}
                        onClick={() => openCommentModal(post)}
                      />
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {/* Infinite Scroll Anchor */}
          <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
            {(isFetchingNextExplore || isFetchingNextPosts) && (
              <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            )}
          </div>
        </div>
      )}

      {/* Global Post Comment Modal */}
      <CommentModal />
    </div>
  );
}
