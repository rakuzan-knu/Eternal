import { Test, type TestingModule } from '@nestjs/testing';
import { StoriesRetentionService } from '../stories-retention.service';
import { StoriesRepository } from '../stories.repository';
import { ConfigService } from '@nestjs/config';
import { deleteFromStorage } from '../../common/media/image-processor';

vi.mock('../../common/media/image-processor', () => ({
  deleteFromStorage: vi.fn().mockResolvedValue(undefined),
}));

describe('StoriesRetentionService', () => {
  let service: StoriesRetentionService;
  let repo: jest.Mocked<StoriesRepository>;

  beforeEach(async () => {
    vi.mocked(deleteFromStorage).mockReset().mockResolvedValue(undefined);
    const mockRepo = {
      findExpiredStories: jest
        .fn()
        .mockResolvedValue([
          { id: 'expired-1', mediaUrl: 'https://example.com/stories/file-1.jpg' },
        ]),
      isMediaReferenced: jest.fn().mockResolvedValue(false),
      deleteExpiredStories: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoriesRetentionService,
        { provide: StoriesRepository, useValue: mockRepo },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_k: string, def?: string) => def || 'test') },
        },
      ],
    }).compile();

    service = module.get<StoriesRetentionService>(StoriesRetentionService);
    repo = module.get(StoriesRepository);
  });

  afterEach(() => service.onModuleDestroy());

  it('should purge expired stories from S3 and database', async () => {
    await service.cleanupExpiredStories();

    expect(repo.findExpiredStories).toHaveBeenCalled();
    expect(repo.deleteExpiredStories).toHaveBeenCalledWith(['expired-1']);
    expect(repo.findExpiredStories).toHaveBeenCalledWith(100);
    expect(deleteFromStorage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ strict: true }),
    );
  });

  it('keeps failed cleanup references for a later retry', async () => {
    vi.mocked(deleteFromStorage).mockRejectedValueOnce(new Error('storage unavailable'));
    await service.cleanupExpiredStories();
    expect(repo.deleteExpiredStories).not.toHaveBeenCalled();
    await service.cleanupExpiredStories();
    expect(repo.deleteExpiredStories).toHaveBeenLastCalledWith(['expired-1']);
  });

  it('retains files referenced by another story', async () => {
    repo.isMediaReferenced.mockResolvedValue(true);
    await service.cleanupExpiredStories();
    expect(repo.isMediaReferenced).toHaveBeenCalledWith('https://example.com/stories/file-1.jpg', [
      'expired-1',
    ]);
    expect(deleteFromStorage).not.toHaveBeenCalled();
    expect(repo.deleteExpiredStories).toHaveBeenCalledWith(['expired-1']);
  });

  it('deletes only records whose storage cleanup completed', async () => {
    repo.findExpiredStories.mockResolvedValueOnce([
      { id: 'expired-1', mediaUrl: 'https://example.com/stories/file-1.jpg', mediaAssets: null },
      { id: 'expired-2', mediaUrl: 'https://example.com/stories/file-2.jpg', mediaAssets: null },
    ]);
    vi.mocked(deleteFromStorage).mockRejectedValueOnce(new Error('storage unavailable'));
    await service.cleanupExpiredStories();
    expect(repo.deleteExpiredStories).toHaveBeenCalledWith(['expired-2']);
  });

  it('deletes a shared object only after the last expired story reference', async () => {
    repo.findExpiredStories.mockResolvedValueOnce([
      { id: 'expired-1', mediaUrl: 'https://example.com/shared.jpg', mediaAssets: null },
      { id: 'expired-2', mediaUrl: 'https://example.com/shared.jpg', mediaAssets: null },
    ]);
    const remaining = new Set(['expired-1', 'expired-2']);
    repo.isMediaReferenced.mockImplementation(async (_url, excluded = []) =>
      [...remaining].some((id) => !excluded.includes(id)),
    );
    repo.deleteExpiredStories.mockImplementation(async (ids) => {
      ids.forEach((id) => remaining.delete(id));
      return ids.length;
    });
    await service.cleanupExpiredStories();
    expect(deleteFromStorage).toHaveBeenCalledTimes(1);
    expect(remaining.size).toBe(0);
  });
});
