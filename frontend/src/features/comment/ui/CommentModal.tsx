import React from 'react';
import { X, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useUIStore } from '../../../shared/model/useUIStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import Avatar from '../../../shared/ui/Avatar';
import { CommentItem } from '../../../entities/comment/ui/CommentItem';
import { CommentForm } from '../ui/CommentForm';
import { commentsApi, CommentListPage } from '../api/commentsApi';
import { FormattedText } from '@/shared/ui/FormattedText';
import { UserNameWithBadges } from '@/entities/profile/ui/UserNameWithBadges';
import { PostMedia } from '@/entities/post/ui/PostMedia';

export function CommentModal() {
  const { isCommentModalOpen, activePostForComments, closeCommentModal } = useUIStore();
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const postId = activePostForComments?.id ? String(activePostForComments.id) : '';

  const { data: commentPage, isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => commentsApi.getComments(postId),
    enabled: isCommentModalOpen && !!postId,
    initialData: activePostForComments?.commentList
      ? { comments: activePostForComments.commentList, nextCursor: null }
      : undefined,
  });

  const addCommentMutation = useMutation({
    mutationFn: (text: string) => commentsApi.addComment(postId, text),
    onSuccess: (newComment) => {
      queryClient.setQueryData<CommentListPage>(
        ['comments', postId],
        (old: CommentListPage | undefined) => {
          if (!old) return { comments: [newComment], nextCursor: null };
          return {
            ...old,
            comments: [...old.comments, newComment],
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  if (!isCommentModalOpen || !activePostForComments) return null;

  const commentsList = commentPage?.comments ?? activePostForComments.commentList ?? [];
  const media: import('@/entities/post/model/types').PostMedia[] =
    activePostForComments.media ??
    (activePostForComments.image ? [{ type: 'image', url: activePostForComments.image }] : []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-[#0a0a0c]/95 backdrop-blur-2xl border border-white/[0.08] rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col p-5 shadow-2xl shadow-black/80">
        <div className="flex justify-between items-center pb-3 border-b border-white/[0.06]">
          <h3 className="text-sm font-medium text-gray-400">
            User post {activePostForComments.author}
          </h3>
          <button
            onClick={closeCommentModal}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/5 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto my-3 pr-1 space-y-4 custom-scrollbar">
          <div className="flex gap-3 items-start border-b border-white/[0.06] pb-4 mt-1">
            <Link to={`/profile/${activePostForComments.handle}`}>
              <Avatar src={activePostForComments.avatar} size="sm" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link to={`/profile/${activePostForComments.handle}`} className="hover:underline">
                  <UserNameWithBadges
                    displayName={activePostForComments.author}
                    username={activePostForComments.handle}
                    isVerified={activePostForComments.isVerified}
                    primaryBadge={activePostForComments.primaryBadge}
                    size="sm"
                  />
                </Link>
                <span className="text-xs text-gray-500">@{activePostForComments.handle}</span>
              </div>
              <div className="text-gray-200 text-sm mt-1">
                <FormattedText text={activePostForComments.text} />
              </div>
              {media.length > 0 && (
                <div className="mt-3">
                  <PostMedia media={media} />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
              </div>
            ) : commentsList.length > 0 ? (
              commentsList.map((c: import('@/entities/comment/model/types').CommentType) => (
                <CommentItem key={c.id} comment={c} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-gray-500 gap-2">
                <MessageSquare size={32} className="opacity-30" />
                <p className="text-sm font-medium">No comments</p>
                <p className="text-xs opacity-60">Add the first comment.</p>
              </div>
            )}
          </div>
        </div>

        <CommentForm
          currentUserHandle={currentUser?.username ?? 'user'}
          onSubmitComment={(text) => addCommentMutation.mutate(text)}
          isSubmitting={addCommentMutation.isPending}
        />
      </div>
    </div>
  );
}
