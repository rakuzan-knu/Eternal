import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Hls from 'hls.js';
import { registerSessionResetHandler } from './resetSession';
import { audioCoordinator } from '@/shared/lib/audioCoordinator';
import {
  extractSpotifyTrackId,
  unescapeHtml,
  isTrustedMessageOrigin,
  isAppleAudioUrl,
} from '@/shared/lib/spotifyUrl';
import { useAuthStore } from './useAuthStore';
import { musicEventBridge } from '@/shared/lib/musicEvents';
import { integrationsApi } from '../api/integrationsApi';

declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

export interface SpotifyTrack {
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

export type RepeatMode = 0 | 1 | 2; // 0: off, 1: repeat playlist/queue, 2: repeat 1 track infinite

interface SpotifyPlayerState {
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  volume: number; // 0.0 - 1.0
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  unshuffledQueue: SpotifyTrack[];
  queue: SpotifyTrack[];
  history: SpotifyTrack[];
  isLiked: boolean;
  isLyricsOpen: boolean;
  isQueueOpen: boolean;
  isVolumeOpen: boolean;
  isDockVisible: boolean;
  isDockMinimized: boolean;
  isMobileExpanded: boolean;
  isSdkReady: boolean;
  deviceId: string | null;
  needsSpotifyPermissions: boolean;
  isGameModeOpen: boolean;
  isLoadingQueue: boolean;
  queueSource: 'playlist' | 'infinite-audio' | 'custom';
  queueOffset: number;

  // Actions
  initSpotifySDK: (forceReconnect?: boolean) => void;
  reauthorizeSpotify: () => void;
  playTrack: (
    track: SpotifyTrack,
    newQueue?: SpotifyTrack[],
    contextName?: string,
    addToHistory?: boolean,
  ) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (targetMs: number) => void;
  seekRelative: (deltaSeconds: number) => void;
  prevTrack: () => void;
  nextTrack: () => void | Promise<void>;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  toggleLike: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleLyrics: () => void;
  setLyricsOpen: (open: boolean) => void;
  toggleQueue: () => void;
  setQueueOpen: (open: boolean) => void;
  setVolumeOpen: (open: boolean) => void;
  setMobileExpanded: (expanded: boolean) => void;
  addToQueue: (track: SpotifyTrack) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setQueue: (tracks: SpotifyTrack[], source?: 'playlist' | 'infinite-audio' | 'custom') => void;
  loadInfiniteAudioQueue: (forceRefresh?: boolean, append?: boolean) => Promise<void>;
  closeDock: () => void;
  openDock: () => void;
  toggleDockMinimized: () => void;
  setDockMinimized: (minimized: boolean) => void;
  toggleGameMode: () => void;
  setGameModeOpen: (open: boolean) => void;
}

// Global Singletons
let sdkPlayerInstance: any = null;
let sdkDeviceId: string | null = null;
let globalAudio: HTMLAudioElement | null = null;
let activeHlsInstance: Hls | null = null;
let isRetryingSoundCloud = false;
let progressInterval: any = null;
let sdkScriptLoading = false;
let isTransitioningTrack = false;
let activeQueuePromise: Promise<void> | null = null;

export const getGlobalAudioElement = (): HTMLAudioElement | null => globalAudio;
export const getSdkPlayerInstance = (): any => sdkPlayerInstance;

const teardownSoundCloudAudio = () => {
  if (activeHlsInstance) {
    try {
      activeHlsInstance.destroy();
    } catch {}
    activeHlsInstance = null;
  }
  if (globalAudio) {
    try {
      globalAudio.pause();
      globalAudio.removeAttribute('src');
      globalAudio.load();
    } catch {}
  }
};

const handleSoundCloudTokenExpiration = async (trackId?: string) => {
  const state = useSpotifyPlayerStore.getState();
  const cur = state.currentTrack;
  const targetId = trackId || cur?.id;
  if (!targetId || isRetryingSoundCloud) return;

  isRetryingSoundCloud = true;
  try {
    console.log(
      '[SoundCloud Player] Stream token expired (403/network error). Requesting fresh stream URL...',
    );
    const fresh = await integrationsApi.getSoundCloudStream(targetId, true);
    if (fresh?.streamUrl) {
      const pos = state.progressMs;
      startSoundCloudPlayback(targetId, fresh.streamUrl, fresh.isHls, pos);
    }
  } catch (err) {
    console.warn('[SoundCloud Player] Failed to refresh stream token:', err);
  } finally {
    setTimeout(() => {
      isRetryingSoundCloud = false;
    }, 3000);
  }
};

const setAudioTimeWhenReady = (audio: HTMLAudioElement, timeSec: number) => {
  if (timeSec <= 0) return;
  if (audio.readyState >= 1) {
    try {
      audio.currentTime = timeSec;
    } catch {}
  } else {
    const onLoaded = () => {
      try {
        audio.currentTime = timeSec;
      } catch {}
      audio.removeEventListener('loadedmetadata', onLoaded);
    };
    audio.addEventListener('loadedmetadata', onLoaded, { once: true });
  }
};

const startSoundCloudPlayback = (
  trackId: string,
  url: string,
  isHlsStream: boolean,
  startTimeMs: number = 0,
) => {
  const audio = getOrCreateAudio();
  const store = useSpotifyPlayerStore.getState();
  audio.volume = store.isMuted ? 0 : store.volume;

  // Strictly tear down any previously active Hls.js instance before new stream
  if (activeHlsInstance) {
    try {
      activeHlsInstance.destroy();
    } catch {}
    activeHlsInstance = null;
  }

  if (isHlsStream) {
    // 1. Native HLS for Safari (iOS / macOS WebKit)
    if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = url;
      setAudioTimeWhenReady(audio, startTimeMs / 1000);
      audioCoordinator.play(audio, 'spotify-bottom-dock');
      audio.play().catch(() => {
        handleSoundCloudTokenExpiration(trackId);
      });
    } else if (Hls.isSupported()) {
      // 2. Chrome, Firefox, Edge via hls.js
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(url);
      hls.attachMedia(audio);
      activeHlsInstance = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setAudioTimeWhenReady(audio, startTimeMs / 1000);
        audioCoordinator.play(audio, 'spotify-bottom-dock');
        audio.play().catch(() => {
          handleSoundCloudTokenExpiration(trackId);
        });
      });

      hls.on(Hls.Events.ERROR, async (_event, data) => {
        const isNetworkErr =
          (data as any).type === Hls.ErrorTypes.NETWORK_ERROR ||
          (data as any).response?.code === 403 ||
          (data as any).response?.code === 410;

        if (isNetworkErr) {
          handleSoundCloudTokenExpiration(trackId);
        } else if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              activeHlsInstance = null;
              break;
          }
        }
      });
    } else {
      audio.src = url;
      setAudioTimeWhenReady(audio, startTimeMs / 1000);
      audioCoordinator.play(audio, 'spotify-bottom-dock');
      audio.play().catch(() => {
        handleSoundCloudTokenExpiration(trackId);
      });
    }
  } else {
    // Progressive MP3 direct playback
    audio.src = url;
    setAudioTimeWhenReady(audio, startTimeMs / 1000);
    audioCoordinator.play(audio, 'spotify-bottom-dock');
    audio.play().catch(() => {
      handleSoundCloudTokenExpiration(trackId);
    });
  }
};

const getOrCreateAudio = (): HTMLAudioElement => {
  if (!globalAudio && typeof window !== 'undefined') {
    globalAudio = new Audio();
    globalAudio.preload = 'auto';

    globalAudio.addEventListener('ended', () => {
      handleTrackEnded();
    });

    globalAudio.addEventListener('loadedmetadata', () => {
      if (
        globalAudio &&
        globalAudio.duration &&
        !isNaN(globalAudio.duration) &&
        isFinite(globalAudio.duration)
      ) {
        const actualDurMs = Math.floor(globalAudio.duration * 1000);
        if (actualDurMs > 0) {
          useSpotifyPlayerStore.setState({ durationMs: actualDurMs });
        }
      }
    });

    globalAudio.addEventListener('timeupdate', () => {
      const state = useSpotifyPlayerStore.getState();
      const cur = state.currentTrack;
      if (cur) {
        const posMs = Math.floor(globalAudio!.currentTime * 1000);
        // Defensive check: if player is paused, ignore any 0-second timeupdate so paused position is NEVER wiped!
        if (!state.isPlaying && posMs === 0 && state.progressMs > 0) {
          return;
        }
        if (state.isPlaying) {
          useSpotifyPlayerStore.setState({ progressMs: posMs });
        }
      }
    });

    globalAudio.addEventListener('error', () => {
      const state = useSpotifyPlayerStore.getState();
      const cur = state.currentTrack;
      if (
        cur &&
        (cur.source === 'soundcloud' ||
          cur.id.startsWith('sc-') ||
          cur.id.startsWith('soundcloud-'))
      ) {
        handleSoundCloudTokenExpiration(cur.id);
      }
    });

    // Global audio coordinator listeners
    window.addEventListener('app:audio-play', (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail && detail.id !== 'spotify-bottom-dock') {
        useSpotifyPlayerStore.getState().pause();
      }
    });

    window.addEventListener('app:audio-stop', (e: Event) => {
      const detail = (e as CustomEvent<{ id?: string }>).detail;
      if (detail && detail.id === 'spotify-bottom-dock') {
        if (useSpotifyPlayerStore.getState().isPlaying) {
          useSpotifyPlayerStore.getState().pause();
        }
      }
    });
  }
  return globalAudio!;
};

const stopProgressTimer = () => {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
};

const startProgressTimer = () => {
  stopProgressTimer();
  progressInterval = setInterval(() => {
    const state = useSpotifyPlayerStore.getState();
    if (!state.isPlaying || !state.currentTrack) return;

    const isSoundCloud = Boolean(
      state.currentTrack.source === 'soundcloud' ||
      state.currentTrack.id.startsWith('sc-') ||
      state.currentTrack.id.startsWith('soundcloud-'),
    );

    // If using SoundCloud / HTML5 audio, progress is managed via native timeupdate/ended
    if (isSoundCloud) return;

    // If using Web Playback SDK, state.progressMs is periodically updated by player_state_changed
    // But we tick locally by 500ms for ultra-smooth UI scrubber interpolation
    const nextMs = state.progressMs + 500;
    if (nextMs >= state.durationMs - 600) {
      handleTrackEnded();
    } else {
      useSpotifyPlayerStore.setState({ progressMs: nextMs });
    }
  }, 500);
};

const handleTrackEnded = async () => {
  if (isTransitioningTrack) return;
  isTransitioningTrack = true;

  const state = useSpotifyPlayerStore.getState();
  const { repeatMode, currentTrack, queue, history, playTrack, seek, pause } = state;

  if (repeatMode === 2) {
    // Repeat One: infinite loop current track
    seek(0);
    useSpotifyPlayerStore.setState({ isPlaying: true, progressMs: 0 });
    if (sdkPlayerInstance && sdkDeviceId) {
      sdkPlayerInstance.seek(0).catch(() => {});
      sdkPlayerInstance.resume().catch(() => {});
      if (currentTrack?.id) {
        integrationsApi.playSpotifyTrackOnDevice(sdkDeviceId, currentTrack.id, 0).catch(() => {});
      }
    } else if (globalAudio) {
      globalAudio.currentTime = 0;
      globalAudio.play().catch(() => {});
    }
    setTimeout(() => {
      isTransitioningTrack = false;
    }, 1500);
    return;
  }

  if (repeatMode === 1) {
    // Repeat Queue / Context
    if (queue.length > 0) {
      const [nextTrackItem, ...remainingQueue] = queue;
      playTrack(nextTrackItem, remainingQueue, undefined, true);
    } else if (history.length > 0) {
      // Loop entire queue history from beginning
      const fullHistory = [...history, ...(currentTrack ? [currentTrack] : [])];
      const reversed = fullHistory.reverse();
      const [firstTrack, ...rest] = reversed;
      useSpotifyPlayerStore.setState({ history: [], queue: rest });
      playTrack(firstTrack, rest, undefined, false);
    } else if (currentTrack) {
      // Single track in queue / context: loop it!
      seek(0);
      useSpotifyPlayerStore.setState({ isPlaying: true, progressMs: 0 });
      if (sdkPlayerInstance && sdkDeviceId) {
        sdkPlayerInstance.seek(0).catch(() => {});
        sdkPlayerInstance.resume().catch(() => {});
        integrationsApi.playSpotifyTrackOnDevice(sdkDeviceId, currentTrack.id, 0).catch(() => {});
      } else if (globalAudio) {
        globalAudio.currentTime = 0;
        globalAudio.play().catch(() => {});
      }
    }
    setTimeout(() => {
      isTransitioningTrack = false;
    }, 1500);
    return;
  }

  // 1. If queue already has tracks, advance immediately
  if (queue.length > 0) {
    const [nextTrackItem, ...remainingQueue] = queue;
    playTrack(nextTrackItem, remainingQueue, undefined, true);
    if (remainingQueue.length <= 2) {
      useSpotifyPlayerStore
        .getState()
        .loadInfiniteAudioQueue(true, true)
        .catch(() => {});
    }
    setTimeout(() => {
      isTransitioningTrack = false;
    }, 1500);
    return;
  }

  // 2. If queue is empty, dynamically fetch Infinite Audio and advance
  if (currentTrack) {
    try {
      await useSpotifyPlayerStore.getState().loadInfiniteAudioQueue(true);
      const freshQueue = useSpotifyPlayerStore.getState().queue;
      if (freshQueue.length > 0) {
        const [nextTrackItem, ...remainingQueue] = freshQueue;
        playTrack(nextTrackItem, remainingQueue, undefined, true);
        setTimeout(() => {
          isTransitioningTrack = false;
        }, 1500);
        return;
      }
    } catch (err) {
      console.warn('[Spotify Player] Auto-play next track error:', err);
    }
  }

  // Fallback: seek to 0 and pause
  seek(0);
  pause();
  setTimeout(() => {
    isTransitioningTrack = false;
  }, 1500);
};

const sendDebugLog = (_event: string, _data?: any) => {};

export const useSpotifyPlayerStore = create<SpotifyPlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      progressMs: 0,
      durationMs: 180000,
      volume: 0.8,
      isMuted: false,
      repeatMode: 0,
      isShuffled: false,
      unshuffledQueue: [],
      queue: [],
      history: [],
      isLiked: false,
      isLyricsOpen: false,
      isQueueOpen: false,
      isVolumeOpen: false,
      isDockVisible: false,
      isDockMinimized: false,
      isMobileExpanded: false,
      isSdkReady: false,
      deviceId: null,
      needsSpotifyPermissions: false,
      isGameModeOpen: false,
      isLoadingQueue: false,
      queueSource: 'infinite-audio',
      queueOffset: 0,

      /**
       * Initializes official Spotify Web Playback SDK (full premium audio streaming)
       */
      initSpotifySDK: (forceReconnect = false) => {
        if (typeof window === 'undefined') return;

        if (forceReconnect && sdkPlayerInstance) {
          try {
            sdkPlayerInstance.disconnect();
          } catch {}
          sdkPlayerInstance = null;
          sdkDeviceId = null;
          set({ isSdkReady: false, deviceId: null });
        }

        if (sdkPlayerInstance) return;

        const setupPlayer = () => {
          sendDebugLog('setupPlayer_invoked', {
            hasSpotify: !!window.Spotify,
            hasPlayer: !!window.Spotify?.Player,
          });
          if (!window.Spotify || !window.Spotify.Player) return;

          const player = new window.Spotify.Player({
            name: 'Antigravity Liquid Player',
            getOAuthToken: async (cb: (token: string) => void) => {
              try {
                const data = await integrationsApi.getSpotifyUserToken();
                sendDebugLog('getOAuthToken_called', {
                  hasToken: !!data?.accessToken,
                  expiresIn: data?.expiresIn,
                });
                if (data?.accessToken) {
                  cb(data.accessToken);
                }
              } catch (err: any) {
                sendDebugLog('getOAuthToken_error', { message: err?.message });
              }
            },
            volume: get().volume,
          });

          player.addListener('ready', ({ device_id }: { device_id: string }) => {
            sdkDeviceId = device_id;
            set({ isSdkReady: true, deviceId: device_id });
            console.log('[Spotify SDK] Device ready:', device_id);
            sendDebugLog('sdk_ready', { device_id });

            if (player && typeof player.setVolume === 'function') {
              player.setVolume(get().volume || 0.8).catch(() => {});
            }

            const state = get();
            if (state.currentTrack && state.isPlaying) {
              if (globalAudio) {
                globalAudio.pause();
                globalAudio.src = '';
              }
              integrationsApi
                .playSpotifyTrackOnDevice(device_id, state.currentTrack.id, state.progressMs)
                .then((r) => {
                  sendDebugLog('play_on_ready_result', r);
                  if (r?.success && sdkPlayerInstance) {
                    sdkPlayerInstance.setVolume(get().volume || 0.8).catch(() => {});
                    sdkPlayerInstance.resume().catch(() => {});
                  }
                })
                .catch((e) => sendDebugLog('play_on_ready_catch', { message: e?.message }));
            }
          });

          player.addListener('not_ready', () => {
            sdkDeviceId = null;
            set({ isSdkReady: false, deviceId: null });
            sendDebugLog('sdk_not_ready');
          });

          player.addListener('player_state_changed', (state: any) => {
            if (!state) return;
            const isPaused = state.paused;
            const pos = state.position;
            const dur = state.duration;

            sendDebugLog('player_state_changed', {
              isPaused,
              pos,
              dur,
              track: state.track_window?.current_track?.name,
            });

            // If track transition is actively occurring, ignore transient SDK paused state!
            if (isTransitioningTrack) {
              return;
            }

            const prevProgress = get().progressMs;
            const wasPlaying = get().isPlaying;

            // Auto-advance / repeat when track reaches the end
            const isDisallowedResuming = Boolean(
              state.disallows?.resuming ||
              (Array.isArray(state.restrictions?.disallow_resuming_reasons) &&
                state.restrictions.disallow_resuming_reasons.length > 0),
            );
            const wasNearEnd = prevProgress > 0 && dur > 0 && prevProgress >= dur - 5000;
            const isNearEnd = dur > 0 && pos >= dur - 1500;
            const isNaturalEndTransition =
              isPaused &&
              pos === 0 &&
              dur > 0 &&
              (wasNearEnd || (wasPlaying && prevProgress > 5000) || isDisallowedResuming);

            const isAtEnd = isNearEnd || isNaturalEndTransition;
            if (isPaused && isAtEnd) {
              handleTrackEnded();
              return;
            }

            const sdkTrack = state.track_window?.current_track;
            let curTrack = get().currentTrack;
            let trackChanged = false;

            if (sdkTrack && (sdkTrack.id || sdkTrack.name)) {
              const cleanSdkId = extractSpotifyTrackId(sdkTrack.id) || sdkTrack.id;
              const currentId = curTrack ? extractSpotifyTrackId(curTrack) || curTrack.id : null;
              const isDifferent =
                !curTrack ||
                (cleanSdkId && currentId !== cleanSdkId) ||
                (sdkTrack.name &&
                  curTrack.title.toLowerCase() !== unescapeHtml(sdkTrack.name).toLowerCase());

              if (isDifferent) {
                trackChanged = true;
                const artistName =
                  sdkTrack.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist';
                const albumArt =
                  sdkTrack.album?.images?.[0]?.url ||
                  sdkTrack.album?.images?.[1]?.url ||
                  curTrack?.albumArt ||
                  '';
                const newTrack: SpotifyTrack = {
                  id: cleanSdkId || sdkTrack.id || `track-${Date.now()}`,
                  title: unescapeHtml(sdkTrack.name),
                  artist: unescapeHtml(artistName),
                  albumArt,
                  durationMs: dur > 0 ? dur : sdkTrack.duration_ms || 180000,
                  previewUrl: null,
                  spotifyUrl: cleanSdkId ? `https://open.spotify.com/track/${cleanSdkId}` : '',
                  contextName: 'Spotify',
                };
                curTrack = newTrack;

                // Check if track is liked in platform library
                let isPlatformLiked = false;
                try {
                  const raw =
                    typeof window !== 'undefined'
                      ? localStorage.getItem('eternal-music-hub-v4') ||
                        localStorage.getItem('eternal-music-hub-v3') ||
                        localStorage.getItem('eternal-music-hub-v2')
                      : null;
                  if (raw) {
                    const parsed = JSON.parse(raw);
                    isPlatformLiked = Boolean(
                      parsed?.state?.likedTracks?.some(
                        (t: any) =>
                          (t.id === cleanSdkId || t.id === curTrack?.id) &&
                          !JSON.stringify(t).includes('Subvinc'),
                      ),
                    );
                  }
                } catch {}
                set({ isLiked: isPlatformLiked });
              }
            }

            const stateUpdates: Partial<SpotifyPlayerState> = {
              isPlaying: !isPaused,
              progressMs: pos,
              durationMs: dur > 0 ? dur : get().durationMs,
              needsSpotifyPermissions: false,
            };

            if (trackChanged && curTrack) {
              stateUpdates.currentTrack = curTrack;
              stateUpdates.isDockVisible = true;
            }

            // Extract upcoming playlist/context tracks from Spotify SDK track_window
            const sdkNextTracks = state.track_window?.next_tracks;
            if (Array.isArray(sdkNextTracks) && sdkNextTracks.length > 0) {
              const mappedQueue: SpotifyTrack[] = sdkNextTracks
                .filter((t: any) => t && (t.id || t.name))
                .map((t: any) => {
                  const cleanTId = extractSpotifyTrackId(t.id) || t.id;
                  const artistName =
                    t.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist';
                  const albumArt = t.album?.images?.[0]?.url || t.album?.images?.[1]?.url || '';
                  return {
                    id: cleanTId || `track-${Date.now()}`,
                    title: unescapeHtml(t.name),
                    artist: unescapeHtml(artistName),
                    albumArt,
                    durationMs: t.duration_ms || 180000,
                    previewUrl: null,
                    spotifyUrl: cleanTId ? `https://open.spotify.com/track/${cleanTId}` : '',
                    contextName: state.context?.metadata?.context_description || 'Spotify Playlist',
                  };
                });

              if (mappedQueue.length > 0) {
                stateUpdates.queue = mappedQueue;
                stateUpdates.unshuffledQueue = mappedQueue;
                stateUpdates.queueSource = 'playlist';
              }
            }

            // Extract previous tracks from Spotify SDK track_window for History
            const sdkPrevTracks = state.track_window?.previous_tracks;
            if (Array.isArray(sdkPrevTracks) && sdkPrevTracks.length > 0) {
              const mappedPrev: SpotifyTrack[] = sdkPrevTracks
                .filter((t: any) => t && (t.id || t.name))
                .map((t: any) => {
                  const cleanTId = extractSpotifyTrackId(t.id) || t.id;
                  const artistName =
                    t.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist';
                  const albumArt = t.album?.images?.[0]?.url || t.album?.images?.[1]?.url || '';
                  return {
                    id: cleanTId || `hist-${Date.now()}`,
                    title: unescapeHtml(t.name),
                    artist: unescapeHtml(artistName),
                    albumArt,
                    durationMs: t.duration_ms || 180000,
                    previewUrl: null,
                    spotifyUrl: cleanTId ? `https://open.spotify.com/track/${cleanTId}` : '',
                  };
                });

              if (mappedPrev.length > 0) {
                const existingHistory = get().history;
                const combined = [...mappedPrev.reverse(), ...existingHistory];
                stateUpdates.history = combined
                  .filter((item, idx, self) => idx === self.findIndex((h) => h.id === item.id))
                  .slice(0, 10);
              }
            }

            if (typeof state.repeat_mode === 'number' && [0, 1, 2].includes(state.repeat_mode)) {
              stateUpdates.repeatMode = state.repeat_mode as RepeatMode;
            }

            if (typeof state.shuffle === 'boolean') {
              stateUpdates.isShuffled = state.shuffle;
            }

            set(stateUpdates);
          });

          player.addListener('initialization_error', ({ message }: { message: string }) => {
            console.warn('Spotify SDK initialization_error:', message);
            sendDebugLog('initialization_error', { message });
          });

          player.addListener('authentication_error', ({ message }: { message: string }) => {
            console.warn('Spotify SDK authentication_error:', message);
            sendDebugLog('authentication_error', { message });
            set({ needsSpotifyPermissions: true });
          });

          player.addListener('account_error', ({ message }: { message: string }) => {
            console.warn('Spotify SDK account_error (Free account?):', message);
            sendDebugLog('account_error', { message });
          });

          player.addListener('autoplay_failed', () => {
            console.warn('Spotify SDK autoplay_failed: user interaction required');
            sendDebugLog('autoplay_failed');
          });

          player.addListener('playback_error', ({ message }: { message: string }) => {
            console.warn('Spotify SDK playback_error:', message);
            sendDebugLog('playback_error', { message });
          });

          player.connect().then((success: boolean) => {
            sendDebugLog('player_connect_promise', { success });
          });
          sdkPlayerInstance = player;
        };

        if (window.Spotify && window.Spotify.Player) {
          setupPlayer();
        } else {
          window.onSpotifyWebPlaybackSDKReady = setupPlayer;

          if (!sdkScriptLoading && !document.getElementById('spotify-player-sdk')) {
            sdkScriptLoading = true;
            const script = document.createElement('script');
            script.id = 'spotify-player-sdk';
            script.src = 'https://sdk.scdn.co/spotify-player.js';
            script.async = true;
            document.body.appendChild(script);
          }
        }
      },

      /**
       * One-click OAuth re-authorization to grant 'streaming' and 'user-modify-playback-state'
       */
      reauthorizeSpotify: () => {
        const userId = useAuthStore.getState().userId;
        const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const baseBackendUrl = rawApiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
        const targetUrl = `${baseBackendUrl}/integrations/spotify/auth?userId=${encodeURIComponent(userId || '')}`;

        const width = 640;
        const height = 750;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          targetUrl,
          'spotify_oauth_popup',
          `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`,
        );

        const handleAuthMessage = (event: MessageEvent) => {
          if (!isTrustedMessageOrigin(event.origin)) return;
          if (
            event.data?.type === 'INTEGRATION_AUTH_SUCCESS' &&
            event.data?.platform?.toLowerCase() === 'spotify'
          ) {
            window.removeEventListener('message', handleAuthMessage);
            try {
              if (popup && !popup.closed) popup.close();
            } catch {}

            set({ needsSpotifyPermissions: false });
            get().initSpotifySDK(true);

            const cur = get().currentTrack;
            if (cur) {
              setTimeout(() => {
                get().playTrack(cur, undefined, undefined, false);
              }, 800);
            }
          }
        };

        window.addEventListener('message', handleAuthMessage);
      },

      playTrack: (track, newQueue, contextName, addToHistory = true) => {
        const isSoundCloud = Boolean(
          track.source === 'soundcloud' ||
          track.id.startsWith('sc-') ||
          track.id.startsWith('soundcloud-'),
        );
        const safeTrackId = isSoundCloud ? track.id : extractSpotifyTrackId(track) || track.id;
        const sanitizedTrack: SpotifyTrack = {
          ...track,
          id: safeTrackId,
          title: unescapeHtml(track.title),
          artist: unescapeHtml(track.artist),
          contextName: contextName || track.contextName,
          source: isSoundCloud ? 'soundcloud' : 'spotify',
        };

        sendDebugLog('playTrack_called', {
          trackId: safeTrackId,
          title: sanitizedTrack.title,
          isSoundCloud,
          sdkDeviceId,
          hasPreview: !!sanitizedTrack.previewUrl,
        });

        if (!isSoundCloud) {
          // Unlock browser audio context / EME audio on user gesture for Spotify SDK
          if (sdkPlayerInstance) {
            if (typeof sdkPlayerInstance.activateElement === 'function') {
              sdkPlayerInstance.activateElement().catch(() => {});
            }
            if (typeof sdkPlayerInstance.setVolume === 'function') {
              sdkPlayerInstance.setVolume(get().volume || 0.8).catch(() => {});
            }
            if (typeof sdkPlayerInstance.resume === 'function') {
              sdkPlayerInstance.resume().catch(() => {});
            }
          }

          if (!sdkPlayerInstance) {
            get().initSpotifySDK();
          }
        }

        const current = get().currentTrack;

        // History tracking
        let updatedHistory = get().history;
        if (addToHistory && current && current.id !== safeTrackId) {
          updatedHistory = [current, ...updatedHistory.slice(0, 49)];
        }

        let updatedQueue: SpotifyTrack[] = [];
        if (newQueue !== undefined) {
          if (isSoundCloud) {
            // Strictly filter queue to SoundCloud tracks only when playing a SoundCloud track!
            updatedQueue = newQueue
              .filter((t) => t.id !== safeTrackId)
              .filter(
                (t) =>
                  t.source === 'soundcloud' ||
                  t.id?.startsWith('sc-') ||
                  t.id?.startsWith('soundcloud-') ||
                  Boolean(t.streamUrl),
              );
          } else {
            updatedQueue = newQueue.filter((t) => t.id !== safeTrackId);
          }
        }

        const trackDuration = sanitizedTrack.durationMs > 0 ? sanitizedTrack.durationMs : 180000;

        let isInitiallyLiked = false;
        try {
          const raw =
            typeof window !== 'undefined'
              ? localStorage.getItem('eternal-music-hub-v4') ||
                localStorage.getItem('eternal-music-hub-v3') ||
                localStorage.getItem('eternal-music-hub-v2')
              : null;
          if (raw) {
            const parsed = JSON.parse(raw);
            isInitiallyLiked = Boolean(
              parsed?.state?.likedTracks?.some(
                (t: any) =>
                  (t.id === safeTrackId ||
                    (t.source === 'spotify' && extractSpotifyTrackId(t) === safeTrackId)) &&
                  !JSON.stringify(t).includes('Subvinc'),
              ),
            );
          }
        } catch {}

        set({
          currentTrack: sanitizedTrack,
          isPlaying: true,
          progressMs: 0,
          durationMs: trackDuration,
          isDockVisible: true,
          isDockMinimized: false,
          history: updatedHistory,
          queue: updatedQueue,
          unshuffledQueue: updatedQueue,
          isLiked: isInitiallyLiked,
        });

        // Notify listeners that a track was played
        musicEventBridge.emitTrackPlayed(sanitizedTrack, undefined, contextName);

        // Proactively preload Infinite Audio queue in the background if queue is empty
        if (updatedQueue.length === 0 && safeTrackId) {
          setTimeout(() => {
            const s = useSpotifyPlayerStore.getState();
            if (s.currentTrack && s.queue.length === 0) {
              s.loadInfiniteAudioQueue();
            }
          }, 50);
        }

        // 1. Play SoundCloud track
        if (isSoundCloud) {
          // Pause Spotify Web Playback SDK immediately to prevent dual-playback
          if (sdkPlayerInstance) {
            sdkPlayerInstance.pause().catch(() => {});
          }

          if (track.streamUrl && !track.streamUrl.startsWith('/api')) {
            startSoundCloudPlayback(
              safeTrackId,
              track.streamUrl,
              track.streamUrl.includes('.m3u8'),
              0,
            );
          } else {
            integrationsApi
              .getSoundCloudStream(safeTrackId)
              .then((streamData) => {
                if (streamData?.streamUrl) {
                  const cur = get().currentTrack;
                  if (cur && cur.id === safeTrackId) {
                    set({
                      currentTrack: {
                        ...cur,
                        streamUrl: streamData.streamUrl,
                      },
                    });
                    startSoundCloudPlayback(safeTrackId, streamData.streamUrl, streamData.isHls, 0);
                  }
                } else {
                  console.warn('[SoundCloud Play] Failed to resolve stream URL for:', safeTrackId);
                  set({ isPlaying: false });
                  stopProgressTimer();
                }
              })
              .catch((err) => {
                console.warn('[SoundCloud Play] Stream fetch error:', err);
                set({ isPlaying: false });
                stopProgressTimer();
              });
          }

          startProgressTimer();
          return;
        }

        // 2. Play Spotify track: strictly teardown any SoundCloud / HLS playback first
        teardownSoundCloudAudio();

        // Notify AudioCoordinator to silence other media players (e.g. voice notes)
        audioCoordinator.play(getOrCreateAudio(), 'spotify-bottom-dock');

        // Proceed with Spotify Web Playback SDK
        if (sdkDeviceId) {
          integrationsApi
            .playSpotifyTrackOnDevice(sdkDeviceId, safeTrackId, 0)
            .then((res) => {
              sendDebugLog('playSpotifyTrackOnDevice_result', res);
              if (res?.success) {
                set({ needsSpotifyPermissions: false });
                const audio = getOrCreateAudio();
                audio.pause();
                audio.src = '';

                if (sdkPlayerInstance) {
                  if (typeof sdkPlayerInstance.setVolume === 'function') {
                    sdkPlayerInstance.setVolume(get().volume || 0.8).catch(() => {});
                  }
                  if (typeof sdkPlayerInstance.resume === 'function') {
                    sdkPlayerInstance.resume().catch(() => {});
                  }
                }
              } else {
                console.warn('[Spotify Play] SDK API returned error:', res?.error);
                if (res?.permissionsMissing) {
                  set({ needsSpotifyPermissions: true });
                }
                if (track.previewUrl && !isAppleAudioUrl(track.previewUrl)) {
                  const audio = getOrCreateAudio();
                  audio.src = track.previewUrl;
                  audio.volume = get().isMuted ? 0 : get().volume;
                  audio.play().catch(() => {});
                } else {
                  stopProgressTimer();
                  set({ isPlaying: false });
                }
              }
            })
            .catch((err) => {
              console.warn('[Spotify Play] Exception:', err);
              if (track.previewUrl && !isAppleAudioUrl(track.previewUrl)) {
                const audio = getOrCreateAudio();
                audio.src = track.previewUrl;
                audio.volume = get().isMuted ? 0 : get().volume;
                audio.play().catch(() => {});
              } else {
                stopProgressTimer();
                set({ isPlaying: false });
              }
            });
        } else {
          if (track.previewUrl && !isAppleAudioUrl(track.previewUrl)) {
            const audio = getOrCreateAudio();
            audio.src = track.previewUrl;
            audio.volume = get().isMuted ? 0 : get().volume;
            audio.play().catch(() => {});
          }
        }

        startProgressTimer();
      },

      togglePlay: () => {
        if (sdkPlayerInstance && typeof sdkPlayerInstance.activateElement === 'function') {
          sdkPlayerInstance.activateElement().catch(() => {});
        }
        const { isPlaying } = get();
        if (isPlaying) {
          get().pause();
        } else {
          get().resume();
        }
      },

      pause: () => {
        if (sdkPlayerInstance && sdkDeviceId) {
          sdkPlayerInstance.pause().catch(() => {});
        }
        const audio = getOrCreateAudio();
        // 1. Capture exact current progress before pausing
        let currentPosMs = get().progressMs;
        if (audio && !isNaN(audio.currentTime) && audio.currentTime > 0) {
          currentPosMs = Math.floor(audio.currentTime * 1000);
        }
        try {
          audio.pause();
        } catch {
          // ignore
        }
        // Also pause any active Spotify embed iframes on the page
        try {
          document.querySelectorAll('iframe[src*="spotify.com"]').forEach((iframe) => {
            (iframe as HTMLIFrameElement).contentWindow?.postMessage({ command: 'pause' }, '*');
          });
        } catch {
          // ignore
        }
        audioCoordinator.stop('spotify-bottom-dock', false);
        stopProgressTimer();
        set({ isPlaying: false, progressMs: currentPosMs });
      },

      resume: () => {
        if (sdkPlayerInstance) {
          if (typeof sdkPlayerInstance.activateElement === 'function') {
            sdkPlayerInstance.activateElement().catch(() => {});
          }
          if (typeof sdkPlayerInstance.setVolume === 'function') {
            sdkPlayerInstance.setVolume(get().volume || 0.8).catch(() => {});
          }
        }
        const { currentTrack, deviceId } = get();
        if (!currentTrack) return;

        const isSoundCloud = Boolean(
          currentTrack.source === 'soundcloud' ||
          currentTrack.id.startsWith('sc-') ||
          currentTrack.id.startsWith('soundcloud-'),
        );

        if (isSoundCloud) {
          if (sdkPlayerInstance) {
            sdkPlayerInstance.pause().catch(() => {});
          }
          if (globalAudio && globalAudio.src) {
            audioCoordinator.play(globalAudio, 'spotify-bottom-dock');
            // Restore progress position if audio drifted or reset
            const savedProgressSec = get().progressMs / 1000;
            if (
              savedProgressSec > 0 &&
              Math.abs(globalAudio.currentTime - savedProgressSec) > 0.5
            ) {
              try {
                globalAudio.currentTime = savedProgressSec;
              } catch {}
            }
            globalAudio.play().catch(() => {
              handleSoundCloudTokenExpiration(currentTrack.id);
            });
          } else if (currentTrack.id) {
            handleSoundCloudTokenExpiration(currentTrack.id);
          }
          set({ isPlaying: true });
          startProgressTimer();
          return;
        }

        if (globalAudio) {
          try {
            globalAudio.pause();
          } catch {}
        }

        if (sdkPlayerInstance && (sdkDeviceId || deviceId)) {
          sdkPlayerInstance.resume().catch(() => {});
        } else {
          // Resume any active Spotify embed iframes
          try {
            document.querySelectorAll('iframe[src*="spotify.com"]').forEach((iframe) => {
              (iframe as HTMLIFrameElement).contentWindow?.postMessage({ command: 'resume' }, '*');
            });
          } catch {
            // ignore
          }
        }
        if (!isSoundCloud) {
          const audio = getOrCreateAudio();
          if (!audio.src && (currentTrack.streamUrl || currentTrack.previewUrl)) {
            audio.src = currentTrack.streamUrl || currentTrack.previewUrl!;
          }
          if (audio.src) {
            audioCoordinator.play(audio, 'spotify-bottom-dock');
            const savedProgressSec = get().progressMs / 1000;
            if (savedProgressSec > 0 && Math.abs(audio.currentTime - savedProgressSec) > 0.5) {
              try {
                audio.currentTime = savedProgressSec;
              } catch {}
            }
            audio.play().catch(() => {});
          }
        }

        set({ isPlaying: true });
        startProgressTimer();
      },

      seek: (targetMs) => {
        const { durationMs, deviceId, isPlaying } = get();
        const clamped = Math.max(0, Math.min(durationMs, targetMs));

        // If seeking within 1500ms of the end or to the end, trigger next track transition immediately
        if (durationMs > 0 && clamped >= durationMs - 1500) {
          handleTrackEnded();
          return;
        }

        set({ progressMs: clamped });

        if (sdkPlayerInstance && (sdkDeviceId || deviceId)) {
          sdkPlayerInstance.seek(clamped).catch(() => {});
        } else {
          try {
            document.querySelectorAll('iframe[src*="spotify.com"]').forEach((iframe) => {
              (iframe as HTMLIFrameElement).contentWindow?.postMessage(
                { command: 'seek', timestamp: Math.floor(clamped / 1000) },
                '*',
              );
            });
          } catch {
            // ignore
          }
        }
        if (globalAudio && globalAudio.src) {
          try {
            globalAudio.currentTime = clamped / 1000;
            if (isPlaying && globalAudio.paused) {
              globalAudio.play().catch(() => {});
            }
          } catch {
            // ignore
          }
        }
      },

      seekRelative: (deltaSeconds) => {
        const { progressMs, durationMs, seek } = get();
        const targetMs = Math.max(0, Math.min(durationMs, progressMs + deltaSeconds * 1000));
        seek(targetMs);
      },

      prevTrack: () => {
        const { progressMs, history, currentTrack, queue, playTrack, seek } = get();
        if (progressMs > 3000) {
          seek(0);
          return;
        }

        if (history.length > 0) {
          const [prevTrackItem, ...remainingHistory] = history;
          const nextQueue = currentTrack ? [currentTrack, ...queue] : queue;
          set({ history: remainingHistory, queue: nextQueue });
          playTrack(prevTrackItem, nextQueue, undefined, false);
        } else {
          seek(0);
        }
      },

      nextTrack: async () => {
        const { queue, history, playTrack, repeatMode, seek, pause, currentTrack } = get();
        if (queue.length > 0) {
          const [nextTrackItem, ...remainingQueue] = queue;
          playTrack(nextTrackItem, remainingQueue, undefined, true);

          // Auto-replenish queue when running low (<= 2 tracks)
          if (remainingQueue.length <= 2) {
            get()
              .loadInfiniteAudioQueue(true, true)
              .catch(() => {});
          }
          return;
        }

        if (repeatMode === 1) {
          if (history.length > 0) {
            const fullHistory = [...history, ...(currentTrack ? [currentTrack] : [])];
            const reversed = fullHistory.reverse();
            const [firstTrack, ...rest] = reversed;
            set({ history: [], queue: rest });
            playTrack(firstTrack, rest, undefined, false);
            return;
          } else if (currentTrack) {
            seek(0);
            set({ isPlaying: true, progressMs: 0 });
            if (sdkPlayerInstance && sdkDeviceId) {
              sdkPlayerInstance.seek(0).catch(() => {});
              sdkPlayerInstance.resume().catch(() => {});
              if (currentTrack.id) {
                integrationsApi
                  .playSpotifyTrackOnDevice(sdkDeviceId, currentTrack.id, 0)
                  .catch(() => {});
              }
            } else if (globalAudio) {
              globalAudio.currentTime = 0;
              globalAudio.play().catch(() => {});
            }
            return;
          } else {
            seek(0);
            pause();
            return;
          }
        }

        // Autoplay / Infinite Audio (like Spotify Radio) - dynamically fetch next track
        if (currentTrack) {
          try {
            await get().loadInfiniteAudioQueue(true);
            const freshQueue = get().queue;
            if (freshQueue.length > 0) {
              const [nextTrackItem, ...remainingQueue] = freshQueue;
              playTrack(nextTrackItem, remainingQueue, undefined, true);
              return;
            }
          } catch (err) {
            console.warn('[Spotify Player] Auto-play next track error:', err);
          }
        }

        seek(0);
        pause();
      },

      toggleRepeat: () => {
        const current = get().repeatMode;
        const next: RepeatMode = current === 0 ? 1 : current === 1 ? 2 : 0;
        set({ repeatMode: next });

        const modeMap: Record<RepeatMode, 'off' | 'context' | 'track'> = {
          0: 'off',
          1: 'context',
          2: 'track',
        };
        integrationsApi
          .setSpotifyRepeatMode(modeMap[next], sdkDeviceId || undefined)
          .catch(() => {});
      },

      toggleShuffle: () => {
        const { isShuffled, queue, unshuffledQueue } = get();
        const nextShuffled = !isShuffled;
        if (nextShuffled) {
          const shuffled = [...queue].sort(() => Math.random() - 0.5);
          set({ isShuffled: true, queue: shuffled });
        } else {
          set({ isShuffled: false, queue: unshuffledQueue });
        }
        integrationsApi.setSpotifyShuffle(nextShuffled, sdkDeviceId || undefined).catch(() => {});
      },

      toggleLike: () => {
        const { isLiked, currentTrack } = get();
        const nextLiked = !isLiked;
        set({ isLiked: nextLiked });

        if (currentTrack) {
          musicEventBridge.emitLikeToggled(currentTrack, nextLiked);
        }
      },

      setVolume: (volume) => {
        const clamped = Math.max(0, Math.min(1, volume));
        set({ volume: clamped, isMuted: clamped === 0 });

        if (sdkPlayerInstance) {
          sdkPlayerInstance.setVolume(clamped === 0 ? 0 : clamped).catch(() => {});
        }
        const audio = getOrCreateAudio();
        if (audio) {
          audio.volume = clamped === 0 ? 0 : clamped;
          audio.muted = clamped === 0;
        }
      },

      toggleMute: () => {
        const { isMuted, volume } = get();
        const nextMuted = !isMuted;
        set({ isMuted: nextMuted });

        if (sdkPlayerInstance) {
          sdkPlayerInstance.setVolume(nextMuted ? 0 : volume).catch(() => {});
        }
        const audio = getOrCreateAudio();
        if (audio) {
          audio.muted = nextMuted;
          audio.volume = nextMuted ? 0 : volume;
        }
      },

      toggleLyrics: () => set((state) => ({ isLyricsOpen: !state.isLyricsOpen })),
      setLyricsOpen: (isLyricsOpen) => set({ isLyricsOpen }),

      toggleQueue: () => {
        const nextOpen = !get().isQueueOpen;
        set({ isQueueOpen: nextOpen });
        if (nextOpen && get().queue.length === 0 && get().currentTrack) {
          get().loadInfiniteAudioQueue();
        }
      },
      setQueueOpen: (isQueueOpen) => {
        set({ isQueueOpen });
        if (isQueueOpen && get().queue.length === 0 && get().currentTrack) {
          get().loadInfiniteAudioQueue();
        }
      },

      setVolumeOpen: (isVolumeOpen) => set({ isVolumeOpen }),

      setMobileExpanded: (isMobileExpanded) => set({ isMobileExpanded }),

      addToQueue: (track) =>
        set((state) => ({
          queue: [...state.queue, track],
          unshuffledQueue: [...state.unshuffledQueue, track],
        })),

      removeFromQueue: (index) =>
        set((state) => {
          const nextQueue = [...state.queue];
          nextQueue.splice(index, 1);
          return { queue: nextQueue };
        }),

      clearQueue: () => set({ queue: [], unshuffledQueue: [] }),

      setQueue: (tracks, source = 'playlist') =>
        set({
          queue: tracks,
          unshuffledQueue: tracks,
          queueSource: source,
          queueOffset: 0,
        }),

      loadInfiniteAudioQueue: async (forceRefresh = false, append = false) => {
        if (activeQueuePromise && !forceRefresh) {
          await activeQueuePromise;
          return;
        }

        const { currentTrack, queueOffset } = get();
        if (!currentTrack) return;

        const nextOffset = forceRefresh ? (queueOffset + 10) % 40 : 0;
        set({ isLoadingQueue: true });

        activeQueuePromise = (async () => {
          try {
            const isSoundCloud = Boolean(
              currentTrack.source === 'soundcloud' ||
              currentTrack.id.startsWith('sc-') ||
              currentTrack.id.startsWith('soundcloud-'),
            );

            if (isSoundCloud) {
              const historyIds = get()
                .history.slice(0, 10)
                .map((t) => t.id);
              let rawScTracks = await integrationsApi.getSoundCloudRelated(
                currentTrack.id,
                historyIds,
                10,
              );

              // Fallback if related returned too few tracks
              if (!Array.isArray(rawScTracks) || rawScTracks.length < 5) {
                const scQuery =
                  `${currentTrack.artist || ''} ${currentTrack.title || ''}`.trim() ||
                  currentTrack.artist ||
                  currentTrack.title;
                if (scQuery) {
                  const scSearch = await integrationsApi
                    .searchSoundCloudCatalog(scQuery, 10)
                    .catch(() => []);
                  if (Array.isArray(scSearch) && scSearch.length > 0) {
                    rawScTracks = [...(Array.isArray(rawScTracks) ? rawScTracks : []), ...scSearch];
                  }
                }
              }

              if (Array.isArray(rawScTracks) && rawScTracks.length > 0) {
                const cleanTrackId = currentTrack.id;
                const sanitized: SpotifyTrack[] = rawScTracks
                  .filter((t: any) => t && (t.id || t.title))
                  .map((t: any) => ({
                    id: t.id.startsWith('sc-') ? t.id : `sc-${t.id}`,
                    title: unescapeHtml(t.title),
                    artist: unescapeHtml(t.artist || t.user?.username),
                    albumArt:
                      t.albumArt || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
                    durationMs: t.durationMs || 180000,
                    previewUrl: null,
                    spotifyUrl: t.spotifyUrl || 'https://soundcloud.com',
                    source: 'soundcloud' as const,
                    streamUrl:
                      t.streamUrl ||
                      `/api/integrations/soundcloud/stream/${t.id.replace(/^sc-/, '')}`,
                  }))
                  .filter((t: any) => t.id !== cleanTrackId && !historyIds.includes(t.id));

                if (sanitized.length > 0) {
                  const currentQueue = get().queue;
                  const newQueue =
                    append && currentQueue.length > 0
                      ? [
                          ...currentQueue,
                          ...sanitized.filter(
                            (item) => !currentQueue.some((q) => q.id === item.id),
                          ),
                        ]
                      : sanitized;

                  set({
                    queue: newQueue,
                    unshuffledQueue: newQueue,
                    queueSource: 'infinite-audio',
                    queueOffset: 0,
                    isLoadingQueue: false,
                  });
                  return;
                }
              }
              set({ isLoadingQueue: false });
              return;
            }

            const cleanTrackId = extractSpotifyTrackId(currentTrack) || currentTrack.id;
            const historyIds = get()
              .history.slice(0, 10)
              .map((t) => t.id);
            const res = await integrationsApi.getSpotifyQueue(
              cleanTrackId,
              currentTrack.artist,
              currentTrack.title,
              nextOffset,
              historyIds,
            );

            if (res && Array.isArray(res.tracks) && res.tracks.length > 0) {
              const sanitized: SpotifyTrack[] = res.tracks
                .filter((t) => t && (t.id || t.title))
                .map((t: any) => {
                  const isSc = t.source === 'soundcloud' || t.id?.startsWith('sc-');
                  return {
                    id: isSc ? t.id : extractSpotifyTrackId(t) || t.id,
                    title: unescapeHtml(t.title),
                    artist: unescapeHtml(t.artist),
                    albumArt:
                      t.albumArt || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
                    durationMs: t.durationMs || 180000,
                    previewUrl: isSc ? null : t.previewUrl || null,
                    spotifyUrl:
                      t.spotifyUrl ||
                      (isSc ? 'https://soundcloud.com' : `https://open.spotify.com/track/${t.id}`),
                    source: isSc ? ('soundcloud' as const) : ('spotify' as const),
                    streamUrl:
                      t.streamUrl ||
                      (isSc
                        ? `/api/integrations/soundcloud/stream/${t.id.replace(/^sc-/, '')}`
                        : undefined),
                  };
                })
                .filter((t) => t.id !== cleanTrackId);

              if (sanitized.length > 0) {
                const currentQueue = get().queue;
                const newQueue =
                  append && currentQueue.length > 0
                    ? [
                        ...currentQueue,
                        ...sanitized.filter((item) => !currentQueue.some((q) => q.id === item.id)),
                      ]
                    : sanitized;

                set({
                  queue: newQueue,
                  unshuffledQueue: newQueue,
                  queueSource: res.source || 'infinite-audio',
                  queueOffset: nextOffset,
                  isLoadingQueue: false,
                });
                return;
              }
            }
            set({ isLoadingQueue: false });
          } catch (err) {
            console.warn('[Spotify Player] loadInfiniteAudioQueue error:', err);
            set({ isLoadingQueue: false });
          } finally {
            activeQueuePromise = null;
          }
        })();

        await activeQueuePromise;
      },

      closeDock: () => {
        get().pause();
        set({
          isDockVisible: false,
          isDockMinimized: false,
          isGameModeOpen: false,
          isLyricsOpen: false,
          isQueueOpen: false,
          isMobileExpanded: false,
        });
      },

      openDock: () => set({ isDockVisible: true }),

      toggleDockMinimized: () =>
        set((state) => {
          const next = !state.isDockMinimized;
          return {
            isDockMinimized: next,
            ...(next ? { isLyricsOpen: false, isQueueOpen: false, isVolumeOpen: false } : {}),
          };
        }),

      setDockMinimized: (isDockMinimized) =>
        set({
          isDockMinimized,
          ...(isDockMinimized
            ? { isLyricsOpen: false, isQueueOpen: false, isVolumeOpen: false }
            : {}),
        }),

      toggleGameMode: () =>
        set((state) => {
          const next = !state.isGameModeOpen;
          return {
            isGameModeOpen: next,
            ...(next ? { isLyricsOpen: false, isQueueOpen: false, isVolumeOpen: false } : {}),
          };
        }),

      setGameModeOpen: (isGameModeOpen) =>
        set({
          isGameModeOpen,
          ...(isGameModeOpen
            ? { isLyricsOpen: false, isQueueOpen: false, isVolumeOpen: false }
            : {}),
        }),
    }),
    {
      name: 'spotify-player-storage-v2',
      partialize: (state) => ({
        currentTrack: state.currentTrack,
        progressMs: state.progressMs,
        durationMs: state.durationMs,
        volume: state.volume,
        isMuted: state.isMuted,
        repeatMode: state.repeatMode,
        isShuffled: state.isShuffled,
        queue: state.queue,
        unshuffledQueue: state.unshuffledQueue,
        isDockVisible: state.isDockVisible,
        isDockMinimized: state.isDockMinimized,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Strictly guarantee playback is paused on page reload with saved progress
          state.isPlaying = false;
          if (state.currentTrack) {
            state.isDockVisible = true;
          }
        }
      },
    },
  ),
);

// Global decoupled event listeners for Music Hub synchronization
if (typeof window !== 'undefined') {
  musicEventBridge.onLikeToggled(({ track, isLiked }) => {
    const current = useSpotifyPlayerStore.getState().currentTrack;
    if (current && (current.id === track.id || extractSpotifyTrackId(current) === track.id)) {
      useSpotifyPlayerStore.setState({ isLiked });
    }
  });

  musicEventBridge.onPlayRequested(({ track, queue, contextName }) => {
    useSpotifyPlayerStore.getState().playTrack(track, queue, contextName);
  });
}

/**
 * RESET_STORES: pause + drop session playback (track/queue/history/dock) on
 * logout/switch. Device prefs (volume/mute/repeat/shuffle) are preserved.
 * The persisted snapshot is overwritten with the cleared session so a
 * relogin never resumes another account's queue.
 */
registerSessionResetHandler(() => {
  try {
    useSpotifyPlayerStore.getState().pause();
  } catch {
    // ignore in tests
  }
  useSpotifyPlayerStore.setState({
    currentTrack: null,
    isPlaying: false,
    progressMs: 0,
    queue: [],
    unshuffledQueue: [],
    history: [],
    isLiked: false,
    isLyricsOpen: false,
    isQueueOpen: false,
    isVolumeOpen: false,
    isDockVisible: false,
    isDockMinimized: false,
    isMobileExpanded: false,
    isGameModeOpen: false,
    isLoadingQueue: false,
    queueSource: 'infinite-audio',
    queueOffset: 0,
    needsSpotifyPermissions: false,
  });
});
