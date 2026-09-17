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

  it('safely handles invalid URL exception during extractLinkItems', () => {
    const origURL = globalThis.URL;
    let count = 0;
    // Mock URL constructor to throw on first call
    (globalThis as any).URL = class MockURL extends origURL {
      constructor(url: string | URL, base?: string | URL) {
        count++;
        if (count === 1) {
          throw new Error('Invalid URL');
        }
        super(url, base);
      }
    };

    const links = extractLinkItems(messages);
    expect(links.length).toBeGreaterThanOrEqual(0);

    globalThis.URL = origURL;
  });

  it('handles message with empty body and multiple items in same month', () => {
    const mixedMessages: MessageView[] = [
      {
        id: 'm2',
        body: null as any,
        createdAt: '2026-01-01T12:00:00Z',
        attachments: [{ id: 'a3', type: 'IMAGE', url: 'https://img.com/2.jpg' }],
      } as unknown as MessageView,
      {
        id: 'm3',
        body: 'just plain text without link',
        createdAt: '2026-01-02T12:00:00Z',
        attachments: [{ id: 'a4', type: 'IMAGE', url: 'https://img.com/3.jpg' }],
      } as unknown as MessageView,
    ];

    const links = extractLinkItems(mixedMessages);
    expect(links).toHaveLength(0);

    const media = extractMediaItems(mixedMessages);
    const groups = groupByMonth(media);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(2);
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
