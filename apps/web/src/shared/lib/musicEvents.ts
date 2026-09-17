export interface SpotifyTrackMeta {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  durationMs: number;
  previewUrl: string | null;
  spotifyUrl: string;
  contextName?: string;
  source?: 'spotify' | 'soundcloud' | 'platform';
  streamUrl?: string;
  artistAvatar?: string;
  album?: string;
  addedAt?: string;
  releaseDate?: string;
}

export interface MusicLikeToggledDetail {
  track: SpotifyTrackMeta;
  isLiked: boolean;
}

export interface MusicPlayRequestDetail {
  track: SpotifyTrackMeta;
  queue?: SpotifyTrackMeta[];
  contextName?: string;
}

export interface MusicTrackPlayedDetail {
  track: SpotifyTrackMeta;
  playlistId?: string;
  playlistTitle?: string;
}

/**
 * Event-driven bridge to decouple useSpotifyPlayerStore and useMusicHubStore,
 * preventing cyclic imports and infinite re-render loops.
 */
export const musicEventBridge = {
  emitLikeToggled: (track: SpotifyTrackMeta, isLiked: boolean) => {
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

  emitPlayRequested: (
    track: SpotifyTrackMeta,
    queue?: SpotifyTrackMeta[],
    contextName?: string,
  ) => {
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

  emitTrackPlayed: (track: SpotifyTrackMeta, playlistId?: string, playlistTitle?: string) => {
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
