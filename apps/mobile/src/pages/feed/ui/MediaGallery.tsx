import * as React from 'react';
import { AppState, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Play, ImageOff } from 'lucide-react-native';
import type { PostMediaResponseDto } from '@social-network/shared-contracts';
import { colors, common, ErrorNotice, Sheet } from './primitives';

export function Video({
  uri,
  active,
  autoPlay = false,
}: {
  uri: string;
  active: boolean;
  autoPlay?: boolean;
}) {
  const player = useVideoPlayer(uri, (instance) => {
    if (autoPlay && active) instance.play();
  });
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    const subscription = player.addListener('statusChange', ({ status }) =>
      setFailed(status === 'error'),
    );
    const appSubscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') player.pause();
    });
    return () => {
      subscription.remove();
      appSubscription.remove();
    };
  }, [player]);
  React.useEffect(() => {
    if (!active) player.pause();
  }, [active, player]);
  return failed ? (
    <ErrorNotice message="This video couldn't be loaded." />
  ) : (
    <VideoView
      player={player}
      nativeControls
      allowsFullscreen
      contentFit="contain"
      style={s.fill}
      accessibilityLabel="Post video"
    />
  );
}

function MediaItem({
  media,
  width,
  active,
}: {
  media: PostMediaResponseDto;
  width: number;
  active: boolean;
}) {
  const [playing, setPlaying] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const video = media.type === 'VIDEO';
  const imageUri = video ? media.poster : media.url;
  return (
    <View style={{ width, aspectRatio: 4 / 3 }}>
      {video && playing ? (
        <Video uri={media.hlsUrl || media.url} active={active} autoPlay />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={video ? 'Play video' : 'View full image'}
          style={s.fill}
          onPress={() => (video ? setPlaying(true) : setExpanded(true))}
        >
          {imageUri && !failed ? (
            <Image
              source={{ uri: imageUri }}
              resizeMode="cover"
              style={s.fill}
              onError={() => setFailed(true)}
            />
          ) : (
            <View style={s.fallback}>
              <ImageOff size={28} color={colors.muted} />
              <Text style={common.muted}>{video ? 'Video' : 'Image unavailable'}</Text>
            </View>
          )}
          {video && (
            <View style={s.play}>
              <Play size={24} color="white" fill="white" />
            </View>
          )}
        </Pressable>
      )}
      {expanded && (
        <Sheet title="Photo" onClose={() => setExpanded(false)}>
          <Image
            source={{ uri: media.url }}
            resizeMode="contain"
            style={s.fill}
            accessibilityLabel="Full post image"
          />
        </Sheet>
      )}
    </View>
  );
}

export function MediaGallery({
  media,
  active,
}: {
  media: PostMediaResponseDto[];
  active: boolean;
}) {
  const [width, setWidth] = React.useState(0);
  const [index, setIndex] = React.useState(0);
  const ordered = React.useMemo(() => [...media].sort((a, b) => a.order - b.order), [media]);
  if (!media.length) return null;
  return (
    <View style={s.gallery} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) =>
            setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
          }
        >
          {ordered.map((item, i) => (
            <MediaItem
              key={item.id || `${item.url}-${i}`}
              media={item}
              width={width}
              active={active && index === i}
            />
          ))}
        </ScrollView>
      )}
      {media.length > 1 && (
        <View style={s.pagination} accessibilityLabel={`Media ${index + 1} of ${media.length}`}>
          {ordered.map((item, i) => (
            <View key={item.id || i} style={[s.dot, i === index && s.selectedDot]} />
          ))}
          <Text style={s.count}>
            {index + 1}/{media.length}
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  gallery: { overflow: 'hidden', borderRadius: 18, backgroundColor: '#1b1b20', minHeight: 180 },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  play: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -26,
    marginLeft: -26,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000aa',
    borderRadius: 26,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    padding: 10,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#52525b' },
  selectedDot: { backgroundColor: colors.purple, width: 14 },
  count: { color: colors.muted, fontSize: 10, marginLeft: 6 },
});
