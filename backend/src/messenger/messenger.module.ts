import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

import { ConversationsController } from './conversations/conversations.controller';
import { ConversationsService } from './conversations/conversations.service';
import { ConversationsRepository } from './repositories/conversations.repository';
import { CONVERSATIONS_REPOSITORY } from './interfaces/conversations-repository.interface';

import { MessagesRepository } from './repositories/messages.repository';
import { MESSAGES_REPOSITORY } from './interfaces/messages-repository.interface';

import { MessengerMapper } from './messenger.mapper';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, JwtModule.register({})],
  controllers: [ConversationsController],
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
    MessengerMapper,
  ],
  exports: [ConversationsService],
})
export class MessengerModule {}
