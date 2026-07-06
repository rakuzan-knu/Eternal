import { Injectable } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateUserDto } from '../dto/create-user.dto';
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
}
