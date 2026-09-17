import { Module, forwardRef } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './repositories/notifications.repository';
import { NOTIFICATIONS_REPOSITORY } from './interfaces/notifications-repository.interface';
import { PrismaModule } from '@common/prisma';
import { RedisModule } from '../redis/redis.module';
import { MessengerModule } from '../messenger/messenger.module';

@Module({
  imports: [PrismaModule, RedisModule, forwardRef(() => MessengerModule)],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    {
      provide: NOTIFICATIONS_REPOSITORY,
      useClass: NotificationsRepository,
    },
  ],
  exports: [NotificationsService, NOTIFICATIONS_REPOSITORY],
})
export class NotificationsModule {}
