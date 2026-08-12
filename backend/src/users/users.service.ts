import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrivacyDimension, Prisma, User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-users.dto';
import { FollowStatusView, UserProfileDto } from './dto/user-profile.dto';
import { USERS_REPOSITORY } from './interfaces/users-repository.interface';
import type { IUsersRepository } from './interfaces/users-repository.interface';
import { RedisService } from '../redis/redis.service';
import { VisibilityResolver } from './privacy/visibility.resolver';
import type { VisibilityContext } from './privacy/visibility.resolver';
import { toLastSeenGranularity } from './privacy/last-seen.util';
import { PrismaService } from '../prisma/prisma.service';

type RawProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  banner: string | null;
  bannerPosition: number;
  bio: string | null;
  birthDate: string | null;
  isPrivate: boolean;
  lastSeenAt: string | null;
  autoDeletePeriod: User['autoDeletePeriod'];
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly redis: RedisService,
    private readonly visibility: VisibilityResolver,
    private readonly prisma: PrismaService,
  ) {}

  private userKey(id: string): string {
    return `user:${id}`;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findByUsername(username);
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  create(dto: CreateUserDto): Promise<User> {
    return this.usersRepository.create(dto);
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.usersRepository.updatePassword(id, passwordHash);
    await this.redis.del(this.userKey(id));
  }

  async touchLastSeen(id: string, when: Date = new Date()): Promise<void> {
    await this.usersRepository.updateUser(id, { lastSeenAt: when });
    await this.redis.del(this.userKey(id));
  }

  async deleteAccount(id: string, password: string): Promise<void> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const matches = await argon2.verify(user.passwordHash, password);
    if (!matches) {
      throw new UnauthorizedException('Incorrect password');
    }

    await this.usersRepository.deleteUser(id);
    await this.redis.del(this.userKey(id));
  }

  private async getRawProfile(id: string): Promise<RawProfile> {
    const key = this.userKey(id);
    return this.redis.getOrSet(key, 3600, async () => {
      const user = await this.usersRepository.findById(id);
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }
      return this.toRawProfile(user);
    });
  }

  async getProfileFor(id: string, viewerId: string | null): Promise<UserProfileDto> {
    if (viewerId && viewerId !== id) {
      const isBlocked = await this.prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: viewerId, blockedId: id },
            { blockerId: id, blockedId: viewerId },
          ],
        },
      });
      if (isBlocked) throw new NotFoundException('User not found');
    }

    const raw = await this.getRawProfile(id);
    const ctx = await this.visibility.loadContext([id], viewerId);
    const profile = this.applyPrivacy(raw, viewerId, ctx);

    if (viewerId && viewerId !== id) {
      const aliasRecord = await this.prisma.userAlias.findUnique({
        where: { ownerId_targetId: { ownerId: viewerId, targetId: id } },
      });
      if (aliasRecord) {
        profile.alias = aliasRecord.alias;
      }
    }

    return profile;
  }

  async setUserAlias(ownerId: string, targetId: string, alias: string): Promise<{ success: true }> {
    if (ownerId === targetId) {
      throw new BadRequestException('Cannot set alias for yourself');
    }
    const target = await this.usersRepository.findById(targetId);
    if (!target) throw new NotFoundException('User not found');

    await this.prisma.userAlias.upsert({
      where: { ownerId_targetId: { ownerId, targetId } },
      create: { ownerId, targetId, alias: alias.trim() },
      update: { alias: alias.trim() },
    });
    return { success: true };
  }

  async deleteUserAlias(ownerId: string, targetId: string): Promise<{ success: true }> {
    await this.prisma.userAlias.deleteMany({
      where: { ownerId, targetId },
    });
    return { success: true };
  }

  async getProfileByUsername(username: string, viewerId: string | null): Promise<UserProfileDto> {
    const user = await this.usersRepository.findByUsername(username);
    if (!user) throw new NotFoundException('User not found');
    return this.getProfileFor(user.id, viewerId);
  }

  async blockUser(blockerId: string, targetId: string): Promise<{ success: true }> {
    if (blockerId === targetId) throw new BadRequestException("Can't block yourself");
    const target = await this.usersRepository.findById(targetId);
    if (!target) throw new NotFoundException('User not found');

    await this.usersRepository.blockUser(blockerId, targetId);
    await Promise.all([
      this.redis.del(this.userKey(blockerId)),
      this.redis.del(this.userKey(targetId)),
    ]);
    return { success: true };
  }

  async unblockUser(blockerId: string, targetId: string): Promise<{ success: true }> {
    await this.usersRepository.unblockUser(blockerId, targetId);
    await Promise.all([
      this.redis.del(this.userKey(blockerId)),
      this.redis.del(this.userKey(targetId)),
    ]);
    return { success: true };
  }

  getProfile(id: string): Promise<UserProfileDto> {
    return this.getProfileFor(id, null);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<UserProfileDto> {
    const hasFields =
      dto.email || dto.username || dto.displayName !== undefined || dto.bio !== undefined;
    if (!hasFields) {
      throw new BadRequestException('At least one field must be provided');
    }

    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException(`User with id ${id} not found`);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      if (existing) throw new ConflictException('Email is already taken');
    }

    if (dto.username && dto.username !== user.username) {
      const cooldownKey = `username_change_cooldown:${id}`;
      const lastChange = await this.redis.get(cooldownKey);
      if (lastChange) {
        throw new BadRequestException('Username can only be changed once every 7 days.');
      }
      const existing = await this.usersRepository.findByUsername(dto.username);
      if (existing) throw new ConflictException('Username is already taken');
      await this.redis.set(cooldownKey, Date.now().toString(), 604800);
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.displayName !== undefined) data.displayName = dto.displayName;
    if (dto.bio !== undefined) data.bio = dto.bio;

    await this.usersRepository.updateUser(id, data);
    await this.redis.del(this.userKey(id));
    return this.getProfileFor(id, id);
  }

  private toRawProfile(user: User): RawProfile {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      banner: user.banner,
      bannerPosition: user.bannerPosition,
      bio: user.bio,
      birthDate: user.birthDate ? user.birthDate.toISOString() : null,
      isPrivate: user.isPrivate,
      lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
      autoDeletePeriod: user.autoDeletePeriod,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private followStatusView(ownerId: string, ctx: VisibilityContext): FollowStatusView {
    if (ctx.acceptedFollowing.has(ownerId)) return FollowStatusView.FOLLOWING;
    if (ctx.pendingFollowing.has(ownerId)) return FollowStatusView.PENDING;
    return FollowStatusView.NONE;
  }

  applyPrivacy(
    raw: RawProfile,
    viewerId: string | null,
    ctx: VisibilityContext,
    now: number = Date.now(),
  ): UserProfileDto {
    const isOwner = viewerId === raw.id;
    const isFollower = this.visibility.isFollower(raw.id, ctx);

    const base: UserProfileDto = {
      id: raw.id,
      username: raw.username,
      displayName: raw.displayName,
      avatar: raw.avatar,
      bio: null,
      isPrivate: raw.isPrivate,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };

    if (!isOwner) {
      base.followStatus = this.followStatusView(raw.id, ctx);
    }

    if (raw.isPrivate && !isOwner && !isFollower) {
      return { ...base, avatar: raw.avatar };
    }

    if (isOwner || this.visibility.resolve(PrivacyDimension.AVATAR, raw.id, ctx)) {
      base.avatar = raw.avatar;
    } else {
      base.avatar = null;
    }

    if (isOwner || this.visibility.resolve(PrivacyDimension.BANNER, raw.id, ctx)) {
      base.banner = raw.banner;
      base.bannerPosition = raw.bannerPosition;
    }

    if (isOwner || this.visibility.resolve(PrivacyDimension.BIO, raw.id, ctx)) {
      base.bio = raw.bio;
    }

    if (isOwner || this.visibility.resolve(PrivacyDimension.BIRTHDAY, raw.id, ctx)) {
      base.birthDate = raw.birthDate;
    }

    if (raw.lastSeenAt) {
      const parsed = new Date(raw.lastSeenAt);
      const isOnline = now - parsed.getTime() < 5 * 60 * 1000;
      if (isOwner || this.visibility.resolve(PrivacyDimension.LAST_SEEN, raw.id, ctx)) {
        base.lastSeen = parsed.toISOString();
        base.lastSeenAt = parsed.toISOString();
        base.isOnline = isOnline;
      } else {
        const gran = toLastSeenGranularity(parsed, now);
        base.lastSeen = gran;
        base.lastSeenAt = gran;
        base.isOnline = false;
      }
    }

    return base;
  }
}
