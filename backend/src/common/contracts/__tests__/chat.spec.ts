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

describe('chat contract schemas (chat.spec.ts)', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  const validUuid2 = '223e4567-e89b-12d3-a456-426614174000';

  it('should validate conversationIdSchema', () => {
    expect(conversationIdSchema.parse({ conversationId: validUuid })).toEqual({
      conversationId: validUuid,
    });
  });

  it('should validate attachmentSchema', () => {
    const attachment = attachmentSchema.parse({
      type: AttachmentType.IMAGE,
      url: 'https://cdn.example.com/image.png',
      size: 1024,
    });
    expect(attachment.type).toBe(AttachmentType.IMAGE);
    expect(attachment.url).toBe('https://cdn.example.com/image.png');
  });

  it('should validate sendMessageSchema with text', () => {
    const msg = sendMessageSchema.parse({
      conversationId: validUuid,
      text: 'Hello world',
    });
    expect(msg.text).toBe('Hello world');
    expect(msg.messageType).toBe(MessageType.TEXT);
  });

  it('should reject sendMessageSchema when neither text nor attachments provided', () => {
    expect(() =>
      sendMessageSchema.parse({
        conversationId: validUuid,
      }),
    ).toThrow();
  });

  it('should validate gatewayResumeSchema and editMessageSchema', () => {
    const resume = gatewayResumeSchema.parse({
      sessionId: 'sess-1',
      lastSeq: 5,
    });
    expect(resume.sessionId).toBe('sess-1');

    const edit = editMessageSchema.parse({
      messageId: validUuid,
      body: 'Updated message',
    });
    expect(edit.body).toBe('Updated message');
  });

  it('should validate deleteMessageSchema and batchDeleteMessagesSchema', () => {
    const del = deleteMessageSchema.parse({
      messageId: validUuid,
      forAll: true,
    });
    expect(del.forAll).toBe(true);

    const batch = batchDeleteMessagesSchema.parse({
      messageIds: [validUuid, validUuid2],
    });
    expect(batch.messageIds).toHaveLength(2);
  });

  it('should validate forwardMessageSchema and forwardMultipleMessagesSchema', () => {
    const fwd = forwardMessageSchema.parse({
      messageId: validUuid,
      conversationIds: [validUuid2],
      hideAuthor: true,
    });
    expect(fwd.hideAuthor).toBe(true);

    const fwdMulti = forwardMultipleMessagesSchema.parse({
      messageIds: [validUuid],
      conversationIds: [validUuid2],
    });
    expect(fwdMulti.messageIds).toHaveLength(1);
  });

  it('should validate react, pin, togglePin, and markRead schemas', () => {
    expect(reactToMessageSchema.parse({ messageId: validUuid, emoji: '🔥' }).emoji).toBe('🔥');
    expect(pinMessageSchema.parse({ messageId: validUuid }).messageId).toBe(validUuid);
    expect(
      togglePinMessageSchema.parse({ conversationId: validUuid, messageId: validUuid2 }).messageId,
    ).toBe(validUuid2);
    expect(markReadSchema.parse({ conversationId: validUuid }).conversationId).toBe(validUuid);
  });

  it('should validate query and group conversation schemas', () => {
    expect(getOnlineStatusSchema.parse({ userIds: [validUuid] }).userIds).toHaveLength(1);
    expect(getMessagesQuerySchema.parse({ limit: 20 }).limit).toBe(20);
    expect(searchMessagesQuerySchema.parse({ q: 'test' }).q).toBe('test');
    expect(reportSchema.parse({ category: 'spam' }).category).toBe('spam');
    expect(createDirectConversationSchema.parse({ participantId: 'usr-123' }).participantId).toBe(
      'usr-123',
    );
    expect(
      createGroupConversationSchema.parse({ name: 'Group 1', memberIds: [validUuid] }).name,
    ).toBe('Group 1');
    expect(updateGroupConversationSchema.parse({ name: 'New name' }).name).toBe('New name');
    expect(setNicknameSchema.parse({ targetUserId: validUuid, nickname: 'Buddy' }).nickname).toBe(
      'Buddy',
    );
    expect(setThemeSchema.parse({ theme: 'midnight' }).theme).toBe('midnight');
    expect(
      muteConversationSchema.parse({ muteLevel: MuteLevel.MESSAGES_AND_CALLS }).muteLevel,
    ).toBe(MuteLevel.MESSAGES_AND_CALLS);
    expect(addMembersSchema.parse({ memberIds: [validUuid] }).memberIds).toHaveLength(1);
    expect(transferOwnershipSchema.parse({ newOwnerId: validUuid }).newOwnerId).toBe(validUuid);
    expect(promoteMemberSchema.parse({ userId: validUuid }).userId).toBe(validUuid);
  });
});
