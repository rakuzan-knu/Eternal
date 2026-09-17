import { describe, it, expect } from 'vitest';
import { getConversationDisplay, getMessagePreview } from '../getConversationDisplay';
import type { ConversationView } from '@/entities/chat/model/types';

describe('getConversationDisplay', () => {
  it('returns group title, avatar, verified flag and badge for group chats', () => {
    const groupConv: Partial<ConversationView> = {
      type: 'GROUP',
      name: 'Dev Team',
      avatar: 'https://example.com/group.jpg',
      isVerified: true,
      primaryBadge: 'DEVELOPER',
      participants: [],
    };

    const display = getConversationDisplay(groupConv as ConversationView, 'my-id');
    expect(display.title).toBe('Dev Team');
    expect(display.isGroup).toBe(true);
    expect(display.avatar).toBe('https://example.com/group.jpg');
    expect(display.isVerified).toBe(true);
    expect(display.primaryBadge).toBe('DEVELOPER');
  });

  it('returns other user display name for direct chats', () => {
    const directConv: Partial<ConversationView> = {
      type: 'DIRECT',
      participants: [
        {
          userId: 'usr-2',
          role: 'MEMBER',
          mutedUntil: null,
          joinedAt: new Date().toISOString(),
          nickname: null,
          theme: 'DEFAULT',
          muteLevel: 'NONE',
          user: {
            id: 'usr-2',
            username: 'alice',
            displayName: 'Alice Smith',
            avatar: 'https://example.com/alice.jpg',
          },
        },
      ],
    };

    const display = getConversationDisplay(directConv as ConversationView, 'my-id');
    expect(display.title).toBe('Alice Smith');
    expect(display.isGroup).toBe(false);
    expect(display.otherUserId).toBe('usr-2');
  });

  it('getMessagePreview returns appropriate preview strings', () => {
    expect(getMessagePreview({ lastMessage: null } as unknown as ConversationView)).toBe(
      'No messages yet',
    );
    expect(
      getMessagePreview({
        lastMessage: {
          isDeleted: true,
          attachments: [],
        },
      } as unknown as ConversationView),
    ).toBe('This message was deleted');
    expect(
      getMessagePreview({
        lastMessage: {
          isDeleted: false,
          body: 'Hey there!',
          attachments: [],
        },
      } as unknown as ConversationView),
    ).toBe('Hey there!');

    expect(
      getMessagePreview({
        type: 'DIRECT',
        lastMessage: {
          isDeleted: false,
          body: null,
          attachments: [{ type: 'AUDIO', duration: 15 }],
        },
      } as unknown as ConversationView),
    ).toBe('Voice message (0:15)');

    expect(
      getMessagePreview({
        type: 'DIRECT',
        lastMessage: {
          isDeleted: false,
          body: null,
          attachments: [{ type: 'VIDEO', fileName: 'video_note_123.webm', duration: 20 }],
        },
      } as unknown as ConversationView),
    ).toBe('Video message (0:20)');

    expect(
      getMessagePreview({
        type: 'DIRECT',
        lastMessage: {
          isDeleted: false,
          messageType: 'VIDEO',
          body: null,
          attachments: [],
        },
      } as unknown as ConversationView),
    ).toBe('Video message');

    expect(
      getMessagePreview({
        type: 'DIRECT',
        lastMessage: {
          isDeleted: false,
          messageType: 'AUDIO',
          body: null,
          attachments: [],
        },
      } as unknown as ConversationView),
    ).toBe('Voice message');

    expect(
      getMessagePreview({
        type: 'DIRECT',
        lastMessage: {
          isDeleted: false,
          body: '   ',
          attachments: [],
        },
      } as unknown as ConversationView),
    ).toBe('No messages yet');

    expect(
      getMessagePreview(
        {
          type: 'DIRECT',
          lastMessage: {
            sender: { id: 'my-id' },
            isDeleted: false,
            body: null,
            attachments: [{ type: 'AUDIO', duration: 45 }],
          },
        } as unknown as ConversationView,
        'my-id',
      ),
    ).toBe('You: Voice message (0:45)');

    // Group message from another user
    expect(
      getMessagePreview(
        {
          type: 'GROUP',
          lastMessage: {
            sender: { id: 'other-id', displayName: 'Bob' },
            isDeleted: false,
            body: 'Hello team',
            attachments: [],
          },
        } as unknown as ConversationView,
        'my-id',
      ),
    ).toBe('Bob: Hello team');

    // Square video note and mimeType video note
    expect(
      getMessagePreview({
        type: 'DIRECT',
        lastMessage: {
          isDeleted: false,
          body: null,
          attachments: [{ type: 'VIDEO', width: 300, height: 300, duration: 10 }],
        },
      } as unknown as ConversationView),
    ).toBe('Video message (0:10)');

    // Image, Video, GIF, File, Attachment
    expect(
      getMessagePreview({
        type: 'DIRECT',
        lastMessage: {
          isDeleted: false,
          body: null,
          attachments: [{ type: 'IMAGE' }],
        },
      } as unknown as ConversationView),
    ).toBe('Photo');

    expect(
      getMessagePreview({
        type: 'DIRECT',
        lastMessage: {
          isDeleted: false,
          body: null,
          attachments: [{ type: 'VIDEO', duration: 12 }],
        },
      } as unknown as ConversationView),
    ).toBe('Video (0:12)');

    expect(
      getMessagePreview({
        type: 'DIRECT',
        lastMessage: {
          isDeleted: false,
          body: null,
          attachments: [{ type: 'GIF' }],
        },
      } as unknown as ConversationView),
    ).toBe('GIF');

    expect(
      getMessagePreview({
        type: 'DIRECT',
        lastMessage: {
          isDeleted: false,
          body: null,
          attachments: [{ type: 'FILE', fileName: 'doc.pdf' }],
        },
      } as unknown as ConversationView),
    ).toBe('File: doc.pdf');

    expect(
      getMessagePreview({
        type: 'DIRECT',
        lastMessage: {
          isDeleted: false,
          body: null,
          attachments: [{ type: 'UNKNOWN_TYPE' as any }],
        },
      } as unknown as ConversationView),
    ).toBe('Attachment');

    // Group message sent by own user
    expect(
      getMessagePreview(
        {
          type: 'GROUP',
          lastMessage: {
            sender: { id: 'my-id' },
            isDeleted: false,
            body: 'Hello everyone!',
            attachments: [],
          },
        } as unknown as ConversationView,
        'my-id',
      ),
    ).toBe('You: Hello everyone!');
  });

  it('handles participant title fallbacks when user object is missing or minimal', () => {
    // 1. Participant with flat displayName (covers line 38: flat displayName fallback)
    const conv1 = {
      type: 'DIRECT',
      participants: [{ userId: 'u2', displayName: 'Flat Display Name' }],
    } as any;
    expect(getConversationDisplay(conv1, 'my-id').title).toBe('Flat Display Name');

    // 2. Participant with flat username only (covers line 39: flat username fallback)
    const conv2 = {
      type: 'DIRECT',
      participants: [{ userId: 'u2', username: 'flat_user' }],
    } as any;
    expect(getConversationDisplay(conv2, 'my-id').title).toBe('flat_user');

    // 3. Participant with only nested user.username, no displayName (covers line 37)
    const conv3 = {
      type: 'DIRECT',
      participants: [{ userId: 'u2', user: { username: 'nested_user' } }],
    } as any;
    expect(getConversationDisplay(conv3, 'my-id').title).toBe('nested_user');

    // 4. Participant with no name fields at all (covers line 40: 'Unknown user')
    const conv4 = {
      type: 'DIRECT',
      participants: [{ userId: 'u2' }],
    } as any;
    expect(getConversationDisplay(conv4, 'my-id').title).toBe('Unknown user');

    // 5. No participants at all
    const conv5 = {
      type: 'DIRECT',
      participants: [],
    } as any;
    expect(getConversationDisplay(conv5, 'my-id').title).toBe('Unknown user');

    // 6. Participant with flat avatar and primaryBadge (covers flat property fallbacks in avatar/otherUsername)
    const conv6 = {
      type: 'DIRECT',
      participants: [
        {
          userId: 'u2',
          avatar: 'https://flat-avatar.png',
          primaryBadge: 'PREMIUM',
          username: 'flat_u6',
        },
      ],
    } as any;
    const d6 = getConversationDisplay(conv6, 'my-id');
    expect(d6.avatar).toBe('https://flat-avatar.png');
    expect(d6.primaryBadge).toBe('PREMIUM');
    expect(d6.otherUsername).toBe('flat_u6');
  });

  it('covers GROUP sender with no displayName or username (falls back to "User")', () => {
    // Covers line 77: the || 'User' fallback when sender has no displayName or username
    expect(
      getMessagePreview(
        {
          type: 'GROUP',
          lastMessage: {
            sender: { id: 'other-id' }, // no displayName, no username
            isDeleted: false,
            body: 'Hi',
            attachments: [],
          },
        } as unknown as ConversationView,
        'my-id',
      ),
    ).toBe('User: Hi');
  });

  it('covers FILE attachment with no fileName', () => {
    expect(
      getMessagePreview({
        type: 'DIRECT',
        lastMessage: {
          isDeleted: false,
          body: null,
          attachments: [{ type: 'FILE', fileName: null }],
        },
      } as unknown as ConversationView),
    ).toBe('File: Attachment');
  });

  it('covers mimeType-based video note detection', () => {
    expect(
      getMessagePreview({
        type: 'DIRECT',
        lastMessage: {
          isDeleted: false,
          body: null,
          attachments: [{ type: 'VIDEO', mimeType: 'video/video_note', duration: 8 }],
        },
      } as unknown as ConversationView),
    ).toBe('Video message (0:08)');
  });

  it('covers group name fallback to "Unnamed group"', () => {
    const groupConv: Partial<ConversationView> = {
      type: 'GROUP',
      name: undefined,
      avatar: null,
      isVerified: false,
      primaryBadge: null,
      participants: [],
    };
    const display = getConversationDisplay(groupConv as ConversationView, 'my-id');
    expect(display.title).toBe('Unnamed group');
    expect(display.primaryBadge).toBeNull();
  });

  it('covers participant with id field instead of userId (flat id fallback)', () => {
    // covers (p.userId ?? (p as { id?: string }).id) !== currentUserId
    const conv = {
      type: 'DIRECT',
      participants: [{ id: 'u2', user: { displayName: 'Bob by ID' } }],
    } as any;
    const display = getConversationDisplay(conv, 'my-id');
    expect(display.title).toBe('Bob by ID');
    expect(display.otherUserId).toBe('u2'); // uses flat .id fallback
  });
});
