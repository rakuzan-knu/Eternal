import { describe, it, expect, beforeEach } from 'vitest';
import { useChatFoldersStore } from '../useChatFoldersStore';

describe('useChatFoldersStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useChatFoldersStore.setState({ folders: [], folderOrders: {} });
  });

  it('adds a new custom chat folder', () => {
    const folderId = useChatFoldersStore.getState().addFolder({
      name: 'Work Projects',
      icon: 'briefcase',
      emoji: null,
      color: '#3b82f6',
      includeIds: ['conv-1'],
      excludeIds: [],
    });

    expect(folderId).toBeDefined();
    expect(useChatFoldersStore.getState().folders).toHaveLength(1);
    expect(useChatFoldersStore.getState().folders[0].name).toBe('Work Projects');
  });

  it('updates an existing folder', () => {
    const folderId = useChatFoldersStore.getState().addFolder({
      name: 'Old Name',
      icon: null,
      emoji: null,
      color: '#ffffff',
      includeIds: [],
      excludeIds: [],
    });

    useChatFoldersStore.getState().updateFolder(folderId, {
      name: 'New Name',
      icon: 'star',
      emoji: '⭐',
      color: '#eab308',
      includeIds: ['conv-2'],
      excludeIds: [],
    });

    const updated = useChatFoldersStore.getState().folders[0];
    expect(updated.name).toBe('New Name');
    expect(updated.color).toBe('#eab308');
  });

  it('deletes a custom folder and cleans up folderOrders', () => {
    const folderId = useChatFoldersStore.getState().addFolder({
      name: 'To Delete',
      icon: null,
      emoji: null,
      color: '#ffffff',
      includeIds: [],
      excludeIds: [],
    });

    useChatFoldersStore.getState().reorderFolders('u1', [folderId, 'other-id']);
    expect(useChatFoldersStore.getState().folderOrders['u1']).toEqual([folderId, 'other-id']);

    useChatFoldersStore.getState().deleteFolder(folderId);
    expect(useChatFoldersStore.getState().folders).toHaveLength(0);
    expect(useChatFoldersStore.getState().folderOrders['u1']).toEqual(['other-id']);
  });

  it('reorders folders and toggles conversation in folder', () => {
    const fId = useChatFoldersStore.getState().addFolder({
      name: 'Team',
      icon: null,
      emoji: null,
      color: '#ffffff',
      includeIds: ['c1'],
      excludeIds: [],
    });

    // Toggle out (remove)
    useChatFoldersStore.getState().toggleConversationInFolder(fId, 'c1');
    expect(useChatFoldersStore.getState().folders[0].includeIds).toEqual([]);

    // Toggle in (add)
    useChatFoldersStore.getState().toggleConversationInFolder(fId, 'c1');
    expect(useChatFoldersStore.getState().folders[0].includeIds).toEqual(['c1']);

    // Non-existent folder
    useChatFoldersStore.getState().toggleConversationInFolder('missing-folder', 'c1');
  });

  it('updates system folder and ignores deleting system folder', () => {
    useChatFoldersStore.getState().updateFolder('unread', {
      name: 'Unread Chats',
      icon: 'mail',
      emoji: '✉️',
      color: '#38bdf8',
      includeIds: [],
      excludeIds: [],
    });

    const unread = useChatFoldersStore.getState().systemFolders.find((f) => f.id === 'unread');
    expect(unread?.name).toBe('Unread Chats');

    // Attempt to delete system folder
    useChatFoldersStore.getState().deleteFolder('unread');
    expect(useChatFoldersStore.getState().systemFolders.some((f) => f.id === 'unread')).toBe(true);
  });

  it('handles corrupted localStorage JSON gracefully', () => {
    localStorage.setItem('eternal-chat-folders', 'invalid-json{{');
    localStorage.setItem('eternal-system-chat-folders', 'invalid-json{{');
    localStorage.setItem('eternal-chat-folder-orders', 'invalid-json{{');

    // Trigger store actions
    expect(() => {
      useChatFoldersStore.getState().addFolder({
        name: 'Recovered Folder',
        icon: null,
        emoji: null,
        color: '#ffffff',
        includeIds: [],
        excludeIds: [],
      });
    }).not.toThrow();
  });
});
