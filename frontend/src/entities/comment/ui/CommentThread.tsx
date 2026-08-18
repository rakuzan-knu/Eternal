import { useState } from 'react';
import { ChevronDown, CornerDownRight } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { CommentItem } from './CommentItem';
import { CommentType } from '../model/types';
import { commentsApi, CommentListPage } from '@/features/comment/api/commentsApi';
import { COMMENT_REPLIES_KEY } from '@/shared/api/queryKeys';

interface CommentThreadProps {
  comment: CommentType;
  postAuthorId?: string;
  currentUserId?: string;
  onReply?: (comment: CommentType) => void;
  onDelete?: (commentId: string) => void;
  onPin?: (commentId: string) => void;
  onLike?: (commentId: string) => void;
  onReport?: (comment: CommentType) => void;
  autoExpand?: boolean;
}

export function CommentThread({
  comment,
  postAuthorId,
  currentUserId,
  onReply,
  onDelete,
  onPin,
  onLike,
  onReport,
  autoExpand = false,
}: CommentThreadProps) {
  const [isExpanded, setIsExpanded] = useState(autoExpand);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery<CommentListPage>({
      queryKey: [COMMENT_REPLIES_KEY, comment.id],
      queryFn: ({ pageParam }) =>
        commentsApi.getReplies(comment.id, pageParam as string | undefined, 20),
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined,
      enabled: isExpanded,
    });

  const replies = data?.pages.flatMap((p) => p.comments) ?? [];
  const replyCount = Math.max(comment.replyCount ?? 0, replies.length);

  return (
    <div className="flex flex-col w-full">
      {/* Root Comment */}
      <CommentItem
        comment={comment}
        postAuthorId={postAuthorId}
        currentUserId={currentUserId}
        onReply={onReply}
        onDelete={onDelete}
        onPin={onPin}
        onLike={onLike}
        onReport={onReport}
        isReply={false}
      />

      {/* Replies Thread (Collapsible with 1-Level Indent & Curved Branch Line) */}
      {replyCount > 0 && (
        <div className="ml-5 sm:ml-6 pl-3 sm:pl-4 border-l-2 border-white/[0.08] relative mt-0.5">
          {/* Toggle Replies Button */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-2 text-xs font-semibold text-purple-400 hover:text-purple-300 py-1.5 px-2 rounded-xl hover:bg-purple-500/10 transition-all cursor-pointer group select-none"
          >
            <div className="flex items-center gap-1.5">
              <CornerDownRight
                size={13}
                className="text-purple-400/80 group-hover:translate-x-0.5 transition-transform"
              />
              <span>
                {isExpanded
                  ? 'Hide replies'
                  : `View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
              </span>
            </div>
            <ChevronDown
              size={13}
              className={`text-purple-400/70 transition-transform duration-300 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Expanded Replies List (Restricted to 1 Level Indent) */}
          {isExpanded && (
            <div className="space-y-1.5 pt-1 animate-fadeIn">
              {isLoading ? (
                <div className="flex items-center gap-2 py-3 px-2 text-xs text-gray-500">
                  <div className="w-3.5 h-3.5 border-2 border-purple-500/50 border-t-transparent rounded-full animate-spin" />
                  <span>Loading replies...</span>
                </div>
              ) : (
                <>
                  {replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      postAuthorId={postAuthorId}
                      currentUserId={currentUserId}
                      onReply={onReply}
                      onDelete={onDelete}
                      onPin={onPin}
                      onLike={onLike}
                      onReport={onReport}
                      isReply={true}
                    />
                  ))}

                  {/* Load More Replies */}
                  {hasNextPage && (
                    <button
                      type="button"
                      disabled={isFetchingNextPage}
                      onClick={() => fetchNextPage()}
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold py-1.5 px-2 rounded-lg hover:bg-purple-500/10 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isFetchingNextPage ? 'Loading more...' : 'View more replies'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
