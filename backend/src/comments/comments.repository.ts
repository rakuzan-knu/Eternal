import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ICommentsRepository } from './interfaces/comments-repository.interface';
import type { CreateCommentDto } from './dto/create-comment.dto';
import type { CommentWithUser } from './dto/comment-response.dto';

const userSelect = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  isVerified: true,
  primaryBadge: true,
};

@Injectable()
export class CommentsRepository implements ICommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async addComment(
    postId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<CommentWithUser> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    if (dto.parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
      });
      if (!parentComment || parentComment.postId !== postId) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    return this.prisma.comment.create({
      data: {
        text: dto.text,
        postId,
        userId,
        parentId: dto.parentId,
      },
      include: {
        user: { select: userSelect },
      },
    });
  }

  async getCommentsByPostId(
    postId: string,
    limit: number,
    after?: string,
  ): Promise<CommentWithUser[]> {
    return this.prisma.comment.findMany({
      where: { postId },
      take: limit + 1,
      skip: after ? 1 : 0,
      cursor: after ? { id: after } : undefined,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: {
        user: { select: userSelect },
      },
    });
  }

  async deleteComment(commentId: string, userId: string): Promise<CommentWithUser> {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId)
      throw new ForbiddenException('You can only delete your own comments');
    return this.prisma.comment.delete({
      where: { id: commentId },
      include: { user: { select: userSelect } },
    });
  }
}
