import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { createInMemoryRedisClient } from '../../../test/in-memory-db';
import { RedisService } from '../../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import { R2StorageService } from '../storage/r2-storage.service';
import { MediaAccessRepository } from './media-access.repository';
import { MediaBudgetService } from './media-budget.service';
import { DirectUploadsService } from './direct-uploads.service';
import type { DirectUploadInput } from './direct-upload.contract';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://storage.test/signed'),
}));

describe('direct upload ownership and immutable promotion', () => {
  let client: ReturnType<typeof createInMemoryRedisClient>;
  let redis: RedisService;
  let service: DirectUploadsService;
  const send = vi.fn();
  const access = { assertConversationAccess: vi.fn() };
  const input: DirectUploadInput = {
    purpose: 'chat',
    contentType: 'application/octet-stream',
    sizeBytes: 5,
    filename: 'encrypted.bin',
    conversationId: '11111111-1111-4111-8111-111111111111',
  };
  let metadata: Record<string, string>;
  let size: number;

  beforeEach(async () => {
    client = createInMemoryRedisClient();
    await client.flushdb();
    Object.defineProperty(client, 'status', { value: 'ready', configurable: true });
    redis = new RedisService(client);
    metadata = {};
    size = 5;
    vi.clearAllMocks();
    send.mockImplementation(async (command: unknown) => {
      if (command instanceof ListObjectsV2Command) return { Contents: [], IsTruncated: false };
      if (command instanceof HeadObjectCommand)
        return {
          ContentLength: size,
          ContentType: 'application/octet-stream',
          ETag: '"unchanged"',
          Metadata: metadata,
        };
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
            getPublicUrl: (key: string) => `https://cdn.test/${key}`,
          },
        },
        { provide: R2StorageService, useValue: { getDefaultBucket: () => 'media' } },
        { provide: RedisService, useValue: redis },
        {
          provide: ConfigService,
          useValue: new ConfigService({ DIRECT_UPLOADS_REQUIRED: 'true' }),
        },
        MediaBudgetService,
        { provide: MediaAccessRepository, useValue: access },
      ],
    }).compile();
    service = module.get(DirectUploadsService);
  });
  afterEach(() => redis.onModuleDestroy());

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
});
