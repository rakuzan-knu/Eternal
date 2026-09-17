import { Global, Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@common/prisma';
import { QueueService } from './queue.service';
import { NotificationsProcessor } from './processors/notifications.processor';
import { MediaPreviewProcessor } from './processors/media-preview.processor';
import { SearchIndexingProcessor } from './processors/search-indexing.processor';
import { MessagesProcessor } from './processors/messages.processor';
import { VideoTranscodeProcessor } from './processors/video-transcode.processor';
import { MessengerModule } from '../messenger/messenger.module';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule, forwardRef(() => MessengerModule)],
  providers: [
    QueueService,
    NotificationsProcessor,
    MediaPreviewProcessor,
    SearchIndexingProcessor,
    MessagesProcessor,
    VideoTranscodeProcessor,
  ],
  exports: [QueueService],
})
export class QueueModule {}
