import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { randomUUID } from 'crypto';
import type { StringValue } from 'ms';
import { RedisService } from '../redis/redis.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AccessTokenPayload, RefreshTokenPayload } from './interfaces/jwt-payload.interface';
import { PublicUser } from './interfaces/public-user.interface';
import { TokenPair } from './interfaces/token-pair.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    const [existingByEmail, existingByUsername] = await Promise.all([
      this.usersService.findByEmail(dto.email),
      this.usersService.findByUsername(dto.username),
    ]);

    if (existingByEmail) {
      throw new ConflictException('Email is already registered');
    }
    if (existingByUsername) {
      throw new ConflictException('Username is already taken');
    }

    const passwordHash = await argon2.hash(dto.password);

    let user: User;
    try {
      user = await this.usersService.create(
        new CreateUserDto({
          email: dto.email,
          username: dto.username,
          displayName: dto.displayName,
          passwordHash,
        }),
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email or username is already taken');
      }
      throw error;
    }

    const tokens = await this.issueTokenPair(user.id, user.email, user.username);

    return {
      ...tokens,
      user: this.toPublicUser(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokenPair(user.id, user.email, user.username);

    return {
      ...tokens,
      user: this.toPublicUser(user),
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const payload = await this.verifyRefreshToken(refreshToken);

    const redisKey = this.buildRefreshKey(payload.sub, payload.jti);
    const exists = await this.redisService.exists(redisKey);
    if (!exists) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const accessToken = await this.signAccessToken(user.id, user.email, user.username);

    return { accessToken };
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const payload = await this.verifyRefreshToken(refreshToken);

    if (payload.sub !== userId) {
      throw new UnauthorizedException('Refresh token does not belong to the current user');
    }

    const redisKey = this.buildRefreshKey(payload.sub, payload.jti);
    await this.redisService.del(redisKey);
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    username: string,
  ): Promise<TokenPair> {
    const accessToken = await this.signAccessToken(userId, email, username);
    const refreshToken = await this.signRefreshToken(userId);

    return { accessToken, refreshToken };
  }

  private signAccessToken(userId: string, email: string, username: string): Promise<string> {
    const payload: AccessTokenPayload = {
      type: 'access',
      sub: userId,
      email,
      username,
    };
    return this.jwtService.signAsync(payload, {
      secret: this.getRequiredEnv('JWT_ACCESS_SECRET'),
      expiresIn: this.getRequiredEnv('JWT_ACCESS_TTL') as StringValue,
    });
  }

  private async signRefreshToken(userId: string): Promise<string> {
    const jti = randomUUID();
    const ttl = this.getRequiredEnv('JWT_REFRESH_TTL');

    const payload: RefreshTokenPayload = { type: 'refresh', sub: userId, jti };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.getRequiredEnv('JWT_REFRESH_SECRET'),
      expiresIn: ttl as StringValue,
    });

    const ttlSeconds = this.parseTtlToSeconds(ttl);
    await this.redisService.set(this.buildRefreshKey(userId, jti), '1', ttlSeconds);

    return token;
  }

  private getRequiredEnv(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  private async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.getRequiredEnv('JWT_REFRESH_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private buildRefreshKey(userId: string, jti: string): string {
    return `refresh:${userId}:${jti}`;
  }

  private parseTtlToSeconds(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) {
      // fall back: assume value is already in seconds
      const asNumber = Number(ttl);
      return Number.isNaN(asNumber) ? 60 * 60 * 24 * 7 : asNumber;
    }

    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 60 * 60 * 24,
    };

    return value * multipliers[unit];
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    username: string;
    displayName?: string | null;
  }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName ?? null,
    };
  }
}
