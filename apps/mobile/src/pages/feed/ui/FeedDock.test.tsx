// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { FeedDock, openWebSection } from './FeedDock';

const openURL = vi.hoisted(() => vi.fn());
vi.mock('@/shared/api/client', () => ({ webOrigin: 'https://eternal.example' }));
vi.mock('./primitives', () => ({ colors: {} }));
vi.mock('lucide-react-native', () =>
  Object.fromEntries(
    ['Film', 'Home', 'MessageSquare', 'Music2', 'Search', 'UserRound'].map((name) => [
      name,
      () => null,
    ]),
  ),
);
vi.mock('react-native', async () => {
  const React = await import('react');
  const View = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    View,
    Text: View,
    Linking: { openURL },
    StyleSheet: { create: (styles: unknown) => styles },
    Pressable: ({
      children,
      onPress,
      disabled,
      accessibilityLabel,
    }: {
      children?: React.ReactNode;
      onPress: () => void;
      disabled?: boolean;
      accessibilityLabel: string;
    }) => (
      <button aria-label={accessibilityLabel} disabled={disabled} onClick={onPress}>
        {children}
      </button>
    ),
  };
});

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
let dispose: (() => Promise<void>) | undefined;
afterEach(async () => {
  await dispose?.();
  dispose = undefined;
  vi.clearAllMocks();
});

async function setup(busy = false) {
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  const onHome = vi.fn();
  const onProfile = vi.fn();
  const onError = vi.fn();
  await act(async () =>
    root.render(
      <FeedDock
        home
        busy={busy}
        profileOpen={false}
        onHome={onHome}
        onProfile={onProfile}
        onError={onError}
      />,
    ),
  );
  dispose = async () => {
    await act(async () => root.unmount());
    element.remove();
  };
  const click = async (label: string) => {
    const button = Array.from(element.querySelectorAll('button')).find(
      (item) => item.getAttribute('aria-label') === label,
    );
    if (!button) throw new Error(`Missing navigation action: ${label}`);
    await act(async () => button.click());
  };
  return { click, onHome, onProfile, onError };
}

it('opens Home and the native profile menu without leaving the app', async () => {
  const dock = await setup();
  await dock.click('Home, current page');
  await dock.click('Profile');
  expect(dock.onHome).toHaveBeenCalledOnce();
  expect(dock.onProfile).toHaveBeenCalledOnce();
  expect(openURL).not.toHaveBeenCalled();
});

it('opens the existing web destinations for Reels, Messages and Music Hub', async () => {
  openURL.mockResolvedValue(undefined);
  const dock = await setup();
  await dock.click('Reels');
  await dock.click('Messages');
  await dock.click('Music Hub');
  expect(openURL.mock.calls.map(([url]) => url)).toEqual([
    'https://eternal.example/reels',
    'https://eternal.example/messages',
    'https://eternal.example/music',
  ]);
  expect(dock.onError).toHaveBeenCalledTimes(3);
  expect(dock.onError).toHaveBeenLastCalledWith(false);
});

it('prevents changing the feed while publishing and keeps the profile menu available', async () => {
  const dock = await setup(true);
  await dock.click('Home, current page');
  await dock.click('Profile');
  expect(dock.onHome).not.toHaveBeenCalled();
  expect(dock.onProfile).toHaveBeenCalledOnce();
});

it('reports a failed destination and clears the error when retrying', async () => {
  const onError = vi.fn();
  openURL.mockRejectedValueOnce(new Error('No browser')).mockResolvedValueOnce(undefined);
  await openWebSection('/music', onError);
  expect(onError.mock.calls).toEqual([[false], [true]]);
  await openWebSection('/music', onError);
  expect(onError).toHaveBeenLastCalledWith(false);
});
