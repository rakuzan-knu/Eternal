// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { MusicAudio } from './MusicAudio';
import { trackSchema } from '../model/music';
import type { MusicAudioProps } from './audioTypes';

const player = vi.hoisted(() => ({
  status: 'readyToPlay',
  currentTime: 0,
  volume: 1,
  duration: 180,
  timeUpdateEventInterval: 0,
  audioMixingMode: '',
  play: vi.fn(),
  pause: vi.fn(),
  addListener: vi.fn(),
}));
vi.mock('expo-video', () => ({ useVideoPlayer: () => player }));
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
it('does not rewind after buffering and applies a seek queued during loading exactly once', async () => {
  let ready: ((event: { status: string }) => void) | undefined;
  player.addListener.mockImplementation(
    (event: string, handler: (event: { status: string }) => void) => {
      if (event === 'statusChange') ready = handler;
      return { remove: vi.fn() };
    },
  );
  const root = createRoot(document.createElement('div'));
  const props: MusicAudioProps = {
    track: trackSchema.parse({ id: 'sc-a', title: 'Song', artist: 'Artist' }),
    uri: 'https://audio.example/song.mp3',
    isHls: false,
    playing: true,
    volume: 0.8,
    seek: { value: 0, revision: 1 },
    onProgress: vi.fn(),
    onPlaying: vi.fn(),
    onEnded: vi.fn(),
    onError: vi.fn(),
  };
  const render = () => act(async () => root.render(<MusicAudio {...props} />));
  try {
    await render();
    player.currentTime = 60;
    await act(async () => ready?.({ status: 'readyToPlay' }));
    expect(player.currentTime).toBe(60);
    player.status = 'loading';
    props.seek = { value: 90000, revision: 2 };
    props.lowPower = true;
    await render();
    expect(player.currentTime).toBe(60);
    expect(player.timeUpdateEventInterval).toBe(1);
    expect(player.audioMixingMode).toBe('mixWithOthers');
    player.status = 'readyToPlay';
    await act(async () => ready?.({ status: 'readyToPlay' }));
    expect(player.currentTime).toBe(90);
    player.currentTime = 95;
    await act(async () => ready?.({ status: 'readyToPlay' }));
    expect(player.currentTime).toBe(95);
  } finally {
    await act(async () => root.unmount());
  }
});
