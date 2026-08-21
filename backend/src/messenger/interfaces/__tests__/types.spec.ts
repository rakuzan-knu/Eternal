import {
  userSnapshot,
  attachmentFields,
  reactionFields,
  messageInclude,
  participantInclude,
  conversationInclude,
} from '../types';

describe('messenger Prisma projection selectors and includes', () => {
  it('defines userSnapshot projection fields', () => {
    expect(userSnapshot).toEqual({
      id: true,
      username: true,
      displayName: true,
      avatar: true,
    });
  });

  it('defines attachmentFields projection fields', () => {
    expect(attachmentFields).toEqual({
      id: true,
      type: true,
      url: true,
      fileName: true,
      mimeType: true,
      size: true,
      width: true,
      height: true,
      duration: true,
      thumbnailUrl: true,
    });
  });

  it('defines reactionFields projection fields', () => {
    expect(reactionFields).toEqual({
      id: true,
      emoji: true,
      userId: true,
      user: { select: userSnapshot },
      createdAt: true,
    });
  });

  it('defines messageInclude, participantInclude, conversationInclude structures', () => {
    expect(messageInclude.sender).toEqual({ select: userSnapshot });
    expect(messageInclude.attachments).toEqual({ select: attachmentFields });
    expect(participantInclude.user).toEqual({ select: userSnapshot });
    expect(conversationInclude.participants).toEqual({
      where: { leftAt: null },
      include: participantInclude,
    });
    expect(conversationInclude.messages.take).toBe(1);
  });
});
