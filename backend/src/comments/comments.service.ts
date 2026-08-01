import { Inject, Injectable } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { COMMENTS_REPOSITORY } from './interfaces/comments-repository.interface';
import type { ICommentsRepository } from './interfaces/comments-repository.interface';
import { CommentResponseDto } from './dto/comment-response.dto';
import { GetAllCommentsResult } from './types/comments.types';
import { paginate } from '../common/pagination';

@Injectable()
export class CommentsService {
  constructor(
    @Inject(COMMENTS_REPOSITORY)
    private readonly commentsRepository: ICommentsRepository,
  ) {}

  async addComment(
    postId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    const comment = await this.commentsRepository.addComment(postId, userId, dto);
    return CommentResponseDto.fromPrisma(comment);
  }

  async deleteComment(commentId: string, userId: string): Promise<CommentResponseDto> {
    const comment = await this.commentsRepository.deleteComment(commentId, userId);
    return CommentResponseDto.fromPrisma(comment);
  }

  async getComments(postId: string, limit: number, cursor?: string): Promise<GetAllCommentsResult> {
    const comments = await this.commentsRepository.getCommentsByPostId(postId, limit, cursor);
    return paginate(comments, limit, (comment) => CommentResponseDto.fromPrisma(comment));
  }
}
