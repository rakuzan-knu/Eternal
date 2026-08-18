import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MoreHorizontal, Pin, Trash2, Copy, Check, Flag } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import { CommentType } from '../model/types';
import { FormattedText } from '@/shared/ui/FormattedText';
import { UserNameWithBadges } from '@/entities/profile/ui/UserNameWithBadges';
import { MiniProfileHoverCard } from '@/entities/profile/ui/MiniProfileHoverCard';

interface CommentItemProps {
  comment: CommentType;
  postAuthorId?: string;
  currentUserId?: string;
  onReply?: (comment: CommentType) => void;
  onDelete?: (commentId: string) => void;
  onPin?: (commentId: string) => void;
  onLike?: (commentId: string) => void;
  onReport?: (comment: CommentType) => void;
  isReply?: boolean;
}

export function CommentItem({
  comment,
  postAuthorId,
  currentUserId,
  onReply,
  onDelete,
  onPin,
  onLike,
  onReport,
  isReply = false,
}: CommentItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [isHeartPopping, setIsHeartPopping] = useState(false);
  const [isLikePending, setIsLikePending] = useState(false);
  const lastTapRef = useRef<number>(0);

  const isAuthor = postAuthorId && comment.userId === postAuthorId;
  const isCommentOwner = currentUserId && comment.userId === currentUserId;
  const isPostOwner = postAuthorId && currentUserId === postAuthorId;
  const canDelete = !comment.isDeleted && (isCommentOwner || isPostOwner);
  const canPin = !isReply && !comment.isDeleted && isPostOwner;
  const canReport = !comment.isDeleted && !isCommentOwner;

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (!comment.isLiked && onLike) {
        setIsLikePending(true);
        onLike(comment.id);
        setTimeout(() => setIsLikePending(false), 500);
      }
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 800);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLikePending) return;
    setIsLikePending(true);
    setIsHeartPopping(true);
    setTimeout(() => setIsHeartPopping(false), 400);
    onLike?.(comment.id);
    setTimeout(() => setIsLikePending(false), 500);
  };

  const handleCopyText = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(comment.text);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
      setIsMenuOpen(false);
    }, 1200);
  };

  return (
    <div
      className={`group relative flex gap-3 items-start py-2.5 px-3 rounded-2xl transition-all duration-200 ${
        comment.isPinned
          ? 'bg-purple-950/20 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
          : 'hover:bg-white/[0.03]'
      }`}
      onClick={handleDoubleTap}
    >
      {/* Heart burst animation on double tap */}
      {showHeartBurst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-popIn">
          <Heart
            size={44}
            className="fill-[#ec4899] text-[#ec4899] drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]"
          />
        </div>
      )}

      {/* Avatar */}
      <div className="shrink-0 pt-0.5">
        <MiniProfileHoverCard username={comment.handle}>
          <Link to={`/profile/${comment.handle}`} onClick={(e) => e.stopPropagation()}>
            <Avatar size={isReply ? 'xs' : 'sm'} src={comment.avatar} />
          </Link>
        </MiniProfileHoverCard>
      </div>

      {/* Comment Body */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Author Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <MiniProfileHoverCard username={comment.handle}>
              <Link
                to={`/profile/${comment.handle}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:underline inline-flex items-center"
              >
                <UserNameWithBadges
                  displayName={comment.author}
                  username={comment.handle}
                  isVerified={comment.isVerified}
                  primaryBadge={comment.primaryBadge}
                  size="sm"
                />
              </Link>
            </MiniProfileHoverCard>

            {/* Author Pill Badge */}
            {isAuthor && (
              <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] px-1.5 py-0.2 rounded-full font-medium select-none">
                Author
              </span>
            )}

            {/* Pinned Badge */}
            {comment.isPinned && (
              <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] px-1.5 py-0.2 rounded-full font-semibold flex items-center gap-1 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                <Pin size={10} className="fill-purple-400 text-purple-400" />
                Pinned
              </span>
            )}

            <span className="text-[11px] text-gray-500 font-normal">
              @{comment.handle} • {comment.time}
            </span>
          </div>

          {/* Three-Dot Menu Button */}
          {!comment.isDeleted && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen((prev) => !prev);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                title="Options"
              >
                <MoreHorizontal size={15} />
              </button>

              {isMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-36 bg-[#161619] border border-white/[0.1] rounded-2xl p-1 shadow-2xl flex flex-col gap-0.5 z-40 backdrop-blur-xl animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-gray-200 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    {isCopied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                    <span>{isCopied ? 'Copied' : 'Copy text'}</span>
                  </button>

                  {canPin && onPin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onPin(comment.id);
                      }}
                      className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-gray-200 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      <Pin size={13} className="text-purple-400" />
                      <span>{comment.isPinned ? 'Unpin' : 'Pin to top'}</span>
                    </button>
                  )}

                  {canReport && onReport && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onReport(comment);
                      }}
                      className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-amber-400 hover:bg-amber-500/15 transition-colors cursor-pointer"
                    >
                      <Flag size={13} />
                      <span>Report</span>
                    </button>
                  )}

                  {canDelete && onDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onDelete(comment.id);
                      }}
                      className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Comment Text with Break Words / Overflow-Wrap Anywhere Protection */}
        <div
          className={`text-sm mt-1 leading-relaxed break-words [overflow-wrap:anywhere] max-w-full ${
            comment.isDeleted ? 'text-gray-500 italic' : 'text-gray-200'
          }`}
        >
          <FormattedText text={comment.isDeleted ? '[Comment deleted]' : comment.text} />
        </div>

        {/* Media Image Attachment */}
        {comment.mediaUrl && !comment.isDeleted && (
          <div className="mt-2 max-w-sm rounded-xl overflow-hidden border border-white/[0.08] bg-black/40">
            <img
              src={comment.mediaUrl}
              alt="attachment"
              className="w-full max-h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                window.open(comment.mediaUrl ?? '', '_blank');
              }}
            />
          </div>
        )}

        {/* Action Row */}
        {!comment.isDeleted && (
          <div className="flex items-center gap-4 mt-2 text-xs">
            {/* Reply Button */}
            {onReply && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReply(comment);
                }}
                className="text-gray-400 hover:text-purple-400 font-semibold transition-colors cursor-pointer"
              >
                Reply
              </button>
            )}

            {/* Liked by author pill */}
            {comment.isLikedByAuthor && (
              <span className="flex items-center gap-1 text-[11px] text-purple-400/90 font-medium">
                <Heart size={11} className="fill-purple-400 text-purple-400" />
                Liked by author
              </span>
            )}

            {/* Like Button with Double-Click Protection */}
            <button
              type="button"
              disabled={isLikePending}
              onClick={handleLikeClick}
              className={`flex items-center gap-1.5 font-medium transition-all duration-200 cursor-pointer ml-auto disabled:opacity-50 ${
                comment.isLiked ? 'text-[#ec4899]' : 'text-gray-500 hover:text-gray-300'
              }`}
              title={comment.isLiked ? 'Unlike' : 'Like'}
            >
              <Heart
                size={14}
                className={`transition-transform duration-200 ${
                  comment.isLiked ? 'fill-[#ec4899] drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]' : ''
                } ${isHeartPopping ? 'scale-125' : 'scale-100'}`}
              />
              {(comment.likesCount ?? 0) > 0 && (
                <span className="text-[11px] tabular-nums font-semibold">{comment.likesCount}</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
