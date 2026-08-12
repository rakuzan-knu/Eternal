import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PostsModule } from '../posts/posts.module';
import { USERS_REPOSITORY } from './interfaces/users-repository.interface';
import { UsersRepository } from './repositories/users.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrivacyController } from './privacy/privacy.controller';
import { PrivacyService } from './privacy/privacy.service';
import { VisibilityResolver } from './privacy/visibility.resolver';

@Module({
  imports: [PrismaModule, PostsModule],
  controllers: [UsersController, PrivacyController],
  providers: [
    UsersService,
    PrivacyService,
    VisibilityResolver,
    { provide: USERS_REPOSITORY, useClass: UsersRepository },
  ],
  exports: [UsersService, VisibilityResolver],
})
export class UsersModule {}
