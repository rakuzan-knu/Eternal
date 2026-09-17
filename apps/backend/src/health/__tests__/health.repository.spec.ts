import type { PrismaService } from '@common/prisma';
import { HealthRepository } from '../health.repository';

describe('HealthRepository', () => {
  let repository: HealthRepository;
  let mockPrisma: {
    $queryRaw: jest.Mock;
  };

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: jest.fn(),
    };

    repository = new HealthRepository(mockPrisma as unknown as PrismaService);
  });

  it('pingDatabase returns true when query succeeds', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ 1: 1 }]);

    const result = await repository.pingDatabase();

    expect(result).toBe(true);
  });

  it('pingDatabase returns false when query fails', async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('DB connection failed'));

    const result = await repository.pingDatabase();

    expect(result).toBe(false);
  });
});
