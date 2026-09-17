import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const DEADLOCK_TIMEOUT_KEY = 'DEADLOCK_TIMEOUT_MS';

/**
 * Decorator to configure the application-level deadlock/timeout threshold in milliseconds for a route or controller.
 * Defaults to 15,000ms if not specified.
 */
export const DeadlockTimeout = (timeoutMs: number): CustomDecorator<string> =>
  SetMetadata(DEADLOCK_TIMEOUT_KEY, Math.max(100, Math.floor(timeoutMs)));

/**
 * Alias for DeadlockTimeout
 */
export const RouteTimeout = DeadlockTimeout;
