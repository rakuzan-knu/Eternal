import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { z } from 'zod';
import { RedisService } from '../../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import { R2StorageService } from '../storage/r2-storage.service';
import { MediaBudgetService } from './media-budget.service';
import {
  directUploadSchema,
  type CompletedUpload,
  type DirectUploadInput,
  type UploadPurpose,
} from './direct-upload.contract';
import { MediaAccessRepository } from './media-access.repository';
import { PendingMediaRepository } from './pending-media.repository';
import { inspectMedia } from './media-metadata';
import { MEDIA_POLICY } from './media-policy';
import { validateUploadedMedia } from './media-upload-validator';
import { optimizeAvatar, optimizeBanner, optimizePostImage } from './image-processor';

const receiptSchema = z.object({
  uploadId: z.string().uuid(),
  url: z.string().url(),
  filename: z.string().max(255).optional(),
  contentType: z.string(),
  sizeBytes: z.number(),
  kind: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'FILE']),
  duration: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});
const intentSchema = directUploadSchema.extend({
  userId: z.string(),
  uploadId: z.string().uuid(),
  tempKey: z.string(),
  finalKey: z.string(),
  receipt: receiptSchema.optional(),
});
type Intent = z.infer<typeof intentSchema>;
const mimeExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/flac': 'flac',
  'application/octet-stream': 'bin',
};

@Injectable()
export class DirectUploadsService {
  private validating = false;
  constructor(
    private readonly storage: StorageService,
    private readonly r2: R2StorageService,
    private readonly redis: RedisService,
    private readonly budget: MediaBudgetService,
    private readonly access: MediaAccessRepository,
    private readonly config: ConfigService,
    private readonly pending: PendingMediaRepository,
  ) {}

  async start(userId: string, input: DirectUploadInput) {
    if (this.storage.isLocal()) return { mode: 'proxy' as const };
    const kind = this.kind(input.contentType);
    const imagesOnly = ['avatar', 'banner', 'comment', 'story-overlay'].includes(input.purpose);
    if (
      !mimeExtensions[input.contentType] ||
      (imagesOnly && kind !== 'IMAGE') ||
      (input.purpose === 'reel' && kind !== 'VIDEO') ||
      (input.purpose === 'post' && !['IMAGE', 'VIDEO'].includes(kind)) ||
      (input.purpose !== 'chat' && kind === 'FILE')
    )
      throw new BadRequestException('Unsupported media type for this upload');
    const max =
      kind === 'IMAGE'
        ? MEDIA_POLICY.maxImageBytes
        : kind === 'AUDIO'
          ? MEDIA_POLICY.maxAudioBytes
          : MEDIA_POLICY.maxAttachmentBytes;
    if (input.sizeBytes > max)
      throw new BadRequestException(`File exceeds ${max / 1024 / 1024} MiB limit`);
    if (input.purpose === 'chat') {
      if (!input.conversationId) throw new BadRequestException('Conversation is required');
      await this.access.assertConversationAccess(input.conversationId, userId);
    } else if (input.conversationId)
      throw new BadRequestException('Conversation is only valid for chat uploads');
    const client = this.client();
    const uploadId = randomUUID();
    const finalId = randomUUID();
    const intent: Intent = {
      ...input,
      userId,
      uploadId,
      tempKey: `_incoming/${uploadId}`,
      finalKey:
        input.purpose === 'reel'
          ? `reels/${finalId}.${mimeExtensions[input.contentType]}`
          : `media/${input.purpose}/${finalId}.${mimeExtensions[input.contentType]}`,
    };
    await this.budget.reserveUpload(userId, uploadId, input.sizeBytes);
    try {
      await this.assertBucketCapacity();
      await client.set(
        this.key(uploadId),
        JSON.stringify(intent),
        'EX',
        MEDIA_POLICY.uploadLeaseSeconds,
      );
      const url = await getSignedUrl(
        this.storage.getS3Client(),
        new PutObjectCommand({
          Bucket: this.r2.getDefaultBucket(),
          Key: intent.tempKey,
          ContentLength: input.sizeBytes,
          ContentType: input.contentType,
          IfNoneMatch: '*',
        }),
        {
          expiresIn: 180,
          signableHeaders: new Set(['content-length', 'content-type', 'if-none-match']),
        },
      );
      return {
        mode: 'direct' as const,
        uploadId,
        url,
        headers: { 'Content-Type': input.contentType, 'If-None-Match': '*' },
      };
    } catch {
      await this.budget.finishUpload(userId, uploadId);
      throw new ServiceUnavailableException('Upload preparation unavailable');
    }
  }

  async complete(userId: string, uploadId: string): Promise<CompletedUpload> {
    let intent = await this.intent(userId, uploadId);
    if (intent.receipt) return intent.receipt;
    const client = this.client();
    const lock = randomUUID();
    if ((await client.set(`${this.key(uploadId)}:lock`, lock, 'EX', 120, 'NX')) !== 'OK')
      throw new ConflictException('Upload verification already in progress');
    try {
      intent = await this.intent(userId, uploadId);
      if (intent.receipt) return intent.receipt;
      if (intent.purpose === 'chat')
        await this.access.assertConversationAccess(intent.conversationId!, userId);
      const s3 = this.storage.getS3Client();
      const Bucket = this.r2.getDefaultBucket();
      const head = await s3.send(new HeadObjectCommand({ Bucket, Key: intent.tempKey }), {
        abortSignal: AbortSignal.timeout(10_000),
      });
      if (
        head.ContentLength !== intent.sizeBytes ||
        head.ContentType !== intent.contentType ||
        !head.ETag
      )
        throw new BadRequestException('Uploaded object does not match its reservation');
      const prepared = await this.validateStaging(intent, head.ETag);
      const metadata = prepared.metadata;
      const finalKey = prepared.extension
        ? intent.finalKey.slice(0, intent.finalKey.lastIndexOf('.') + 1) + prepared.extension
        : intent.finalKey;
      const trackPending = this.config.get<string>('MEDIA_PENDING_TRACKING_ENABLED') === 'true';
      const objectMetadata: Record<string, string> = {
        ...(trackPending ? { registryversion: '1' } : {}),
        ownerid: userId,
        uploadid: uploadId,
        purpose: intent.purpose,
        ...(intent.conversationId ? { conversationid: intent.conversationId } : {}),
      };
      for (const [key, value] of Object.entries(metadata))
        if (value !== undefined) objectMetadata[key] = String(value);
      const publication = {
        Bucket,
        Key: finalKey,
        Metadata: objectMetadata,
        ContentType: prepared.contentType,
        ContentDisposition: this.kind(prepared.contentType) === 'FILE' ? 'attachment' : 'inline',
        CacheControl: 'public, max-age=31536000, immutable',
      };
      // Enable tracking only after every consumer can claim retention. Once enabled,
      // persist before the final-object write so failed promotion remains reclaimable.
      if (trackPending) await this.pending.register(finalKey, uploadId, userId);
      if (prepared.buffer) {
        await s3.send(new PutObjectCommand({ ...publication, Body: prepared.buffer }), {
          abortSignal: AbortSignal.timeout(15_000),
        });
      } else {
        await s3.send(
          new CopyObjectCommand({
            ...publication,
            CopySource: `${Bucket}/${intent.tempKey}`,
            CopySourceIfMatch: head.ETag,
            MetadataDirective: 'REPLACE',
          }),
          { abortSignal: AbortSignal.timeout(15_000) },
        );
      }
      const receipt: CompletedUpload = {
        uploadId,
        filename: intent.filename,
        url: this.storage.getPublicUrl(finalKey),
        contentType: prepared.contentType,
        sizeBytes: prepared.sizeBytes,
        kind: this.kind(prepared.contentType),
        ...metadata,
      };
      await client.set(this.key(uploadId), JSON.stringify({ ...intent, receipt }), 'EX', 86400);
      await this.budget.finishUpload(userId, uploadId);
      // Keep the immutable staging object until bucket lifecycle expiry. Deleting it now
      // would let the still-valid signed PUT recreate it and bypass If-None-Match replay protection.
      return receipt;
    } finally {
      await client
        .eval(
          "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0",
          1,
          `${this.key(uploadId)}:lock`,
          lock,
        )
        .catch(() => undefined);
    }
  }

  private async validateStaging(
    intent: Intent,
    etag: string,
  ): Promise<{
    metadata: Awaited<ReturnType<typeof inspectMedia>>;
    contentType: string;
    sizeBytes: number;
    buffer?: Buffer;
    extension?: string;
  }> {
    const unchanged = {
      metadata: {},
      contentType: intent.contentType,
      sizeBytes: intent.sizeBytes,
    };
    // Ciphertext and generic chat files are downloadable attachments, never interpreted as media.
    if (intent.contentType === 'application/octet-stream') return unchanged;
    if (this.validating)
      throw new ServiceUnavailableException(
        'Another media file is being verified. Try again shortly',
      );
    this.validating = true;
    try {
      const response = await this.storage.getS3Client().send(
        new GetObjectCommand({
          Bucket: this.r2.getDefaultBucket(),
          Key: intent.tempKey,
          IfMatch: etag,
        }),
        { abortSignal: AbortSignal.timeout(15_000) },
      );
      const body = response.Body;
      if (!(body instanceof Readable)) throw new BadRequestException('Invalid media stream');
      const chunks: Buffer[] = [];
      let bytes = 0;
      const timer = setTimeout(() => body.destroy(new Error('Media read timed out')), 15_000);
      let buffer: Buffer;
      try {
        if (response.ContentLength !== intent.sizeBytes)
          throw new BadRequestException('Invalid media size');
        for await (const chunk of body) {
          if (!Buffer.isBuffer(chunk)) throw new BadRequestException('Invalid media stream');
          bytes += chunk.length;
          if (bytes > intent.sizeBytes || bytes > MEDIA_POLICY.maxAttachmentBytes)
            throw new BadRequestException('Media exceeds upload reservation');
          chunks.push(chunk);
        }
        if (bytes !== intent.sizeBytes) throw new BadRequestException('Incomplete media object');
        buffer = Buffer.concat(chunks, bytes);
      } finally {
        clearTimeout(timer);
        body.destroy();
      }
      // Preserve the same container, packet and bounded full-decode validation as proxy uploads.
      const detected = await validateUploadedMedia(buffer, 'story');
      if (detected.mime !== intent.contentType)
        throw new BadRequestException('Media bytes do not match the reserved type');
      if (detected.kind === 'image') {
        await inspectMedia(
          intent.contentType,
          intent.sizeBytes,
          (start, end) => Promise.resolve(buffer.subarray(start, end + 1)),
          3600,
        );
        const optimized =
          intent.purpose === 'avatar'
            ? await optimizeAvatar(buffer)
            : intent.purpose === 'banner'
              ? await optimizeBanner(buffer)
              : await optimizePostImage(buffer);
        if (
          optimized.buffer.length > intent.sizeBytes ||
          optimized.buffer.length > MEDIA_POLICY.maxImageBytes
        )
          throw new BadRequestException(
            'Normalized image exceeds its reservation. Compress the image and upload again',
          );
        const metadata = await inspectMedia(
          optimized.contentType,
          optimized.buffer.length,
          (start, end) => Promise.resolve(optimized.buffer.subarray(start, end + 1)),
          3600,
        );
        return {
          metadata,
          buffer: optimized.buffer,
          contentType: optimized.contentType,
          extension: optimized.ext,
          sizeBytes: optimized.buffer.length,
        };
      }
      const metadata = await inspectMedia(
        intent.contentType,
        intent.sizeBytes,
        (start, end) => Promise.resolve(buffer.subarray(start, end + 1)),
        intent.purpose === 'reel' ? 60 : 3600,
      );
      return { ...unchanged, metadata };
    } finally {
      this.validating = false;
    }
  }

  async abort(userId: string, uploadId: string): Promise<void> {
    let intent = await this.intent(userId, uploadId);
    if (intent.receipt) return; // Publication may already reference this immutable object.
    const client = this.client();
    const locked = await client.set(`${this.key(uploadId)}:lock`, 'abort', 'EX', 120, 'NX');
    if (locked !== 'OK') throw new ConflictException('Upload verification already in progress');
    try {
      intent = await this.intent(userId, uploadId);
      if (intent.receipt) return;
      await this.storage
        .getS3Client()
        .send(new DeleteObjectCommand({ Bucket: this.r2.getDefaultBucket(), Key: intent.tempKey }));
      await client.del(this.key(uploadId));
      await this.budget.finishUpload(userId, uploadId);
    } finally {
      await client.del(`${this.key(uploadId)}:lock`);
    }
  }

  async resolve(
    userId: string,
    uploadId: string,
    purpose: UploadPurpose,
    conversationId?: string,
  ): Promise<CompletedUpload> {
    const intent = await this.intent(userId, uploadId);
    if (!intent.receipt || intent.purpose !== purpose || intent.conversationId !== conversationId)
      throw new ForbiddenException('Completed upload does not belong to this operation');
    await this.assertOwnedUrl(userId, intent.receipt.url, purpose, conversationId);
    return intent.receipt;
  }

  isDirectUploadUrl(url: string, purpose: UploadPurpose): boolean {
    const path = purpose === 'reel' ? 'reels/' : `media/${purpose}/`;
    return url.startsWith(this.storage.getPublicUrl(path));
  }

  async assertOwnedUrl(
    userId: string,
    url: string,
    purpose: UploadPurpose,
    conversationId?: string,
  ): Promise<void> {
    if (this.storage.isLocal()) return;
    const prefix = `${this.storage.getPublicUrl('')}`;
    if (!url.startsWith(prefix)) throw new ForbiddenException('Use a completed media upload');
    const key = url.slice(prefix.length);
    if (!/^(?:media\/[a-z-]+|reels)\/[a-z0-9-]+\.[a-z0-9]+$/.test(key))
      throw new ForbiddenException('Invalid media object');
    const head = await this.storage
      .getS3Client()
      .send(new HeadObjectCommand({ Bucket: this.r2.getDefaultBucket(), Key: key }), {
        abortSignal: AbortSignal.timeout(10_000),
      });
    if (
      head.Metadata?.ownerid !== userId ||
      head.Metadata.purpose !== purpose ||
      head.Metadata.conversationid !== conversationId
    )
      throw new ForbiddenException('Media ownership mismatch');
    await this.pending.retain(key, userId, head.Metadata.registryversion === '1');
  }

  assertLegacyAllowed(): void {
    if (this.storage.isR2() && this.config.get<string>('DIRECT_UPLOADS_REQUIRED') === 'true')
      throw new BadRequestException('Update the app to use direct media uploads');
  }

  private async intent(userId: string, uploadId: string): Promise<Intent> {
    if (!z.string().uuid().safeParse(uploadId).success)
      throw new BadRequestException('Invalid upload ID');
    const raw = await this.client().get(this.key(uploadId));
    if (!raw) throw new BadRequestException('Upload reservation expired');
    const intent = intentSchema.parse(JSON.parse(raw));
    if (intent.userId !== userId) throw new ForbiddenException('Upload ownership mismatch');
    return intent;
  }
  private client() {
    const client = this.redis.getClient();
    if (client.status !== 'ready')
      throw new ServiceUnavailableException('Upload admission unavailable');
    return client;
  }
  private key(id: string): string {
    return `media:direct:${id}`;
  }
  private kind(mime: string): CompletedUpload['kind'] {
    return mime.startsWith('image/')
      ? 'IMAGE'
      : mime.startsWith('video/')
        ? 'VIDEO'
        : mime.startsWith('audio/')
          ? 'AUDIO'
          : 'FILE';
  }
  private async assertBucketCapacity(): Promise<void> {
    const configured = Number(
      this.config.get<string>('MEDIA_BUCKET_MAX_BYTES', String(8 * 1024 ** 3)),
    );
    const limit =
      Number.isSafeInteger(configured) && configured > 0
        ? Math.min(configured, 8 * 1024 ** 3)
        : 8 * 1024 ** 3;
    let continuation: string | undefined;
    let bytes = 0;
    for (let page = 0; page < 10; page++) {
      const result = await this.storage.getS3Client().send(
        new ListObjectsV2Command({
          Bucket: this.r2.getDefaultBucket(),
          MaxKeys: 1000,
          ContinuationToken: continuation,
        }),
        { abortSignal: AbortSignal.timeout(10_000) },
      );
      for (const item of result.Contents || []) bytes += item.Size || 0;
      if (bytes >= limit) throw new ServiceUnavailableException('Media storage allowance reached');
      if (!result.IsTruncated) return;
      continuation = result.NextContinuationToken;
      if (!continuation) break;
    }
    throw new ServiceUnavailableException(
      'Storage inventory requires maintenance before more uploads',
    );
  }
}
