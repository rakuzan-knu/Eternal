import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import type { ComplexityOptions } from './query-complexity.service';

export const QUERY_COMPLEXITY_KEY = 'RESILIENCE:QUERY_COMPLEXITY';

export const QueryComplexity = (options: ComplexityOptions): CustomDecorator<string> =>
  SetMetadata(QUERY_COMPLEXITY_KEY, options);
