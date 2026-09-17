import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { FeatureFlag, Prisma } from '@prisma/client';
import {
  CreateFeatureFlagDto,
  FeatureFlagAdminDto,
  FeatureFlagEvaluationDto,
  UpdateFeatureFlagDto,
} from '@common/contracts';
import {
  FEATURE_FLAGS_REPOSITORY,
  type IFeatureFlagsRepository,
} from './interfaces/feature-flags-repository.interface';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private static readonly CACHE_ALL_KEY = 'ff:cache:all';
  private static readonly CACHE_TTL_SECONDS = 60;

  constructor(
    @Inject(FEATURE_FLAGS_REPOSITORY)
    private readonly repository: IFeatureFlagsRepository,
    private readonly redis: RedisService,
  ) {}

  /**
   * Deterministic bucket hashing (0-99) using SHA-256.
   * Guarantees monotonic and sticky rollout across sessions.
   */
  private computeBucket(identifier: string, flagKey: string): number {
    const hash = createHash('sha256').update(`${identifier}:${flagKey}`).digest();
    return hash.readUInt32BE(0) % 100;
  }

  /**
   * Evaluate single flag entity against context.
   */
  private evaluateFlagEntity(
    flag: FeatureFlag,
    userId?: string,
    roles: string[] = [],
  ): FeatureFlagEvaluationDto {
    // 1. Global kill switch
    if (!flag.isEnabled) {
      return { enabled: false };
    }

    // 2. User allowlist
    if (userId && flag.targetUserIds.includes(userId)) {
      return {
        enabled: true,
        metadata: (flag.metadata as Record<string, unknown>) ?? null,
      };
    }

    // 3. Role targeting
    if (roles.length > 0 && flag.targetRoles.some((role) => roles.includes(role))) {
      return {
        enabled: true,
        metadata: (flag.metadata as Record<string, unknown>) ?? null,
      };
    }

    // 4. Percentage rollout boundaries
    if (flag.rolloutPercentage >= 100) {
      return {
        enabled: true,
        metadata: (flag.metadata as Record<string, unknown>) ?? null,
      };
    }

    if (flag.rolloutPercentage <= 0) {
      return { enabled: false };
    }

    // 5. Deterministic hash evaluation
    if (userId) {
      const bucket = this.computeBucket(userId, flag.key);
      const isEnabled = bucket < flag.rolloutPercentage;
      return {
        enabled: isEnabled,
        metadata: isEnabled ? ((flag.metadata as Record<string, unknown>) ?? null) : null,
      };
    }

    return { enabled: false };
  }

  /**
   * Fetch all active flags with L2 Redis caching.
   */
  private async getAllFlagsCached(): Promise<FeatureFlag[]> {
    return this.redis.getOrSet(
      FeatureFlagsService.CACHE_ALL_KEY,
      FeatureFlagsService.CACHE_TTL_SECONDS,
      () => this.repository.findAll(),
    );
  }

  private async invalidateCache(): Promise<void> {
    try {
      await this.redis.del(FeatureFlagsService.CACHE_ALL_KEY);
    } catch (e) {
      this.logger.warn(`Failed to invalidate feature flags cache: ${String(e)}`);
    }
  }

  /**
   * Evaluate a single flag by key.
   */
  async evaluateFlag(
    key: string,
    userId?: string,
    roles?: string[],
  ): Promise<FeatureFlagEvaluationDto> {
    const flags = await this.getAllFlagsCached();
    const flag = flags.find((f) => f.key === key);
    if (!flag) {
      return { enabled: false };
    }
    return this.evaluateFlagEntity(flag, userId, roles);
  }

  /**
   * Evaluate all feature flags for the current user/guest.
   */
  async evaluateAllFlags(
    userId?: string,
    roles?: string[],
  ): Promise<Record<string, FeatureFlagEvaluationDto>> {
    const flags = await this.getAllFlagsCached();
    const result: Record<string, FeatureFlagEvaluationDto> = {};

    for (const flag of flags) {
      result[flag.key] = this.evaluateFlagEntity(flag, userId, roles);
    }

    return result;
  }

  // ─── Admin Management ────────────────────────────────────────────────────────

  async getAllFlagsAdmin(): Promise<FeatureFlagAdminDto[]> {
    const flags = await this.repository.findAll();
    return flags.map((f) => ({
      id: f.id,
      key: f.key,
      description: f.description,
      isEnabled: f.isEnabled,
      rolloutPercentage: f.rolloutPercentage,
      targetUserIds: f.targetUserIds,
      targetRoles: f.targetRoles,
      variants: f.variants,
      metadata: f.metadata,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));
  }

  async createFlag(dto: CreateFeatureFlagDto): Promise<FeatureFlagAdminDto> {
    const existing = await this.repository.findByKey(dto.key);
    if (existing) {
      throw new ConflictException(`Feature flag with key "${dto.key}" already exists`);
    }

    const createData: Prisma.FeatureFlagCreateInput = {
      key: dto.key,
      description: dto.description ?? null,
      isEnabled: dto.isEnabled,
      rolloutPercentage: dto.rolloutPercentage,
      targetUserIds: dto.targetUserIds,
      targetRoles: dto.targetRoles,
    };
    if (dto.variants !== undefined) {
      createData.variants = dto.variants;
    }
    if (dto.metadata !== undefined) {
      createData.metadata = dto.metadata as Prisma.InputJsonValue;
    }

    const created = await this.repository.create(createData);

    await this.invalidateCache();

    return {
      id: created.id,
      key: created.key,
      description: created.description,
      isEnabled: created.isEnabled,
      rolloutPercentage: created.rolloutPercentage,
      targetUserIds: created.targetUserIds,
      targetRoles: created.targetRoles,
      variants: created.variants,
      metadata: created.metadata,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async updateFlag(key: string, dto: UpdateFeatureFlagDto): Promise<FeatureFlagAdminDto> {
    const existing = await this.repository.findByKey(key);
    if (!existing) {
      throw new NotFoundException(`Feature flag with key "${key}" not found`);
    }

    const data: Prisma.FeatureFlagUpdateInput = {};
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.isEnabled !== undefined) data.isEnabled = dto.isEnabled;
    if (dto.rolloutPercentage !== undefined) data.rolloutPercentage = dto.rolloutPercentage;
    if (dto.targetUserIds !== undefined) data.targetUserIds = dto.targetUserIds;
    if (dto.targetRoles !== undefined) data.targetRoles = dto.targetRoles;
    if (dto.variants !== undefined) data.variants = dto.variants;
    if (dto.metadata !== undefined) data.metadata = dto.metadata as Prisma.InputJsonValue;

    const updated = await this.repository.update(key, data);

    await this.invalidateCache();

    return {
      id: updated.id,
      key: updated.key,
      description: updated.description,
      isEnabled: updated.isEnabled,
      rolloutPercentage: updated.rolloutPercentage,
      targetUserIds: updated.targetUserIds,
      targetRoles: updated.targetRoles,
      variants: updated.variants,
      metadata: updated.metadata,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteFlag(key: string): Promise<void> {
    const existing = await this.repository.findByKey(key);
    if (!existing) {
      throw new NotFoundException(`Feature flag with key "${key}" not found`);
    }

    await this.repository.delete(key);
    await this.invalidateCache();
  }
}
