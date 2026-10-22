import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  candidates(before: Date) {
    return this.prisma.pendingMediaObject.findMany({
      where: { OR: [{ state: 'PENDING', createdAt: { lt: before } }, { state: 'DELETING' }] },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: { key: true, bucket: true },
    });
  }

  async claimDeletion(key: string, before: Date): Promise<boolean> {
    const result = await this.prisma.pendingMediaObject.updateMany({
      where: {
        key,
        OR: [{ state: 'PENDING', createdAt: { lt: before } }, { state: 'DELETING' }],
      },
      data: { state: 'DELETING' },
    });
    return result.count === 1;
  }

  async deleted(key: string): Promise<void> {
    // Keep a tombstone: a consumer may have read object HEAD just before deletion.
    await this.prisma.pendingMediaObject.updateMany({
      where: { key, state: 'DELETING' },
      data: { state: 'DELETED', deletedAt: new Date() },
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
