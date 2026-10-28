import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { privateMediaRef } from './private-media-ref';
import { PrismaService } from '../prisma/prisma.service';
import {
  Permission,
  DEFAULT_OWNER_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_MEMBER_PERMISSIONS,
} from '../contracts';

@Injectable()
export class MediaAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async assertConversationAccess(
    conversationId: string,
    userId: string,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<{ isPrivate: boolean }> {
    const conversation = await db.conversation.findFirst({
      where: { id: conversationId, participants: { some: { userId, leftAt: null } } },
      select: {
        type: true,
        communityChannel: { select: { isPrivate: true, archivedAt: true } },
        participants: { select: { userId: true, role: true, permissions: true } },
      },
    });
    if (!conversation) throw new ForbiddenException('Conversation access required');
    if (conversation.communityChannel?.archivedAt)
      throw new ForbiddenException('Media uploads are unavailable for archived channels');
    const member = conversation.participants.find((entry) => entry.userId === userId);
    if (!member) throw new ForbiddenException('Conversation access required');
    const flags =
      member.permissions ||
      (member.role === 'OWNER'
        ? DEFAULT_OWNER_PERMISSIONS
        : member.role === 'ADMIN'
          ? DEFAULT_ADMIN_PERMISSIONS
          : DEFAULT_MEMBER_PERMISSIONS);
    if (
      (flags & Permission.CAN_SEND_MEDIA) === 0 ||
      (flags & (Permission.IS_BANNED | Permission.IS_MUTED)) !== 0
    )
      throw new ForbiddenException('Media sending is not allowed');
    if (conversation.type === 'DIRECT') {
      const otherIds = conversation.participants
        .map((entry) => entry.userId)
        .filter((id) => id !== userId);
      const blocked = await db.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: { in: otherIds } },
            { blockedId: userId, blockerId: { in: otherIds } },
          ],
        },
        select: { blockerId: true },
      });
      if (blocked) throw new ForbiddenException('Conversation is blocked');
    }
    return { isPrivate: conversation.communityChannel?.isPrivate ?? false };
  }

  async withUploadPublication<T>(
    conversationId: string,
    userId: string,
    privateStorage: boolean,
    publish: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    // Channel mutations lock the community first. Keep this shared lock only
    // for promotion, after slow staging validation, and never retry S3 effects.
    return this.prisma.$transaction(
      async (tx) => {
        const deadline = Date.now() + 20_000;
        await tx.$queryRaw(Prisma.sql`
        SELECT c.id FROM communities c
        JOIN community_channels ch ON ch."communityId" = c.id
        WHERE ch."conversationId" = ${conversationId}
        FOR SHARE OF c
      `);
        const context = await this.assertConversationAccess(conversationId, userId, tx);
        if (context.isPrivate && !privateStorage)
          throw new ForbiddenException('Channel access changed. Upload again to private storage.');
        // Reserve headroom so the storage deadline expires before Prisma releases
        // the lock, including time already spent waiting for an administrator.
        const remaining = Math.min(15_000, deadline - Date.now() - 1_000);
        if (remaining <= 0) throw new ServiceUnavailableException('Upload publication timed out');
        return publish(AbortSignal.timeout(remaining));
      },
      { timeout: 20_000 },
    );
  }

  async registerPrivateObject(data: Prisma.PrivateMediaObjectCreateInput) {
    const row = await this.prisma.privateMediaObject.upsert({
      where: { id: data.id },
      create: data,
      update: {},
    });
    if (
      row.key !== data.key ||
      row.bucket !== data.bucket ||
      row.ownerId !== data.ownerId ||
      row.conversationId !== data.conversationId
    )
      throw new ForbiddenException('Private upload identity mismatch');
  }

  completePrivateObject(id: string) {
    return this.prisma.privateMediaObject.update({ where: { id }, data: { readyAt: new Date() } });
  }

  async privateObjectForOwner(id: string, userId: string, conversationId: string) {
    const row = await this.prisma.privateMediaObject.findFirst({
      where: { id, ownerId: userId, conversationId, readyAt: { not: null } },
    });
    if (!row) throw new ForbiddenException('Private upload ownership mismatch');
    await this.assertConversationAccess(conversationId, userId);
    return row;
  }

  async privateObjectForReader(id: string, userId: string) {
    const row = await this.prisma.privateMediaObject.findFirst({
      where: { id, readyAt: { not: null } },
    });
    if (!row) throw new ForbiddenException('Attachment unavailable');
    const visible = await this.prisma.messageAttachment.findFirst({
      where: {
        OR: [{ url: privateMediaRef(id) }, { thumbnailUrl: privateMediaRef(id) }],
        message: {
          deletedForAll: false,
          deletedAt: null,
          deletedFor: { none: { userId } },
          conversation: { participants: { some: { userId, leftAt: null } } },
        },
      },
      select: { id: true },
    });
    if (!visible) throw new ForbiddenException('Attachment access required');
    return row;
  }
}
