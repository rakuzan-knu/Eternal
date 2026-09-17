import { create } from 'zustand';
import { registerSessionResetHandler } from '@/shared/model/resetSession';
import { chatApi } from '../api/chatApi';

export type SystemChatFolderId = 'all' | 'unread' | 'groups';

export interface ChatFolder {
  id: string;
  name: string;
  icon: string | null;
  emoji: string | null;
  color: string;
  includeIds: string[];
  excludeIds: string[];
  isSystem?: boolean;
  filterType?: string;
  order?: number;
}

interface ChatFoldersState {
  systemFolders: ChatFolder[];
  folders: ChatFolder[];
  folderOrders: Record<string, string[]>;
  syncWithServer: () => Promise<void>;
  addFolder: (folder: Omit<ChatFolder, 'id'>) => string;
  updateFolder: (id: string, patch: Omit<ChatFolder, 'id' | 'isSystem'>) => void;
  deleteFolder: (id: string) => void;
  reorderFolders: (ownerId: string, orderedIds: string[]) => void;
  toggleConversationInFolder: (folderId: string, conversationId: string) => void;
}

const STORAGE_KEY = 'eternal-chat-folders';
const SYSTEM_STORAGE_KEY = 'eternal-system-chat-folders';
const ORDER_STORAGE_KEY = 'eternal-chat-folder-orders';

function loadFolders() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ChatFolder[];
    return raw.filter((f) => f.filterType !== 'WORK' && f.name.toLowerCase() !== 'work');
  } catch {
    return [];
  }
}

function saveFolders(folders: ChatFolder[]) {
  if (typeof window === 'undefined') return;
  const filtered = folders.filter(
    (f) => f.filterType !== 'WORK' && f.name.toLowerCase() !== 'work',
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export const systemChatFolders: ChatFolder[] = [
  {
    id: 'all',
    name: 'All Chats',
    icon: 'MessageSquare',
    emoji: null,
    color: '#8b5cf6',
    filterType: 'ALL',
    includeIds: [],
    excludeIds: [],
    isSystem: true,
  },
  {
    id: 'personal',
    name: 'Personal',
    icon: 'User',
    emoji: null,
    color: '#3b82f6',
    filterType: 'PERSONAL',
    includeIds: [],
    excludeIds: [],
    isSystem: true,
  },
  {
    id: 'groups',
    name: 'Groups',
    icon: 'Users',
    emoji: null,
    color: '#f59e0b',
    filterType: 'GROUPS',
    includeIds: [],
    excludeIds: [],
    isSystem: true,
  },
  {
    id: 'unread',
    name: 'Unread',
    icon: 'BellRing',
    emoji: null,
    color: '#ec4899',
    filterType: 'UNREAD',
    includeIds: [],
    excludeIds: [],
    isSystem: true,
  },
];

function loadSystemFolders() {
  if (typeof window === 'undefined') return systemChatFolders;
  try {
    const saved = JSON.parse(localStorage.getItem(SYSTEM_STORAGE_KEY) ?? '[]') as ChatFolder[];
    return systemChatFolders.map((folder) => {
      const override = saved.find(
        (item) => item.id === folder.id || item.filterType === folder.filterType,
      );
      return override ? { ...folder, ...override, emoji: null, isSystem: true } : folder;
    });
  } catch {
    return systemChatFolders;
  }
}

function saveSystemFolders(folders: ChatFolder[]) {
  if (typeof window === 'undefined') return;
  const filtered = folders
    .filter((f) => f.filterType !== 'WORK' && f.name.toLowerCase() !== 'work')
    .map((f) => (f.isSystem ? { ...f, emoji: null } : f));
  localStorage.setItem(SYSTEM_STORAGE_KEY, JSON.stringify(filtered));
}

function loadFolderOrders() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) ?? '{}') as Record<string, string[]>;
  } catch {
    return {};
  }
}

function saveFolderOrders(folderOrders: Record<string, string[]>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(folderOrders));
}

export const useChatFoldersStore = create<ChatFoldersState>((set) => ({
  systemFolders: loadSystemFolders(),
  folders: loadFolders(),
  folderOrders: loadFolderOrders(),
  syncWithServer: async () => {
    try {
      const serverFolders = await chatApi.getFolders();
      if (!serverFolders || serverFolders.length === 0) return;

      const system: ChatFolder[] = [];
      const custom: ChatFolder[] = [];

      for (const sf of serverFolders) {
        if (sf.filterType === 'WORK' || sf.name.toLowerCase() === 'work') {
          continue;
        }

        const isSystemFolder = sf.filterType !== 'CUSTOM';
        const item: ChatFolder = {
          id: sf.id,
          name: sf.name,
          icon: sf.icon,
          emoji: isSystemFolder ? null : sf.emoji,
          color: sf.color,
          includeIds: sf.includeIds,
          excludeIds: sf.excludeIds,
          filterType: sf.filterType,
          order: sf.order,
          isSystem: isSystemFolder,
        };

        if (
          sf.filterType === 'ALL' ||
          sf.filterType === 'UNREAD' ||
          sf.filterType === 'GROUPS' ||
          sf.filterType === 'PERSONAL'
        ) {
          system.push(item);
        } else {
          custom.push(item);
        }
      }

      set({
        systemFolders: system.length > 0 ? system : loadSystemFolders(),
        folders: custom,
      });
      saveFolders(custom);
    } catch {
      // Offline fallback already loaded from localStorage
    }
  },
  addFolder: (folder) => {
    const tempId = `folder-${Date.now()}`;
    set((state) => {
      const folders = [{ ...folder, id: tempId }, ...state.folders];
      saveFolders(folders);
      return { folders };
    });

    chatApi
      .createFolder({
        name: folder.name,
        icon: folder.icon ?? undefined,
        emoji: folder.emoji ?? undefined,
        color: folder.color,
        includeIds: folder.includeIds,
        excludeIds: folder.excludeIds,
      })
      .then((created) => {
        set((state) => {
          const folders = state.folders.map((f) =>
            f.id === tempId ? { ...f, id: created.id } : f,
          );
          saveFolders(folders);
          return { folders };
        });
      })
      .catch(() => {});

    return tempId;
  },
  updateFolder: (id, patch) => {
    set((state) => {
      if (state.systemFolders.some((folder) => folder.id === id)) {
        const systemFolders = state.systemFolders.map((folder) =>
          folder.id === id ? { ...folder, ...patch, isSystem: true } : folder,
        );
        saveSystemFolders(systemFolders);
        return { systemFolders };
      }

      const folders = state.folders.map((folder) =>
        folder.id === id ? { ...folder, ...patch } : folder,
      );
      saveFolders(folders);
      return { folders };
    });

    if (!id.startsWith('folder-')) {
      chatApi
        .updateFolder(id, {
          name: patch.name,
          icon: patch.icon ?? undefined,
          emoji: patch.emoji ?? undefined,
          color: patch.color,
          includeIds: patch.includeIds,
          excludeIds: patch.excludeIds,
        })
        .catch(() => {});
    }
  },
  deleteFolder: (id) => {
    set((state) => {
      if (state.systemFolders.some((folder) => folder.id === id)) return state;
      const folders = state.folders.filter((folder) => folder.id !== id);
      const folderOrders = Object.fromEntries(
        Object.entries(state.folderOrders).map(([ownerId, orderedIds]) => [
          ownerId,
          orderedIds.filter((folderId) => folderId !== id),
        ]),
      );
      saveFolders(folders);
      saveFolderOrders(folderOrders);
      return { folders, folderOrders };
    });

    if (!id.startsWith('folder-')) {
      chatApi.deleteFolder(id).catch(() => {});
    }
  },
  reorderFolders: (ownerId, orderedIds) => {
    set((state) => {
      const folderOrders = { ...state.folderOrders, [ownerId]: orderedIds };
      saveFolderOrders(folderOrders);
      return { folderOrders };
    });

    const validUuids = orderedIds.filter((id) => !id.startsWith('folder-') && id.length > 20);
    if (validUuids.length > 0) {
      chatApi.reorderFolders(validUuids).catch(() => {});
    }
  },
  toggleConversationInFolder: (folderId, conversationId) =>
    set((state) => {
      const targetFolder = state.folders.find((f) => f.id === folderId);
      if (!targetFolder) return state;
      const isIncluded = targetFolder.includeIds.includes(conversationId);
      const nextIncludeIds = isIncluded
        ? targetFolder.includeIds.filter((id) => id !== conversationId)
        : [...targetFolder.includeIds, conversationId];
      const folders = state.folders.map((f) =>
        f.id === folderId ? { ...f, includeIds: nextIncludeIds } : f,
      );
      saveFolders(folders);
      return { folders };
    }),
}));

/**
 * RESET_STORES: folder cache is manual-localStorage WITHOUT a user
 * namespace (server rows ARE per-user). Wipe both RAM + keys on
 * logout/switch — `syncWithServer` repopulates for the next account.
 * NOTE (server/client boundary): TanStack Query `useChatFolders` owns the
 * server truth; this store is the offline-capable UI mirror. Prefer the
 * TQ hooks for new code.
 */
registerSessionResetHandler(() => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SYSTEM_STORAGE_KEY);
    localStorage.removeItem(ORDER_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
  useChatFoldersStore.setState({
    systemFolders: [...systemChatFolders],
    folders: [],
    folderOrders: {},
  });
});
