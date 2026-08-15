import { Injectable } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import type { CreateUserDto } from '@common/contracts';
import type { IUsersRepository } from '../interfaces/users-repository.interface';

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(dto: CreateUserDto): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash: dto.passwordHash,
        displayName: dto.displayName ?? null,
        birthDate: dto.birthDate ?? null,
      },
    });
  }

  updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  updateAvatar(id: string, avatarUrl: string | null): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { avatar: avatarUrl },
    });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async deleteUser(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.post.deleteMany({ where: { authorId: id } });
      await tx.follow.deleteMany({
        where: {
          OR: [{ followerId: id }, { followingId: id }],
        },
      });
      await tx.user.delete({ where: { id } });
    });
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        create: { blockerId, blockedId },
        update: {},
      }),
      this.prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: blockedId },
            { followerId: blockedId, followingId: blockerId },
          ],
        },
      }),
    ]);
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.prisma.userBlock.deleteMany({
      where: { blockerId, blockedId },
    });
  }
}
