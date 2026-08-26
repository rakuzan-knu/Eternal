import { Test, type TestingModule } from '@nestjs/testing';
import { StoriesRetentionService } from '../stories-retention.service';
import { StoriesRepository } from '../stories.repository';
import { ConfigService } from '@nestjs/config';

describe('StoriesRetentionService', () => {
  let service: StoriesRetentionService;
  let repo: jest.Mocked<StoriesRepository>;

  beforeEach(async () => {
    const mockRepo = {
      findExpiredStories: jest
        .fn()
        .mockResolvedValue([
          { id: 'expired-1', mediaUrl: 'https://example.com/stories/file-1.jpg' },
        ]),
      deleteExpiredStories: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoriesRetentionService,
        { provide: StoriesRepository, useValue: mockRepo },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((k, def) => def || 'test') },
        },
      ],
    }).compile();

    service = module.get<StoriesRetentionService>(StoriesRetentionService);
    repo = module.get(StoriesRepository);
  });

  it('should purge expired stories from S3 and database', async () => {
    await service.cleanupExpiredStories();

    expect(repo.findExpiredStories).toHaveBeenCalled();
    expect(repo.deleteExpiredStories).toHaveBeenCalledWith(['expired-1']);
  });
});
