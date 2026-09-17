import { Injectable } from '@nestjs/common';
import type { FeatureFlag, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import type { IFeatureFlagsRepository } from './interfaces/feature-flags-repository.interface';

@Injectable()
export class FeatureFlagsRepository implements IFeatureFlagsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<FeatureFlag[]> {
    return this.prisma.featureFlag.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByKey(key: string): Promise<FeatureFlag | null> {
    return this.prisma.featureFlag.findUnique({
      where: { key },
    });
  }

  async create(data: Prisma.FeatureFlagCreateInput): Promise<FeatureFlag> {
    return this.prisma.featureFlag.create({
      data,
    });
  }

  async update(key: string, data: Prisma.FeatureFlagUpdateInput): Promise<FeatureFlag> {
    return this.prisma.featureFlag.update({
      where: { key },
      data,
    });
  }

  async delete(key: string): Promise<void> {
    await this.prisma.featureFlag.delete({
      where: { key },
    });
  }
}
