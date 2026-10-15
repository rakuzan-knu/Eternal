import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSoundboardStore } from '../soundboardStore';
import { soundboardApi } from '../../api/soundboardApi';
import { globalSpeakerMixerManager } from '../../lib/webrtc/perSpeakerMixer';
import { globalSoundboardEngine } from '../../lib/webrtc/soundboardEngine';
import { getSocket } from '@/shared/api/socket';

vi.mock('../../api/soundboardApi', () => ({
  soundboardApi: {
    getMySounds: vi.fn(),
    createMySound: vi.fn(),
    deleteMySound: vi.fn(),
    getChatSounds: vi.fn(),
    createChatSound: vi.fn(),
    deleteChatSound: vi.fn(),
  },
}));

vi.mock('@/shared/api/socket', () => {
  const listeners: Record<string, Function[]> = {};
  const mockSocket = {
    on: vi.fn((event: string, cb: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    }),
    off: vi.fn((event: string, cb: Function) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((fn) => fn !== cb);
      }
    }),
    emit: vi.fn(),
    connected: true,
    _trigger: (event: string, data: any) => {
      listeners[event]?.forEach((fn) => fn(data));
    },
  };
  return { getSocket: () => mockSocket };
});

describe('useSoundboardStore & Per-Speaker Mute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSoundboardStore.setState({
      mySounds: [],
      chatSounds: {},
      isSoundboardMuted: false,
      soundboardVolume: 1.0,
    });
  });

  describe('My Sounds Persistence', () => {
    it('fetches my sounds from backend account and updates state', async () => {
      vi.mocked(soundboardApi.getMySounds).mockResolvedValueOnce([
        {
          id: 'my-remote-1',
          name: 'Airhorn 2026',
          emoji: '📯',
          scope: 'my',
          durationMs: 2000,
        },
      ]);

      await useSoundboardStore.getState().fetchMySounds();

      const { mySounds } = useSoundboardStore.getState();
      expect(mySounds).toHaveLength(1);
      expect(mySounds[0]?.id).toBe('my-remote-1');
      expect(mySounds[0]?.name).toBe('Airhorn 2026');
    });

    it('adds sound to account and removes completely on delete', async () => {
      vi.mocked(soundboardApi.createMySound).mockResolvedValueOnce({
        id: 'my-server-id',
        name: 'Meme Quack',
        emoji: '🦆',
        scope: 'my',
        durationMs: 1500,
      });
      vi.mocked(soundboardApi.deleteMySound).mockResolvedValueOnce({ success: true });

      const added = await useSoundboardStore.getState().addMySound({
        name: 'Meme Quack',
        emoji: '🦆',
        durationMs: 1500,
      });

      expect(added.id).toBe('my-server-id');
      expect(useSoundboardStore.getState().mySounds).toHaveLength(1);

      // Delete sound
      await useSoundboardStore.getState().removeMySound('my-server-id');

      expect(soundboardApi.deleteMySound).toHaveBeenCalledWith('my-server-id');
      expect(useSoundboardStore.getState().mySounds).toHaveLength(0);
    });
  });

  describe('Chat Sounds Synchronization', () => {
    it('fetches chat sounds for conversation', async () => {
      vi.mocked(soundboardApi.getChatSounds).mockResolvedValueOnce([
        {
          id: 'chat-sound-1',
          name: 'Squad Laugh',
          emoji: '🤣',
          scope: 'chat',
          conversationId: 'conv-group-1',
          durationMs: 2500,
        },
      ]);

      await useSoundboardStore.getState().fetchChatSounds('conv-group-1');

      const chatSounds = useSoundboardStore.getState().chatSounds['conv-group-1'];
      expect(chatSounds).toHaveLength(1);
      expect(chatSounds?.[0]?.name).toBe('Squad Laugh');
    });

    it('adds chat sound to server and removes on delete', async () => {
      vi.mocked(soundboardApi.createChatSound).mockResolvedValueOnce({
        id: 'chat-saved-1',
        name: 'Victory Cheer',
        emoji: '🎉',
        scope: 'chat',
        conversationId: 'conv-group-1',
        durationMs: 3000,
      });
      vi.mocked(soundboardApi.deleteChatSound).mockResolvedValueOnce({ success: true });

      await useSoundboardStore.getState().addChatSound('conv-group-1', {
        name: 'Victory Cheer',
        emoji: '🎉',
        durationMs: 3000,
      });

      expect(useSoundboardStore.getState().chatSounds['conv-group-1']).toHaveLength(1);

      await useSoundboardStore.getState().removeChatSound('conv-group-1', 'chat-saved-1');

      expect(soundboardApi.deleteChatSound).toHaveBeenCalledWith('conv-group-1', 'chat-saved-1');
      expect(useSoundboardStore.getState().chatSounds['conv-group-1']).toHaveLength(0);
    });

    it('receives real-time socket events for chat sounds (added and deleted)', () => {
      const unsub = useSoundboardStore.getState().initSocketListeners();
      const socket = getSocket() as any;

      // Simulate remote participant uploading a sound in the chat
      socket._trigger('soundboard:chat_added', {
        id: 'chat-remote-sync',
        name: 'Remote Sound',
        emoji: '🔔',
        scope: 'chat',
        conversationId: 'conv-test',
        durationMs: 1200,
      });

      expect(useSoundboardStore.getState().chatSounds['conv-test']).toHaveLength(1);
      expect(useSoundboardStore.getState().chatSounds['conv-test']?.[0]?.name).toBe('Remote Sound');

      // Simulate deletion by participant
      socket._trigger('soundboard:chat_deleted', {
        conversationId: 'conv-test',
        id: 'chat-remote-sync',
      });

      expect(useSoundboardStore.getState().chatSounds['conv-test']).toHaveLength(0);

      unsub();
    });
  });

  describe('Per-Speaker Soundboard Mute ("Mute Soundboard")', () => {
    it('sets and checks per-speaker soundboard mute profile correctly', () => {
      expect(globalSpeakerMixerManager.isSoundboardMuted('user-alice')).toBe(false);

      // User right-clicks Alice and toggles "Mute Soundboard"
      globalSpeakerMixerManager.updateProfile('user-alice', { soundboardMuted: true });

      expect(globalSpeakerMixerManager.isSoundboardMuted('user-alice')).toBe(true);

      // Unmuting soundboard
      globalSpeakerMixerManager.updateProfile('user-alice', { soundboardMuted: false });
      expect(globalSpeakerMixerManager.isSoundboardMuted('user-alice')).toBe(false);
    });
  });
});
