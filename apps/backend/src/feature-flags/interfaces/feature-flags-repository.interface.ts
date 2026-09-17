import type { FeatureFlag, Prisma } from '@prisma/client';

export const FEATURE_FLAGS_REPOSITORY = Symbol('FEATURE_FLAGS_REPOSITORY');

export interface IFeatureFlagsRepository {
  findAll(): Promise<FeatureFlag[]>;
  findByKey(key: string): Promise<FeatureFlag | null>;
  create(data: Prisma.FeatureFlagCreateInput): Promise<FeatureFlag>;
  update(key: string, data: Prisma.FeatureFlagUpdateInput): Promise<FeatureFlag>;
  delete(key: string): Promise<void>;
}
