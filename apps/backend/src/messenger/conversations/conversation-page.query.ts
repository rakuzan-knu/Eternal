import { Prisma } from '@prisma/client';
import type { ConversationPageOptions } from '../interfaces/conversations-repository.interface';

export function buildConversationPageQuery(
  userId: string,
  options: ConversationPageOptions,
): Prisma.Sql {
  const inIds = (values: string[]) => (values.length ? Prisma.join(values) : Prisma.sql`NULL`);
  // Visibility is identical for unread filtering and the per-row count. Both
  // sides of a block and per-user deletions are evaluated inside the database.
  const visibleUnread = Prisma.sql`
      SELECT 1 FROM "Message" m WHERE m."conversationId" = c.id
        AND m."senderId" <> ${userId} AND m."deletedAt" IS NULL AND m."deletedForAll" = false
        AND m."createdAt" >= p."joinedAt" AND m."createdAt" > p."lastReadAt"
        AND NOT EXISTS (SELECT 1 FROM "MessageDeletion" d WHERE d."messageId" = m.id AND d."userId" = ${userId})
        AND NOT EXISTS (SELECT 1 FROM "UserBlock" b WHERE
          (b."blockerId" = ${userId} AND b."blockedId" = m."senderId") OR
          (b."blockedId" = ${userId} AND b."blockerId" = m."senderId"))`;
  const unreadFilter = options.useUnreadProjection
    ? Prisma.sql`(
      (p."unreadProjectionReady" AND EXISTS (SELECT 1 FROM "UnreadSenderCount" s WHERE s."participantId" = p.id AND s.count > 0
        AND NOT EXISTS (SELECT 1 FROM "UserBlock" b WHERE (b."blockerId" = ${userId} AND b."blockedId" = s."senderId") OR (b."blockedId" = ${userId} AND b."blockerId" = s."senderId"))))
      OR (NOT p."unreadProjectionReady" AND EXISTS (${visibleUnread})))`
    : Prisma.sql`EXISTS (${visibleUnread})`;
  const folder =
    options.filter === 'PERSONAL'
      ? Prisma.sql`AND v."conversationType" = 'DIRECT'`
      : options.filter === 'GROUPS'
        ? Prisma.sql`AND v."conversationType" = 'GROUP'`
        : options.filter === 'EMPTY'
          ? Prisma.sql`AND false`
          : options.filter === 'CUSTOM'
            ? Prisma.sql`AND c.id IN (${inIds(options.includeIds)})`
            : options.filter === 'UNREAD'
              ? Prisma.sql`AND (c.id IN (${inIds([...options.includeIds, ...options.forcedUnreadIds])})
          OR (c.id NOT IN (${inIds(options.locallyReadIds.length ? options.locallyReadIds : [''])}) AND ${unreadFilter}))`
              : Prisma.empty;
  const archive =
    options.archive === 'active'
      ? Prisma.sql`AND v.archived = false AND p."archivedAt" IS NULL`
      : options.archive === 'archived'
        ? Prisma.sql`AND v.archived = true AND p."archivedAt" IS NOT NULL`
        : Prisma.empty;
  const cursor = options.before
    ? Prisma.sql`AND (v."activityAt", v."conversationId") < (${options.before.createdAt}, ${options.before.id})`
    : Prisma.empty;
  const search = options.search
    ? Prisma.sql`AND v."searchText" ILIKE ${'%' + options.search.replace(/[\\%_]/g, '\\$&') + '%'}`
    : Prisma.empty;
  return Prisma.sql`
      SELECT c.id, v."activityAt" AS "createdAt", 0::bigint AS "unreadCount"
      FROM "ConversationActivityVersion" v JOIN "Conversation" c ON c.id = v."conversationId"
      JOIN "ConversationParticipant" p ON p."conversationId" = c.id AND p."userId" = v."userId"
      WHERE v."userId" = ${userId} AND p."leftAt" IS NULL
        AND v."validFrom" <= ${options.cutoff}::timestamptz AND (v."validTo" IS NULL OR v."validTo" > ${options.cutoff}::timestamptz)
        ${archive} ${folder} ${cursor} ${search}
        ${options.excludeIds.length ? Prisma.sql`AND c.id NOT IN (${inIds(options.excludeIds)})` : Prisma.empty}
      ORDER BY v."activityAt" DESC, v."conversationId" DESC LIMIT ${options.limit + 1}`;
}
