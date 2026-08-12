import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IPollRepository } from './interfaces/poll-repository.interface';
import { POLL_REPOSITORY } from './interfaces/poll-repository.interface';
import { CreatePollDto } from './dto/create-poll.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PollService {
  constructor(
    @Inject(POLL_REPOSITORY)
    private readonly pollRepository: IPollRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getPollByPostId(postId: string) {
    const poll = await this.pollRepository.getPollByPostId(postId);
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
    return poll;
  }

  async addPoll(authorId: string, dto: CreatePollDto): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id: dto.postId },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId !== authorId) {
      throw new ForbiddenException('You can only add a poll to your own post');
    }

    const existingPoll = await this.pollRepository.getPollByPostId(dto.postId);
    if (existingPoll) {
      throw new ConflictException('Post already has a poll');
    }

    await this.pollRepository.addPoll(authorId, dto);
  }

  async getVoters(pollId: string, userId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
    });
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
    if (poll.authorId !== userId) {
      throw new ForbiddenException('Only the poll author can view voters');
    }

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

  async deletePoll(pollId: string, userId: string): Promise<void> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
    });
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
    if (poll.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own poll');
    }

    await this.pollRepository.deletePoll(pollId);
  }

  async addVote(pollId: string, optionId: string, userId: string): Promise<void> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
    if (!poll.isActive) {
      throw new GoneException('Poll is no longer active');
    }
    if (poll.expiresAt && poll.expiresAt < new Date()) {
      throw new GoneException('Poll has expired');
    }

    const optionExists = poll.options.some((o) => o.id === optionId);
    if (!optionExists) {
      throw new NotFoundException('Option not found in this poll');
    }

    const existingVote = await this.prisma.vote.findUnique({
      where: {
        unique_user_vote_per_poll: { pollId, userId },
      },
    });
    if (existingVote) {
      throw new ConflictException('You have already voted in this poll');
    }

    await this.pollRepository.addVote(pollId, optionId, userId);
  }

  async deleteVote(pollId: string, userId: string): Promise<void> {
    const vote = await this.prisma.vote.findUnique({
      where: {
        unique_user_vote_per_poll: { pollId, userId },
      },
    });
    if (!vote) {
      throw new NotFoundException('Vote not found');
    }

    await this.pollRepository.deleteVote(pollId, userId);
  }
}
