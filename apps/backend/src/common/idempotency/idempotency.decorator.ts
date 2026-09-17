import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import { IDEMPOTENT_METADATA_KEY } from './idempotency.constants';

export interface IdempotentOptions {
  ttlSeconds?: number;
  required?: boolean;
}

/**
 * Decorator to explicitly configure or enforce Idempotency on endpoints.
 */
export const Idempotent = (options?: IdempotentOptions): CustomDecorator<string> =>
  SetMetadata(IDEMPOTENT_METADATA_KEY, options ?? {});
