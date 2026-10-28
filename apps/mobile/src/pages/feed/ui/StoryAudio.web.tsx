import * as React from 'react';
import { AppState, Text, View } from 'react-native';
import Hls from 'hls.js';
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
  const audio = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const latest = React.useRef({ active, volume, startTimeMs, clipDurationSeconds });
  latest.current = { active, volume, startTimeMs, clipDurationSeconds };
  React.useEffect(() => {
    const element = audio.current;
    if (!element) return;
    let mounted = true;
    let hls: Hls | undefined;
    const play = () => {
      if (latest.current.active && document.visibilityState !== 'hidden')
        void element.play().catch(() => {
          if (mounted) setPlaying(false);
        });
    };
    const ready = () => {
      element.currentTime = latest.current.startTimeMs / 1000;
      play();
    };
    const loop = () => {
      const start = latest.current.startTimeMs / 1000;
      if (element.currentTime >= start + latest.current.clipDurationSeconds || element.ended) {
        element.currentTime = start;
        play();
      }
    };
    const error = () => setFailed(true);
    const state = () => setPlaying(!element.paused);
    const visibility = () => {
      if (document.visibilityState === 'hidden') element.pause();
    };
    element.volume = latest.current.volume;
    element.addEventListener('loadedmetadata', ready);
    element.addEventListener('timeupdate', loop);
    element.addEventListener('ended', loop);
    element.addEventListener('error', error);
    element.addEventListener('play', state);
    element.addEventListener('pause', state);
    document.addEventListener('visibilitychange', visibility);
    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') element.pause();
    });
    if (
      uri.includes('.m3u8') &&
      !element.canPlayType('application/vnd.apple.mpegurl') &&
      Hls.isSupported()
    ) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(uri);
      hls.attachMedia(element);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) setFailed(true);
      });
    } else {
      element.src = uri;
    }
    setFailed(false);
    return () => {
      mounted = false;
      element.pause();
      hls?.destroy();
      element.removeEventListener('loadedmetadata', ready);
      element.removeEventListener('timeupdate', loop);
      element.removeEventListener('ended', loop);
      element.removeEventListener('error', error);
      element.removeEventListener('play', state);
      element.removeEventListener('pause', state);
      document.removeEventListener('visibilitychange', visibility);
      appState.remove();
      element.removeAttribute('src');
      element.load();
    };
  }, [uri]);
  React.useEffect(() => {
    const element = audio.current;
    if (!element) return;
    if (element.readyState >= 1) element.currentTime = startTimeMs / 1000;
    if (!active) element.pause();
    else if (element.readyState >= 1 && document.visibilityState !== 'hidden')
      void element.play().catch(() => setPlaying(false));
  }, [active, startTimeMs]);
  React.useEffect(() => {
    if (audio.current) audio.current.volume = volume;
  }, [volume]);
  return (
    <View>
      <audio ref={audio} preload="metadata" aria-label={label} />
      <Button
        fullWidth={false}
        title={`${playing ? 'Pause' : 'Play'} ${label}`}
        variant="ghost"
        disabled={!active}
        onPress={() => {
          const element = audio.current;
          if (!element) return;
          if (playing) element.pause();
          else {
            setFailed(false);
            void element.play().catch(() => setFailed(true));
          }
        }}
      />
      {failed && (
        <Text accessibilityRole="alert" style={common.muted}>
          {tr('Audio could not be played. Tap Play to retry.')}
        </Text>
      )}
    </View>
  );
}
