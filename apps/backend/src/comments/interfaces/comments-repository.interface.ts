import type { CreateCommentDto, CommentWithUser } from '@common/contracts';

export const COMMENTS_REPOSITORY = Symbol('COMMENTS_REPOSITORY');

export interface ICommentsRepository {
  addComment(postId: string, userId: string, dto: CreateCommentDto): Promise<CommentWithUser>;
  deleteComment(commentId: string, userId: string): Promise<CommentWithUser>;
  getCommentsByPostId(
    postId: string,
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<CommentWithUser[]>;
  getRepliesByRootId(
    rootCommentId: string,
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<CommentWithUser[]>;
  toggleCommentLike(
    commentId: string,
    userId: string,
  ): Promise<{ isLiked: boolean; likesCount: number }>;
  togglePinComment(commentId: string, userId: string): Promise<{ isPinned: boolean }>;
  findRecentDuplicate(userId: string, postId: string, text: string, since: Date): Promise<boolean>;
  findPostBasic(
    postId: string,
  ): Promise<{ id: string; authorId: string; author: { username: string } } | null>;
  isBlocked(userA: string, userB: string): Promise<boolean>;
  findUserBasic(userId: string): Promise<{
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  } | null>;
  findMentionedUsers(
    usernames: string[],
    excludeUserId: string,
  ): Promise<{ id: string; username: string }[]>;
}
