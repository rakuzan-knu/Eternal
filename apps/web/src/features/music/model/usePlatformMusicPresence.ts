import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/shared/api/socket';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { useJamStore } from './useJamStore';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { SHOWCASE_QUERY_KEY } from '@/entities/showcase/model/useShowcase';

/**
 * Broadcasts real-time platform music activity to other users across the network
 * whenever the user listens to music in the web player.
 */
export function usePlatformMusicPresence() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.userId);
  const { data: currentUser } = useCurrentUser();
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

    // 1. Stopped or dock closed completely (via "X" button)
    if (!currentTrack || !isDockVisible) {
      if (lastEmittedRef.current.trackId) {
        socket.emit('user:activity:platform_music', {
          track: null,
          isPlaying: false,
          progressMs: 0,
          durationMs: 0,
        });

        // Optimistically clear local stores immediately
        usePresenceStore.getState().setUserActivity(currentUserId, null);
        if (currentUser?.username) {
          queryClient.setQueryData([SHOWCASE_QUERY_KEY, currentUser.username], (old: any) =>
            old ? { ...old, activityStatus: null } : old,
          );
        }

        lastEmittedRef.current = {};
      }
      return;
    }

    // 2. Playing or Paused with an active track
    const isStateChanged =
      lastEmittedRef.current.trackId !== currentTrack.id ||
      lastEmittedRef.current.isPlaying !== isPlaying;

    if (isStateChanged) {
      lastEmittedRef.current = {
        trackId: currentTrack.id,
        isPlaying,
        timestamp: Date.now(),
      };

      const playerState = useSpotifyPlayerStore.getState();
      const pMs = playerState.progressMs ?? progressMs ?? 0;
      const dMs = playerState.durationMs || durationMs || currentTrack.durationMs || 180000;

      const activityStatus = {
        type: 'spotify',
        title: currentTrack.title,
        subtitle: currentTrack.artist || 'Music Hub',
        artist: currentTrack.artist,
        imageUrl: currentTrack.albumArt || null,
        externalUrl: currentTrack.spotifyUrl || null,
        trackId: currentTrack.id,
        progressMs: pMs,
        durationMs: dMs,
        startedAt: new Date(Date.now() - pMs).toISOString(),
        updatedAt: Date.now(),
        isPaused: !isPlaying,
        pausedAt: !isPlaying ? Date.now() : null,
        jamRoomId: jamRoomId || null,
        isPlatformTrack: true,
        source:
          currentTrack.source || (currentTrack.id?.startsWith('sc-') ? 'soundcloud' : 'platform'),
      };

      // Optimistically update local presence and showcase queries immediately
      usePresenceStore.getState().setUserActivity(currentUserId, activityStatus);
      if (currentUser?.username) {
        queryClient.setQueryData([SHOWCASE_QUERY_KEY, currentUser.username], (old: any) =>
          old ? { ...old, activityStatus } : old,
        );
      }

      socket.emit('user:activity:platform_music', {
        track: currentTrack,
        isPlaying,
        progressMs: pMs,
        durationMs: dMs,
        jamRoomId: jamRoomId || undefined,
      });
    }
  }, [
    currentUserId,
    currentUser?.username,
    currentTrack,
    isPlaying,
    isDockVisible,
    jamRoomId,
    progressMs,
    durationMs,
    queryClient,
  ]);

  // Periodic heartbeat: 15s while playing, 30s while paused to keep server timeline synced
  useEffect(() => {
    if (!currentUserId || !currentTrack || !isDockVisible) return;
    const socket = getSocket();
    if (!socket || !socket.connected) return;

    const intervalMs = isPlaying ? 15_000 : 30_000;
    const interval = setInterval(() => {
      const state = useSpotifyPlayerStore.getState();
      if (state.currentTrack && state.isDockVisible) {
        socket.emit('user:activity:platform_music', {
          track: state.currentTrack,
          isPlaying: state.isPlaying,
          progressMs: state.progressMs,
          durationMs: state.durationMs,
          jamRoomId: useJamStore.getState().roomId || undefined,
        });
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [currentUserId, currentTrack?.id, isPlaying, isDockVisible]);
}
