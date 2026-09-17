import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@common/prisma';
import { UsersModule } from '../users/users.module';

import { ConversationsController } from './conversations/conversations.controller';
import { ConversationsService } from './conversations/conversations.service';
import { ConversationsRepository } from './repositories/conversations.repository';
import { CONVERSATIONS_REPOSITORY } from './interfaces/conversations-repository.interface';

import { MessagesController } from './messages/messages.controller';
import { MessagesService } from './messages/messages.service';
import { MessagesRepository } from './repositories/messages.repository';
import { MESSAGES_REPOSITORY } from './interfaces/messages-repository.interface';

import { MessengerGateway } from './gateway/messenger.gateway';
import { MessengerMapper } from './messenger.mapper';
import { AutoDeleteService } from './auto-delete/auto-delete.service';
import { autoDeleteS3Provider } from './auto-delete/s3-provider';
import { PresenceEngineService } from './presence/presence-engine.service';
import { WsDrainingService } from './gateway/ws-draining.service';
import { WsBackpressureService } from './gateway/ws-backpressure.service';
import { K8sPodMigrationService } from './gateway/k8s-pod-migration.service';

import { RedisModule } from '../redis/redis.module';
import { OpenGraphModule } from '../opengraph/opengraph.module';
import { MessengerLinkPreviewController } from './link-preview.controller';
import { SnowflakeModule } from '../common/id/snowflake.module';

import { FastPathChatService } from './services/fast-path-chat.service';
import { OffHeapBufferPoolService } from './services/off-heap-buffer-pool.service';
import { CallsController } from './calls/calls.controller';
import { CallsService } from './calls/calls.service';
import { CallsCDCService } from './calls/calls-cdc.service';
import { CallsStepUpService } from './calls/calls-step-up.service';
import { CallsRepository } from './repositories/calls.repository';
import { CALLS_REPOSITORY } from './interfaces/calls-repository.interface';

import { FoldersController } from './folders/folders.controller';
import { FoldersService } from './folders/folders.service';
import { FoldersRepository } from './repositories/folders.repository';
import { FOLDERS_REPOSITORY } from './interfaces/folders-repository.interface';

import { SearchController } from './search/search.controller';
import { SearchService } from './search/search.service';
import { SearchRepository } from './repositories/search.repository';
import { SEARCH_REPOSITORY } from './interfaces/search-repository.interface';

import { PrekeysController } from './crypto/prekeys.controller';
import { PrekeysService } from './crypto/prekeys.service';
import { PrekeysRepository } from './repositories/prekeys.repository';
import { PREKEYS_REPOSITORY } from './interfaces/prekeys-repository.interface';
import { JamService } from '../integrations/jam.service';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    forwardRef(() => UsersModule),
    ConfigModule,
    JwtModule.register({}),
    OpenGraphModule,
    SnowflakeModule,
  ],
  controllers: [
    ConversationsController,
    MessagesController,
    MessengerLinkPreviewController,
    CallsController,
    FoldersController,
    SearchController,
    PrekeysController,
  ],
  providers: [
    {
      provide: CONVERSATIONS_REPOSITORY,
      useClass: ConversationsRepository,
    },
    {
      provide: MESSAGES_REPOSITORY,
      useClass: MessagesRepository,
    },
    {
      provide: CALLS_REPOSITORY,
      useClass: CallsRepository,
    },
    {
      provide: FOLDERS_REPOSITORY,
      useClass: FoldersRepository,
    },
    {
      provide: SEARCH_REPOSITORY,
      useClass: SearchRepository,
    },
    {
      provide: PREKEYS_REPOSITORY,
      useClass: PrekeysRepository,
    },
    ConversationsService,
    MessagesService,
    FoldersService,
    SearchService,
    PrekeysService,
    CallsService,
    CallsCDCService,
    CallsStepUpService,
    FastPathChatService,
    MessengerMapper,
    PresenceEngineService,
    WsDrainingService,
    WsBackpressureService,
    K8sPodMigrationService,
    OffHeapBufferPoolService,
    MessengerGateway,
    {
      provide: 'MessengerGateway',
      useExisting: MessengerGateway,
    },
    JamService,
    AutoDeleteService,
    autoDeleteS3Provider,
  ],
  exports: [
    CONVERSATIONS_REPOSITORY,
    MESSAGES_REPOSITORY,
    CALLS_REPOSITORY,
    FOLDERS_REPOSITORY,
    SEARCH_REPOSITORY,
    PREKEYS_REPOSITORY,
    ConversationsService,
    MessagesService,
    FoldersService,
    SearchService,
    PrekeysService,
    CallsService,
    CallsCDCService,
    CallsStepUpService,
    FastPathChatService,
    MessengerGateway,
    'MessengerGateway',
    PresenceEngineService,
    WsDrainingService,
    WsBackpressureService,
    K8sPodMigrationService,
    OffHeapBufferPoolService,
    JamService,
  ],
})
export class MessengerModule {}
