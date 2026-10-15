import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Platform administration is granted by deployment configuration, never by client data. */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<{ user?: { id?: string } }>().user;
    const administrators = new Set(
      this.config
        .get<string>('PLATFORM_ADMIN_USER_IDS', '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    );
    if (!user?.id || !administrators.has(user.id)) {
      throw new ForbiddenException('Platform administrator access required');
    }
    return true;
  }
}
