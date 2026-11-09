import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Only completed, registered private uploads are eligible. Every surviving
// attachment counts, including forwards and thumbnail-only references.
const privateOrphan = Prisma.sql`EXISTS (
  SELECT 1 FROM private_media_objects m
  WHERE m.key = p.key AND m."ownerId" = p."ownerId" AND m.bucket = p.bucket
    AND m."readyAt" IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = m."ownerId")
    AND NOT EXISTS (SELECT 1 FROM "MessageAttachment" a
      WHERE a.url = 'private-media://' || m.id OR a."thumbnailUrl" = 'private-media://' || m.id)
)`;

@Injectable()
export class PendingMediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async register(key: string, uploadId: string, ownerId: string, bucket?: string): Promise<void> {
    const row = await this.prisma.pendingMediaObject.upsert({
      where: { key },
      create: { key, uploadId, ownerId, ...(bucket ? { bucket } : {}) },
      update: {},
    });
    if (
      row.ownerId !== ownerId ||
      row.uploadId !== uploadId ||
      row.state !== 'PENDING' ||
      (bucket && row.bucket !== bucket)
    )
      throw new ConflictException('Upload is no longer awaiting publication');
  }

  async retain(key: string, ownerId: string, required: boolean): Promise<void> {
    // updateMany is the atomic compare-and-swap shared with cleanup. Once retained,
    // failed domain writes intentionally leak conservatively rather than delete live media.
    const result = await this.prisma.pendingMediaObject.updateMany({
      where: { key, ownerId, state: { in: ['PENDING', 'RETAINED'] } },
      data: { state: 'RETAINED' },
    });
    if (result.count > 0) return;
    const row = await this.prisma.pendingMediaObject.findUnique({ where: { key } });
    if (required || row) throw new ForbiddenException('Upload expired before publication');
    // Objects completed before this rollout have no registry entry and cannot be reclaimed.
  }

  candidates(before: Date, includePrivateOrphans = false) {
    if (includePrivateOrphans)
      return this.prisma.$queryRaw<{ key: string; bucket: string | null }[]>(Prisma.sql`
        SELECT p.key, p.bucket FROM "PendingMediaObject" p
        WHERE p.state = 'DELETING' OR (p.state = 'PENDING' AND p."createdAt" < ${before})
          OR (p.state = 'RETAINED' AND ${privateOrphan})
        ORDER BY p."createdAt" ASC LIMIT 100
      `);
    return this.prisma.pendingMediaObject.findMany({
      where: { OR: [{ state: 'PENDING', createdAt: { lt: before } }, { state: 'DELETING' }] },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: { key: true, bucket: true },
    });
  }

  async claimDeletion(key: string, before: Date, includePrivateOrphans = false): Promise<boolean> {
    const result = await this.prisma.pendingMediaObject.updateMany({
      where: {
        key,
        OR: [{ state: 'PENDING', createdAt: { lt: before } }, { state: 'DELETING' }],
      },
      data: { state: 'DELETING' },
    });
    if (result.count === 1) return true;
    if (!includePrivateOrphans) return false;
    return this.prisma.$transaction(
      async (tx) => {
        // Publication takes the same row locks. Recheck references in a NEW
        // statement after waiting, so a committed forward cannot be missed.
        await tx.$queryRaw(Prisma.sql`
        SELECT key FROM "PendingMediaObject" WHERE key = ${key} FOR UPDATE
      `);
        const claimed = await tx.$queryRaw<{ key: string }[]>(Prisma.sql`
        UPDATE "PendingMediaObject" p SET state = 'DELETING'
        WHERE p.key = ${key} AND p.state = 'RETAINED' AND ${privateOrphan}
        RETURNING p.key
      `);
        return claimed.length === 1;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  async deleted(key: string): Promise<void> {
    // Keep a tombstone: a consumer may have read object HEAD just before deletion.
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.pendingMediaObject.updateMany({
        where: { key, state: 'DELETING' },
        data: { state: 'DELETED', deletedAt: new Date() },
      });
      if (result.count === 1) await tx.privateMediaObject.deleteMany({ where: { key } });
    });
  }

  async pruneDeleted(before: Date): Promise<void> {
    const rows = await this.prisma.pendingMediaObject.findMany({
      where: { state: 'DELETED', deletedAt: { lt: before } },
      orderBy: { deletedAt: 'asc' },
      take: 100,
      select: { key: true },
    });
    if (rows.length === 0) return;
    // A missing registryversion=1 object still fails retention closed after pruning.
    await this.prisma.pendingMediaObject.deleteMany({
      where: {
        key: { in: rows.map(({ key }) => key) },
        state: 'DELETED',
        deletedAt: { lt: before },
      },
    });
  }
}
