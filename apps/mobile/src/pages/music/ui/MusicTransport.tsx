import * as React from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import {
  Heart,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react-native';
import { useMusic } from '../model/MusicProvider';
import { durationLabel, trackSource } from '../model/music';
import { IconButton, colors } from '../../feed/ui/primitives';
import { MusicSlider } from './MusicSlider';
import { Cover, m } from './primitives';

export function MusicTransport({ compact = false }: { compact?: boolean }) {
  const music = useMusic();
  const [scrub, setScrub] = React.useState<number | null>(null);
  React.useEffect(() => setScrub(null), [music.current?.id]);
  if (!music.current) return null;
  const liked = music.liked.data?.some((item) => item.id === music.current?.id);
  const externalOnly = trackSource(music.current) === 'spotify' && !music.current.previewUrl;
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 12,
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: '#ffffff12',
        backgroundColor: '#090b1366',
      }}
    >
      {!compact && (
        <View style={m.row}>
          <Cover uri={music.current.albumArt} size={46} />
          <View style={m.flex}>
            <Text numberOfLines={1} style={m.trackTitle}>
              {music.current.title}
            </Text>
            <Text numberOfLines={1} style={m.muted}>
              {music.current.artist}
            </Text>
          </View>
          <IconButton
            label={liked ? 'Unlike current track' : 'Like current track'}
            disabled={music.busy || !music.isOnline}
            onPress={() => {
              if (music.current) void music.like(music.current);
            }}
          >
            <Heart size={22} color={liked ? '#cfb0ff' : '#fff'} fill={liked ? '#cfb0ff' : 'none'} />
          </IconButton>
        </View>
      )}
      <View>
        <MusicSlider
          accessibilityLabel="Playback position"
          disabled={music.listener}
          minimumValue={0}
          maximumValue={Math.max(1, music.duration)}
          value={scrub ?? music.position}
          step={1000}
          onSlidingStart={() => setScrub(music.position)}
          onValueChange={setScrub}
          onSlidingComplete={(value) => {
            music.seekTo(value);
            setScrub(null);
          }}
          minimumTrackTintColor="#c9a4ff"
          maximumTrackTintColor="#ffffff25"
          thumbTintColor="#fff"
          style={{ height: 36 }}
        />
        <View style={[m.row, { justifyContent: 'space-between' }]}>
          <Text style={m.small}>{durationLabel(scrub ?? music.position)}</Text>
          <Text style={m.small}>{durationLabel(music.duration)}</Text>
        </View>
      </View>
      <View style={[m.row, { justifyContent: 'space-between' }]}>
        <IconButton
          label={`Shuffle ${music.shuffle ? 'on' : 'off'}`}
          selected={music.shuffle}
          disabled={music.listener}
          onPress={music.toggleShuffle}
        >
          <Shuffle size={21} color={music.shuffle ? '#cfb0ff' : '#c1b8cd'} />
        </IconButton>
        <IconButton label="Previous track" disabled={music.listener} onPress={music.previous}>
          <SkipBack size={25} color="#fff" fill="#fff" />
        </IconButton>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={music.playing ? 'Pause' : 'Play'}
          accessibilityState={{ disabled: externalOnly }}
          disabled={externalOnly}
          onPress={music.toggle}
          style={[
            m.play,
            { width: 56, height: 56, borderRadius: 28 },
            externalOnly && { opacity: 0.4 },
          ]}
        >
          {music.stream.isFetching ? (
            <ActivityIndicator color="white" />
          ) : music.playing ? (
            <Pause size={25} color="white" fill="white" />
          ) : (
            <Play size={25} color="white" fill="white" />
          )}
        </Pressable>
        <IconButton
          label="Next track"
          disabled={
            music.listener || (music.index >= music.queue.length - 1 && music.repeat === 'off')
          }
          onPress={() => music.next()}
        >
          <SkipForward size={25} color="#fff" fill="#fff" />
        </IconButton>
        <IconButton
          label={`Repeat: ${music.repeat}`}
          selected={music.repeat !== 'off'}
          disabled={music.listener}
          onPress={() =>
            music.setRepeat(music.repeat === 'off' ? 'all' : music.repeat === 'all' ? 'one' : 'off')
          }
        >
          {music.repeat === 'one' ? (
            <Repeat1 size={21} color="#cfb0ff" />
          ) : (
            <Repeat size={21} color={music.repeat === 'all' ? '#cfb0ff' : colors.muted} />
          )}
        </IconButton>
      </View>
      {music.stream.data?.preview && <Text style={m.muted}>Spotify preview</Text>}
      {trackSource(music.current) === 'spotify' && (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Listen to full track in Spotify"
          style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
          onPress={() => {
            if (music.current)
              void Linking.openURL(
                `https://open.spotify.com/track/${encodeURIComponent(music.current.id.replace(/^sp-/, ''))}`,
              ).catch(() => music.setError('Spotify could not be opened.'));
          }}
        >
          <Text style={{ color: '#d9bfff', fontWeight: '600' }}>Listen in Spotify</Text>
        </Pressable>
      )}
    </View>
  );
}
