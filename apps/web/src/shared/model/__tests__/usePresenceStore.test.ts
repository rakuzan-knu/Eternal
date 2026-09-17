import { describe, it, expect, beforeEach } from 'vitest';
import { usePresenceStore } from '../usePresenceStore';

describe('usePresenceStore', () => {
  beforeEach(() => {
    usePresenceStore.setState({ onlineUserIds: new Set() });
  });

  it('setOnline adds user to online set', () => {
    usePresenceStore.getState().setOnline('usr-1');
    expect(usePresenceStore.getState().onlineUserIds.has('usr-1')).toBe(true);
  });

  it('setOffline removes user from online set', () => {
    usePresenceStore.setState({ onlineUserIds: new Set(['usr-1', 'usr-2']) });
    usePresenceStore.getState().setOffline('usr-1');
    expect(usePresenceStore.getState().onlineUserIds.has('usr-1')).toBe(false);
    expect(usePresenceStore.getState().onlineUserIds.has('usr-2')).toBe(true);
  });

  it('setBulk adds multiple user ids', () => {
    usePresenceStore.getState().setBulk(['usr-1', 'usr-2', 'usr-3']);
    expect(usePresenceStore.getState().onlineUserIds.size).toBe(3);
  });

  it('setKnownStatuses removes userIds and adds onlineUserIds', () => {
    usePresenceStore.setState({ onlineUserIds: new Set(['usr-1', 'usr-2']) });
    usePresenceStore.getState().setKnownStatuses(['usr-1', 'usr-2'], ['usr-2', 'usr-3']);
    const online = usePresenceStore.getState().onlineUserIds;
    expect(online.has('usr-1')).toBe(false);
    expect(online.has('usr-2')).toBe(true);
    expect(online.has('usr-3')).toBe(true);
  });
});
