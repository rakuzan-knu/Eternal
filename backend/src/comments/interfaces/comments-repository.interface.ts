import type { CreateCommentDto } from '../dto/create-comment.dto';
import type { CommentWithUser } from '../dto/comment-response.dto';

export const COMMENTS_REPOSITORY = Symbol('COMMENTS_REPOSITORY');

export interface ICommentsRepository {
  addComment(postId: string, userId: string, dto: CreateCommentDto): Promise<CommentWithUser>;
  deleteComment(commentId: string, userId: string): Promise<CommentWithUser>;
  getCommentsByPostId(id: string, limit: number, after?: string): Promise<CommentWithUser[]>;
}
