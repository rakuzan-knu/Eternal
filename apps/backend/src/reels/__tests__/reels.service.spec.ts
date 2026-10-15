import { ReelsService } from '../reels.service';
import type { IReelsRepository, ReelWithAuthor } from '../interfaces/reels-repository.interface';
import type { S3Client } from '@aws-sdk/client-s3';
import type { ConfigService } from '@nestjs/config';
import type { RedisService } from '../../redis/redis.service';
import type { QueueService } from '../../queue/queue.service';
import * as imageProcessor from '../../common/media/image-processor';
import { Readable } from 'node:stream';

describe('ReelsService', () => {
  let service: ReelsService;
  let mockRepo: jest.Mocked<IReelsRepository>;
  let mockS3: jest.Mocked<S3Client>;
  let mockConfig: jest.Mocked<ConfigService>;
  let mockRedis: jest.Mocked<RedisService>;
  let mockQueue: jest.Mocked<QueueService>;

  const sampleReel: ReelWithAuthor = {
    id: 'reel-1',
    authorId: 'author-1',
    caption: 'Test reel',
    videoUrl: 'https://example.com/video.mp4',
    hlsUrl: 'https://example.com/video.m3u8',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    blurhash: 'LEHV6n0000000000',
    thumbhash: null,
    duration: 15.5,
    width: 1080,
    height: 1920,
    audioTitle: 'Hit Song',
    audioArtist: 'Star',
    audioUrl: null,
    viewsCount: 10,
    likesCount: 5,
    commentsCount: 2,
    sharesCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: {
      id: 'author-1',
      username: 'creator',
      displayName: 'Creator',
      avatar: null,
      isVerified: true,
      followers: [{ followerId: 'viewer-1' }],
    },
    likes: [{ userId: 'viewer-1' }],
  };

  beforeEach(() => {
    mockRepo = {
      findAllPaginated: jest.fn().mockResolvedValue([sampleReel]),
      findByUserId: jest.fn().mockResolvedValue([sampleReel]),
      findById: jest.fn().mockResolvedValue(sampleReel),
      create: jest.fn().mockResolvedValue(sampleReel),
      update: jest.fn().mockResolvedValue(sampleReel),
      delete: jest.fn().mockResolvedValue(undefined),
      toggleLike: jest.fn().mockResolvedValue({ liked: true, likesCount: 6 }),
      incrementViews: jest.fn().mockResolvedValue(undefined),
      incrementShares: jest.fn().mockResolvedValue(undefined),
      addComment: jest.fn(),
      findComments: jest.fn().mockResolvedValue([]),
      reportReel: jest.fn().mockResolvedValue(undefined),
    };

    mockS3 = {} as unknown as jest.Mocked<S3Client>;
    mockConfig = {
      get: jest
        .fn()
        .mockImplementation((key: string) =>
          key === 'VIDEO_TRANSCODE_ENABLED' ? 'true' : 'test-value',
        ),
    } as unknown as jest.Mocked<ConfigService>;

    const mockRedisClient = {
      set: jest.fn().mockResolvedValue('OK'),
    };
    mockRedis = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
      delByPattern: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RedisService>;

    mockQueue = {
      addVideoTranscodeJob: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<QueueService>;

    service = new ReelsService(mockRepo, mockS3, mockConfig, mockRedis, mockQueue);
    Object.assign(service, {
      directUploads: {
        assertLegacyAllowed: jest.fn(),
        assertOwnedUrl: jest.fn().mockResolvedValue(undefined),
        resolve: jest.fn().mockResolvedValue({
          uploadId: 'completed-id',
          url: 'https://example.com/source.mp4',
          contentType: 'video/mp4',
          sizeBytes: 100,
          kind: 'VIDEO',
          duration: 5,
          width: 640,
          height: 360,
        }),
      },
    });
  });

  it('getFeed returns paginated reels with mapped DTO fields', async () => {
    const result = await service.getFeed(10, undefined, 'viewer-1');

    expect(mockRepo.findAllPaginated).toHaveBeenCalledWith(15, undefined, 'viewer-1');
    expect(result.data.length).toBe(1);
    expect(result.data[0].id).toBe('reel-1');
    expect(result.data[0].isLiked).toBe(true);
    expect(result.data[0].author.username).toBe('creator');
    expect(result.data[0].author.isFollowing).toBe(true);
  });

  it('toggleLike calls repository and returns result', async () => {
    const result = await service.toggleLike('reel-1', 'user-1');

    expect(mockRepo.findById).toHaveBeenCalledWith('reel-1');
    expect(mockRepo.toggleLike).toHaveBeenCalledWith('reel-1', 'user-1');
    expect(result.liked).toBe(true);
  });

  it('recordView debounces with Redis and increments views', async () => {
    const result = await service.recordView('reel-1', 'viewer-ip-1');

    expect(mockRedis.getClient).toHaveBeenCalled();
    expect(mockRepo.incrementViews).toHaveBeenCalledWith('reel-1');
    expect(result.counted).toBe(true);
  });

  it('createReel saves reel and dispatches BullMQ transcode job', async () => {
    const result = await service.createReel('author-1', {
      caption: 'Brand new short',
      uploadId: '11111111-1111-4111-8111-111111111111',
    });

    expect(mockRepo.create).toHaveBeenCalled();
    expect(mockQueue.addVideoTranscodeJob).toHaveBeenCalledWith(
      expect.objectContaining({
        reelId: 'reel-1',
        videoUrl: sampleReel.videoUrl,
      }),
      { jobId: 'reel-reel-1' },
    );
    expect(result.id).toBe('reel-1');
  });

  it('queues uploaded videos by storage key without copying their bytes into Redis', async () => {
    const upload = jest
      .spyOn(imageProcessor, 'uploadToStorageWithFallback')
      .mockResolvedValue(sampleReel.videoUrl);
    const buffer = Buffer.from('video-source');
    const file: Express.Multer.File = {
      fieldname: 'video',
      originalname: 'clip.mp4',
      encoding: '7bit',
      mimetype: 'video/mp4',
      size: buffer.length,
      stream: Readable.from([buffer]),
      destination: '',
      filename: '',
      path: '',
      buffer,
    };

    await service.createReel('author-1', { caption: 'Uploaded clip' }, file);

    expect(mockQueue.addVideoTranscodeJob).toHaveBeenCalledWith(
      {
        reelId: 'reel-1',
        videoUrl: sampleReel.videoUrl,
        sourceStorageKey: upload.mock.calls[0][1].key,
      },
      { jobId: 'reel-reel-1' },
    );
    expect(mockQueue.addVideoTranscodeJob.mock.calls[0][0].sourceStorageKey).toMatch(
      /^reels\/[a-z0-9_-]+\.mp4$/i,
    );
    expect(mockQueue.addVideoTranscodeJob.mock.calls[0][0]).not.toHaveProperty(
      'sourceBufferBase64',
    );
    upload.mockRestore();
  });

  it('does not put a development data URI fallback into Redis', async () => {
    mockRepo.create.mockResolvedValue({ ...sampleReel, videoUrl: 'data:video/mp4;base64,YQ==' });

    await service.createReel('author-1', { uploadId: '11111111-1111-4111-8111-111111111111' });

    expect(mockQueue.addVideoTranscodeJob).not.toHaveBeenCalled();
  });
});
