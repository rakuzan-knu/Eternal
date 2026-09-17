import { Test, type TestingModule } from '@nestjs/testing';
import { LastSeenCoalescerService } from '../last-seen-coalescer.service';
import { USERS_REPOSITORY } from '../../interfaces/users-repository.interface';
import { RedisService } from '../../../redis/redis.service';

describe('LastSeenCoalescerService', () => {
  let service: LastSeenCoalescerService;
  let mockUsersRepo: { updateManyLastSeen: jest.Mock };
  let mockRedisService: { getClient: jest.Mock };
  let mockPipeline: { del: jest.Mock; exec: jest.Mock };

  beforeEach(async () => {
    mockPipeline = {
      del: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    mockRedisService = {
      getClient: jest.fn().mockReturnValue({
        pipeline: jest.fn().mockReturnValue(mockPipeline),
      }),
    };
    mockUsersRepo = {
      updateManyLastSeen: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LastSeenCoalescerService,
        { provide: USERS_REPOSITORY, useValue: mockUsersRepo },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<LastSeenCoalescerService>(LastSeenCoalescerService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('buffers multiple touchLastSeen calls and batch flushes', async () => {
    const t1 = new Date('2026-09-01T10:00:00.000Z');
    const t2 = new Date('2026-09-01T10:05:00.000Z');

    service.touchLastSeen('user-1', t1);
    service.touchLastSeen('user-1', t2); // should keep latest
    service.touchLastSeen('user-2', t1);

    await service.flush();

    expect(mockUsersRepo.updateManyLastSeen).toHaveBeenCalledWith([
      { id: 'user-1', lastSeenAt: t2 },
      { id: 'user-2', lastSeenAt: t1 },
    ]);

    expect(mockPipeline.del).toHaveBeenCalledWith('users:user-1');
    expect(mockPipeline.del).toHaveBeenCalledWith('users:user-2');
  });

  it('ignores empty user IDs', async () => {
    service.touchLastSeen('');
    await service.flush();
    expect(mockUsersRepo.updateManyLastSeen).not.toHaveBeenCalled();
  });
});
