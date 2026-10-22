import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import { DEFAULT_ADMIN_PERMISSIONS, DEFAULT_MEMBER_PERMISSIONS } from '@common/contracts';
import { OutboxService } from '../../../common/outbox/outbox.service';
import {
  CommunitiesRepository,
  hashCommunityInvite,
  validateCommunityInvite,
} from '../communities.repository';

const community = { id: 'community', ownerId: 'owner', channelRevision: 0 };
const anyDate: unknown = expect.any(Date);
const member = { id: 'membership', userId: 'user', role: 'MEMBER', state: 'ACTIVE' };
const invite = {
  id: 'invite',
  communityId: community.id,
  maxUses: 1,
  useCount: 0,
  revokedAt: null,
  expiresAt: new Date('2100-01-01'),
};

function transactionFixture() {
  return {
    $queryRaw: jest.fn().mockResolvedValue([{ id: community.id }]),
    community: {
      findUnique: jest.fn().mockResolvedValue(community),
      findUniqueOrThrow: jest.fn().mockResolvedValue(community),
      update: jest.fn().mockResolvedValue(community),
    },
    communityMember: {
      findUnique: jest.fn().mockResolvedValue(member),
      findMany: jest.fn().mockResolvedValue([{ userId: 'user' }]),
      update: jest.fn().mockResolvedValue(member),
      upsert: jest.fn().mockResolvedValue(member),
    },
    communityChannel: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'channel', conversationId: 'conversation', archivedAt: null }),
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: 'channel', conversationId: 'conversation', isPrivate: false, allowedUserIds: [] },
        ]),
      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
            id: where.id,
            ...data,
          }),
        ),
    },
    communityCategory: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    conversation: { update: jest.fn().mockResolvedValue({}) },
    call: { findFirst: jest.fn().mockResolvedValue(null) },
    communityInvite: {
      findUnique: jest.fn().mockResolvedValue(invite),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    messageAttachment: { findFirst: jest.fn().mockResolvedValue(null) },
    conversationParticipant: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      upsert: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    userBlock: { findFirst: jest.fn().mockResolvedValue(null) },
  };
}

describe('CommunitiesRepository authorization and invitation regressions', () => {
  let repository: CommunitiesRepository;
  let tx: ReturnType<typeof transactionFixture>;
  let prisma: {
    $transaction: jest.Mock;
    communityInvite: { findUnique: jest.Mock };
  };
  let outbox: { recordEvent: jest.Mock };

  beforeEach(async () => {
    tx = transactionFixture();
    prisma = {
      $transaction: jest
        .fn()
        .mockImplementation((operation: (client: typeof tx) => unknown) => operation(tx)),
      communityInvite: { findUnique: jest.fn().mockResolvedValue({ communityId: community.id }) },
    };
    outbox = { recordEvent: jest.fn().mockResolvedValue({}) };
    const module = await Test.createTestingModule({
      providers: [
        CommunitiesRepository,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxService, useValue: outbox },
      ],
    }).compile();
    repository = module.get(CommunitiesRepository);
  });

  it.each([null, { ...member, state: 'LEFT' }, { ...member, state: 'BANNED' }])(
    'does not disclose channels to an inactive or absent membership: %j',
    async (membership) => {
      tx.communityMember.findUnique.mockResolvedValue(membership);
      await expect(repository.channels(community.id, 'user')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(tx.communityChannel.findMany).not.toHaveBeenCalled();
    },
  );

  it('derives ownership from the community owner rather than a forged member role', async () => {
    tx.communityMember.findUnique.mockResolvedValue({ ...member, role: 'OWNER' });
    await expect(repository.channels(community.id, 'user')).resolves.toMatchObject({
      role: 'MEMBER',
    });
    await expect(repository.setRole(community.id, 'user', 'other', 'ADMIN')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(tx.communityMember.update).not.toHaveBeenCalled();
  });

  it('requires an active membership even for the recorded owner', async () => {
    tx.communityMember.findUnique.mockResolvedValue(null);
    await expect(repository.channels(community.id, 'owner')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows members to read channels but prevents community management', async () => {
    await expect(repository.channels(community.id, 'user')).resolves.toMatchObject({
      role: 'MEMBER',
    });
    await expect(
      repository.update(community.id, 'user', { name: 'Renamed' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.community.update).not.toHaveBeenCalled();
  });

  it.each([
    null,
    member,
    { ...member, state: 'LEFT', role: 'ADMIN' },
    { ...member, state: 'BANNED', role: 'ADMIN' },
  ])('requires active administration to archive: %j', async (actor) => {
    tx.communityMember.findUnique.mockResolvedValue(actor);
    await expect(
      repository.setChannelArchived(community.id, 'channel', 'user', {
        revision: 0,
        archived: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.communityChannel.update).not.toHaveBeenCalled();
  });
  it('rejects foreign or missing channels and stale archive requests', async () => {
    tx.communityChannel.findFirst.mockResolvedValueOnce(null);
    await expect(
      repository.setChannelArchived(community.id, 'foreign', 'owner', {
        revision: 0,
        archived: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.communityChannel.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign', communityId: community.id },
    });
    await expect(
      repository.setChannelArchived(community.id, 'channel', 'owner', {
        revision: 1,
        archived: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.communityChannel.update).not.toHaveBeenCalled();
  });
  it('requires active calls to end before archive without altering call state', async () => {
    tx.call.findFirst.mockResolvedValue({ id: 'active-call' });
    await expect(
      repository.setChannelArchived(community.id, 'channel', 'owner', {
        revision: 0,
        archived: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.communityChannel.update).not.toHaveBeenCalled();
  });
  it('archives atomically and makes an acknowledged same-state retry a no-op', async () => {
    await repository.setChannelArchived(community.id, 'channel', 'owner', {
      revision: 0,
      archived: true,
    });
    expect(tx.communityChannel.update).toHaveBeenCalledWith({
      where: { id: 'channel' },
      data: { archivedAt: anyDate },
    });
    expect(outbox.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'COMMUNITY_CHANGED' }),
      tx,
    );
    tx.communityChannel.update.mockClear();
    tx.communityChannel.findFirst.mockResolvedValue({
      id: 'channel',
      conversationId: 'conversation',
      archivedAt: new Date(),
    });
    await repository.setChannelArchived(community.id, 'channel', 'owner', {
      revision: 0,
      archived: true,
    });
    expect(tx.communityChannel.update).not.toHaveBeenCalled();
  });

  const layout = {
    revision: 0,
    categories: [{ id: 'category', name: 'Projects' }],
    channels: [
      { id: 'channel', name: 'renamed', description: 'New topic', categoryId: 'category' },
    ],
  };
  it.each([null, { ...member, state: 'LEFT' }, { ...member, state: 'BANNED' }, member])(
    'rejects layout writes without active admin authority: %j',
    async (actor) => {
      tx.communityMember.findUnique.mockResolvedValue(actor);
      await expect(
        repository.updateChannelLayout(community.id, 'user', layout),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(tx.communityChannel.update).not.toHaveBeenCalled();
      expect(outbox.recordEvent).not.toHaveBeenCalled();
    },
  );
  it('rejects a stale layout before writing', async () => {
    await expect(
      repository.updateChannelLayout(community.id, 'owner', { ...layout, revision: 3 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.communityCategory.create).not.toHaveBeenCalled();
  });
  it.each(
    [[], [{ ...layout.channels[0], id: 'foreign' }], [layout.channels[0], layout.channels[0]]].map(
      (channels) => ({ channels }),
    ),
  )('rejects missing, foreign and duplicate channel permutations', async ({ channels }) => {
    tx.communityChannel.findMany.mockResolvedValue([
      { id: 'channel', conversationId: 'conversation' },
    ]);
    await expect(
      repository.updateChannelLayout(community.id, 'owner', { ...layout, channels }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.communityCategory.create).not.toHaveBeenCalled();
  });
  it('rejects category IDs owned by another community', async () => {
    tx.communityChannel.findMany.mockResolvedValue([
      { id: 'channel', conversationId: 'conversation' },
    ]);
    tx.communityCategory.findMany.mockResolvedValue([{ id: 'category', communityId: 'foreign' }]);
    await expect(repository.updateChannelLayout(community.id, 'owner', layout)).rejects.toThrow(
      'Category belongs',
    );
    expect(tx.communityCategory.update).not.toHaveBeenCalled();
    expect(tx.conversation.update).not.toHaveBeenCalled();
  });
  it('synchronizes channel metadata, category order, revision and outbox inside one transaction', async () => {
    tx.communityChannel.findMany.mockResolvedValue([
      { id: 'channel', name: 'old', description: '', conversationId: 'conversation' },
    ]);
    tx.community.update.mockResolvedValue({ ...community, channelRevision: 1 });
    await expect(
      repository.updateChannelLayout(community.id, 'owner', layout),
    ).resolves.toMatchObject({
      revision: 1,
      categories: [{ id: 'category', name: 'Projects', position: 0 }],
    });
    expect(tx.communityChannel.update).toHaveBeenCalledWith({
      where: { id: 'channel' },
      data: { name: 'renamed', description: 'New topic', categoryId: 'category', position: 0 },
    });
    expect(tx.conversation.update).toHaveBeenCalledWith({
      where: { id: 'conversation' },
      data: { name: 'renamed', description: 'New topic' },
    });
    expect(outbox.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'COMMUNITY_CHANGED' }),
      tx,
    );
  });

  it('prevents administrators from promoting members', async () => {
    tx.communityMember.findUnique.mockResolvedValue({ ...member, role: 'ADMIN' });
    await expect(repository.setRole(community.id, 'user', 'other', 'ADMIN')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(tx.communityMember.update).not.toHaveBeenCalled();
  });

  it('updates channel permissions and the outbox inside the role-change transaction', async () => {
    await expect(repository.setRole(community.id, 'owner', 'user', 'ADMIN')).resolves.toEqual({
      success: true,
    });
    expect(tx.communityMember.update).toHaveBeenCalledWith({
      where: { id: member.id },
      data: { role: 'ADMIN' },
    });
    expect(tx.conversationParticipant.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user',
        leftAt: null,
        conversation: { communityChannel: { communityId: community.id } },
      },
      data: { role: 'ADMIN', permissions: DEFAULT_ADMIN_PERMISSIONS },
    });
    expect(outbox.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'COMMUNITY_CHANGED' }),
      tx,
    );
  });

  it.each(['leave', 'kick', 'ban'] as const)('prevents owner removal by %s', async (action) => {
    await expect(repository.remove(community.id, 'owner', 'owner', action)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.communityMember.update).not.toHaveBeenCalled();
  });

  it('prevents administrators from banning other administrators', async () => {
    tx.communityMember.findUnique.mockResolvedValue({ ...member, role: 'ADMIN' });
    await expect(repository.remove(community.id, 'admin', 'other', 'ban')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(tx.conversationParticipant.updateMany).not.toHaveBeenCalled();
  });

  it('allows an administrator to leave voluntarily', async () => {
    tx.communityMember.findUnique.mockResolvedValue({ ...member, role: 'ADMIN' });
    await expect(repository.remove(community.id, 'user', 'user', 'leave')).resolves.toEqual({
      success: true,
    });
    expect(tx.communityMember.update).toHaveBeenCalledWith({
      where: { id: member.id },
      data: { state: 'LEFT', role: 'MEMBER' },
    });
  });

  it('does not erase a persistent ban when the owner kicks a banned member', async () => {
    tx.communityMember.findUnique
      .mockResolvedValueOnce(member)
      .mockResolvedValueOnce({ ...member, state: 'BANNED' });
    await expect(repository.remove(community.id, 'owner', 'user', 'kick')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(tx.communityMember.update).not.toHaveBeenCalled();
  });

  it('retracts channel access and notifies the banned member within the same transaction', async () => {
    await repository.remove(community.id, 'owner', 'user', 'ban');
    expect(tx.communityMember.update).toHaveBeenCalledWith({
      where: { id: member.id },
      data: { state: 'BANNED', role: 'MEMBER' },
    });
    expect(tx.conversationParticipant.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user',
        conversation: { communityChannel: { communityId: community.id } },
        leftAt: null,
      },
      data: { leftAt: anyDate, role: 'MEMBER', permissions: DEFAULT_MEMBER_PERMISSIONS },
    });
    expect(outbox.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          communityId: community.id,
          recipientIds: ['user'],
          removedUserIds: ['user'],
          conversationIds: ['conversation'],
        },
      }),
      tx,
    );
  });

  it('makes active-member retries idempotent after an invitation is exhausted', async () => {
    tx.communityInvite.findUnique.mockResolvedValue({ ...invite, useCount: 1 });
    await expect(repository.accept('opaque-token', 'user')).resolves.toEqual({
      communityId: community.id,
      joined: true,
      alreadyMember: true,
    });
    expect(tx.communityInvite.updateMany).not.toHaveBeenCalled();
    expect(tx.conversationParticipant.upsert).not.toHaveBeenCalled();
    expect(outbox.recordEvent).not.toHaveBeenCalled();
  });

  it('rejects banned users before consuming an invitation', async () => {
    tx.communityMember.findUnique.mockResolvedValue({ ...member, state: 'BANNED' });
    await expect(repository.accept('opaque-token', 'user')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(tx.communityInvite.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an exhausted invitation for a user who left', async () => {
    tx.communityMember.findUnique.mockResolvedValue({ ...member, state: 'LEFT' });
    tx.communityInvite.findUnique.mockResolvedValue({ ...invite, useCount: 1 });
    await expect(repository.accept('opaque-token', 'user')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tx.communityMember.upsert).not.toHaveBeenCalled();
  });

  it('checks reciprocal owner blocks before consuming an invitation', async () => {
    tx.communityMember.findUnique.mockResolvedValue(null);
    tx.userBlock.findFirst.mockResolvedValue({ blockerId: 'owner' });
    await expect(repository.accept('opaque-token', 'user')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(tx.userBlock.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { blockerId: 'user', blockedId: 'owner' },
          { blockerId: 'owner', blockedId: 'user' },
        ],
      },
      select: { blockerId: true },
    });
    expect(tx.communityInvite.updateMany).not.toHaveBeenCalled();
  });

  it('conditionally consumes a use before restoring membership and every channel', async () => {
    tx.communityMember.findUnique.mockResolvedValue({ ...member, state: 'LEFT', role: 'ADMIN' });
    tx.communityChannel.findMany.mockResolvedValue([
      { conversationId: 'conversation' },
      { conversationId: 'second' },
    ]);
    await expect(repository.accept('opaque-token', 'user')).resolves.toMatchObject({
      alreadyMember: false,
    });
    expect(prisma.communityInvite.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashCommunityInvite('opaque-token') },
      select: { communityId: true },
    });
    expect(tx.communityInvite.updateMany).toHaveBeenCalledWith({
      where: {
        id: invite.id,
        revokedAt: null,
        expiresAt: { gt: anyDate },
        useCount: { lt: 1 },
      },
      data: { useCount: { increment: 1 } },
    });
    expect(tx.communityMember.upsert).toHaveBeenCalledWith({
      where: { communityId_userId: { communityId: community.id, userId: 'user' } },
      create: { communityId: community.id, userId: 'user' },
      update: { state: 'ACTIVE', role: 'MEMBER', joinedAt: anyDate },
    });
    expect(tx.conversationParticipant.upsert).toHaveBeenCalledTimes(2);
    for (const conversationId of ['conversation', 'second']) {
      expect(tx.conversationParticipant.upsert).toHaveBeenCalledWith({
        where: { conversationId_userId: { conversationId, userId: 'user' } },
        create: { conversationId, userId: 'user', permissions: DEFAULT_MEMBER_PERMISSIONS },
        update: {
          leftAt: null,
          joinedAt: anyDate,
          role: 'MEMBER',
          permissions: DEFAULT_MEMBER_PERMISSIONS,
          archivedAt: null,
        },
      });
    }
    expect(outbox.recordEvent).toHaveBeenCalledWith(expect.any(Object), tx);
    expect(tx.communityInvite.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.communityMember.upsert.mock.invocationCallOrder[0],
    );
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 15000 });
  });

  it('rejects a lost conditional-use race before creating membership', async () => {
    tx.communityMember.findUnique.mockResolvedValue(null);
    tx.communityInvite.updateMany.mockResolvedValue({ count: 0 });
    await expect(repository.accept('opaque-token', 'user')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tx.communityMember.upsert).not.toHaveBeenCalled();
    expect(outbox.recordEvent).not.toHaveBeenCalled();
  });

  it('locks the community and channel participants before mutating membership', async () => {
    tx.communityMember.findUnique.mockResolvedValue(null);
    await repository.accept('opaque-token', 'user');
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(
      tx.communityInvite.updateMany.mock.invocationCallOrder[0],
    );
  });

  it('retries serialization conflicts, stopping after three attempts', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('serialization conflict', {
      code: 'P2034',
      clientVersion: 'test',
    });
    prisma.$transaction.mockRejectedValue(error);
    await expect(repository.update(community.id, 'owner', { name: 'Renamed' })).rejects.toBe(error);
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('propagates outbox failures so the transaction cannot commit a partial join', async () => {
    tx.communityMember.findUnique.mockResolvedValue(null);
    const error = new Error('outbox unavailable');
    outbox.recordEvent.mockRejectedValue(error);
    await expect(repository.accept('opaque-token', 'user')).rejects.toBe(error);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
  it('returns only accessible channels to members and keeps grants out of the directory', async () => {
    await repository.channels(community.id, 'user');
    expect(tx.communityChannel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          communityId: community.id,
          conversation: { participants: { some: { userId: 'user', leftAt: null } } },
        },
        omit: { allowedUserIds: true },
      }),
    );
  });

  it('requires active administration separately from validating access inputs', async () => {
    await expect(
      repository.setChannelAccess(community.id, 'channel', 'user', {
        isPrivate: true,
        memberIds: [],
        revision: 0,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.communityChannel.update).not.toHaveBeenCalled();
    await expect(repository.channelAccess(community.id, 'channel', 'user')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects a foreign channel or stale access revision before mutation', async () => {
    tx.communityChannel.findFirst.mockResolvedValueOnce(null);
    await expect(
      repository.setChannelAccess(community.id, 'foreign', 'owner', {
        isPrivate: true,
        memberIds: [],
        revision: 0,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      repository.setChannelAccess(community.id, 'channel', 'owner', {
        isPrivate: true,
        memberIds: [],
        revision: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.communityChannel.update).not.toHaveBeenCalled();
  });

  it('rejects grants to inactive or foreign users', async () => {
    tx.communityMember.findMany.mockResolvedValueOnce([]);
    await expect(
      repository.setChannelAccess(community.id, 'channel', 'owner', {
        isPrivate: true,
        memberIds: ['foreign'],
        revision: 0,
      }),
    ).rejects.toThrow('active members');
    expect(tx.communityChannel.update).not.toHaveBeenCalled();
  });

  it('refuses to privatize existing public media or an active call', async () => {
    tx.communityMember.findMany.mockResolvedValue([]);
    tx.messageAttachment.findFirst.mockResolvedValueOnce({ id: 'public-object' });
    await expect(
      repository.setChannelAccess(community.id, 'channel', 'owner', {
        isPrivate: true,
        memberIds: [],
        revision: 0,
      }),
    ).rejects.toThrow('Private media storage');
    tx.call.findFirst.mockResolvedValueOnce({ id: 'active-call' });
    await expect(
      repository.setChannelAccess(community.id, 'channel', 'owner', {
        isPrivate: true,
        memberIds: [],
        revision: 0,
      }),
    ).rejects.toThrow('active call');
    expect(tx.communityChannel.update).not.toHaveBeenCalled();
  });

  it('atomically revokes members, increments revision and records retraction in the outbox', async () => {
    tx.communityMember.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ userId: 'user', role: 'MEMBER' }]);
    tx.communityChannel.findMany.mockResolvedValue([
      { id: 'channel', conversationId: 'conversation', isPrivate: true, allowedUserIds: [] },
    ]);
    tx.conversationParticipant.findMany.mockResolvedValue([{ userId: 'user' }]);
    await repository.setChannelAccess(community.id, 'channel', 'owner', {
      isPrivate: true,
      memberIds: [],
      revision: 0,
    });
    expect(tx.conversationParticipant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conversationId: 'conversation', leftAt: null, userId: { notIn: [] } },
        data: { leftAt: anyDate },
      }),
    );
    const payload: unknown = expect.objectContaining({ removedUserIds: ['user'] });
    const event: unknown = expect.objectContaining({ payload });
    expect(outbox.recordEvent).toHaveBeenCalledWith(event, tx);
    expect(tx.community.update).toHaveBeenCalledWith({
      where: { id: community.id },
      data: { channelRevision: { increment: 1 } },
    });
  });
});

describe('validateCommunityInvite', () => {
  const now = new Date('2030-01-01');

  it.each([
    null,
    { ...invite, revokedAt: now },
    { ...invite, expiresAt: now },
    { ...invite, expiresAt: new Date('2029-01-01') },
    { ...invite, useCount: 1 },
  ])('hides unavailable invitation details: %j', (unavailable) => {
    expect(() => validateCommunityInvite(unavailable, now)).toThrow(NotFoundException);
  });

  it('allows unlimited invitations even after many uses', () => {
    expect(() =>
      validateCommunityInvite({ ...invite, maxUses: null, useCount: 100 }, now),
    ).not.toThrow();
  });
});
