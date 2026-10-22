import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Prisma, type Community, type CommunityInvite, type CommunityMember } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import { OutboxService } from '../../common/outbox/outbox.service';
import {
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_MEMBER_PERMISSIONS,
  DEFAULT_OWNER_PERMISSIONS,
  type CommunityPageQuery,
  type CreateCommunityDto,
  type CreateCommunityChannelDto,
  type CreateCommunityInviteDto,
  type CommunityRole,
  type CommunityChannelLayoutDto,
  type CommunityChannelArchiveDto,
  type CommunityChannelAccessDto,
} from '@common/contracts';

const publicSelect = {
  id: true,
  name: true,
  description: true,
  avatar: true,
  createdAt: true,
  _count: { select: { members: { where: { state: 'ACTIVE' as const } } } },
} satisfies Prisma.CommunitySelect;
const memberSelect = {
  userId: true,
  role: true,
  state: true,
  user: { select: { username: true, displayName: true, avatar: true } },
} satisfies Prisma.CommunityMemberSelect;
const inviteSelect = {
  id: true,
  expiresAt: true,
  maxUses: true,
  useCount: true,
  revokedAt: true,
} satisfies Prisma.CommunityInviteSelect;
export type CommunityPublicRow = Prisma.CommunityGetPayload<{ select: typeof publicSelect }>;
export const hashCommunityInvite = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export function validateCommunityInvite(
  invite: Pick<CommunityInvite, 'expiresAt' | 'revokedAt' | 'maxUses' | 'useCount'> | null,
  now = new Date(),
) {
  if (
    !invite ||
    invite.revokedAt ||
    invite.expiresAt <= now ||
    (invite.maxUses !== null && invite.useCount >= invite.maxUses)
  ) {
    throw new NotFoundException('This invitation is unavailable or has expired');
  }
}

@Injectable()
export class CommunitiesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  list(query: CommunityPageQuery, userId?: string) {
    return this.prisma.community.findMany({
      where: {
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' as const } },
                { description: { contains: query.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
        ...(userId ? { members: { some: { userId, state: 'ACTIVE' } } } : {}),
        ...(query.after ? { id: { gt: query.after } } : {}),
      },
      orderBy: { id: 'asc' },
      take: query.limit + 1,
      select: publicSelect,
    });
  }

  async publicDetail(id: string) {
    const row = await this.prisma.community.findUnique({ where: { id }, select: publicSelect });
    if (!row) throw new NotFoundException('Community not found');
    return row;
  }

  private role(
    community: Pick<Community, 'ownerId'>,
    member: Pick<CommunityMember, 'role' | 'state'> | null,
    userId: string,
  ): CommunityRole {
    if (!member || member.state !== 'ACTIVE')
      throw new ForbiddenException('Join this community with an invitation first');
    return community.ownerId === userId ? 'OWNER' : member.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
  }

  private async access(
    tx: Prisma.TransactionClient,
    id: string,
    userId: string,
    mode: 'member' | 'admin' | 'owner' = 'member',
  ) {
    const community = await tx.community.findUnique({ where: { id } });
    if (!community) throw new NotFoundException('Community not found');
    const member = await tx.communityMember.findUnique({
      where: { communityId_userId: { communityId: id, userId } },
    });
    const role = this.role(community, member, userId);
    if ((mode === 'admin' && role === 'MEMBER') || (mode === 'owner' && role !== 'OWNER'))
      throw new ForbiddenException('You do not have permission to manage this community');
    return { community, member, role };
  }

  private async locked<T>(
    id: string,
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            // Serialize membership/invite/channel writes per community before participant locks.
            const rows = await tx.$queryRaw<{ id: string }[]>(
              Prisma.sql`SELECT id FROM communities WHERE id = ${id} FOR UPDATE`,
            );
            if (!rows.length) throw new NotFoundException('Community not found');
            const channels = await tx.communityChannel.findMany({
              where: { communityId: id },
              select: { conversationId: true },
            });
            if (channels.length)
              await tx.$queryRaw(
                Prisma.sql`SELECT id FROM "ConversationParticipant" WHERE "conversationId" IN (${Prisma.join(channels.map((channel) => channel.conversationId))}) ORDER BY id FOR UPDATE`,
              );
            return operation(tx);
          },
          { timeout: 15000 },
        );
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2034' ||
          attempt >= 2
        )
          throw error;
      }
    }
  }

  private async changed(tx: Prisma.TransactionClient, id: string, removedUserIds: string[] = []) {
    const [members, channels] = await Promise.all([
      tx.communityMember.findMany({
        where: { communityId: id, state: 'ACTIVE' },
        select: { userId: true },
      }),
      tx.communityChannel.findMany({
        where: { communityId: id },
        select: { conversationId: true },
      }),
    ]);
    const recipients = [...new Set([...members.map((member) => member.userId), ...removedUserIds])];
    // Bounded outbox payloads; event IDs make repeated invalidation/retraction replay-safe.
    for (let start = 0; start < recipients.length; start += 200) {
      const recipientIds = recipients.slice(start, start + 200);
      await this.outbox.recordEvent(
        {
          aggregateType: 'COMMUNITY',
          aggregateId: id,
          eventType: 'COMMUNITY_CHANGED',
          payload: {
            communityId: id,
            recipientIds,
            removedUserIds: removedUserIds.filter((userId) => recipientIds.includes(userId)),
            conversationIds: channels.map((channel) => channel.conversationId),
          },
        },
        tx,
      );
    }
  }

  private permissions(role: CommunityRole) {
    return role === 'OWNER'
      ? DEFAULT_OWNER_PERMISSIONS
      : role === 'ADMIN'
        ? DEFAULT_ADMIN_PERMISSIONS
        : DEFAULT_MEMBER_PERMISSIONS;
  }

  async create(userId: string, dto: CreateCommunityDto) {
    return this.prisma.$transaction(async (tx) => {
      const community = await tx.community.create({
        data: {
          ownerId: userId,
          name: dto.name,
          description: dto.description ?? '',
          members: { create: { userId } },
        },
      });
      const conversation = await tx.conversation.create({
        data: {
          type: 'GROUP',
          name: 'general',
          description: 'General community conversation',
          createdById: userId,
          participants: {
            create: { userId, role: 'OWNER', permissions: DEFAULT_OWNER_PERMISSIONS },
          },
        },
      });
      await tx.communityChannel.create({
        data: { communityId: community.id, conversationId: conversation.id, name: 'general' },
      });
      await this.changed(tx, community.id);
      return tx.community.findUniqueOrThrow({ where: { id: community.id }, select: publicSelect });
    });
  }

  async channels(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // A shared lock gives categories, channels and revision one consistent snapshot.
      await tx.$queryRaw(Prisma.sql`SELECT id FROM communities WHERE id = ${id} FOR SHARE`);
      const { role, community } = await this.access(tx, id, userId);
      const data = await tx.communityChannel.findMany({
        where: {
          communityId: id,
          ...(role === 'MEMBER'
            ? { conversation: { participants: { some: { userId, leftAt: null } } } }
            : {}),
        },
        omit: { allowedUserIds: true },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
      });
      const categories = await tx.communityCategory.findMany({
        where: { communityId: id },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, position: true },
      });
      return { communityId: id, role, data, categories, revision: community.channelRevision };
    });
  }

  async channelAccess(id: string, channelId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM communities WHERE id = ${id} FOR SHARE`);
      const { community } = await this.access(tx, id, userId, 'admin');
      const channel = await tx.communityChannel.findFirst({
        where: { id: channelId, communityId: id },
      });
      if (!channel) throw new NotFoundException('Channel not found');
      return {
        isPrivate: channel.isPrivate,
        memberIds: channel.allowedUserIds,
        revision: community.channelRevision,
      };
    });
  }

  // Conversation participants remain the common authorization/read/unread boundary.
  // Grants are explicit; an administrator's implicit access must disappear on demotion.
  private async syncChannelAccess(tx: Prisma.TransactionClient, id: string, channelId?: string) {
    const community = await tx.community.findUniqueOrThrow({ where: { id } });
    const members = await tx.communityMember.findMany({
      where: { communityId: id, state: 'ACTIVE' },
    });
    const channels = await tx.communityChannel.findMany({
      where: { communityId: id, ...(channelId ? { id: channelId } : { isPrivate: true }) },
    });
    const removed = new Set<string>();
    for (const channel of channels) {
      const allowed = members.filter(
        (member) =>
          !channel.isPrivate ||
          member.userId === community.ownerId ||
          member.role === 'ADMIN' ||
          channel.allowedUserIds.includes(member.userId),
      );
      const ids = allowed.map((member) => member.userId);
      const revoked = await tx.conversationParticipant.findMany({
        where: { conversationId: channel.conversationId, leftAt: null, userId: { notIn: ids } },
        select: { userId: true },
      });
      if (
        revoked.length &&
        (await tx.call.findFirst({
          where: {
            conversationId: channel.conversationId,
            status: { in: ['INITIATED', 'RINGING', 'CONNECTED'] },
          },
          select: { id: true },
        }))
      )
        throw new ConflictException('End the active call before revoking channel access.');
      for (const member of revoked) removed.add(member.userId);
      await tx.conversationParticipant.updateMany({
        where: { conversationId: channel.conversationId, leftAt: null, userId: { notIn: ids } },
        data: { leftAt: new Date() },
      });
      for (const member of allowed) {
        const role =
          member.userId === community.ownerId
            ? 'OWNER'
            : member.role === 'ADMIN'
              ? 'ADMIN'
              : 'MEMBER';
        const current = await tx.conversationParticipant.findUnique({
          where: {
            conversationId_userId: {
              conversationId: channel.conversationId,
              userId: member.userId,
            },
          },
        });
        const permissions = this.permissions(role);
        if (!current || current.leftAt) {
          const now = new Date();
          await tx.conversationParticipant.upsert({
            where: {
              conversationId_userId: {
                conversationId: channel.conversationId,
                userId: member.userId,
              },
            },
            create: {
              conversationId: channel.conversationId,
              userId: member.userId,
              role,
              permissions,
            },
            update: {
              leftAt: null,
              role,
              permissions,
              joinedAt: now,
              lastReadAt: now,
              archivedAt: null,
            },
          });
        } else if (current.role !== role || current.permissions !== permissions) {
          await tx.conversationParticipant.update({
            where: { id: current.id },
            data: { role, permissions },
          });
        }
      }
    }
    return [...removed];
  }

  async setChannelAccess(
    id: string,
    channelId: string,
    userId: string,
    dto: CommunityChannelAccessDto,
  ) {
    return this.locked(id, async (tx) => {
      const { community } = await this.access(tx, id, userId, 'admin');
      const channel = await tx.communityChannel.findFirst({
        where: { id: channelId, communityId: id },
      });
      if (!channel) throw new NotFoundException('Channel not found');
      if (community.channelRevision !== dto.revision)
        throw new ConflictException('Channels changed. Reload before changing access.');
      const members = await tx.communityMember.findMany({
        where: { communityId: id, state: 'ACTIVE', userId: { in: dto.memberIds } },
        select: { userId: true },
      });
      if (
        new Set(dto.memberIds).size !== dto.memberIds.length ||
        members.length !== dto.memberIds.length ||
        (!dto.isPrivate && dto.memberIds.length)
      )
        throw new BadRequestException('Choose active members from this community');
      // Public objects cannot be made confidential by changing API permissions.
      if (
        dto.isPrivate &&
        (await tx.messageAttachment.findFirst({
          where: {
            message: { conversationId: channel.conversationId },
            OR: [
              { url: { not: { startsWith: 'private-media://' } } },
              {
                thumbnailUrl: { not: null },
                NOT: { thumbnailUrl: { startsWith: 'private-media://' } },
              },
            ],
          },
          select: { id: true },
        }))
      )
        throw new ConflictException(
          'Private media storage is required before restricting a channel with attachments.',
        );
      if (
        await tx.call.findFirst({
          where: {
            conversationId: channel.conversationId,
            status: { in: ['INITIATED', 'RINGING', 'CONNECTED'] },
          },
          select: { id: true },
        })
      )
        throw new ConflictException('End the active call before changing channel access.');
      await tx.communityChannel.update({
        where: { id: channel.id },
        data: { isPrivate: dto.isPrivate, allowedUserIds: dto.memberIds },
      });
      const removed = await this.syncChannelAccess(tx, id, channel.id);
      const updated = await tx.community.update({
        where: { id },
        data: { channelRevision: { increment: 1 } },
      });
      await this.changed(tx, id, removed);
      return {
        isPrivate: dto.isPrivate,
        memberIds: dto.memberIds,
        revision: updated.channelRevision,
      };
    });
  }

  async setChannelArchived(
    id: string,
    channelId: string,
    userId: string,
    dto: CommunityChannelArchiveDto,
  ) {
    return this.locked(id, async (tx) => {
      const { community } = await this.access(tx, id, userId, 'admin');
      const channel = await tx.communityChannel.findFirst({
        where: { id: channelId, communityId: id },
      });
      if (!channel) throw new NotFoundException('Channel not found');
      if (community.channelRevision !== dto.revision)
        throw new ConflictException('Channels changed. Reload before changing the archive.');
      if (Boolean(channel.archivedAt) === dto.archived) return channel;
      if (
        dto.archived &&
        (await tx.call.findFirst({
          where: {
            conversationId: channel.conversationId,
            status: { in: ['INITIATED', 'RINGING', 'CONNECTED'] },
          },
          select: { id: true },
        }))
      )
        throw new ConflictException('End the active call before archiving this channel.');
      const updated = await tx.communityChannel.update({
        where: { id: channel.id },
        data: { archivedAt: dto.archived ? new Date() : null },
      });
      await tx.community.update({ where: { id }, data: { channelRevision: { increment: 1 } } });
      await this.changed(tx, id);
      return updated;
    });
  }

  async updateChannelLayout(id: string, userId: string, dto: CommunityChannelLayoutDto) {
    return this.locked(id, async (tx) => {
      const { community, role } = await this.access(tx, id, userId, 'admin');
      if (community.channelRevision !== dto.revision)
        throw new ConflictException('Channels changed. Reload the channel layout before saving.');
      const existing = await tx.communityChannel.findMany({ where: { communityId: id } });
      const existingById = new Map(existing.map((channel) => [channel.id, channel]));
      const requested = new Set(dto.channels.map((channel) => channel.id));
      if (
        requested.size !== dto.channels.length ||
        existing.length !== requested.size ||
        existing.some((channel) => !requested.has(channel.id))
      )
        throw new ConflictException('The layout must contain every current channel exactly once.');
      const categoryIds = dto.categories.map((category) => category.id);
      if (
        new Set(categoryIds).size !== categoryIds.length ||
        dto.channels.some(
          (channel) => channel.categoryId !== null && !categoryIds.includes(channel.categoryId),
        )
      )
        throw new BadRequestException('Invalid category assignment');
      // Never upsert an untrusted ID: a category from another community must not move here.
      const claimed = await tx.communityCategory.findMany({ where: { id: { in: categoryIds } } });
      if (claimed.some((category) => category.communityId !== id))
        throw new BadRequestException('Category belongs to another community');
      for (const [position, category] of dto.categories.entries()) {
        const current = claimed.find((item) => item.id === category.id);
        if (current)
          await tx.communityCategory.update({
            where: { id: category.id },
            data: { name: category.name, position },
          });
        else
          await tx.communityCategory.create({ data: { ...category, communityId: id, position } });
      }
      const data = [];
      for (const [position, channel] of dto.channels.entries()) {
        const current = existingById.get(channel.id);
        if (!current) throw new ConflictException('Channel no longer exists');
        if (
          current.name === channel.name &&
          current.description === channel.description &&
          current.categoryId === channel.categoryId &&
          current.position === position
        ) {
          data.push(current);
          continue;
        }
        data.push(
          await tx.communityChannel.update({
            where: { id: current.id },
            data: {
              name: channel.name,
              description: channel.description,
              categoryId: channel.categoryId,
              position,
            },
          }),
        );
        if (current.name !== channel.name || current.description !== channel.description)
          await tx.conversation.update({
            where: { id: current.conversationId },
            data: { name: channel.name, description: channel.description },
          });
      }
      // Reassignments precede removing empty categories. Conversations/history are preserved.
      await tx.communityCategory.deleteMany({
        where: { communityId: id, id: { notIn: categoryIds } },
      });
      const updated = await tx.community.update({
        where: { id },
        data: { channelRevision: { increment: 1 } },
      });
      await this.changed(tx, id);
      return {
        communityId: id,
        role,
        data,
        categories: dto.categories.map((category, position) => ({ ...category, position })),
        revision: updated.channelRevision,
      };
    });
  }

  async members(id: string, userId: string, query: CommunityPageQuery, banned = false) {
    return this.prisma.$transaction(async (tx) => {
      const { community } = await this.access(tx, id, userId, banned ? 'admin' : 'member');
      const data = await tx.communityMember.findMany({
        where: {
          communityId: id,
          state: banned ? 'BANNED' : 'ACTIVE',
          ...(query.q
            ? {
                user: {
                  OR: [
                    { username: { contains: query.q, mode: 'insensitive' as const } },
                    { displayName: { contains: query.q, mode: 'insensitive' as const } },
                  ],
                },
              }
            : {}),
          ...(query.after ? { userId: { gt: query.after } } : {}),
        },
        orderBy: { userId: 'asc' },
        take: query.limit + 1,
        select: memberSelect,
      });
      return data.map((member) => ({
        userId: member.userId,
        ...member.user,
        role:
          member.userId === community.ownerId
            ? ('OWNER' as const)
            : member.role === 'ADMIN'
              ? ('ADMIN' as const)
              : ('MEMBER' as const),
        state: member.state,
      }));
    });
  }

  async update(id: string, userId: string, dto: CreateCommunityDto) {
    return this.locked(id, async (tx) => {
      await this.access(tx, id, userId, 'admin');
      const row = await tx.community.update({
        where: { id },
        data: {
          name: dto.name,
          ...(dto.description !== undefined ? { description: dto.description } : {}),
        },
        select: publicSelect,
      });
      await this.changed(tx, id);
      return row;
    });
  }

  async createChannel(id: string, userId: string, dto: CreateCommunityChannelDto) {
    return this.locked(id, async (tx) => {
      const { community } = await this.access(tx, id, userId, 'admin');
      const members = await tx.communityMember.findMany({
        where: { communityId: id, state: 'ACTIVE' },
        select: { userId: true, role: true },
      });
      if (
        (dto.memberIds ?? []).some((userId) => !members.some((member) => member.userId === userId))
      )
        throw new BadRequestException('Choose active members from this community');
      const position = await tx.communityChannel.count({ where: { communityId: id } });
      const conversation = await tx.conversation.create({
        data: {
          type: 'GROUP',
          name: dto.name,
          description: dto.description ?? '',
          createdById: community.ownerId,
          participants: {
            create: members
              .filter(
                (member) =>
                  !dto.isPrivate ||
                  member.userId === community.ownerId ||
                  member.role === 'ADMIN' ||
                  dto.memberIds?.includes(member.userId),
              )
              .map((member) => {
                const role =
                  member.userId === community.ownerId
                    ? 'OWNER'
                    : member.role === 'ADMIN'
                      ? 'ADMIN'
                      : 'MEMBER';
                return { userId: member.userId, role, permissions: this.permissions(role) };
              }),
          },
        },
      });
      const channel = await tx.communityChannel.create({
        data: {
          communityId: id,
          conversationId: conversation.id,
          isPrivate: dto.isPrivate ?? false,
          allowedUserIds: dto.memberIds ?? [],
          name: dto.name,
          description: dto.description ?? '',
          position,
        },
      });
      await tx.community.update({ where: { id }, data: { channelRevision: { increment: 1 } } });
      await this.changed(tx, id);
      return channel;
    });
  }

  async createInvite(id: string, userId: string, dto: CreateCommunityInviteDto) {
    const token = randomBytes(32).toString('base64url');
    const invite = await this.locked(id, async (tx) => {
      await this.access(tx, id, userId, 'admin');
      return tx.communityInvite.create({
        data: {
          communityId: id,
          creatorId: userId,
          tokenHash: hashCommunityInvite(token),
          expiresAt: new Date(Date.now() + dto.expiresInDays * 86400000),
          maxUses: dto.maxUses ?? null,
        },
        select: inviteSelect,
      });
    });
    return { ...invite, token };
  }

  async invites(id: string, userId: string, query: CommunityPageQuery) {
    return this.prisma.$transaction(async (tx) => {
      await this.access(tx, id, userId, 'admin');
      return tx.communityInvite.findMany({
        where: { communityId: id, ...(query.after ? { id: { gt: query.after } } : {}) },
        orderBy: { id: 'asc' },
        take: query.limit + 1,
        select: inviteSelect,
      });
    });
  }

  async revoke(id: string, inviteId: string, userId: string) {
    return this.locked(id, async (tx) => {
      await this.access(tx, id, userId, 'admin');
      const count = await tx.communityInvite.updateMany({
        where: { id: inviteId, communityId: id },
        data: { revokedAt: new Date() },
      });
      if (!count.count) throw new NotFoundException('Invitation not found');
      return { revoked: true as const };
    });
  }

  async preview(token: string) {
    const invite = await this.prisma.communityInvite.findUnique({
      where: { tokenHash: hashCommunityInvite(token) },
      include: { community: { select: publicSelect } },
    });
    validateCommunityInvite(invite);
    if (!invite) throw new NotFoundException('Invitation not found');
    return { community: invite.community, expiresAt: invite.expiresAt };
  }

  async accept(token: string, userId: string) {
    const tokenHash = hashCommunityInvite(token);
    const lookup = await this.prisma.communityInvite.findUnique({
      where: { tokenHash },
      select: { communityId: true },
    });
    if (!lookup) throw new NotFoundException('This invitation is unavailable or has expired');
    return this.locked(lookup.communityId, async (tx) => {
      const invite = await tx.communityInvite.findUnique({ where: { tokenHash } });
      if (!invite) throw new NotFoundException('Invitation not found');
      const community = await tx.community.findUniqueOrThrow({ where: { id: invite.communityId } });
      const existing = await tx.communityMember.findUnique({
        where: { communityId_userId: { communityId: community.id, userId } },
      });
      if (existing?.state === 'BANNED')
        throw new ForbiddenException('You cannot join this community');
      if (existing?.state === 'ACTIVE')
        return { communityId: community.id, joined: true as const, alreadyMember: true };
      validateCommunityInvite(invite);
      const blocked = await tx.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: community.ownerId },
            { blockerId: community.ownerId, blockedId: userId },
          ],
        },
        select: { blockerId: true },
      });
      if (blocked) throw new ForbiddenException('You cannot join this community');
      // Community row lock serializes joins; the predicate also protects the invite bound.
      const consumed = await tx.communityInvite.updateMany({
        where: {
          id: invite.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          ...(invite.maxUses !== null ? { useCount: { lt: invite.maxUses } } : {}),
        },
        data: { useCount: { increment: 1 } },
      });
      if (consumed.count !== 1)
        throw new NotFoundException('This invitation is unavailable or has expired');
      const joinedAt = new Date();
      await tx.communityMember.upsert({
        where: { communityId_userId: { communityId: community.id, userId } },
        create: { communityId: community.id, userId },
        update: { state: 'ACTIVE', role: 'MEMBER', joinedAt },
      });
      const channels = await tx.communityChannel.findMany({
        where: { communityId: community.id, isPrivate: false },
        select: { conversationId: true },
      });
      for (const channel of channels)
        await tx.conversationParticipant.upsert({
          where: { conversationId_userId: { conversationId: channel.conversationId, userId } },
          create: {
            conversationId: channel.conversationId,
            userId,
            permissions: DEFAULT_MEMBER_PERMISSIONS,
          },
          update: {
            leftAt: null,
            joinedAt,
            role: 'MEMBER',
            permissions: DEFAULT_MEMBER_PERMISSIONS,
            archivedAt: null,
          },
        });
      await this.changed(tx, community.id);
      return { communityId: community.id, joined: true as const, alreadyMember: false };
    });
  }

  async remove(
    id: string,
    actorId: string,
    targetId: string,
    action: 'leave' | 'kick' | 'ban' | 'unban',
  ) {
    return this.locked(id, async (tx) => {
      const actor = await this.access(tx, id, actorId, action === 'leave' ? 'member' : 'admin');
      if (targetId === actor.community.ownerId)
        throw new ConflictException('Transfer ownership before leaving or removing the owner');
      if (action !== 'leave' && actorId === targetId)
        throw new BadRequestException('Use Leave community to remove your own membership');
      const target = await tx.communityMember.findUnique({
        where: { communityId_userId: { communityId: id, userId: targetId } },
      });
      if (!target) throw new NotFoundException('Member not found');
      if (action !== 'leave' && actor.role !== 'OWNER' && target.role === 'ADMIN')
        throw new ForbiddenException('Only the owner can manage administrators');
      const state = action === 'ban' ? 'BANNED' : 'LEFT';
      if (action === 'unban' && target.state !== 'BANNED') return { success: true as const };
      // Leaving or kicking must never turn a persistent ban into an invite-eligible LEFT row.
      if (target.state === 'BANNED' && action !== 'unban' && action !== 'ban')
        throw new ForbiddenException('This account is banned');
      if (
        await tx.call.findFirst({
          where: {
            conversation: {
              communityChannel: { communityId: id },
              participants: { some: { userId: targetId, leftAt: null } },
            },
            status: { in: ['INITIATED', 'RINGING', 'CONNECTED'] },
          },
          select: { id: true },
        })
      )
        throw new ConflictException('End the active call before removing this member.');
      await tx.communityMember.update({
        where: { id: target.id },
        data: { state, role: 'MEMBER' },
      });
      await tx.conversationParticipant.updateMany({
        where: {
          userId: targetId,
          conversation: { communityChannel: { communityId: id } },
          leftAt: null,
        },
        data: { leftAt: new Date(), role: 'MEMBER', permissions: DEFAULT_MEMBER_PERMISSIONS },
      });
      const privateChannels = await tx.communityChannel.findMany({
        where: { communityId: id, allowedUserIds: { has: targetId } },
      });
      for (const channel of privateChannels)
        await tx.communityChannel.update({
          where: { id: channel.id },
          data: { allowedUserIds: channel.allowedUserIds.filter((userId) => userId !== targetId) },
        });
      await tx.community.update({ where: { id }, data: { channelRevision: { increment: 1 } } });
      await this.changed(tx, id, [targetId]);
      return { success: true as const };
    });
  }

  async setRole(id: string, ownerId: string, targetId: string, role: 'ADMIN' | 'MEMBER') {
    return this.locked(id, async (tx) => {
      const actor = await this.access(tx, id, ownerId, 'owner');
      if (targetId === actor.community.ownerId)
        throw new BadRequestException('Transfer ownership to change the owner');
      const target = await tx.communityMember.findUnique({
        where: { communityId_userId: { communityId: id, userId: targetId } },
      });
      if (target?.state !== 'ACTIVE') throw new NotFoundException('Active member not found');
      await tx.communityMember.update({ where: { id: target.id }, data: { role } });
      await tx.conversationParticipant.updateMany({
        where: {
          userId: targetId,
          leftAt: null,
          conversation: { communityChannel: { communityId: id } },
        },
        data: { role, permissions: this.permissions(role) },
      });
      const removed = await this.syncChannelAccess(tx, id);
      await tx.community.update({ where: { id }, data: { channelRevision: { increment: 1 } } });
      await this.changed(tx, id, removed);
      return { success: true as const };
    });
  }

  async transfer(id: string, ownerId: string, targetId: string) {
    return this.locked(id, async (tx) => {
      await this.access(tx, id, ownerId, 'owner');
      if (ownerId === targetId) return { success: true as const };
      const target = await tx.communityMember.findUnique({
        where: { communityId_userId: { communityId: id, userId: targetId } },
      });
      if (target?.state !== 'ACTIVE') throw new NotFoundException('Active member not found');
      await tx.community.update({ where: { id }, data: { ownerId: targetId } });
      await tx.communityMember.update({
        where: { communityId_userId: { communityId: id, userId: ownerId } },
        data: { role: 'ADMIN' },
      });
      await tx.communityMember.update({ where: { id: target.id }, data: { role: 'MEMBER' } });
      await tx.conversation.updateMany({
        where: { communityChannel: { communityId: id } },
        data: { createdById: targetId },
      });
      await tx.conversationParticipant.updateMany({
        where: {
          userId: ownerId,
          leftAt: null,
          conversation: { communityChannel: { communityId: id } },
        },
        data: { role: 'ADMIN', permissions: DEFAULT_ADMIN_PERMISSIONS },
      });
      await tx.conversationParticipant.updateMany({
        where: {
          userId: targetId,
          leftAt: null,
          conversation: { communityChannel: { communityId: id } },
        },
        data: { role: 'OWNER', permissions: DEFAULT_OWNER_PERMISSIONS },
      });
      const removed = await this.syncChannelAccess(tx, id);
      await tx.community.update({ where: { id }, data: { channelRevision: { increment: 1 } } });
      await this.changed(tx, id, removed);
      return { success: true as const };
    });
  }
}
