import { Injectable, Inject, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { BANNER_S3_CLIENT } from './s3-provider';
import { BANNER_REPOSITORY } from './interfaces/banners-repository.interface';
import type { IBannerRepository, BannerView } from './interfaces/banners-repository.interface';
import { RedisService } from '../redis/redis.service';

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
      await this.deleteObjectByUrl(user.banner).catch(() => {});
    }

    let uploadBuffer = file.buffer;
    let contentType = file.mimetype || 'image/jpeg';
    let extension = file.originalname?.split('.').pop() || 'jpg';

    try {
      uploadBuffer = await sharp(file.buffer)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
      contentType = 'image/webp';
      extension = 'webp';
    } catch {
      // Fallback to original buffer
    }

    const key = `banners/${userId}.${extension}`;
    let url = `${this.publicUrl}/${this.bucket}/${key}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: uploadBuffer,
          ContentType: contentType,
        }),
      );
    } catch {
      // Resilient fallback for cloud environments without active MinIO
      url = `data:${contentType};base64,${uploadBuffer.toString('base64')}`;
    }

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
      await this.deleteObjectByUrl(user.banner).catch(() => {});
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

  private async deleteObjectByUrl(url: string): Promise<void> {
    if (!url || url.startsWith('data:') || !url.startsWith(this.publicUrl)) return;
    const key = url.replace(`${this.publicUrl}/${this.bucket}/`, '');
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })).catch(() => {});
  }
}
