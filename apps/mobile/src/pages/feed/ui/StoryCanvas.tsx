import * as React from 'react';
import {
  AccessibilityInfo,
  Animated,
  Image,
  PanResponder,
  Pressable,
  Platform,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Filter, FeColorMatrix, Image as SvgImage } from 'react-native-svg';
import type { AudioOverlay, StoryOverlay, TextOverlay } from '@social-network/shared-contracts';
import { clamp, snapAngle, snapCoordinate, STORY_FILTERS } from '../model/storyEditor';
import { isLoaded } from 'expo-font';
import { tr } from '@/shared/lib/i18n';

export function StoryBackground({ value }: { value: string }) {
  const matches = value.match(/#[\da-f]{3,8}|rgba?\([\d.,\s]+\)/gi);
  const first = matches?.[0] || '#181824';
  return (
    <LinearGradient
      colors={
        matches && matches.length >= 2
          ? [matches[0], matches[1], ...matches.slice(2)]
          : [first, first]
      }
      style={StyleSheet.absoluteFill}
    />
  );
}
function colorMatrix(operation: string, amount: number) {
  if (operation === 'brightness' || operation === 'contrast') {
    const offset = operation === 'contrast' ? (1 - amount) / 2 : 0;
    return [
      amount,
      0,
      0,
      0,
      offset,
      0,
      amount,
      0,
      0,
      offset,
      0,
      0,
      amount,
      0,
      offset,
      0,
      0,
      0,
      1,
      0,
    ];
  }
  const s = 1 - amount;
  return [
    1 - 0.607 * amount,
    0.769 * amount,
    0.189 * amount,
    0,
    0,
    0.349 * amount,
    1 - 0.314 * amount,
    0.168 * amount,
    0,
    0,
    0.272 * amount,
    0.534 * amount,
    s + 0.131 * amount,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
  ];
}
export function StoryImage({
  uri,
  width,
  height,
  filter = 'none',
  label,
  onError,
}: {
  uri: string;
  width: number;
  height: number;
  filter?: string | null;
  label: string;
  onError?: () => void;
}) {
  const id = React.useId().replace(/:/g, '');
  const preset = STORY_FILTERS.find((item) => item.id === filter);
  const errorCallback = React.useRef(onError);
  errorCallback.current = onError;
  React.useEffect(() => {
    if (preset?.operations.length)
      Image.getSize(
        uri,
        () => {},
        () => errorCallback.current?.(),
      );
  }, [uri, preset]);
  if (!preset?.operations.length)
    return (
      <Image
        source={{ uri }}
        resizeMode="contain"
        style={{ width, height }}
        accessibilityLabel={label}
        onError={onError}
      />
    );
  return (
    <Svg width={width} height={height} accessibilityLabel={label} accessibilityRole="image">
      <Defs>
        <Filter id={id} x="0" y="0" width="100%" height="100%">
          {preset.operations.map(([operation, amount], i) => (
            <FeColorMatrix
              key={i}
              in={i === 0 ? 'SourceGraphic' : `filter-${i - 1}`}
              result={`filter-${i}`}
              type={operation === 'saturate' || operation === 'hueRotate' ? operation : 'matrix'}
              values={
                operation === 'saturate' || operation === 'hueRotate'
                  ? [amount]
                  : colorMatrix(operation, amount)
              }
            />
          ))}
        </Filter>
      </Defs>
      <SvgImage
        href={{ uri }}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        filter={`url(#${id})`}
      />
    </Svg>
  );
}
export function storyVideoFilter(filter: string | null | undefined) {
  if (Platform.OS !== 'web') return undefined;
  return (
    STORY_FILTERS.find((item) => item.id === filter)
      ?.operations.map(
        ([operation, value]) =>
          `${operation === 'hueRotate' ? 'hue-rotate' : operation}(${value}${operation === 'hueRotate' ? 'deg' : ''})`,
      )
      .join(' ') || undefined
  );
}
export function StoryText({ overlay, width }: { overlay: TextOverlay; width: number }) {
  const progress = React.useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = React.useState(true);
  const [visibleText, setVisibleText] = React.useState(overlay.text);
  React.useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReducedMotion(value);
    });
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => {
      mounted = false;
      listener.remove();
    };
  }, []);
  React.useEffect(() => {
    progress.setValue(0);
    if (
      reducedMotion ||
      !overlay.animation ||
      overlay.animation === 'none' ||
      overlay.animation === 'typewriter'
    )
      return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: overlay.animation === 'bounce' ? 650 : 1500,
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: overlay.animation === 'bounce' ? 650 : 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [overlay.animation, progress, reducedMotion]);
  React.useEffect(() => {
    if (overlay.animation !== 'typewriter' || reducedMotion) {
      setVisibleText(overlay.text);
      return;
    }
    const letters = Array.from(overlay.text);
    let count = 0;
    const timer = setInterval(() => {
      count = count > letters.length + 15 ? 0 : count + 1;
      setVisibleText(letters.slice(0, count).join(''));
    }, 100);
    return () => clearInterval(timer);
  }, [overlay.animation, overlay.text, reducedMotion]);
  const font = overlay.fontFamily;
  const shadow = overlay.backgroundStyle === 'neon' || font === 'neon';
  const requestedFont =
    font === 'modern' || font === 'sans'
      ? undefined
      : font === 'serif'
        ? Platform.OS === 'ios'
          ? 'Georgia'
          : 'serif'
        : `Story-${font}`;
  const fontFamily =
    requestedFont?.startsWith('Story-') && !isLoaded(requestedFont) ? undefined : requestedFont;
  return (
    <Animated.View
      style={{
        opacity:
          overlay.animation === 'glow' && !reducedMotion
            ? progress.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] })
            : 1,
        transform: [
          {
            translateY:
              !reducedMotion && ['float', 'bounce', 'wave'].includes(overlay.animation || '')
                ? progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, overlay.animation === 'bounce' ? -16 : -8],
                  })
                : 0,
          },
          {
            rotate:
              overlay.animation === 'wave' && !reducedMotion
                ? progress.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] })
                : '0deg',
          },
        ],
      }}
    >
      <Text
        accessibilityLabel={overlay.text}
        style={{
          color: overlay.color,
          fontFamily,
          fontWeight: fontFamily ? 'normal' : '700',
          fontSize: Math.max(10, ((overlay.fontSizeCqw || overlay.fontSize / 3.75) * width) / 100),
          fontStyle: overlay.fontStyle,
          textAlign: overlay.textAlign,
          padding: 8,
          borderRadius: overlay.backgroundStyle === 'highlight' ? 4 : 14,
          backgroundColor: ['solid', 'glass', 'highlight'].includes(overlay.backgroundStyle)
            ? `${overlay.backgroundColor || '#000000'}${overlay.backgroundStyle === 'glass' ? '88' : ''}`
            : undefined,
          textShadowColor: shadow ? overlay.color : undefined,
          textShadowRadius: shadow ? 12 : 0,
          textShadowOffset: { width: 0, height: 0 },
        }}
      >
        {visibleText || ' '}
      </Text>
    </Animated.View>
  );
}
export function MusicSticker({ overlay }: { overlay: AudioOverlay }) {
  const style = overlay.musicStyle || 'card';
  if (style === 'none') return null;
  const color = overlay.stickerColor || '#ffffff';
  const channels = color.match(/[\da-f]{2}/gi)?.map((channel) => parseInt(channel, 16)) || [
    255, 255, 255,
  ];
  const darkText = channels[0] * 0.299 + channels[1] * 0.587 + channels[2] * 0.114 > 150;
  return (
    <View
      style={[
        s.music,
        style === 'card'
          ? { backgroundColor: color }
          : { backgroundColor: 'transparent', alignItems: 'center', flexDirection: 'column' },
      ]}
    >
      {style === 'vinyl' ? (
        <View style={s.vinyl}>
          <Image source={{ uri: overlay.albumArt }} style={s.vinylCover} />
          <View style={s.vinylHole} />
        </View>
      ) : overlay.albumArt ? (
        <Image
          source={{ uri: overlay.albumArt }}
          style={style === 'cover' ? s.cover : s.smallCover}
        />
      ) : (
        <Text style={{ fontSize: 28 }}>♫</Text>
      )}
      <View style={{ flexShrink: 1 }}>
        <Text
          numberOfLines={2}
          style={{
            color: style === 'card' && darkText ? '#18181b' : '#fff',
            fontWeight: '700',
            fontSize: 13,
            textAlign: style === 'card' ? 'left' : 'center',
          }}
        >
          {overlay.title || tr('Music')}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: style === 'card' && darkText ? '#52525b' : '#d4d4d8',
            fontSize: 11,
            textAlign: style === 'card' ? 'left' : 'center',
          }}
        >
          {overlay.artist || tr('Original audio')}
        </Text>
      </View>
    </View>
  );
}
export function StoryLayer({
  overlay,
  width,
  height,
  selected,
  disabled,
  onSelect,
  onChange,
  children,
}: {
  overlay: StoryOverlay;
  width: number;
  height: number;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  onChange?: (next: StoryOverlay) => void;
  children: React.ReactNode;
}) {
  const [measuredHeight, setMeasuredHeight] = React.useState(0);
  const latest = React.useRef({ overlay, onChange, onSelect, width, height, disabled });
  latest.current = { overlay, onChange, onSelect, width, height, disabled };
  const initial = React.useRef({ overlay, distance: 0, angle: 0, dx: 0, dy: 0 });
  const touchGeometry = (event: GestureResponderEvent) => {
    const [a, b] = event.nativeEvent.touches;
    return a && b
      ? {
          distance: Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY),
          angle: (Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX) * 180) / Math.PI,
        }
      : null;
  };
  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !latest.current.disabled &&
          !!latest.current.onChange &&
          (Math.abs(gesture.dx) + Math.abs(gesture.dy) > 3 || gesture.numberActiveTouches > 1),
        onPanResponderGrant: (event) => {
          latest.current.onSelect?.();
          const geometry = touchGeometry(event);
          initial.current = {
            overlay: latest.current.overlay,
            distance: geometry?.distance || 0,
            angle: geometry?.angle || 0,
            dx: 0,
            dy: 0,
          };
        },
        onPanResponderMove: (event, gesture) => {
          const value = latest.current;
          const start = initial.current;
          const geometry = touchGeometry(event);
          if (geometry) {
            if (!start.distance) {
              start.distance = geometry.distance;
              start.angle = geometry.angle;
              start.overlay = value.overlay;
            }
            value.onChange?.({
              ...start.overlay,
              scale: clamp((start.overlay.scale * geometry.distance) / start.distance, 0.3, 3.5),
              rotation: snapAngle(start.overlay.rotation + geometry.angle - start.angle),
            });
          } else {
            if (start.distance) {
              start.overlay = value.overlay;
              start.distance = 0;
              start.dx = gesture.dx;
              start.dy = gesture.dy;
            }
            value.onChange?.({
              ...start.overlay,
              xPercent: snapCoordinate(
                start.overlay.xPercent + ((gesture.dx - start.dx) / value.width) * 100,
              ),
              yPercent: snapCoordinate(
                start.overlay.yPercent + ((gesture.dy - start.dy) / value.height) * 100,
              ),
            });
          }
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [],
  );
  const layerWidth = width * 0.75;
  const layerStyle: ViewStyle = {
    position: 'absolute',
    left: (overlay.xPercent / 100) * width,
    top: (overlay.yPercent / 100) * height,
    width: layerWidth,
    zIndex: overlay.zIndex,
    borderWidth: selected ? 1 : 0,
    borderColor: '#ffffff99',
    borderStyle: 'dashed',
    transform: [
      { translateX: -layerWidth / 2 },
      { translateY: -measuredHeight / 2 },
      { rotate: `${overlay.rotation}deg` },
      { scale: overlay.scale },
    ],
  };
  if (!onSelect)
    return (
      <View
        onLayout={(event) => setMeasuredHeight(event.nativeEvent.layout.height)}
        style={layerStyle}
      >
        {children}
      </View>
    );
  return (
    <Pressable
      {...responder.panHandlers}
      onPress={onSelect}
      disabled={disabled || !onSelect}
      accessible={!!onSelect}
      accessibilityRole="button"
      accessibilityLabel={tr('Select layer')}
      accessibilityHint={tr(
        'Drag to move. Pinch with two fingers to resize and rotate. Use layer controls for precise adjustments.',
      )}
      accessibilityState={{ selected, disabled }}
      onLayout={(event) => setMeasuredHeight(event.nativeEvent.layout.height)}
      style={layerStyle}
    >
      {children}
    </Pressable>
  );
}
const s = StyleSheet.create({
  music: { padding: 10, gap: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center' },
  smallCover: { width: 44, height: 44, borderRadius: 7 },
  cover: { width: 120, height: 120, borderRadius: 12 },
  vinyl: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#15151c',
    borderWidth: 8,
    borderColor: '#303039',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vinylCover: { width: 56, height: 56, borderRadius: 28 },
  vinylHole: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
});
