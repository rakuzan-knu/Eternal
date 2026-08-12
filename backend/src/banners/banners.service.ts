import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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
    private readonly redis: RedisService,
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

    const extension = file.originalname.split('.').pop();
    const key = `banners/${userId}.${extension}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = `${this.publicUrl}/${this.bucket}/${key}`;

    const view = await this.bannerRepository.updateBanner(userId, url, bannerPosition);
    await this.redis.del(`user${userId}`);
    return view;
  }

  async deleteBanner(userId: string): Promise<BannerView> {
    const user = await this.bannerRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.banner) {
      await this.deleteObjectByUrl(user.banner);
    }

    const view = await this.bannerRepository.updateBanner(userId, null);
    await this.redis.del(`user${userId}`);
    return view;
  }

  private async deleteObjectByUrl(url: string): Promise<void> {
    const key = url.replace(`${this.publicUrl}/${this.bucket}/`, '');
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
