import { Logger } from '@nestjs/common';
import type { DistributedLockService } from './distributed-lock.service';
import type { LockOptions } from './lock.constants';

type KeyResolver = string | ((...args: unknown[]) => string);

/**
 * Method decorator that wraps method execution inside a distributed lock.
 * Requires the target class instance to have a `distributedLockService` property or `redisService`.
 */
export function DistributedLock(
  keyOrResolver: KeyResolver,
  options?: LockOptions,
): MethodDecorator {
  const logger = new Logger('DistributedLockDecorator');

  return (_target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;

    descriptor.value = async function (...args: unknown[]) {
      const lockService = (this as { distributedLockService?: DistributedLockService })
        .distributedLockService;

      if (!lockService) {
        logger.warn(
          `DistributedLock applied on ${String(propertyKey)}, but distributedLockService is not injected on the class. Falling back to direct execution.`,
        );
        return originalMethod.apply(this, args);
      }

      const resourceKey =
        typeof keyOrResolver === 'function' ? keyOrResolver(...args) : keyOrResolver;

      return lockService.withLock(resourceKey, () => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}
