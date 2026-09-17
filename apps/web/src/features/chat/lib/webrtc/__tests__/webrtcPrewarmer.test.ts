import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebRtcPrewarmer } from '../webrtcPrewarmer';

describe('WebRtcPrewarmer', () => {
  let prewarmer: WebRtcPrewarmer;

  beforeEach(() => {
    vi.useFakeTimers();

    // Mock RTCPeerConnection
    class MockPeerConnection {
      connectionState = 'new';
      addTransceiver = vi.fn();
      close = vi.fn(() => {
        this.connectionState = 'closed';
      });
    }

    vi.stubGlobal('RTCPeerConnection', MockPeerConnection);
    prewarmer = new WebRtcPrewarmer();
    prewarmer.setIceServers([{ urls: ['stun:stun.l.google.com:19302'] }]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('prewarms a connection and stores it in cache', async () => {
    const success = await prewarmer.prewarm('room-123');
    expect(success).toBe(true);
    expect(prewarmer.hasPrewarmed('room-123')).toBe(true);
  });

  it('consumes prewarmed connection on demand and removes from cache', async () => {
    await prewarmer.prewarm('room-123');
    const session = prewarmer.consumePrewarmed('room-123');

    expect(session).not.toBeNull();
    expect(session?.peerConnection).toBeDefined();
    // Cache is cleared after consume
    expect(prewarmer.hasPrewarmed('room-123')).toBe(false);
  });

  it('automatically disposes unconsumed session after 6 seconds TTL', async () => {
    await prewarmer.prewarm('room-abandoned');
    expect(prewarmer.hasPrewarmed('room-abandoned')).toBe(true);

    // Advance timers past 6 seconds
    vi.advanceTimersByTime(6100);

    expect(prewarmer.hasPrewarmed('room-abandoned')).toBe(false);
    expect(prewarmer.consumePrewarmed('room-abandoned')).toBeNull();
  });

  it('debounces prewarm on hover and ignores quick accidental cursor sweeps', async () => {
    prewarmer.schedulePrewarm('room-sweep', undefined, 120);
    expect(prewarmer.hasPendingPrewarm('room-sweep')).toBe(true);
    expect(prewarmer.hasPrewarmed('room-sweep')).toBe(false);

    // User cursor leaves after only 40ms (accidental sweep)
    vi.advanceTimersByTime(40);
    const cancelled = prewarmer.cancelPendingPrewarm('room-sweep');
    expect(cancelled).toBe(true);
    expect(prewarmer.hasPendingPrewarm('room-sweep')).toBe(false);

    // Advance remaining time - should NOT have prewarmed
    vi.advanceTimersByTime(100);
    expect(prewarmer.hasPrewarmed('room-sweep')).toBe(false);
  });

  it('completes prewarm when hover exceeds debounce threshold (120ms)', async () => {
    prewarmer.schedulePrewarm('room-hover-intent', undefined, 120);
    expect(prewarmer.hasPendingPrewarm('room-hover-intent')).toBe(true);

    // Wait full debounce duration
    await vi.advanceTimersByTimeAsync(130);

    expect(prewarmer.hasPendingPrewarm('room-hover-intent')).toBe(false);
    expect(prewarmer.hasPrewarmed('room-hover-intent')).toBe(true);
  });

  it('pre-flights media permissions', async () => {
    const perms = await prewarmer.checkMediaPermissions();
    expect(perms).toHaveProperty('audio');
    expect(perms).toHaveProperty('video');
  });
});
