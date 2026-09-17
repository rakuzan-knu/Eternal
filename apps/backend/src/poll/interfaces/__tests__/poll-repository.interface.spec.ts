import { POLL_REPOSITORY, type IPollRepository } from '../poll-repository.interface';

describe('poll-repository.interface', () => {
  it('defines POLL_REPOSITORY symbol token', () => {
    expect(typeof POLL_REPOSITORY).toBe('symbol');
    expect(POLL_REPOSITORY.toString()).toBe('Symbol(POLL_REPOSITORY)');
  });

  it('implements IPollRepository interface methods', async () => {
    const addVoteMock = jest.fn().mockResolvedValue(undefined);
    const deleteVoteMock = jest.fn().mockResolvedValue(undefined);

    const mockRepo: IPollRepository = {
      getPollByPostId: jest.fn().mockResolvedValue(null),
      addPoll: jest.fn().mockResolvedValue(undefined),
      deletePoll: jest.fn().mockResolvedValue(undefined),
      addVote: addVoteMock,
      deleteVote: deleteVoteMock,
      findPostById: jest.fn().mockResolvedValue(null),
      findPollById: jest.fn().mockResolvedValue(null),
      findVoters: jest.fn().mockResolvedValue([]),
      findVote: jest.fn().mockResolvedValue(null),
    };

    await mockRepo.addVote('poll-1', 'opt-1', 'usr-1');
    expect(addVoteMock).toHaveBeenCalledWith('poll-1', 'opt-1', 'usr-1');

    await mockRepo.deleteVote('poll-1', 'usr-1');
    expect(deleteVoteMock).toHaveBeenCalledWith('poll-1', 'usr-1');
  });
});
