import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { describe } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { CreateBucketCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '@common/prisma';
import { createInMemoryRedisClient } from './in-memory-db';
import { RedisService } from '../src/redis/redis.service';
import { UsersService } from '../src/users/users.service';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { TokenRevocationService } from '../src/auth/token-revocation.service';
import { R2StorageService } from '../src/common/storage/r2-storage.service';
import { StorageService } from '../src/common/storage/storage.service';
import { DirectUploadsService } from '../src/common/media/direct-uploads.service';
import { DirectUploadsController } from '../src/common/media/direct-uploads.controller';
import { MediaAccessRepository } from '../src/common/media/media-access.repository';
import { MediaBudgetService } from '../src/common/media/media-budget.service';
import { PendingMediaRepository } from '../src/common/media/pending-media.repository';
import { OutboxService } from '../src/common/outbox/outbox.service';
import { CommunitiesRepository } from '../src/messenger/communities/communities.repository';
import { MessagesRepository } from '../src/messenger/repositories/messages.repository';
import type { CompletedUpload } from '../src/common/media/direct-upload.contract';

const connection = process.env.COMMUNITY_TEST_DATABASE_URL;
const endpoint = process.env.PRIVATE_MEDIA_TEST_S3_ENDPOINT;

// Opt-in, loopback-only fixture. No production buckets or credentials are accepted.
describe.skipIf(!connection || !endpoint)(
  'Private channel media over HTTP/JWT, PostgreSQL and S3',
  () => {
    let prisma: PrismaService;
    let storage: R2StorageService;
    let app: INestApplication<Server>;
    let uploads: DirectUploadsService;
    let access: MediaAccessRepository;
    let communities: CommunitiesRepository;
    let messages: MessagesRepository;
    let jwt: JwtService;
    let redis: RedisService;
    let owner: string;
    let member: string;
    let outsider: string;
    let communityId: string;
    let channelId: string;
    let conversationId: string;
    let receipt: CompletedUpload;
    let sourceMessageId: string;
    const publicBucket = `media-public-${randomUUID()}`;
    const privateBucket = `media-private-${randomUUID()}`;
    const previousUrl = process.env.DATABASE_URL;
    const secret = 'isolated-private-media-jwt-secret';
    const payload = Buffer.from('private file content');

    const token = (id: string) => jwt.sign({ sub: id, type: 'access', jti: randomUUID() });

    beforeAll(async () => {
      if (!connection || !endpoint) throw new Error('Explicit fixture URLs required');
      const database = new URL(connection);
      const objectStorage = new URL(endpoint);
      if (
        !['127.0.0.1', 'localhost'].includes(database.hostname) ||
        database.pathname !== '/channel_layout_test' ||
        !['127.0.0.1', 'localhost'].includes(objectStorage.hostname) ||
        objectStorage.port !== '59000'
      )
        throw new Error('Use only disposable loopback fixtures');
      process.env.DATABASE_URL = connection;
      prisma = new PrismaService();
      await prisma.$connect();
      const config = new ConfigService({
        JWT_ACCESS_SECRET: secret,
        R2_ENDPOINT: endpoint,
        R2_ACCESS_KEY_ID: 'private-media-test',
        R2_SECRET_ACCESS_KEY: 'private-media-test-only',
        R2_BUCKET: publicBucket,
        R2_PRIVATE_BUCKET: privateBucket,
        R2_PUBLIC_URL: `${endpoint}/${publicBucket}`,
        S3_FORCE_PATH_STYLE: 'true',
        MEDIA_PENDING_TRACKING_ENABLED: 'true',
        DIRECT_UPLOADS_REQUIRED: 'true',
      });
      storage = new R2StorageService(config);
      await storage.getS3Client().send(new CreateBucketCommand({ Bucket: publicBucket }));
      await storage.getS3Client().send(new CreateBucketCommand({ Bucket: privateBucket }));
      const client = createInMemoryRedisClient();
      Object.defineProperty(client, 'status', { value: 'ready', configurable: true });
      redis = new RedisService(client);
      const module = await Test.createTestingModule({
        imports: [
          PassportModule.register({ defaultStrategy: 'jwt' }),
          JwtModule.register({ secret, signOptions: { expiresIn: '5m' } }),
        ],
        controllers: [DirectUploadsController],
        providers: [
          DirectUploadsService,
          MediaAccessRepository,
          MediaBudgetService,
          PendingMediaRepository,
          CommunitiesRepository,
          MessagesRepository,
          JwtStrategy,
          { provide: PrismaService, useValue: prisma },
          { provide: ConfigService, useValue: config },
          { provide: R2StorageService, useValue: storage },
          { provide: RedisService, useValue: redis },
          {
            provide: StorageService,
            useValue: {
              isLocal: () => false,
              isR2: () => true,
              getS3Client: () => storage.getS3Client(),
              getPublicUrl: (key: string) => storage.getPublicUrl(key),
            },
          },
          {
            provide: UsersService,
            useValue: { findById: (id: string) => prisma.user.findUnique({ where: { id } }) },
          },
          // This fixture verifies JWT signature/expiry; production revocation service has separate tests.
          { provide: TokenRevocationService, useValue: { isTokenRevoked: () => false } },
          { provide: OutboxService, useValue: { recordEvent: async () => undefined } },
        ],
      }).compile();
      uploads = module.get(DirectUploadsService);
      access = module.get(MediaAccessRepository);
      communities = module.get(CommunitiesRepository);
      messages = module.get(MessagesRepository);
      jwt = module.get(JwtService);
      app = module.createNestApplication();
      await app.init();
      [owner, member, outsider] = [randomUUID(), randomUUID(), randomUUID()];
      for (const id of [owner, member, outsider])
        await prisma.user.create({
          data: {
            id,
            email: `${id}@test.invalid`,
            username: `private-${id}`,
            passwordHash: 'isolated-test-only',
          },
        });
      const community = await communities.create(owner, { name: 'Private file fixture' });
      communityId = community.id;
      const invite = await communities.createInvite(communityId, owner, { expiresInDays: 7 });
      for (const id of [member, outsider]) await communities.accept(invite.token, id);
      const channel = await communities.createChannel(communityId, owner, {
        name: 'Private files',
        isPrivate: true,
        memberIds: [member],
      });
      channelId = channel.id;
      conversationId = channel.conversationId;
    }, 30000);

    afterAll(async () => {
      if (app) await app.close();
      if (redis) redis.onModuleDestroy();
      if (storage) storage.getS3Client().destroy();
      if (prisma) await prisma.onModuleDestroy();
      if (previousUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousUrl;
    });

    it('uploads and promotes through the closed bucket without anonymous read access', async () => {
      const start = await uploads.start(member, {
        purpose: 'chat',
        conversationId,
        filename: 'private.bin',
        contentType: 'application/octet-stream',
        sizeBytes: payload.length,
      });
      if (start.mode !== 'direct') throw new Error('Private upload must be direct');
      expect(new URL(start.url).pathname).toContain(`/${privateBucket}/_incoming/`);
      const put = await fetch(start.url, { method: 'PUT', headers: start.headers, body: payload });
      expect(put.ok).toBe(true);
      expect((await fetch(start.url.split('?')[0])).status).toBe(403);
      receipt = await uploads.complete(member, start.uploadId);
      expect(receipt.url).toBe(`private-media://${start.uploadId}`);
      const row = await prisma.privateMediaObject.findUniqueOrThrow({
        where: { id: start.uploadId },
      });
      expect(row.bucket).toBe(privateBucket);
      expect((await fetch(`${endpoint}/${privateBucket}/${row.key}`)).status).toBe(403);
      await uploads.resolve(member, receipt.uploadId, 'chat', conversationId);
      sourceMessageId = (
        await messages.create({
          conversationId,
          senderId: member,
          attachments: [{ type: 'FILE', url: receipt.url }],
        })
      ).id;
    });

    it('requires valid JWT and actual visible membership before issuing a 60-second GET', async () => {
      const path = `/uploads/direct/private/${receipt.uploadId}`;
      await request(app.getHttpServer()).get(path).expect(401);
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', 'Bearer forged')
        .expect(401);
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', `Bearer ${token(outsider)}`)
        .expect(403);
      const response = await request(app.getHttpServer())
        .get(path)
        .set('Authorization', `Bearer ${token(member)}`)
        .expect(200);
      expect(response.headers['cache-control']).toBe('private, no-store');
      const body: unknown = response.body;
      if (!body || typeof body !== 'object' || !('url' in body) || typeof body.url !== 'string')
        throw new Error('Signed GET missing');
      expect(new URL(body.url).searchParams.get('X-Amz-Expires')).toBe('60');
      expect(await (await fetch(body.url)).text()).toBe(payload.toString());
    });

    it('rejects forged ownership, public thumbnails and unretained private references', async () => {
      await expect(
        uploads.assertOwnedUrl(owner, receipt.url, 'chat', conversationId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        messages.create({
          conversationId,
          senderId: member,
          attachments: [
            { type: 'IMAGE', url: receipt.url, thumbnailUrl: 'https://public.invalid/leak' },
          ],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        messages.create({
          conversationId,
          senderId: member,
          attachments: [{ type: 'FILE', url: `private-media://${randomUUID()}` }],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('honors per-user/all-user deletion visibility and archived channel reads', async () => {
      await messages.deleteForMe(sourceMessageId, member);
      await expect(access.privateObjectForReader(receipt.uploadId, member)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(await access.privateObjectForReader(receipt.uploadId, owner)).toMatchObject({
        id: receipt.uploadId,
      });
      const snapshot = await communities.channels(communityId, owner);
      await communities.setChannelArchived(communityId, channelId, owner, {
        revision: snapshot.revision,
        archived: true,
      });
      expect(await uploads.downloadPrivate(owner, receipt.uploadId)).toHaveProperty('url');
      const archived = await communities.channels(communityId, owner);
      await communities.setChannelArchived(communityId, channelId, owner, {
        revision: archived.revision,
        archived: false,
      });
    });

    it('allows explicit forward export while fresh source URLs are denied after revoke', async () => {
      const destination = await communities.createChannel(communityId, owner, {
        name: 'Export destination',
      });
      // The source owner can explicitly forward. Target membership controls that exported copy.
      await messages.create({
        conversationId: destination.conversationId,
        sourceConversationId: conversationId,
        senderId: owner,
        attachments: [{ type: 'FILE', url: receipt.url }],
      });
      expect(await access.privateObjectForReader(receipt.uploadId, outsider)).toHaveProperty('id');
      const before = await communities.channels(communityId, owner);
      await communities.setChannelAccess(communityId, channelId, owner, {
        isPrivate: true,
        memberIds: [],
        revision: before.revision,
      });
      // Member still sees the deliberate export, but cannot use or complete a source-bound upload.
      await expect(
        uploads.resolve(member, receipt.uploadId, 'chat', conversationId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(uploads.complete(member, receipt.uploadId)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(await access.privateObjectForReader(receipt.uploadId, member)).toHaveProperty('id');
      await communities.remove(communityId, owner, outsider, 'kick');
      await expect(uploads.downloadPrivate(outsider, receipt.uploadId)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('denies completion of a public reservation if privacy changes before promotion', async () => {
      const channel = await communities.createChannel(communityId, owner, {
        name: 'Privacy transition',
      });
      const start = await uploads.start(owner, {
        purpose: 'chat',
        conversationId: channel.conversationId,
        filename: 'transition.bin',
        contentType: 'application/octet-stream',
        sizeBytes: payload.length,
      });
      if (start.mode !== 'direct') throw new Error('Expected direct upload');
      expect(
        (await fetch(start.url, { method: 'PUT', body: payload, headers: start.headers })).ok,
      ).toBe(true);
      const snapshot = await communities.channels(communityId, owner);
      await communities.setChannelAccess(communityId, channel.id, owner, {
        revision: snapshot.revision,
        isPrivate: true,
        memberIds: [],
      });
      await expect(uploads.complete(owner, start.uploadId)).rejects.toThrow(
        'Channel access changed',
      );
      expect(
        await prisma.privateMediaObject.findUnique({ where: { id: start.uploadId } }),
      ).toBeNull();
    });
  },
);
