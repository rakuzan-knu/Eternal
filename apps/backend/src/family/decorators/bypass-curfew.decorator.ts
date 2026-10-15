import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const BYPASS_CURFEW_KEY = 'bypass_curfew';

/**
 * Decorator to exempt critical endpoints (Family Center management, auth, logout, emergency help)
 * from being blocked by the ScreenTimeGuard curfew lockdown.
 */
export const BypassCurfew = (): CustomDecorator<string> => SetMetadata(BYPASS_CURFEW_KEY, true);
