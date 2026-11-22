import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import type { Observable } from 'rxjs';
import { BYPASS_CURFEW_KEY } from './decorators/bypass-curfew.decorator';
import { FamilySafeguardService } from './family-safeguard.service';

/** Runs after authentication. Family/data-rights/safety routes explicitly bypass it. */
@Injectable()
export class FamilyAccessInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly safeguards: FamilySafeguardService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    if (
      this.reflector.getAllAndOverride<boolean>(BYPASS_CURFEW_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return next.handle();
    }
    const type = context.getType();
    const userId =
      type === 'http'
        ? context.switchToHttp().getRequest<{ user?: { id?: string } }>().user?.id
        : type === 'ws'
          ? context.switchToWs().getClient<{ userId?: string }>().userId
          : undefined;
    if (userId) {
      try {
        await this.safeguards.assertCanUse(userId);
        await this.safeguards.trackScreenTimeTick(userId);
      } catch (error) {
        if (type === 'ws')
          throw new WsException(
            error instanceof ForbiddenException
              ? 'Family Center access limit is active. Open Family Center or contact support.'
              : 'Unable to check Family Center limits. Try again later.',
          );
        throw error;
      }
    }
    return next.handle();
  }
}
