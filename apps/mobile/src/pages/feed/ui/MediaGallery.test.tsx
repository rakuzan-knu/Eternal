// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { Video } from './MediaGallery';
const mocks = vi.hoisted(() => ({
  play: vi.fn(),
  pause: vi.fn(),
  status: 'loading',
  statusChanged: undefined as undefined | ((event: { status: string }) => void),
  appChanged: undefined as undefined | ((state: string) => void),
}));
vi.mock('expo-video', () => ({
  useVideoPlayer: () => ({
    get status() {
      return mocks.status;
    },
    play: mocks.play,
    pause: mocks.pause,
    addListener: (_: string, callback: (event: { status: string }) => void) => {
      mocks.statusChanged = callback;
      return { remove: vi.fn() };
    },
  }),
  VideoView: ({ accessibilityLabel }: { accessibilityLabel: string }) => (
    <div aria-label={accessibilityLabel} />
  ),
}));
vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  AppState: {
    currentState: 'active',
    addEventListener: (_: string, callback: (state: string) => void) => {
      mocks.appChanged = callback;
      return { remove: vi.fn() };
    },
  },
}));
vi.mock('lucide-react-native', () => ({ Play: () => null, ImageOff: () => null }));
vi.mock('./primitives', () => ({
  colors: {},
  common: {},
  ErrorNotice: ({ message }: { message: string }) => <div role="alert">{message}</div>,
  Sheet: () => null,
}));
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
let dispose: (() => Promise<void>) | undefined;
afterEach(async () => {
  await dispose?.();
  vi.clearAllMocks();
  mocks.status = 'loading';
});
it('starts autoplay after the media is ready and pauses when hidden or backgrounded', async () => {
  const element = document.createElement('div');
  const root = createRoot(element);
  dispose = async () => {
    await act(async () => root.unmount());
  };
  await act(async () => root.render(<Video uri="story.mp4" active autoPlay label="Story video" />));
  expect(mocks.play).not.toHaveBeenCalled();
  // Expo web emits statusChange before updating the player's status property.
  await act(async () => {
    mocks.statusChanged?.({ status: 'readyToPlay' });
    mocks.status = 'readyToPlay';
  });
  expect(mocks.play).toHaveBeenCalledOnce();
  await act(async () => mocks.statusChanged?.({ status: 'readyToPlay' }));
  expect(mocks.play).toHaveBeenCalledOnce();
  await act(async () => root.render(<Video uri="story.mp4" active={false} autoPlay />));
  expect(mocks.pause).toHaveBeenCalled();
  await act(async () => mocks.appChanged?.('background'));
  expect(mocks.pause).toHaveBeenCalledTimes(2);
});
