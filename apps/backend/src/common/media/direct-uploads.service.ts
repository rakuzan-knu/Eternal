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
import { inspectMedia } from './media-metadata';
import { MEDIA_POLICY } from './media-policy';

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
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'application/octet-stream': 'bin',
};

@Injectable()
export class DirectUploadsService {
  constructor(
    private readonly storage: StorageService,
    private readonly r2: R2StorageService,
    private readonly redis: RedisService,
    private readonly budget: MediaBudgetService,
    private readonly access: MediaAccessRepository,
    private readonly config: ConfigService,
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
      const metadataDeadline = AbortSignal.timeout(45_000);
      const metadata =
        intent.contentType === 'application/octet-stream'
          ? {}
          : await inspectMedia(
              intent.contentType,
              intent.sizeBytes,
              async (start, end) => {
                const response = await s3.send(
                  new GetObjectCommand({
                    Bucket,
                    Key: intent.tempKey,
                    Range: `bytes=${start}-${end}`,
                    IfMatch: head.ETag,
                  }),
                  { abortSignal: AbortSignal.any([AbortSignal.timeout(10_000), metadataDeadline]) },
                );
                if (!response.Body || response.ContentLength !== end - start + 1)
                  throw new BadRequestException('Invalid media range');
                return Buffer.from(await response.Body.transformToByteArray());
              },
              intent.purpose === 'reel' ? 60 : 3600,
            );
      const objectMetadata: Record<string, string> = {
        ownerid: userId,
        uploadid: uploadId,
        purpose: intent.purpose,
        ...(intent.conversationId ? { conversationid: intent.conversationId } : {}),
      };
      for (const [key, value] of Object.entries(metadata))
        if (value !== undefined) objectMetadata[key] = String(value);
      await s3.send(
        new CopyObjectCommand({
          Bucket,
          Key: intent.finalKey,
          CopySource: `${Bucket}/${intent.tempKey}`,
          CopySourceIfMatch: head.ETag,
          MetadataDirective: 'REPLACE',
          Metadata: objectMetadata,
          ContentType: intent.contentType,
          ContentDisposition: this.kind(intent.contentType) === 'FILE' ? 'attachment' : 'inline',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
        { abortSignal: AbortSignal.timeout(15_000) },
      );
      const receipt: CompletedUpload = {
        uploadId,
        filename: intent.filename,
        url: this.storage.getPublicUrl(intent.finalKey),
        contentType: intent.contentType,
        sizeBytes: intent.sizeBytes,
        kind: this.kind(intent.contentType),
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
