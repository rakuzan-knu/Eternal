import * as React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Film, Play } from 'lucide-react-native';
import type { ReelResponseDto } from '@social-network/shared-contracts';
import { colors } from '../../feed/ui/primitives';
import { compactCount } from '../../profile/model/profile';
import { plural, tr } from '@/shared/lib/i18n';

export function ReelGrid({
  reels,
  onOpen,
}: {
  reels: ReelResponseDto[];
  onOpen: (index: number) => void;
}) {
  return (
    <View style={s.grid} accessibilityRole="list">
      {reels.map((reel, index) => (
        <ReelTile key={reel.id} reel={reel} onPress={() => onOpen(index)} />
      ))}
    </View>
  );
}

function ReelTile({ reel, onPress }: { reel: ReelResponseDto; onPress: () => void }) {
  const [failed, setFailed] = React.useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        reel.caption ? `${tr('Play reel')}: ${reel.caption}` : tr('Play reel'),
        plural(reel.viewsCount, { one: '{count} view', other: '{count} views' }),
      ].join(', ')}
      onPress={onPress}
      style={({ pressed }) => [s.tile, pressed && s.pressed]}
    >
      {reel.thumbnailUrl && !failed ? (
        <Image
          source={{ uri: reel.thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={s.placeholder}>
          <Film size={22} color={colors.muted} />
        </View>
      )}
      <View style={s.views}>
        <Play size={12} color="#fff" fill="#fff" />
        <Text style={s.viewsText}>{compactCount(reel.viewsCount)}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  tile: {
    width: '32.9%',
    aspectRatio: 9 / 16,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.7 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  views: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: '#000000aa',
    textShadowRadius: 4,
  },
});
