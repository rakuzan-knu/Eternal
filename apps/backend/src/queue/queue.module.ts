import { Global, Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@common/prisma';
import { QueueService } from './queue.service';
import { NotificationsProcessor } from './processors/notifications.processor';
import { MediaPreviewProcessor } from './processors/media-preview.processor';
import { SearchIndexingProcessor } from './processors/search-indexing.processor';
import { MessagesProcessor } from './processors/messages.processor';
import { VideoTranscodeProcessor } from './processors/video-transcode.processor';
import { PushModule } from '../notifications/push/push.module';
import { MessengerModule } from '../messenger/messenger.module';
import { reelsS3Provider } from '../reels/s3-provider';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule, forwardRef(() => MessengerModule), PushModule],
  providers: [
    reelsS3Provider,
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
