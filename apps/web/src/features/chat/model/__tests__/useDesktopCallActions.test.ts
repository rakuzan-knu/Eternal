import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDesktopCallActions } from '../useDesktopCallActions';

afterEach(() => vi.unstubAllGlobals());

describe('desktop call actions', () => {
  it('uses the canonical PTT controller and resets it on teardown', async () => {
    let resolveAction: (action: string) => void = () => {};
    const waitForCallAction = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveAction = resolve;
        }),
    );
    const configurePushToTalk = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('desktop', { waitForCallAction, configurePushToTalk });
    const onMute = vi.fn();
    const ptt = { enabled: true, key: 'KeyV', press: vi.fn(), release: vi.fn(), reset: vi.fn() };
    const { unmount } = renderHook(() => useDesktopCallActions(true, 'call', onMute, ptt));
    expect(configurePushToTalk).toHaveBeenCalledWith('call', true, 'KeyV');
    await act(async () => resolveAction('ptt-down'));
    expect(ptt.press).toHaveBeenCalledOnce();
    await act(async () => resolveAction('ptt-up'));
    expect(ptt.release).toHaveBeenCalledOnce();
    await act(async () => resolveAction('ptt-reset'));
    expect(ptt.reset).toHaveBeenCalledOnce();
    await act(async () => resolveAction('mute'));
    expect(onMute).toHaveBeenCalledOnce();
    unmount();
    expect(ptt.reset).toHaveBeenCalledTimes(2);
    expect(configurePushToTalk).toHaveBeenLastCalledWith('call', false, 'KeyV');
    await act(async () => resolveAction('ptt-down'));
    expect(ptt.press).toHaveBeenCalledOnce();
  });

  it('leaves browser behavior unchanged without the bridge', () => {
    vi.stubGlobal('desktop', undefined);
    const onMute = vi.fn();
    renderHook(() => useDesktopCallActions(true, 'call', onMute));
    expect(onMute).not.toHaveBeenCalled();
  });
});
