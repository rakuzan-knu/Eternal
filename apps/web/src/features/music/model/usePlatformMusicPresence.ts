import { useEffect, useRef } from 'react';
import { getSocket } from '@/shared/api/socket';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { useJamStore } from './useJamStore';
import { useAuthStore } from '@/shared/model/useAuthStore';

/**
 * Broadcasts real-time platform music activity to other users across the network
 * whenever the user listens to music in the web player.
 */
export function usePlatformMusicPresence() {
  const currentUserId = useAuthStore((s) => s.userId);
  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const isPlaying = useSpotifyPlayerStore((s) => s.isPlaying);
  const progressMs = useSpotifyPlayerStore((s) => s.progressMs);
  const durationMs = useSpotifyPlayerStore((s) => s.durationMs);
  const isDockVisible = useSpotifyPlayerStore((s) => s.isDockVisible);
  const jamRoomId = useJamStore((s) => s.roomId);

  const lastEmittedRef = useRef<{
    trackId?: string;
    isPlaying?: boolean;
    timestamp?: number;
  }>({});

  useEffect(() => {
    if (!currentUserId) return;
    const socket = getSocket();
    if (!socket || !socket.connected) return;

    if (!isDockVisible || !currentTrack) {
      // Clear activity if player was closed
      if (lastEmittedRef.current.trackId) {
        socket.emit('user:activity:platform_music', {
          track: null,
          isPlaying: false,
          progressMs: 0,
          durationMs: 0,
        });
        lastEmittedRef.current = {};
      }
      return;
    }

    const isStateChanged =
      lastEmittedRef.current.trackId !== currentTrack.id ||
      lastEmittedRef.current.isPlaying !== isPlaying;

    if (isStateChanged) {
      lastEmittedRef.current = {
        trackId: currentTrack.id,
        isPlaying,
        timestamp: Date.now(),
      };

      socket.emit('user:activity:platform_music', {
        track: currentTrack,
        isPlaying,
        progressMs,
        durationMs,
        jamRoomId: jamRoomId || undefined,
      });
    }
  }, [currentUserId, currentTrack, isPlaying, isDockVisible, progressMs, durationMs, jamRoomId]);

  // Periodic heartbeat every 15s to keep active timeline synced for profile visitors
  useEffect(() => {
    if (!currentUserId || !isDockVisible || !currentTrack || !isPlaying) return;
    const socket = getSocket();
    if (!socket || !socket.connected) return;

    const interval = setInterval(() => {
      const state = useSpotifyPlayerStore.getState();
      if (state.currentTrack && state.isPlaying) {
        socket.emit('user:activity:platform_music', {
          track: state.currentTrack,
          isPlaying: state.isPlaying,
          progressMs: state.progressMs,
          durationMs: state.durationMs,
          jamRoomId: useJamStore.getState().roomId || undefined,
        });
      }
    }, 15_000);

    return () => clearInterval(interval);
  }, [currentUserId, isDockVisible, currentTrack, isPlaying]);
}
