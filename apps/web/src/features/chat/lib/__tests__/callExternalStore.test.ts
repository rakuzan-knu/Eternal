import { describe, it, expect, vi } from 'vitest';
import { WebRTCCallExternalStore } from '../webrtc/callExternalStore';

describe('WebRTCCallExternalStore & Call FSM', () => {
  it('follows valid FSM state lifecycle transitions', () => {
    const store = new WebRTCCallExternalStore();
    expect(store.getSnapshot().fsmState).toBe('IDLE');

    // Outgoing call initiation
    expect(store.transition('CALLING')).toBe(true);
    expect(store.getSnapshot().fsmState).toBe('CALLING');

    // Signaling (offer/answer exchange)
    expect(store.transition('SIGNALING')).toBe(true);
    expect(store.getSnapshot().fsmState).toBe('SIGNALING');

    // Media connected
    expect(store.transition('CONNECTED')).toBe(true);
    expect(store.getSnapshot().fsmState).toBe('CONNECTED');

    // Network glitch: ICE restart / reconnecting
    expect(store.transition('RECONNECTING')).toBe(true);
    expect(store.getSnapshot().fsmState).toBe('RECONNECTING');

    // Reconnection succeeded
    expect(store.transition('CONNECTED')).toBe(true);
    expect(store.getSnapshot().fsmState).toBe('CONNECTED');

    // Call terminates
    expect(store.transition('ENDED')).toBe(true);
    expect(store.getSnapshot().fsmState).toBe('ENDED');

    // Reset to idle
    expect(store.transition('IDLE')).toBe(true);
    expect(store.getSnapshot().fsmState).toBe('IDLE');
  });

  it('rejects invalid FSM state transitions to prevent race conditions', () => {
    const store = new WebRTCCallExternalStore();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Cannot jump from IDLE directly to CONNECTED
    expect(store.transition('CONNECTED')).toBe(false);
    expect(store.getSnapshot().fsmState).toBe('IDLE');

    // Can transition IDLE -> RINGING (incoming call)
    expect(store.transition('RINGING')).toBe(true);

    // Cannot jump directly from RINGING to RECONNECTING
    expect(store.transition('RECONNECTING')).toBe(false);
    expect(store.getSnapshot().fsmState).toBe('RINGING');

    warnSpy.mockRestore();
  });

  it('updates partial fields outside React render tree and notifies listeners', () => {
    const store = new WebRTCCallExternalStore();
    const listener = vi.fn();

    const unsubscribe = store.subscribe(listener);

    store.update({ isMuted: true });
    expect(store.getSnapshot().isMuted).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    // No-op update with same values should not notify
    store.update({ isMuted: true });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.update({ isVideoOff: true });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().isVideoOff).toBe(true);
  });

  it('resets snapshot cleanly back to initial state', () => {
    const store = new WebRTCCallExternalStore();
    store.transition('CALLING');
    store.update({ callId: 'test-call-1', isMuted: true });

    store.reset();
    const snapshot = store.getSnapshot();
    expect(snapshot.fsmState).toBe('IDLE');
    expect(snapshot.callId).toBeNull();
    expect(snapshot.isMuted).toBe(false);
  });
});
