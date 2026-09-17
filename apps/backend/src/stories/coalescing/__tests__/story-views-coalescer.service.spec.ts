import { Test, type TestingModule } from '@nestjs/testing';
import { StoryViewsCoalescerService } from '../story-views-coalescer.service';
import { StoriesRepository } from '../../stories.repository';

describe('StoryViewsCoalescerService', () => {
  let service: StoryViewsCoalescerService;
  let mockStoriesRepo: { recordManyViews: jest.Mock };

  beforeEach(async () => {
    mockStoriesRepo = {
      recordManyViews: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoryViewsCoalescerService,
        { provide: StoriesRepository, useValue: mockStoriesRepo },
      ],
    }).compile();

    service = module.get<StoryViewsCoalescerService>(StoryViewsCoalescerService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('buffers and flushes story views in micro-batches', async () => {
    const d1 = new Date('2026-09-01T10:00:00.000Z');
    const d2 = new Date('2026-09-01T10:01:00.000Z');

    service.recordView('story-1', 'viewer-1', d1);
    service.recordView('story-1', 'viewer-2', d2);

    await service.flush();

    expect(mockStoriesRepo.recordManyViews).toHaveBeenCalledWith([
      { storyId: 'story-1', viewerId: 'viewer-1', viewedAt: d1 },
      { storyId: 'story-1', viewerId: 'viewer-2', viewedAt: d2 },
    ]);
  });

  it('ignores invalid story or viewer ID', async () => {
    service.recordView('', 'viewer-1');
    service.recordView('story-1', '');

    await service.flush();

    expect(mockStoriesRepo.recordManyViews).not.toHaveBeenCalled();
  });
});
