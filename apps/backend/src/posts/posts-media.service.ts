import { BadRequestException, Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { S3Client } from '@aws-sdk/client-s3';
import { MediaType } from '@prisma/client';
import { POSTS_S3_CLIENT } from './s3-provider';
import { uid } from 'uid';
import { validateUploadedMedia } from '../common/media/media-upload-validator';
import {
  readPostMediaReference,
  type PostMediaReference,
} from '../common/media/post-media-reference';
import {
  optimizePostImage,
  uploadToStorageWithFallback,
  generateBlurHash,
} from '../common/media/image-processor';

export type ProcessedMedia = {
  type: MediaType;
  url: string;
  poster?: string;
  blurhash?: string;
  order: number;
};

@Injectable()
export class PostsMediaService implements OnModuleDestroy {
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    @Inject(POSTS_S3_CLIENT) private readonly s3: S3Client,
    private readonly configService: ConfigService,
  ) {
    this.bucket =
      this.configService.get<string>('R2_BUCKET') ??
      this.configService.get<string>('MINIO_BUCKET', 'posts');
    this.publicUrl =
      this.configService.get<string>('R2_PUBLIC_URL') ??
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

  private async prepareUploadedFile(file: Express.Multer.File) {
    if (!this.isValidUploadedFile(file)) throw new BadRequestException('Invalid media file');
    const detected = await validateUploadedMedia(file.buffer, 'post');
    const type = detected.kind === 'image' ? MediaType.IMAGE : MediaType.VIDEO;
    const processed =
      type === MediaType.IMAGE
        ? await optimizePostImage(file.buffer)
        : { buffer: file.buffer, contentType: detected.mime, ext: detected.ext };
    return { type, ...processed };
  }

  private async storePreparedFile(
    prepared: Awaited<ReturnType<PostsMediaService['prepareUploadedFile']>>,
    order: number,
  ): Promise<ProcessedMedia> {
    const { buffer, contentType, ext, type } = prepared;
    const url = await uploadToStorageWithFallback(this.s3, {
      bucket: this.bucket,
      key: 'posts/' + uid(16) + '.' + ext,
      buffer,
      contentType,
      publicUrl: this.publicUrl,
    });
    const blurhash =
      type === MediaType.IMAGE ? (await generateBlurHash(buffer)).blurhash : undefined;
    return { type, url, ...(blurhash ? { blurhash } : {}), order };
  }

  async processUploadedFile(file: Express.Multer.File, order: number): Promise<ProcessedMedia> {
    return this.storePreparedFile(await this.prepareUploadedFile(file), order);
  }

  async processUploadedFiles(
    files: Express.Multer.File[],
    references: PostMediaReference[] = [],
  ): Promise<ProcessedMedia[]> {
    if (!Array.isArray(files)) throw new BadRequestException('Invalid media files payload');
    if (files.length + references.length > 5)
      throw new BadRequestException('Maximum 5 media files allowed per post');
    // Validate the entire selection before writing any of its files to storage.
    const prepared = [];
    for (const file of files) prepared.push(await this.prepareUploadedFile(file));
    for (const reference of references) {
      const buffer = await readPostMediaReference(reference, {
        s3: this.s3,
        bucket: this.bucket,
        publicUrl: this.publicUrl,
      });
      const media = await this.prepareUploadedFile({
        buffer,
        mimetype: 'application/octet-stream',
      } as Express.Multer.File);
      if (reference.kind === 'gif' && media.type !== MediaType.IMAGE) {
        throw new BadRequestException('Choose a valid image from the GIF picker');
      }
      prepared.push(media);
    }
    return Promise.all(prepared.map((file, order) => this.storePreparedFile(file, order)));
  }
  private readonly chunkStore = new Map<
    string,
    {
      ownerId: string;
      chunks: Map<number, Buffer>;
      totalChunks: number;
      fileName: string;
      createdAt: number;
    }
  >();

  private readonly CHUNK_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL for incomplete upload sessions
  private readonly MAX_CONCURRENT_SESSIONS = 100;
  private readonly MAX_TOTAL_CHUNKS = 4; // 4 * 5 MiB = 20 MiB max video assembly

  private readonly chunkCleanup = setInterval(() => this.cleanupAbandonedChunks(), 60000).unref();
  private assemblyBytes = 0;
  private readonly MAX_BUFFERED_BYTES = 256 * 1024 * 1024;

  onModuleDestroy(): void {
    clearInterval(this.chunkCleanup);
    this.chunkStore.clear();
  }

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
    ownerId: string,
  ): Promise<{ complete: boolean; media?: ProcessedMedia; uploadedChunks: number[] }> {
    this.cleanupAbandonedChunks();

    if (!ownerId) throw new BadRequestException('Upload owner required');
    if (!uploadId || typeof uploadId !== 'string' || uploadId.length > 128) {
      throw new BadRequestException('Invalid uploadId');
    }

    if (
      !Number.isInteger(chunkIndex) ||
      !Number.isInteger(totalChunks) ||
      totalChunks <= 0 ||
      totalChunks > this.MAX_TOTAL_CHUNKS ||
      chunkIndex < 0 ||
      chunkIndex >= totalChunks
    ) {
      throw new BadRequestException(
        `Invalid chunk parameters. totalChunks must be between 1 and ${this.MAX_TOTAL_CHUNKS}`,
      );
    }

    if (!this.isValidUploadedFile(file)) {
      throw new BadRequestException('Invalid chunk buffer');
    }
    if (file.buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('Chunk size exceeds 5MB limit');
    }

    const existingSession = this.chunkStore.get(uploadId);
    if (existingSession && existingSession.totalChunks !== totalChunks)
      throw new BadRequestException('Chunk count cannot change');
    const existing = this.chunkStore.get(uploadId);
    if (existing && existing.ownerId !== ownerId)
      throw new BadRequestException('Upload belongs to another user');
    if (!this.chunkStore.has(uploadId)) {
      if (
        Array.from(this.chunkStore.values()).filter((session) => session.ownerId === ownerId)
          .length >= 3
      )
        throw new BadRequestException('Too many active uploads');
      if (this.chunkStore.size >= this.MAX_CONCURRENT_SESSIONS) {
        throw new BadRequestException(
          'Server chunk upload capacity reached. Please try again later.',
        );
      }
      this.chunkStore.set(uploadId, {
        ownerId,
        chunks: new Map(),
        totalChunks,
        fileName: file.originalname || 'upload',
        createdAt: Date.now(),
      });
    }

    const session = this.chunkStore.get(uploadId)!;
    if (session.totalChunks !== totalChunks) {
      throw new BadRequestException('Chunk count does not match the upload session');
    }
    const totalBytes =
      Array.from(session.chunks.values()).reduce((sum, chunk) => sum + chunk.length, 0) -
      (session.chunks.get(chunkIndex)?.length ?? 0) +
      file.buffer.length;
    if (totalBytes > 100 * 1024 * 1024) {
      this.chunkStore.delete(uploadId);
      throw new BadRequestException('Media file is too large');
    }
    let globalBytes = this.assemblyBytes;
    let userBytes = 0;
    for (const stored of this.chunkStore.values()) {
      const bytes = Array.from(stored.chunks.values()).reduce(
        (sum, chunk) => sum + chunk.length,
        0,
      );
      globalBytes += bytes;
      if (stored.ownerId === ownerId) userBytes += bytes;
    }
    const added = file.buffer.length - (session.chunks.get(chunkIndex)?.length ?? 0);
    if (
      globalBytes + added + totalBytes > this.MAX_BUFFERED_BYTES ||
      userBytes + added > 100 * 1024 * 1024
    ) {
      throw new BadRequestException('Upload memory budget exceeded; retry later');
    }
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

      this.assemblyBytes += 2 * totalBytes;
      try {
        const media = await this.processUploadedFile(assembledFile, 0);
        return { complete: true, media, uploadedChunks };
      } finally {
        this.assemblyBytes -= 2 * totalBytes;
      }
    }

    return { complete: false, uploadedChunks };
  }

  getChunkStatus(
    uploadId: string,
    ownerId: string,
  ): { uploadedChunks: number[]; totalChunks: number } {
    this.cleanupAbandonedChunks();
    const session = this.chunkStore.get(uploadId);
    if (session && session.ownerId !== ownerId)
      throw new BadRequestException('Upload belongs to another user');
    if (!session) return { uploadedChunks: [], totalChunks: 0 };
    return {
      uploadedChunks: Array.from(session.chunks.keys()).sort((a, b) => a - b),
      totalChunks: session.totalChunks,
    };
  }
}
