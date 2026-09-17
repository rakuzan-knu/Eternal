import { Test, type TestingModule } from '@nestjs/testing';
import { StoriesController } from '../stories.controller';
import { StoriesService } from '../stories.service';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';

describe('StoriesController', () => {
  let controller: StoriesController;
  let service: jest.Mocked<StoriesService>;

  const mockUser: RequestUser = {
    id: 'user-1',
    email: 'alice@example.com',
    username: 'alice',
  };

  beforeEach(async () => {
    const mockService = {
      getStoriesFeed: jest.fn().mockResolvedValue([]),
      getUserStories: jest.fn().mockResolvedValue(null),
      createStory: jest.fn().mockResolvedValue({ id: 'story-1' }),
      recordView: jest.fn().mockResolvedValue(undefined),
      recordReaction: jest.fn().mockResolvedValue({ emoji: '🔥' }),
      recordPollVote: jest.fn().mockResolvedValue({ totalVotes: 1 }),
      replyToStory: jest.fn().mockResolvedValue({ conversationId: 'conv-1' }),
      getStoryViewers: jest.fn().mockResolvedValue({ totalViews: 0, viewers: [] }),
      deleteStory: jest.fn().mockResolvedValue(true),
      getCloseFriends: jest.fn().mockResolvedValue([]),
      toggleCloseFriend: jest.fn().mockResolvedValue({ isCloseFriend: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoriesController],
      providers: [{ provide: StoriesService, useValue: mockService }],
    }).compile();

    controller = module.get<StoriesController>(StoriesController);
    service = module.get(StoriesService);
  });

  it('should get stories feed', async () => {
    await controller.getFeed(mockUser);
    expect(service.getStoriesFeed).toHaveBeenCalledWith('user-1');
  });

  it('should get user stories', async () => {
    await controller.getUserStories('user-2', mockUser);
    expect(service.getUserStories).toHaveBeenCalledWith('user-2', 'user-1');
  });

  it('should create story', async () => {
    await controller.createStory(mockUser, undefined, { caption: 'Hi', overlays: '[]' });
    expect(service.createStory).toHaveBeenCalled();
  });

  it('should view story', async () => {
    const res = await controller.viewStory('story-1', mockUser);
    expect(service.recordView).toHaveBeenCalledWith('story-1', 'user-1');
    expect(res).toEqual({ success: true });
  });

  it('should react to story', async () => {
    await controller.reactToStory('story-1', mockUser, { emoji: '🔥' });
    expect(service.recordReaction).toHaveBeenCalledWith('story-1', 'user-1', { emoji: '🔥' });
  });

  it('should vote on poll', async () => {
    await controller.votePoll('story-1', mockUser, { optionIndex: 1 });
    expect(service.recordPollVote).toHaveBeenCalledWith('story-1', 'user-1', { optionIndex: 1 });
  });

  it('should reply to story', async () => {
    await controller.replyToStory('story-1', mockUser, { text: 'Great story' });
    expect(service.replyToStory).toHaveBeenCalledWith('story-1', 'user-1', { text: 'Great story' });
  });

  it('should delete story', async () => {
    const res = await controller.deleteStory('story-1', mockUser);
    expect(service.deleteStory).toHaveBeenCalledWith('story-1', 'user-1');
    expect(res).toEqual({ success: true });
  });
});
