import { Injectable } from '@nestjs/common';
import { ICommentsRepository } from './comments-repository.interface';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Comment } from '@prisma/client';

@Injectable()
export class CommentsRepository implements ICommentsRepository {
  constructor(private readonly prisma: PrismaService) {}
  async addComment(
    postId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<Comment> {
    return this.prisma.comment.create({
      data: {
        text: dto.text,
        postId,
        userId,
      },
    });
  }
  async getCommentsByPostId(postId: string): Promise<Comment[]> {
    return this.prisma.comment.findMany({
      where: { postId },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
  async deleteComment(commentId: string, userId: string): Promise<Comment> {
    return this.prisma.comment.delete({
      where: { id: commentId },
    });
  }
}
