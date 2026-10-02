import React, { useState } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { useReelComments, useAddReelComment } from '../api/reelsApi';
import { Link } from 'react-router-dom';

interface ReelCommentsDrawerProps {
  reelId: string;
  isOpen: boolean;
  onClose: () => void;
  commentsCount: number;
}

export const ReelCommentsDrawer: React.FC<ReelCommentsDrawerProps> = ({
  reelId,
  isOpen,
  onClose,
  commentsCount,
}) => {
  const [content, setContent] = useState('');
  const { data: comments, isLoading } = useReelComments(isOpen ? reelId : '');
  const addCommentMutation = useAddReelComment();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || addCommentMutation.isPending) return;

    try {
      await addCommentMutation.mutateAsync({ reelId, content: trimmed });
      setContent('');
    } catch {
      // Error handled by mutation state
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md glass-modal border-t sm:border border-black/10 dark:border-white/15 rounded-t-2xl sm:rounded-2xl flex flex-col h-[75dvh] sm:h-[min(600px,80dvh)] max-h-[95dvh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 text-gray-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white text-base">
              Comments{' '}
              <span className="text-gray-500 dark:text-zinc-400 text-sm font-normal">
                ({commentsCount})
              </span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:text-gray-950 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Close comments"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !comments || comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-zinc-400 text-sm">
              <MessageCircle className="w-10 h-10 mb-2 stroke-1 text-gray-400 dark:text-zinc-600" />
              <p>No comments yet.</p>
              <p className="text-xs text-gray-400 dark:text-zinc-500">
                Be the first to share your thoughts!
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3 text-sm">
                <Link
                  to={`/profile/${comment.user.username || comment.user.id}`}
                  className="shrink-0"
                >
                  {comment.user.avatar ? (
                    <img
                      src={comment.user.avatar}
                      alt={comment.user.username}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-black/10 dark:ring-zinc-700"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-linear-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-xs">
                      {comment.user.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <Link
                      to={`/profile/${comment.user.username || comment.user.id}`}
                      className="font-semibold text-gray-900 dark:text-white hover:underline text-xs"
                    >
                      {comment.user.displayName || comment.user.username}
                    </Link>
                    <span className="text-[10px] text-gray-500 dark:text-zinc-500">
                      {new Date(comment.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-zinc-300 text-sm mt-0.5 wrap-break-word whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        <form
          onSubmit={handleSubmit}
          className="p-3 border-t border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-black/30 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Add a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
            className="flex-1 bg-black/5 dark:bg-white/[0.06] border border-black/10 dark:border-white/10 rounded-full px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!content.trim() || addCommentMutation.isPending}
            className="p-2 rounded-full bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors shrink-0"
            aria-label="Send comment"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
