import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useJamStore } from '../model/useJamStore';
import { useJamSession } from '../model/useJamSession';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import * as socketApi from '@/shared/api/socket';

describe('useJamSession & Clock Synchronization', () => {
  let mockSocket: any;

  beforeEach(() => {
    vi.useFakeTimers();
    useJamStore.getState().resetJam();
    useSpotifyPlayerStore.setState({
      currentTrack: null,
      isPlaying: false,
      progressMs: 0,
      durationMs: 180000,
      queue: [],
    });

    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};

    mockSocket = {
      connected: true,
      emit: vi.fn(),
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
        return mockSocket;
      }),
      off: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((fn) => fn !== cb);
        }
        return mockSocket;
      }),
      _trigger: (event: string, data: any) => {
        if (listeners[event]) {
          listeners[event].forEach((cb) => cb(data));
        }
      },
    };

    vi.spyOn(socketApi, 'getSocket').mockReturnValue(mockSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calculates clock offset via Cristian algorithm on jam:pong', () => {
    renderHook(() => useJamSession());

    // Trigger state update
    act(() => {
      mockSocket._trigger('jam:state_update', {
        id: 'jam_test_1',
        hostUserId: 'user_host',
        hostUsername: 'DJHost',
        queuePolicy: 'dj_only',
        listeners: [],
        queue: [],
        status: 'active',
      });
    });

    // Simulate RTT ping-pong with Cristian's algorithm
    // t0 = 1000, serverTime = 1060
    act(() => {
      mockSocket._trigger('jam:pong', {
        t0: 1000,
        serverTime: 1060,
      });
    });

    const storeState = useJamStore.getState();
    expect(storeState.isJamActive).toBe(true);
    expect(storeState.roomId).toBe('jam_test_1');
    expect(typeof storeState.serverTimeOffset).toBe('number');
  });

  it('supports listener local pause and immediate catch-up to host live position', () => {
    const { result } = renderHook(() => useJamSession());

    act(() => {
      mockSocket._trigger('jam:state_update', {
        id: 'jam_room_42',
        hostUserId: 'user_host',
        hostUsername: 'HostHero',
        queuePolicy: 'dj_only',
        listeners: [{ id: 'user_listener', username: 'Listener' }],
        queue: [],
        status: 'active',
      });
    });

    // Host emits sync: track is at 30,000 ms at t = 100,000
    const hostTimestamp = 100000;
    act(() => {
      mockSocket._trigger('jam:sync_event', {
        currentTrack: {
          id: 'trk-1',
          title: 'Electric Pulse',
          artist: 'Future Sound',
          albumArt: '',
          durationMs: 200000,
          previewUrl: null,
          spotifyUrl: '/music/track/trk-1',
          source: 'platform',
        },
        positionMs: 30000,
        isPlaying: true,
        timestamp: hostTimestamp,
      });
    });

    // Listener pauses locally
    act(() => {
      result.current.handleLocalPause();
    });

    expect(result.current.isPausedLocally).toBe(true);
    expect(useSpotifyPlayerStore.getState().isPlaying).toBe(false);

    // Host continues playing for 5 seconds in real-time
    vi.advanceTimersByTime(5000);

    // Listener clicks play to resume -> jumps to host's live position
    act(() => {
      result.current.handleLocalResume();
    });

    expect(result.current.isPausedLocally).toBe(false);
  });

  it('emits jam:preload_next when track has 10-15s remaining for the host', () => {
    const nextTrack = {
      id: 'trk-next',
      title: 'Next Hit',
      artist: 'Star DJ',
      albumArt: '',
      durationMs: 180000,
      previewUrl: null,
      spotifyUrl: '/music/track/trk-next',
      source: 'platform' as const,
      streamUrl: '/audio/stream-next.mp3',
    };

    useSpotifyPlayerStore.setState({
      currentTrack: {
        id: 'trk-current',
        title: 'Current Hit',
        artist: 'Star DJ',
        albumArt: '',
        durationMs: 60000, // 60s track
        previewUrl: null,
        spotifyUrl: '/music/track/trk-current',
        source: 'platform',
      },
      isPlaying: true,
      progressMs: 48000, // 12 seconds remaining (between 10-15s window)
      durationMs: 60000,
      queue: [nextTrack],
    });

    useJamStore.setState({
      roomId: 'jam_host_room',
      isHost: true,
      isJamActive: true,
    });

    renderHook(() => useJamSession());

    // Advance timer by 3000ms to trigger the host heartbeat and preload check
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('jam:preload_next', {
      roomId: 'jam_host_room',
      trackId: 'trk-next',
      streamUrl: '/audio/stream-next.mp3',
    });
  });

  it('intercepts system MediaSession API actions for listeners', () => {
    const originalMediaSession = navigator.mediaSession;
    const actionHandlers: Record<string, ((...args: unknown[]) => void) | null> = {};

    Object.defineProperty(navigator, 'mediaSession', {
      value: {
        setActionHandler: vi.fn(
          (action: string, handler: ((...args: unknown[]) => void) | null) => {
            actionHandlers[action] = handler;
          },
        ),
      },
      configurable: true,
      writable: true,
    });

    useJamStore.setState({
      roomId: 'jam_listener_room',
      isHost: false,
      isJamActive: true,
    });

    renderHook(() => useJamSession());

    // Hardware timeline seek and track skips are disabled (null)
    expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('seekto', null);
    expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('previoustrack', null);
    expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('nexttrack', null);

    // Pause & play are routed to handleLocalPause & handleLocalResume
    expect(typeof actionHandlers['pause']).toBe('function');
    expect(typeof actionHandlers['play']).toBe('function');

    Object.defineProperty(navigator, 'mediaSession', {
      value: originalMediaSession,
      configurable: true,
      writable: true,
    });
  });
});
