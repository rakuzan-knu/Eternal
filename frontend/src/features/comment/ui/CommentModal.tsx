import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageSquare, Sparkles } from 'lucide-react';
import { useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useUIStore } from '../../../shared/model/useUIStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import Avatar from '../../../shared/ui/Avatar';
import { CommentThread } from '../../../entities/comment/ui/CommentThread';
import { CommentComposer } from './CommentComposer';
import { ReportPostModal } from '@/features/posts/ui/ReportPostModal';
import { commentsApi, CommentListPage } from '../api/commentsApi';
import { FormattedText } from '@/shared/ui/FormattedText';
import { UserNameWithBadges } from '@/entities/profile/ui/UserNameWithBadges';
import { PostMedia } from '@/entities/post/ui/PostMedia';
import { MiniProfileHoverCard } from '@/entities/profile/ui/MiniProfileHoverCard';
import {
  COMMENTS_KEY,
  COMMENT_REPLIES_KEY,
  FEED_KEY,
  USER_POSTS_KEY,
  SAVED_POSTS_KEY,
} from '@/shared/api/queryKeys';
import type { PostType } from '@/entities/post/model/types';
import type { FeedPage } from '@/entities/post/api/postsApi';
import type { CommentType } from '@/entities/comment/model/types';

const QUICK_EMOJIS = ['🔥', '❤️', '👏', '😂', '😍', '✨', '🚀', '💯'];

export function CommentModal() {
  const { isCommentModalOpen, activePostForComments, closeCommentModal } = useUIStore();
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    username: string;
    displayName?: string;
  } | null>(null);

  const [reportingComment, setReportingComment] = useState<CommentType | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const postId = activePostForComments?.id ? String(activePostForComments.id) : '';

  // Infinite Scroll for Root Comments (20 items per page)
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
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
  };

  // Add Comment Mutation with Idempotency Key & Anti-Spam Error Handling
  const addCommentMutation = useMutation({
    mutationFn: async ({
      text,
      mediaUrl,
      parentId,
      clientMutationId,
    }: {
      text: string;
      mediaUrl?: string;
      parentId?: string;
      clientMutationId?: string;
    }) => {
      return commentsApi.addComment(
        postId,
        text,
        parentId,
        mediaUrl,
        replyingTo?.username,
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
  });

  // Toggle Like Mutation
  const toggleLikeMutation = useMutation({
    mutationFn: (commentId: string) => commentsApi.toggleLike(commentId),
    onMutate: (commentId: string) => {
      // Optimistically update in root comments cache
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

      // Optimistically update across all thread reply caches
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

  const media: import('@/entities/post/model/types').PostMedia[] =
    activePostForComments.media ??
    (activePostForComments.image ? [{ type: 'image', url: activePostForComments.image }] : []);

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md md:p-4 animate-fadeIn"
      onClick={closeCommentModal}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] md:h-[85vh] flex flex-col bg-[#090a10]/95 backdrop-blur-2xl border-t md:border border-white/[0.12] rounded-t-3xl md:rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="md:hidden pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Sticky Glass Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-white/[0.02] backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare size={17} className="text-purple-400" />
            <h3 className="text-white font-bold text-sm sm:text-base">Comments</h3>
          </div>
          <button
            onClick={closeCommentModal}
            className="text-gray-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Comments & Post Summary Area */}
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
          className="flex-1 overflow-y-auto px-4 py-3 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {/* Post Header Card */}
          <div className="flex gap-3 items-start p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] shadow-sm">
            <MiniProfileHoverCard username={activePostForComments.handle}>
              <Link to={`/profile/${activePostForComments.handle}`}>
                <Avatar src={activePostForComments.avatar} size="sm" />
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
                <span className="text-xs text-gray-500 font-normal">
                  @{activePostForComments.handle}
                </span>
              </div>
              <div className="text-gray-200 text-sm mt-1.5 leading-relaxed break-words [overflow-wrap:anywhere]">
                <FormattedText text={activePostForComments.text} />
              </div>
              {media.length > 0 && (
                <div className="mt-3 max-w-sm rounded-xl overflow-hidden">
                  <PostMedia media={media} />
                </div>
              )}
            </div>
          </div>

          {/* Root Comments List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-500">
                <div className="w-6 h-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                <span className="text-xs">Loading comments...</span>
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
                      })
                    }
                    onDelete={(cId) => deleteCommentMutation.mutate(cId)}
                    onPin={(cId) => togglePinMutation.mutate(cId)}
                    onLike={(cId) => toggleLikeMutation.mutate(cId)}
                    onReport={(c) => setReportingComment(c)}
                  />
                ))}

                {/* Infinite Scroll Next Page Loading Indicator */}
                {isFetchingNextPage && (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                  </div>
                )}
              </>
            ) : (
              /* Zero-State with Quick Emoji Chips */
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl bg-white/[0.01] border border-white/[0.04]">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                  <Sparkles size={22} />
                </div>
                <h4 className="text-white font-bold text-sm">No comments yet</h4>
                <p className="text-gray-500 text-xs mt-1 max-w-xs">
                  Be the first to share your thoughts on this post!
                </p>

                {/* Quick Emoji Chips */}
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

        {/* Comment Composer */}
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
              await addCommentMutation.mutateAsync({ text, mediaUrl, parentId, clientMutationId });
            }}
            isSubmitting={addCommentMutation.isPending}
          />
        )}
      </div>

      {/* Report Modal */}
      {reportingComment && (
        <ReportPostModal
          postId={reportingComment.id}
          isOpen={!!reportingComment}
          onClose={() => setReportingComment(null)}
        />
      )}
    </div>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
}
