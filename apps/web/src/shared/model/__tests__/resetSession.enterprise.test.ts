import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetSessionStores,
  getSessionResetHandlerCount,
  registerSessionResetHandler,
} from '../resetSession';
import { usePresenceStore } from '../usePresenceStore';
import { useMessageToastStore } from '../useMessageToastStore';
import { useHiddenPostsStore } from '../useHiddenPostsStore';
import { useUIStore } from '../useUIStore';
import { useAccountsStore } from '../useAccountsStore';
import { useActiveMediaPlaybackStore } from '../useActiveMediaPlaybackStore';
import { useTypingStore } from '@/features/chat/model/useTypingStore';
import { useChatDraftsStore } from '@/features/chat/model/useChatDraftsStore';
import { useChatPollVotesStore } from '@/features/chat/model/useChatPollVotesStore';
import { useClearHistoryUndoStore } from '@/features/chat/model/useClearHistoryUndoStore';
import { useChatFoldersStore, systemChatFolders } from '@/features/chat/model/useChatFoldersStore';
import { useArchivePasswordStore } from '@/features/chat/model/useArchivePasswordStore';
import { useCallStore } from '@/features/chat/model/callStore';
import { useNotificationStore } from '@/entities/notification/model/useNotificationStore';
import { useNotificationSettingsStore } from '@/entities/notification/model/useNotificationSettingsStore';
import { useStoryEditorStore } from '@/features/stories/model/useStoryEditorStore';
import { useStoryViewerStore } from '@/entities/story/model/useStoryViewerStore';
import { useMediaDetailModalStore } from '@/entities/showcase/model/useMediaDetailModalStore';
import { useHiddenUndoStore } from '@/features/posts/model/useHiddenUndoStore';
import { useJamStore } from '@/features/music/model/useJamStore';
import { useSpotifyPlayerStore } from '../useSpotifyPlayerStore';

describe('resetSessionStores (RESET_STORES enterprise)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('registers a handler per session-scoped slice', () => {
    // Every imported session store above self-registers on module load.
    expect(getSessionResetHandlerCount()).toBeGreaterThanOrEqual(15);
  });

  it('supports subscribe/unsubscribe of custom handlers', () => {
    let calls = 0;
    const off = registerSessionResetHandler(() => {
      calls += 1;
    });
    resetSessionStores();
    expect(calls).toBe(1);
    off();
    resetSessionStores();
    expect(calls).toBe(1);
  });

  it('wipes core shared stores completely (incl. full UI state)', () => {
    usePresenceStore.setState({ onlineUserIds: new Set(['u1']) });
    useMessageToastStore.getState().addToast({
      id: 't1',
      conversationId: 'c1',
      messageId: 'm1',
      title: 't',
      body: 'b',
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
    useHiddenPostsStore.setState({ hiddenIds: new Set(['p1']) });
    useUIStore.setState({
      isSidebarExpanded: true,
      isChatListExpanded: false,
      isEditProfileOpen: true,
      editProfileInitialTab: 'privacy',
      isCommentModalOpen: true,
      isShareModalOpen: true,
      activeConversationId: 'conv-1',
    });

    resetSessionStores();

    expect(usePresenceStore.getState().onlineUserIds.size).toBe(0);
    expect(usePresenceStore.getState().userActivities).toEqual({});
    expect(useMessageToastStore.getState().toasts).toEqual([]);
    expect(useHiddenPostsStore.getState().hiddenIds.size).toBe(0);
    const ui = useUIStore.getState();
    expect(ui.isSidebarExpanded).toBe(false);
    expect(ui.isChatListExpanded).toBe(true);
    expect(ui.isEditProfileOpen).toBe(false);
    expect(ui.editProfileInitialTab).toBe('account');
    expect(ui.isCommentModalOpen).toBe(false);
    expect(ui.isShareModalOpen).toBe(false);
    expect(ui.activeConversationId).toBeNull();
  });

  it('clears chat session slices (typing, drafts, votes, undo, folders)', () => {
    useTypingStore.getState().setTypist('conv-1', 'u1', true);
    useChatDraftsStore.getState().setDraft('conv-1', 'unsent text');
    useChatPollVotesStore.getState().setVote('msg-1', 'opt-a');
    useHiddenUndoStore.getState().showUndo('post-1');
    useClearHistoryUndoStore.setState({ activeUndo: null });

    resetSessionStores();

    expect(useTypingStore.getState().typingByConversation).toEqual({});
    expect(useChatDraftsStore.getState().drafts).toEqual({});
    expect(useChatPollVotesStore.getState().votes).toEqual({});
    expect(useHiddenUndoStore.getState().activeUndo).toBeNull();
    expect(useChatFoldersStore.getState().folders).toEqual([]);
    expect(useChatFoldersStore.getState().systemFolders).toEqual(systemChatFolders);
  });

  it('clears notification mirrors back to defaults', () => {
    useNotificationStore.getState().setUnreadCounts({ total: 5, likes: 5 });
    useNotificationStore.getState().setActiveFilter('likes');
    useNotificationSettingsStore.setState({ mutedActorIds: ['x'], dndUntil: '2030-01-01' });

    resetSessionStores();

    expect(useNotificationStore.getState().unreadCounts.total).toBe(0);
    expect(useNotificationStore.getState().activeFilter).toBe('all');
    expect(useNotificationSettingsStore.getState().mutedActorIds).toEqual([]);
    expect(useNotificationSettingsStore.getState().dndUntil).toBeNull();
  });

  it('closes viewers/editors/modals and drops their payloads', () => {
    useStoryEditorStore.getState().openEditor();
    useMediaDetailModalStore
      .getState()
      .openMediaDetail({ type: 'MOVIE', title: 't', posterUrl: 'u' } as never);
    useStoryViewerStore.setState({ isOpen: true, groups: [{ id: 'g' }] as never });

    resetSessionStores();

    expect(useStoryEditorStore.getState().isOpen).toBe(false);
    expect(useMediaDetailModalStore.getState().isOpen).toBe(false);
    expect(useMediaDetailModalStore.getState().activeItem).toBeNull();
    expect(useStoryViewerStore.getState().isOpen).toBe(false);
    expect(useStoryViewerStore.getState().groups).toEqual([]);
  });

  it('ends calls, leaves jam, stops media, locks archive gate', () => {
    useCallStore.setState({ callStatus: 'calling', callId: 'call-1' });
    useJamStore.setState({ roomId: 'room-1', isJamActive: true });
    useActiveMediaPlaybackStore.setState({ activeMediaId: 'm1', isPlaying: true });
    useSpotifyPlayerStore.setState({
      currentTrack: { id: 't1' } as never,
      isPlaying: true,
      queue: [{ id: 't2' }] as never,
    });

    resetSessionStores();

    expect(useCallStore.getState().callStatus).toBe('idle');
    expect(useCallStore.getState().callId).toBeNull();
    expect(useJamStore.getState().roomId).toBeNull();
    expect(useJamStore.getState().isJamActive).toBe(false);
    expect(useActiveMediaPlaybackStore.getState().activeMediaId).toBeNull();
    expect(useActiveMediaPlaybackStore.getState().isPlaying).toBe(false);
    expect(useSpotifyPlayerStore.getState().currentTrack).toBeNull();
    expect(useSpotifyPlayerStore.getState().queue).toEqual([]);
    // Spotify device prefs survive.
    expect(useSpotifyPlayerStore.getState().volume).toBeGreaterThan(0);
    expect(useArchivePasswordStore.getState().passwordHash).toBeNull();
  });

  it('drops the active account pointer but keeps the saved list', () => {
    useAccountsStore.setState({
      accounts: [{ id: 'a1', username: 'alice', accessToken: 'x', refreshToken: 'y' }],
      activeAccountId: 'a1',
    });

    resetSessionStores();

    expect(useAccountsStore.getState().accounts).toHaveLength(1);
    expect(useAccountsStore.getState().activeAccountId).toBeNull();
  });
});
