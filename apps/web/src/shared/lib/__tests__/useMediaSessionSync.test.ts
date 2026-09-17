import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMediaSessionSync } from '../useMediaSessionSync';
import { useActiveMediaPlaybackStore } from '../../model/useActiveMediaPlaybackStore';

describe('useMediaSessionSync', () => {
  const registeredHandlers: Record<string, any> = {};
  const setActionHandler = vi.fn().mockImplementation((action: string, handler: any) => {
    registeredHandlers[action] = handler;
  });
  const setPositionState = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(registeredHandlers).forEach((k) => delete registeredHandlers[k]);

    useActiveMediaPlaybackStore.setState({
      activeMediaId: null,
      isPlaying: false,
      duration: 0,
      currentTime: 0,
      togglePlay: vi.fn(),
      playNext: vi.fn(),
      playPrev: vi.fn(),
      seekRelative: vi.fn(),
      seek: vi.fn(),
    });

    (globalThis as any).MediaMetadata = class {
      constructor(public init: any) {}
    };

    Object.defineProperty(navigator, 'mediaSession', {
      value: {
        metadata: null,
        playbackState: 'none',
        setActionHandler,
        setPositionState,
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    useActiveMediaPlaybackStore.setState({
      activeMediaId: null,
      isPlaying: false,
    });
  });

  it('clears metadata when no active media is present', () => {
    renderHook(() => useMediaSessionSync());

    expect(navigator.mediaSession.metadata).toBeNull();
    expect(navigator.mediaSession.playbackState).toBe('none');
  });

  it('updates metadata and registers handlers when media is playing', () => {
    const togglePlaySpy = vi.fn();
    const playNextSpy = vi.fn();
    const playPrevSpy = vi.fn();
    const seekRelativeSpy = vi.fn();
    const seekSpy = vi.fn();

    useActiveMediaPlaybackStore.setState({
      activeMediaId: 'media-1',
      senderName: 'John',
      senderAvatar: 'https://example.com/avatar.png',
      conversationTitle: 'General Chat',
      mediaType: 'video',
      isPlaying: true,
      duration: 60,
      currentTime: 10,
      playbackRate: 1.5,
      togglePlay: togglePlaySpy,
      playNext: playNextSpy,
      playPrev: playPrevSpy,
      seekRelative: seekRelativeSpy,
      seek: seekSpy,
    });

    const { unmount } = renderHook(() => useMediaSessionSync());

    expect(navigator.mediaSession.playbackState).toBe('playing');
    expect(setActionHandler).toHaveBeenCalledWith('play', expect.any(Function));
    expect(setActionHandler).toHaveBeenCalledWith('pause', expect.any(Function));
    expect(setPositionState).toHaveBeenCalledWith({
      duration: 60,
      playbackRate: 1.5,
      position: 10,
    });

    // Test invoking each registered handler
    registeredHandlers.play();
    expect(togglePlaySpy).toHaveBeenCalled();

    registeredHandlers.pause();
    expect(togglePlaySpy).toHaveBeenCalledTimes(2);

    registeredHandlers.previoustrack();
    expect(playPrevSpy).toHaveBeenCalled();

    registeredHandlers.nexttrack();
    expect(playNextSpy).toHaveBeenCalled();

    registeredHandlers.seekbackward({ seekOffset: 10 });
    expect(seekRelativeSpy).toHaveBeenCalledWith(-10);

    registeredHandlers.seekforward({});
    expect(seekRelativeSpy).toHaveBeenCalledWith(5);

    registeredHandlers.seekto({ seekTime: 25 });
    expect(seekSpy).toHaveBeenCalledWith(25);

    unmount();
    expect(setActionHandler).toHaveBeenCalledWith('play', null);
  });

  it('handles catch blocks gracefully when setPositionState or setActionHandler throws', () => {
    navigator.mediaSession.setActionHandler = vi.fn().mockImplementation(() => {
      throw new Error('Unsupported action');
    });
    navigator.mediaSession.setPositionState = vi.fn().mockImplementation(() => {
      throw new Error('Position out of range');
    });

    useActiveMediaPlaybackStore.setState({
      activeMediaId: 'media-1',
      senderName: '',
      senderAvatar: null,
      conversationTitle: '',
      mediaType: 'voice',
      isPlaying: false,
      duration: 30,
      currentTime: 5,
    });

    expect(() => renderHook(() => useMediaSessionSync())).not.toThrow();
  });

  it('covers lines 48-49 catch block when MediaMetadata constructor throws', () => {
    // Make MediaMetadata throw during construction to exercise the try/catch on lines 32-49
    (globalThis as any).MediaMetadata = class {
      constructor() {
        throw new Error('MediaMetadata not supported');
      }
    };

    useActiveMediaPlaybackStore.setState({
      activeMediaId: 'media-2',
      senderName: 'Jane',
      senderAvatar: 'https://example.com/jane.png',
      conversationTitle: 'Test Chat',
      mediaType: 'voice',
      isPlaying: true,
      duration: 45,
      currentTime: 10,
    });

    // Should not throw - the catch block (lines 48-49) gracefully handles the error
    expect(() => renderHook(() => useMediaSessionSync())).not.toThrow();
  });

  it('covers seekto handler when seekTime is undefined (no seek called)', () => {
    const seekSpy = vi.fn();
    useActiveMediaPlaybackStore.setState({
      activeMediaId: 'media-3',
      senderName: 'Bob',
      senderAvatar: null,
      conversationTitle: 'Chat',
      mediaType: 'voice',
      isPlaying: false,
      duration: 60,
      currentTime: 0,
      seek: seekSpy,
    });

    const registeredHandlers: Record<string, any> = {};
    setActionHandler.mockImplementation((action: string, handler: any) => {
      registeredHandlers[action] = handler;
    });

    renderHook(() => useMediaSessionSync());

    // Call seekto without seekTime (undefined) - seek should NOT be called
    if (registeredHandlers['seekto']) {
      registeredHandlers['seekto']({ seekTime: undefined });
      expect(seekSpy).not.toHaveBeenCalled();

      // Call with null seekTime - seek should NOT be called
      registeredHandlers['seekto']({ seekTime: null });
      expect(seekSpy).not.toHaveBeenCalled();
    }
  });
});
