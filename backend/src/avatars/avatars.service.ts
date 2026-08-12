import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { S3_CLIENT } from './s3-provider';
import { AVATAR_REPOSITORY } from './interfaces/avatars-repository.interface';
import type { IAvatarRepository, AvatarView } from './interfaces/avatars-repository.interface';

@Injectable()
export class AvatarsService {
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    @Inject(AVATAR_REPOSITORY) private readonly avatarRepository: IAvatarRepository,
    private readonly configService: ConfigService,
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

    const extension = file.originalname.split('.').pop();
    const key = `avatars/${userId}.${extension}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = `${this.publicUrl}/${this.bucket}/${key}`;

    return this.avatarRepository.updateAvatar(userId, url);
  }

  async deleteAvatar(userId: string): Promise<AvatarView> {
    const user = await this.avatarRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.avatar) {
      await this.deleteObjectByUrl(user.avatar);
    }

    return this.avatarRepository.updateAvatar(userId, null);
  }

  private async deleteObjectByUrl(url: string): Promise<void> {
    const key = url.replace(`${this.publicUrl}/${this.bucket}/`, '');
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
