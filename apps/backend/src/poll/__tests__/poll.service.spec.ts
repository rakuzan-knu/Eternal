import {
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { PollService } from '../poll.service';
import type { IPollRepository } from '../interfaces/poll-repository.interface';
import type { RedisService } from '../../redis/redis.service';

describe('PollService', () => {
  let service: PollService;
  let mockPollRepository: Record<keyof IPollRepository, jest.Mock>;
  let mockRedis: {
    withLock: jest.Mock;
  };

  const samplePoll = {
    id: 'poll-1',
    postId: 'post-100',
    userId: 'usr-author',
    authorId: 'usr-author',
    question: 'Favorite language?',
    isClosed: false,
    isActive: true,
    closedAt: null,
    expiresAt: new Date(Date.now() + 86400000),
    allowMultiple: false,
    options: [
      { id: 'opt-1', text: 'TypeScript', voteCount: 5 },
      { id: 'opt-2', text: 'Rust', voteCount: 3 },
    ],
  };

  beforeEach(() => {
    mockPollRepository = {
      getPollByPostId: jest.fn().mockResolvedValue(samplePoll),
      addPoll: jest.fn().mockResolvedValue(samplePoll),
      deletePoll: jest.fn().mockResolvedValue(samplePoll),
      addVote: jest.fn().mockResolvedValue({ id: 'vote-1' }),
      deleteVote: jest.fn().mockResolvedValue({ count: 1 }),
      findPostById: jest.fn().mockResolvedValue({ id: 'post-100', authorId: 'usr-author' }),
      findPollById: jest.fn().mockResolvedValue(samplePoll),
      findVoters: jest.fn().mockResolvedValue([]),
      findVote: jest.fn().mockResolvedValue(null),
    };

    mockRedis = {
      withLock: jest
        .fn()
        .mockImplementation((_k: string, action: () => Promise<unknown>) => action()),
    };

    service = new PollService(mockPollRepository, mockRedis as unknown as RedisService);
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
      mockPollRepository.findPostById.mockResolvedValueOnce(null);

      await expect(service.addPoll('usr-author', dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if caller is not post author', async () => {
      mockPollRepository.findPostById.mockResolvedValueOnce({
        id: 'post-100',
        authorId: 'other-author',
      });

      await expect(service.addPoll('usr-author', dto)).rejects.toThrow(
        new ForbiddenException('You can only add a poll to your own post'),
      );
    });

    it('throws ConflictException if post already has a poll', async () => {
      mockPollRepository.findPostById.mockResolvedValueOnce({
        id: 'post-100',
        authorId: 'usr-author',
      });
      mockPollRepository.getPollByPostId.mockResolvedValueOnce(samplePoll);

      await expect(service.addPoll('usr-author', dto)).rejects.toThrow(
        new ConflictException('Post already has a poll'),
      );
    });

    it('creates poll when validation passes', async () => {
      mockPollRepository.findPostById.mockResolvedValueOnce({
        id: 'post-100',
        authorId: 'usr-author',
      });
      mockPollRepository.getPollByPostId.mockResolvedValueOnce(null);

      await service.addPoll('usr-author', dto);

      expect(mockPollRepository.addPoll).toHaveBeenCalledWith('usr-author', dto);
    });
  });

  describe('getVoters & deletePoll', () => {
    it('getVoters throws NotFoundException if poll missing and ForbiddenException if not author', async () => {
      mockPollRepository.findPollById.mockResolvedValueOnce(null);
      await expect(service.getVoters('poll-missing', 'usr-1')).rejects.toThrow(NotFoundException);

      mockPollRepository.findPollById.mockResolvedValueOnce(samplePoll);
      await expect(service.getVoters('poll-1', 'other-user')).rejects.toThrow(
        new ForbiddenException('Only the poll author can view voters'),
      );
    });

    it('getVoters returns votes when requester is poll author', async () => {
      mockPollRepository.findPollById.mockResolvedValueOnce(samplePoll);
      mockPollRepository.findVoters.mockResolvedValueOnce([
        { optionId: 'opt-1', user: { id: 'usr-voter', username: 'voter' } },
      ]);

      const voters = await service.getVoters('poll-1', 'usr-author');
      expect(voters).toHaveLength(1);
    });

    it('deletePoll throws NotFoundException if poll missing and ForbiddenException if requester is not author', async () => {
      mockPollRepository.findPollById.mockResolvedValueOnce(null);
      await expect(service.deletePoll('poll-missing', 'usr-1')).rejects.toThrow(NotFoundException);

      mockPollRepository.findPollById.mockResolvedValueOnce(samplePoll);
      await expect(service.deletePoll('poll-1', 'other-user')).rejects.toThrow(
        new ForbiddenException('You can only delete your own poll'),
      );
    });

    it('deletePoll deletes poll when requester is author', async () => {
      mockPollRepository.findPollById.mockResolvedValueOnce(samplePoll);

      await service.deletePoll('poll-1', 'usr-author');

      expect(mockPollRepository.deletePoll).toHaveBeenCalledWith('poll-1');
    });
  });

  describe('addVote & deleteVote', () => {
    it('addVote throws NotFoundException if poll missing or option not in poll', async () => {
      mockPollRepository.findPollById.mockResolvedValueOnce(null);
      await expect(service.addVote('poll-missing', 'opt-1', 'usr-1')).rejects.toThrow(
        NotFoundException,
      );

      mockPollRepository.findPollById.mockResolvedValueOnce(samplePoll);
      await expect(service.addVote('poll-1', 'opt-invalid', 'usr-1')).rejects.toThrow(
        new NotFoundException('Option not found in this poll'),
      );
    });

    it('addVote throws GoneException if poll is inactive or expired', async () => {
      mockPollRepository.findPollById.mockResolvedValueOnce({ ...samplePoll, isActive: false });

      await expect(service.addVote('poll-1', 'opt-1', 'usr-1')).rejects.toThrow(GoneException);

      mockPollRepository.findPollById.mockResolvedValueOnce({
        ...samplePoll,
        expiresAt: new Date('2020-01-01'),
      });

      await expect(service.addVote('poll-1', 'opt-1', 'usr-1')).rejects.toThrow(
        new GoneException('Poll has expired'),
      );
    });

    it('addVote throws ConflictException if user already voted', async () => {
      mockPollRepository.findPollById.mockResolvedValueOnce(samplePoll);
      mockPollRepository.findVote.mockResolvedValueOnce({ id: 'vote-1' });

      await expect(service.addVote('poll-1', 'opt-1', 'usr-1')).rejects.toThrow(
        new ConflictException('You have already voted in this poll'),
      );
    });

    it('addVote records vote when valid', async () => {
      mockPollRepository.findPollById.mockResolvedValueOnce(samplePoll);
      mockPollRepository.findVote.mockResolvedValueOnce(null);

      await service.addVote('poll-1', 'opt-1', 'usr-1');

      expect(mockPollRepository.addVote).toHaveBeenCalledWith('poll-1', 'opt-1', 'usr-1');
    });

    it('deleteVote throws NotFoundException if vote does not exist', async () => {
      mockPollRepository.findVote.mockResolvedValueOnce(null);

      await expect(service.deleteVote('poll-1', 'usr-1')).rejects.toThrow(NotFoundException);
    });

    it('deleteVote deletes vote when vote exists', async () => {
      mockPollRepository.findVote.mockResolvedValueOnce({ id: 'vote-1' });

      await service.deleteVote('poll-1', 'usr-1');

      expect(mockPollRepository.deleteVote).toHaveBeenCalledWith('poll-1', 'usr-1');
    });
  });
});
