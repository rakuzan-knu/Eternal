import { DirectUploadsService } from '../common/media/direct-uploads.service';
import {
  BadRequestException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
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
  @Inject(DirectUploadsService)
  private readonly directUploads!: DirectUploadsService;

  private readonly logger = new Logger(BannersService.name);
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    @Inject(BANNER_S3_CLIENT) private readonly s3: S3Client,
    @Inject(BANNER_REPOSITORY) private readonly bannerRepository: IBannerRepository,
    private readonly configService: ConfigService,
    @Optional() private readonly redis?: RedisService,
  ) {
    this.bucket =
      this.configService.get<string>('R2_BUCKET') ??
      this.configService.get<string>('MINIO_BUCKET', 'avatars');
    this.publicUrl =
      this.configService.get<string>('R2_PUBLIC_URL') ??
      this.configService.get<string>('MINIO_PUBLIC_URL') ??
      this.configService.get<string>('S3_PUBLIC_URL') ??
      'http://localhost:9000';
  }

  async uploadBanner(
    userId: string,
    file: Express.Multer.File,
    bannerPosition?: number,
  ): Promise<BannerView> {
    this.directUploads.assertLegacyAllowed();
    if (!file?.buffer) throw new BadRequestException('An image upload is required');
    const user = await this.bannerRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.banner) {
      await deleteFromStorage(this.s3, {
        url: user.banner,
        bucket: this.bucket,
        publicUrl: this.publicUrl,
      }).catch((e) => {
        this.logger.warn(`Failed to delete old banner storage file for ${userId}: ${String(e)}`);
      });
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
    } catch (e) {
      this.logger.warn(`Failed to invalidate user banner cache for ${userId}: ${String(e)}`);
    }
    return view;
  }

  async useDirectBanner(
    userId: string,
    uploadId: string,
    bannerPosition?: number,
  ): Promise<BannerView> {
    const media = await this.directUploads.resolve(userId, uploadId, 'banner');
    const user = await this.bannerRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.bannerRepository.updateBanner(userId, media.url, bannerPosition);
    await this.redis?.del(`user:${userId}`);
    await this.redis?.del(`user${userId}`);
    if (user.banner && user.banner !== media.url)
      await deleteFromStorage(this.s3, {
        url: user.banner,
        bucket: this.bucket,
        publicUrl: this.publicUrl,
      }).catch(() => this.logger.warn('Previous profile media cleanup deferred'));
    return updated;
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
      }).catch((e) => {
        this.logger.warn(`Failed to delete banner storage file for ${userId}: ${String(e)}`);
      });
    }

    const view = await this.bannerRepository.updateBanner(userId, null);
    try {
      await this.redis?.del(`user:${userId}`);
      await this.redis?.del(`user${userId}`);
    } catch (e) {
      this.logger.warn(`Failed to invalidate user banner cache for ${userId}: ${String(e)}`);
    }
    return view;
  }
}
