import type {
  Conversation,
  ConversationParticipant,
  MuteLevel,
  ParticipantRole,
} from '@prisma/client';
import type { ConversationWithDetails, ParticipantWithUser } from './types';
import type { UserSnapshot } from '@common/contracts';

export const CONVERSATIONS_REPOSITORY = 'CONVERSATIONS_REPOSITORY';

export interface IConversationsRepository {
  findDirectBetween(userAId: string, userBId: string): Promise<Conversation | null>;

  createDirect(userAId: string, userBId: string): Promise<ConversationWithDetails>;

  createGroup(data: {
    name: string;
    description?: string;
    createdById: string;
    memberIds: string[];
  }): Promise<ConversationWithDetails>;

  findAllForUser(userId: string): Promise<ConversationWithDetails[]>;

  findOneForUser(conversationId: string, userId: string): Promise<ConversationWithDetails | null>;

  updateGroup(
    conversationId: string,
    data: { name?: string; description?: string; avatar?: string | null },
  ): Promise<Conversation>;

  findParticipant(conversationId: string, userId: string): Promise<ConversationParticipant | null>;

  findParticipants(conversationId: string): Promise<ParticipantWithUser[]>;

  findBlockedUsers(blockerId: string): Promise<UserSnapshot[]>;

  findParticipantIds(conversationId: string): Promise<string[]>;

  addParticipants(conversationId: string, userIds: string[]): Promise<void>;

  removeParticipant(conversationId: string, userId: string): Promise<void>;

  updateParticipant(
    conversationId: string,
    userId: string,
    data: Partial<{
      nickname: string | null;
      theme: string | null;
      muteLevel: MuteLevel;
      mutedUntil: Date | null;
      role: ParticipantRole;
      archivedAt: Date | null;
      leftAt: Date | null;
      pinnedAt: Date | null;
      lastReadAt: Date;
    }>,
  ): Promise<ConversationParticipant>;

  setUserDefaultChatTheme(userId: string, theme: string | null): Promise<void>;

  updateAllParticipantsForUser(
    userId: string,
    data: Partial<{ theme: string | null }>,
  ): Promise<void>;

  touchUpdatedAt(conversationId: string): Promise<void>;

  countUnread(conversationId: string, userId: string, hiddenUserIds?: string[]): Promise<number>;

  findPinnedMessages(conversationId: string): Promise<string[]>;

  pinMessage(conversationId: string, messageId: string, pinnedByUserId: string): Promise<void>;

  unpinMessage(conversationId: string, messageId: string): Promise<void>;

  updateSharedTheme(conversationId: string, theme: string | null): Promise<Conversation>;
}
