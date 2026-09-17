import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import { IBannerRepository, BannerView } from '../interfaces/banners-repository.interface';

@Injectable()
export class PrismaBannerRepository implements IBannerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string): Promise<BannerView | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, banner: true, bannerPosition: true },
    });
  }

  async updateBanner(
    userId: string,
    banner: string | null,
    bannerPosition?: number,
  ): Promise<BannerView> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        banner,
        ...(bannerPosition !== undefined ? { bannerPosition } : {}),
      },
      select: { id: true, banner: true, bannerPosition: true },
    });
  }
}
