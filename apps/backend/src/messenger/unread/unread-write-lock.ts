import { Prisma } from '@prisma/client';
import type { PrismaService } from '@common/prisma';

type Scope = { conversationIds: readonly string[] } | { messageIds: readonly string[] };

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
            await tx.$queryRaw(Prisma.sql`
            SELECT id FROM "ConversationParticipant" WHERE ${conversations}
            ORDER BY id FOR UPDATE
          `);
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
