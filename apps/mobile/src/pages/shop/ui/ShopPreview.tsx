import * as React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ImageOff } from 'lucide-react-native';
import { webOrigin } from '@/shared/api/client';
import { Avatar, colors } from '../../feed/ui/primitives';
import { assetUri, type ShopItem } from '../model/shop';
import { tr } from '@/shared/lib/i18n';

export function ShopPreview({
  item,
  size,
  userName,
  avatarUri,
  animated = false,
}: {
  item: ShopItem;
  size: number;
  userName: string;
  avatarUri?: string | null;
  animated?: boolean;
}) {
  const [failed, setFailed] = React.useState(false);
  const uri = assetUri(animated ? item.assetUrl : item.previewUrl, webOrigin);
  React.useEffect(() => setFailed(false), [uri]);
  const image = (style: object) =>
    failed ? null : (
      <Image
        source={{ uri }}
        style={style}
        resizeMode="contain"
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    );

  let content: React.ReactNode;
  if (item.kind === 'decoration') {
    const avatar = Math.round(size * 0.56);
    const ring = avatar * (item.renderScale ?? 1.2);
    content = (
      <View style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }}>
        <Avatar name={userName} uri={avatarUri} size={avatar} />
        {image({ position: 'absolute', width: ring, height: ring })}
      </View>
    );
  } else if (item.kind === 'nameplate') {
    content = (
      <View style={[s.nameplate, { width: size * 0.92 }]}>
        {image(StyleSheet.absoluteFill)}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: `rgba(0,0,0,${item.shadeOpacity ?? 0.25})` },
          ]}
        />
        <Avatar name={userName} uri={avatarUri} size={26} />
        <Text style={s.nameplateText} numberOfLines={1}>
          {userName}
        </Text>
      </View>
    );
  } else {
    content = image({ width: size * 0.86, height: size * 0.86 });
  }

  return (
    <View
      style={[s.stage, { width: '100%', height: size }]}
      accessibilityRole="image"
      accessibilityLabel={tr('Preview of {name}', { name: item.name })}
    >
      {failed && item.kind !== 'decoration' && item.kind !== 'nameplate' ? (
        <ImageOff size={24} color={colors.muted} />
      ) : (
        content
      )}
    </View>
  );
}

const s = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d0d10',
    overflow: 'hidden',
  },
  nameplate: {
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    backgroundColor: '#1c1c21',
  },
  nameplateText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    textShadowColor: '#000000aa',
    textShadowRadius: 3,
  },
});
