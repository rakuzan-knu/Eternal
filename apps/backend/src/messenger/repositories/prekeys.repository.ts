import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import type { IPrekeysRepository } from '../interfaces/prekeys-repository.interface';
import type { UploadPrekeysDto, ReplenishPrekeysDto, PrekeyBundleView } from '@common/contracts';

@Injectable()
export class PrekeysRepository implements IPrekeysRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertBundle(userId: string, dto: UploadPrekeysDto): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const bundle = await tx.userPrekeyBundle.upsert({
        where: { userId },
        create: {
          userId,
          identityKeySpki: dto.identityKeySpki,
          signedPrekeySpki: dto.signedPrekeySpki,
          signedPrekeySig: dto.signedPrekeySig,
        },
        update: {
          identityKeySpki: dto.identityKeySpki,
          signedPrekeySpki: dto.signedPrekeySpki,
          signedPrekeySig: dto.signedPrekeySig,
        },
      });

      // Clear existing OPKs on new bundle upload
      await tx.userOneTimePrekey.deleteMany({
        where: { bundleId: bundle.id },
      });

      // Insert new OPKs
      if (dto.oneTimePrekeys.length > 0) {
        await tx.userOneTimePrekey.createMany({
          data: dto.oneTimePrekeys.map((k) => ({
            bundleId: bundle.id,
            keyId: k.keyId,
            keySpki: k.keySpki,
          })),
        });
      }
    });
  }

  async consumePrekeyBundle(targetUserId: string): Promise<PrekeyBundleView | null> {
    return this.prisma.$transaction(async (tx) => {
      const bundle = await tx.userPrekeyBundle.findUnique({
        where: { userId: targetUserId },
      });

      if (!bundle) return null;

      // Atomically find one OPK and delete it
      const opk = await tx.userOneTimePrekey.findFirst({
        where: { bundleId: bundle.id },
        orderBy: { createdAt: 'asc' },
      });

      if (opk) {
        await tx.userOneTimePrekey.delete({
          where: { id: opk.id },
        });
      }

      return {
        userId: bundle.userId,
        identityKeySpki: bundle.identityKeySpki,
        signedPrekeySpki: bundle.signedPrekeySpki,
        signedPrekeySig: bundle.signedPrekeySig,
        oneTimePrekey: opk
          ? {
              keyId: opk.keyId,
              keySpki: opk.keySpki,
            }
          : null,
      };
    });
  }

  async replenishPrekeys(userId: string, dto: ReplenishPrekeysDto): Promise<number> {
    const bundle = await this.prisma.userPrekeyBundle.findUnique({
      where: { userId },
    });
    if (!bundle) return 0;

    await this.prisma.userOneTimePrekey.createMany({
      data: dto.oneTimePrekeys.map((k) => ({
        bundleId: bundle.id,
        keyId: k.keyId,
        keySpki: k.keySpki,
      })),
      skipDuplicates: true,
    });

    return this.countRemainingPrekeys(userId);
  }

  countRemainingPrekeys(userId: string): Promise<number> {
    return this.prisma.userOneTimePrekey.count({
      where: { bundle: { userId } },
    });
  }
}
