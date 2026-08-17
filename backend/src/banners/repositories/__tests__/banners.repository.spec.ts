import type { PrismaService } from '@common/prisma';
import { PrismaBannerRepository } from '../banners.repository';

describe('PrismaBannerRepository', () => {
  let repository: PrismaBannerRepository;
  let mockPrisma: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    repository = new PrismaBannerRepository(mockPrisma as unknown as PrismaService);
  });

  it('findById selects user banner and position', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'usr-1',
      banner: 'https://cdn.com/b.jpg',
      bannerPosition: 50,
    });

    const result = await repository.findById('usr-1');

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'usr-1' },
      select: { id: true, banner: true, bannerPosition: true },
    });
    expect(result?.banner).toBe('https://cdn.com/b.jpg');
    expect(result?.bannerPosition).toBe(50);
  });

  it('updateBanner updates user banner and bannerPosition in database', async () => {
    mockPrisma.user.update.mockResolvedValueOnce({
      id: 'usr-1',
      banner: 'https://cdn.com/new-banner.webp',
      bannerPosition: 30,
    });

    const result = await repository.updateBanner('usr-1', 'https://cdn.com/new-banner.webp', 30);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'usr-1' },
      data: { banner: 'https://cdn.com/new-banner.webp', bannerPosition: 30 },
      select: { id: true, banner: true, bannerPosition: true },
    });
    expect(result.banner).toBe('https://cdn.com/new-banner.webp');
  });
});
