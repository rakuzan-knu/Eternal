import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { RedisService } from '../../redis/redis.service';
import { MEDIA_POLICY } from './media-policy';

// Every check and mutation is one Redis command: concurrent API replicas cannot oversubscribe.
const RESERVE_UPLOAD = `
local previous = redis.call('GET', KEYS[1])
if previous then
  if string.match(previous, '^(%d+):') ~= ARGV[1] then return {2} end
  return {1}
end
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', ARGV[2])
if redis.call('ZCARD', KEYS[2]) >= tonumber(ARGV[6]) then return {3, 7} end
redis.call('ZREMRANGEBYSCORE', KEYS[9], '-inf', ARGV[2])
if redis.call('ZCARD', KEYS[9]) >= tonumber(ARGV[13]) then return {3, 8} end
local usage = {}
for i = 3, 8 do
  local current = tonumber(redis.call('GET', KEYS[i]) or '0')
  local increment = i <= 6 and tonumber(ARGV[1]) or 1
  usage[i - 2] = current + increment
  if usage[i - 2] > tonumber(ARGV[i + 4]) then return {3, i - 2} end
end
for i = 3, 8 do
  redis.call('SET', KEYS[i], usage[i - 2])
  local expiry = (i == 5 or i == 6) and ARGV[5] or ARGV[4]
  redis.call('EXPIREAT', KEYS[i], expiry)
end
redis.call('SET', KEYS[1], ARGV[1] .. ':reserved', 'EXAT', tonumber(ARGV[5]) + 86400)
redis.call('ZADD', KEYS[2], ARGV[3], KEYS[1])
redis.call('EXPIREAT', KEYS[2], math.ceil(tonumber(ARGV[3]) / 1000))
redis.call('ZADD', KEYS[9], ARGV[3], KEYS[1])
redis.call('EXPIREAT', KEYS[9], math.ceil(tonumber(ARGV[3]) / 1000))
return {0, unpack(usage)}
`;

const FINISH_UPLOAD = `
local previous = redis.call('GET', KEYS[1])
if previous then
  redis.call('SET', KEYS[1], string.gsub(previous, ':reserved$', ':finished'), 'KEEPTTL')
end
redis.call('ZREM', KEYS[2], KEYS[1])
redis.call('ZREM', KEYS[3], KEYS[1])
return 1
`;

const READ_STATUS = `
local result = {}
for i = 3, 8 do result[#result + 1] = tonumber(redis.call('GET', KEYS[i]) or '0') end
result[#result + 1] = tonumber(redis.call('ZCOUNT', KEYS[2], '(' .. ARGV[1], '+inf'))
return {unpack(result)}
`;

export interface MediaBudgetStatus {
  user: { dailyBytes: number; monthlyBytes: number; dailyUploads: number; activeUploads: number };
  remaining: { dailyBytes: number; monthlyBytes: number; dailyUploads: number };
  limits: {
    userDailyBytes: number;
    userMonthlyBytes: number;
    userDailyUploads: number;
    activeUploads: number;
  };
  resetsAt: { daily: string; monthly: string };
}

@Injectable()
export class MediaBudgetService {
  private readonly logger = new Logger(MediaBudgetService.name);
  private lastWarningAt = 0;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async reserveUpload(userId: string, uploadId: string, sizeBytes: number): Promise<void> {
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1) {
      throw new BadRequestException('Upload size must be a positive integer');
    }
    const window = this.window(userId, uploadId);
    const limits = this.limits();
    const result = await this.evaluate(
      RESERVE_UPLOAD,
      window.keys,
      sizeBytes,
      window.now,
      window.now + MEDIA_POLICY.uploadLeaseSeconds * 1000,
      window.dayEnd / 1000,
      window.monthEnd / 1000,
      limits.active,
      ...limits.quotas,
      limits.globalActive,
    );
    if (result[0] === 2)
      throw new BadRequestException('Upload reservation does not match its size');
    if (result[0] === 3) {
      throw new HttpException(
        'Media upload allowance exhausted; try after the limit resets',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (result[0] !== 0 && result[0] !== 1) {
      throw new ServiceUnavailableException('Media allowance is temporarily unavailable');
    }
    if (
      result[0] === 0 &&
      result.slice(1).some((used, index) => used >= limits.quotas[index] * 0.8) &&
      window.now - this.lastWarningAt >= 60_000
    ) {
      this.lastWarningAt = window.now;
      // Nest's configured Pino logger records no object keys, credentials, or user identifiers.
      this.logger.warn('Media upload allowance reached 80%; inspect the media budget status');
    }
  }

  /** Release only the active lease. Bytes and request counts are never refunded. */
  async finishUpload(userId: string, uploadId: string): Promise<void> {
    const { keys } = this.window(userId, uploadId);
    await this.evaluate(FINISH_UPLOAD, [keys[0], keys[1], keys[8]]);
  }

  async getStatus(userId: string): Promise<MediaBudgetStatus> {
    const window = this.window(userId, 'status');
    const usage = await this.evaluate(READ_STATUS, window.keys, window.now);
    if (usage.length !== 7) throw new ServiceUnavailableException('Invalid media allowance status');
    const limits = this.limits();
    return {
      user: {
        dailyBytes: usage[0],
        monthlyBytes: usage[2],
        dailyUploads: usage[4],
        activeUploads: usage[6],
      },
      remaining: {
        dailyBytes: Math.max(0, Math.min(limits.quotas[0] - usage[0], limits.quotas[1] - usage[1])),
        monthlyBytes: Math.max(
          0,
          Math.min(limits.quotas[2] - usage[2], limits.quotas[3] - usage[3]),
        ),
        dailyUploads: Math.max(
          0,
          Math.min(limits.quotas[4] - usage[4], limits.quotas[5] - usage[5]),
        ),
      },
      limits: {
        userDailyBytes: limits.quotas[0],
        userMonthlyBytes: limits.quotas[2],
        userDailyUploads: limits.quotas[4],
        activeUploads: limits.active,
      },
      resetsAt: {
        daily: new Date(window.dayEnd).toISOString(),
        monthly: new Date(window.monthEnd).toISOString(),
      },
    };
  }

  private positiveConfig(name: string, fallback: number): number {
    const value = Number(this.config.get<string | number>(name, fallback));
    return Number.isSafeInteger(value) && value > 0 ? value : fallback;
  }

  private limits(): { active: number; globalActive: number; quotas: number[] } {
    const mib = 1024 * 1024;
    return {
      active: this.positiveConfig('MEDIA_MAX_ACTIVE_UPLOADS', 3),
      globalActive: this.positiveConfig('MEDIA_GLOBAL_MAX_ACTIVE_UPLOADS', 20),
      quotas: [
        this.positiveConfig('MEDIA_USER_DAILY_BYTES', 64 * mib),
        this.positiveConfig('MEDIA_GLOBAL_DAILY_BYTES', 256 * mib),
        this.positiveConfig('MEDIA_USER_MONTHLY_BYTES', 256 * mib),
        this.positiveConfig('MEDIA_GLOBAL_MONTHLY_BYTES', 2 * 1024 * mib),
        this.positiveConfig('MEDIA_USER_DAILY_UPLOADS', 40),
        this.positiveConfig('MEDIA_GLOBAL_DAILY_UPLOADS', 400),
      ],
    };
  }

  private window(userId: string, uploadId: string) {
    if (!userId || !uploadId || userId.length > 256 || uploadId.length > 256) {
      throw new BadRequestException('Invalid upload identity');
    }
    const now = Date.now();
    const date = new Date(now);
    const day = date.toISOString().slice(0, 10);
    const month = day.slice(0, 7);
    const dayEnd = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
    const monthEnd = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
    const user = createHash('sha256').update(userId).digest('hex');
    const upload = createHash('sha256').update(uploadId).digest('hex');
    const prefix = 'media:{media-budget}';
    return {
      now,
      dayEnd,
      monthEnd,
      keys: [
        `${prefix}:reservation:${user}:${upload}`,
        `${prefix}:active:${user}`,
        `${prefix}:day:${day}:user:${user}:bytes`,
        `${prefix}:day:${day}:global:bytes`,
        `${prefix}:month:${month}:user:${user}:bytes`,
        `${prefix}:month:${month}:global:bytes`,
        `${prefix}:day:${day}:user:${user}:count`,
        `${prefix}:day:${day}:global:count`,
        `${prefix}:active:global`,
      ],
    };
  }

  private async evaluate(script: string, keys: string[], ...args: number[]): Promise<number[]> {
    const client = this.redis.getClient();
    if (!client || client.status !== 'ready') {
      throw new ServiceUnavailableException('Media uploads require an available allowance store');
    }
    try {
      const result: unknown = await client.eval(script, keys.length, ...keys, ...args);
      // FINISH returns a scalar. Other scripts return numeric arrays only.
      if (typeof result === 'number') return [result];
      if (Array.isArray(result)) {
        const values: number[] = [];
        for (const value of result) {
          const item: unknown = value;
          if (typeof item !== 'number' || !Number.isFinite(item)) {
            throw new Error('Invalid allowance response');
          }
          values.push(item);
        }
        return values;
      }
      throw new Error('Invalid allowance response');
    } catch {
      throw new ServiceUnavailableException('Media allowance is temporarily unavailable');
    }
  }
}
