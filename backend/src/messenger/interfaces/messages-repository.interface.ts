import type { MessageReaction, ConversationParticipant } from '@prisma/client';
import type { MessageWithDetails } from './types';

export const MESSAGES_REPOSITORY = 'MESSAGES_REPOSITORY';

export interface IMessagesRepository {
  create(data: {
    conversationId: string;
    senderId: string;
    body?: string;
    messageType?: string;
    replyToId?: string;
    forwardedFromId?: string;
  }): Promise<MessageWithDetails>;

  findMany(params: {
    conversationId: string;
    requestingUserId: string;
    before?: string;
    after?: string;
    limit: number;
  }): Promise<MessageWithDetails[]>;

  findOne(messageId: string, requestingUserId: string): Promise<MessageWithDetails | null>;

  edit(messageId: string, body: string): Promise<MessageWithDetails>;

  deleteForAll(messageId: string): Promise<void>;

  deleteForMe(messageId: string, userId: string): Promise<void>;

  markRead(messageId: string, userId: string): Promise<ConversationParticipant | null>;

  markAllRead(conversationId: string, userId: string): Promise<void>;

  addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction>;

  removeReaction(messageId: string, userId: string, emoji: string): Promise<void>;

  getReactions(messageId: string): Promise<MessageReaction[]>;

  search(conversationId: string, query: string, limit: number): Promise<MessageWithDetails[]>;

  findLastMessage(conversationId: string): Promise<MessageWithDetails | null>;

  belongsToConversation(messageId: string, conversationId: string): Promise<boolean>;
}
