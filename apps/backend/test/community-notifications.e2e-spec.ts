import { randomUUID } from 'node:crypto';
import { describe } from 'vitest';
import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import { OutboxService } from '../src/common/outbox/outbox.service';
import { OUTBOX_REPOSITORY } from '../src/common/outbox/outbox.constants';
import type { CreateOutboxEventInput } from '../src/common/outbox/interfaces/outbox-repository.interface';
import { DirectUploadsService } from '../src/common/media/direct-uploads.service';
import { RedisService } from '../src/redis/redis.service';
import { CommunitiesRepository } from '../src/messenger/communities/communities.repository';
import { ConversationsRepository } from '../src/messenger/repositories/conversations.repository';
import { MessagesRepository } from '../src/messenger/repositories/messages.repository';
import { CONVERSATIONS_REPOSITORY } from '../src/messenger/interfaces/conversations-repository.interface';
import { MESSAGES_REPOSITORY } from '../src/messenger/interfaces/messages-repository.interface';
import { MessagesService } from '../src/messenger/messages/messages.service';
import { MessengerMapper } from '../src/messenger/messenger.mapper';
import { UnreadProjectionService } from '../src/messenger/unread/unread-projection.service';

const connectionString = process.env.COMMUNITY_TEST_DATABASE_URL;
describe.skipIf(!connectionString)(
  'Community notification preferences and explicit mentions with PostgreSQL',
  () => {
    let prisma: PrismaService;
    let communities: CommunitiesRepository;
    let messages: MessagesService;
    let unread: UnreadProjectionService;
    let owner: string;
    let member: string;
    let outsider: string;
    let communityId: string;
    let channelId: string;
    let conversationId: string;
    const cached = new Map<string, string>();
    const previousUrl = process.env.DATABASE_URL;

    beforeAll(async () => {
      if (!connectionString) throw new Error('Explicit test URL required');
      const url = new URL(connectionString);
      if (
        !['127.0.0.1', 'localhost'].includes(url.hostname) ||
        url.pathname !== '/channel_layout_test'
      )
        throw new Error('Use only the isolated local channel_layout_test database');
      process.env.DATABASE_URL = connectionString;
      prisma = new PrismaService();
      await prisma.$connect();
      const module = await Test.createTestingModule({
        providers: [
          CommunitiesRepository,
          ConversationsRepository,
          MessagesRepository,
          MessagesService,
          MessengerMapper,
          UnreadProjectionService,
          OutboxService,
          { provide: PrismaService, useValue: prisma },
          { provide: CONVERSATIONS_REPOSITORY, useExisting: ConversationsRepository },
          { provide: MESSAGES_REPOSITORY, useExisting: MessagesRepository },
          { provide: ConfigService, useValue: { get: () => undefined } },
          { provide: DirectUploadsService, useValue: {} },
          {
            provide: RedisService,
            useValue: {
              get: (key: string) => Promise.resolve(cached.get(key) ?? null),
              set: (key: string, value: string) => {
                cached.set(key, value);
                return Promise.resolve();
              },
            },
          },
          {
            provide: OUTBOX_REPOSITORY,
            useValue: {
              createEvent: (input: CreateOutboxEventInput, tx: Prisma.TransactionClient) =>
                tx.outboxEvent.create({
                  data: {
                    aggregateType: input.aggregateType,
                    aggregateId: input.aggregateId,
                    eventType: input.eventType,
                    payload: input.payload,
                  },
                }),
            },
          },
        ],
      }).compile();
      communities = module.get(CommunitiesRepository);
      messages = module.get(MessagesService);
      unread = module.get(UnreadProjectionService);
      [owner, member, outsider] = [randomUUID(), randomUUID(), randomUUID()];
      await prisma.user.createMany({
        data: [owner, member, outsider].map((id) => ({
          id,
          email: `${id}@test.invalid`,
          username: `notify-${id}`,
          passwordHash: 'isolated-test-only',
        })),
      });
      communityId = (await communities.create(owner, { name: 'Notification fixture' })).id;
      const invitation = await communities.createInvite(communityId, owner, { expiresInDays: 1 });
      await communities.accept(invitation.token, member);
      const channel = await communities.createChannel(communityId, owner, {
        name: 'private mentions',
        isPrivate: true,
        memberIds: [member],
      });
      channelId = channel.id;
      conversationId = channel.conversationId;
    });

    afterAll(async () => {
      messages?.onModuleDestroy();
      if (prisma) {
        if (communityId) await prisma.community.delete({ where: { id: communityId } });
        if (owner)
          await prisma.user.deleteMany({ where: { id: { in: [owner, member, outsider] } } });
        await prisma.onModuleDestroy();
      }
      if (previousUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousUrl;
    });

    it('persists own preferences, inheritance/reset, mute expiry and self-only outbox without changing administration', async () => {
      const before = await communities.channels(communityId, member);
      await expect(communities.notificationPreferences(communityId, member)).resolves.toEqual({
        notificationMode: 'ALL',
        notificationMutedUntil: null,
      });
      await prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId: member } },
        data: { muteLevel: 'MESSAGES' },
      });
      const until = '2000-01-01T00:00:00.000Z';
      await communities.notificationPreferences(communityId, member, {
        notificationMode: 'MENTIONS',
        notificationMutedUntil: until,
      });
      await expect(
        communities.channelNotificationPreferences(communityId, channelId, member),
      ).resolves.toEqual({
        notificationMode: null,
        effectiveNotificationMode: 'MENTIONS',
        notificationMutedUntil: until,
      });
      await communities.channelNotificationPreferences(communityId, channelId, member, {
        notificationMode: 'NONE',
      });
      await expect(
        communities.channelNotificationPreferences(communityId, channelId, member, {
          notificationMode: null,
        }),
      ).resolves.toMatchObject({ notificationMode: null, effectiveNotificationMode: 'MENTIONS' });
      await communities.notificationPreferences(communityId, member, {
        notificationMutedUntil: null,
      });
      await expect(communities.notificationPreferences(communityId, owner)).resolves.toEqual({
        notificationMode: 'ALL',
        notificationMutedUntil: null,
      });
      expect((await communities.channels(communityId, member)).revision).toBe(before.revision);
      const participant = await prisma.conversationParticipant.findUniqueOrThrow({
        where: { conversationId_userId: { conversationId, userId: member } },
      });
      expect(participant.muteLevel).toBe('MESSAGES');
      const events = await prisma.outboxEvent.findMany({
        where: { aggregateId: communityId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 4,
      });
      expect(events).toHaveLength(4);
      for (const event of events)
        expect(event.payload).toMatchObject({ recipientIds: [member], removedUserIds: [] });
    });

    it('rolls back personal preferences when the transactional outbox fails', async () => {
      const before = await communities.notificationPreferences(communityId, owner);
      const module = await Test.createTestingModule({
        providers: [
          CommunitiesRepository,
          { provide: PrismaService, useValue: prisma },
          {
            provide: OutboxService,
            useValue: {
              recordEvent: () => {
                throw new Error('outbox failure');
              },
            },
          },
        ],
      }).compile();
      const failing = module.get(CommunitiesRepository);
      await expect(
        failing.notificationPreferences(communityId, owner, { notificationMode: 'NONE' }),
      ).rejects.toThrow('outbox failure');
      await expect(communities.notificationPreferences(communityId, owner)).resolves.toEqual(
        before,
      );
    });

    it('persists explicit mentions through history/outbox and leaves unread counts independent of NONE', async () => {
      await communities.notificationPreferences(communityId, member, { notificationMode: 'NONE' });
      const before =
        (await unread.getConversationCounts(member, [conversationId])).get(conversationId) ?? 0;
      const result = await messages.send(conversationId, owner, {
        text: 'opaque encrypted envelope',
        messageType: 'TEXT',
        mentionedUserIds: [member],
      });
      expect(result.mentionedUserIds).toEqual([member]);
      expect(
        (await prisma.message.findUniqueOrThrow({ where: { id: result.id } })).mentionedUserIds,
      ).toEqual([member]);
      const history = await messages.getMessages(conversationId, member, { limit: 50 });
      expect(history.data.find((message) => message.id === result.id)?.mentionedUserIds).toEqual([
        member,
      ]);
      const event = await prisma.outboxEvent.findFirstOrThrow({
        where: { aggregateId: result.id, eventType: 'MESSAGE_SENT' },
      });
      expect(event.payload).toMatchObject({ messageView: { mentionedUserIds: [member] } });
      expect(
        (await unread.getConversationCounts(member, [conversationId])).get(conversationId),
      ).toBe(before + 1);
    });

    it('replays original mention metadata for an idempotent retry without a second message', async () => {
      const count = await prisma.message.count({ where: { conversationId } });
      const first = await messages.send(conversationId, owner, {
        text: 'first body',
        messageType: 'TEXT',
        clientMessageId: 'mention-retry',
        mentionedUserIds: [member],
      });
      const retry = await messages.send(conversationId, owner, {
        text: 'changed body',
        messageType: 'TEXT',
        clientMessageId: 'mention-retry',
        mentionedUserIds: [outsider],
      });
      expect(retry.id).toBe(first.id);
      expect(retry.mentionedUserIds).toEqual([member]);
      expect(await prisma.message.count({ where: { conversationId } })).toBe(count + 1);
    });

    it('denies private preferences and mention targets immediately after access revocation', async () => {
      const snapshot = await communities.channels(communityId, owner);
      await communities.setChannelAccess(communityId, channelId, owner, {
        isPrivate: true,
        memberIds: [],
        revision: snapshot.revision,
      });
      await expect(
        communities.channelNotificationPreferences(communityId, channelId, member),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        communities.channelNotificationPreferences(communityId, channelId, member, {
          notificationMode: 'ALL',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        messages.send(conversationId, owner, {
          text: 'no revoked mention',
          messageType: 'TEXT',
          mentionedUserIds: [member],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        messages.send(conversationId, outsider, {
          text: 'forbidden',
          messageType: 'TEXT',
          mentionedUserIds: [owner],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('denies personal server settings after community membership removal', async () => {
      await communities.remove(communityId, owner, member, 'kick');
      await expect(
        communities.notificationPreferences(communityId, member, { notificationMode: 'ALL' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  },
);
