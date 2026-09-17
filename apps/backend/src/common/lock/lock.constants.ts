export const DISTRIBUTED_LOCK_SERVICE = Symbol('DISTRIBUTED_LOCK_SERVICE');

export const LOCK_DEFAULTS = {
  TTL_MS: 5000,
  RETRY_COUNT: 15,
  RETRY_DELAY_MS: 100,
  RETRY_JITTER_MS: 50,
  CLOCK_DRIFT_FACTOR: 0.01,
} as const;

export interface LockHandle {
  resource: string;
  token: string;
  expiresAt: number;
  validityTimeMs: number;
}

export interface LockOptions {
  ttlMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
  autoRenew?: boolean;
}
