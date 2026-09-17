import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { AccessTokenPayload, RequestUser } from '../interfaces/jwt-payload.interface';
import { TokenRevocationService } from '../token-revocation.service';
import { WeakRefCache } from '../../common/v8/weak-ref-cache';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly userCache = new WeakRefCache<string, RequestUser>('jwt-active-users', 64);

  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly tokenRevocationService: TokenRevocationService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') as string,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<RequestUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Token Revocation List (TRL) Bloom Filter check (instant O(1), zero DB load)
    const isRevoked = await this.tokenRevocationService.isTokenRevoked(
      payload.jti,
      payload.sub,
      (payload as unknown as { iat?: number }).iat,
    );
    if (isRevoked) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Fast-path: check WeakRef cache (auto-reclaimed by V8 GC under idle/drop)
    const cached = this.userCache.get(payload.sub);
    if (cached) {
      return {
        id: cached.id,
        email: cached.email,
        username: cached.username,
        sessionJti: payload.jti,
      };
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const requestUser: RequestUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      sessionJti: payload.jti,
    };
    this.userCache.set(payload.sub, requestUser);

    return requestUser;
  }
}
