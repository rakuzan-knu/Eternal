import type { MessageReaction, ConversationParticipant } from '@prisma/client';
import type { MessageWithDetails } from './types';
import type { ChatActivityMap } from '@common/contracts';

export const MESSAGES_REPOSITORY = 'MESSAGES_REPOSITORY';

export interface IMessagesRepository {
  create(data: {
    conversationId: string;
    senderId: string;
    body?: string | undefined;
    clientSeq?: number | undefined;
    messageType?: string | undefined;
    replyToId?: string | undefined;
    forwardedFromId?: string | undefined;
  }): Promise<MessageWithDetails>;

  findMany(params: {
    conversationId: string;
    requestingUserId: string;
    before?: string | undefined;
    after?: string | undefined;
    limit: number;
    hiddenUserIds?: string[] | undefined;
  }): Promise<MessageWithDetails[]>;

  findAround(params: {
    conversationId: string;
    targetMessageId: string;
    requestingUserId: string;
    limit: number;
    hiddenUserIds?: string[] | undefined;
  }): Promise<MessageWithDetails[]>;

  findAroundDate(params: {
    conversationId: string;
    targetDate: Date;
    requestingUserId: string;
    limit: number;
    hiddenUserIds?: string[] | undefined;
  }): Promise<MessageWithDetails[]>;

  getActivityMap(params: {
    conversationId: string;
    year: number;
    month: number;
    timezone?: string | undefined;
    requestingUserId: string;
    hiddenUserIds?: string[] | undefined;
  }): Promise<ChatActivityMap>;

  findOne(messageId: string, requestingUserId: string): Promise<MessageWithDetails | null>;

  edit(messageId: string, body: string): Promise<MessageWithDetails>;

  deleteForAll(messageId: string): Promise<void>;

  deleteForMe(messageId: string, userId: string): Promise<void>;

  markRead(messageId: string, userId: string): Promise<ConversationParticipant | null>;

  markAllRead(conversationId: string, userId: string): Promise<void>;

  addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction>;

  removeReaction(messageId: string, userId: string, emoji: string): Promise<void>;

  getReactions(messageId: string): Promise<MessageReaction[]>;

  search(
    conversationId: string,
    query: string,
    limit: number,
    hiddenUserIds?: string[],
  ): Promise<MessageWithDetails[]>;

  findLastMessage(conversationId: string): Promise<MessageWithDetails | null>;

  belongsToConversation(messageId: string, conversationId: string): Promise<boolean>;
}
