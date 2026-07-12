import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Comment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ICommentsRepository } from './interfaces/comments-repository.interface';
import type { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsRepository implements ICommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async addComment(postId: string, userId: string, dto: CreateCommentDto): Promise<Comment> {
    return this.prisma.comment.create({
      data: { text: dto.text, postId, userId },
    });
  }

  async getCommentsByPostId(postId: string, limit: number, after?: string): Promise<Comment[]> {
    return this.prisma.comment.findMany({
      where: { postId },
      take: limit + 1,
      skip: after ? 1 : 0,
      cursor: after ? { id: after } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async deleteComment(commentId: string, userId: string): Promise<Comment> {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId)
      throw new ForbiddenException('You can only delete your own comments');
    return this.prisma.comment.delete({ where: { id: commentId } });
  }
}
