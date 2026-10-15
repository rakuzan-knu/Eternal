import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import {
  buildUnreadCountsQuery,
  buildUnreadOracleQuery,
  buildUnreadTotalQuery,
} from './unread-projection.queries';

type UnreadMode = 'off' | 'shadow' | 'on';
interface CountRow {
  conversationId: string;
  count: bigint;
  projectionCount: bigint;
}

@Injectable()
export class UnreadProjectionService {
  private readonly logger = new Logger(UnreadProjectionService.name);
  private capability?: { available: boolean; expiresAt: number };

  constructor(private readonly prisma: PrismaService) {}

  private get mode(): UnreadMode {
    const value = process.env.UNREAD_PROJECTION_MODE;
    return value === 'on' || value === 'shadow' ? value : 'off';
  }

  private async available(refresh = false): Promise<boolean> {
    if (!refresh && this.capability && this.capability.expiresAt > Date.now())
      return this.capability.available;
    const rows = await this.prisma.$queryRaw<Array<{ available: boolean }>>(Prisma.sql`
      SELECT to_regclass('"UnreadSenderCount"') IS NOT NULL
        AND to_regprocedure('unread_projection_reconcile(text)') IS NOT NULL
        AND to_regprocedure('unread_projection_reset_read(text,timestamp without time zone)') IS NOT NULL
        AND EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = to_regclass('"ConversationParticipant"')
          AND attname = 'unreadProjectionReady' AND NOT attisdropped) AS available
    `);
    const available = rows[0]?.available === true;
    this.capability = { available, expiresAt: Date.now() + 30_000 };
    return available;
  }

  async canUseProjection(): Promise<boolean> {
    return this.mode !== 'off' && (await this.available());
  }

  /** Shadow pagination must keep the oracle filter so drift cannot hide a row. */
  async canFilterUsingProjection(): Promise<boolean> {
    return this.mode === 'on' && (await this.available());
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const useProjection = await this.canUseProjection();
    if (!useProjection) {
      const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>(
        buildUnreadOracleQuery(userId),
      );
      return { count: Number(rows[0]?.count ?? 0) };
    }
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint; mismatches: string[] }>>(
      buildUnreadTotalQuery(userId, { useProjection: true, shadow: this.mode === 'shadow' }),
    );
    await this.invalidateMismatches(userId, rows[0]?.mismatches ?? []);
    return { count: Number(rows[0]?.count ?? 0) };
  }

  /** Page-bounded hydration; archived conversations still show their own count. */
  async getConversationCounts(
    userId: string,
    conversationIds: readonly string[],
  ): Promise<Map<string, number>> {
    if (conversationIds.length === 0) return new Map();
    if (conversationIds.length > 100)
      throw new RangeError('Unread hydration is limited to 100 conversations');
    const useProjection = await this.canUseProjection();
    const rows = await this.prisma.$queryRaw<CountRow[]>(
      buildUnreadCountsQuery(userId, {
        conversationIds,
        includeArchived: true,
        useProjection,
        shadow: this.mode === 'shadow',
      }),
    );
    await this.invalidateMismatches(
      userId,
      rows.filter((row) => row.count !== row.projectionCount).map((row) => row.conversationId),
    );
    return new Map(rows.map((row) => [row.conversationId, Number(row.count)]));
  }

  private async invalidateMismatches(
    userId: string,
    conversationIds: readonly string[],
  ): Promise<void> {
    if (conversationIds.length === 0) return;
    this.logger.error(
      `Unread shadow mismatch for ${conversationIds.length} memberships; falling back until reconciliation`,
    );
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "ConversationParticipant" SET "unreadProjectionReady" = false, "unreadProjectionVerifiedAt" = NULL
      WHERE "userId" = ${userId} AND "conversationId" IN (${Prisma.join([...conversationIds])})
    `);
  }

  /** Works both before and after migration, even with projection reads disabled. */
  async resetRead(conversationId: string, userId: string): Promise<void> {
    // Migration may arrive while the badge's negative capability result is cached.
    // A stale pre-migration UPDATE would otherwise be clamped by the new guard.
    if (await this.available(true)) {
      await this.prisma.$queryRaw(Prisma.sql`
        SELECT unread_projection_reset_read(id) FROM "ConversationParticipant"
        WHERE "conversationId" = ${conversationId} AND "userId" = ${userId} AND "leftAt" IS NULL
      `);
    } else {
      await this.prisma.$executeRaw(Prisma.sql`
        UPDATE "ConversationParticipant" SET "lastReadAt" = timestamp 'epoch'
        WHERE "conversationId" = ${conversationId} AND "userId" = ${userId} AND "leftAt" IS NULL
      `);
    }
  }

  /** SKIP LOCKED plus a wraparound cursor keeps each transaction bounded. */
  async reconcileBatch(
    afterId = '',
    limit = 25,
  ): Promise<{ processed: number; cursor: string; wrapped: boolean }> {
    if (!(await this.available())) return { processed: 0, cursor: '', wrapped: true };
    const batchLimit = Math.max(1, Math.min(200, Math.trunc(limit) || 25));
    return this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM "ConversationParticipant" WHERE id > ${afterId}
        ORDER BY id LIMIT ${batchLimit} FOR UPDATE SKIP LOCKED
      `);
        for (const row of rows)
          await tx.$queryRaw(Prisma.sql`SELECT unread_projection_reconcile(${row.id})`);
        return {
          processed: rows.length,
          cursor: rows.at(-1)?.id ?? '',
          wrapped: rows.length < batchLimit,
        };
      },
      { timeout: 15_000 },
    );
  }
}
