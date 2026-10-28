import * as React from 'react';
import { AppState, Text, View } from 'react-native';
import { useVideoPlayer } from 'expo-video';
import { Button } from '@/shared/ui';
import { common } from './primitives';
import type { StoryAudioProps } from './storyAudioTypes';
import { tr } from '@/shared/lib/i18n';

export function StoryAudio({
  uri,
  active,
  volume = 1,
  startTimeMs = 0,
  clipDurationSeconds = 15,
  label = tr('Story music'),
}: StoryAudioProps) {
  const player = useVideoPlayer(uri);
  const [playing, setPlaying] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const start = startTimeMs / 1000;
  const latest = React.useRef({ active, start, clipDurationSeconds });
  latest.current = { active, start, clipDurationSeconds };
  React.useEffect(() => {
    player.volume = volume;
    player.timeUpdateEventInterval = 0.2;
  }, [player, volume]);
  React.useEffect(() => {
    const ready = () => {
      setFailed(false);
      player.currentTime = latest.current.start;
      if (latest.current.active && AppState.currentState === 'active') player.play();
    };
    const status = player.addListener('statusChange', (event) => {
      if (event.status === 'readyToPlay') ready();
      else if (event.status === 'error') setFailed(true);
    });
    const time = player.addListener('timeUpdate', (event) => {
      const value = latest.current;
      if (event.currentTime >= value.start + value.clipDurationSeconds)
        player.currentTime = value.start;
    });
    const state = player.addListener('playingChange', (event) => setPlaying(event.isPlaying));
    const end = player.addListener('playToEnd', () => {
      player.currentTime = latest.current.start;
      if (latest.current.active) player.play();
    });
    const background = AppState.addEventListener('change', (value) => {
      if (value !== 'active') player.pause();
    });
    if (player.status === 'readyToPlay') ready();
    return () => {
      status.remove();
      time.remove();
      state.remove();
      end.remove();
      background.remove();
    };
  }, [player]);
  React.useEffect(() => {
    player.currentTime = start;
    if (!active) player.pause();
    else if (player.status === 'readyToPlay' && AppState.currentState === 'active') player.play();
  }, [player, active, start]);
  return (
    <View>
      <Button
        title={`${playing ? 'Pause' : 'Play'} ${label}`}
        fullWidth={false}
        variant="ghost"
        disabled={!active}
        onPress={() => (playing ? player.pause() : player.play())}
      />
      {failed && (
        <Text accessibilityRole="alert" style={common.muted}>
          {tr('Audio could not be played. Tap Play to retry.')}
        </Text>
      )}
    </View>
  );
}
