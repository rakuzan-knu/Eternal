import { MessengerMapper } from '../messenger.mapper';
import { MessageType, ParticipantRole, MuteLevel } from '@prisma/client';
import type {
  MessageWithDetails,
  ConversationWithDetails,
  ParticipantWithUser,
} from '../interfaces/types';

describe('MessengerMapper', () => {
  let mapper: MessengerMapper;

  beforeEach(() => {
    mapper = new MessengerMapper();
  });

  describe('mapMessage', () => {
    const baseMsg: MessageWithDetails = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'usr-sender',
      body: 'Hello world',
      messageType: MessageType.TEXT,
      replyToId: null,
      replyTo: null,
      forwardedFromId: null,
      forwardedFrom: null,
      deletedForAll: false,
      deletedAt: null,
      editedAt: null,
      createdAt: new Date('2026-08-16T12:00:00.000Z'),
      sender: {
        id: 'usr-sender',
        username: 'sender_user',
        displayName: 'Sender User',
        avatar: null,
      },
      reactions: [
        {
          id: 'rx-1',
          emoji: '👍',
          userId: 'usr-sender',
          createdAt: new Date(),
          user: {
            id: 'usr-sender',
            username: 'sender_user',
            displayName: 'Sender User',
            avatar: null,
          },
        },
      ],
      attachments: [
        {
          id: 'att-1',
          type: 'IMAGE',
          url: 'https://cdn.com/pic.jpg',
          fileName: 'pic.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          width: 800,
          height: 600,
          duration: null,
          thumbnailUrl: null,
        },
      ],
      deletedFor: [],
      pinnedIn: [],
      conversation: {
        participants: [
          {
            userId: 'usr-reader',
            lastReadAt: new Date('2026-08-16T12:05:00.000Z'),
          },
        ],
      },
    };

    it('maps message details and aggregates reactions correctly', () => {
      const mapped = mapper.mapMessage(baseMsg, 'usr-sender', new Set(['msg-1']));

      expect(mapped.id).toBe('msg-1');
      expect(mapped.body).toBe('Hello world');
      expect(mapped.isPinned).toBe(true);
      expect(mapped.isEdited).toBe(false);
      expect(mapped.reactions).toHaveLength(1);
      expect(mapped.reactions[0]).toEqual(
        expect.objectContaining({
          emoji: '👍',
          count: 1,
          selfReacted: true,
        }),
      );
      expect(mapped.attachments).toHaveLength(1);
      expect(mapped.readBy).toContain('usr-reader');
    });

    it('hides body and attachments if message is deleted for user or deleted for all', () => {
      const deletedForUserMsg: MessageWithDetails = {
        ...baseMsg,
        deletedFor: [{ userId: 'usr-viewer' }],
      };

      const mapped = mapper.mapMessage(deletedForUserMsg, 'usr-viewer');

      expect(mapped.body).toBeNull();
      expect(mapped.attachments).toHaveLength(0);
      expect(mapped.isDeleted).toBe(true);
    });

    it('maps replyTo recursively and forwardedFrom correctly', () => {
      const replyMsg: MessageWithDetails = {
        ...baseMsg,
        id: 'msg-2',
        replyTo: baseMsg,
        forwardedFrom: {
          ...baseMsg,
          id: 'orig-msg',
          body: 'Original forwarded content',
          sender: {
            id: 'usr-orig',
            username: 'original_user',
            displayName: 'Original User',
            avatar: null,
          },
        },
      };

      const mapped = mapper.mapMessage(replyMsg, 'usr-sender');

      expect(mapped.replyTo?.id).toBe('msg-1');
      expect(mapped.forwardedFrom?.id).toBe('orig-msg');
      expect(mapped.forwardedFrom?.body).toBe('Original forwarded content');
    });
  });

  describe('mapParticipant', () => {
    it('maps participant fields and fallback theme', () => {
      const p: ParticipantWithUser = {
        id: 'p-1',
        conversationId: 'conv-1',
        userId: 'usr-1',
        role: ParticipantRole.OWNER,
        theme: null,
        muteLevel: MuteLevel.NONE,
        mutedUntil: null,
        nickname: 'Boss',
        joinedAt: new Date(),
        updatedAt: new Date(),
        lastReadAt: new Date(),
        archivedAt: null,
        pinnedAt: null,
        leftAt: null,
        user: {
          id: 'usr-1',
          username: 'user_1',
          displayName: 'User One',
          avatar: null,
        },
      };

      const mapped = mapper.mapParticipant(p);

      expect(mapped.userId).toBe('usr-1');
      expect(mapped.nickname).toBe('Boss');
      expect(mapped.theme).toBe('default');
      expect(mapped.role).toBe(ParticipantRole.OWNER);
    });
  });

  describe('mapConversation', () => {
    const conv: ConversationWithDetails = {
      id: 'conv-1',
      type: 'DIRECT',
      name: null,
      avatar: null,
      description: null,
      createdById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      participants: [
        {
          id: 'p-1',
          conversationId: 'conv-1',
          userId: 'usr-viewer',
          role: ParticipantRole.MEMBER,
          theme: 'dark',
          muteLevel: MuteLevel.MESSAGES,
          mutedUntil: null,
          nickname: null,
          joinedAt: new Date(),
          updatedAt: new Date(),
          lastReadAt: new Date(),
          archivedAt: new Date(),
          pinnedAt: new Date(),
          leftAt: null,
          user: { id: 'usr-viewer', username: 'viewer', displayName: 'Viewer', avatar: null },
        },
        {
          id: 'p-2',
          conversationId: 'conv-1',
          userId: 'usr-other',
          role: ParticipantRole.MEMBER,
          theme: null,
          muteLevel: MuteLevel.NONE,
          mutedUntil: null,
          nickname: null,
          joinedAt: new Date(),
          updatedAt: new Date(),
          lastReadAt: new Date(),
          archivedAt: null,
          pinnedAt: null,
          leftAt: null,
          user: { id: 'usr-other', username: 'other', displayName: 'Other', avatar: null },
        },
      ],
      messages: [],
      pinnedMessages: [],
    };

    it('maps direct conversation, unread count, and personal settings', () => {
      const mapped = mapper.mapConversation(conv, 'usr-viewer', 5);

      expect(mapped.id).toBe('conv-1');
      expect(mapped.unreadCount).toBe(5);
      expect(mapped.myTheme).toBe('dark');
      expect(mapped.myMuteLevel).toBe(MuteLevel.MESSAGES);
      expect(mapped.isArchived).toBe(true);
      expect(mapped.isPinned).toBe(true);
      expect(mapped.isBlocked).toBe(false);
    });

    it('marks conversation blocked if either user blocked the other', () => {
      const blockCtx = {
        blockedByMe: new Set(['usr-other']),
        blockingMe: new Set<string>(),
      };

      const mapped = mapper.mapConversation(conv, 'usr-viewer', 0, blockCtx);

      expect(mapped.blockedByMe).toBe(true);
      expect(mapped.isBlocked).toBe(true);
    });
  });
});
