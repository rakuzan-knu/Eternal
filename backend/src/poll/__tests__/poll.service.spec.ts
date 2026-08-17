import {
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { PollService } from '../poll.service';
import type { PrismaService } from '@common/prisma';

describe('PollService', () => {
  let service: PollService;
  let mockPollRepository: {
    getPollByPostId: jest.Mock;
    addPoll: jest.Mock;
    deletePoll: jest.Mock;
    addVote: jest.Mock;
    deleteVote: jest.Mock;
  };
  let mockPrisma: {
    post: {
      findUnique: jest.Mock;
    };
    poll: {
      findUnique: jest.Mock;
    };
    vote: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  const samplePoll = {
    id: 'poll-1',
    postId: 'post-100',
    authorId: 'usr-author',
    isActive: true,
    expiresAt: null,
    options: [
      { id: 'opt-1', optionText: 'Option 1' },
      { id: 'opt-2', optionText: 'Option 2' },
    ],
  };

  beforeEach(() => {
    mockPollRepository = {
      getPollByPostId: jest.fn(),
      addPoll: jest.fn().mockResolvedValue(undefined),
      deletePoll: jest.fn().mockResolvedValue(undefined),
      addVote: jest.fn().mockResolvedValue(undefined),
      deleteVote: jest.fn().mockResolvedValue(undefined),
    };

    mockPrisma = {
      post: {
        findUnique: jest.fn(),
      },
      poll: {
        findUnique: jest.fn(),
      },
      vote: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
    };

    service = new PollService(mockPollRepository, mockPrisma as unknown as PrismaService);
  });

  describe('getPollByPostId', () => {
    it('throws NotFoundException if poll not found', async () => {
      mockPollRepository.getPollByPostId.mockResolvedValueOnce(null);

      await expect(service.getPollByPostId('post-missing')).rejects.toThrow(NotFoundException);
    });

    it('returns poll when found', async () => {
      mockPollRepository.getPollByPostId.mockResolvedValueOnce(samplePoll);

      const poll = await service.getPollByPostId('post-100');
      expect(poll).toEqual(samplePoll);
    });
  });

  describe('addPoll', () => {
    const dto = {
      postId: 'post-100',
      title: 'Poll Title',
      options: ['A', 'B'],
      isMultiple: false,
    };

    it('throws NotFoundException if post not found', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce(null);

      await expect(service.addPoll('usr-author', dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if caller is not post author', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce({
        id: 'post-100',
        authorId: 'other-author',
      });

      await expect(service.addPoll('usr-author', dto)).rejects.toThrow(
        new ForbiddenException('You can only add a poll to your own post'),
      );
    });

    it('throws ConflictException if post already has a poll', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce({ id: 'post-100', authorId: 'usr-author' });
      mockPollRepository.getPollByPostId.mockResolvedValueOnce(samplePoll);

      await expect(service.addPoll('usr-author', dto)).rejects.toThrow(
        new ConflictException('Post already has a poll'),
      );
    });

    it('creates poll when validation passes', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce({ id: 'post-100', authorId: 'usr-author' });
      mockPollRepository.getPollByPostId.mockResolvedValueOnce(null);

      await service.addPoll('usr-author', dto);

      expect(mockPollRepository.addPoll).toHaveBeenCalledWith('usr-author', dto);
    });
  });

  describe('getVoters & deletePoll', () => {
    it('getVoters throws ForbiddenException if requester is not poll author', async () => {
      mockPrisma.poll.findUnique.mockResolvedValueOnce(samplePoll);

      await expect(service.getVoters('poll-1', 'other-user')).rejects.toThrow(
        new ForbiddenException('Only the poll author can view voters'),
      );
    });

    it('getVoters returns votes when requester is poll author', async () => {
      mockPrisma.poll.findUnique.mockResolvedValueOnce(samplePoll);
      mockPrisma.vote.findMany.mockResolvedValueOnce([
        { optionId: 'opt-1', user: { id: 'usr-voter', username: 'voter' } },
      ]);

      const voters = await service.getVoters('poll-1', 'usr-author');
      expect(voters).toHaveLength(1);
    });

    it('deletePoll throws ForbiddenException if requester is not author', async () => {
      mockPrisma.poll.findUnique.mockResolvedValueOnce(samplePoll);

      await expect(service.deletePoll('poll-1', 'other-user')).rejects.toThrow(
        new ForbiddenException('You can only delete your own poll'),
      );
    });

    it('deletePoll deletes poll when requester is author', async () => {
      mockPrisma.poll.findUnique.mockResolvedValueOnce(samplePoll);

      await service.deletePoll('poll-1', 'usr-author');

      expect(mockPollRepository.deletePoll).toHaveBeenCalledWith('poll-1');
    });
  });

  describe('addVote & deleteVote', () => {
    it('addVote throws GoneException if poll is inactive or expired', async () => {
      mockPrisma.poll.findUnique.mockResolvedValueOnce({ ...samplePoll, isActive: false });

      await expect(service.addVote('poll-1', 'opt-1', 'usr-1')).rejects.toThrow(GoneException);

      mockPrisma.poll.findUnique.mockResolvedValueOnce({
        ...samplePoll,
        expiresAt: new Date('2020-01-01'),
      });

      await expect(service.addVote('poll-1', 'opt-1', 'usr-1')).rejects.toThrow(
        new GoneException('Poll has expired'),
      );
    });

    it('addVote throws ConflictException if user already voted', async () => {
      mockPrisma.poll.findUnique.mockResolvedValueOnce(samplePoll);
      mockPrisma.vote.findUnique.mockResolvedValueOnce({ id: 'vote-1' });

      await expect(service.addVote('poll-1', 'opt-1', 'usr-1')).rejects.toThrow(
        new ConflictException('You have already voted in this poll'),
      );
    });

    it('addVote records vote when valid', async () => {
      mockPrisma.poll.findUnique.mockResolvedValueOnce(samplePoll);
      mockPrisma.vote.findUnique.mockResolvedValueOnce(null);

      await service.addVote('poll-1', 'opt-1', 'usr-1');

      expect(mockPollRepository.addVote).toHaveBeenCalledWith('poll-1', 'opt-1', 'usr-1');
    });

    it('deleteVote throws NotFoundException if vote does not exist', async () => {
      mockPrisma.vote.findUnique.mockResolvedValueOnce(null);

      await expect(service.deleteVote('poll-1', 'usr-1')).rejects.toThrow(NotFoundException);
    });

    it('deleteVote deletes vote when vote exists', async () => {
      mockPrisma.vote.findUnique.mockResolvedValueOnce({ id: 'vote-1' });

      await service.deleteVote('poll-1', 'usr-1');

      expect(mockPollRepository.deleteVote).toHaveBeenCalledWith('poll-1', 'usr-1');
    });
  });
});
