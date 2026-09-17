import { Module, forwardRef } from '@nestjs/common';
import { LikesRepository } from './likes.repository';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { PostsModule } from '../posts/posts.module';
import { PrismaModule } from '@common/prisma';
import { MessengerModule } from '../messenger/messenger.module';
import { LIKES_REPOSITORY } from './interfaces/likes-repository.interface';
import { CrdtModule } from '../common/crdt/crdt.module';

@Module({
  imports: [
    forwardRef(() => PostsModule),
    PrismaModule,
    forwardRef(() => MessengerModule),
    CrdtModule,
  ],
  controllers: [LikesController],
  providers: [
    LikesService,
    LikesRepository,
    {
      provide: LIKES_REPOSITORY,
      useClass: LikesRepository,
    },
  ],
})
export class LikesModule {}
