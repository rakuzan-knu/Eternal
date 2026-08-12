import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

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

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, ConfigModule, JwtModule.register({})],
  controllers: [ConversationsController, MessagesController],
  providers: [
    {
      provide: CONVERSATIONS_REPOSITORY,
      useClass: ConversationsRepository,
    },
    {
      provide: MESSAGES_REPOSITORY,
      useClass: MessagesRepository,
    },
    ConversationsService,
    MessagesService,
    MessengerMapper,
    MessengerGateway,
    AutoDeleteService,
    autoDeleteS3Provider,
  ],
  exports: [ConversationsService, MessagesService, MessengerGateway],
})
export class MessengerModule {}
