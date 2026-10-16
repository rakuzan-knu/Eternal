import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import * as mediaDecode from './media-decode-validator';
import { pngImage, voiceWebm } from './__tests__/upload-fixtures';
import { ConfigService } from '@nestjs/config';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { createInMemoryRedisClient } from '../../../test/in-memory-db';
import { RedisService } from '../../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import { R2StorageService } from '../storage/r2-storage.service';
import { MediaAccessRepository } from './media-access.repository';
import { MediaBudgetService } from './media-budget.service';
import { PendingMediaRepository } from './pending-media.repository';
import { DirectUploadsService } from './direct-uploads.service';
import type { DirectUploadInput } from './direct-upload.contract';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://storage.test/signed'),
}));

describe('direct upload ownership and immutable promotion', () => {
  let client: ReturnType<typeof createInMemoryRedisClient>;
  let redis: RedisService;
  let service: DirectUploadsService;
  let config: ConfigService;
  const send = vi.fn<(command: unknown) => Promise<unknown>>();
  const access = { assertConversationAccess: vi.fn() };
  const pending = { register: vi.fn(), retain: vi.fn() };
  const input: DirectUploadInput = {
    purpose: 'chat',
    contentType: 'application/octet-stream',
    sizeBytes: 5,
    filename: 'encrypted.bin',
    conversationId: '11111111-1111-4111-8111-111111111111',
  };
  let metadata: Record<string, string>;
  let size: number;
  let mime: string;
  let objectBytes: Buffer;
  let publicBase: string;

  beforeEach(async () => {
    client = createInMemoryRedisClient();
    await client.flushdb();
    Object.defineProperty(client, 'status', { value: 'ready', configurable: true });
    redis = new RedisService(client);
    publicBase = 'https://cdn.test/';
    metadata = {};
    size = 5;
    mime = 'application/octet-stream';
    objectBytes = Buffer.from('12345');
    vi.clearAllMocks();
    config = new ConfigService({
      DIRECT_UPLOADS_REQUIRED: 'true',
      MEDIA_PENDING_TRACKING_ENABLED: 'true',
    });
    send.mockImplementation(async (command: unknown) => {
      if (command instanceof ListObjectsV2Command) return { Contents: [], IsTruncated: false };
      if (command instanceof HeadObjectCommand)
        return {
          ContentLength: size,
          ContentType: mime,
          ETag: '"unchanged"',
          Metadata: metadata,
        };
      if (command instanceof GetObjectCommand)
        return { Body: Readable.from([objectBytes]), ContentLength: objectBytes.length };
      if (command instanceof PutObjectCommand) {
        metadata = command.input.Metadata || {};
        return {};
      }
      if (command instanceof CopyObjectCommand) {
        metadata = command.input.Metadata || {};
        return {};
      }
      if (command instanceof DeleteObjectCommand) return {};
      throw new Error('Unexpected storage request');
    });
    const module = await Test.createTestingModule({
      providers: [
        DirectUploadsService,
        {
          provide: StorageService,
          useValue: {
            isLocal: () => false,
            isR2: () => true,
            getS3Client: () => ({ send }),
            getPublicUrl: (key: string) => `${publicBase}${key}`,
          },
        },
        { provide: R2StorageService, useValue: { getDefaultBucket: () => 'media' } },
        { provide: RedisService, useValue: redis },
        {
          provide: ConfigService,
          useValue: config,
        },
        MediaBudgetService,
        { provide: MediaAccessRepository, useValue: access },
        { provide: PendingMediaRepository, useValue: pending },
      ],
    }).compile();
    service = module.get(DirectUploadsService);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    redis.onModuleDestroy();
  });

  it('classifies only canonical direct keys beneath a configured storage path prefix', () => {
    publicBase = 'https://cdn.test/bucket/';
    expect(service.isDirectUploadUrl(`${publicBase}media/post/id.webp`, 'post')).toBe(true);
    expect(service.isDirectUploadUrl('https://cdn.test/media/post/id.webp', 'post')).toBe(false);
    expect(service.isDirectUploadUrl(`${publicBase}media/chat/id.webp`, 'post')).toBe(false);
    expect(
      service.isDirectUploadUrl('https://foreign.test/bucket/media/post/id.webp', 'post'),
    ).toBe(false);
  });

  async function start() {
    const result = await service.start('alice', input);
    if (result.mode !== 'direct') throw new Error('Expected direct mode');
    return result;
  }
  it('promotes one immutable object and completion is idempotent without downloading ciphertext', async () => {
    const result = await start();
    expect(result.headers).toEqual({
      'Content-Type': 'application/octet-stream',
      'If-None-Match': '*',
    });
    const complete = await service.complete('alice', result.uploadId);
    expect(complete).toMatchObject({ sizeBytes: 5, kind: 'FILE', filename: 'encrypted.bin' });
    expect(await service.complete('alice', result.uploadId)).toEqual(complete);
    const copies = send.mock.calls.filter(([command]) => command instanceof CopyObjectCommand);
    expect(copies).toHaveLength(1);
    expect(pending.register).toHaveBeenCalledTimes(1);
    expect(pending.register.mock.invocationCallOrder[0]).toBeLessThan(
      send.mock.invocationCallOrder[
        send.mock.calls.findIndex(([command]) => command instanceof CopyObjectCommand)
      ],
    );
    const copy: unknown = copies[0]?.[0];
    if (!(copy instanceof CopyObjectCommand)) throw new Error('Missing conditional copy');
    expect(copy.input).toMatchObject({
      CopySourceIfMatch: '"unchanged"',
      MetadataDirective: 'REPLACE',
      Metadata: { ownerid: 'alice', purpose: 'chat', conversationid: input.conversationId },
    });
    expect(send.mock.calls.some(([command]) => command instanceof GetObjectCommand)).toBe(false);
    expect(send.mock.calls.some(([command]) => command instanceof DeleteObjectCommand)).toBe(false);
    await expect(
      service.resolve('alice', result.uploadId, 'chat', input.conversationId),
    ).resolves.toEqual(complete);
    expect(pending.retain).toHaveBeenCalledWith(expect.any(String), 'alice', true);
  });
  it('fails closed before final storage writes when durable registration fails', async () => {
    const result = await start();
    pending.register.mockRejectedValueOnce(new Error('Registry unavailable'));
    await expect(service.complete('alice', result.uploadId)).rejects.toThrow(
      'Registry unavailable',
    );
    expect(send.mock.calls.some(([command]) => command instanceof CopyObjectCommand)).toBe(false);
  });
  it('does not register or mark media while old consumers remain in a mixed rollout', async () => {
    config.set('MEDIA_PENDING_TRACKING_ENABLED', 'false');
    const result = await start();
    const receipt = await service.complete('alice', result.uploadId);
    expect(receipt.url).toContain('/media/chat/');
    expect(pending.register).not.toHaveBeenCalled();
    expect(metadata.registryversion).toBeUndefined();
    // An old consumer can publish using this receipt without claiming retention;
    // there is no pending registry row for subsequent cleanup to select.
    expect(metadata).toMatchObject({ ownerid: 'alice', purpose: 'chat' });
    expect(pending.retain).not.toHaveBeenCalled();
  });
  it('rejects publication after cleanup has claimed a completed object', async () => {
    const result = await start();
    const receipt = await service.complete('alice', result.uploadId);
    pending.retain.mockRejectedValueOnce(
      new BadRequestException('Upload expired before publication'),
    );
    await expect(
      service.assertOwnedUrl('alice', receipt.url, 'chat', input.conversationId),
    ).rejects.toThrow('Upload expired');
  });
  it('rejects another user, wrong purpose and cross-conversation publication', async () => {
    const result = await start();
    await expect(service.complete('bob', result.uploadId)).rejects.toMatchObject({ status: 403 });
    await service.complete('alice', result.uploadId);
    await expect(service.resolve('alice', result.uploadId, 'post')).rejects.toMatchObject({
      status: 403,
    });
    await expect(service.resolve('alice', result.uploadId, 'chat', 'other')).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      service.assertOwnedUrl(
        'bob',
        'https://cdn.test/media/chat/valid.bin',
        'chat',
        input.conversationId,
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.assertOwnedUrl(
        'alice',
        'https://attacker.test/media/chat/valid.bin',
        'chat',
        input.conversationId,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('rejects size mismatch before copying', async () => {
    const result = await start();
    size = 6;
    await expect(service.complete('alice', result.uploadId)).rejects.toMatchObject({ status: 400 });
    expect(send.mock.calls.some(([command]) => command instanceof CopyObjectCommand)).toBe(false);
  });
  it('fails closed on Redis or conversation access failure', async () => {
    Object.defineProperty(client, 'status', { value: 'reconnecting' });
    await expect(start()).rejects.toMatchObject({ status: 503 });
    Object.defineProperty(client, 'status', { value: 'ready' });
    access.assertConversationAccess.mockRejectedValueOnce(new Error('Access denied'));
    await expect(start()).rejects.toThrow('Access denied');
  });
  it('rejects full storage before granting a signature', async () => {
    send.mockResolvedValueOnce({ Contents: [{ Size: 8 * 1024 ** 3 }], IsTruncated: false });
    await expect(start()).rejects.toMatchObject({ status: 503 });
  });
  it('serializes completion and abort, and abort never deletes a completed object', async () => {
    const result = await start();
    await client.set(`media:direct:${result.uploadId}:lock`, 'other', 'EX', 120);
    await expect(service.complete('alice', result.uploadId)).rejects.toMatchObject({ status: 409 });
    await expect(service.abort('alice', result.uploadId)).rejects.toMatchObject({ status: 409 });
    await client.del(`media:direct:${result.uploadId}:lock`);
    await service.complete('alice', result.uploadId);
    send.mockClear();
    await service.abort('alice', result.uploadId);
    expect(send).not.toHaveBeenCalled();
  });
  it('runs full media decoding before publishing direct media and propagates rejection', async () => {
    objectBytes = await voiceWebm();
    size = objectBytes.length;
    mime = 'audio/webm';
    const decode = vi
      .spyOn(mediaDecode, 'validateMediaDecoding')
      .mockRejectedValueOnce(new BadRequestException('Damaged encoded packet'));
    const result = await service.start('alice', {
      purpose: 'story',
      filename: 'voice.webm',
      contentType: mime,
      sizeBytes: size,
    });
    if (result.mode !== 'direct') throw new Error('Expected direct mode');
    await expect(service.complete('alice', result.uploadId)).rejects.toMatchObject({ status: 400 });
    expect(decode).toHaveBeenCalledWith(objectBytes);
    expect(
      send.mock.calls.some(
        ([command]) => command instanceof CopyObjectCommand || command instanceof PutObjectCommand,
      ),
    ).toBe(false);
  });

  it('reencodes direct images and strips source metadata before publication', async () => {
    objectBytes = await sharp(pngImage).jpeg().withMetadata().toBuffer();
    size = objectBytes.length;
    mime = 'image/jpeg';
    const result = await service.start('alice', {
      purpose: 'post',
      filename: 'photo.jpg',
      contentType: mime,
      sizeBytes: size,
    });
    if (result.mode !== 'direct') throw new Error('Expected direct mode');
    const receipt = await service.complete('alice', result.uploadId);
    expect(receipt).toMatchObject({
      contentType: 'image/webp',
      kind: 'IMAGE',
      width: 2,
      height: 2,
    });
    const put = send.mock.calls
      .map(([command]) => command)
      .find((command) => command instanceof PutObjectCommand);
    if (!(put instanceof PutObjectCommand) || !Buffer.isBuffer(put.input.Body))
      throw new Error('Missing normalized image');
    const image = await sharp(put.input.Body).metadata();
    expect(image.exif).toBeUndefined();
    expect(put.input.Body).not.toEqual(objectBytes);
    expect(send.mock.calls.some(([command]) => command instanceof CopyObjectCommand)).toBe(false);
  });
});
