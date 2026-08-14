import { Module, forwardRef } from '@nestjs/common';
import { FollowersController } from './followers.controller';
import { FollowersService } from './followers.service';
import { FollowersRepository } from './repositories/followers.repository';
import { FOLLOWERS_REPOSITORY } from './interfaces/followers-repository.interface';
import { PrismaModule } from '../prisma/prisma.module';
import { MessengerModule } from '../messenger/messenger.module';

@Module({
  imports: [PrismaModule, forwardRef(() => MessengerModule)],
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
