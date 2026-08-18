import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { uid } from 'uid';
import { POSTS_S3_CLIENT } from '../posts/s3-provider';

export const MAX_COMMENT_MEDIA_SIZE = 5 * 1024 * 1024; // 5MB

export type SanitizedMedia = {
  url: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class CommentsMediaService {
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    @Optional() @Inject(POSTS_S3_CLIENT) private readonly s3: S3Client | null,
    private readonly configService: ConfigService,
  ) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'comments');
    this.publicUrl =
      this.configService.get<string>('MINIO_PUBLIC_URL') ??
      this.configService.get<string>('S3_PUBLIC_URL') ??
      'http://localhost:9000';
  }

  /**
   * Verifies file magic bytes against allowed safe image signatures.
   * Explicitly rejects SVG, HTML, and executable payloads.
   */
  validateMagicBytes(buffer: Buffer): { mime: string; ext: string; isGif: boolean } {
    if (!buffer || buffer.length < 4) {
      throw new BadRequestException('Invalid or empty file buffer');
    }

    // JPEG: FF D8 FF
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { mime: 'image/jpeg', ext: 'jpg', isGif: false };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { mime: 'image/png', ext: 'png', isGif: false };
    }

    // WEBP: RIFF .... WEBP
    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return { mime: 'image/webp', ext: 'webp', isGif: false };
    }

    // GIF: GIF87a or GIF89a
    if (
      buffer.length >= 6 &&
      buffer.toString('ascii', 0, 3) === 'GIF' &&
      (buffer.toString('ascii', 3, 6) === '87a' || buffer.toString('ascii', 3, 6) === '89a')
    ) {
      return { mime: 'image/gif', ext: 'gif', isGif: true };
    }

    throw new BadRequestException(
      'Unsupported file format. Only JPEG, PNG, WEBP, and GIF images are allowed. SVGs and executables are forbidden.',
    );
  }

  /**
   * Sanitizes, strips EXIF GPS/camera metadata, and processes comment image.
   */
  async processCommentImage(file: Express.Multer.File): Promise<SanitizedMedia> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No image file provided');
    }

    if (file.buffer.length > MAX_COMMENT_MEDIA_SIZE) {
      throw new BadRequestException('Image size exceeds maximum allowed limit of 5MB');
    }

    const { ext, isGif } = this.validateMagicBytes(file.buffer);

    let sanitizedBuffer: Buffer;
    let contentType: string;

    try {
      if (isGif) {
        // Strip metadata while preserving animated frames
        sanitizedBuffer = await sharp(file.buffer, { animated: true })
          .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
          .gif()
          .toBuffer();
        contentType = 'image/gif';
      } else {
        // Strip EXIF metadata and re-encode to clean WebP
        sanitizedBuffer = await sharp(file.buffer)
          .rotate() // auto-orient based on EXIF before stripping
          .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();
        contentType = 'image/webp';
      }
    } catch {
      throw new BadRequestException('Failed to process and sanitize image');
    }

    const finalExt = isGif ? 'gif' : ext === 'jpg' || ext === 'png' ? 'webp' : ext;
    const filename = `comments/${Date.now()}-${uid(16)}.${finalExt}`;

    if (this.s3) {
      try {
        await this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: filename,
            Body: sanitizedBuffer,
            ContentType: contentType,
          }),
        );
        const url = `${this.publicUrl}/${this.bucket}/${filename}`;
        return { url, mimetype: contentType, size: sanitizedBuffer.length };
      } catch {
        // If S3 upload fails, fallback to inline base64 data URI
      }
    }

    const base64Url = `data:${contentType};base64,${sanitizedBuffer.toString('base64')}`;
    return { url: base64Url, mimetype: contentType, size: sanitizedBuffer.length };
  }
}
