import { useEffect, useRef, useCallback } from 'react';
import { getSocket } from '@/shared/api/socket';
import { useJamStore, type JamQueuePolicy } from './useJamStore';
import {
  useSpotifyPlayerStore,
  getGlobalAudioElement,
  getSdkPlayerInstance,
  type SpotifyTrack,
} from '@/shared/model/useSpotifyPlayerStore';
import { useAuthStore } from '@/shared/model/useAuthStore';

// Pre-buffering cache for zero-gap track transitions
let preloadedAudio: HTMLAudioElement | null = null;

export function useJamSession() {
  const currentUserId = useAuthStore((s) => s.userId);
  const roomId = useJamStore((s) => s.roomId);
  const isHost = useJamStore((s) => s.isHost);
  const isJamActive = useJamStore((s) => s.isJamActive);
  const isPausedLocally = useJamStore((s) => s.isPausedLocally);
  const queuePolicy = useJamStore((s) => s.queuePolicy);

  const lastPreloadedTrackIdRef = useRef<string | null>(null);
  const lastManualSyncTimeRef = useRef<number>(0);
  const latestHostStateRef = useRef<{
    track: SpotifyTrack | null;
    positionMs: number;
    isPlaying: boolean;
    timestamp: number;
  } | null>(null);

  const socket = getSocket();

  // =========================================================================
  // 1. CRISTIAN'S ALGORITHM: SERVER TIME SYNCHRONIZATION
  // =========================================================================
  const measureServerTimeOffset = useCallback(() => {
    if (!socket || !socket.connected) return;
    const t0 = Date.now();
    socket.emit('jam:ping', { t0 });
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handlePong = (payload: { t0: number; serverTime: number }) => {
      const t1 = Date.now();
      const rtt = Math.max(0, t1 - payload.t0);
      const offset = payload.serverTime + rtt / 2 - t1;
      useJamStore.getState().setServerTimeOffset(offset);
      useJamStore.getState().setLatency(rtt / 2);
    };

    socket.on('jam:pong', handlePong);

    // Initial ping & periodic sync every 30 seconds
    measureServerTimeOffset();
    const pingInterval = setInterval(measureServerTimeOffset, 30_000);

    return () => {
      socket.off('jam:pong', handlePong);
      clearInterval(pingInterval);
    };
  }, [socket, measureServerTimeOffset]);

  // =========================================================================
  // 2. SOCKET EVENT LISTENERS
  // =========================================================================
  useEffect(() => {
    if (!socket) return;

    // Full Room State update
    const handleStateUpdate = (room: any) => {
      if (!room) return;
      useJamStore.getState().setRoomState(room, currentUserId || undefined);

      // If listener, record current host track and state
      if (!useJamStore.getState().isHost && room.currentTrack) {
        latestHostStateRef.current = {
          track: room.currentTrack,
          positionMs: room.positionMs || 0,
          isPlaying: room.isPlaying,
          timestamp: room.updatedAt || Date.now(),
        };

        // If not paused locally, sync immediately
        if (!useJamStore.getState().isPausedLocally) {
          syncListenerToHost(room.currentTrack, room.positionMs, room.isPlaying, room.updatedAt);
        }
      }
    };

    // Lightweight sync broadcast from Host
    const handleSyncEvent = (payload: {
      trackId?: string;
      positionMs: number;
      isPlaying: boolean;
      timestamp: number;
      currentTrack?: SpotifyTrack | null;
    }) => {
      if (useJamStore.getState().isHost) return; // Host ignores sync broadcasts

      latestHostStateRef.current = {
        track: payload.currentTrack || useSpotifyPlayerStore.getState().currentTrack,
        positionMs: payload.positionMs,
        isPlaying: payload.isPlaying,
        timestamp: payload.timestamp,
      };

      if (!useJamStore.getState().isPausedLocally) {
        syncListenerToHost(
          payload.currentTrack || useSpotifyPlayerStore.getState().currentTrack,
          payload.positionMs,
          payload.isPlaying,
          payload.timestamp,
        );
      }
    };

    // Preload signal from Host
    const handlePreloadNext = (payload: { trackId: string; streamUrl?: string }) => {
      if (useJamStore.getState().isHost) return;
      if (!payload?.streamUrl) return;

      try {
        if (!preloadedAudio) {
          preloadedAudio = new Audio();
          preloadedAudio.preload = 'auto';
          preloadedAudio.volume = 0;
        }
        preloadedAudio.src = payload.streamUrl;
        preloadedAudio.load();
        useJamStore.getState().setPreloadedTrackId(payload.trackId);
      } catch {}
    };

    // Listener joined/left/room closed
    const handleListenerJoined = (payload: any) => {
      if (payload?.room) {
        useJamStore.getState().setRoomState(payload.room, currentUserId || undefined);
      }
    };

    const handleListenerLeft = (payload: any) => {
      if (payload?.userId) {
        const listeners = useJamStore.getState().listeners.filter((l) => l.id !== payload.userId);
        useJamStore.getState().setListeners(listeners);
      }
    };

    const handleRoomClosed = () => {
      useJamStore.getState().resetJam();
      // Ensure playback is cleanly paused for all listeners when room closes
      useSpotifyPlayerStore.getState().pause();
      // Restore playbackRate to standard 1.0
      const audio = getGlobalAudioElement();
      if (audio) audio.playbackRate = 1.0;
    };

    const handleJamError = (payload: { message?: string }) => {
      if (payload?.message) {
        console.warn('[Jam Session] Server error:', payload.message);
      }
    };

    socket.on('jam:state_update', handleStateUpdate);
    socket.on('jam:sync_event', handleSyncEvent);
    socket.on('jam:preload_next', handlePreloadNext);
    socket.on('jam:listener_joined', handleListenerJoined);
    socket.on('jam:listener_left', handleListenerLeft);
    socket.on('jam:room_closed', handleRoomClosed);
    socket.on('jam:error', handleJamError);

    return () => {
      socket.off('jam:state_update', handleStateUpdate);
      socket.off('jam:sync_event', handleSyncEvent);
      socket.off('jam:preload_next', handlePreloadNext);
      socket.off('jam:listener_joined', handleListenerJoined);
      socket.off('jam:listener_left', handleListenerLeft);
      socket.off('jam:room_closed', handleRoomClosed);
      socket.off('jam:error', handleJamError);
    };
  }, [socket, currentUserId]);

  // =========================================================================
  // 3. LISTENER ADAPTIVE DRIFT COMPENSATION & SYNCHRONIZATION
  // =========================================================================
  const syncListenerToHost = (
    hostTrack: SpotifyTrack | null,
    hostPositionMs: number,
    hostIsPlaying: boolean,
    hostTimestamp: number,
  ) => {
    if (!hostTrack) return;

    const playerStore = useSpotifyPlayerStore.getState();
    const currentTrack = playerStore.currentTrack;
    const isLocalPlaying = playerStore.isPlaying;

    // Accurate server time adjusted with Cristian's offset
    const currentServerTime = Date.now() + useJamStore.getState().serverTimeOffset;
    const latencyMs = Math.max(0, (currentServerTime - hostTimestamp) / 2);
    const expectedPositionSec = (hostPositionMs + latencyMs) / 1000;

    const isDifferentTrack =
      !currentTrack ||
      currentTrack.id !== hostTrack.id ||
      (currentTrack.title.toLowerCase() !== hostTrack.title.toLowerCase() &&
        currentTrack.artist.toLowerCase() !== hostTrack.artist.toLowerCase());

    // A) Track Changed: Switch immediately to host's track
    if (isDifferentTrack) {
      playerStore.playTrack(hostTrack, undefined, undefined, false);

      // Seek to expected position as soon as metadata is ready
      setTimeout(() => {
        const audio = getGlobalAudioElement();
        if (audio && isFinite(expectedPositionSec)) {
          audio.currentTime = expectedPositionSec;
          audio.playbackRate = 1.0;
        }
        const sdk = getSdkPlayerInstance();
        if (sdk && typeof sdk.seek === 'function' && hostTrack.source === 'spotify') {
          sdk.seek(Math.floor(expectedPositionSec * 1000)).catch(() => {});
        }
      }, 250);
      return;
    }

    // B) Play / Pause Synchronization
    if (!hostIsPlaying && isLocalPlaying) {
      playerStore.pause();
      return;
    }
    if (hostIsPlaying && !isLocalPlaying && !useJamStore.getState().isPausedLocally) {
      playerStore.resume();
    }

    // C) Drift Compensation
    const audio = getGlobalAudioElement();
    const sdk = getSdkPlayerInstance();
    const isSpotifyTrack = hostTrack.source === 'spotify';

    if (isSpotifyTrack) {
      // Spotify SDK: no playbackRate support -> gentle player.seek only if drift > 2.0s
      const currentPosSec = playerStore.progressMs / 1000;
      const drift = currentPosSec - expectedPositionSec;
      if (Math.abs(drift) > 2.0 && sdk && typeof sdk.seek === 'function') {
        sdk.seek(Math.floor(expectedPositionSec * 1000)).catch(() => {});
      }
    } else if (audio) {
      // SoundCloud & Platform Audio: High-precision Adaptive Drift Compensation
      const drift = audio.currentTime - expectedPositionSec;

      if (Math.abs(drift) > 1.5) {
        // Direct hard seek if desynchronized > 1.5 seconds
        audio.currentTime = expectedPositionSec;
        audio.playbackRate = 1.0;
      } else if (Math.abs(drift) > 0.2 && Math.abs(drift) <= 1.5) {
        // Micro-tempo adjustment
        if (drift < 0) {
          // Listener is lagging behind: slightly accelerate
          audio.playbackRate = 1.05;
        } else {
          // Listener is ahead: slightly decelerate
          audio.playbackRate = 0.95;
        }
      } else if (Math.abs(drift) < 0.1 && audio.playbackRate !== 1.0) {
        // Restored in-sync: normalize playback rate
        audio.playbackRate = 1.0;
      }
    }
  };

  // =========================================================================
  // 4. LISTENER LOCAL PAUSE & CATCH-UP LOGIC
  // =========================================================================
  const handleLocalPause = useCallback(() => {
    useJamStore.getState().setPausedLocally(true);
    useSpotifyPlayerStore.getState().pause();
  }, []);

  const handleLocalResume = useCallback(() => {
    useJamStore.getState().setPausedLocally(false);

    // Immediate Catch-Up to wherever the host currently is!
    const hostState = latestHostStateRef.current;
    if (hostState && hostState.track) {
      const currentServerTime = Date.now() + useJamStore.getState().serverTimeOffset;
      const elapsedSinceHostSync = hostState.isPlaying
        ? Math.max(0, currentServerTime - hostState.timestamp)
        : 0;
      const liveExpectedMs = hostState.positionMs + elapsedSinceHostSync;

      syncListenerToHost(hostState.track, liveExpectedMs, hostState.isPlaying, hostState.timestamp);
    } else {
      useSpotifyPlayerStore.getState().resume();
    }
  }, []);

  // =========================================================================
  // 5. MEDIA SESSION API LOCK FOR LISTENERS
  // =========================================================================
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    if (isJamActive && !isHost) {
      // Intercept system/headset media keys: block timeline scrubbing/skipping
      try {
        navigator.mediaSession.setActionHandler('seekto', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('pause', handleLocalPause);
        navigator.mediaSession.setActionHandler('play', handleLocalResume);
      } catch {}
    } else {
      // Restore standard action handlers when not in Jam as listener
      try {
        navigator.mediaSession.setActionHandler('pause', () =>
          useSpotifyPlayerStore.getState().pause(),
        );
        navigator.mediaSession.setActionHandler('play', () =>
          useSpotifyPlayerStore.getState().resume(),
        );
        navigator.mediaSession.setActionHandler('previoustrack', () =>
          useSpotifyPlayerStore.getState().prevTrack(),
        );
        navigator.mediaSession.setActionHandler('nexttrack', () =>
          useSpotifyPlayerStore.getState().nextTrack(),
        );
      } catch {}
    }
  }, [isJamActive, isHost, handleLocalPause, handleLocalResume]);

  // =========================================================================
  // 6. HOST HEARTBEAT & PRE-BUFFERING LOOP
  // =========================================================================
  useEffect(() => {
    if (!isJamActive || !isHost || !roomId) return;

    const interval = setInterval(() => {
      const state = useSpotifyPlayerStore.getState();
      if (!state.currentTrack) return;

      const now = Date.now() + useJamStore.getState().serverTimeOffset;

      // 1. Regular 3-second heartbeat to all listeners
      socket.emit('jam:host_sync', {
        roomId,
        trackId: state.currentTrack.id,
        positionMs: state.progressMs,
        isPlaying: state.isPlaying,
        timestamp: now,
        currentTrack: state.currentTrack,
      });

      // 2. Pre-buffering / Gapless playback signal (10-15s before track ends)
      const remainingMs = state.durationMs - state.progressMs;
      if (state.isPlaying && remainingMs > 0 && remainingMs <= 15_000 && state.queue.length > 0) {
        const nextTrack = state.queue[0];
        if (nextTrack && nextTrack.id !== lastPreloadedTrackIdRef.current) {
          lastPreloadedTrackIdRef.current = nextTrack.id;
          socket.emit('jam:preload_next', {
            roomId,
            trackId: nextTrack.id,
            streamUrl: nextTrack.streamUrl,
          });
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isJamActive, isHost, roomId, socket]);

  // =========================================================================
  // 7. HOST MANUAL SEEK / PLAY / PAUSE IMMEDIATE SYNC (300ms throttled)
  // =========================================================================
  const emitManualHostSync = useCallback(() => {
    if (!isJamActive || !isHost || !roomId) return;
    const now = Date.now();
    if (now - lastManualSyncTimeRef.current < 300) return; // 300ms throttling
    lastManualSyncTimeRef.current = now;

    const state = useSpotifyPlayerStore.getState();
    const serverTimestamp = now + useJamStore.getState().serverTimeOffset;

    socket.emit('jam:host_sync', {
      roomId,
      trackId: state.currentTrack?.id,
      positionMs: state.progressMs,
      isPlaying: state.isPlaying,
      timestamp: serverTimestamp,
      currentTrack: state.currentTrack,
    });
  }, [isJamActive, isHost, roomId, socket]);

  // =========================================================================
  // 8. PUBLIC API ACTIONS
  // =========================================================================
  const createJam = useCallback(
    (customQueuePolicy: JamQueuePolicy = 'dj_only') => {
      const track = useSpotifyPlayerStore.getState().currentTrack;
      socket.emit('jam:create', {
        initialTrack: track || null,
        queuePolicy: customQueuePolicy,
      });
      useJamStore.getState().setJamPopoverOpen(true);
    },
    [socket],
  );

  const joinJam = useCallback(
    (targetRoomId: string) => {
      socket.emit('jam:join', { roomId: targetRoomId });
      measureServerTimeOffset();
    },
    [socket, measureServerTimeOffset],
  );

  const leaveJam = useCallback(() => {
    if (roomId) {
      socket.emit('jam:leave', { roomId });
    }
    useJamStore.getState().resetJam();
    const audio = getGlobalAudioElement();
    if (audio) audio.playbackRate = 1.0;
  }, [roomId, socket]);

  const updateQueuePolicy = useCallback(
    (newPolicy: JamQueuePolicy) => {
      if (!roomId || !isHost) return;
      socket.emit('jam:update_policy', { roomId, queuePolicy: newPolicy });
    },
    [roomId, isHost, socket],
  );

  const addToJamQueue = useCallback(
    (track: SpotifyTrack) => {
      if (!roomId) return;
      socket.emit('jam:queue_add', { roomId, track });
    },
    [roomId, socket],
  );

  return {
    roomId,
    isHost,
    isJamActive,
    isPausedLocally,
    queuePolicy,
    hostUsername: useJamStore((s) => s.hostUsername),
    hostAvatar: useJamStore((s) => s.hostAvatar),
    listeners: useJamStore((s) => s.listeners),
    roomQueue: useJamStore((s) => s.roomQueue),
    createJam,
    joinJam,
    leaveJam,
    updateQueuePolicy,
    addToJamQueue,
    handleLocalPause,
    handleLocalResume,
    emitManualHostSync,
  };
}
