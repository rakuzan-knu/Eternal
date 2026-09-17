import {
  BANNER_REPOSITORY,
  type BannerView,
  type IBannerRepository,
} from '../banners-repository.interface';

describe('banners-repository.interface', () => {
  it('defines BANNER_REPOSITORY symbol token', () => {
    expect(typeof BANNER_REPOSITORY).toBe('symbol');
    expect(BANNER_REPOSITORY.toString()).toBe('Symbol(BANNER_REPOSITORY)');
  });

  it('implements IBannerRepository interface', async () => {
    const mockRepo: IBannerRepository = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 'usr-1', banner: 'https://banner.com/1.jpg', bannerPosition: 50 }),
      updateBanner: jest
        .fn()
        .mockResolvedValue({ id: 'usr-1', banner: 'https://banner.com/2.jpg', bannerPosition: 70 }),
    };

    const banner: BannerView | null = await mockRepo.findById('usr-1');
    expect(banner?.bannerPosition).toBe(50);

    const updated = await mockRepo.updateBanner('usr-1', 'https://banner.com/2.jpg', 70);
    expect(updated.bannerPosition).toBe(70);
  });
});
