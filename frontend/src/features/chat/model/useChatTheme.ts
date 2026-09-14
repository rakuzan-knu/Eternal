import { useEffect, useState, useRef, useCallback } from 'react';
import { ChatThemeConfig, DEFAULT_DARK_THEME_CONFIG } from './chatTheme';
import { parseChatTheme, serializeChatTheme, dispatchThemeSync } from '../lib/themeUtils';
import { idbGet, idbSet, idbDelete } from '../../../shared/lib/indexedDbStorage';
import { chatApi } from '../api/chatApi';
import { queryClient } from '@/shared/api/queryClient';
import { CONVERSATIONS_KEY } from '@/shared/api/queryKeys';
import type { ConversationView } from '../../../entities/chat/model/types';

const LOCAL_CHAT_PREFIX = 'eternal_chat_theme_';
const LOCAL_GLOBAL_KEY = 'eternal_chat_theme_global';

export function useChatTheme(
  conversationId?: string,
  serverTheme?: string,
  sharedTheme?: string | null,
) {
  const [theme, setThemeState] = useState<ChatThemeConfig>(() => {
    return parseChatTheme(sharedTheme || serverTheme);
  });
  const [isLoading, setIsLoading] = useState(true);
  const activeBlobUrlRef = useRef<string | null>(null);

  // Load and resolve theme with 5-tier priority hierarchy
  const resolveAndApplyTheme = useCallback(async () => {
    try {
      // 1. Local override for this specific chat (IndexedDB first, then localStorage)
      if (conversationId) {
        const localChatIdb = await idbGet<ChatThemeConfig | string>(
          `${LOCAL_CHAT_PREFIX}${conversationId}`,
        );
        if (localChatIdb) {
          const parsed = parseChatTheme(localChatIdb);
          setThemeState(parsed);
          setIsLoading(false);
          return;
        }

        const localChatLs = localStorage.getItem(`${LOCAL_CHAT_PREFIX}${conversationId}`);
        if (localChatLs) {
          const parsed = parseChatTheme(localChatLs);
          setThemeState(parsed);
          setIsLoading(false);
          return;
        }
      }

      // 2. Local global theme override (IndexedDB first, then localStorage)
      const localGlobalIdb = await idbGet<ChatThemeConfig | string>(LOCAL_GLOBAL_KEY);
      if (localGlobalIdb) {
        const parsed = parseChatTheme(localGlobalIdb);
        setThemeState(parsed);
        setIsLoading(false);
        return;
      }

      const localGlobalLs = localStorage.getItem(LOCAL_GLOBAL_KEY);
      if (localGlobalLs) {
        const parsed = parseChatTheme(localGlobalLs);
        setThemeState(parsed);
        setIsLoading(false);
        return;
      }

      // 3. Shared Conversation Theme (agreed between both participants)
      if (sharedTheme && sharedTheme !== 'default') {
        const parsed = parseChatTheme(sharedTheme);
        setThemeState(parsed);
        setIsLoading(false);
        return;
      }

      // 4. Server theme (conversation participant theme or User.defaultChatTheme)
      if (serverTheme && serverTheme !== 'default') {
        const parsed = parseChatTheme(serverTheme);
        setThemeState(parsed);
        setIsLoading(false);
        return;
      }

      // 5. Default Dark Eternal theme
      setThemeState(DEFAULT_DARK_THEME_CONFIG);
    } catch (err) {
      console.warn('[useChatTheme] Error resolving theme:', err);
      setThemeState(DEFAULT_DARK_THEME_CONFIG);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, serverTheme, sharedTheme]);

  useEffect(() => {
    resolveAndApplyTheme();
  }, [resolveAndApplyTheme]);

  // Track and cleanup Blob URLs to prevent memory leaks (RAM growth)
  useEffect(() => {
    const currentImageUrl = theme.bgImageUrl;

    if (
      activeBlobUrlRef.current &&
      activeBlobUrlRef.current.startsWith('blob:') &&
      activeBlobUrlRef.current !== currentImageUrl
    ) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
    }

    if (currentImageUrl && currentImageUrl.startsWith('blob:')) {
      activeBlobUrlRef.current = currentImageUrl;
    } else {
      activeBlobUrlRef.current = null;
    }

    return () => {
      if (activeBlobUrlRef.current && activeBlobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
    };
  }, [theme.bgImageUrl]);

  // Multi-Tab & Window Reactive Synchronization (BroadcastChannel + CustomEvents)
  useEffect(() => {
    const handleSync = (payload: {
      type?: string;
      conversationId?: string;
      theme?: ChatThemeConfig;
    }) => {
      if (
        !payload.conversationId ||
        payload.conversationId === conversationId ||
        payload.conversationId === 'global'
      ) {
        if (payload.theme) {
          setThemeState(payload.theme);
          setIsLoading(false);
          return;
        }
        resolveAndApplyTheme();
      }
    };

    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('eternal_theme_sync');
        channel.onmessage = (event) => handleSync(event.data);
      } catch {
        // Ignore
      }
    }

    const onCustomEvent = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) handleSync(custom.detail);
    };
    window.addEventListener('eternal_theme_updated', onCustomEvent);

    return () => {
      if (channel) {
        channel.close();
      }
      window.removeEventListener('eternal_theme_updated', onCustomEvent);
    };
  }, [conversationId, resolveAndApplyTheme]);

  // Apply new theme (with options for syncDevices and applyToAll)
  const applyTheme = useCallback(
    async (
      newConfig: ChatThemeConfig,
      options: { applyToAll?: boolean; syncDevices?: boolean } = {
        applyToAll: false,
        syncDevices: true,
      },
    ) => {
      const { applyToAll = false, syncDevices = true } = options;

      setThemeState(newConfig);

      // 1. Always persist to local device storage (IndexedDB + localStorage) for instant zero-latency caching
      if (applyToAll) {
        await idbSet(LOCAL_GLOBAL_KEY, newConfig);
        try {
          localStorage.setItem(LOCAL_GLOBAL_KEY, JSON.stringify(newConfig));
        } catch {
          // Handled safely by IndexedDB
        }
      } else if (conversationId) {
        await idbSet(`${LOCAL_CHAT_PREFIX}${conversationId}`, newConfig);
        try {
          localStorage.setItem(`${LOCAL_CHAT_PREFIX}${conversationId}`, JSON.stringify(newConfig));
        } catch {
          // Handled safely by IndexedDB
        }
      }

      // 2. If syncDevices is enabled, persist to backend database
      if (syncDevices && conversationId) {
        try {
          const serialized = serializeChatTheme(newConfig);
          await chatApi.setTheme(conversationId, serialized, applyToAll);
        } catch (err) {
          console.warn('[useChatTheme] Failed to sync theme to backend:', err);
        }
      }

      // 3. Update React Query conversations cache so conversation.myTheme stays in sync
      try {
        const serialized = serializeChatTheme(newConfig);
        queryClient.setQueryData<ConversationView[]>([CONVERSATIONS_KEY], (old) => {
          if (!old) return old;
          return old.map((conv) => {
            if (applyToAll || conv.id === conversationId) {
              return { ...conv, myTheme: serialized };
            }
            return conv;
          });
        });
        queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
      } catch {
        // Safe fallback
      }

      // 4. Notify other open tabs & windows (and active chat thread)
      dispatchThemeSync(applyToAll ? 'global' : conversationId || 'global', newConfig);
    },
    [conversationId],
  );

  // Revert/Reset theme to default
  const revertTheme = useCallback(
    async (options: { applyToAll?: boolean; syncDevices?: boolean } = {}) => {
      const { applyToAll = false, syncDevices = true } = options;

      // 1. Remove local storage overrides
      if (conversationId) {
        await idbDelete(`${LOCAL_CHAT_PREFIX}${conversationId}`);
        localStorage.removeItem(`${LOCAL_CHAT_PREFIX}${conversationId}`);
      }
      if (applyToAll) {
        await idbDelete(LOCAL_GLOBAL_KEY);
        localStorage.removeItem(LOCAL_GLOBAL_KEY);
      } else if (conversationId) {
        // Explicitly set default config for this conversation so it doesn't fall back to a leftover global theme
        await idbSet(`${LOCAL_CHAT_PREFIX}${conversationId}`, DEFAULT_DARK_THEME_CONFIG);
        try {
          localStorage.setItem(
            `${LOCAL_CHAT_PREFIX}${conversationId}`,
            JSON.stringify(DEFAULT_DARK_THEME_CONFIG),
          );
        } catch {
          // Handled safely by IndexedDB
        }
      }

      // 2. Unlink shared theme if any
      if (conversationId) {
        try {
          await chatApi.unlinkSharedTheme(conversationId);
        } catch {
          // Safe if no shared theme
        }
      }

      // 3. Reset on backend if synced
      if (syncDevices && conversationId) {
        try {
          await chatApi.setTheme(conversationId, 'default', applyToAll);
        } catch (err) {
          console.warn('[useChatTheme] Failed to reset theme on backend:', err);
        }
      }

      // 4. Update React Query conversations cache
      try {
        queryClient.setQueryData<ConversationView[]>([CONVERSATIONS_KEY], (old) => {
          if (!old) return old;
          return old.map((conv) => {
            if (applyToAll || conv.id === conversationId) {
              return { ...conv, myTheme: 'default', sharedTheme: null };
            }
            return conv;
          });
        });
        queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
      } catch {
        // Safe fallback
      }

      setThemeState(DEFAULT_DARK_THEME_CONFIG);
      dispatchThemeSync(
        applyToAll ? 'global' : conversationId || 'global',
        DEFAULT_DARK_THEME_CONFIG,
      );
    },
    [conversationId],
  );

  return {
    theme,
    isLoading,
    applyTheme,
    revertTheme,
  };
}
