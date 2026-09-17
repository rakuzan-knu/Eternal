export interface BannerView {
  id: string;
  banner: string | null;
  bannerPosition: number;
}

export interface IBannerRepository {
  findById(userId: string): Promise<BannerView | null>;
  updateBanner(userId: string, banner: string | null, bannerPosition?: number): Promise<BannerView>;
}

export const BANNER_REPOSITORY = Symbol('BANNER_REPOSITORY');
