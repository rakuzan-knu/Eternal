import { Prisma } from '@prisma/client';

/** Retained independent aggregate oracle; works before the projection migration. */
export function buildUnreadOracleQuery(userId: string): Prisma.Sql {
  return Prisma.sql`
    SELECT COUNT(*) AS count
    FROM "ConversationParticipant" p
    JOIN "Message" m ON m."conversationId" = p."conversationId"
    WHERE p."userId" = ${userId}
      AND p."leftAt" IS NULL AND p."archivedAt" IS NULL
      AND m."senderId" <> ${userId}
      AND m."deletedAt" IS NULL AND m."deletedForAll" = false
      AND m."createdAt" >= p."joinedAt" AND m."createdAt" > p."lastReadAt"
      AND NOT EXISTS (
        SELECT 1 FROM "MessageDeletion" d
        WHERE d."messageId" = m.id AND d."userId" = ${userId}
      )
      AND NOT EXISTS (
        SELECT 1 FROM "UserBlock" b
        WHERE (b."blockerId" = ${userId} AND b."blockedId" = m."senderId")
           OR (b."blockedId" = ${userId} AND b."blockerId" = m."senderId")
      )
  `;
}

export interface UnreadCountsOptions {
  conversationIds?: readonly string[];
  useProjection?: boolean;
  shadow?: boolean;
  includeArchived?: boolean;
}

/** Both branches share one PostgreSQL statement snapshot, including in shadow mode. */
export function buildUnreadCountsQuery(
  userId: string,
  options: UnreadCountsOptions = {},
): Prisma.Sql {
  const projection = options.useProjection === true;
  const shadow = projection && options.shadow === true;
  const membershipScope = options.conversationIds
    ? options.conversationIds.length === 0
      ? Prisma.sql`AND false`
      : Prisma.sql`AND p."conversationId" IN (${Prisma.join([...options.conversationIds])})`
    : Prisma.empty;
  const readyColumn = projection ? Prisma.sql`p."unreadProjectionReady"` : Prisma.sql`false`;
  const participantScope = Prisma.sql`
    p."userId" = ${userId} AND p."leftAt" IS NULL
    ${options.includeArchived ? Prisma.empty : Prisma.sql`AND p."archivedAt" IS NULL`}
    ${membershipScope}
  `;
  const rawScope =
    projection && !shadow ? Prisma.sql`AND NOT p."unreadProjectionReady"` : Prisma.empty;
  const projectedCounts = projection
    ? Prisma.sql`
    SELECT p."conversationId", SUM(c.count)::bigint AS count FROM "ConversationParticipant" p
    JOIN "UnreadSenderCount" c ON c."participantId" = p.id
    WHERE ${participantScope} AND p."unreadProjectionReady" AND NOT EXISTS (
      SELECT 1 FROM blocked_senders b WHERE b."senderId" = c."senderId"
    ) GROUP BY p."conversationId"
  `
    : Prisma.sql`SELECT NULL::text AS "conversationId", 0::bigint AS count WHERE false`;
  return Prisma.sql`
    WITH blocked_senders AS MATERIALIZED (
      SELECT "blockedId" AS "senderId" FROM "UserBlock" WHERE "blockerId" = ${userId}
      UNION
      SELECT "blockerId" AS "senderId" FROM "UserBlock" WHERE "blockedId" = ${userId}
    ), memberships AS (
      SELECT p.id, p."conversationId", p."userId", p."joinedAt", p."lastReadAt",
        ${readyColumn} AS "unreadProjectionReady"
      FROM "ConversationParticipant" p
      WHERE ${participantScope}
    ), raw_counts AS (
      SELECT p."conversationId", COUNT(*)::bigint AS count FROM "ConversationParticipant" p
      JOIN "Message" m ON m."conversationId" = p."conversationId"
        AND m."senderId" <> p."userId"
        AND m."deletedAt" IS NULL AND NOT m."deletedForAll"
        AND m."createdAt" >= p."joinedAt" AND m."createdAt" > p."lastReadAt"
        AND NOT EXISTS (SELECT 1 FROM "MessageDeletion" d WHERE d."messageId" = m.id AND d."userId" = p."userId")
        AND NOT EXISTS (SELECT 1 FROM blocked_senders b WHERE b."senderId" = m."senderId")
      WHERE ${participantScope} ${rawScope} GROUP BY p."conversationId"
    ), projected_counts AS (${projectedCounts})
    SELECT p."conversationId", ${shadow ? Prisma.sql`COALESCE(r.count, 0)` : Prisma.sql`COALESCE(c.count, r.count, 0)`}::bigint AS count,
      ${shadow ? Prisma.sql`CASE WHEN p."unreadProjectionReady" THEN COALESCE(c.count, 0) ELSE COALESCE(r.count, 0) END` : Prisma.sql`COALESCE(c.count, r.count, 0)`}::bigint AS "projectionCount"
    FROM memberships p LEFT JOIN raw_counts r ON r."conversationId" = p."conversationId"
    LEFT JOIN projected_counts c ON c."conversationId" = p."conversationId"
  `;
}

export function buildUnreadTotalQuery(userId: string, options: UnreadCountsOptions): Prisma.Sql {
  return Prisma.sql`
    SELECT COALESCE(SUM(count), 0)::bigint AS count,
      COALESCE(array_agg("conversationId") FILTER (WHERE count <> "projectionCount"), ARRAY[]::text[]) AS mismatches
    FROM (${buildUnreadCountsQuery(userId, options)}) counts
  `;
}
