import { randomUUID } from 'node:crypto';
import { describe } from 'vitest';
import type { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { R2StorageService } from '../storage/r2-storage.service';
import { PendingMediaRepository } from './pending-media.repository';
import { PendingMediaCleanupService } from './pending-media-cleanup.service';
import { withUnreadWriteLock } from '../../messenger/unread/unread-write-lock';

const connection = process.env.PRIVATE_ORPHAN_TEST_DATABASE_URL;
const before = new Date(Date.now() - 2 * 86400_000);

// Deliberately separate from the application schema: only a disposable, named
// loopback fixture is allowed, and no real storage credentials are used.
describe.skipIf(!connection)('private orphan cleanup on PostgreSQL', () => {
  let prisma: PrismaService;
  let pending: PendingMediaRepository;
  beforeAll(async () => {
    if (!connection) throw new Error('Explicit fixture connection required');
    const url = new URL(connection);
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      url.pathname !== '/private_orphan_test' ||
      url.username !== 'private_orphan_fixture'
    )
      throw new Error('Use only the disposable private orphan fixture');
    vi.stubEnv('DATABASE_URL', connection);
    vi.stubEnv('SERVICE_ROLE', 'core');
    vi.stubEnv('BACKGROUND_ENABLED', 'true');
    prisma = new PrismaService();
    await prisma.$connect();
    for (const ddl of [
      `CREATE TYPE "PendingMediaState" AS ENUM ('PENDING', 'RETAINED', 'DELETING', 'DELETED')`,
      `CREATE TABLE "PendingMediaObject" (key text PRIMARY KEY, "uploadId" text UNIQUE NOT NULL,
        "ownerId" text NOT NULL, bucket text, state "PendingMediaState" NOT NULL DEFAULT 'PENDING',
        "createdAt" timestamp NOT NULL DEFAULT now(), "deletedAt" timestamp)`,
      `CREATE TABLE private_media_objects (id text PRIMARY KEY, key text UNIQUE NOT NULL,
        bucket text NOT NULL, "ownerId" text NOT NULL, "conversationId" text NOT NULL,
        "contentType" text NOT NULL, "sizeBytes" integer NOT NULL, "readyAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now())`,
      `CREATE TABLE "User" (id text PRIMARY KEY)`,
      `CREATE TABLE "MessageAttachment" (id text PRIMARY KEY, url text NOT NULL, "thumbnailUrl" text)`,
    ])
      await prisma.$executeRawUnsafe(ddl);
    pending = new PendingMediaRepository(prisma);
  });
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "MessageAttachment", private_media_objects, "PendingMediaObject", "User"',
    );
  });
  afterAll(async () => {
    if (prisma) await prisma.onModuleDestroy();
    vi.unstubAllEnvs();
  });
  const fixture = async (ready = true) => {
    const id = randomUUID();
    const key = `private-chat/${id}.bin`;
    await prisma.pendingMediaObject.create({
      data: {
        key,
        uploadId: id,
        ownerId: 'deleted-owner',
        bucket: 'closed-media',
        state: 'RETAINED',
      },
    });
    await prisma.privateMediaObject.create({
      data: {
        id,
        key,
        ownerId: 'deleted-owner',
        bucket: 'closed-media',
        conversationId: 'original-conversation',
        contentType: 'application/octet-stream',
        sizeBytes: 10,
        readyAt: ready ? new Date() : null,
      },
    });
    return { id, key, url: `private-media://${id}` };
  };
  const addReference = (url: string, thumbnail = false) =>
    prisma.$executeRaw`INSERT INTO "MessageAttachment" (id, url, "thumbnailUrl")
      VALUES (${randomUUID()}, ${thumbnail ? 'https://example.invalid/forward.bin' : url}, ${thumbnail ? url : null})`;

  it('preserves primary, forwarded and thumbnail references, existing owners and in-flight promotions', async () => {
    const primary = await fixture();
    const forwardedThumbnail = await fixture();
    const owned = await fixture();
    const inFlight = await fixture(false);
    await addReference(primary.url);
    await addReference(forwardedThumbnail.url, true);
    await prisma.privateMediaObject.update({
      where: { id: owned.id },
      data: { ownerId: 'live-owner' },
    });
    await prisma.pendingMediaObject.update({
      where: { key: owned.key },
      data: { ownerId: 'live-owner' },
    });
    await prisma.$executeRaw`INSERT INTO "User" (id) VALUES ('live-owner')`;
    const orphan = await fixture();
    const publicKey = `public/${randomUUID()}`;
    await prisma.pendingMediaObject.create({
      data: {
        key: publicKey,
        uploadId: randomUUID(),
        ownerId: 'deleted-owner',
        state: 'RETAINED',
      },
    });
    const legacy = await fixture();
    await prisma.pendingMediaObject.delete({ where: { key: legacy.key } });
    expect((await pending.candidates(before, true)).map(({ key }) => key)).toEqual([orphan.key]);
    for (const { key } of [primary, forwardedThumbnail, owned, inFlight, legacy])
      expect(await pending.claimDeletion(key, before, true)).toBe(false);
    expect(await pending.claimDeletion(publicKey, before, true)).toBe(false);
  });

  it('waits for publication and rechecks a newly committed forward before claiming deletion', async () => {
    const object = await fixture();
    expect(await pending.candidates(before, true)).toEqual([
      { key: object.key, bucket: 'closed-media' },
    ]);
    let entered!: () => void;
    let release!: () => void;
    const locked = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const publication = withUnreadWriteLock(
      prisma,
      {
        conversationIds: [],
        attachmentUrls: [object.url],
      },
      async (tx) => {
        entered();
        await gate;
        await tx.$executeRaw`INSERT INTO "MessageAttachment" (id, url) VALUES (${randomUUID()}, ${object.url})`;
      },
    );
    await locked;
    const deletion = pending.claimDeletion(object.key, before, true);
    try {
      await vi.waitFor(
        async () => {
          const waiting = await prisma.$queryRaw<{ waiting: boolean }[]>`
          SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE wait_event_type = 'Lock'
            AND query LIKE '%PendingMediaObject%') AS waiting`;
          expect(waiting[0]?.waiting).toBe(true);
        },
        { timeout: 5000, interval: 20 },
      );
    } finally {
      release();
    }
    await publication;
    expect(await deletion).toBe(false);
    expect(
      (await prisma.pendingMediaObject.findUniqueOrThrow({ where: { key: object.key } })).state,
    ).toBe('RETAINED');
  });

  it('rejects publication after cleanup claims the registry row', async () => {
    const object = await fixture();
    expect(await pending.claimDeletion(object.key, before, true)).toBe(true);
    const write = vi.fn();
    await expect(
      withUnreadWriteLock(
        prisma,
        {
          conversationIds: [],
          attachmentUrls: [object.url],
        },
        write,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(write).not.toHaveBeenCalled();
  });

  it('retains the locator on storage failure, then deletes it only after a successful retry', async () => {
    const object = await fixture();
    const send = vi
      .fn<(command: DeleteObjectCommand) => Promise<Record<string, never>>>()
      .mockRejectedValueOnce(new Error('synthetic storage failure'))
      .mockResolvedValue({});
    const module = await Test.createTestingModule({
      providers: [
        PendingMediaCleanupService,
        { provide: PendingMediaRepository, useValue: pending },
        {
          provide: ConfigService,
          useValue: new ConfigService({
            MEDIA_PENDING_TRACKING_ENABLED: 'true',
            MEDIA_ORPHAN_CLEANUP_ENABLED: 'true',
            MEDIA_PRIVATE_ORPHAN_CLEANUP_ENABLED: 'true',
          }),
        },
        {
          provide: StorageService,
          useValue: { isLocal: () => false, getS3Client: () => ({ send }) },
        },
        { provide: R2StorageService, useValue: { getDefaultBucket: () => 'public-media' } },
      ],
    }).compile();
    const cleanup = module.get(PendingMediaCleanupService);
    await cleanup.cleanup();
    expect(
      (await prisma.pendingMediaObject.findUniqueOrThrow({ where: { key: object.key } })).state,
    ).toBe('DELETING');
    expect(await prisma.privateMediaObject.findUnique({ where: { id: object.id } })).not.toBeNull();
    await cleanup.cleanup();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]?.[0].input).toEqual({ Bucket: 'closed-media', Key: object.key });
    expect(
      (await prisma.pendingMediaObject.findUniqueOrThrow({ where: { key: object.key } })).state,
    ).toBe('DELETED');
    expect(await prisma.privateMediaObject.findUnique({ where: { id: object.id } })).toBeNull();
  });
});
