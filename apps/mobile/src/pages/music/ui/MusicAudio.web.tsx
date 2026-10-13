import * as React from 'react';
import Hls from 'hls.js';
import type { MusicAudioProps } from './audioTypes';
export function MusicAudio(props: MusicAudioProps) {
  const ref = React.useRef<HTMLAudioElement>(null);
  const latest = React.useRef(props);
  latest.current = props;
  React.useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    let hls: Hls | undefined;
    let live = true;
    const play = () => {
      if (latest.current.playing)
        void audio.play().catch(() => {
          if (live) latest.current.onError();
        });
    };
    const ready = () => {
      audio.currentTime = latest.current.seek.value / 1000;
      play();
    };
    let lastProgress = 0;
    const progress = () => {
      const now = Date.now();
      if (now - lastProgress < (latest.current.lowPower ? 1000 : 400)) return;
      lastProgress = now;
      latest.current.onProgress(
        audio.currentTime * 1000,
        Number.isFinite(audio.duration) ? audio.duration * 1000 : 0,
      );
    };
    const ended = () => latest.current.onEnded();
    const error = () => latest.current.onError();
    audio.volume = latest.current.volume;
    audio.addEventListener('loadedmetadata', ready);
    audio.addEventListener('timeupdate', progress);
    audio.addEventListener('ended', ended);
    audio.addEventListener('error', error);
    if (props.isHls && !audio.canPlayType('application/vnd.apple.mpegurl') && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(props.uri);
      hls.attachMedia(audio);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) error();
      });
    } else audio.src = props.uri;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: props.track.title,
        artist: props.track.artist,
        artwork: props.track.albumArt ? [{ src: props.track.albumArt }] : [],
      });
      navigator.mediaSession.setActionHandler('play', () => latest.current.onPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => latest.current.onPlaying(false));
    }
    return () => {
      live = false;
      audio.pause();
      hls?.destroy();
      audio.removeEventListener('loadedmetadata', ready);
      audio.removeEventListener('timeupdate', progress);
      audio.removeEventListener('ended', ended);
      audio.removeEventListener('error', error);
      audio.removeAttribute('src');
      audio.load();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
      }
    };
  }, [props.uri, props.isHls, props.track.title, props.track.artist, props.track.albumArt]);
  React.useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    if (props.playing && audio.readyState >= 1) void audio.play().catch(props.onError);
    else if (!props.playing) audio.pause();
  }, [props.playing, props.onError]);
  React.useEffect(() => {
    if (ref.current) ref.current.volume = props.volume;
  }, [props.volume]);
  React.useEffect(() => {
    if (ref.current && ref.current.readyState >= 1)
      ref.current.currentTime = props.seek.value / 1000;
  }, [props.seek]);
  return <audio ref={ref} preload="auto" aria-label={`Audio: ${props.track.title}`} />;
}
