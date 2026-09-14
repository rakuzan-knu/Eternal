import { describe, it, expect } from 'vitest';
import {
  extractMediaItems,
  extractFileItems,
  extractLinkItems,
  groupByMonth,
  colorForHostname,
} from '../extractChatMedia';
import { MessageView } from '@/entities/chat/model/types';

describe('extractChatMedia utilities', () => {
  const messages = [
    {
      id: 'm1',
      conversationId: 'c1',
      senderId: 'u1',
      sender: { id: 'u1', username: 'u1', displayName: 'User One', avatar: null },
      body: 'Here is a website https://github.com and http://google.com',
      createdAt: '2026-01-01T12:00:00Z',
      reactions: [],
      attachments: [
        { id: 'a1', type: 'IMAGE', url: 'https://img.com/1.jpg', fileName: '1.jpg', size: 100 },
        {
          id: 'a2',
          type: 'FILE',
          url: 'https://files.com/doc.pdf',
          fileName: 'doc.pdf',
          size: 500,
        },
      ],
    } as unknown as MessageView,
  ];

  it('extracts media, files, and links', () => {
    const media = extractMediaItems(messages);
    const files = extractFileItems(messages);
    const links = extractLinkItems(messages);

    expect(media).toHaveLength(1);
    expect(files).toHaveLength(1);
    expect(links).toHaveLength(2);
    expect(links[0].url).toBe('https://github.com');
  });

  it('groups items by month and assigns color for hostnames', () => {
    const media = extractMediaItems(messages);
    const groups = groupByMonth(media);
    expect(groups).toHaveLength(1);

    const color = colorForHostname('github.com');
    expect(color).toBeDefined();
  });

  it('excludes story replies and color attachments from media and files gallery', () => {
    const mixedMessages = [
      ...messages,
      {
        id: 'm2',
        conversationId: 'c1',
        senderId: 'u2',
        sender: { id: 'u2', username: 'u2', displayName: 'User Two', avatar: null },
        body: 'Yoo',
        messageType: 'STORY_REPLY',
        createdAt: '2026-01-02T12:00:00Z',
        reactions: [],
        attachments: [
          {
            id: 'a3',
            type: 'IMAGE',
            url: 'color:#09090b',
            fileName: 'story_reply_abc-123',
            size: 0,
          },
        ],
      } as unknown as MessageView,
    ];

    const media = extractMediaItems(mixedMessages);
    const files = extractFileItems(mixedMessages);

    // Should still only have the 1 real image and 1 real file
    expect(media).toHaveLength(1);
    expect(media[0].attachment.id).toBe('a1');
    expect(files).toHaveLength(1);
    expect(files[0].attachment.id).toBe('a2');
  });
});
