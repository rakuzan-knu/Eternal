import * as React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Music2, MoreHorizontal, Play, AlertCircle, ChevronRight } from 'lucide-react-native';
import { colors, IconButton } from '../../feed/ui/primitives';
import { durationLabel, type Track, type Playlist } from '../model/music';
export function Cover({
  uri,
  size = 52,
  rounded = 12,
}: {
  uri?: string | null;
  size?: number;
  rounded?: number;
}) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [uri]);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        backgroundColor: '#302144',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          accessibilityIgnoresInvertColors
          onError={() => setFailed(true)}
        />
      ) : (
        <Music2 size={Math.min(36, size * 0.45)} color="#bd91f5" />
      )}
    </View>
  );
}
export function Chips({
  values,
  value,
  onChange,
  label,
}: {
  values: readonly string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
      accessibilityLabel={label}
    >
      {values.map((item) => (
        <Pressable
          key={item}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${item}`}
          accessibilityState={{ selected: item === value }}
          aria-pressed={item === value}
          onPress={() => onChange(item)}
          style={[m.chip, item === value && m.chipActive]}
        >
          <Text style={[m.text, item === value && { color: '#17121f', fontWeight: '700' }]}>
            {item}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export function TrackRow({
  track,
  active,
  playing,
  onPlay,
  onMore,
  subtitle,
}: {
  track: Track;
  active?: boolean;
  playing?: boolean;
  onPlay: () => void;
  onMore?: () => void;
  subtitle?: string;
}) {
  return (
    <View style={[m.track, active && { backgroundColor: '#a66af815' }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${playing && active ? 'Pause' : 'Play'} ${track.title} by ${track.artist}`}
        onPress={onPlay}
        style={m.trackMain}
      >
        <Cover uri={track.albumArt} />
        <View style={m.flex}>
          <Text numberOfLines={1} style={[m.trackTitle, active && { color: colors.purple }]}>
            {track.title}
          </Text>
          <Text numberOfLines={1} style={m.muted}>
            {subtitle || track.artist}
          </Text>
        </View>
        <Text style={m.small}>{durationLabel(track.durationMs)}</Text>
      </Pressable>
      {onMore && (
        <IconButton label={`More options for ${track.title}`} onPress={onMore}>
          <MoreHorizontal size={21} color={colors.muted} />
        </IconButton>
      )}
    </View>
  );
}
export function PlaylistCard({ playlist, onPress }: { playlist: Playlist; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open playlist ${playlist.title}`}
      onPress={onPress}
      style={m.card}
    >
      <Cover uri={playlist.coverUrl || playlist.tracks[0]?.albumArt} size={140} rounded={18} />
      <Text style={m.trackTitle} numberOfLines={2}>
        {playlist.title}
      </Text>
      <Text style={m.muted} numberOfLines={1}>
        {playlist.creator || playlist.source || 'Playlist'}
      </Text>
    </Pressable>
  );
}
export function Section({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={m.section}>
      <Text accessibilityRole="header" style={m.heading}>
        {title}
      </Text>
      {action && onAction && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${action}: ${title}`}
          onPress={onAction}
          style={m.touch}
        >
          <Text style={m.accent}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}
export function MusicStatus({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
      <AlertCircle size={18} color="#c8bbcF" />
      <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[m.muted, m.flex]}>
        {message}
      </Text>
      {onRetry && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Retry: ${message}`}
          onPress={onRetry}
          style={m.touch}
        >
          <Text style={m.accent}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}
export function LibraryRow({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${title.toLowerCase()}`}
      onPress={onPress}
      style={({ pressed }) => [
        m.row,
        {
          minHeight: 72,
          paddingVertical: 10,
          borderRadius: 12,
          backgroundColor: pressed ? '#ffffff09' : 'transparent',
        },
      ]}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: '#9e68e915',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={m.flex}>
        <Text style={[m.trackTitle, { fontSize: 16 }]}>{title}</Text>
        {!!subtitle && <Text style={m.muted}>{subtitle}</Text>}
      </View>
      <ChevronRight size={19} color={colors.muted} />
    </Pressable>
  );
}
export function PlayButton({
  onPress,
  disabled = false,
  label = 'Play',
}: {
  onPress: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[m.play, disabled && { opacity: 0.35 }]}
    >
      <Play size={24} fill="#fff" color="#fff" />
    </Pressable>
  );
}
export const m = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  text: { color: '#f7f4fc', fontSize: 14 },
  muted: { color: '#a7a2af', fontSize: 12, lineHeight: 18 },
  small: { color: '#8d8797', fontSize: 11 },
  accent: { color: '#c49bf9', fontSize: 13, fontWeight: '600' },
  heading: { color: '#fff', fontSize: 21, fontWeight: '800', letterSpacing: -0.5, flexShrink: 1 },
  title: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  touch: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 17,
    borderRadius: 24,
    backgroundColor: '#ffffff0e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff08',
  },
  chipActive: { backgroundColor: '#eee6f9', borderColor: '#eee6f9' },
  track: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 14, minHeight: 72 },
  trackMain: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    minHeight: 68,
    padding: 5,
  },
  trackTitle: { color: '#fff', fontSize: 14, fontWeight: '600', lineHeight: 21 },
  card: { width: 156, padding: 8, gap: 9, borderRadius: 22, backgroundColor: '#ffffff05' },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
    marginBottom: 10,
  },
  input: {
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: '#ffffff0b',
    borderWidth: 1,
    borderColor: '#ffffff0d',
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 15,
  },
  play: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8c45ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  content: { paddingHorizontal: 16, paddingBottom: 22, gap: 10 },
  empty: { paddingVertical: 36, paddingHorizontal: 20, alignItems: 'center', gap: 12 },
});
