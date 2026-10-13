import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { musicApi } from '../api/musicApi';
import {
  emptyPreferences,
  preferencesSchema,
  musicKeys,
  shuffled,
  nextIndex,
  type Track,
  type Playlist,
  type Repeat,
} from './music';
import { useMusicJam } from './useMusicJam';
import { MusicAudio } from '../ui/MusicAudio';

function useMusicController(userId: string, isOnline: boolean) {
  const client = useQueryClient();
  const key = musicKeys.library(userId);
  const [visited, setVisited] = React.useState(false);
  const [gameMode, setGameMode] = React.useState(false);
  const exitGameMode = React.useCallback(() => setGameMode(false), []);
  const liked = useQuery({
    queryKey: [...key, 'liked'],
    queryFn: ({ signal }) => musicApi.liked(signal),
    enabled: visited && isOnline,
    refetchOnWindowFocus: !gameMode,
    refetchOnReconnect: !gameMode,
  });
  const playlists = useQuery({
    queryKey: [...key, 'playlists'],
    queryFn: ({ signal }) => musicApi.library(signal),
    enabled: visited && isOnline,
    refetchOnWindowFocus: !gameMode,
    refetchOnReconnect: !gameMode,
  });
  const folders = useQuery({
    queryKey: [...key, 'folders'],
    queryFn: ({ signal }) => musicApi.folders(signal),
    enabled: visited && isOnline && !gameMode,
  });
  const [preferences, updatePreferences] = React.useState(emptyPreferences);
  const [hydrated, setHydrated] = React.useState(false);
  const restored = React.useRef(false);
  const pendingPreferences = React.useRef<
    React.SetStateAction<ReturnType<typeof emptyPreferences>>[]
  >([]);
  const setPreferences = React.useCallback(
    (update: React.SetStateAction<ReturnType<typeof emptyPreferences>>) => {
      if (!restored.current) pendingPreferences.current.push(update);
      updatePreferences(update);
    },
    [],
  );
  const latestPreferences = React.useRef(preferences);
  latestPreferences.current = preferences;
  React.useEffect(
    () => () => {
      if (restored.current)
        void AsyncStorage.setItem(
          `eternal-mobile-music:${userId}`,
          JSON.stringify(latestPreferences.current),
        ).catch(() => {});
    },
    [userId],
  );
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const mutationLock = React.useRef(false);
  const [queue, setQueue] = React.useState<Track[]>([]);
  const [index, setIndex] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [position, setPosition] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [seek, setSeek] = React.useState({ value: 0, revision: 0 });
  const [repeat, setRepeat] = React.useState<Repeat>('off');
  const [shuffle, setShuffle] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [retry, setRetry] = React.useState(0);
  const [sleepUntil, setSleepUntil] = React.useState<number | null>(null);
  const originalQueue = React.useRef<Track[]>([]);
  const current = queue[index] || null;
  React.useEffect(() => {
    let live = true;
    void AsyncStorage.getItem(`eternal-mobile-music:${userId}`)
      .then((raw) => {
        if (!live) return;
        const parsed = preferencesSchema.safeParse(raw ? JSON.parse(raw) : emptyPreferences());
        let value = parsed.success ? parsed.data : emptyPreferences();
        for (const update of pendingPreferences.current)
          value = typeof update === 'function' ? update(value) : update;
        pendingPreferences.current = [];
        restored.current = true;
        updatePreferences(value);
      })
      .catch(() => {
        if (live) setNotice('Your listening history could not be restored.');
      })
      .finally(() => {
        if (live) {
          restored.current = true;
          setHydrated(true);
        }
      });
    return () => {
      live = false;
    };
  }, [userId]);
  React.useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      void AsyncStorage.setItem(
        `eternal-mobile-music:${userId}`,
        JSON.stringify(preferences),
      ).catch(() => setNotice('Device storage is full. Your library is still saved online.'));
    }, 400);
    return () => clearTimeout(timer);
  }, [preferences, hydrated, userId]);
  React.useEffect(() => {
    if (!sleepUntil) return;
    const timer = setTimeout(
      () => {
        setPlaying(false);
        setSleepUntil(null);
      },
      Math.max(0, sleepUntil - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [sleepUntil]);
  const stream = useQuery({
    queryKey: ['mobile', userId, 'music', 'stream', current?.id, retry],
    queryFn: ({ signal }) => {
      if (!current) throw new Error('Choose a track');
      return musicApi.stream(current, signal, retry > 0);
    },
    enabled: !!current && isOnline,
    staleTime: 5 * 60_000,
    retry: 0,
    gcTime: 10 * 60_000,
  });
  React.useEffect(() => {
    if (stream.isError) {
      setPlaying(false);
      setError(stream.error.message);
    }
  }, [stream.isError, stream.error]);
  function record(track: Track) {
    setPreferences((value) => ({
      ...value,
      history: [track, ...value.history.filter((item) => item.id !== track.id)].slice(0, 100),
    }));
  }
  function play(track: Track, tracks: Track[] = [track], startMs = 0, autoPlay = true) {
    if (!isOnline) {
      setError('Connect to the internet to play music.');
      return;
    }
    const next = tracks.some((item) => item.id === track.id) ? tracks : [track, ...tracks];
    const at = next.findIndex((item) => item === track || item.id === track.id);
    const bounded = Math.max(0, Math.min(track.durationMs || startMs, startMs));
    originalQueue.current = [...next];
    setQueue(shuffle ? [track, ...shuffled(next.filter((_, i) => i !== at))] : [...next]);
    setIndex(shuffle ? 0 : at);
    setPosition(bounded);
    setDuration(track.durationMs);
    setSeek((value) => ({ value: bounded, revision: value.revision + 1 }));
    setPlaying(autoPlay);
    setError(null);
    setRetry(0);
    record(track);
  }
  function seekTo(value: number) {
    const bounded = Math.max(0, Math.min(duration || current?.durationMs || 0, value));
    setPosition(bounded);
    setSeek((old) => ({ value: bounded, revision: old.revision + 1 }));
  }
  function next(ended = false) {
    const target = nextIndex(index, queue.length, repeat, ended);
    if (target < 0) {
      setPlaying(false);
      return;
    }
    if (target === index) seekTo(0);
    else {
      setIndex(target);
      setSeek((value) => ({ value: 0, revision: value.revision + 1 }));
      setPosition(0);
      setDuration(queue[target].durationMs);
      setRetry(0);
      record(queue[target]);
    }
    setError(null);
    setPlaying(true);
  }
  async function run(action: () => Promise<unknown>, success?: string) {
    if (mutationLock.current) return false;
    if (!isOnline) {
      setError('Connect to the internet to update your library.');
      return false;
    }
    mutationLock.current = true;
    setBusy(true);
    setError(null);
    try {
      await client.cancelQueries({ queryKey: key });
      await action();
      await client.invalidateQueries({ queryKey: key });
      if (success) setNotice(success);
      return true;
    } catch {
      await client.invalidateQueries({ queryKey: key });
      setError('Changes could not be saved. Please try again.');
      return false;
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  }
  const addToQueue = (track: Track) => {
    if (!current) {
      play(track);
      return;
    }
    setQueue((value) => [...value, track]);
    originalQueue.current = [...originalQueue.current, track];
    setNotice('Added to queue');
  };
  const jam = useMusicJam({
    userId,
    enabled: visited && isOnline,
    lowPower: gameMode,
    current,
    playing,
    position,
    duration,
    play: (track, startMs, autoPlay) => play(track, [track], startMs, autoPlay),
    seekTo,
    setPlaying,
    addToQueue,
  });
  const onProgress = React.useCallback((progress: number, total: number) => {
    setPosition(progress);
    if (total > 0) setDuration(total);
  }, []);
  const onError = React.useCallback(() => {
    setPlaying(false);
    setError('Playback failed. Retry to refresh the audio stream.');
  }, []);
  return {
    jam,
    listener: !!jam.room && !jam.isHost,
    userId,
    isOnline,
    gameMode,
    enterGameMode: () => {
      setVisited(true);
      setExpanded(false);
      setGameMode(true);
      // Keep the library and current stream; abort work belonging to the unmounted app.
      void client.cancelQueries({
        predicate: (query) =>
          query.queryKey[0] === 'mobile' &&
          query.queryKey[1] === userId &&
          !(
            query.queryKey[2] === 'music' &&
            (query.queryKey[3] === 'stream' ||
              (query.queryKey[3] === 'library' && query.queryKey[4] !== 'folders'))
          ),
      });
    },
    exitGameMode,
    visited,
    setVisited,
    liked,
    playlists,
    folders,
    preferences,
    hydrated,
    setPreferences,
    notice,
    setNotice,
    error,
    setError,
    busy,
    run,
    current,
    queue,
    index,
    playing,
    setPlaying,
    position,
    duration,
    seek,
    stream,
    repeat,
    setRepeat,
    shuffle,
    muted,
    setMuted,
    expanded,
    setExpanded,
    sleepUntil,
    setSleepUntil,
    play: (track: Track, tracks?: Track[]) => {
      if (jam.room && !jam.isHost) {
        jam.leave();
        setNotice('You left Jam to play your own selection.');
      }
      play(track, tracks);
    },
    seekTo: (value: number) => {
      if (!jam.room || jam.isHost) seekTo(value);
    },
    next: (ended = false) => {
      if (!jam.room || jam.isHost) next(ended);
    },
    onProgress,
    onError,
    previous: () => {
      if (jam.room && !jam.isHost) return;
      if (position > 3000 || index === 0) seekTo(0);
      else {
        setIndex(index - 1);
        setSeek((value) => ({ value: 0, revision: value.revision + 1 }));
        setPosition(0);
        setDuration(queue[index - 1].durationMs);
        setRetry(0);
        setError(null);
        setPlaying(true);
        record(queue[index - 1]);
      }
    },
    toggle: () => {
      if (jam.room && !jam.isHost) {
        jam.togglePause();
        return;
      }
      if (error) {
        setError(null);
        setRetry((value) => value + 1);
      }
      if (!playing && duration > 0 && position >= duration) seekTo(0);
      setPlaying((value) => !value);
    },
    close: () => {
      jam.leave();
      setPlaying(false);
      setQueue([]);
      setExpanded(false);
      setError(null);
    },
    toggleShuffle: () => {
      if (!current || (jam.room && !jam.isHost)) return;
      const rest = shuffle
        ? originalQueue.current.filter((_, i) => i !== originalQueue.current.indexOf(current))
        : shuffled(queue.filter((_, i) => i !== index));
      setQueue([current, ...rest]);
      setIndex(0);
      setShuffle(!shuffle);
    },
    addToQueue: (track: Track) => {
      if (jam.room && !jam.isHost) jam.add(track);
      else addToQueue(track);
    },
    removeQueue: (at: number) => {
      if (at === index || !queue[at] || (jam.room && !jam.isHost)) return;
      const originalAt = originalQueue.current.indexOf(queue[at]);
      originalQueue.current = originalQueue.current.filter((_, i) => i !== originalAt);
      setQueue((value) => value.filter((_, i) => i !== at));
      if (at < index) setIndex((value) => value - 1);
    },
    clearQueue: () => {
      if (jam.room && !jam.isHost) return;
      setQueue(current ? [current] : []);
      setIndex(0);
      originalQueue.current = current ? [current] : [];
    },
    like: (track: Track) =>
      run(() => musicApi.like(track, !liked.data?.some((item) => item.id === track.id))),
    save: (playlist: Playlist) => {
      setPreferences((value) => ({
        ...value,
        saved: value.saved.some((item) => item.id === playlist.id)
          ? value.saved.filter((item) => item.id !== playlist.id)
          : [playlist, ...value.saved],
      }));
    },
    pin: (id: string) =>
      setPreferences((value) => ({
        ...value,
        pinned: value.pinned.includes(id)
          ? value.pinned.filter((item) => item !== id)
          : [id, ...value.pinned],
      })),
  };
}
type MusicController = ReturnType<typeof useMusicController>;
const Context = React.createContext<MusicController | null>(null);
export function MusicProvider({
  userId,
  isOnline,
  children,
}: {
  userId: string;
  isOnline: boolean;
  children: React.ReactNode;
}) {
  const music = useMusicController(userId, isOnline);
  const latest = React.useRef(music);
  latest.current = music;
  const ended = React.useCallback(() => latest.current.next(true), []);
  return (
    <Context.Provider value={music}>
      {children}
      {music.current && music.stream.data && (
        <MusicAudio
          key={`${music.current.id}:${music.stream.data.uri}`}
          track={music.current}
          uri={music.stream.data.uri}
          isHls={music.stream.data.isHls}
          lowPower={music.gameMode}
          playing={music.playing}
          volume={music.muted ? 0 : music.preferences.volume}
          seek={music.seek}
          onProgress={music.onProgress}
          onPlaying={music.setPlaying}
          onEnded={ended}
          onError={music.onError}
        />
      )}
    </Context.Provider>
  );
}
export function useMusic() {
  const value = React.useContext(Context);
  if (!value) throw new Error('MusicProvider is required');
  return value;
}
