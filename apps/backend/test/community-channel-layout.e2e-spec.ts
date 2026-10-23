import { randomUUID } from 'node:crypto';
import { describe, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import { OutboxService } from '../src/common/outbox/outbox.service';
import { OUTBOX_REPOSITORY } from '../src/common/outbox/outbox.constants';
import type { CreateOutboxEventInput } from '../src/common/outbox/interfaces/outbox-repository.interface';
import { CommunitiesRepository } from '../src/messenger/communities/communities.repository';
import { MessagesRepository } from '../src/messenger/repositories/messages.repository';
import { CallsRepository } from '../src/messenger/repositories/calls.repository';
import { ConversationsRepository } from '../src/messenger/repositories/conversations.repository';
import { SearchRepository } from '../src/messenger/repositories/search.repository';
import { MediaAccessRepository } from '../src/common/media/media-access.repository';

// Opt in only against the disposable database described in the verification record.
const connectionString = process.env.COMMUNITY_TEST_DATABASE_URL;
describe.skipIf(!connectionString)('Community layout with PostgreSQL transactions', () => {
  let prisma: PrismaService;
  let repository: CommunitiesRepository;
  let messages: MessagesRepository;
  let calls: CallsRepository;
  let conversations: ConversationsRepository;
  let owner: string;
  let communityId: string;
  let channelId: string;
  let conversationId: string;
  const categoryId = randomUUID();
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
        MessagesRepository,
        CallsRepository,
        ConversationsRepository,
        OutboxService,
        { provide: PrismaService, useValue: prisma },
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
    repository = module.get(CommunitiesRepository);
    messages = module.get(MessagesRepository);
    calls = module.get(CallsRepository);
    conversations = module.get(ConversationsRepository);
    owner = randomUUID();
    await prisma.user.create({
      data: {
        id: owner,
        email: `${owner}@test.invalid`,
        username: `layout-${owner}`,
        passwordHash: 'isolated-test-only',
      },
    });
    const community = await repository.create(owner, { name: 'Layout test' });
    communityId = community.id;
    const channels = await repository.channels(communityId, owner);
    channelId = channels.data[0].id;
    conversationId = channels.data[0].conversationId;
    await prisma.message.create({
      data: { conversationId, senderId: owner, body: 'History survives organization' },
    });
  });

  afterAll(async () => {
    if (prisma) await prisma.onModuleDestroy();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  });

  it('holds the channel mutation lock until media promotion finishes', async () => {
    const community = await repository.create(owner, { name: 'Upload lock fixture' });
    const snapshot = await repository.channels(community.id, owner);
    const channel = snapshot.data[0];
    const access = new MediaAccessRepository(prisma);
    let entered = false;
    let release!: () => void;
    const promotion = new Promise<void>((resolve) => {
      release = resolve;
    });
    const publication = access.withUploadPublication(
      channel.conversationId,
      owner,
      false,
      async () => {
        entered = true;
        await promotion;
        return 'published';
      },
    );
    // Observe failure below without allowing a rejected background transaction
    // to become an unhandled rejection while the barrier is being checked.
    void publication.catch(() => undefined);
    try {
      await vi.waitFor(() => expect(entered).toBe(true));
      await expect(
        prisma.$transaction(
          (tx) => tx.$queryRaw`
        SELECT id FROM communities WHERE id = ${community.id} FOR UPDATE NOWAIT
      `,
        ),
      ).rejects.toThrow(/could not obtain lock/);
    } finally {
      release();
      await publication;
    }
    await expect(
      repository.setChannelAccess(community.id, channel.id, owner, {
        revision: snapshot.revision,
        isPrivate: true,
        memberIds: [],
      }),
    ).resolves.toMatchObject({ isPrivate: true });
    await expect(
      access.withUploadPublication(channel.conversationId, owner, false, async () => 'unexpected'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows exactly one concurrent editor and commits metadata and outbox together', async () => {
    const snapshot = await repository.channels(communityId, owner);
    const before = await prisma.outboxEvent.count({ where: { aggregateId: communityId } });
    const input = {
      revision: snapshot.revision,
      categories: [{ id: categoryId, name: 'Studio' }],
      channels: [{ id: channelId, name: 'welcome', description: 'New topic', categoryId }],
    };
    const results = await Promise.allSettled([
      repository.updateChannelLayout(communityId, owner, input),
      repository.updateChannelLayout(communityId, owner, {
        ...input,
        channels: [{ ...input.channels[0], name: 'other editor' }],
      }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason).toBeInstanceOf(ConflictException);
    const current = await repository.channels(communityId, owner);
    const conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
    });
    expect(current.revision).toBe(snapshot.revision + 1);
    expect(conversation.name).toBe(current.data[0].name);
    expect(conversation.description).toBe(current.data[0].description);
    expect(current.data[0].categoryId).toBe(categoryId);
    expect(await prisma.message.count({ where: { conversationId } })).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: communityId } })).toBe(
      before + 1,
    );
  });

  it('rolls back channel, category and revision if transactional outbox publication fails', async () => {
    const snapshot = await repository.channels(communityId, owner);
    const module = await Test.createTestingModule({
      providers: [
        CommunitiesRepository,
        { provide: PrismaService, useValue: prisma },
        {
          provide: OutboxService,
          useValue: {
            recordEvent: async () => {
              throw new Error('outbox failure');
            },
          },
        },
      ],
    }).compile();
    const failing = module.get(CommunitiesRepository);
    await expect(
      failing.updateChannelLayout(communityId, owner, {
        revision: snapshot.revision,
        categories: [],
        channels: [{ id: channelId, name: 'must roll back', description: '', categoryId: null }],
      }),
    ).rejects.toThrow('outbox failure');
    await expect(
      failing.setChannelArchived(communityId, channelId, owner, {
        revision: snapshot.revision,
        archived: true,
      }),
    ).rejects.toThrow('outbox failure');
    expect(await repository.channels(communityId, owner)).toEqual(snapshot);
    expect(
      (await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } })).name,
    ).toBe(snapshot.data[0].name);
  });

  it('enforces category tenant isolation in both the repository and database foreign key', async () => {
    const foreignCommunity = await repository.create(owner, { name: 'Other community' });
    const foreign = await prisma.communityCategory.create({
      data: { communityId: foreignCommunity.id, name: 'Private structure' },
    });
    const snapshot = await repository.channels(communityId, owner);
    await expect(
      repository.updateChannelLayout(communityId, owner, {
        revision: snapshot.revision,
        categories: [{ id: foreign.id, name: 'Cannot move this' }],
        channels: snapshot.data.map((channel) => ({
          id: channel.id,
          name: channel.name,
          description: channel.description,
          categoryId: foreign.id,
        })),
      }),
    ).rejects.toThrow('Category belongs to another community');
    await expect(
      prisma.communityChannel.update({
        where: { id: channelId },
        data: { categoryId: foreign.id },
      }),
    ).rejects.toThrow();
    expect(await repository.channels(communityId, owner)).toEqual(snapshot);
  });

  it('keeps channels and history when removing a category, without changing membership', async () => {
    const snapshot = await repository.channels(communityId, owner);
    const input = {
      revision: snapshot.revision,
      categories: [],
      channels: snapshot.data.map((channel) => ({
        id: channel.id,
        name: channel.name,
        description: channel.description,
        categoryId: null,
      })),
    };
    await expect(
      repository.updateChannelLayout(communityId, randomUUID(), input),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await repository.updateChannelLayout(communityId, owner, input);
    expect(await prisma.communityCategory.count({ where: { communityId } })).toBe(0);
    expect(await prisma.message.count({ where: { conversationId } })).toBe(1);
    expect(
      await prisma.conversationParticipant.count({ where: { conversationId, leftAt: null } }),
    ).toBe(1);
    // Old clients may still append channels; this must invalidate an open layout draft.
    const old = await repository.channels(communityId, owner);
    await repository.createChannel(communityId, owner, { name: 'new channel' });
    await expect(
      repository.updateChannelLayout(communityId, owner, { ...input, revision: old.revision }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('serializes archive with publication, preserves reads/unread and restores the same conversation', async () => {
    const before = await repository.channels(communityId, owner);
    const historyCount = await prisma.message.count({ where: { conversationId } });
    const results = await Promise.allSettled([
      repository.setChannelArchived(communityId, channelId, owner, {
        revision: before.revision,
        archived: true,
      }),
      messages.create({ conversationId, senderId: owner, body: 'Concurrent publication' }),
    ]);
    expect(results[0].status).toBe('fulfilled');
    const published = results[1].status === 'fulfilled' ? 1 : 0;
    if (results[1].status === 'rejected')
      expect(results[1].reason).toBeInstanceOf(ForbiddenException);
    const archived = await repository.channels(communityId, owner);
    expect(archived.data.find((channel) => channel.id === channelId)?.archivedAt).toBeInstanceOf(
      Date,
    );
    const message = await prisma.message.findFirstOrThrow({ where: { conversationId } });
    await expect(
      messages.create({ conversationId, senderId: owner, body: 'Must fail' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(messages.edit(message.id, 'Must fail', owner)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(messages.addReaction(message.id, owner, '👍')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      conversations.pinMessage(conversationId, message.id, owner),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      calls.createCall({ conversationId, initiatorId: owner, participantIds: [], type: 'AUDIO' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(await prisma.message.count({ where: { conversationId } })).toBe(
      historyCount + published,
    );
    expect(
      (await messages.findMany({ conversationId, requestingUserId: owner, limit: 50 })).length,
    ).toBe(historyCount + published);
    expect(
      (await messages.search(conversationId, owner, 'History', 10)).some(
        (item) => item.id === message.id,
      ),
    ).toBe(true);
    await messages.markAllRead(conversationId, owner);
    expect(await conversations.countUnread(conversationId, owner)).toBe(0);
    await repository.setChannelArchived(communityId, channelId, owner, {
      revision: archived.revision,
      archived: false,
    });
    const restored = await messages.create({
      conversationId,
      senderId: owner,
      body: 'Posting restored',
    });
    expect(restored.conversationId).toBe(conversationId);
    const current = await repository.channels(communityId, owner);
    expect(current.data.find((channel) => channel.id === channelId)?.archivedAt).toBeNull();
    expect(current.revision).toBe(before.revision + 2);
  });

  it('does not archive a live call and rejects stale restoration after a newer edit', async () => {
    const snapshot = await repository.channels(communityId, owner);
    const call = await calls.createCall({
      conversationId,
      initiatorId: owner,
      participantIds: [],
      type: 'AUDIO',
    });
    await expect(
      repository.setChannelArchived(communityId, channelId, owner, {
        revision: snapshot.revision,
        archived: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await prisma.call.update({ where: { id: call.id }, data: { status: 'ENDED' } });
    await repository.setChannelArchived(communityId, channelId, owner, {
      revision: snapshot.revision,
      archived: true,
    });
    await expect(
      repository.setChannelArchived(communityId, channelId, owner, {
        revision: snapshot.revision,
        archived: false,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    const archived = await repository.channels(communityId, owner);
    await repository.setChannelArchived(communityId, channelId, owner, {
      revision: archived.revision,
      archived: false,
    });
  });
  async function accessFixture() {
    const memberIds = [randomUUID(), randomUUID()];
    for (const id of memberIds)
      await prisma.user.create({
        data: {
          id,
          email: `${id}@test.invalid`,
          username: `private-${id}`,
          passwordHash: 'isolated-test-only',
        },
      });
    const community = await repository.create(owner, { name: 'Private channel test' });
    const invite = await repository.createInvite(community.id, owner, { expiresInDays: 7 });
    for (const id of memberIds) await repository.accept(invite.token, id);
    const channel = await repository.createChannel(community.id, owner, {
      name: 'Private discussion',
      isPrivate: true,
      memberIds: [memberIds[0]],
    });
    return { community, channel, member: memberIds[0], outsider: memberIds[1], invite };
  }

  it('keeps private history, local/global search, media and calls within active grants', async () => {
    const { community, channel, member, outsider } = await accessFixture();
    const sent = await messages.create({
      conversationId: channel.conversationId,
      senderId: member,
      body: 'Private access regression',
    });
    expect(
      (await repository.channels(community.id, outsider)).data.map((item) => item.id),
    ).not.toContain(channel.id);
    expect((await repository.channels(community.id, member)).data.map((item) => item.id)).toContain(
      channel.id,
    );
    expect(await conversations.findOneForUser(channel.conversationId, outsider)).toBeNull();
    expect(await messages.findOne(sent.id, outsider)).toBeNull();
    expect(
      await messages.findMany({
        conversationId: channel.conversationId,
        requestingUserId: outsider,
        limit: 10,
      }),
    ).toEqual([]);
    expect(await messages.search(channel.conversationId, outsider, 'Private', 10)).toEqual([]);
    expect(await messages.search(channel.conversationId, member, 'Private', 10)).toHaveLength(1);
    const search = new SearchRepository(prisma);
    expect(
      (
        await search.searchGlobal(outsider, {
          q: 'Private',
          conversationId: channel.conversationId,
          type: 'all',
          limit: 20,
          offset: 0,
        })
      ).messages,
    ).toEqual([]);
    await expect(
      new MediaAccessRepository(prisma).assertConversationAccess(channel.conversationId, member),
    ).resolves.toEqual({ isPrivate: true });
    await expect(
      messages.create({
        conversationId: channel.conversationId,
        senderId: member,
        attachments: [{ type: 'FILE', url: 'https://public.invalid/object' }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      calls.createCall({
        conversationId: channel.conversationId,
        initiatorId: owner,
        participantIds: [outsider],
        type: 'AUDIO',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const before = await repository.channels(community.id, owner);
    await repository.setChannelAccess(community.id, channel.id, owner, {
      isPrivate: true,
      memberIds: [],
      revision: before.revision,
    });
    expect(await messages.findOne(sent.id, member)).toBeNull();
    const destination = await repository.createChannel(community.id, owner, {
      name: 'Forward destination',
    });
    await expect(
      messages.create({
        conversationId: destination.conversationId,
        sourceConversationId: channel.conversationId,
        senderId: member,
        body: 'stale source copy',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(messages.edit(sent.id, 'revoked edit', member)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(messages.addReaction(sent.id, member, 'x')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(
      await prisma.conversationParticipant.count({
        where: { conversationId: channel.conversationId, userId: member, leftAt: null },
      }),
    ).toBe(0);
    const regrant = await repository.channels(community.id, owner);
    await repository.setChannelAccess(community.id, channel.id, owner, {
      isPrivate: true,
      memberIds: [member],
      revision: regrant.revision,
    });
    expect(await messages.findOne(sent.id, member)).not.toBeNull();
  });

  it('resynchronizes role and ownership access and drops old explicit grants on rejoin', async () => {
    const { community, channel, member, outsider, invite } = await accessFixture();
    await repository.setRole(community.id, owner, outsider, 'ADMIN');
    expect(await conversations.findOneForUser(channel.conversationId, outsider)).not.toBeNull();
    await repository.setRole(community.id, owner, outsider, 'MEMBER');
    expect(await conversations.findOneForUser(channel.conversationId, outsider)).toBeNull();
    await repository.remove(community.id, member, member, 'leave');
    await repository.accept(invite.token, member);
    expect(await conversations.findOneForUser(channel.conversationId, member)).toBeNull();
    expect(
      (await repository.channelAccess(community.id, channel.id, owner)).memberIds,
    ).not.toContain(member);
    await repository.transfer(community.id, owner, outsider);
    expect(await conversations.findOneForUser(channel.conversationId, outsider)).not.toBeNull();
    expect(await conversations.findOneForUser(channel.conversationId, owner)).not.toBeNull();
  });

  it('rolls back private grants and participant retraction when outbox fails', async () => {
    const { community, channel, member } = await accessFixture();
    const snapshot = await repository.channels(community.id, owner);
    const module = await Test.createTestingModule({
      providers: [
        CommunitiesRepository,
        { provide: PrismaService, useValue: prisma },
        {
          provide: OutboxService,
          useValue: {
            recordEvent: async () => {
              throw new Error('private outbox failure');
            },
          },
        },
      ],
    }).compile();
    await expect(
      module.get(CommunitiesRepository).setChannelAccess(community.id, channel.id, owner, {
        isPrivate: true,
        memberIds: [],
        revision: snapshot.revision,
      }),
    ).rejects.toThrow('private outbox failure');
    expect(await repository.channels(community.id, owner)).toEqual(snapshot);
    expect(await conversations.findOneForUser(channel.conversationId, member)).not.toBeNull();
  });

  it('serializes private revocation against an already-started writer', async () => {
    const { community, channel, member } = await accessFixture();
    const snapshot = await repository.channels(community.id, owner);
    let release: () => void = () => {};
    let locked: () => void = () => {};
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const reached = new Promise<void>((resolve) => {
      locked = resolve;
    });
    const module = await Test.createTestingModule({
      providers: [
        CommunitiesRepository,
        { provide: PrismaService, useValue: prisma },
        {
          provide: OutboxService,
          useValue: {
            recordEvent: async () => {
              locked();
              await barrier;
            },
          },
        },
      ],
    }).compile();
    const revoke = module
      .get(CommunitiesRepository)
      .setChannelAccess(community.id, channel.id, owner, {
        isPrivate: true,
        memberIds: [],
        revision: snapshot.revision,
      });
    await reached;
    const write = messages.create({
      conversationId: channel.conversationId,
      senderId: member,
      body: 'stale preflight',
    });
    const outcome = expect(write).rejects.toBeInstanceOf(ForbiddenException);
    release();
    await revoke;
    await outcome;
    expect(await prisma.message.count({ where: { conversationId: channel.conversationId } })).toBe(
      0,
    );
  });
  it('requires private media storage for historical attachments and rejects removal during calls', async () => {
    const { community, channel, member } = await accessFixture();
    const call = await calls.createCall({
      conversationId: channel.conversationId,
      initiatorId: owner,
      participantIds: [member],
      type: 'AUDIO',
    });
    await expect(repository.remove(community.id, owner, member, 'ban')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(await conversations.findOneForUser(channel.conversationId, member)).not.toBeNull();
    await prisma.call.update({ where: { id: call.id }, data: { status: 'ENDED' } });
    const publicChannel = await repository.createChannel(community.id, owner, {
      name: 'Public media',
    });
    await messages.create({
      conversationId: publicChannel.conversationId,
      senderId: member,
      attachments: [{ type: 'FILE', url: 'https://public.invalid/retained' }],
    });
    const before = await repository.channels(community.id, owner);
    await expect(
      repository.setChannelAccess(community.id, publicChannel.id, owner, {
        isPrivate: true,
        memberIds: [member],
        revision: before.revision,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(await repository.channels(community.id, owner)).toEqual(before);
  });
});
