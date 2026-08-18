import { Injectable, Inject, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { S3Client } from '@aws-sdk/client-s3';
import { BANNER_S3_CLIENT } from './s3-provider';
import { BANNER_REPOSITORY } from './interfaces/banners-repository.interface';
import type { IBannerRepository, BannerView } from './interfaces/banners-repository.interface';
import { RedisService } from '../redis/redis.service';
import {
  optimizeBanner,
  uploadToStorageWithFallback,
  deleteFromStorage,
} from '../common/media/image-processor';

@Injectable()
export class BannersService {
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    @Inject(BANNER_S3_CLIENT) private readonly s3: S3Client,
    @Inject(BANNER_REPOSITORY) private readonly bannerRepository: IBannerRepository,
    private readonly configService: ConfigService,
    @Optional() private readonly redis?: RedisService,
  ) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'avatars');
    this.publicUrl =
      this.configService.get<string>('MINIO_PUBLIC_URL') ??
      this.configService.get<string>('S3_PUBLIC_URL') ??
      'http://localhost:9000';
  }

  async uploadBanner(
    userId: string,
    file: Express.Multer.File,
    bannerPosition?: number,
  ): Promise<BannerView> {
    const user = await this.bannerRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.banner) {
      await deleteFromStorage(this.s3, {
        url: user.banner,
        bucket: this.bucket,
        publicUrl: this.publicUrl,
      }).catch(() => {});
    }

    const { buffer: uploadBuffer, contentType, ext } = await optimizeBanner(file.buffer);
    const key = `banners/${userId}.${ext}`;

    const url = await uploadToStorageWithFallback(this.s3, {
      bucket: this.bucket,
      key,
      buffer: uploadBuffer,
      contentType,
      publicUrl: this.publicUrl,
    });

    const view = await this.bannerRepository.updateBanner(userId, url, bannerPosition);
    try {
      await this.redis?.del(`user:${userId}`);
      await this.redis?.del(`user${userId}`);
    } catch {
      // Safe non-blocking cache invalidation
    }
    return view;
  }

  async deleteBanner(userId: string): Promise<BannerView> {
    const user = await this.bannerRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.banner) {
      await deleteFromStorage(this.s3, {
        url: user.banner,
        bucket: this.bucket,
        publicUrl: this.publicUrl,
      }).catch(() => {});
    }

    const view = await this.bannerRepository.updateBanner(userId, null);
    try {
      await this.redis?.del(`user:${userId}`);
      await this.redis?.del(`user${userId}`);
    } catch {
      // Safe non-blocking cache invalidation
    }
    return view;
  }
}
