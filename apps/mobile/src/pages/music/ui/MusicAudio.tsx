import * as React from 'react';
import { useVideoPlayer } from 'expo-video';
import type { MusicAudioProps } from './audioTypes';
export function MusicAudio(props: MusicAudioProps) {
  const latest = React.useRef(props);
  const appliedSeek = React.useRef(-1);
  latest.current = props;
  const source = React.useMemo(
    () => ({
      uri: props.uri,
      metadata: {
        title: props.track.title,
        artist: props.track.artist,
        artwork: props.track.albumArt,
      },
    }),
    [props.uri, props.track.title, props.track.artist, props.track.albumArt],
  );
  const player = useVideoPlayer(source, (p) => {
    p.timeUpdateEventInterval = 0.5;
    p.staysActiveInBackground = true;
    p.showNowPlayingNotification = true;
    p.audioMixingMode = 'doNotMix';
  });
  React.useEffect(() => {
    const ready = () => {
      if (appliedSeek.current !== latest.current.seek.revision) {
        player.currentTime = latest.current.seek.value / 1000;
        appliedSeek.current = latest.current.seek.revision;
      }
      if (latest.current.playing) player.play();
    };
    const status = player.addListener('statusChange', (event) => {
      if (event.status === 'readyToPlay') ready();
      else if (event.status === 'error') latest.current.onError();
    });
    const progress = player.addListener('timeUpdate', (event) =>
      latest.current.onProgress(event.currentTime * 1000, player.duration * 1000),
    );
    const state = player.addListener('playingChange', (event) => {
      if (player.status === 'readyToPlay') latest.current.onPlaying(event.isPlaying);
    });
    const end = player.addListener('playToEnd', () => latest.current.onEnded());
    if (player.status === 'readyToPlay') ready();
    return () => {
      status.remove();
      progress.remove();
      state.remove();
      end.remove();
    };
  }, [player]);
  React.useEffect(() => {
    player.timeUpdateEventInterval = props.lowPower ? 1 : 0.5;
    player.audioMixingMode = props.lowPower ? 'mixWithOthers' : 'doNotMix';
  }, [player, props.lowPower]);
  React.useEffect(() => {
    player.volume = props.volume;
  }, [player, props.volume]);
  React.useEffect(() => {
    if (!props.playing) player.pause();
    else if (player.status === 'readyToPlay') player.play();
  }, [player, props.playing]);
  React.useEffect(() => {
    if (player.status === 'readyToPlay' && appliedSeek.current !== props.seek.revision) {
      player.currentTime = props.seek.value / 1000;
      appliedSeek.current = props.seek.revision;
    }
  }, [player, props.seek]);
  return null;
}
