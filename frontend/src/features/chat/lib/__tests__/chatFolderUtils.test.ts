import { describe, it, expect } from 'vitest';
import { getFolderConversations, getFolderUnreadCount } from '../chatFolderUtils';
import type { ConversationView } from '@/entities/chat/model/types';
import type { ChatFolder } from '../../model/useChatFoldersStore';

describe('chatFolderUtils', () => {
  const mockConversations: Partial<ConversationView>[] = [
    { id: 'c1', type: 'DIRECT', unreadCount: 2, isArchived: false },
    { id: 'c2', type: 'GROUP', unreadCount: 0, isArchived: false },
    { id: 'c3', type: 'DIRECT', unreadCount: 0, isArchived: true },
  ];

  it('filters unread conversations', () => {
    const unreadFolder: ChatFolder = {
      id: 'unread',
      name: 'Unread',
      icon: null,
      emoji: null,
      color: '#000',
      includeIds: [],
      excludeIds: [],
      isSystem: true,
    };

    const res = getFolderConversations(
      unreadFolder,
      mockConversations as ConversationView[],
      new Set(),
    );
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('c1');
  });

  it('filters group conversations', () => {
    const groupFolder: ChatFolder = {
      id: 'groups',
      name: 'Groups',
      icon: null,
      emoji: null,
      color: '#000',
      includeIds: [],
      excludeIds: [],
      isSystem: true,
    };

    const res = getFolderConversations(
      groupFolder,
      mockConversations as ConversationView[],
      new Set(),
    );
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('c2');
  });

  it('calculates unread count correctly', () => {
    const allFolder: ChatFolder = {
      id: 'all',
      name: 'All',
      icon: null,
      emoji: null,
      color: '#000',
      includeIds: [],
      excludeIds: [],
      isSystem: true,
    };

    const count = getFolderUnreadCount(
      allFolder,
      mockConversations as ConversationView[],
      new Set(['c2']),
    );
    expect(count).toBe(3); // 2 from c1 + 1 forced unread from c2
  });
});
