import * as React from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { AudioOverlay } from '@social-network/shared-contracts';
import { storyMusicApi, soundCloudId, type StoryTrack } from '../api/storyMusic';
import { makeOverlay, STORY_COLORS, clamp } from '../model/storyEditor';
import { colors, common, ErrorNotice } from './primitives';
import {
  StoryToolPanel,
  StoryField,
  StoryChoices,
  StoryRange,
  StoryColorPicker,
} from './StoryToolPanel';
import { StoryAudio } from './StoryAudio';
import { MusicSticker } from './StoryCanvas';
import { tr } from '@/shared/lib/i18n';

export function StoryMusicPlayer({
  overlay,
  userId,
  active,
}: {
  overlay: AudioOverlay;
  userId: string;
  active: boolean;
}) {
  const trackId =
    overlay.soundCloudTrackId ||
    overlay.audioUrl?.match(/\/integrations\/soundcloud\/stream\/(\d+)/)?.[1];
  const stream = useQuery({
    queryKey: ['story-music-stream', userId, trackId],
    queryFn: ({ signal }) => storyMusicApi.stream(trackId || '', signal),
    enabled: active && !!trackId,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
  const uri = trackId ? stream.data : overlay.audioUrl;
  return (
    <>
      {stream.isError ? (
        <ErrorNotice
          message={tr("Music couldn't be loaded.")}
          onRetry={() => {
            void stream.refetch();
          }}
        />
      ) : uri ? (
        <StoryAudio
          uri={uri}
          active={active}
          volume={overlay.musicVolume}
          startTimeMs={overlay.startTimeMs}
          clipDurationSeconds={overlay.clipDurationSeconds}
          label={tr('Story music')}
        />
      ) : stream.isFetching ? (
        <ActivityIndicator color={colors.purple} />
      ) : null}
    </>
  );
}
export function StoryMusicEditor({
  userId,
  isOnline,
  initial,
  onSave,
  onClose,
}: {
  userId: string;
  isOnline: boolean;
  initial?: AudioOverlay;
  onSave: (overlay: AudioOverlay) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [genre, setGenre] = React.useState('For You');
  const [track, setTrack] = React.useState<StoryTrack | null>(null);
  const [style, setStyle] = React.useState<AudioOverlay['musicStyle']>(
    initial?.musicStyle || 'card',
  );
  const [color, setColor] = React.useState(initial?.stickerColor || '#ffffff');
  const [start, setStart] = React.useState((initial?.startTimeMs || 0) / 1000);
  const [clip, setClip] = React.useState(initial?.clipDurationSeconds || 15);
  const [volume, setVolume] = React.useState(initial?.musicVolume ?? 1);
  const [videoVolume, setVideoVolume] = React.useState(initial?.videoVolume ?? 0);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const search = useQuery({
    queryKey: ['story-music-search', userId, debounced, genre],
    queryFn: ({ signal }) =>
      storyMusicApi.search(debounced || (genre === 'For You' ? 'Top Hits 2026' : genre), signal),
    enabled: isOnline && !track && !initial,
    staleTime: 60_000,
  });
  const rawId = track ? soundCloudId(track) : initial?.soundCloudTrackId;
  const stream = useQuery({
    queryKey: ['story-music-stream', userId, rawId],
    queryFn: ({ signal }) => storyMusicApi.stream(rawId || '', signal),
    enabled: isOnline && !!rawId,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
  const duration = track?.durationMs ? track.durationMs / 1000 : initial?.duration || 180;
  const maxClip = Math.max(5, Math.min(30, duration));
  const base = React.useMemo(
    () => initial || makeOverlay({ type: 'audio', videoVolume: 0, musicVolume: 1, yPercent: 75 }),
    [initial],
  );
  if (base.type !== 'audio') return null;
  const overlay: AudioOverlay = {
    ...base,
    title: (track?.title || initial?.title || tr('Music')).slice(0, 128),
    artist: (track?.artist || initial?.artist || tr('Artist')).slice(0, 128),
    albumArt: track?.albumArt || initial?.albumArt,
    soundCloudTrackId: rawId,
    audioUrl: rawId ? undefined : initial?.audioUrl,
    duration,
    musicStyle: style,
    stickerColor: color,
    startTimeMs: start * 1000,
    clipDurationSeconds: clamp(clip, 5, maxClip),
    videoVolume,
    musicVolume: volume,
  };
  const uri = stream.data || (!rawId ? initial?.audioUrl : undefined);
  return (
    <StoryToolPanel
      title={tr('Music')}
      onClose={onClose}
      onSave={track || initial ? () => onSave(overlay) : undefined}
      saveDisabled={!isOnline || !uri}
    >
      {error && <ErrorNotice message={error} />}
      {!isOnline && (
        <ErrorNotice message={tr('Connect to the internet to find and preview music.')} />
      )}
      {track || initial ? (
        <>
          <MusicSticker overlay={overlay} />
          {stream.isError ? (
            <ErrorNotice
              message={tr("This track couldn't be loaded.")}
              onRetry={() => {
                void stream.refetch();
              }}
            />
          ) : stream.isFetching ? (
            <ActivityIndicator color={colors.purple} />
          ) : uri ? (
            <StoryAudio
              uri={uri}
              active={isOnline}
              volume={volume}
              startTimeMs={start * 1000}
              clipDurationSeconds={clip}
              label={tr('Music preview')}
            />
          ) : null}
          <StoryChoices
            label={tr('Music sticker')}
            values={['card', 'cover', 'vinyl', 'none'] as const}
            value={style || 'card'}
            onChange={setStyle}
          />
          <StoryColorPicker
            label={tr('Sticker color')}
            colors={STORY_COLORS}
            value={color}
            onChange={setColor}
          />
          <StoryRange
            label={tr('Clip duration (seconds)')}
            value={clip}
            min={5}
            max={maxClip}
            onChange={(value) => {
              setClip(value);
              setStart(Math.min(start, Math.max(0, duration - value)));
            }}
          />
          <StoryRange
            label={tr('Clip starts at (seconds)')}
            value={start}
            max={Math.max(0, duration - clip)}
            onChange={setStart}
          />
          <StoryRange
            label={tr('Music volume (%)')}
            value={volume * 100}
            max={100}
            onChange={(value) => setVolume(value / 100)}
          />
          <StoryRange
            label={tr('Original video volume (%)')}
            value={videoVolume * 100}
            max={100}
            onChange={(value) => setVideoVolume(value / 100)}
          />
          {!initial && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setTrack(null)}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ color: colors.purple }}>{tr('Choose another track')}</Text>
            </Pressable>
          )}
        </>
      ) : (
        <>
          <StoryField
            label={tr('Search music')}
            value={query}
            onChange={setQuery}
            maxLength={128}
          />
          <StoryChoices
            label={tr('Music genre')}
            values={['For You', 'Trending', 'Phonk', 'Hip-hop', 'Electronic', 'Lofi / Chill']}
            value={genre}
            onChange={setGenre}
          />
          {search.isPending && search.fetchStatus !== 'paused' ? (
            <ActivityIndicator color={colors.purple} />
          ) : search.isError ? (
            <ErrorNotice
              message={tr("Music search couldn't be loaded.")}
              onRetry={() => {
                void search.refetch();
              }}
            />
          ) : search.data?.length ? (
            search.data.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={tr('Choose {title} by {artist}', {
                  title: item.title,
                  artist: item.artist,
                })}
                onPress={() => {
                  try {
                    soundCloudId(item);
                    setTrack(item);
                    if (item.durationMs && item.durationMs < 5000) {
                      setError(tr('Choose a track with at least 5 seconds of audio.'));
                      return;
                    }
                    setClip(Math.max(5, Math.min(15, (item.durationMs || 15000) / 1000)));
                    setStart(0);
                    setError(null);
                  } catch {
                    setError(tr('This track is unavailable. Choose another song.'));
                  }
                }}
                style={[common.row, { minHeight: 64 }]}
              >
                <Image
                  source={{ uri: item.albumArt }}
                  style={{ width: 48, height: 48, borderRadius: 10 }}
                />
                <View style={common.flex}>
                  <Text numberOfLines={2} style={common.text}>
                    {item.title}
                  </Text>
                  <Text numberOfLines={1} style={common.muted}>
                    {item.artist}
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={common.muted}>{tr('No tracks found. Try another artist or title.')}</Text>
          )}
        </>
      )}
    </StoryToolPanel>
  );
}
