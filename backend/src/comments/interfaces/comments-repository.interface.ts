import type { CreateCommentDto, CommentWithUser } from '@common/contracts';

export const COMMENTS_REPOSITORY = Symbol('COMMENTS_REPOSITORY');

export interface ICommentsRepository {
  addComment(postId: string, userId: string, dto: CreateCommentDto): Promise<CommentWithUser>;
  deleteComment(commentId: string, userId: string): Promise<CommentWithUser>;
  getCommentsByPostId(id: string, limit: number, after?: string): Promise<CommentWithUser[]>;
}
