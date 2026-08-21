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
});
