import type { User } from '@prisma/client';
import { type CreateUserDto } from '../dto/create-user.dto';

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
export interface IUsersRepository {
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(dto: CreateUserDto): Promise<User>;
}
