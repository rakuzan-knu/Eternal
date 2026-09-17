import { Injectable } from '@nestjs/common';
import { IPollRepository } from '../interfaces/poll-repository.interface';
import { PrismaService } from '@common/prisma';
import { type CreatePollDto } from '@common/contracts';

@Injectable()
export class PollRepository implements IPollRepository {
  constructor(private prisma: PrismaService) {}

  async findPostById(postId: string): Promise<{ id: string; authorId: string } | null> {
    return this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
  }

  async getPollByPostId(postId: string): Promise<unknown> {
    return this.prisma.poll.findUnique({
      where: { postId },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' },
        },
        votes: true,
      },
    });
  }

  async findPollById(pollId: string) {
    return this.prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });
  }

  async findVoters(pollId: string) {
    return this.prisma.vote.findMany({
      where: { pollId },
      select: {
        optionId: true,
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  async findVote(pollId: string, userId: string) {
    return this.prisma.vote.findUnique({
      where: {
        unique_user_vote_per_poll: { pollId, userId },
      },
      select: { id: true },
    });
  }

  async addPoll(authorId: string, dto: CreatePollDto): Promise<void> {
    await this.prisma.poll.create({
      data: {
        authorId: authorId,
        description: dto.description ?? null,
        title: dto.title,
        postId: dto.postId,
        isMultiple: dto.isMultiple ?? false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        options: {
          createMany: {
            data: dto.options.map((text, index) => ({
              optionText: text,
              sortOrder: index,
            })),
          },
        },
      },
    });
  }

  async deletePoll(pollId: string): Promise<void> {
    await this.prisma.poll.delete({
      where: { id: pollId },
    });
  }

  async addVote(pollId: string, optionId: string, userId: string): Promise<void> {
    await this.prisma.vote.create({
      data: {
        pollId,
        optionId,
        userId,
      },
    });
  }

  async deleteVote(pollId: string, userId: string): Promise<void> {
    await this.prisma.vote.delete({
      where: {
        unique_user_vote_per_poll: {
          pollId,
          userId,
        },
      },
    });
  }
}
