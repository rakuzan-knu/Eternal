import { Inject, Injectable } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ICommentsRepository } from './comments-repository.interface';


@Injectable()
export class CommentsService {
  constructor(
    @Inject('ICommentsRepository')
    private readonly commentsRepository: ICommentsRepository,
  ) {}
  async addComment(postId: string, userId: string, dto: CreateCommentDto) {
    return this.commentsRepository.addComment(postId, userId, dto);
  }
  async deleteComment(commentId: string, userId: string) {
    return this.commentsRepository.deleteComment(commentId, userId);
  }
  async getComments(postId: string) {
    return this.commentsRepository.getCommentsByPostId(postId);
  }
}
