import type { SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';

export interface MusicLikeToggledDetail {
  track: SpotifyTrack;
  isLiked: boolean;
}

export interface MusicPlayRequestDetail {
  track: SpotifyTrack;
  queue?: SpotifyTrack[];
  contextName?: string;
}

export interface MusicTrackPlayedDetail {
  track: SpotifyTrack;
  playlistId?: string;
  playlistTitle?: string;
}

/**
 * Event-driven bridge to decouple useSpotifyPlayerStore and useMusicHubStore,
 * preventing cyclic imports and infinite re-render loops.
 */
export const musicEventBridge = {
  emitLikeToggled: (track: SpotifyTrack, isLiked: boolean) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent<MusicLikeToggledDetail>('eternal:music-like-toggled', {
        detail: { track, isLiked },
      }),
    );
  },

  onLikeToggled: (handler: (detail: MusicLikeToggledDetail) => void) => {
    if (typeof window === 'undefined') return () => {};
    const listener = (e: Event) => {
      const customEvent = e as CustomEvent<MusicLikeToggledDetail>;
      if (customEvent.detail) {
        handler(customEvent.detail);
      }
    };
    window.addEventListener('eternal:music-like-toggled', listener);
    return () => window.removeEventListener('eternal:music-like-toggled', listener);
  },

  emitPlayRequested: (track: SpotifyTrack, queue?: SpotifyTrack[], contextName?: string) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent<MusicPlayRequestDetail>('eternal:music-play-requested', {
        detail: { track, queue, contextName },
      }),
    );
  },

  onPlayRequested: (handler: (detail: MusicPlayRequestDetail) => void) => {
    if (typeof window === 'undefined') return () => {};
    const listener = (e: Event) => {
      const customEvent = e as CustomEvent<MusicPlayRequestDetail>;
      if (customEvent.detail) {
        handler(customEvent.detail);
      }
    };
    window.addEventListener('eternal:music-play-requested', listener);
    return () => window.removeEventListener('eternal:music-play-requested', listener);
  },

  emitTrackPlayed: (track: SpotifyTrack, playlistId?: string, playlistTitle?: string) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent<MusicTrackPlayedDetail>('eternal:music-track-played', {
        detail: { track, playlistId, playlistTitle },
      }),
    );
  },

  onTrackPlayed: (handler: (detail: MusicTrackPlayedDetail) => void) => {
    if (typeof window === 'undefined') return () => {};
    const listener = (e: Event) => {
      const customEvent = e as CustomEvent<MusicTrackPlayedDetail>;
      if (customEvent.detail) {
        handler(customEvent.detail);
      }
    };
    window.addEventListener('eternal:music-track-played', listener);
    return () => window.removeEventListener('eternal:music-track-played', listener);
  },
};
