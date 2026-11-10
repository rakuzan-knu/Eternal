import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { AccessTokenPayload, RequestUser } from '../interfaces/jwt-payload.interface';
import { TokenRevocationService } from '../token-revocation.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
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

    // Recheck existence so account deletion takes effect across all service processes.
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

    return requestUser;
  }
}
