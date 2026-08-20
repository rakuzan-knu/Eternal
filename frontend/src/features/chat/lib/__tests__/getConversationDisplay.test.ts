import { describe, it, expect } from 'vitest';
import { getConversationDisplay, getMessagePreview } from '../getConversationDisplay';
import type { ConversationView } from '@/entities/chat/model/types';

describe('getConversationDisplay', () => {
  it('returns group title and avatar for group chats', () => {
    const groupConv: Partial<ConversationView> = {
      type: 'GROUP',
      name: 'Dev Team',
      avatar: 'https://example.com/group.jpg',
      participants: [],
    };

    const display = getConversationDisplay(groupConv as ConversationView, 'my-id');
    expect(display.title).toBe('Dev Team');
    expect(display.isGroup).toBe(true);
    expect(display.avatar).toBe('https://example.com/group.jpg');
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
  });
});
