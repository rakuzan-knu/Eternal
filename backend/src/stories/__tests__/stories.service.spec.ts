import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StoriesService } from '../stories.service';
import { StoriesRepository } from '../stories.repository';
import { PrismaService } from '@common/prisma';
import { RedisService } from '../../redis/redis.service';
import { ConversationsService } from '../../messenger/conversations/conversations.service';
import { MessagesService } from '../../messenger/messages/messages.service';
import { StoryMediaType, StoryPrivacy } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('StoriesService', () => {
  let service: StoriesService;
  let repo: jest.Mocked<StoriesRepository>;
  let redis: jest.Mocked<RedisService>;
  let convsService: jest.Mocked<ConversationsService>;
  let messagesService: jest.Mocked<MessagesService>;

  const mockAuthor = {
    id: 'user-1',
    username: 'alice',
    displayName: 'Alice Wonderland',
    avatar: 'https://example.com/avatar.jpg',
    isVerified: true,
  };

  const mockStory = {
    id: 'story-1',
    authorId: 'user-1',
    mediaUrl: 'https://example.com/story.jpg',
    mediaType: StoryMediaType.IMAGE,
    caption: 'Hello World',
    overlays: [
      {
        id: 'poll-1',
        type: 'poll',
        question: 'Do you like stories?',
        options: [{ text: 'Yes' }, { text: 'No' }],
        xPercent: 50,
        yPercent: 50,
        scale: 1,
        rotation: 0,
      },
    ],
    privacy: StoryPrivacy.ALL_FOLLOWERS,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000),
    author: mockAuthor,
    views: [{ viewerId: 'user-2', viewedAt: new Date() }],
    reactions: [{ userId: 'user-2', emoji: '🔥' }],
    pollVotes: [{ userId: 'user-2', optionIndex: 0 }],
  };

  beforeEach(async () => {
    const mockRepo = {
      createStory: jest.fn().mockResolvedValue(mockStory),
      findActiveFeedStories: jest.fn().mockResolvedValue([mockStory]),
      findActiveUserStories: jest.fn().mockResolvedValue([mockStory]),
      findById: jest.fn().mockResolvedValue(mockStory),
      recordView: jest.fn().mockResolvedValue({
        id: 'view-1',
        storyId: 'story-1',
        viewerId: 'user-2',
        viewedAt: new Date(),
      }),
      recordReaction: jest.fn().mockResolvedValue({
        id: 'react-1',
        storyId: 'story-1',
        userId: 'user-2',
        emoji: '❤️',
        createdAt: new Date(),
      }),
      recordPollVote: jest.fn().mockResolvedValue({
        id: 'vote-1',
        storyId: 'story-1',
        userId: 'user-2',
        optionIndex: 0,
        createdAt: new Date(),
      }),
      getStoryViewers: jest.fn().mockResolvedValue({ totalViews: 1, viewers: [] }),
      deleteStory: jest.fn().mockResolvedValue(true),
      getCloseFriends: jest.fn().mockResolvedValue([]),
      isCloseFriend: jest.fn().mockResolvedValue(false),
      getAuthorsWhoAddedViewerAsCloseFriend: jest.fn().mockResolvedValue([]),
      toggleCloseFriend: jest.fn().mockResolvedValue({ isCloseFriend: true }),
    };

    const mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      delByPattern: jest.fn().mockResolvedValue(undefined),
    };

    const mockConvs = {
      createDirect: jest.fn().mockResolvedValue({ id: 'conv-1' }),
    };

    const mockMessages = {
      send: jest.fn().mockResolvedValue({ id: 'msg-1', body: 'Nice story!' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoriesService,
        { provide: StoriesRepository, useValue: mockRepo },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn().mockResolvedValue(mockAuthor),
            },
            follow: {
              findMany: jest.fn().mockResolvedValue([{ followingId: 'user-2' }]),
            },
          },
        },
        { provide: RedisService, useValue: mockRedis },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((k, def) => def || 'test'),
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: ConversationsService, useValue: mockConvs },
        { provide: MessagesService, useValue: mockMessages },
      ],
    }).compile();

    service = module.get<StoriesService>(StoriesService);
    repo = module.get(StoriesRepository);
    redis = module.get(RedisService);
    convsService = module.get(ConversationsService);
    messagesService = module.get(MessagesService);
  });

  it('should create a story and invalidate Redis cache', async () => {
    const res = await service.createStory('user-1', {
      mediaType: 'IMAGE',
      caption: 'My First Story',
      backgroundColor: '#8b5cf6',
      privacy: 'ALL_FOLLOWERS',
    });

    expect(repo.createStory).toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalledWith('stories:feed:user-1');
    await new Promise((r) => setImmediate(r));
    expect(redis.delByPattern).toHaveBeenCalledWith('stories:feed:*');
    expect(res.id).toBe('story-1');
  });

  it('should get stories feed and sort current user and unviewed stories first', async () => {
    const feed = await service.getStoriesFeed('user-1');

    expect(repo.findActiveFeedStories).toHaveBeenCalled();
    expect(feed.length).toBeGreaterThan(0);
    expect(feed[0].user.id).toBe('user-1');
  });

  it('should record a view on a story', async () => {
    await service.recordView('story-1', 'user-2');

    expect(repo.recordView).toHaveBeenCalledWith('story-1', 'user-2');
    expect(redis.del).toHaveBeenCalledWith('stories:feed:user-2');
  });

  it('should record a reaction on a story', async () => {
    const res = await service.recordReaction('story-1', 'user-2', { emoji: '❤️' });

    expect(repo.recordReaction).toHaveBeenCalledWith('story-1', 'user-2', '❤️');
    expect(res.emoji).toBe('❤️');
  });

  it('should record a poll vote and return updated option percentages', async () => {
    const res = await service.recordPollVote('story-1', 'user-2', { optionIndex: 0 });

    expect(repo.recordPollVote).toHaveBeenCalledWith('story-1', 'user-2', 0);
    expect(res.question).toBe('Do you like stories?');
    expect(res.options[0].percentage).toBe(100);
  });

  it('should send a DM when replying to a story', async () => {
    const res = await service.replyToStory('story-1', 'user-2', { text: 'Love this!' });

    expect(convsService.createDirect).toHaveBeenCalledWith('user-2', { participantId: 'user-1' });
    expect(messagesService.send).toHaveBeenCalled();
    expect(res.conversationId).toBe('conv-1');
  });

  it('should throw error when author replies to their own story', async () => {
    await expect(
      service.replyToStory('story-1', 'user-1', { text: 'Replying to myself' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should delete a story if owned by user', async () => {
    const res = await service.deleteStory('story-1', 'user-1');

    expect(repo.deleteStory).toHaveBeenCalledWith('story-1', 'user-1');
    expect(res).toBe(true);
  });

  it('should reject deleting a story owned by someone else', async () => {
    await expect(service.deleteStory('story-1', 'user-stranger')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should toggle close friends', async () => {
    const res = await service.toggleCloseFriend('user-1', 'user-2');
    expect(repo.toggleCloseFriend).toHaveBeenCalledWith('user-1', 'user-2');
    expect(res.isCloseFriend).toBe(true);
  });
});
