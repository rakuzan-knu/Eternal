import { Test, type TestingModule } from '@nestjs/testing';
import { PostStatsCoalescerService } from '../post-stats-coalescer.service';
import { POSTS_REPOSITORY } from '../../interfaces/posts-repository.interface';

describe('PostStatsCoalescerService', () => {
  let service: PostStatsCoalescerService;
  let mockPostsRepo: { incrementManyShareCounts: jest.Mock };

  beforeEach(async () => {
    mockPostsRepo = {
      incrementManyShareCounts: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostStatsCoalescerService,
        { provide: POSTS_REPOSITORY, useValue: mockPostsRepo },
      ],
    }).compile();

    service = module.get<PostStatsCoalescerService>(PostStatsCoalescerService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('aggregates share count increments for the same post and flushes in batch', async () => {
    service.incrementShareCount('post-1', 1);
    service.incrementShareCount('post-1', 2);
    service.incrementShareCount('post-2', 1);

    await service.flush();

    expect(mockPostsRepo.incrementManyShareCounts).toHaveBeenCalledWith([
      { postId: 'post-1', count: 3 },
      { postId: 'post-2', count: 1 },
    ]);
  });

  it('ignores invalid post ID or delta <= 0', async () => {
    service.incrementShareCount('', 1);
    service.incrementShareCount('post-1', 0);
    service.incrementShareCount('post-1', -5);

    await service.flush();

    expect(mockPostsRepo.incrementManyShareCounts).not.toHaveBeenCalled();
  });
});
