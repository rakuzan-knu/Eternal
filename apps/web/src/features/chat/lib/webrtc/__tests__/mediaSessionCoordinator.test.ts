import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MediaSessionCoordinator } from '../mediaSessionCoordinator';

describe('MediaSessionCoordinator', () => {
  let coordinator: MediaSessionCoordinator;
  let mockActionHandlers: Record<string, (...args: unknown[]) => void>;
  let mockMediaSession: Record<string, unknown>;

  beforeEach(() => {
    coordinator = new MediaSessionCoordinator();
    mockActionHandlers = {};

    mockMediaSession = {
      metadata: null,
      playbackState: 'none',
      setActionHandler: vi.fn((action: string, handler: (...args: unknown[]) => void) => {
        mockActionHandlers[action] = handler;
      }),
    };

    vi.stubGlobal('navigator', {
      mediaSession: mockMediaSession,
      setAppBadge: vi.fn().mockResolvedValue(undefined),
      clearAppBadge: vi.fn().mockResolvedValue(undefined),
    });

    vi.stubGlobal(
      'MediaMetadata',
      class MockMediaMetadata {
        constructor(public init: unknown) {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('binds active call metadata and playback state to Media Session', () => {
    const success = coordinator.bindCallSession(
      {
        title: 'Call with Alice',
        callerName: 'Alice',
        isGroupCall: false,
      },
      {},
      false, // unmuted
    );

    expect(success).toBe(true);
    expect(mockMediaSession.metadata).toBeDefined();
    expect(mockMediaSession.playbackState).toBe('playing');
  });

  it('routes headphone Play and Pause media keys to Mute/Unmute handlers', () => {
    const onMute = vi.fn();

    coordinator.bindCallSession({ title: 'Test Call', callerName: 'Bob' }, { onMute }, false);

    // Press headphone Pause button -> should mute
    expect(mockActionHandlers['pause']).toBeDefined();
    mockActionHandlers['pause']();
    expect(onMute).toHaveBeenCalledWith(true);

    // Press headphone Play button -> should unmute
    expect(mockActionHandlers['play']).toBeDefined();
    mockActionHandlers['play']();
    expect(onMute).toHaveBeenCalledWith(false);
  });

  it('updates playback state upon mute/unmute', () => {
    coordinator.bindCallSession({ title: 'Test Call', callerName: 'Charlie' }, {});
    expect(mockMediaSession.playbackState).toBe('playing');

    coordinator.updateMuteState(true);
    expect(mockMediaSession.playbackState).toBe('paused');

    coordinator.updateMuteState(false);
    expect(mockMediaSession.playbackState).toBe('playing');
  });

  it('sets and clears PWA dock app badge', async () => {
    await coordinator.setBadgeCount(3);
    expect(navigator.setAppBadge).toHaveBeenCalledWith(3);

    await coordinator.clearBadge();
    expect(navigator.clearAppBadge).toHaveBeenCalled();
  });
});
