export const HEADER_IDEMPOTENCY_KEY = 'x-idempotency-key';
export const HEADER_IDEMPOTENT_REPLAY = 'x-idempotent-replay';
export const HEADER_CACHE_LOOKUP = 'x-cache-lookup';

export const REDIS_IDEMPOTENCY_PREFIX = 'idempotency:';
export const DEFAULT_IDEMPOTENCY_TTL_SECONDS = 1800; // 30 minutes
export const IN_FLIGHT_LOCK_TTL_MS = 30_000; // 30 seconds

export const IDEMPOTENT_METADATA_KEY = 'IDEMPOTENT_METADATA_KEY';

export const IDEMPOTENCY_STATE = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

export interface IdempotencyRecord<T = unknown> {
  state: typeof IDEMPOTENCY_STATE.IN_PROGRESS | typeof IDEMPOTENCY_STATE.COMPLETED;
  statusCode?: number;
  body?: T;
  timestamp?: number;
}
