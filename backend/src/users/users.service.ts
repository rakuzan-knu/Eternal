import { Inject, Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { USERS_REPOSITORY } from './interfaces/users-repository.interface';
import type { IUsersRepository } from './interfaces/users-repository.interface';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
  ) {}

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
}
