import { Injectable, Inject, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { S3Client } from '@aws-sdk/client-s3';
import { S3_CLIENT } from './s3-provider';
import { AVATAR_REPOSITORY } from './interfaces/avatars-repository.interface';
import type { IAvatarRepository, AvatarView } from './interfaces/avatars-repository.interface';
import { RedisService } from '../redis/redis.service';
import {
  optimizeAvatar,
  uploadToStorageWithFallback,
  deleteFromStorage,
} from '../common/media/image-processor';

@Injectable()
export class AvatarsService {
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    @Inject(AVATAR_REPOSITORY) private readonly avatarRepository: IAvatarRepository,
    private readonly configService: ConfigService,
    @Optional() private readonly redis?: RedisService,
  ) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'avatars');
    this.publicUrl =
      this.configService.get<string>('MINIO_PUBLIC_URL') ??
      this.configService.get<string>('S3_PUBLIC_URL') ??
      'http://localhost:9000';
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<AvatarView> {
    const user = await this.avatarRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.avatar) {
      await deleteFromStorage(this.s3, {
        url: user.avatar,
        bucket: this.bucket,
        publicUrl: this.publicUrl,
      }).catch(() => {});
    }

    const { buffer: uploadBuffer, contentType, ext } = await optimizeAvatar(file.buffer);
    const key = `avatars/${userId}.${ext}`;

    const url = await uploadToStorageWithFallback(this.s3, {
      bucket: this.bucket,
      key,
      buffer: uploadBuffer,
      contentType,
      publicUrl: this.publicUrl,
    });

    const updated = await this.avatarRepository.updateAvatar(userId, url);
    try {
      await this.redis?.del(`user:${userId}`);
      await this.redis?.del(`user${userId}`);
    } catch {
      // Safe non-blocking cache invalidation
    }
    return updated;
  }

  async deleteAvatar(userId: string): Promise<AvatarView> {
    const user = await this.avatarRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.avatar) {
      await deleteFromStorage(this.s3, {
        url: user.avatar,
        bucket: this.bucket,
        publicUrl: this.publicUrl,
      }).catch(() => {});
    }

    const updated = await this.avatarRepository.updateAvatar(userId, null);
    try {
      await this.redis?.del(`user:${userId}`);
      await this.redis?.del(`user${userId}`);
    } catch {
      // Safe non-blocking cache invalidation
    }
    return updated;
  }
}
