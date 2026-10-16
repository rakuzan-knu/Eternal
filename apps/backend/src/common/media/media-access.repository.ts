import { ForbiddenException, Injectable } from '@nestjs/common';
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

  async assertConversationAccess(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, participants: { some: { userId, leftAt: null } } },
      select: {
        type: true,
        participants: { select: { userId: true, role: true, permissions: true } },
      },
    });
    if (!conversation) throw new ForbiddenException('Conversation access required');
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
      const blocked = await this.prisma.userBlock.findFirst({
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
  }
}
