import { StoriesRepository } from '../stories.repository';
import type { PrismaService } from '@common/prisma';
import { StoryMediaType, StoryPrivacy } from '@prisma/client';

describe('StoriesRepository', () => {
  let repository: StoriesRepository;
  let prisma: {
    story: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    storyView: {
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
    storyReaction: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    storyPollVote: {
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
    closeFriend: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
  };

  const mockDate = new Date();
  const mockStory = {
    id: 'story-1',
    authorId: 'author-1',
    mediaUrl: 'https://example.com/story.mp4',
    mediaType: StoryMediaType.VIDEO,
    caption: 'My Story',
    overlays: {},
    privacy: StoryPrivacy.ALL_FOLLOWERS,
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: mockDate,
    author: {
      id: 'author-1',
      username: 'storyteller',
      displayName: 'Story Teller',
      avatar: 'avatar.jpg',
      isVerified: true,
    },
    views: [],
    reactions: [],
    pollVotes: [],
  };

  beforeEach(() => {
    prisma = {
      story: {
        create: jest.fn().mockResolvedValue(mockStory),
        findMany: jest.fn().mockResolvedValue([mockStory]),
        findUnique: jest.fn().mockResolvedValue(mockStory),
        findFirst: jest.fn().mockResolvedValue(mockStory),
        delete: jest.fn().mockResolvedValue(mockStory),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      storyView: {
        upsert: jest.fn().mockResolvedValue({ storyId: 'story-1', viewerId: 'viewer-1' }),
        findMany: jest.fn().mockResolvedValue([
          {
            storyId: 'story-1',
            viewerId: 'viewer-1',
            viewedAt: mockDate,
            viewer: {
              id: 'viewer-1',
              username: 'viewer',
              displayName: 'Viewer',
              avatar: null,
              isVerified: false,
            },
          },
        ]),
      },
      storyReaction: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([{ userId: 'viewer-1', emoji: '🔥' }]),
        create: jest
          .fn()
          .mockResolvedValue({ id: 'r-1', storyId: 'story-1', userId: 'viewer-1', emoji: '🔥' }),
        update: jest.fn().mockResolvedValue({ id: 'r-1', emoji: '❤️' }),
        delete: jest.fn().mockResolvedValue({ id: 'r-1' }),
      },
      storyPollVote: {
        upsert: jest
          .fn()
          .mockResolvedValue({ storyId: 'story-1', userId: 'viewer-1', optionIndex: 0 }),
        findMany: jest.fn().mockResolvedValue([{ userId: 'viewer-1', optionIndex: 1 }]),
      },
      closeFriend: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'cf-1', userId: 'author-1', friendId: 'viewer-1' }]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'cf-1', userId: 'user-1', friendId: 'friend-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'cf-1' }),
      },
    };

    repository = new StoriesRepository(prisma as unknown as PrismaService);
  });

  it('creates story with complete data', async () => {
    const res = await repository.createStory({
      authorId: 'author-1',
      mediaUrl: 'https://example.com/story.mp4',
      mediaType: StoryMediaType.VIDEO,
      privacy: StoryPrivacy.ALL_FOLLOWERS,
      expiresAt: mockStory.expiresAt,
    });
    expect(res).toEqual(mockStory);
    expect(prisma.story.create).toHaveBeenCalled();
  });

  it('finds active feed stories with close friends and follower scopes', async () => {
    const res = await repository.findActiveFeedStories('viewer-1', ['author-1'], ['author-1']);
    expect(res).toEqual([mockStory]);
    expect(prisma.story.findMany).toHaveBeenCalled();
  });

  it('finds active user stories for owner, close friend, and public scopes', async () => {
    await repository.findActiveUserStories('author-1', 'author-1');
    expect(prisma.story.findMany).toHaveBeenCalled();

    await repository.findActiveUserStories('author-1', 'viewer-1', true);
    expect(prisma.story.findMany).toHaveBeenCalled();

    await repository.findActiveUserStories('author-1', 'viewer-1', false);
    expect(prisma.story.findMany).toHaveBeenCalled();
  });

  it('finds story by id', async () => {
    const res = await repository.findById('story-1');
    expect(res).toEqual(mockStory);
  });

  it('records story view', async () => {
    const res = await repository.recordView('story-1', 'viewer-1');
    expect(res.storyId).toBe('story-1');
  });

  it('records reaction with new emoji, updated emoji, and toggle-off delete', async () => {
    // 1. New reaction
    await repository.recordReaction('story-1', 'viewer-1', '🔥');
    expect(prisma.storyReaction.create).toHaveBeenCalled();

    // 2. Different emoji on existing
    prisma.storyReaction.findFirst.mockResolvedValueOnce({ id: 'r-1', emoji: '❤️' });
    await repository.recordReaction('story-1', 'viewer-1', '🔥');
    expect(prisma.storyReaction.update).toHaveBeenCalled();

    // 3. Same emoji toggles off (deletes)
    prisma.storyReaction.findFirst.mockResolvedValueOnce({ id: 'r-1', emoji: '🔥' });
    await repository.recordReaction('story-1', 'viewer-1', '🔥');
    expect(prisma.storyReaction.delete).toHaveBeenCalledWith({ where: { id: 'r-1' } });
  });

  it('records poll vote', async () => {
    const res = await repository.recordPollVote('story-1', 'viewer-1', 2);
    expect(res.optionIndex).toBe(0);
    expect(prisma.storyPollVote.upsert).toHaveBeenCalled();
  });

  it('gets story viewers with mapped reactions and poll votes', async () => {
    const res = await repository.getStoryViewers('story-1');
    expect(res.totalViews).toBe(1);
    expect(res.viewers[0].reaction).toBe('🔥');
    expect(res.viewers[0].pollVoteOption).toBe(1);
  });

  it('deletes story when author matches', async () => {
    const ok = await repository.deleteStory('story-1', 'author-1');
    expect(ok).toBe(true);

    prisma.story.findFirst.mockResolvedValueOnce(null);
    const fail = await repository.deleteStory('story-1', 'author-2');
    expect(fail).toBe(false);
  });

  it('finds and deletes expired stories', async () => {
    await repository.findExpiredStories();
    expect(prisma.story.findMany).toHaveBeenCalled();

    const emptyCount = await repository.deleteExpiredStories([]);
    expect(emptyCount).toBe(0);

    const count = await repository.deleteExpiredStories(['s-1', 's-2']);
    expect(count).toBe(2);
  });

  it('manages close friends (get, isCloseFriend, getAuthorsWhoAddedViewerAsCloseFriend, toggle)', async () => {
    await repository.getCloseFriends('user-1');
    expect(prisma.closeFriend.findMany).toHaveBeenCalled();

    prisma.closeFriend.findUnique.mockResolvedValueOnce({ id: 'cf-1' });
    expect(await repository.isCloseFriend('u-1', 'f-1')).toBe(true);

    expect(await repository.getAuthorsWhoAddedViewerAsCloseFriend('v-1', [])).toEqual([]);
    prisma.closeFriend.findMany.mockResolvedValueOnce([{ userId: 'a-1' }]);
    expect(await repository.getAuthorsWhoAddedViewerAsCloseFriend('v-1', ['a-1'])).toEqual(['a-1']);

    // Toggle: add
    prisma.closeFriend.findUnique.mockResolvedValueOnce(null);
    const added = await repository.toggleCloseFriend('u-1', 'f-1');
    expect(added.isCloseFriend).toBe(true);

    // Toggle: remove
    prisma.closeFriend.findUnique.mockResolvedValueOnce({ id: 'cf-1' });
    const removed = await repository.toggleCloseFriend('u-1', 'f-1');
    expect(removed.isCloseFriend).toBe(false);
  });
});
