import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends PassportAuthGuard('jwt') {
  override handleRequest<TUser>(err: unknown, user: TUser): TUser {
    return user;
  }

  override canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
