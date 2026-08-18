import { create } from 'zustand';

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
}

interface ChatFoldersState {
  systemFolders: ChatFolder[];
  folders: ChatFolder[];
  folderOrders: Record<string, string[]>;
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
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ChatFolder[];
  } catch {
    return [];
  }
}

function saveFolders(folders: ChatFolder[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
}

export const systemChatFolders: ChatFolder[] = [
  {
    id: 'all',
    name: 'All',
    icon: null,
    emoji: null,
    color: '#8b5cf6',
    includeIds: [],
    excludeIds: [],
    isSystem: true,
  },
  {
    id: 'unread',
    name: 'Unread',
    icon: null,
    emoji: null,
    color: '#60a5fa',
    includeIds: [],
    excludeIds: [],
    isSystem: true,
  },
  {
    id: 'groups',
    name: 'Groups',
    icon: null,
    emoji: null,
    color: '#22c55e',
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
      const override = saved.find((item) => item.id === folder.id);
      return override ? { ...folder, ...override, isSystem: true } : folder;
    });
  } catch {
    return systemChatFolders;
  }
}

function saveSystemFolders(folders: ChatFolder[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SYSTEM_STORAGE_KEY, JSON.stringify(folders));
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
  addFolder: (folder) => {
    const id = `folder-${Date.now()}`;
    set((state) => {
      const folders = [{ ...folder, id }, ...state.folders];
      saveFolders(folders);
      return { folders };
    });
    return id;
  },
  updateFolder: (id, patch) =>
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
    }),
  deleteFolder: (id) =>
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
    }),
  reorderFolders: (ownerId, orderedIds) =>
    set((state) => {
      const folderOrders = { ...state.folderOrders, [ownerId]: orderedIds };
      saveFolderOrders(folderOrders);
      return { folderOrders };
    }),
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
