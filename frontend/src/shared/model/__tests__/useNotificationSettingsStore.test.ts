import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationSettingsStore } from '../useNotificationSettingsStore';

describe('useNotificationSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
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
  });
});
