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

  it('deletes a custom folder', () => {
    const folderId = useChatFoldersStore.getState().addFolder({
      name: 'To Delete',
      icon: null,
      emoji: null,
      color: '#ffffff',
      includeIds: [],
      excludeIds: [],
    });

    useChatFoldersStore.getState().deleteFolder(folderId);
    expect(useChatFoldersStore.getState().folders).toHaveLength(0);
  });
});
