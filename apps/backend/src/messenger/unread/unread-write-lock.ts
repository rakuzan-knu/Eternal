import { Prisma } from '@prisma/client';
import { privateMediaId } from '../../common/media/private-media-ref';
import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '@common/prisma';

type Scope = ({ conversationIds: readonly string[] } | { messageIds: readonly string[] }) & {
  requireWritableChannel?: boolean;
  actorId?: string;
  hasAttachments?: boolean;
  attachmentUrls?: readonly string[];
  sourceConversationIds?: readonly string[];
};

/** Lock memberships before any existing message or personal-deletion row.
 * Row triggers run after PostgreSQL has locked the message being changed, so
 * their id ordering alone cannot protect a multi-message statement from a cycle.
 * Keep external effects outside this callback: a deadlock retries the whole tx.
 */
export async function withUnreadWriteLock<T>(
  prisma: PrismaService,
  scope: Scope,
  write: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const ids = [...new Set('conversationIds' in scope ? scope.conversationIds : scope.messageIds)];
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          if (ids.length) {
            const conversations =
              'conversationIds' in scope
                ? Prisma.sql`"conversationId" IN (${Prisma.join(ids)})`
                : Prisma.sql`"conversationId" IN (SELECT "conversationId" FROM "Message" WHERE id IN (${Prisma.join(ids)}))`;
            const sources = scope.sourceConversationIds?.length
              ? Prisma.sql`OR "conversationId" IN (${Prisma.join(scope.sourceConversationIds)})`
              : Prisma.empty;
            await tx.$queryRaw(Prisma.sql`
            SELECT id FROM "ConversationParticipant" WHERE ${conversations} ${sources}
            ORDER BY id FOR UPDATE
          `);
          }
          if (scope.sourceConversationIds?.length) {
            const denied = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
              SELECT c.id FROM "Conversation" c WHERE c.id IN (${Prisma.join(scope.sourceConversationIds)})
              AND NOT EXISTS (SELECT 1 FROM "ConversationParticipant" p
                WHERE p."conversationId" = c.id AND p."userId" = ${scope.actorId ?? null} AND p."leftAt" IS NULL)
            `);
            if (denied.length)
              throw new ForbiddenException('Forward source access has been revoked');
          }
          if (ids.length && (scope.requireWritableChannel || scope.actorId)) {
            // Archive holds the same participant locks. Read after waiting so
            // an archive committed during the wait cannot race this write.
            const channels = await tx.$queryRaw<
              { archivedAt: Date | null; isPrivate: boolean; hasAccess: boolean }[]
            >(Prisma.sql`
              SELECT c."archivedAt", c."isPrivate", EXISTS (
                SELECT 1 FROM "ConversationParticipant" p WHERE p."conversationId" = c."conversationId"
                  AND p."userId" = ${scope.actorId ?? null} AND p."leftAt" IS NULL
              ) AS "hasAccess" FROM community_channels c WHERE ${
                'conversationIds' in scope
                  ? Prisma.sql`"conversationId" IN (${Prisma.join(ids)})`
                  : Prisma.sql`"conversationId" IN (SELECT "conversationId" FROM "Message" WHERE id IN (${Prisma.join(ids)}))`
              }
            `);
            if (scope.requireWritableChannel && channels.some((channel) => channel.archivedAt))
              throw new ForbiddenException('This channel is archived. Restore it before posting.');
            if (
              channels.some((channel) => (scope.actorId || channel.isPrivate) && !channel.hasAccess)
            )
              throw new ForbiddenException('Channel access has been revoked');
            const urls = scope.attachmentUrls ?? [];
            const privateIds = urls.map(privateMediaId).filter((id): id is string => id !== null);
            if (
              scope.hasAttachments &&
              channels.some((channel) => channel.isPrivate) &&
              (!urls.length || privateIds.length !== urls.length)
            )
              throw new ForbiddenException(
                'Upload attachments to private storage before sending to this channel.',
              );
            if (privateIds.length) {
              const ids = [...new Set(privateIds)];
              const ready = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
                SELECT m.id FROM private_media_objects m JOIN "PendingMediaObject" p ON p.key = m.key
                WHERE m.id IN (${Prisma.join(ids)}) AND m."readyAt" IS NOT NULL AND p.state = 'RETAINED'
              `);
              if (ready.length !== ids.length)
                throw new ForbiddenException('Private attachment is not ready for publication');
            }
          }
          return write(tx);
        },
        { timeout: 15_000 },
      );
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2034' ||
        attempt >= 2
      )
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
    }
  }
}
