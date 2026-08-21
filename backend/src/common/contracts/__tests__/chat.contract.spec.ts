import {
  AttachmentType,
  MessageType,
  MuteLevel,
  conversationIdSchema,
  attachmentSchema,
  sendMessageSchema,
  gatewayResumeSchema,
  editMessageSchema,
  deleteMessageSchema,
  batchDeleteMessagesSchema,
  forwardMessageSchema,
  forwardMultipleMessagesSchema,
  reactToMessageSchema,
  pinMessageSchema,
  togglePinMessageSchema,
  markReadSchema,
  getOnlineStatusSchema,
  getMessagesQuerySchema,
  searchMessagesQuerySchema,
  reportSchema,
  createDirectConversationSchema,
  createGroupConversationSchema,
  updateGroupConversationSchema,
  setNicknameSchema,
  setThemeSchema,
  muteConversationSchema,
  addMembersSchema,
  transferOwnershipSchema,
  promoteMemberSchema,
} from '../chat';

describe('chat.contract', () => {
  const validUuid1 = '123e4567-e89b-12d3-a456-426614174000';
  const validUuid2 = '223e4567-e89b-12d3-a456-426614174000';

  describe('Enums re-export', () => {
    it('exports Prisma enums correctly', () => {
      expect(AttachmentType.IMAGE).toBe('IMAGE');
      expect(MessageType.TEXT).toBe('TEXT');
      expect(MuteLevel.NONE).toBe('NONE');
    });
  });

  describe('conversationIdSchema & attachmentSchema', () => {
    it('validates UUID conversationId', () => {
      expect(conversationIdSchema.parse({ conversationId: validUuid1 })).toEqual({
        conversationId: validUuid1,
      });
      expect(() => conversationIdSchema.parse({ conversationId: 'invalid-id' })).toThrow();
    });

    it('validates attachment with optional fields', () => {
      const att = attachmentSchema.parse({
        type: AttachmentType.VIDEO,
        url: 'https://cdn.example.com/video.mp4',
        fileName: 'clip.mp4',
        mimeType: 'video/mp4',
        size: 5000000,
        width: 1920,
        height: 1080,
        duration: '120.5',
        thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      });
      expect(att.type).toBe(AttachmentType.VIDEO);
      expect(att.duration).toBe(120.5);
    });
  });

  describe('sendMessageSchema refinement', () => {
    it('passes with non-empty text', () => {
      const res = sendMessageSchema.parse({
        conversationId: validUuid1,
        text: 'Hello world',
      });
      expect(res.text).toBe('Hello world');
      expect(res.messageType).toBe(MessageType.TEXT);
    });

    it('passes with empty text but valid attachments', () => {
      const res = sendMessageSchema.parse({
        conversationId: validUuid1,
        attachments: [{ type: AttachmentType.IMAGE, url: 'https://cdn.com/1.png' }],
      });
      expect(res.attachments).toHaveLength(1);
    });

    it('fails when both text and attachments are absent or empty', () => {
      expect(() =>
        sendMessageSchema.parse({
          conversationId: validUuid1,
          text: '   ',
          attachments: [],
        }),
      ).toThrow(/Message must contain either text or attachments/);
    });
  });

  describe('Message mutations schemas', () => {
    it('validates editMessageSchema, deleteMessageSchema, batchDeleteMessagesSchema', () => {
      expect(editMessageSchema.parse({ messageId: validUuid1, body: 'New text' })).toEqual({
        messageId: validUuid1,
        body: 'New text',
      });

      expect(deleteMessageSchema.parse({ messageId: validUuid1, forAll: 'true' })).toEqual({
        messageId: validUuid1,
        forAll: true,
      });

      expect(
        batchDeleteMessagesSchema.parse({ messageIds: [validUuid1, validUuid2], forAll: false }),
      ).toEqual({
        messageIds: [validUuid1, validUuid2],
        forAll: false,
      });
    });

    it('validates forward schemas and reaction schemas', () => {
      expect(
        forwardMessageSchema.parse({
          messageId: validUuid1,
          conversationIds: [validUuid2],
          hideAuthor: true,
        }),
      ).toEqual({
        messageId: validUuid1,
        conversationIds: [validUuid2],
        hideAuthor: true,
      });

      expect(
        forwardMultipleMessagesSchema.parse({
          messageIds: [validUuid1],
          conversationIds: [validUuid2],
        }),
      ).toBeDefined();

      expect(reactToMessageSchema.parse({ messageId: validUuid1, emoji: '❤️' })).toEqual({
        messageId: validUuid1,
        emoji: '❤️',
      });

      expect(pinMessageSchema.parse({ messageId: validUuid1 })).toEqual({
        messageId: validUuid1,
      });

      expect(
        togglePinMessageSchema.parse({ conversationId: validUuid1, messageId: validUuid2 }),
      ).toEqual({
        conversationId: validUuid1,
        messageId: validUuid2,
      });
    });
  });

  describe('Group & Management schemas', () => {
    it('validates direct and group conversation creation & updates', () => {
      expect(createDirectConversationSchema.parse({ participantId: 'usr-target' })).toEqual({
        participantId: 'usr-target',
      });

      expect(
        createGroupConversationSchema.parse({
          name: 'Squad',
          description: 'Our squad',
          memberIds: [validUuid1, validUuid2],
        }),
      ).toBeDefined();

      expect(
        updateGroupConversationSchema.parse({
          name: 'New Squad Name',
          description: 'Updated squad description',
        }),
      ).toBeDefined();

      expect(setNicknameSchema.parse({ targetUserId: validUuid1, nickname: 'Captain' })).toEqual({
        targetUserId: validUuid1,
        nickname: 'Captain',
      });

      expect(setThemeSchema.parse({ theme: 'emerald' })).toEqual({ theme: 'emerald' });

      expect(
        muteConversationSchema.parse({
          muteLevel: MuteLevel.MESSAGES_AND_CALLS,
          mutedUntil: '2026-12-31T00:00:00.000Z',
        }),
      ).toBeDefined();

      expect(addMembersSchema.parse({ memberIds: [validUuid1] })).toBeDefined();
      expect(transferOwnershipSchema.parse({ newOwnerId: validUuid1 })).toBeDefined();
      expect(promoteMemberSchema.parse({ userId: validUuid1 })).toBeDefined();
    });

    it('validates queries and gateway resume', () => {
      expect(gatewayResumeSchema.parse({ sessionId: 'sess-1', lastSeq: 5 })).toEqual({
        sessionId: 'sess-1',
        lastSeq: 5,
      });

      expect(markReadSchema.parse({ conversationId: validUuid1, messageId: validUuid2 })).toEqual({
        conversationId: validUuid1,
        messageId: validUuid2,
      });

      expect(getOnlineStatusSchema.parse({ userIds: [validUuid1] })).toEqual({
        userIds: [validUuid1],
      });

      expect(getMessagesQuerySchema.parse({ limit: '25', before: validUuid1 })).toEqual({
        limit: 25,
        before: validUuid1,
      });

      expect(searchMessagesQuerySchema.parse({ q: 'meeting notes' })).toEqual({
        q: 'meeting notes',
        limit: 30,
      });

      expect(
        reportSchema.parse({ messageId: validUuid1, category: 'SPAM', details: 'Bot message' }),
      ).toEqual({
        messageId: validUuid1,
        category: 'SPAM',
        details: 'Bot message',
      });
    });
  });
});
