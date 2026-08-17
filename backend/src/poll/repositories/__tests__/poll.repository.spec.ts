import type { PrismaService } from '@common/prisma';
import { PollRepository } from '../poll.repository';

describe('PollRepository', () => {
  let repository: PollRepository;
  let mockPrisma: {
    poll: {
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
    vote: {
      create: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      poll: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      vote: {
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    repository = new PollRepository(mockPrisma as unknown as PrismaService);
  });

  it('getPollByPostId queries poll with options and votes', async () => {
    mockPrisma.poll.findUnique.mockResolvedValueOnce({ id: 'poll-1' });

    await repository.getPollByPostId('post-100');

    expect(mockPrisma.poll.findUnique).toHaveBeenCalledWith({
      where: { postId: 'post-100' },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
        votes: true,
      },
    });
  });

  it('addPoll creates poll and option items', async () => {
    mockPrisma.poll.create.mockResolvedValueOnce({ id: 'poll-1' });

    await repository.addPoll('usr-1', {
      title: 'Poll Title',
      postId: 'post-100',
      options: ['A', 'B'],
      isMultiple: false,
    });

    expect(mockPrisma.poll.create).toHaveBeenCalledWith({
      data: {
        authorId: 'usr-1',
        title: 'Poll Title',
        postId: 'post-100',
        description: undefined,
        expiresAt: undefined,
        isMultiple: false,
        options: {
          createMany: {
            data: [
              { optionText: 'A', sortOrder: 0 },
              { optionText: 'B', sortOrder: 1 },
            ],
          },
        },
      },
    });
  });

  it('deletePoll deletes poll by id', async () => {
    mockPrisma.poll.delete.mockResolvedValueOnce({});

    await repository.deletePoll('poll-1');

    expect(mockPrisma.poll.delete).toHaveBeenCalledWith({ where: { id: 'poll-1' } });
  });

  it('addVote creates vote record', async () => {
    mockPrisma.vote.create.mockResolvedValueOnce({});

    await repository.addVote('poll-1', 'opt-1', 'usr-1');

    expect(mockPrisma.vote.create).toHaveBeenCalledWith({
      data: { pollId: 'poll-1', optionId: 'opt-1', userId: 'usr-1' },
    });
  });

  it('deleteVote deletes vote record by composite unique key', async () => {
    mockPrisma.vote.delete.mockResolvedValueOnce({});

    await repository.deleteVote('poll-1', 'usr-1');

    expect(mockPrisma.vote.delete).toHaveBeenCalledWith({
      where: { unique_user_vote_per_poll: { pollId: 'poll-1', userId: 'usr-1' } },
    });
  });
});
