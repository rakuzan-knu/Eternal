import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import { IDEMPOTENT_METADATA_KEY, SKIP_IDEMPOTENCY_METADATA_KEY } from './idempotency.constants';

export interface IdempotentOptions {
  ttlSeconds?: number;
  required?: boolean;
}

/**
 * Decorator to explicitly configure or enforce Idempotency on endpoints.
 */
export const Idempotent = (options?: IdempotentOptions): CustomDecorator<string> =>
  SetMetadata(IDEMPOTENT_METADATA_KEY, options ?? {});

export const SkipIdempotency = (): CustomDecorator<string> =>
  SetMetadata(SKIP_IDEMPOTENCY_METADATA_KEY, true);
