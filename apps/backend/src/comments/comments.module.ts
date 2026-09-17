import { Module, forwardRef } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsRepository } from './comments.repository';
import { CommentsService } from './comments.service';
import { CommentsMediaService } from './comments-media.service';
import { COMMENTS_REPOSITORY } from './interfaces/comments-repository.interface';

import { PrismaModule } from '@common/prisma';
import { MessengerModule } from '../messenger/messenger.module';
import { SnowflakeModule } from '../common/id/snowflake.module';

@Module({
  imports: [PrismaModule, forwardRef(() => MessengerModule), SnowflakeModule],
  controllers: [CommentsController],
  providers: [
    CommentsService,
    CommentsMediaService,
    {
      provide: COMMENTS_REPOSITORY,
      useClass: CommentsRepository,
    },
  ],
  exports: [CommentsService, CommentsMediaService],
})
export class CommentsModule {}
