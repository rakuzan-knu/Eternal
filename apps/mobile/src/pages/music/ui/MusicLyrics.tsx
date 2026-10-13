import * as React from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, Mic2 } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useMusic } from '../model/MusicProvider';
import { activeLyricIndex } from '../model/lyrics';
import { musicApi } from '../api/musicApi';
import { IconButton } from '../../feed/ui/primitives';
import { Button } from '@/shared/ui';
import { Cover, m, MusicStatus } from './primitives';
import { MusicBackdrop } from './MusicBackdrop';
import { MusicTransport } from './MusicTransport';

export function MusicLyrics({ onBack }: { onBack: () => void }) {
  const music = useMusic();
  const track = music.current;
  const scroll = React.useRef<ScrollView>(null);
  const offsets = React.useRef(new Map<number, { y: number; height: number }>());
  const viewport = React.useRef(300);
  const [following, setFollowing] = React.useState(true);
  const [reduceMotion, setReduceMotion] = React.useState(true);
  const lyrics = useQuery({
    queryKey: ['mobile', music.userId, 'music', 'lyrics', track?.id],
    queryFn: ({ signal }) => {
      if (!track) throw new Error('Choose a track');
      return musicApi.lyrics(track, signal);
    },
    enabled: !!track && music.isOnline,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  React.useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (live) setReduceMotion(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);
  React.useEffect(() => {
    offsets.current.clear();
    setFollowing(true);
  }, [track?.id]);
  const active = activeLyricIndex(lyrics.data?.lines || [], music.position, !!lyrics.data?.synced);
  const follow = React.useCallback(
    (animated: boolean) => {
      const line = offsets.current.get(active);
      if (following && line)
        scroll.current?.scrollTo({
          y: Math.max(0, line.y - viewport.current / 2 + line.height / 2),
          animated: animated && !reduceMotion && !music.gameMode,
        });
    },
    [active, following, reduceMotion, music.gameMode],
  );
  React.useEffect(() => follow(true), [follow]);
  return (
    <View style={m.flex} testID="music-karaoke">
      <MusicBackdrop seed={track?.id || 'lyrics'} />
      <View style={[m.row, { padding: 12, gap: 10 }]}>
        <IconButton label="Back from lyrics" onPress={onBack}>
          <ArrowLeft size={22} color="white" />
        </IconButton>
        <Cover uri={track?.albumArt} size={42} />
        <View style={m.flex}>
          <Text numberOfLines={1} style={m.trackTitle}>
            {track?.title || 'Lyrics'}
          </Text>
          <Text numberOfLines={1} style={m.muted}>
            {track?.artist}
          </Text>
        </View>
        <Mic2 size={19} color="#ddc8ff" />
      </View>
      <View style={{ paddingHorizontal: 24, paddingBottom: 10 }}>
        <Text style={m.accent}>
          {lyrics.data?.synced ? 'Karaoke · Tap a line to jump' : 'Lyrics'}
        </Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        ref={scroll}
        style={m.flex}
        contentContainerStyle={{
          paddingHorizontal: 26,
          paddingTop: 32,
          paddingBottom: 100,
          gap: 22,
        }}
        onLayout={(event) => {
          viewport.current = event.nativeEvent.layout.height;
          follow(false);
        }}
        onContentSizeChange={() => follow(false)}
        onScrollBeginDrag={() => setFollowing(false)}
      >
        {lyrics.isFetching && !lyrics.data ? (
          <ActivityIndicator color="#ddc8ff" accessibilityLabel="Loading lyrics" />
        ) : lyrics.isError ? (
          <MusicStatus message="Lyrics couldn't be loaded." onRetry={() => void lyrics.refetch()} />
        ) : !music.isOnline && !lyrics.data ? (
          <Text style={m.muted}>Connect to load lyrics.</Text>
        ) : !lyrics.data?.lines.length ? (
          <View style={m.empty}>
            <Mic2 size={38} color="#c9a4ff" />
            <Text style={m.heading}>Let the music speak</Text>
            <Text style={m.muted}>Lyrics aren't available for this track yet.</Text>
          </View>
        ) : (
          lyrics.data.lines.map((line, index) => (
            <Pressable
              key={`${track?.id}:${index}`}
              accessibilityRole={lyrics.data?.synced && !music.listener ? 'button' : 'text'}
              accessibilityLabel={line.text || 'Instrumental'}
              accessibilityState={{ selected: index === active }}
              disabled={!lyrics.data?.synced || music.listener}
              onPress={() => {
                music.seekTo(line.timeMs);
                setFollowing(true);
              }}
              onLayout={(event) => offsets.current.set(index, event.nativeEvent.layout)}
              style={{
                minHeight: 48,
                justifyContent: 'center',
                paddingVertical: 5,
                paddingHorizontal: 10,
                borderRadius: 14,
                backgroundColor: index === active ? '#ffffff12' : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: 28,
                  lineHeight: 40,
                  fontWeight: index === active ? '800' : '600',
                  color: index === active ? '#ffffff' : index < active ? '#c0accf' : '#b7afc4',
                }}
              >
                {line.text || '♪'}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
      {!following && !!lyrics.data?.synced && (
        <View style={{ paddingHorizontal: 24, paddingBottom: 8 }}>
          <Button title="Follow lyrics" variant="secondary" onPress={() => setFollowing(true)} />
        </View>
      )}
      <MusicTransport compact />
    </View>
  );
}
