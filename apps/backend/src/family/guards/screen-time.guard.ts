import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BYPASS_CURFEW_KEY } from '../decorators/bypass-curfew.decorator';
import { FamilySafeguardService } from '../family-safeguard.service';

@Injectable()
export class ScreenTimeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly safeguardService: FamilySafeguardService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check if the endpoint is marked with @BypassCurfew()
    const bypass = this.reflector.getAllAndOverride<boolean>(BYPASS_CURFEW_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (bypass) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id || req.raw?.user?.id;
    if (!userId) {
      return true; // Unauthenticated requests handled by AuthGuard
    }

    // 2. Perform curfew and screen time quota check
    const status = await this.safeguardService.checkScreenTime(userId);
    if (status.isBlocked) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          code: 'FAMILY_CURFEW_ACTIVE',
          reason: status.reason,
          curfewEnd: status.curfewEnd,
          dailyLimitMinutes: status.dailyLimitMinutes,
          message:
            status.reason === 'CURFEW_HOURS'
              ? 'Downtime is active. Family Center has restricted platform access.'
              : 'Daily screen time limit reached.',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
