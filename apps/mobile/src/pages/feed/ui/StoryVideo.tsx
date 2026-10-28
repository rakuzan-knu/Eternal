import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { Video } from './MediaGallery';
import { storyVideoFilter } from './StoryCanvas';
import type { StoryVideoProps } from './storyVideoTypes';
import { tr } from '@/shared/lib/i18n';
export function StoryVideo({
  uri,
  active,
  volume = 1,
  filter,
  label = tr('Story video'),
}: StoryVideoProps) {
  return (
    <View style={[StyleSheet.absoluteFill, { filter: storyVideoFilter(filter) }]}>
      <Video uri={uri} active={active} autoPlay volume={volume} loop label={label} />
    </View>
  );
}
