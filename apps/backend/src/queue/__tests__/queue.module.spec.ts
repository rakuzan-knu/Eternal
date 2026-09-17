import { Test } from '@nestjs/testing';
import { QueueModule } from '../queue.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@common/prisma';
import { MessengerModule } from '../../messenger/messenger.module';
import { QueueService } from '../queue.service';

describe('QueueModule', () => {
  it('compiles the module successfully', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        MessengerModule,
        QueueModule,
      ],
    }).compile();

    expect(moduleRef).toBeDefined();
    expect(moduleRef.get(QueueService)).toBeDefined();
  });
});
