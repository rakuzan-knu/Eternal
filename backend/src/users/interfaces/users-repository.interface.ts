import type { Prisma, User } from '@prisma/client';
import type { CreateUserDto } from '../dto/create-user.dto';

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export interface IUsersRepository {
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(dto: CreateUserDto): Promise<User>;

  updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User>;
  updateAvatar(id: string, avatarUrl: string | null): Promise<User>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
  deleteUser(id: string): Promise<void>;
  blockUser(blockerId: string, blockedId: string): Promise<void>;
  unblockUser(blockerId: string, blockedId: string): Promise<void>;
}
