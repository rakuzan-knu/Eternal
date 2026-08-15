import { Injectable, Inject, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { S3_CLIENT } from './s3-provider';
import { AVATAR_REPOSITORY } from './interfaces/avatars-repository.interface';
import type { IAvatarRepository, AvatarView } from './interfaces/avatars-repository.interface';
import { RedisService } from '../redis/redis.service';

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
      await this.deleteObjectByUrl(user.avatar).catch(() => {});
    }

    let uploadBuffer = file.buffer;
    let contentType = file.mimetype || 'image/jpeg';
    let extension = file.originalname?.split('.').pop() || 'jpg';

    try {
      uploadBuffer = await sharp(file.buffer)
        .resize(512, 512, { fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
      contentType = 'image/webp';
      extension = 'webp';
    } catch {
      // Fallback to original buffer
    }

    const key = `avatars/${userId}.${extension}`;
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
      await this.deleteObjectByUrl(user.avatar).catch(() => {});
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

  private async deleteObjectByUrl(url: string): Promise<void> {
    if (!url || url.startsWith('data:') || !url.startsWith(this.publicUrl)) return;
    const key = url.replace(`${this.publicUrl}/${this.bucket}/`, '');
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })).catch(() => {});
  }
}
