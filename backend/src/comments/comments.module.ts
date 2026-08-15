import { Module, forwardRef } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsRepository } from './comments.repository';
import { CommentsService } from './comments.service';
import { COMMENTS_REPOSITORY } from './interfaces/comments-repository.interface';

import { PrismaModule } from '@common/prisma';
import { MessengerModule } from '../messenger/messenger.module';

@Module({
  imports: [PrismaModule, forwardRef(() => MessengerModule)],
  controllers: [CommentsController],
  providers: [
    CommentsService,
    {
      provide: COMMENTS_REPOSITORY,
      useClass: CommentsRepository,
    },
  ],
})
export class CommentsModule {}
