import { Global, Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@common/prisma';
import { RedisModule } from '../../redis/redis.module';
import { QueueModule } from '../../queue/queue.module';
import { MessengerModule } from '../../messenger/messenger.module';
import { OUTBOX_REPOSITORY } from './outbox.constants';
import { OutboxRepository } from './repositories/outbox.repository';
import { OutboxService } from './outbox.service';
import { OutboxPublisherService } from './outbox-publisher.service';

@Global()
@Module({
  imports: [PrismaModule, RedisModule, QueueModule, forwardRef(() => MessengerModule)],
  providers: [
    {
      provide: OUTBOX_REPOSITORY,
      useClass: OutboxRepository,
    },
    OutboxService,
    OutboxPublisherService,
  ],
  exports: [OUTBOX_REPOSITORY, OutboxService, OutboxPublisherService],
})
export class OutboxModule {}
