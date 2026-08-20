import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  Heart,
  Repeat,
  Share,
  Bookmark,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useUIStore } from '@/shared/model/useUIStore';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import Avatar from '@/shared/ui/Avatar';
import { CommentThread } from '@/entities/comment/ui/CommentThread';
import { CommentComposer } from './CommentComposer';
import { ReportPostModal } from '@/features/posts/ui/ReportPostModal';
import { DeletePostConfirmModal } from '@/features/posts/ui/DeletePostConfirmModal';
import { EditPostModal } from '@/features/posts/ui/EditPostModal';
import { PostMenu } from '@/features/posts/ui/PostMenu';
import { FollowButton } from '@/features/follow/ui/FollowButton';
import { PollDisplay } from '@/features/posts/ui/PollDisplay';
import { LinkPreviewCard } from '@/shared/ui/LinkPreviewCard';
import { extractFirstUrl } from '@/shared/lib/urlUtils';
import { VideoPlayer } from '@/entities/post/ui/VideoPlayer';
import { commentsApi, CommentListPage } from '../api/commentsApi';
import { FormattedText } from '@/shared/ui/FormattedText';
import { UserNameWithBadges } from '@/entities/profile/ui/UserNameWithBadges';
import { MiniProfileHoverCard } from '@/entities/profile/ui/MiniProfileHoverCard';
import { formatRelativeTime } from '@/shared/lib/formatRelativeTime';
import { useLikeMutation } from '@/features/posts/model/useLikeMutation';
import { useRepostMutation } from '@/features/posts/model/useRepostMutation';
import { useSavePostMutation } from '@/features/posts/model/useSavePostMutation';
import { usePinPostMutation } from '@/features/posts/model/usePinPostMutation';
import { useDeletePostMutation } from '@/features/posts/model/useDeletePostMutation';
import { useEditPostMutation } from '@/features/posts/model/useEditPostMutation';
import {
  COMMENTS_KEY,
  COMMENT_REPLIES_KEY,
  FEED_KEY,
  USER_POSTS_KEY,
  SAVED_POSTS_KEY,
} from '@/shared/api/queryKeys';
import type { FeedPage } from '@/entities/post/api/postsApi';
import type { CommentType } from '@/entities/comment/model/types';
import type { PostMedia as PostMediaType } from '@/entities/post/model/types';

const QUICK_EMOJIS = ['🔥', '❤️', '👏', '😂', '😍', '✨', '🚀', '💯'];

export function CommentModal() {
  const { isCommentModalOpen, activePostForComments, closeCommentModal, openShareModal } =
    useUIStore();
  const currentUserId = useAuthStore((s) => s.userId);
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [isLikePopping, setIsLikePopping] = useState(false);
  const [isRepostSpinning, setIsRepostSpinning] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [reportingComment, setReportingComment] = useState<CommentType | null>(null);

  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    username: string;
    displayName?: string;
    userId?: string;
  } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);

  const postId = activePostForComments?.id ? String(activePostForComments.id) : '';

  // Post Actions Mutations
  const likeMutation = useLikeMutation(postId, !!activePostForComments?.isLiked, [FEED_KEY]);
  const repostMutation = useRepostMutation(postId, !!activePostForComments?.isReposted, [FEED_KEY]);
  const saveMutation = useSavePostMutation(postId, !!activePostForComments?.isSaved, [FEED_KEY]);
  const pinMutation = usePinPostMutation(postId, !!activePostForComments?.isPinned, [FEED_KEY]);
  const deleteMutation = useDeletePostMutation(postId, [FEED_KEY]);
  const editMutation = useEditPostMutation(postId, [FEED_KEY]);

  // Infinite Scroll for Root Comments (20 items per page)
  const { data, isLoading, isError, refetch, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery<CommentListPage>({
      queryKey: [COMMENTS_KEY, postId],
      queryFn: ({ pageParam }) =>
        commentsApi.getComments(postId, pageParam as string | undefined, 20),
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined,
      enabled: isCommentModalOpen && !!postId,
    });

  const rootComments = data?.pages.flatMap((p) => p.comments) ?? [];

  // Helper to increment post commentsCount across feed caches
  const incrementPostCommentsCount = (delta: number) => {
    const updateFeed = (old: InfiniteData<FeedPage> | undefined) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          posts: page.posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments: Math.max(0, (p.comments ?? 0) + delta),
                  commentsCount: Math.max(0, (p.commentsCount ?? 0) + delta),
                }
              : p,
          ),
        })),
      };
    };

    queryClient.setQueriesData<InfiniteData<FeedPage>>({ queryKey: [FEED_KEY] }, updateFeed);
    queryClient.setQueriesData<InfiniteData<FeedPage>>({ queryKey: [USER_POSTS_KEY] }, updateFeed);
    queryClient.setQueriesData<InfiniteData<FeedPage>>({ queryKey: [SAVED_POSTS_KEY] }, updateFeed);

    if (activePostForComments) {
      useUIStore.setState({
        activePostForComments: {
          ...activePostForComments,
          comments: Math.max(0, (activePostForComments.comments ?? 0) + delta),
          commentsCount: Math.max(0, (activePostForComments.commentsCount ?? 0) + delta),
        },
      });
    }
  };

  // Add Comment Mutation with Idempotency Key & Safe Error Handling
  const addCommentMutation = useMutation({
    mutationFn: async ({
      text,
      mediaUrl,
      parentId,
      replyToUserId,
      clientMutationId,
    }: {
      text: string;
      mediaUrl?: string;
      parentId?: string;
      replyToUserId?: string;
      clientMutationId?: string;
    }) => {
      return commentsApi.addComment(
        postId,
        text,
        parentId,
        mediaUrl,
        replyToUserId ?? replyingTo?.userId,
        clientMutationId,
      );
    },
    onSuccess: (newComment, variables) => {
      if (variables.parentId) {
        // Appending reply: find root thread and update replies cache
        const rootId = newComment.rootParentId || variables.parentId;
        queryClient.setQueryData<InfiniteData<CommentListPage>>(
          [COMMENT_REPLIES_KEY, rootId],
          (old) => {
            if (!old) {
              return {
                pages: [{ comments: [newComment], nextCursor: null }],
                pageParams: [undefined],
              };
            }
            return {
              ...old,
              pages: old.pages.map((page, idx) =>
                idx === 0 ? { ...page, comments: [...page.comments, newComment] } : page,
              ),
            };
          },
        );

        // Increment parent comment replyCount in root comments query
        queryClient.setQueryData<InfiniteData<CommentListPage>>([COMMENTS_KEY, postId], (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              comments: page.comments.map((c) =>
                c.id === rootId ? { ...c, replyCount: (c.replyCount ?? 0) + 1 } : c,
              ),
            })),
          };
        });
      } else {
        // Appending root comment
        queryClient.setQueryData<InfiniteData<CommentListPage>>([COMMENTS_KEY, postId], (old) => {
          if (!old) {
            return {
              pages: [{ comments: [newComment], nextCursor: null }],
              pageParams: [undefined],
            };
          }
          return {
            ...old,
            pages: old.pages.map((page, idx) =>
              idx === 0 ? { ...page, comments: [newComment, ...page.comments] } : page,
            ),
          };
        });
      }

      incrementPostCommentsCount(1);
      setReplyingTo(null);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to add comment. Please try again.';
      useMessageToastStore.getState().addToast({
        id: `err-${Date.now()}`,
        conversationId: '',
        messageId: '',
        title: 'Comment Error',
        body: typeof message === 'string' ? message : 'Failed to post comment',
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [COMMENTS_KEY, postId] });
    },
  });

  // Toggle Like Comment Mutation
  const toggleLikeMutation = useMutation({
    mutationFn: (commentId: string) => commentsApi.toggleLike(commentId),
    onMutate: (commentId: string) => {
      queryClient.setQueryData<InfiniteData<CommentListPage>>([COMMENTS_KEY, postId], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            comments: page.comments.map((c) => {
              if (c.id !== commentId) return c;
              const nextLiked = !c.isLiked;
              return {
                ...c,
                isLiked: nextLiked,
                likesCount: Math.max(0, (c.likesCount ?? 0) + (nextLiked ? 1 : -1)),
              };
            }),
          })),
        };
      });

      queryClient.setQueriesData<InfiniteData<CommentListPage>>(
        { queryKey: [COMMENT_REPLIES_KEY] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              comments: page.comments.map((c) => {
                if (c.id !== commentId) return c;
                const nextLiked = !c.isLiked;
                return {
                  ...c,
                  isLiked: nextLiked,
                  likesCount: Math.max(0, (c.likesCount ?? 0) + (nextLiked ? 1 : -1)),
                };
              }),
            })),
          };
        },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [COMMENTS_KEY, postId] });
      queryClient.invalidateQueries({ queryKey: [COMMENT_REPLIES_KEY] });
    },
  });

  // Toggle Pin Mutation
  const togglePinMutation = useMutation({
    mutationFn: (commentId: string) => commentsApi.togglePin(commentId),
    onSuccess: (pinData, commentId) => {
      queryClient.setQueryData<InfiniteData<CommentListPage>>([COMMENTS_KEY, postId], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            comments: page.comments
              .map((c) => ({
                ...c,
                isPinned: c.id === commentId ? pinData.isPinned : false,
              }))
              .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)),
          })),
        };
      });
    },
  });

  // Delete Comment Mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => commentsApi.deleteComment(commentId),
    onSuccess: (_, commentId) => {
      queryClient.setQueryData<InfiniteData<CommentListPage>>([COMMENTS_KEY, postId], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            comments: page.comments.map((c) =>
              c.id === commentId
                ? { ...c, isDeleted: true, text: '[Comment deleted]', mediaUrl: null }
                : c,
            ),
          })),
        };
      });

      queryClient.setQueriesData<InfiniteData<CommentListPage>>(
        { queryKey: [COMMENT_REPLIES_KEY] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              comments: page.comments.map((c) =>
                c.id === commentId
                  ? { ...c, isDeleted: true, text: '[Comment deleted]', mediaUrl: null }
                  : c,
              ),
            })),
          };
        },
      );

      incrementPostCommentsCount(-1);
    },
  });

  if (!isCommentModalOpen || !activePostForComments) return null;

  const isOwner = Boolean(
    activePostForComments.isOwner ||
    (currentUserId && activePostForComments.authorId === currentUserId) ||
    (currentUser?.id && activePostForComments.authorId === currentUser.id) ||
    (currentUser?.username &&
      activePostForComments.handle?.toLowerCase() === currentUser.username.toLowerCase()),
  );

  const media: PostMediaType[] =
    activePostForComments.media ??
    (activePostForComments.image ? [{ type: 'image', url: activePostForComments.image }] : []);

  const firstUrl =
    media.length === 0 && !activePostForComments.poll
      ? extractFirstUrl(activePostForComments.text)
      : null;

  const handleLikePost = () => {
    setIsLikePopping(true);
    setTimeout(() => setIsLikePopping(false), 400);
    likeMutation.mutate();
    if (activePostForComments) {
      const nextLiked = !activePostForComments.isLiked;
      useUIStore.setState({
        activePostForComments: {
          ...activePostForComments,
          isLiked: nextLiked,
          likes: Math.max(0, (activePostForComments.likes ?? 0) + (nextLiked ? 1 : -1)),
        },
      });
    }
  };

  const handleRepostPost = () => {
    setIsRepostSpinning(true);
    setTimeout(() => setIsRepostSpinning(false), 400);
    repostMutation.mutate();
    if (activePostForComments) {
      const nextReposted = !activePostForComments.isReposted;
      useUIStore.setState({
        activePostForComments: {
          ...activePostForComments,
          isReposted: nextReposted,
          reposts: Math.max(0, (activePostForComments.reposts ?? 0) + (nextReposted ? 1 : -1)),
        },
      });
    }
  };

  const handleSavePost = () => {
    saveMutation.mutate();
    if (activePostForComments) {
      const nextSaved = !activePostForComments.isSaved;
      useUIStore.setState({
        activePostForComments: {
          ...activePostForComments,
          isSaved: nextSaved,
        },
      });
    }
  };

  const handlePostMediaDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (!activePostForComments.isLiked) {
        handleLikePost();
      }
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 800);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-3 md:p-6 animate-fadeIn"
      onClick={closeCommentModal}
    >
      {/* Floating Top-Right Close Button for Desktop */}
      <button
        onClick={closeCommentModal}
        className="fixed top-4 right-4 text-gray-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-50 cursor-pointer hidden md:flex items-center justify-center shadow-lg"
        title="Close (Esc)"
      >
        <X size={24} />
      </button>

      {/* Instagram-Style Liquid Glass Modal Container */}
      <div
        className="w-full max-w-[1240px] h-[92vh] max-h-[920px] min-h-[560px] flex flex-col md:flex-row bg-[#0a0b12]/95 backdrop-blur-3xl border-t md:border border-white/[0.12] rounded-t-3xl md:rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(147,51,234,0.12)] overflow-hidden animate-slideUp relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag / Pull Handle */}
        <div className="md:hidden pt-3 pb-1 flex justify-center shrink-0 bg-[#0a0b12]">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* ========================================================= */}
        {/* LEFT COLUMN: POST SHOWCASE (MEDIA / CAROUSEL / TEXT HERO) */}
        {/* ========================================================= */}
        <div
          className="w-full md:w-[56%] lg:w-[58%] h-[280px] sm:h-[360px] md:h-full flex flex-col bg-black md:bg-[#06070a] border-b md:border-b-0 md:border-r border-white/[0.08] relative overflow-hidden shrink-0 select-none group"
          onClick={handlePostMediaDoubleTap}
        >
          {/* Double-tap heart burst animation */}
          {showHeartBurst && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-popIn">
              <Heart
                size={88}
                className="fill-[#ec4899] text-[#ec4899] drop-shadow-[0_0_30px_rgba(236,72,153,0.9)]"
              />
            </div>
          )}

          {media.length > 0 ? (
            /* Media Carousel or Single Media */
            <div className="relative w-full h-full flex items-center justify-center bg-black/90">
              {media.map((item, i) => (
                <div
                  key={i}
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                    i === carouselIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  {item.type === 'video' || item.type === 'VIDEO' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoPlayer
                        src={item.url}
                        poster={item.poster ?? undefined}
                        active={i === carouselIndex}
                      />
                    </div>
                  ) : (
                    <img
                      src={item.url}
                      alt="Post visual"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              ))}

              {/* Carousel Navigation Arrows */}
              {media.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCarouselIndex((prev) => (prev - 1 + media.length) % media.length);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition-all cursor-pointer shadow-lg"
                    title="Previous"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCarouselIndex((prev) => (prev + 1) % media.length);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition-all cursor-pointer shadow-lg"
                    title="Next"
                  >
                    <ChevronRight size={20} />
                  </button>
                  {/* Carousel Dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                    {media.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCarouselIndex(i);
                        }}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          i === carouselIndex ? 'bg-white w-5' : 'bg-white/40 w-1.5'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Text-Only Post / Poll Showcase */
            <div className="relative w-full h-full flex flex-col justify-center items-center p-6 sm:p-10 bg-gradient-to-br from-[#121324] via-[#090a12] to-[#18112a] text-center overflow-y-auto">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(147,51,234,0.25),rgba(255,255,255,0))]" />

              <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center gap-4">
                <MiniProfileHoverCard username={activePostForComments.handle}>
                  <Link
                    to={`/profile/${activePostForComments.handle}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Avatar size="lg" src={activePostForComments.avatar} />
                  </Link>
                </MiniProfileHoverCard>

                <div className="flex items-center gap-1.5">
                  <UserNameWithBadges
                    displayName={activePostForComments.author}
                    username={activePostForComments.handle}
                    isVerified={activePostForComments.isVerified}
                    primaryBadge={activePostForComments.primaryBadge}
                    size="md"
                  />
                </div>

                <div className="text-gray-100 text-base sm:text-lg font-normal leading-relaxed break-words [overflow-wrap:anywhere] max-h-64 overflow-y-auto px-2">
                  <FormattedText text={activePostForComments.text} />
                </div>

                {firstUrl && (
                  <div className="w-full max-w-md mt-2">
                    <LinkPreviewCard url={firstUrl} />
                  </div>
                )}

                {activePostForComments.poll && (
                  <div className="w-full max-w-md mt-2 text-left">
                    <PollDisplay
                      postId={activePostForComments.id}
                      poll={activePostForComments.poll}
                      isOwner={isOwner}
                      queryKey={[FEED_KEY]}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* RIGHT COLUMN: AUTHOR HEADER, COMMENTS STREAM, ACTIONS & COMPOSER */}
        {/* =================================================================== */}
        <div className="w-full md:w-[44%] lg:w-[42%] flex flex-col flex-1 h-full bg-[#0b0c14]/90 backdrop-blur-2xl relative min-w-0 overflow-hidden">
          {/* Top Author Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02] backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <MiniProfileHoverCard username={activePostForComments.handle}>
                <Link to={`/profile/${activePostForComments.handle}`}>
                  <Avatar size="sm" src={activePostForComments.avatar} />
                </Link>
              </MiniProfileHoverCard>

              <div className="flex items-center gap-2 min-w-0">
                <MiniProfileHoverCard username={activePostForComments.handle}>
                  <Link
                    to={`/profile/${activePostForComments.handle}`}
                    className="hover:underline inline-flex items-center min-w-0"
                  >
                    <UserNameWithBadges
                      displayName={activePostForComments.author}
                      username={activePostForComments.handle}
                      isVerified={activePostForComments.isVerified}
                      primaryBadge={activePostForComments.primaryBadge}
                      size="sm"
                    />
                  </Link>
                </MiniProfileHoverCard>

                {!isOwner && (
                  <>
                    <span className="text-gray-500 text-xs select-none">•</span>
                    <FollowButton
                      authorId={activePostForComments.authorId}
                      isFollowing={!!activePostForComments.isFollowing}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <PostMenu
                postId={activePostForComments.id}
                isOwner={isOwner}
                isSaved={!!activePostForComments.isSaved}
                isPinned={!!activePostForComments.isPinned}
                hideLikesCount={Boolean(activePostForComments.hideLikesCount)}
                isCommentsDisabled={Boolean(activePostForComments.isCommentsDisabled)}
                onSave={handleSavePost}
                onTogglePin={() => pinMutation.mutate()}
                onReport={() => setIsReportOpen(true)}
                onDelete={() => setIsDeleteOpen(true)}
                onEdit={() => setIsEditOpen(true)}
              />

              <button
                onClick={closeCommentModal}
                className="text-gray-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer md:hidden"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Middle Scrollable Area: Post Caption & Comments Stream */}
          <div
            ref={scrollContainerRef}
            onScroll={(e) => {
              const target = e.currentTarget;
              if (
                target.scrollHeight - target.scrollTop - target.clientHeight < 200 &&
                hasNextPage &&
                !isFetchingNextPage
              ) {
                fetchNextPage();
              }
            }}
            className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            {/* Original Post Caption */}
            <div className="flex gap-3 items-start pb-3.5 border-b border-white/[0.06]">
              <MiniProfileHoverCard username={activePostForComments.handle}>
                <Link to={`/profile/${activePostForComments.handle}`} className="shrink-0 pt-0.5">
                  <Avatar size="sm" src={activePostForComments.avatar} />
                </Link>
              </MiniProfileHoverCard>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <MiniProfileHoverCard username={activePostForComments.handle}>
                    <Link
                      to={`/profile/${activePostForComments.handle}`}
                      className="hover:underline inline-flex items-center"
                    >
                      <UserNameWithBadges
                        displayName={activePostForComments.author}
                        username={activePostForComments.handle}
                        isVerified={activePostForComments.isVerified}
                        primaryBadge={activePostForComments.primaryBadge}
                        size="sm"
                      />
                    </Link>
                  </MiniProfileHoverCard>
                  <span className="text-[11px] text-gray-500 font-normal">
                    @{activePostForComments.handle} •{' '}
                    {formatRelativeTime(activePostForComments.createdAt)}
                  </span>
                </div>
                <div className="text-gray-200 text-sm mt-1 leading-relaxed break-words [overflow-wrap:anywhere]">
                  <FormattedText text={activePostForComments.text} />
                </div>
              </div>
            </div>

            {/* Comments Stream */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-500">
                  <div className="w-6 h-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                  <span className="text-xs">Loading comments...</span>
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl bg-red-500/[0.04] border border-red-500/20">
                  <p className="text-red-400 text-xs font-semibold">Failed to load comments</p>
                  <p className="text-gray-500 text-[11px] mt-1">
                    Please check your connection and try again.
                  </p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-3 px-3 py-1 text-xs font-medium text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl border border-purple-500/30 transition-colors cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : rootComments.length > 0 ? (
                <>
                  {rootComments.map((comment) => (
                    <CommentThread
                      key={comment.id}
                      comment={comment}
                      postAuthorId={activePostForComments.authorId}
                      currentUserId={currentUser?.id}
                      onReply={(target) =>
                        setReplyingTo({
                          commentId: target.id,
                          username: target.handle,
                          displayName: target.author,
                          userId: target.userId,
                        })
                      }
                      onDelete={(cId) => deleteCommentMutation.mutate(cId)}
                      onPin={(cId) => togglePinMutation.mutate(cId)}
                      onLike={(cId) => toggleLikeMutation.mutate(cId)}
                      onReport={(c) => setReportingComment(c)}
                    />
                  ))}

                  {/* Infinite Scroll Indicator */}
                  {isFetchingNextPage && (
                    <div className="flex justify-center py-3">
                      <div className="w-5 h-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                    </div>
                  )}
                </>
              ) : (
                /* Zero State with Quick Emoji Reaction Chips */
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl bg-white/[0.01] border border-white/[0.04]">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                    <Sparkles size={22} />
                  </div>
                  <h4 className="text-white font-bold text-sm">No comments yet</h4>
                  <p className="text-gray-500 text-xs mt-1 max-w-xs">
                    Start the conversation by sharing your thoughts or dropping a reaction!
                  </p>

                  <div className="flex items-center justify-center gap-1.5 flex-wrap mt-4 max-w-sm">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() =>
                          addCommentMutation.mutate({
                            text: emoji,
                          })
                        }
                        className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] hover:border-purple-500/30 text-base transition-all transform active:scale-95 cursor-pointer shadow-sm"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Post Actions & Likes Summary Section (Comment icon removed, +1 counts functional) */}
          <div className="px-4 py-2.5 border-t border-white/[0.08] bg-white/[0.01] backdrop-blur-md shrink-0 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Like Button */}
                <button
                  type="button"
                  onClick={handleLikePost}
                  className={`p-1 -ml-1 cursor-pointer transition-transform duration-200 active:scale-125 ${
                    activePostForComments.isLiked
                      ? 'text-[#ec4899]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title={activePostForComments.isLiked ? 'Unlike' : 'Like'}
                >
                  <Heart
                    size={22}
                    fill={activePostForComments.isLiked ? 'currentColor' : 'none'}
                    className={`transition-transform duration-200 ${
                      isLikePopping ? 'scale-125 animate-pulse' : ''
                    }`}
                  />
                </button>

                {/* Repost Button */}
                <button
                  type="button"
                  onClick={handleRepostPost}
                  className={`p-1 cursor-pointer transition-colors duration-200 ${
                    activePostForComments.isReposted
                      ? 'text-green-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title={activePostForComments.isReposted ? 'Undo Repost' : 'Repost'}
                >
                  <Repeat
                    size={22}
                    className={`transition-all duration-300 ${
                      isRepostSpinning ? 'rotate-180 scale-125 text-green-400' : ''
                    }`}
                  />
                </button>

                {/* Share Button */}
                <button
                  type="button"
                  onClick={() => openShareModal(activePostForComments)}
                  className="p-1 text-gray-400 hover:text-white cursor-pointer transition-transform duration-200 active:scale-125"
                  title="Share"
                >
                  <Share size={22} />
                </button>
              </div>

              {/* Bookmark / Save Button */}
              <button
                type="button"
                onClick={handleSavePost}
                className="p-1 text-gray-400 hover:text-white cursor-pointer transition-transform duration-200 active:scale-125"
                title={activePostForComments.isSaved ? 'Unsave' : 'Save'}
              >
                <Bookmark
                  size={22}
                  className={activePostForComments.isSaved ? 'fill-white text-white' : ''}
                />
              </button>
            </div>

            {/* Likes Summary & Date Display */}
            <div className="flex flex-col text-xs">
              {!activePostForComments.hideLikesCount && (
                <span className="font-semibold text-white">
                  {(activePostForComments.likes ?? 0).toLocaleString()}{' '}
                  {(activePostForComments.likes ?? 0) === 1 ? 'like' : 'likes'}
                </span>
              )}
              <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">
                {formatRelativeTime(activePostForComments.createdAt)}
              </span>
            </div>
          </div>

          {/* Sticky Bottom Comment Composer */}
          {activePostForComments.isCommentsDisabled ? (
            <div className="p-4 bg-white/[0.02] border-t border-white/[0.06] text-center text-xs font-medium text-gray-500 select-none">
              Comments are disabled for this post
            </div>
          ) : (
            <CommentComposer
              currentUserHandle={currentUser?.username ?? 'user'}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              onSubmit={async (text, mediaUrl, parentId, clientMutationId) => {
                await addCommentMutation.mutateAsync({
                  text,
                  mediaUrl,
                  parentId,
                  replyToUserId: replyingTo?.userId,
                  clientMutationId,
                });
              }}
              isSubmitting={addCommentMutation.isPending}
            />
          )}
        </div>
      </div>

      {/* Auxiliary Modals */}
      {reportingComment && (
        <ReportPostModal
          postId={reportingComment.id}
          isOpen={!!reportingComment}
          onClose={() => setReportingComment(null)}
        />
      )}

      {isReportOpen && (
        <ReportPostModal
          postId={activePostForComments.id}
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
        />
      )}

      {isDeleteOpen && (
        <DeletePostConfirmModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={() => {
            deleteMutation.mutate();
            setIsDeleteOpen(false);
            closeCommentModal();
          }}
        />
      )}

      {isEditOpen && (
        <EditPostModal
          post={activePostForComments}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSave={(newText) => {
            editMutation.mutate(newText);
            setIsEditOpen(false);
          }}
        />
      )}
    </div>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
}
