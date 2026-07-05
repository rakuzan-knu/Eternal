import type { Comment } from '@prisma/client';
import type { CreateCommentDto } from './dto/create-comment.dto';

export interface ICommentsRepository {
  addComment(postId: string, userId: string, dto: CreateCommentDto): Promise<Comment>;
  deleteComment(commentId: string, userId: string): Promise<Comment>;
  getCommentsByPostId(id: string): Promise<Comment[]>;
}
