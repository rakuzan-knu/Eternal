import * as React from 'react';
import { AppState, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BadgeCheck,
  Bookmark,
  Heart,
  MessageCircle,
  Music2,
  Play,
  Send,
  VideoOff,
} from 'lucide-react-native';
import type { ReelResponseDto } from '@social-network/shared-contracts';
import { haptics } from '@/shared/lib/haptics';
import { Avatar, colors } from '../../feed/ui/primitives';
import { compactCount } from '../../profile/model/profile';
import { reelSource } from '../model/reels';
import { tr } from '@/shared/lib/i18n';

function ReelVideo({
  uri,
  active,
  paused,
  muted,
  label,
}: {
  uri: string;
  active: boolean;
  paused: boolean;
  muted: boolean;
  label: string;
}) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
  });
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    player.muted = muted;
  }, [player, muted]);
  React.useEffect(() => {
    const sync = () => {
      if (active && !paused && AppState.currentState === 'active') player.play();
      else player.pause();
    };
    sync();
    const status = player.addListener('statusChange', ({ status: next }) => {
      setFailed(next === 'error');
      if (next === 'readyToPlay') sync();
    });
    const app = AppState.addEventListener('change', sync);
    return () => {
      status.remove();
      app.remove();
    };
  }, [player, active, paused]);
  if (failed)
    return (
      <View style={s.center} accessibilityRole="alert">
        <VideoOff size={28} color={colors.muted} />
        <Text style={s.fallbackText}>{tr("This reel couldn't be played.")}</Text>
      </View>
    );
  return (
    <VideoView
      player={player}
      nativeControls={false}
      contentFit="cover"
      style={s.video}
      accessibilityLabel={label}
    />
  );
}

function RailButton({
  label,
  count,
  selected,
  disabled,
  onPress,
  children,
}: {
  label: string;
  count?: number;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count === undefined ? label : `${label}, ${count}`}
      accessibilityState={{ selected, disabled }}
      aria-pressed={selected}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [s.rail, pressed && s.pressed, disabled && s.disabled]}
    >
      <View style={s.railIcon}>{children}</View>
      {count !== undefined && <Text style={s.railCount}>{compactCount(count)}</Text>}
    </Pressable>
  );
}

export const ReelSlide = React.memo(function ReelSlide({
  reel,
  height,
  active,
  mounted,
  muted,
  isOnline,
  onLike,
  onSave,
  onComments,
  onShare,
  onOpenAuthor,
}: {
  reel: ReelResponseDto;
  height: number;
  active: boolean;
  mounted: boolean;
  muted: boolean;
  isOnline: boolean;
  onLike: (reel: ReelResponseDto) => void;
  onSave: (reel: ReelResponseDto) => void;
  onComments: (reel: ReelResponseDto) => void;
  onShare: (reel: ReelResponseDto) => void;
  onOpenAuthor: (username: string) => void;
}) {
  const [paused, setPaused] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const author = reel.author.displayName || reel.author.username;
  React.useEffect(() => {
    if (!active) setPaused(false);
  }, [active]);

  return (
    <View style={[s.slide, { height }]}>
      {mounted ? (
        <ReelVideo
          uri={reelSource(reel)}
          active={active}
          paused={paused}
          muted={muted}
          label={tr('Reel by {name}', { name: author })}
        />
      ) : reel.thumbnailUrl ? (
        <Image
          source={{ uri: reel.thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel={paused ? tr('Play reel') : tr('Pause reel')}
        onPress={() => setPaused((value) => !value)}
      >
        {paused && (
          <View style={s.center} pointerEvents="none">
            <View style={s.playBadge}>
              <Play size={30} color="#fff" fill="#fff" />
            </View>
          </View>
        )}
      </Pressable>
      <LinearGradient colors={['transparent', '#000000b3']} style={s.scrim} pointerEvents="none" />
      <View style={[s.meta, { paddingBottom: 16 }]} pointerEvents="box-none">
        <View style={s.info} pointerEvents="box-none">
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={tr('Open {name} profile', { name: author })}
            onPress={() => onOpenAuthor(reel.author.username)}
            style={({ pressed }) => [s.author, pressed && s.pressed]}
          >
            <Avatar name={author} uri={reel.author.avatar} size={34} />
            <Text style={s.authorName} numberOfLines={1}>
              {author}
            </Text>
            {reel.author.isVerified && (
              <BadgeCheck size={16} color="#fff" accessibilityLabel={tr('Verified account')} />
            )}
          </Pressable>
          {!!reel.caption && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={reel.caption}
              accessibilityHint={
                expanded ? tr('Collapses the caption') : tr('Shows the full caption')
              }
              onPress={() => setExpanded((value) => !value)}
            >
              <Text style={s.caption} numberOfLines={expanded ? 8 : 2}>
                {reel.caption}
              </Text>
            </Pressable>
          )}
          {(reel.audioTitle || reel.audioArtist) && (
            <View style={s.audio}>
              <Music2 size={13} color="#fff" />
              <Text style={s.audioText} numberOfLines={1}>
                {[reel.audioTitle, reel.audioArtist].filter(Boolean).join(' – ')}
              </Text>
            </View>
          )}
        </View>
        <View style={s.rails}>
          <RailButton
            label={reel.isLiked ? tr('Unlike') : tr('Like')}
            count={reel.likesCount}
            selected={!!reel.isLiked}
            disabled={!isOnline}
            onPress={() => {
              haptics.light();
              onLike(reel);
            }}
          >
            <Heart
              size={28}
              color={reel.isLiked ? '#f43f5e' : '#fff'}
              fill={reel.isLiked ? '#f43f5e' : 'transparent'}
            />
          </RailButton>
          <RailButton
            label={tr('Comments')}
            count={reel.commentsCount}
            onPress={() => onComments(reel)}
          >
            <MessageCircle size={28} color="#fff" />
          </RailButton>
          <RailButton
            label={reel.isSaved ? tr('Remove from saved') : tr('Save')}
            selected={!!reel.isSaved}
            disabled={!isOnline}
            onPress={() => {
              haptics.light();
              onSave(reel);
            }}
          >
            <Bookmark size={27} color="#fff" fill={reel.isSaved ? '#fff' : 'transparent'} />
          </RailButton>
          <RailButton label={tr('Share')} count={reel.sharesCount} onPress={() => onShare(reel)}>
            <Send size={26} color="#fff" />
          </RailButton>
        </View>
      </View>
    </View>
  );
});

const shadow = Platform.select({
  web: { textShadow: '0 1px 4px rgba(0,0,0,0.6)' },
  default: { textShadowColor: '#00000099', textShadowRadius: 4 },
});

const s = StyleSheet.create({
  slide: { width: '100%', backgroundColor: '#000', overflow: 'hidden' },
  video: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  fallbackText: { color: colors.muted, fontSize: 14 },
  playBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#00000066',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' },
  meta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    gap: 12,
  },
  info: { flex: 1, minWidth: 0, gap: 10 },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  authorName: { color: '#fff', fontWeight: '700', fontSize: 15, flexShrink: 1, ...shadow },
  caption: { color: '#fff', fontSize: 14, lineHeight: 20, ...shadow },
  audio: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  audioText: { color: '#fff', fontSize: 13, flexShrink: 1, ...shadow },
  rails: { alignItems: 'center', gap: 14 },
  rail: { alignItems: 'center', minWidth: 48, gap: 2 },
  railIcon: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center' },
  railCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    ...shadow,
  },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.45 },
});
