import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotificationSettingsStore } from '../useNotificationSettingsStore';
import * as notificationApi from '../../api/notificationApi';

vi.mock('../../api/notificationApi', () => ({
  muteNotificationAuthor: vi.fn().mockResolvedValue(undefined),
  unmuteNotificationAuthor: vi.fn().mockResolvedValue(undefined),
  updateNotificationSettings: vi.fn().mockResolvedValue({}),
}));

describe('useNotificationSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('updates notification toggles and fields correctly', () => {
    const store = useNotificationSettingsStore.getState();

    store.setEnableNotifications(false);
    expect(useNotificationSettingsStore.getState().enableNotifications).toBe(false);

    store.setAllowSound(false);
    expect(useNotificationSettingsStore.getState().allowSound).toBe(false);

    store.setVolume(50);
    expect(useNotificationSettingsStore.getState().volume).toBe(50);

    store.setPrivateChats(false);
    expect(useNotificationSettingsStore.getState().privateChats).toBe(false);

    store.setGroups(false);
    expect(useNotificationSettingsStore.getState().groups).toBe(false);

    store.setReactions(false);
    expect(useNotificationSettingsStore.getState().reactions).toBe(false);

    store.setLikes(false);
    expect(useNotificationSettingsStore.getState().likes).toBe(false);

    store.setComments(false);
    expect(useNotificationSettingsStore.getState().comments).toBe(false);

    store.setReposts(false);
    expect(useNotificationSettingsStore.getState().reposts).toBe(false);

    store.setFollowers(false);
    expect(useNotificationSettingsStore.getState().followers).toBe(false);

    store.setMentions(false);
    expect(useNotificationSettingsStore.getState().mentions).toBe(false);

    store.setSystem(false);
    expect(useNotificationSettingsStore.getState().system).toBe(false);

    store.setToastPosition('top-left');
    expect(useNotificationSettingsStore.getState().toastPosition).toBe('top-left');

    store.setMaxToasts(5);
    expect(useNotificationSettingsStore.getState().maxToasts).toBe(5);
  });

  it('handles interdependent showName and showText rules', () => {
    const store = useNotificationSettingsStore.getState();

    // Turning off showName also turns off showText
    store.setShowName(false);
    expect(useNotificationSettingsStore.getState().showName).toBe(false);
    expect(useNotificationSettingsStore.getState().showText).toBe(false);

    // Turning on showText turns on showName as well
    store.setShowText(true);
    expect(useNotificationSettingsStore.getState().showName).toBe(true);
    expect(useNotificationSettingsStore.getState().showText).toBe(true);

    // Turning off showText directly
    store.setShowText(false);
    expect(useNotificationSettingsStore.getState().showText).toBe(false);
    expect(useNotificationSettingsStore.getState().showName).toBe(true);

    // Turning on showName when true
    store.setShowName(true);
    expect(useNotificationSettingsStore.getState().showName).toBe(true);
  });

  it('handles setDoNotDisturb presets', () => {
    const store = useNotificationSettingsStore.getState();

    store.setDoNotDisturb('1h');
    expect(useNotificationSettingsStore.getState().dndUntil).not.toBeNull();

    store.setDoNotDisturb('8h');
    expect(useNotificationSettingsStore.getState().dndUntil).not.toBeNull();

    store.setDoNotDisturb('tomorrow');
    expect(useNotificationSettingsStore.getState().dndUntil).not.toBeNull();

    store.setDoNotDisturb('off');
    expect(useNotificationSettingsStore.getState().dndUntil).toBeNull();
  });

  it('mutes and unmutes notification authors with API integration', async () => {
    const store = useNotificationSettingsStore.getState();
    const actor = { id: 'usr-1', username: 'alice', displayName: 'Alice' };

    await store.muteAuthor('usr-1', actor);
    expect(useNotificationSettingsStore.getState().mutedActorIds).toContain('usr-1');
    expect(useNotificationSettingsStore.getState().mutedActors).toEqual([actor]);
    expect(notificationApi.muteNotificationAuthor).toHaveBeenCalledWith('usr-1');

    // Mute another author without actorInfo
    await store.muteAuthor('usr-2');
    expect(useNotificationSettingsStore.getState().mutedActorIds).toContain('usr-2');

    // Unmute author
    await store.unmuteAuthor('usr-1');
    expect(useNotificationSettingsStore.getState().mutedActorIds).not.toContain('usr-1');
    expect(notificationApi.unmuteNotificationAuthor).toHaveBeenCalledWith('usr-1');
  });

  it('handles errors when mute/unmute API fails', async () => {
    vi.mocked(notificationApi.muteNotificationAuthor).mockRejectedValueOnce(new Error('Mute err'));
    vi.mocked(notificationApi.unmuteNotificationAuthor).mockRejectedValueOnce(
      new Error('Unmute err'),
    );

    const store = useNotificationSettingsStore.getState();
    await expect(store.muteAuthor('usr-3')).resolves.toBeUndefined();
    await expect(store.unmuteAuthor('usr-3')).resolves.toBeUndefined();
  });

  it('sets all settings at once', () => {
    useNotificationSettingsStore.getState().setAllSettings({
      allowSound: false,
      volume: 40,
    });
    expect(useNotificationSettingsStore.getState().allowSound).toBe(false);
    expect(useNotificationSettingsStore.getState().volume).toBe(40);
  });
});
