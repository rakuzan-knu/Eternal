import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-users.dto';
import { UserProfileDto } from './dto/user-profile.dto';
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

  async getProfile(id: string): Promise<UserProfileDto> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return this.toProfileDto(user);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<UserProfileDto> {
    const hasFields =
      dto.email || dto.username || dto.displayName !== undefined || dto.bio !== undefined;
    if (!hasFields) {
      throw new BadRequestException('At least one field must be provided');
    }

    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      if (existing) throw new ConflictException('Email is already taken');
    }

    if (dto.username && dto.username !== user.username) {
      const existing = await this.usersRepository.findByUsername(dto.username);
      if (existing) throw new ConflictException('Username is already taken');
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.displayName !== undefined) data.displayName = dto.displayName;
    if (dto.bio !== undefined) data.bio = dto.bio;

    const updated = await this.usersRepository.updateUser(id, data);
    return this.toProfileDto(updated);
  }

  private toProfileDto(user: User): UserProfileDto {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
