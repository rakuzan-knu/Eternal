import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { S3Client } from '@aws-sdk/client-s3';
import { MediaType } from '@prisma/client';
import { POSTS_S3_CLIENT } from './s3-provider';
import { uid } from 'uid';
import { optimizePostImage, uploadToStorageWithFallback } from '../common/media/image-processor';

export type ProcessedMedia = {
  type: MediaType;
  url: string;
  poster?: string;
  order: number;
};

@Injectable()
export class PostsMediaService {
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    @Inject(POSTS_S3_CLIENT) private readonly s3: S3Client,
    private readonly configService: ConfigService,
  ) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'posts');
    this.publicUrl =
      this.configService.get<string>('MINIO_PUBLIC_URL') ??
      this.configService.get<string>('S3_PUBLIC_URL') ??
      'http://localhost:9000';
  }

  private isValidUploadedFile(file: unknown): file is Express.Multer.File {
    if (!file || typeof file !== 'object') {
      return false;
    }
    const candidate = file as Partial<Express.Multer.File>;
    return (
      Buffer.isBuffer(candidate.buffer) &&
      candidate.buffer.length > 0 &&
      typeof candidate.mimetype === 'string'
    );
  }

  private detectMimeType(buffer: Buffer): { type: MediaType; mime: string; ext: string } {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { type: MediaType.IMAGE, mime: 'image/jpeg', ext: 'jpg' };
    }
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return { type: MediaType.IMAGE, mime: 'image/png', ext: 'png' };
    }
    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return { type: MediaType.IMAGE, mime: 'image/webp', ext: 'webp' };
    }
    if (buffer.length >= 6 && buffer.toString('ascii', 0, 3) === 'GIF') {
      return { type: MediaType.IMAGE, mime: 'image/gif', ext: 'gif' };
    }
    if (buffer.length >= 8 && buffer.toString('ascii', 4, 8) === 'ftyp') {
      return { type: MediaType.VIDEO, mime: 'video/mp4', ext: 'mp4' };
    }
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    ) {
      return { type: MediaType.VIDEO, mime: 'video/webm', ext: 'webm' };
    }

    throw new BadRequestException('Unsupported or invalid file format');
  }

  async processUploadedFile(file: Express.Multer.File, order: number): Promise<ProcessedMedia> {
    if (!this.isValidUploadedFile(file)) {
      throw new BadRequestException('Invalid media file');
    }

    const { type, ext } = this.detectMimeType(file.buffer);

    // Enforce size limits: 10MB images, 100MB videos
    const maxImageSize = 10 * 1024 * 1024;
    const maxVideoSize = 100 * 1024 * 1024;

    if (type === MediaType.IMAGE && file.buffer.length > maxImageSize) {
      throw new BadRequestException('Image size exceeds 10MB limit');
    }
    if (type === MediaType.VIDEO && file.buffer.length > maxVideoSize) {
      throw new BadRequestException('Video size exceeds 100MB limit');
    }

    const fileId = uid(16);
    let uploadBuffer = file.buffer;
    let contentType = file.mimetype;
    let fileExt = ext;

    if (type === MediaType.IMAGE) {
      // Re-encode all images through Sharp for safety, compression, and privacy
      const optimized = await optimizePostImage(file.buffer);
      uploadBuffer = optimized.buffer;
      contentType = optimized.contentType;
      fileExt = optimized.ext;
    }

    const key = `posts/${fileId}.${fileExt}`;

    const url = await uploadToStorageWithFallback(this.s3, {
      bucket: this.bucket,
      key,
      buffer: uploadBuffer,
      contentType,
      publicUrl: this.publicUrl,
    });

    return {
      type,
      url,
      order,
    };
  }

  async processUploadedFiles(files: Express.Multer.File[]): Promise<ProcessedMedia[]> {
    if (!Array.isArray(files)) {
      throw new BadRequestException('Invalid media files payload');
    }

    if (files.length > 5) {
      throw new BadRequestException('Maximum 5 media files allowed per post');
    }

    if (!files.every((file) => this.isValidUploadedFile(file))) {
      throw new BadRequestException('Invalid media file payload');
    }

    return Promise.all(files.map((file, i) => this.processUploadedFile(file, i)));
  }

  private readonly chunkStore = new Map<
    string,
    {
      chunks: Map<number, Buffer>;
      totalChunks: number;
      fileName: string;
      createdAt: number;
    }
  >();

  private readonly CHUNK_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours TTL for incomplete upload sessions

  private cleanupAbandonedChunks(): void {
    const now = Date.now();
    for (const [uploadId, session] of this.chunkStore.entries()) {
      if (now - session.createdAt > this.CHUNK_TTL_MS) {
        this.chunkStore.delete(uploadId);
      }
    }
  }

  async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    totalChunks: number,
    file: Express.Multer.File,
  ): Promise<{ complete: boolean; media?: ProcessedMedia; uploadedChunks: number[] }> {
    this.cleanupAbandonedChunks();

    if (!this.isValidUploadedFile(file)) {
      throw new BadRequestException('Invalid chunk buffer');
    }

    if (!this.chunkStore.has(uploadId)) {
      this.chunkStore.set(uploadId, {
        chunks: new Map(),
        totalChunks,
        fileName: file.originalname || 'upload',
        createdAt: Date.now(),
      });
    }

    const session = this.chunkStore.get(uploadId)!;
    session.chunks.set(chunkIndex, file.buffer);

    const uploadedChunks = Array.from(session.chunks.keys()).sort((a, b) => a - b);

    if (session.chunks.size === totalChunks) {
      const sortedBuffers: Buffer[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const chunk = session.chunks.get(i);
        if (!chunk) throw new BadRequestException(`Missing chunk ${i}`);
        sortedBuffers.push(chunk);
      }
      const fullBuffer = Buffer.concat(sortedBuffers);
      this.chunkStore.delete(uploadId);

      const assembledFile: Express.Multer.File = {
        ...file,
        buffer: fullBuffer,
        size: fullBuffer.length,
      };

      const media = await this.processUploadedFile(assembledFile, 0);
      return { complete: true, media, uploadedChunks };
    }

    return { complete: false, uploadedChunks };
  }

  getChunkStatus(uploadId: string): { uploadedChunks: number[]; totalChunks: number } {
    const session = this.chunkStore.get(uploadId);
    if (!session) return { uploadedChunks: [], totalChunks: 0 };
    return {
      uploadedChunks: Array.from(session.chunks.keys()).sort((a, b) => a - b),
      totalChunks: session.totalChunks,
    };
  }
}
