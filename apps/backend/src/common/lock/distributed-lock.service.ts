import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { uid } from 'uid';
import { LOCK_DEFAULTS, type LockHandle, type LockOptions } from './lock.constants';

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Acquires a distributed lock using Redlock algorithm principles.
   */
  async acquire(resource: string, options?: LockOptions): Promise<LockHandle | null> {
    const ttlMs = options?.ttlMs ?? LOCK_DEFAULTS.TTL_MS;
    const retryCount = options?.retryCount ?? LOCK_DEFAULTS.RETRY_COUNT;
    const retryDelayMs = options?.retryDelayMs ?? LOCK_DEFAULTS.RETRY_DELAY_MS;
    const client = this.redisService.getClient();
    const token = uid(24);

    if (!client || client.status !== 'ready') {
      return {
        resource,
        token,
        expiresAt: Date.now() + ttlMs,
        validityTimeMs: ttlMs,
      };
    }

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      const startTime = process.hrtime.bigint();
      try {
        const result = await client.set(resource, token, 'PX', ttlMs, 'NX');
        const elapsedTime = Number(process.hrtime.bigint() - startTime) / 1_000_000;
        const drift = Math.round(LOCK_DEFAULTS.CLOCK_DRIFT_FACTOR * ttlMs) + 2;
        const validityTimeMs = ttlMs - elapsedTime - drift;

        if (result === 'OK' && validityTimeMs > 0) {
          return {
            resource,
            token,
            expiresAt: Date.now() + validityTimeMs,
            validityTimeMs,
          };
        }
      } catch (err) {
        this.logger.warn(
          `Redis error during lock acquisition for ${resource} (attempt ${attempt + 1}/${retryCount + 1}): ${String(err)}`,
        );
      }

      if (attempt < retryCount) {
        const jitter = Math.floor(Math.random() * LOCK_DEFAULTS.RETRY_JITTER_MS);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs + jitter));
      }
    }

    return null;
  }

  /**
   * Releases a distributed lock atomically using Lua script.
   */
  async release(lock: LockHandle | null): Promise<boolean> {
    if (!lock) return false;
    const client = this.redisService.getClient();
    if (!client || client.status !== 'ready') {
      return true;
    }
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await client.eval(luaScript, 1, lock.resource, lock.token);
      return result === 1;
    } catch (err) {
      this.logger.warn(`Failed to release lock for resource ${lock.resource}: ${String(err)}`);
      return false;
    }
  }

  /**
   * Extends the lock TTL atomically if current owner still holds it.
   */
  async extend(lock: LockHandle, additionalTtlMs: number): Promise<boolean> {
    const client = this.redisService.getClient();
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    try {
      const result = await client.eval(luaScript, 1, lock.resource, lock.token, additionalTtlMs);
      if (result === 1) {
        lock.expiresAt = Date.now() + additionalTtlMs;
        return true;
      }
      return false;
    } catch (err) {
      this.logger.warn(`Failed to extend lock for resource ${lock.resource}: ${String(err)}`);
      return false;
    }
  }

  /**
   * Executes an asynchronous task inside a distributed mutex lock.
   */
  async withLock<T>(resource: string, action: () => Promise<T>, options?: LockOptions): Promise<T> {
    const lock = await this.acquire(resource, options);
    if (!lock) {
      throw new Error(`Failed to acquire distributed lock for resource: ${resource}`);
    }

    let renewalInterval: NodeJS.Timeout | undefined;
    if (options?.autoRenew) {
      const ttlMs = options.ttlMs ?? LOCK_DEFAULTS.TTL_MS;
      const intervalMs = Math.max(500, Math.floor(ttlMs / 2));
      renewalInterval = setInterval(() => {
        void (async () => {
          try {
            await this.extend(lock, ttlMs);
          } catch {
            // Ignore renewal error
          }
        })();
      }, intervalMs);
    }

    try {
      return await action();
    } finally {
      if (renewalInterval) {
        clearInterval(renewalInterval);
      }
      await this.release(lock);
    }
  }
}
