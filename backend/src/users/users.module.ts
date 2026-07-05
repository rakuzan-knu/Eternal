import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { USERS_REPOSITORY } from './interfaces/users-repository.interface';
import { UsersRepository } from './repositories/users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule],
  providers: [UsersService, { provide: USERS_REPOSITORY, useClass: UsersRepository }],
  exports: [UsersService],
})
export class UsersModule {}
