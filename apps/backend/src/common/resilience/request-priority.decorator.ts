import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export enum RequestPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW',
}

export const REQUEST_PRIORITY_KEY = 'RESILIENCE:REQUEST_PRIORITY';

export const Priority = (priority: RequestPriority): CustomDecorator<string> =>
  SetMetadata(REQUEST_PRIORITY_KEY, priority);

export const LowPriority = (): CustomDecorator<string> => Priority(RequestPriority.LOW);

export const NormalPriority = (): CustomDecorator<string> => Priority(RequestPriority.NORMAL);

export const HighPriority = (): CustomDecorator<string> => Priority(RequestPriority.HIGH);

export const CriticalPriority = (): CustomDecorator<string> => Priority(RequestPriority.CRITICAL);
