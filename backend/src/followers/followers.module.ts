import { Module } from '@nestjs/common';
import { FollowersController } from './followers.controller';
import { FollowersService } from './followers.service';
import { FollowersRepository } from './repositories/followers.repository';
import { FOLLOWERS_REPOSITORY } from './interfaces/followers-repository.interface';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FollowersController],
  providers: [
    FollowersService,
    {
      provide: FOLLOWERS_REPOSITORY,
      useClass: FollowersRepository,
    },
  ],
  exports: [FollowersService],
})
export class FollowersModule {}
