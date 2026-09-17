import { PollController } from '../poll.controller';
import type { PollService } from '../poll.service';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';

describe('PollController', () => {
  let controller: PollController;
  let mockPollService: {
    getPollByPostId: jest.Mock;
    addPoll: jest.Mock;
    getVoters: jest.Mock;
    deletePoll: jest.Mock;
    addVote: jest.Mock;
    deleteVote: jest.Mock;
  };

  const mockUser: RequestUser = {
    id: 'usr-1',
    email: 'user@test.com',
    username: 'user_1',
    sessionJti: 'jti-1',
  };

  beforeEach(() => {
    mockPollService = {
      getPollByPostId: jest.fn(),
      addPoll: jest.fn(),
      getVoters: jest.fn(),
      deletePoll: jest.fn(),
      addVote: jest.fn(),
      deleteVote: jest.fn(),
    };

    controller = new PollController(mockPollService as unknown as PollService);
  });

  it('getPollByPostId delegates to PollService', async () => {
    mockPollService.getPollByPostId.mockResolvedValueOnce({ id: 'poll-1' });

    const result = await controller.getPollByPostId('post-100');

    expect(mockPollService.getPollByPostId).toHaveBeenCalledWith('post-100');
    expect(result).toEqual({ id: 'poll-1' });
  });

  it('addPoll delegates to PollService', async () => {
    const dto = { postId: 'post-100', title: 'Title', options: ['A', 'B'], isMultiple: false };
    mockPollService.addPoll.mockResolvedValueOnce(undefined);

    await controller.addPoll(dto, mockUser);

    expect(mockPollService.addPoll).toHaveBeenCalledWith('usr-1', dto);
  });

  it('getVoters delegates to PollService', async () => {
    mockPollService.getVoters.mockResolvedValueOnce([]);

    await controller.getVoters('poll-1', mockUser);

    expect(mockPollService.getVoters).toHaveBeenCalledWith('poll-1', 'usr-1');
  });

  it('deletePoll delegates to PollService', async () => {
    mockPollService.deletePoll.mockResolvedValueOnce(undefined);

    await controller.deletePoll('poll-1', mockUser);

    expect(mockPollService.deletePoll).toHaveBeenCalledWith('poll-1', 'usr-1');
  });

  it('addVote and deleteVote delegate to PollService', async () => {
    mockPollService.addVote.mockResolvedValueOnce(undefined);
    mockPollService.deleteVote.mockResolvedValueOnce(undefined);

    await controller.addVote('poll-1', 'opt-1', mockUser);
    expect(mockPollService.addVote).toHaveBeenCalledWith('poll-1', 'opt-1', 'usr-1');

    await controller.deleteVote('poll-1', mockUser);
    expect(mockPollService.deleteVote).toHaveBeenCalledWith('poll-1', 'usr-1');
  });
});
