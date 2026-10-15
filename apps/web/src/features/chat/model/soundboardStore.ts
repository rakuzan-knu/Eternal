import { create } from 'zustand';
import {
  GLOBAL_SOUNDBOARD_CATALOG,
  CatalogSoundItem,
  globalSoundboardEngine,
} from '../lib/webrtc/soundboardEngine';
import { soundboardApi } from '../api/soundboardApi';
import { getSocket } from '@/shared/api/socket';

export type SoundScope = 'global' | 'my' | 'chat';

export interface SoundboardItem {
  id: string;
  name: string;
  emoji: string;
  category?: string;
  scope: SoundScope;
  conversationId?: string;
  durationMs: number;
  audioData?: string; // Base64 data URL
  audioUrl?: string; // Public CDN URL
  authorId?: string;
  authorName?: string;
  createdAt?: number;
}

interface SoundboardState {
  mySounds: SoundboardItem[];
  chatSounds: Record<string, SoundboardItem[]>; // conversationId -> items
  favorites: string[]; // Sound IDs
  recent: string[]; // Sound IDs
  soundboardVolume: number; // 0.0 to 1.5
  isSoundboardMuted: boolean;
  isLoadingMySounds: boolean;
  isLoadingChatSounds: Record<string, boolean>;

  // Actions
  fetchMySounds: () => Promise<void>;
  fetchChatSounds: (conversationId: string) => Promise<void>;
  addMySound: (item: Omit<SoundboardItem, 'id' | 'scope' | 'createdAt'>) => Promise<SoundboardItem>;
  removeMySound: (id: string) => Promise<void>;
  addChatSound: (
    conversationId: string,
    item: Omit<SoundboardItem, 'id' | 'scope' | 'conversationId' | 'createdAt'>,
  ) => Promise<SoundboardItem>;
  removeChatSound: (conversationId: string, id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  recordRecent: (id: string) => void;
  setSoundboardVolume: (volume: number) => void;
  toggleSoundboardMute: () => void;
  setSoundboardMuted: (muted: boolean) => void;
  initSocketListeners: () => () => void;
}

const STORAGE_KEYS = {
  MY_SOUNDS: 'app_soundboard_my_sounds_v1',
  CHAT_SOUNDS: 'app_soundboard_chat_sounds_v1',
  FAVORITES: 'app_soundboard_favorites_v1',
  RECENT: 'app_soundboard_recent_v1',
  VOLUME: 'app_soundboard_volume_v1',
  MUTED: 'app_soundboard_muted_v1',
};

function safeLoadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSaveJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota / incognito errors
  }
}

export const useSoundboardStore = create<SoundboardState>((set, get) => ({
  mySounds: safeLoadJson<SoundboardItem[]>(STORAGE_KEYS.MY_SOUNDS, []),
  chatSounds: safeLoadJson<Record<string, SoundboardItem[]>>(STORAGE_KEYS.CHAT_SOUNDS, {}),
  favorites: safeLoadJson<string[]>(STORAGE_KEYS.FAVORITES, ['quack', 'golfclap', 'sadhorn']),
  recent: safeLoadJson<string[]>(STORAGE_KEYS.RECENT, []),
  soundboardVolume: safeLoadJson<number>(STORAGE_KEYS.VOLUME, 1.0),
  isSoundboardMuted: safeLoadJson<boolean>(STORAGE_KEYS.MUTED, false),
  isLoadingMySounds: false,
  isLoadingChatSounds: {},

  fetchMySounds: async () => {
    try {
      set({ isLoadingMySounds: true });
      const serverSounds = await soundboardApi.getMySounds();
      if (Array.isArray(serverSounds)) {
        const mapped: SoundboardItem[] = serverSounds.map((s) => ({
          id: s.id,
          name: s.name,
          emoji: s.emoji,
          scope: 'my',
          durationMs: s.durationMs,
          audioData: s.audioData || s.audioUrl,
          audioUrl: s.audioUrl,
          authorName: s.authorName,
          createdAt: s.createdAt,
        }));
        set({ mySounds: mapped });
        safeSaveJson(STORAGE_KEYS.MY_SOUNDS, mapped);
      }
    } catch (err) {
      // Fallback gracefully to existing cached sounds in localStorage
      console.warn('[SoundboardStore] Could not fetch mySounds from server:', err);
    } finally {
      set({ isLoadingMySounds: false });
    }
  },

  fetchChatSounds: async (conversationId: string) => {
    if (!conversationId) return;
    try {
      set((s) => ({
        isLoadingChatSounds: { ...s.isLoadingChatSounds, [conversationId]: true },
      }));
      const serverSounds = await soundboardApi.getChatSounds(conversationId);
      if (Array.isArray(serverSounds)) {
        const mapped: SoundboardItem[] = serverSounds.map((s) => ({
          id: s.id,
          name: s.name,
          emoji: s.emoji,
          scope: 'chat',
          conversationId,
          durationMs: s.durationMs,
          audioData: s.audioData || s.audioUrl,
          audioUrl: s.audioUrl,
          authorName: s.authorName,
          createdAt: s.createdAt,
        }));
        set((s) => {
          const nextChatSounds = { ...s.chatSounds, [conversationId]: mapped };
          safeSaveJson(STORAGE_KEYS.CHAT_SOUNDS, nextChatSounds);
          return { chatSounds: nextChatSounds };
        });
      }
    } catch (err) {
      console.warn('[SoundboardStore] Could not fetch chatSounds from server:', err);
    } finally {
      set((s) => ({
        isLoadingChatSounds: { ...s.isLoadingChatSounds, [conversationId]: false },
      }));
    }
  },

  addMySound: async (item) => {
    const tempId = `my_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newItem: SoundboardItem = {
      ...item,
      id: tempId,
      scope: 'my',
      createdAt: Date.now(),
    };

    // Optimistic local update
    set((state) => {
      const next = [newItem, ...state.mySounds];
      safeSaveJson(STORAGE_KEYS.MY_SOUNDS, next);
      return { mySounds: next };
    });

    try {
      const serverItem = await soundboardApi.createMySound({
        name: item.name,
        emoji: item.emoji,
        durationMs: item.durationMs,
        audioData: item.audioData,
      });

      if (serverItem && serverItem.id) {
        const finalItem: SoundboardItem = {
          ...newItem,
          id: serverItem.id,
          audioData: serverItem.audioData || serverItem.audioUrl || item.audioData,
          authorName: serverItem.authorName,
        };
        set((state) => {
          const next = state.mySounds.map((s) => (s.id === tempId ? finalItem : s));
          safeSaveJson(STORAGE_KEYS.MY_SOUNDS, next);
          return { mySounds: next };
        });
        return finalItem;
      }
    } catch (err) {
      console.warn('[SoundboardStore] Error saving sound to server account:', err);
    }

    return newItem;
  },

  removeMySound: async (id: string) => {
    // Optimistic local deletion
    set((state) => {
      const next = state.mySounds.filter((s) => s.id !== id);
      safeSaveJson(STORAGE_KEYS.MY_SOUNDS, next);
      return { mySounds: next };
    });

    try {
      await soundboardApi.deleteMySound(id);
    } catch (err) {
      console.warn('[SoundboardStore] Error deleting sound from server account:', err);
    }
  },

  addChatSound: async (conversationId: string, item) => {
    const tempId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newItem: SoundboardItem = {
      ...item,
      id: tempId,
      scope: 'chat',
      conversationId,
      createdAt: Date.now(),
    };

    // Optimistic local update
    set((state) => {
      const existing = state.chatSounds[conversationId] || [];
      const updated = [newItem, ...existing];
      const nextChatSounds = { ...state.chatSounds, [conversationId]: updated };
      safeSaveJson(STORAGE_KEYS.CHAT_SOUNDS, nextChatSounds);
      return { chatSounds: nextChatSounds };
    });

    try {
      const serverItem = await soundboardApi.createChatSound(conversationId, {
        name: item.name,
        emoji: item.emoji,
        durationMs: item.durationMs,
        audioData: item.audioData,
      });

      if (serverItem && serverItem.id) {
        const finalItem: SoundboardItem = {
          ...newItem,
          id: serverItem.id,
          audioData: serverItem.audioData || serverItem.audioUrl || item.audioData,
          authorName: serverItem.authorName,
        };
        set((state) => {
          const existing = state.chatSounds[conversationId] || [];
          const updated = existing.map((s) => (s.id === tempId ? finalItem : s));
          const nextChatSounds = { ...state.chatSounds, [conversationId]: updated };
          safeSaveJson(STORAGE_KEYS.CHAT_SOUNDS, nextChatSounds);
          return { chatSounds: nextChatSounds };
        });
        return finalItem;
      }
    } catch (err) {
      console.warn('[SoundboardStore] Error saving chat sound to server:', err);
    }

    return newItem;
  },

  removeChatSound: async (conversationId: string, id: string) => {
    // Optimistic local deletion
    set((state) => {
      const existing = state.chatSounds[conversationId] || [];
      const updated = existing.filter((s) => s.id !== id);
      const nextChatSounds = { ...state.chatSounds, [conversationId]: updated };
      safeSaveJson(STORAGE_KEYS.CHAT_SOUNDS, nextChatSounds);
      return { chatSounds: nextChatSounds };
    });

    try {
      await soundboardApi.deleteChatSound(conversationId, id);
    } catch (err) {
      console.warn('[SoundboardStore] Error deleting chat sound from server:', err);
    }
  },

  toggleFavorite: (id) => {
    set((state) => {
      const exists = state.favorites.includes(id);
      const next = exists ? state.favorites.filter((f) => f !== id) : [...state.favorites, id];
      safeSaveJson(STORAGE_KEYS.FAVORITES, next);
      return { favorites: next };
    });
  },

  isFavorite: (id) => {
    return get().favorites.includes(id);
  },

  recordRecent: (id) => {
    set((state) => {
      const filtered = state.recent.filter((r) => r !== id);
      const next = [id, ...filtered].slice(0, 16);
      safeSaveJson(STORAGE_KEYS.RECENT, next);
      return { recent: next };
    });
  },

  setSoundboardVolume: (volume) => {
    const clamped = Math.max(0, Math.min(1.5, volume));
    globalSoundboardEngine.setMasterVolume(clamped);
    safeSaveJson(STORAGE_KEYS.VOLUME, clamped);
    set({ soundboardVolume: clamped });
  },

  toggleSoundboardMute: () => {
    set((state) => {
      const nextMuted = !state.isSoundboardMuted;
      globalSoundboardEngine.setMuted(nextMuted);
      safeSaveJson(STORAGE_KEYS.MUTED, nextMuted);
      return { isSoundboardMuted: nextMuted };
    });
  },

  setSoundboardMuted: (muted) => {
    globalSoundboardEngine.setMuted(muted);
    safeSaveJson(STORAGE_KEYS.MUTED, muted);
    set({ isSoundboardMuted: muted });
  },

  initSocketListeners: () => {
    const socket = getSocket();

    const handleChatSoundAdded = (item: any) => {
      if (!item || !item.conversationId || !item.id) return;
      set((state) => {
        const existing = state.chatSounds[item.conversationId] || [];
        if (existing.some((s) => s.id === item.id)) return state;
        const mappedItem: SoundboardItem = {
          id: item.id,
          name: item.name,
          emoji: item.emoji,
          scope: 'chat',
          conversationId: item.conversationId,
          durationMs: item.durationMs,
          audioData: item.audioData || item.audioUrl,
          audioUrl: item.audioUrl,
          authorName: item.authorName,
          createdAt: item.createdAt || Date.now(),
        };
        const next = [mappedItem, ...existing];
        const nextChatSounds = { ...state.chatSounds, [item.conversationId]: next };
        safeSaveJson(STORAGE_KEYS.CHAT_SOUNDS, nextChatSounds);
        return { chatSounds: nextChatSounds };
      });
    };

    const handleChatSoundDeleted = (payload: { conversationId?: string; id?: string }) => {
      if (!payload?.conversationId || !payload?.id) return;
      set((state) => {
        const existing = state.chatSounds[payload.conversationId!] || [];
        const next = existing.filter((s) => s.id !== payload.id);
        const nextChatSounds = { ...state.chatSounds, [payload.conversationId!]: next };
        safeSaveJson(STORAGE_KEYS.CHAT_SOUNDS, nextChatSounds);
        return { chatSounds: nextChatSounds };
      });
    };

    socket.on('soundboard:chat_added', handleChatSoundAdded);
    socket.on('soundboard:chat_deleted', handleChatSoundDeleted);

    return () => {
      socket.off('soundboard:chat_added', handleChatSoundAdded);
      socket.off('soundboard:chat_deleted', handleChatSoundDeleted);
    };
  },
}));
