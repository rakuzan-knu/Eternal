import { roleControllers } from '../config/service-role';
import { Module, forwardRef } from '@nestjs/common';
import { FollowersController } from './followers.controller';
import { FollowersService } from './followers.service';
import { FollowersRepository } from './repositories/followers.repository';
import { FOLLOWERS_REPOSITORY } from './interfaces/followers-repository.interface';
import { PrismaModule } from '@common/prisma';
import { MessengerModule } from '../messenger/messenger.module';

@Module({
  imports: [PrismaModule, forwardRef(() => MessengerModule)],
  controllers: roleControllers('core', [FollowersController]),
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
