import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Repeat, Heart, Share, Bookmark, ChevronDown, Pin } from 'lucide-react';

import Avatar from '@/shared/ui/Avatar';
import { ExpandableText } from '@/shared/ui/ExpandableText';
import { PostMenu } from '@/features/posts/ui/PostMenu';
import { FollowButton } from '@/features/follow/ui/FollowButton';
import { PollDisplay } from '@/features/posts/ui/PollDisplay';
import { PostMedia } from '@/entities/post/ui/PostMedia';
import { PollVotersModal } from '@/entities/post/ui/PollVotersModal';
import { SaveToCollectionPopover } from '@/features/posts/ui/SaveToCollectionPopover';
import { LinkPreviewCard } from '@/shared/ui/LinkPreviewCard';
import { extractFirstUrl } from '@/shared/lib/urlUtils';

import type { PostMedia as PostMediaType } from '@/entities/post/model/types';
import { useUIStore, PostType } from '@/shared/model/useUIStore';
import { useLikeMutation } from '@/features/posts/model/useLikeMutation';
import { useRepostMutation } from '@/features/posts/model/useRepostMutation';
import { useSavePostMutation } from '@/features/posts/model/useSavePostMutation';
import { useEditPostMutation } from '@/features/posts/model/useEditPostMutation';
import { useDeletePostMutation } from '@/features/posts/model/useDeletePostMutation';
import { usePinPostMutation } from '@/features/posts/model/usePinPostMutation';
import { useBlockUser } from '@/features/chat/model/useConversationMutations';
import { useHiddenPostsStore } from '@/shared/model/useHiddenPostsStore';
import { useHiddenUndoStore } from '@/features/posts/model/useHiddenUndoStore';
import { ReportPostModal } from '@/features/posts/ui/ReportPostModal';
import { DeletePostConfirmModal } from '@/features/posts/ui/DeletePostConfirmModal';
import { EditPostModal } from '@/features/posts/ui/EditPostModal';
import { formatRelativeTime } from '@/shared/lib/formatRelativeTime';
import { UserNameWithBadges } from '@/entities/profile/ui/UserNameWithBadges';
import { MiniProfileHoverCard } from '@/entities/profile/ui/MiniProfileHoverCard';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';

interface PostCardProps {
  post: PostType;
  queryKey: unknown[];
}

export function PostCard({ post, queryKey }: PostCardProps) {
  const [showVoters, setShowVoters] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isLikePopping, setIsLikePopping] = useState(false);
  const [isRepostSpinning, setIsRepostSpinning] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [hideLikesCount, setHideLikesCount] = useState(Boolean(post.hideLikesCount));
  const [isCommentsDisabled, setIsCommentsDisabled] = useState(Boolean(post.isCommentsDisabled));
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const currentUserId = useAuthStore((s) => s.userId);
  const { data: currentUser } = useCurrentUser();
  const hiddenIds = useHiddenPostsStore((s) => s.hiddenIds);
  const hidePost = useHiddenPostsStore((s) => s.hidePost);
  const showUndo = useHiddenUndoStore((s) => s.showUndo);

  const isOwner = Boolean(
    post.isOwner ||
    (currentUserId && post.authorId === currentUserId) ||
    (currentUser?.id && post.authorId === currentUser.id) ||
    (currentUser?.username && post.handle?.toLowerCase() === currentUser.username.toLowerCase()),
  );

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const openCommentModal = useUIStore((state) => state.openCommentModal);
  const openShareModal = useUIStore((state) => state.openShareModal);
  const likeMutation = useLikeMutation(post.id, !!post.isLiked, queryKey);
  const repostMutation = useRepostMutation(post.id, !!post.isReposted, queryKey);
  const saveMutation = useSavePostMutation(post.id, !!post.isSaved, queryKey);
  const editMutation = useEditPostMutation(post.id, queryKey);
  const deleteMutation = useDeletePostMutation(post.id, queryKey);
  const pinMutation = usePinPostMutation(post.id, !!post.isPinned, queryKey);
  const blockUserMutation = useBlockUser();

  const isHidden = hiddenIds.has(post.id);
  if (isHidden && !isCollapsing) {
    return null;
  }

  const media: PostMediaType[] =
    post.media ?? (post.image ? [{ type: 'image', url: post.image }] : []);
  const firstUrl = media.length === 0 && !post.poll ? extractFirstUrl(post.text) : null;

  const handleLike = () => {
    setIsLikePopping(true);
    setTimeout(() => setIsLikePopping(false), 400);
    likeMutation.mutate();
  };

  const handleRepost = () => {
    setIsRepostSpinning(true);
    setTimeout(() => setIsRepostSpinning(false), 400);
    repostMutation.mutate();
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    saveMutation.mutate();
  };

  const handleHidePost = () => {
    setIsCollapsing(true);
    showUndo(post.id);
    setTimeout(() => {
      hidePost(post.id);
      setIsCollapsing(false);
    }, 300);
  };

  const handleTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      setIsPopoverOpen(true);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  return (
    <div
      id={`post-${post.id}`}
      className={`bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-3xl shadow-lg flex flex-col gap-3 transition-all duration-300 ease-out scroll-mt-20 relative overflow-hidden ${
        isCollapsing
          ? 'max-h-0 opacity-0 py-0 -my-2 border-0 pointer-events-none scale-95'
          : 'max-h-[3000px] opacity-100 p-5 hover:bg-white/[0.03]'
      } ${isMenuOpen ? 'z-30' : 'z-10'}`}
    >
      {post.isPinned && (
        <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold mb-0.5 animate-fadeIn">
          <Pin
            size={13}
            className="text-purple-400 fill-purple-400/20 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]"
          />
          <span>Pinned post</span>
        </div>
      )}

      {post.type === 'repost' && (
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium pl-10">
          <Repeat size={12} /> {post.repostedBy}
        </div>
      )}

      <div className="flex gap-4 items-start">
        <MiniProfileHoverCard username={post.handle}>
          <Link to={`/profile/${post.handle}`}>
            <Avatar size="md" src={post.avatar} />
          </Link>
        </MiniProfileHoverCard>
        <div className="flex flex-col flex-1 gap-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MiniProfileHoverCard username={post.handle}>
                <Link to={`/profile/${post.handle}`} className="hover:underline inline-block">
                  <UserNameWithBadges
                    displayName={post.author}
                    username={post.handle}
                    isVerified={post.isVerified}
                    primaryBadge={post.primaryBadge}
                    size="sm"
                  />
                </Link>
              </MiniProfileHoverCard>
              <span className="text-xs text-gray-500 shrink-0 inline-flex items-center gap-1">
                <span>
                  @{post.handle} • {formatRelativeTime(post.createdAt)}
                </span>
                {post.editedAt && (
                  <span
                    className="text-gray-400 hover:text-gray-200 cursor-help relative group/edited"
                    title={`Edited on ${new Date(post.editedAt).toLocaleString()}`}
                  >
                    <span>(edited)</span>
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/edited:flex px-2.5 py-1 text-[11px] font-medium text-white bg-[#1c1c20]/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl whitespace-nowrap z-30">
                      Edited on{' '}
                      {new Date(post.editedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      at{' '}
                      {new Date(post.editedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                )}
              </span>
              {!isOwner && (
                <FollowButton authorId={post.authorId} isFollowing={!!post.isFollowing} />
              )}
            </div>
            <PostMenu
              postId={post.id}
              isOwner={isOwner}
              isSaved={!!post.isSaved}
              isPinned={!!post.isPinned}
              hideLikesCount={hideLikesCount}
              isCommentsDisabled={isCommentsDisabled}
              onSave={() => saveMutation.mutate()}
              onTogglePin={() => pinMutation.mutate()}
              onHide={handleHidePost}
              onBlockAuthor={() => {
                blockUserMutation.mutate(post.authorId, {
                  onSuccess: () => {
                    useMessageToastStore.getState().addToast({
                      id: `toast-${Date.now()}`,
                      conversationId: '',
                      messageId: '',
                      title: 'Author Blocked',
                      body: `@${post.handle} has been blocked.`,
                      avatar: null,
                      memberAvatars: [],
                      isGroup: false,
                    });
                  },
                });
              }}
              onReport={() => setIsReportOpen(true)}
              onDelete={() => setIsDeleteOpen(true)}
              onEdit={() => setIsEditOpen(true)}
              onToggleHideLikes={() => {
                setHideLikesCount((prev) => {
                  const next = !prev;
                  useMessageToastStore.getState().addToast({
                    id: `toast-${Date.now()}`,
                    conversationId: '',
                    messageId: '',
                    title: next ? 'Likes Hidden' : 'Likes Visible',
                    body: next
                      ? 'Like count is hidden for everyone.'
                      : 'Like count is now visible.',
                    avatar: null,
                    memberAvatars: [],
                    isGroup: false,
                  });
                  return next;
                });
              }}
              onToggleDisableComments={() => {
                setIsCommentsDisabled((prev) => {
                  const next = !prev;
                  useMessageToastStore.getState().addToast({
                    id: `toast-${Date.now()}`,
                    conversationId: '',
                    messageId: '',
                    title: next ? 'Commenting Disabled' : 'Commenting Enabled',
                    body: next ? 'Commenting is disabled for this post.' : 'Commenting is enabled.',
                    avatar: null,
                    memberAvatars: [],
                    isGroup: false,
                  });
                  return next;
                });
              }}
              onOpenChange={setIsMenuOpen}
            />
          </div>

          <ExpandableText text={post.text} />
          {firstUrl && <LinkPreviewCard url={firstUrl} />}
          <PostMedia media={media} />
          {post.poll && (
            <>
              <PollDisplay
                postId={post.id}
                poll={post.poll}
                isOwner={isOwner}
                queryKey={queryKey}
              />
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setShowVoters(true)}
                  className="text-xs text-gray-500 hover:text-gray-300 self-start cursor-pointer"
                >
                  Who voted
                </button>
              )}
              {showVoters && (
                <PollVotersModal
                  postId={post.id}
                  options={post.poll.options}
                  onClose={() => setShowVoters(false)}
                />
              )}
            </>
          )}

          <div className="flex justify-between items-center text-gray-500 text-xs mt-4">
            <div className="flex items-center gap-5 sm:gap-6">
              {/* Comment Button */}
              <button
                type="button"
                onClick={() =>
                  openCommentModal(
                    isCommentsDisabled ? { ...post, isCommentsDisabled: true } : post,
                  )
                }
                className="flex items-center gap-1.5 cursor-pointer hover:text-blue-400 transition-colors group"
              >
                <MessageSquare
                  size={16}
                  className="transition-transform duration-200 group-hover:scale-110"
                />{' '}
                {post.comments ?? 0}
              </button>

              {/* Repost Button with Scrolling/Spinning Arrows Animation */}
              <button
                type="button"
                onClick={handleRepost}
                className={`flex items-center gap-1.5 cursor-pointer hover:text-green-400 transition-colors group ${
                  post.isReposted ? 'text-green-400 font-semibold' : ''
                }`}
                title={post.isReposted ? 'Undo repost' : 'Repost'}
              >
                <Repeat
                  size={16}
                  className={`transition-all duration-300 ${
                    isRepostSpinning
                      ? 'rotate-180 scale-125 text-green-400'
                      : 'group-hover:scale-110'
                  }`}
                />
                <span>{post.reposts ?? 0}</span>
              </button>

              {/* Like Button with Pop-up Heart Animation */}
              <button
                type="button"
                onClick={handleLike}
                className={`flex items-center gap-1.5 cursor-pointer hover:text-pink-500 transition-colors group relative ${
                  post.isLiked ? 'text-pink-500' : ''
                }`}
                title={post.isLiked ? 'Unlike' : 'Like'}
              >
                <Heart
                  size={16}
                  fill={post.isLiked ? 'currentColor' : 'none'}
                  className={`transition-all duration-300 ${
                    isLikePopping
                      ? 'scale-150 text-pink-500 animate-pulse'
                      : 'group-hover:scale-110'
                  } ${post.isLiked ? 'scale-105' : ''}`}
                />
                {!hideLikesCount && <span>{post.likes ?? 0}</span>}
              </button>

              {/* Share Button with Shares Count */}
              <button
                type="button"
                onClick={() => openShareModal(post)}
                title="Share post"
                className="flex items-center gap-1.5 cursor-pointer hover:text-gray-300 transition-colors group"
              >
                <Share
                  size={16}
                  className="transition-transform duration-200 group-hover:scale-110"
                />
                <span>{post.sharesCount ?? 0}</span>
              </button>
            </div>

            {/* Bookmark Button + Quick Collection Popover */}
            <div className="relative flex items-center">
              <div
                className="flex items-center rounded-full hover:bg-white/10 transition-colors p-0.5"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseUp={handleTouchEnd}
              >
                <button
                  type="button"
                  onClick={handleSaveClick}
                  title={post.isSaved ? 'Remove from Saved' : 'Save post (Hold for collections)'}
                  className="p-1 cursor-pointer text-gray-500 hover:text-white transition-colors"
                >
                  <Bookmark
                    size={17}
                    className={`transition-all duration-200 active:scale-125 ${
                      post.isSaved ? 'fill-white text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPopoverOpen((v) => !v);
                  }}
                  title="Save to collection"
                  className="p-0.5 text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronDown size={12} />
                </button>
              </div>

              {/* Quick Collection Selection Popover */}
              <SaveToCollectionPopover
                postId={post.id}
                isOpen={isPopoverOpen}
                onClose={() => setIsPopoverOpen(false)}
                onPostSaved={() => {
                  if (!post.isSaved) saveMutation.mutate();
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <ReportPostModal
        postId={post.id}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      <DeletePostConfirmModal
        isOpen={isDeleteOpen}
        isDeleting={deleteMutation.isPending}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => {
          deleteMutation.mutate(undefined, {
            onSuccess: () => setIsDeleteOpen(false),
          });
        }}
      />

      <EditPostModal
        post={post}
        isOpen={isEditOpen}
        isSaving={editMutation.isPending}
        onClose={() => setIsEditOpen(false)}
        onSave={(newText) => {
          editMutation.mutate(newText, {
            onSuccess: () => setIsEditOpen(false),
          });
        }}
      />
    </div>
  );
}

export default PostCard;
