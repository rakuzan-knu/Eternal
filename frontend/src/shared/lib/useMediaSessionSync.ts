import { useEffect } from 'react';
import { useActiveMediaPlaybackStore } from '../model/useActiveMediaPlaybackStore';

export function useMediaSessionSync() {
  const {
    activeMediaId,
    senderName,
    senderAvatar,
    conversationTitle,
    mediaType,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    togglePlay,
    playNext,
    playPrev,
    seekRelative,
    seek,
  } = useActiveMediaPlaybackStore();

  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    if (!activeMediaId) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      return;
    }

    // Set Track Metadata
    const typeLabel = mediaType === 'video' ? 'Video Note' : 'Voice Message';
    const artworkList: MediaImage[] = senderAvatar
      ? [{ src: senderAvatar, sizes: '512x512', type: 'image/png' }]
      : [{ src: '/vite.svg', sizes: '192x192', type: 'image/svg+xml' }];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: senderName ? `${senderName} (${typeLabel})` : typeLabel,
      artist: conversationTitle || 'Eternal Messenger',
      album: 'Eternal Chat Audio',
      artwork: artworkList,
    });

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    // Set Action Handlers for OS & Hardware media keys
    const setAction = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some browsers may not support specific actions
      }
    };

    setAction('play', () => togglePlay());
    setAction('pause', () => togglePlay());
    setAction('previoustrack', () => playPrev());
    setAction('nexttrack', () => playNext());
    setAction('seekbackward', (details) => seekRelative(-(details.seekOffset || 5)));
    setAction('seekforward', (details) => seekRelative(details.seekOffset || 5));
    setAction('seekto', (details) => {
      if (details.seekTime !== undefined && details.seekTime !== null) {
        seek(details.seekTime);
      }
    });

    // Update Position State
    if (duration > 0 && typeof navigator.mediaSession.setPositionState === 'function') {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(duration, 0.1),
          playbackRate: playbackRate || 1,
          position: Math.min(Math.max(currentTime, 0), duration),
        });
      } catch {
        // Ignored if out of bounds or unsupported
      }
    }

    return () => {
      setAction('play', null);
      setAction('pause', null);
      setAction('previoustrack', null);
      setAction('nexttrack', null);
      setAction('seekbackward', null);
      setAction('seekforward', null);
      setAction('seekto', null);
    };
  }, [
    activeMediaId,
    senderName,
    senderAvatar,
    conversationTitle,
    mediaType,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    togglePlay,
    playNext,
    playPrev,
    seekRelative,
    seek,
  ]);
}
