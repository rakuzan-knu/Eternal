import { Inject, Injectable } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import type { ICommentsRepository } from './comments-repository.interface';
import { Comment } from '@prisma/client';

@Injectable()
export class CommentsService {
  constructor(
    @Inject('ICommentsRepository')
    private readonly commentsRepository: ICommentsRepository,
  ) {}
  async addComment(postId: string, userId: string, dto: CreateCommentDto): Promise<Comment> {
    return this.commentsRepository.addComment(postId, userId, dto);
  }
  async deleteComment(commentId: string, userId: string): Promise<Comment> {
    return this.commentsRepository.deleteComment(commentId, userId);
  }
  async getComments(postId: string): Promise<Comment[]> {
    return this.commentsRepository.getCommentsByPostId(postId);
  }
}
