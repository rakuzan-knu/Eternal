import * as React from 'react';
import { FlatList, Image, Modal, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import type { AttachmentView } from '@social-network/shared-contracts';
import { IconButton } from '../../feed/ui/primitives';
import { tr } from '@/shared/lib/i18n';

export function ImageViewer({
  images,
  initialIndex,
  onClose,
}: {
  images: AttachmentView[];
  initialIndex: number;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = React.useState(initialIndex);
  return (
    <Modal
      visible
      animationType="fade"
      onRequestClose={onClose}
      accessibilityLabel={tr('Photo viewer')}
    >
      <SafeAreaView style={s.screen}>
        <View style={s.top}>
          <Text style={s.counter} accessibilityLiveRegion="polite">
            {images.length > 1 ? `${index + 1} of ${images.length}` : ''}
          </Text>
          <IconButton label={tr('Close photo')} onPress={onClose}>
            <X size={24} color="#fff" />
          </IconButton>
        </View>
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(image) => image.id}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) =>
            setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
          }
          renderItem={({ item }) => (
            <View style={[s.page, { width }]}>
              <Image
                source={{ uri: item.url }}
                style={s.image}
                resizeMode="contain"
                accessibilityLabel={item.fileName ?? 'Photo'}
              />
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  counter: { color: '#fff', fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  page: { flex: 1, justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
});
