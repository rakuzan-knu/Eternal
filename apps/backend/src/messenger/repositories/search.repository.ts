import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import type { ISearchRepository } from '../interfaces/search-repository.interface';
import type { GlobalSearchDto, GlobalSearchResult } from '@common/contracts';
import { AttachmentType } from '@prisma/client';

@Injectable()
export class SearchRepository implements ISearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchGlobal(userId: string, dto: GlobalSearchDto): Promise<GlobalSearchResult> {
    const q = dto.q.trim();
    const type = dto.type ?? 'all';
    const limit = dto.limit ?? 20;
    const offset = dto.offset ?? 0;

    // 1. Get user active conversations
    const userConvs = await this.prisma.conversationParticipant.findMany({
      where: { userId, leftAt: null },
      select: { conversationId: true },
    });
    const allowedConvIds = userConvs.map((c) => c.conversationId);

    if (allowedConvIds.length === 0) {
      return { messages: [], media: [], people: [] };
    }

    const targetConvIds = dto.conversationId
      ? allowedConvIds.filter((id) => id === dto.conversationId)
      : allowedConvIds;

    if (targetConvIds.length === 0) {
      return { messages: [], media: [], people: [] };
    }

    let searchMessages: GlobalSearchResult['messages'] = [];
    let searchMedia: GlobalSearchResult['media'] = [];
    let searchPeople: GlobalSearchResult['people'] = [];

    // Search Messages
    if (type === 'all' || type === 'messages') {
      const messages = await this.prisma.message.findMany({
        where: {
          conversationId: { in: targetConvIds },
          deletedForAll: false,
          deletedFor: { none: { userId } },
          body: {
            contains: q,
            mode: 'insensitive',
          },
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          conversation: {
            include: {
              participants: {
                include: {
                  user: {
                    select: { id: true, username: true, displayName: true, avatar: true },
                  },
                },
              },
            },
          },
          sender: {
            select: { id: true, username: true, displayName: true, avatar: true },
          },
        },
      });

      searchMessages = messages.map((m) => {
        let conversationTitle = m.conversation.name ?? 'Direct Chat';
        let conversationAvatar: string | null = null;
        const isGroup = m.conversation.type === 'GROUP';

        if (!isGroup) {
          const other = m.conversation.participants.find((p) => p.userId !== userId);
          if (other) {
            conversationTitle = other.user.displayName || other.user.username;
            conversationAvatar = other.user.avatar;
          }
        }

        // Extract a clean snippet around match
        let highlightSnippet: string | undefined;
        if (m.body) {
          const idx = m.body.toLowerCase().indexOf(q.toLowerCase());
          if (idx !== -1) {
            const start = Math.max(0, idx - 30);
            const end = Math.min(m.body.length, idx + q.length + 30);
            highlightSnippet =
              (start > 0 ? '…' : '') + m.body.slice(start, end) + (end < m.body.length ? '…' : '');
          } else {
            highlightSnippet = m.body.slice(0, 80);
          }
        }

        return {
          id: m.id,
          conversationId: m.conversationId,
          conversationTitle,
          conversationAvatar,
          isGroup,
          senderId: m.senderId,
          senderName: m.sender.displayName || m.sender.username,
          senderAvatar: m.sender.avatar,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          ...(highlightSnippet ? { highlightSnippet } : {}),
        };
      });
    }

    // Search Media & Files
    if (type === 'all' || type === 'media' || type === 'files' || type === 'links') {
      const typeFilter: AttachmentType[] = [];
      if (type === 'media') {
        typeFilter.push(
          AttachmentType.IMAGE,
          AttachmentType.VIDEO,
          AttachmentType.AUDIO,
          AttachmentType.GIF,
        );
      } else if (type === 'files') {
        typeFilter.push(AttachmentType.FILE);
      } else if (type === 'links') {
        typeFilter.push(AttachmentType.LINK);
      }

      const attachments = await this.prisma.messageAttachment.findMany({
        where: {
          message: {
            conversationId: { in: targetConvIds },
            deletedForAll: false,
            deletedFor: { none: { userId } },
          },
          ...(typeFilter.length > 0 ? { type: { in: typeFilter } } : {}),
          ...(q.length > 0
            ? {
                OR: [
                  { fileName: { contains: q, mode: 'insensitive' } },
                  { url: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          message: {
            select: { id: true, conversationId: true, createdAt: true },
          },
        },
      });

      searchMedia = attachments.map((a) => ({
        id: a.id,
        messageId: a.message.id,
        conversationId: a.message.conversationId,
        url: a.url,
        fileName: a.fileName,
        mimeType: a.mimeType,
        size: a.size,
        type: a.type,
        createdAt: a.createdAt.toISOString(),
      }));
    }

    // Search People
    if ((type === 'all' || type === 'people') && !dto.conversationId) {
      const people = await this.prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } },
          ],
          NOT: { id: userId },
        },
        take: 10,
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          lastSeenAt: true,
        },
      });

      searchPeople = people.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        isOnline: u.lastSeenAt
          ? Date.now() - new Date(u.lastSeenAt).getTime() < 5 * 60 * 1000
          : false,
      }));
    }

    return {
      messages: searchMessages,
      media: searchMedia,
      people: searchPeople,
    };
  }
}
