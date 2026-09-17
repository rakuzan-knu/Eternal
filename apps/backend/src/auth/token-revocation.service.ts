import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { RedisBloomFilterService } from '../redis/redis-bloom-filter.service';
import { InMemoryBloomFilterService } from '../common/bloom/in-memory-bloom-filter.service';
import { InMemoryLruCache } from '../common/cache/in-memory-lru-cache';

@Injectable()
export class TokenRevocationService {
  private readonly logger = new Logger(TokenRevocationService.name);

  public static readonly BLOOM_JTI_KEY = 'trl:bloom:jti';
  public static readonly BLOOM_USER_KEY = 'trl:bloom:user';
  public static readonly REVOKED_JTI_PREFIX = 'trl:revoked:jti:';
  public static readonly REVOKED_USER_PREFIX = 'trl:revoked:user:';

  private readonly defaultAccessTtlSeconds: number;
  private readonly fallbackRevokedJtis = new InMemoryLruCache<string, number>({
    maxSize: 50_000,
    defaultTtlSeconds: 900,
  });
  private readonly fallbackRevokedUsers = new InMemoryLruCache<string, number>({
    maxSize: 10_000,
    defaultTtlSeconds: 86400,
  });

  constructor(
    private readonly redisService: RedisService,
    private readonly bloomFilter: RedisBloomFilterService,
    private readonly configService: ConfigService,
    private readonly localBloom: InMemoryBloomFilterService,
  ) {
    const rawTtl = this.configService.get<string>('JWT_ACCESS_TTL') || '15m';
    this.defaultAccessTtlSeconds = this.parseTtlToSeconds(rawTtl);
  }

  /**
   * Revokes a single token by its JTI (JWT ID).
   * Populates the Redis Bloom Filter and exact revocation marker with TTL.
   */
  async revokeJti(jti: string, ttlSeconds?: number): Promise<void> {
    if (!jti) return;
    const ttl = ttlSeconds ?? this.defaultAccessTtlSeconds;

    this.fallbackRevokedJtis.set(jti, Date.now() + ttl * 1000);
    // Seed in-memory filter first for instant local lookup (zero I/O)
    this.localBloom.add('jti', jti);

    try {
      // 1. Add to Bloom Filter for fast O(1) probabilistic rejection
      await this.bloomFilter.add(TokenRevocationService.BLOOM_JTI_KEY, jti, 86400 * 7);

      // 2. Add exact revocation marker in Redis with exact token TTL
      await this.redisService.set(`${TokenRevocationService.REVOKED_JTI_PREFIX}${jti}`, '1', ttl);

      this.logger.debug(`[TRL] Revoked token JTI ${jti} (TTL: ${ttl}s)`);
    } catch (err) {
      this.logger.warn(`Failed to revoke JTI ${jti}: ${(err as Error).message}`);
    }
  }

  /**
   * Batch revokes multiple JTIs (e.g. logging out of all other sessions).
   */
  async revokeJtis(jtis: string[], ttlSeconds?: number): Promise<void> {
    if (!jtis || jtis.length === 0) return;
    const ttl = ttlSeconds ?? this.defaultAccessTtlSeconds;

    const expiresAt = Date.now() + ttl * 1000;
    for (const jti of jtis) {
      this.fallbackRevokedJtis.set(jti, expiresAt);
      // Seed in-memory filter for each revoked JTI
      this.localBloom.add('jti', jti);
    }

    try {
      // 1. Batch add to Bloom Filter in single pipeline
      await this.bloomFilter.addMany(TokenRevocationService.BLOOM_JTI_KEY, jtis, 86400 * 7);

      // 2. Set individual fast expiration keys
      await Promise.all(
        jtis.map((jti) =>
          this.redisService.set(`${TokenRevocationService.REVOKED_JTI_PREFIX}${jti}`, '1', ttl),
        ),
      );

      this.logger.log(`[TRL] Batch revoked ${jtis.length} token JTIs`);
    } catch (err) {
      this.logger.warn(`Failed to batch revoke JTIs: ${(err as Error).message}`);
    }
  }

  /**
   * Revokes ALL existing tokens for a user (e.g., password change / security lock / logout all).
   * Any token issued before the revocation timestamp will be invalidated.
   */
  async revokeAllUserTokens(userId: string, ttlSeconds = 86400 * 7): Promise<void> {
    if (!userId) return;
    const revokedAt = Date.now();

    this.fallbackRevokedUsers.set(userId, revokedAt);

    try {
      // 1. Add userId to user bloom filter
      await this.bloomFilter.add(TokenRevocationService.BLOOM_USER_KEY, userId, ttlSeconds);

      // 2. Set user revocation timestamp marker
      await this.redisService.set(
        `${TokenRevocationService.REVOKED_USER_PREFIX}${userId}`,
        String(revokedAt),
        ttlSeconds,
      );

      this.logger.log(`[TRL] Revoked all tokens for user ${userId} at ${revokedAt}`);
    } catch (err) {
      this.logger.warn(`Failed to revoke all tokens for user ${userId}: ${(err as Error).message}`);
    }
  }

  /**
   * Checks if a token has been revoked using the Bloom Filter fast-path.
   *
   * Flow:
   * 1. Query Bloom Filter for JTI -> if false, token is NOT revoked (ZERO DB hits, microseconds latency).
   * 2. If Bloom Filter is true -> query Redis exact key to eliminate false positives.
   * 3. Query User Bloom Filter for user-wide revocations -> check token issuance timestamp (iat).
   */
  async isTokenRevoked(jti?: string, userId?: string, tokenIssuedAtSec?: number): Promise<boolean> {
    if (!jti && !userId) return false;

    try {
      // Step 1: Check JTI in Redis Bloom Filter
      if (jti) {
        const maybeJtiRevoked = await this.bloomFilter.has(
          TokenRevocationService.BLOOM_JTI_KEY,
          jti,
        );

        if (maybeJtiRevoked) {
          const isExplicitlyRevoked = await this.redisService.exists(
            `${TokenRevocationService.REVOKED_JTI_PREFIX}${jti}`,
          );
          if (isExplicitlyRevoked) {
            return true;
          }
          const fallbackExp = this.fallbackRevokedJtis.get(jti);
          if (fallbackExp && fallbackExp > Date.now()) {
            return true;
          }
        }
      }

      // Step 2: Check User-Wide Revocation (Logout from all devices / Password change)
      if (userId) {
        const maybeUserRevoked = await this.bloomFilter.has(
          TokenRevocationService.BLOOM_USER_KEY,
          userId,
        );

        if (maybeUserRevoked) {
          let revokedAtMs: number | undefined;
          const userRevocationTimestamp = await this.redisService.get(
            `${TokenRevocationService.REVOKED_USER_PREFIX}${userId}`,
          );

          if (userRevocationTimestamp) {
            revokedAtMs = Number(userRevocationTimestamp);
          } else if (this.fallbackRevokedUsers.has(userId)) {
            revokedAtMs = this.fallbackRevokedUsers.get(userId);
          }

          if (revokedAtMs !== undefined) {
            if (!tokenIssuedAtSec) {
              return true;
            }
            const tokenIatMs = tokenIssuedAtSec * 1000;
            // Token issued prior to user-wide revocation is revoked
            if (tokenIatMs <= revokedAtMs) {
              return true;
            }
          }
        }
      }

      return false;
    } catch (err) {
      this.logger.warn(`TRL verification check error: ${(err as Error).message}`);
      return false;
    }
  }

  private parseTtlToSeconds(ttl: string): number {
    const unit = ttl.slice(-1);
    const value = parseInt(ttl.slice(0, -1), 10);
    if (isNaN(value)) return 900;

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
