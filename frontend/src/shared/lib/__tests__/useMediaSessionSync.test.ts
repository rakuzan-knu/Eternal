import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMediaSessionSync } from '../useMediaSessionSync';
import { useActiveMediaPlaybackStore } from '../../model/useActiveMediaPlaybackStore';

describe('useMediaSessionSync', () => {
  const setActionHandler = vi.fn();
  const setPositionState = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useActiveMediaPlaybackStore.setState({
      activeMediaId: null,
      isPlaying: false,
      duration: 0,
      currentTime: 0,
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
    useActiveMediaPlaybackStore.setState({
      activeMediaId: 'media-1',
      senderName: 'John',
      conversationTitle: 'General Chat',
      mediaType: 'voice',
      isPlaying: true,
      duration: 60,
      currentTime: 10,
    });

    renderHook(() => useMediaSessionSync());

    expect(navigator.mediaSession.playbackState).toBe('playing');
    expect(setActionHandler).toHaveBeenCalledWith('play', expect.any(Function));
    expect(setActionHandler).toHaveBeenCalledWith('pause', expect.any(Function));
    expect(setPositionState).toHaveBeenCalled();
  });
});
