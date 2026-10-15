import {
  pngImage,
  gifImage,
  sampleVideo,
  sampleAudio,
} from '../../common/media/__tests__/upload-fixtures';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { StoriesService } from '../stories.service';
import { StoriesRepository } from '../stories.repository';
import { PrismaService } from '@common/prisma';
import { RedisService } from '../../redis/redis.service';
import { ConversationsService } from '../../messenger/conversations/conversations.service';
import { MessagesService } from '../../messenger/messages/messages.service';
import { deleteFromStorage, uploadToStorageWithFallback } from '../../common/media/image-processor';
import { EventEmitter2 } from '@nestjs/event-emitter';

const StoryMediaType = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  VOICE: 'VOICE',
} as const;

const StoryPrivacy = {
  EVERYONE: 'EVERYONE',
  ALL_FOLLOWERS: 'ALL_FOLLOWERS',
  CLOSE_FRIENDS: 'CLOSE_FRIENDS',
} as const;

jest.mock('../../common/media/image-processor', () => ({
  deleteFromStorage: jest.fn().mockResolvedValue(undefined),
  optimizePostImage: jest.fn().mockResolvedValue({
    buffer: Buffer.from('opt-image'),
    contentType: 'image/webp',
    ext: 'webp',
  }),
  uploadToStorageWithFallback: jest.fn().mockResolvedValue('https://example.com/uploaded.webp'),
}));

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
    displayNameStyle: null,
    avatar: 'https://example.com/avatar.jpg',
    isVerified: true,
    activeDecoration: null,
  };

  const mockStory = {
    id: 'story-1',
    authorId: 'user-1',
    mediaUrl: 'https://example.com/story.jpg',
    mediaType: StoryMediaType.IMAGE,
    caption: 'Hello World',
    backgroundColor: null,
    filter: null,
    mediaAssets: null,
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
    views: [
      {
        id: 'view-1',
        storyId: 'story-1',
        viewerId: 'user-2',
        viewedAt: new Date(),
      },
    ],
    reactions: [
      {
        id: 'react-1',
        storyId: 'story-1',
        userId: 'user-2',
        emoji: '🔥',
        createdAt: new Date(),
      },
    ],
    pollVotes: [
      {
        id: 'vote-1',
        storyId: 'story-1',
        userId: 'user-2',
        optionIndex: 0,
        createdAt: new Date(),
      },
    ],
  };

  beforeEach(async () => {
    const mockRepo = {
      canView: jest.fn().mockResolvedValue(true),
      audienceAccess: jest.fn(async (stories: unknown[]) => stories.map(() => true)),
      canViewStoryAuthor: jest.fn().mockResolvedValue(true),
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
      getCloseFriends: jest.fn().mockResolvedValue([{ friend: mockAuthor }]),
      isCloseFriend: jest.fn().mockResolvedValue(false),
      getAuthorsWhoAddedViewerAsCloseFriend: jest.fn().mockResolvedValue([]),
      toggleCloseFriend: jest.fn().mockResolvedValue({ isCloseFriend: true }),
      getFollowingIds: jest.fn().mockResolvedValue(['user-1']),
      findUserBasic: jest.fn().mockResolvedValue({
        id: 'user-2',
        username: 'user_2',
        displayName: 'User 2',
        avatar: null,
      }),
    };

    const mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      delByPattern: jest.fn().mockResolvedValue(undefined),
      getOrSet: jest
        .fn()
        .mockImplementation(
          async (key: string, _ttl: number, loader: () => Promise<unknown>): Promise<unknown> => {
            const cached: string | null = (await mockRedis.get(key)) as string | null;
            if (cached) return JSON.parse(cached) as unknown;
            return loader();
          },
        ),
      getOrSetWithProbabilisticEarlyExpiration: jest
        .fn()
        .mockImplementation(
          async (key: string, _ttl: number, loader: () => Promise<unknown>): Promise<unknown> => {
            const cached: string | null = (await mockRedis.get(key)) as string | null;
            if (cached) return JSON.parse(cached) as unknown;
            return loader();
          },
        ),
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
            get: jest.fn((_k: string, def?: string) => def || 'test'),
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

  describe('processUploadedMedia', () => {
    it('classifies AVIF as an image, including compatible brands', async () => {
      for (const brand of ['avif', 'avis']) {
        const buffer = Buffer.alloc(24);
        buffer.writeUInt32BE(24, 0);
        buffer.write('ftyp', 4, 'ascii');
        buffer.write(brand, 8, 'ascii');
        expect(
          (await service.processUploadedMedia({ buffer } as Express.Multer.File)).mediaType,
        ).toBe('IMAGE');
      }
      const oversized = Buffer.alloc(11 * 1024 * 1024);
      oversized.writeUInt32BE(24, 0);
      oversized.write('ftyp', 4, 'ascii');
      oversized.write('iso8', 8, 'ascii');
      oversized.write('avif', 16, 'ascii');
      await expect(
        service.processUploadedMedia({ buffer: oversized } as Express.Multer.File),
      ).rejects.toThrow('Image size exceeds 10MB limit');
    });

    it('rejects unsupported HEIC before storing bytes under a WebP content type', async () => {
      jest.mocked(uploadToStorageWithFallback).mockClear();
      for (const brand of ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1']) {
        for (const compatible of [false, true]) {
          const buffer = Buffer.alloc(24);
          buffer.writeUInt32BE(24, 0);
          buffer.write('ftyp', 4, 'ascii');
          buffer.write(compatible ? 'iso8' : brand, 8, 'ascii');
          if (compatible) buffer.write(brand, 16, 'ascii');
          await expect(
            service.processUploadedMedia({ buffer } as Express.Multer.File),
          ).rejects.toThrow('Convert HEIC photos');
        }
      }
      expect(uploadToStorageWithFallback).not.toHaveBeenCalled();
    });

    it('detects and uploads PNG, WEBP, GIF, WEBM, and Voice audio', async () => {
      const pngBuf = pngImage;
      const webpBuf = Buffer.from('RIFF1234WEBPVP8 ');
      const gifBuf = gifImage;
      const webmBuf = await sampleVideo();
      const mp3Buf = await sampleAudio();

      expect(
        (await service.processUploadedMedia({ buffer: pngBuf } as Express.Multer.File)).mediaType,
      ).toBe('IMAGE');
      expect(
        (await service.processUploadedMedia({ buffer: webpBuf } as Express.Multer.File)).mediaType,
      ).toBe('IMAGE');
      expect(
        (await service.processUploadedMedia({ buffer: gifBuf } as Express.Multer.File)).mediaType,
      ).toBe('IMAGE');
      expect(
        (await service.processUploadedMedia({ buffer: webmBuf } as Express.Multer.File)).mediaType,
      ).toBe('VIDEO');
      expect(
        (await service.processUploadedMedia({ buffer: mp3Buf } as Express.Multer.File)).mediaType,
      ).toBe('VOICE');
    });

    it('enforces size limits for image, video, and audio', async () => {
      const hugeImage = {
        buffer: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(11 * 1024 * 1024)]),
      } as Express.Multer.File;
      await expect(service.processUploadedMedia(hugeImage)).rejects.toThrow(
        new BadRequestException('Image size exceeds 10MB limit'),
      );

      const hugeVideo = {
        buffer: Buffer.concat([
          Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
          Buffer.alloc(101 * 1024 * 1024),
        ]),
      } as Express.Multer.File;
      await expect(service.processUploadedMedia(hugeVideo)).rejects.toThrow(
        new BadRequestException('Media file is too large'),
      );

      const hugeVoice = {
        buffer: Buffer.concat([Buffer.from('ID3'), Buffer.alloc(26 * 1024 * 1024)]),
      } as Express.Multer.File;
      await expect(service.processUploadedMedia(hugeVoice)).rejects.toThrow(BadRequestException);
    });

    it('detects and uploads JPEG image', async () => {
      const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
      const file = {
        buffer: jpegBuf,
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const res = await service.processUploadedMedia(file);
      expect(res.mediaType).toBe('IMAGE');
      expect(res.url).toBe('https://example.com/uploaded.webp');
    });

    it('detects and uploads MP4 video', async () => {
      const mp4Buf = await sampleVideo();
      const file = {
        buffer: mp4Buf,
        originalname: 'clip.mp4',
        mimetype: 'video/mp4',
      } as Express.Multer.File;

      const res = await service.processUploadedMedia(file);
      expect(res.mediaType).toBe('VIDEO');
    });

    it('throws BadRequestException for empty or missing file', async () => {
      await expect(
        service.processUploadedMedia(null as unknown as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createStory & feeds', () => {
    it('creates a story with file or background color', async () => {
      const pngBuf = pngImage;
      const file = { buffer: pngBuf } as Express.Multer.File;

      const fileStory = await service.createStory('user-1', {}, file);
      expect(fileStory.id).toBe('story-1');

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

      await expect(service.createStory('user-1', {})).rejects.toThrow(
        new BadRequestException('Story media file or background is required'),
      );
    });

    it('gets stories feed from cache or database', async () => {
      const feed = await service.getStoriesFeed('user-1');
      expect(repo.findActiveFeedStories).toHaveBeenCalled();
      expect(feed.length).toBeGreaterThan(0);

      // Cached branch
      redis.get.mockResolvedValueOnce(JSON.stringify(feed));
      const cachedFeed = await service.getStoriesFeed('user-1');
      expect(cachedFeed).toHaveLength(feed.length);
    });

    it('gets user stories or returns null if none found', async () => {
      const userStories = await service.getUserStories('user-1', 'user-2');
      expect(userStories?.user.id).toBe('user-1');

      repo.findActiveUserStories.mockResolvedValueOnce([]);
      const empty = await service.getUserStories('user-none', 'user-2');
      expect(empty).toBeNull();
    });
  });

  describe('interactions: view, reaction, poll, reply', () => {
    it('records a view on a story', async () => {
      await service.recordView('story-1', 'user-2');

      expect(repo.recordView).toHaveBeenCalledWith('story-1', 'user-2');
      expect(redis.del).toHaveBeenCalledWith('stories:feed:user-2');
    });

    it('records a reaction on a story', async () => {
      const res = await service.recordReaction('story-1', 'user-2', { emoji: '❤️' });

      expect(repo.recordReaction).toHaveBeenCalledWith('story-1', 'user-2', '❤️');
      expect(res.emoji).toBe('❤️');
    });

    it('records a poll vote and validates overlays and option indices', async () => {
      const res = await service.recordPollVote('story-1', 'user-2', { optionIndex: 0 });

      expect(repo.recordPollVote).toHaveBeenCalledWith('story-1', 'user-2', 0);
      expect(res.question).toBe('Do you like stories?');
      expect(res.options[0].percentage).toBe(100);

      // Missing poll overlay
      repo.findById.mockResolvedValueOnce({ ...mockStory, overlays: [] });
      await expect(service.recordPollVote('story-1', 'user-2', { optionIndex: 0 })).rejects.toThrow(
        new BadRequestException('Story does not have a poll'),
      );

      // Invalid option index
      repo.findById.mockResolvedValueOnce(mockStory);
      await expect(
        service.recordPollVote('story-1', 'user-2', { optionIndex: 99 }),
      ).rejects.toThrow(new BadRequestException('Invalid poll option index'));
    });

    it('sends a DM when replying to a story', async () => {
      const res = await service.replyToStory('story-1', 'user-2', { text: 'Love this!' });

      expect(convsService.createDirect).toHaveBeenCalledWith('user-2', { participantId: 'user-1' });
      expect(messagesService.send).toHaveBeenCalled();
      expect(res.conversationId).toBe('conv-1');
    });

    it('throws error when author replies to their own story', async () => {
      await expect(
        service.replyToStory('story-1', 'user-1', { text: 'Replying to myself' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('viewers, delete, close friends', () => {
    it('gets story viewers only if requesting user is author', async () => {
      const viewers = await service.getStoryViewers('story-1', 'user-1');
      expect(viewers.totalViews).toBe(1);

      await expect(service.getStoryViewers('story-1', 'user-stranger')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deletes a story if owned by user', async () => {
      const res = await service.deleteStory('story-1', 'user-1');

      expect(repo.deleteStory).toHaveBeenCalledWith('story-1', 'user-1');
      expect(res).toBe(true);
    });

    it('rejects deleting a story owned by someone else', async () => {
      await expect(service.deleteStory('story-1', 'user-stranger')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('gets close friends and toggles close friend', async () => {
      const friends = await service.getCloseFriends('user-1');
      expect(friends).toHaveLength(1);

      const res = await service.toggleCloseFriend('user-1', 'user-2');
      expect(repo.toggleCloseFriend).toHaveBeenCalledWith('user-1', 'user-2');
      expect(res.isCloseFriend).toBe(true);

      await expect(service.toggleCloseFriend('user-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
  it('persists appearance and distinct server-owned photo sticker URLs', async () => {
    const main = {
      fieldname: 'file',
      buffer: Buffer.from([255, 216, 255]),
      mimetype: 'image/jpeg',
    } as Express.Multer.File;
    const sticker = { ...main, fieldname: 'overlay:sticker' };
    jest
      .mocked(uploadToStorageWithFallback)
      .mockResolvedValueOnce('https://assets.test/stories/main.webp')
      .mockResolvedValueOnce('https://assets.test/stories/sticker.webp');
    await service.createStory(
      'user-1',
      {
        backgroundColor: 'linear-gradient(180deg, #181824 0%, #09090b 100%)',
        filter: 'tokyo',
        overlays: [
          { id: 'main', type: 'image', isMainMedia: true, xPercent: 50, yPercent: 50 },
          { id: 'sticker', type: 'image', xPercent: 30, yPercent: 65 },
        ],
      },
      main,
      [sticker],
    );
    const backgroundColor: unknown = expect.stringContaining('linear-gradient');
    const overlays: unknown = expect.arrayContaining([
      expect.objectContaining({ id: 'main', url: 'https://assets.test/stories/main.webp' }),
      expect.objectContaining({ id: 'sticker', url: 'https://assets.test/stories/sticker.webp' }),
    ]);
    expect(repo.createStory).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: 'tokyo',
        backgroundColor,
        mediaAssets: [
          'https://assets.test/stories/main.webp',
          'https://assets.test/stories/sticker.webp',
        ],
        overlays,
      }),
    );
  });
  it('removes every uploaded asset when persistence fails', async () => {
    jest.mocked(deleteFromStorage).mockClear();
    repo.createStory.mockRejectedValueOnce(new Error('DB unavailable'));
    const file = { buffer: Buffer.from([255, 216, 255]), fieldname: 'file' } as Express.Multer.File;
    await expect(service.createStory('user-1', {}, file)).rejects.toThrow('DB unavailable');
    expect(deleteFromStorage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ url: 'https://example.com/uploaded.webp' }),
    );
  });
  it('rejects unknown media and executable MIME headers before storage', async () => {
    jest.mocked(uploadToStorageWithFallback).mockClear();
    await expect(
      service.processUploadedMedia({
        buffer: Buffer.from('<script>bad()</script>'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
    expect(uploadToStorageWithFallback).not.toHaveBeenCalled();
    await service.processUploadedMedia({
      buffer: await sampleAudio(),
      mimetype: 'text/html',
    } as Express.Multer.File);
    expect(uploadToStorageWithFallback).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ contentType: 'audio/wav' }),
    );
  });
  it('rejects photo stickers without a matching upload before storing the main file', async () => {
    jest.mocked(uploadToStorageWithFallback).mockClear();
    await expect(
      service.createStory(
        'user-1',
        { overlays: [{ id: 'missing', type: 'image', xPercent: 50, yPercent: 50 }] },
        { buffer: Buffer.from([255, 216, 255]) } as Express.Multer.File,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(uploadToStorageWithFallback).not.toHaveBeenCalled();
  });
  it('protects close friends, expired and inaccessible stories on interaction routes', async () => {
    repo.findById.mockResolvedValueOnce({ ...mockStory, privacy: 'CLOSE_FRIENDS' });
    await expect(service.recordReaction('story-1', 'user-2', { emoji: '🔥' })).rejects.toThrow(
      ForbiddenException,
    );
    repo.findById.mockResolvedValueOnce({ ...mockStory, expiresAt: new Date(0) });
    await expect(service.recordView('story-1', 'user-2')).rejects.toThrow('expired');
    repo.canViewStoryAuthor.mockResolvedValue(false);
    await expect(service.recordPollVote('story-1', 'user-2', { optionIndex: 0 })).rejects.toThrow(
      ForbiddenException,
    );
    expect(repo.recordPollVote).not.toHaveBeenCalled();
    expect(await service.getUserStories('user-1', 'user-2')).toBeNull();
  });
});
