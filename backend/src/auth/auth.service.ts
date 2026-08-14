import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
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
import { SessionsService, type RequestMeta } from '../sessions/sessions.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
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
    @Inject(forwardRef(() => SessionsService))
    private readonly sessionsService: SessionsService,
  ) {}

  async checkUsername(rawUsername: string): Promise<{ isAvailable: boolean }> {
    const username = (rawUsername || '').replace(/^@+/, '').trim();
    if (!username || username.length < 2) {
      return { isAvailable: false };
    }
    const user = await this.usersService.findByUsername(username);
    return { isAvailable: !user };
  }

  async register(dto: RegisterDto, meta: RequestMeta = {}) {
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
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        }),
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email or username is already taken');
      }
      throw error;
    }

    const tokens = await this.issueTokenPair(user.id, user.email, user.username, meta);

    return {
      ...tokens,
      user: this.toPublicUser(user),
    };
  }

  async login(dto: LoginDto, meta: RequestMeta = {}) {
    const rawIdentifier = (dto.email || dto.identity || '').trim();
    if (!rawIdentifier) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const identifier = rawIdentifier.toLowerCase();
    let user = await this.usersService.findByEmail(identifier);
    if (!user) {
      user = await this.usersService.findByUsername(rawIdentifier.replace(/^@+/, ''));
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokenPair(user.id, user.email, user.username, meta);

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

    const accessToken = await this.signAccessToken(user.id, user.email, user.username, payload.jti);
    await this.sessionsService.touch(payload.jti);

    return { accessToken };
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const payload = await this.verifyRefreshToken(refreshToken);

    if (payload.sub !== userId) {
      throw new UnauthorizedException('Refresh token does not belong to the current user');
    }

    const redisKey = this.buildRefreshKey(payload.sub, payload.jti);
    await this.redisService.del(redisKey);
    await this.sessionsService.deleteByJti(payload.jti);
  }

  async changePassword(userId: string, dto: ChangePasswordDto, keepJti?: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User no longer exists');

    const matches = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!matches) throw new UnauthorizedException('Current password is incorrect');

    const newHash = await argon2.hash(dto.newPassword);
    await this.usersService.updatePasswordHash(userId, newHash);

    if (keepJti) await this.revokeOtherSessions(userId, keepJti);
  }

  async revokeRefreshByJti(userId: string, jti: string): Promise<void> {
    await this.redisService.del(this.buildRefreshKey(userId, jti));
  }

  async revokeOtherSessions(userId: string, keepJti: string): Promise<void> {
    const revokedJtis = await this.sessionsService.revokeOthers(userId, keepJti);
    await Promise.all(
      revokedJtis.map((jti) => this.redisService.del(this.buildRefreshKey(userId, jti))),
    );
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    username: string,
    meta: RequestMeta = {},
  ): Promise<TokenPair> {
    const { token: refreshToken, jti } = await this.signRefreshToken(userId);
    const accessToken = await this.signAccessToken(userId, email, username, jti);

    await this.sessionsService.create(userId, jti, meta);

    return { accessToken, refreshToken };
  }

  private signAccessToken(
    userId: string,
    email: string,
    username: string,
    jti: string,
  ): Promise<string> {
    const payload: AccessTokenPayload = {
      type: 'access',
      sub: userId,
      email,
      username,
      jti,
    };
    return this.jwtService.signAsync(payload, {
      secret: this.getRequiredEnv('JWT_ACCESS_SECRET'),
      expiresIn: this.getRequiredEnv('JWT_ACCESS_TTL') as StringValue,
    });
  }

  private async signRefreshToken(userId: string): Promise<{ token: string; jti: string }> {
    const jti = randomUUID();
    const ttl = this.getRequiredEnv('JWT_REFRESH_TTL');

    const payload: RefreshTokenPayload = { type: 'refresh', sub: userId, jti };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.getRequiredEnv('JWT_REFRESH_SECRET'),
      expiresIn: ttl as StringValue,
    });

    const ttlSeconds = this.parseTtlToSeconds(ttl);
    await this.redisService.set(this.buildRefreshKey(userId, jti), '1', ttlSeconds);

    return { token, jti };
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
