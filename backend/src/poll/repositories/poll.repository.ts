import { Injectable } from '@nestjs/common';
import { IPollRepository } from '../interfaces/poll-repository.interface';
import { PrismaService } from '@common/prisma';
import { type CreatePollDto } from '@common/contracts';

@Injectable()
export class PollRepository implements IPollRepository {
  constructor(private prisma: PrismaService) {}
  async getPollByPostId(postId: string): Promise<void> {
    await this.prisma.poll.findUnique({
      where: { postId },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' },
        },
        votes: true,
      },
    });
  }

  async addPoll(authorId: string, dto: CreatePollDto): Promise<void> {
    await this.prisma.poll.create({
      data: {
        authorId: authorId,
        description: dto.description,
        title: dto.title,
        postId: dto.postId,
        isMultiple: dto.isMultiple,
        expiresAt: dto.expiresAt,
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
