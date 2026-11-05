import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMeshPushToTalk } from '../useMeshPushToTalk';
import { useCallStore } from '../callStore';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('desktop', {});
  useCallStore.setState({
    callStatus: 'idle',
    isPTTEnabled: true,
    pttKey: 'KeyV',
    pttReleaseTailMs: 250,
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('desktop mesh push-to-talk', () => {
  it('gates the independent mesh microphone and retains release tail', () => {
    const mute = vi.fn();
    renderHook(() => useMeshPushToTalk(true, false, mute));
    expect(mute).toHaveBeenLastCalledWith(true);
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV' })));
    expect(mute).toHaveBeenLastCalledWith(false);
    act(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyV' })));
    act(() => vi.advanceTimersByTime(249));
    expect(mute).toHaveBeenLastCalledWith(false);
    act(() => vi.advanceTimersByTime(1));
    expect(mute).toHaveBeenLastCalledWith(true);
  });

  it('resets native hold immediately on deafen and teardown', () => {
    const mute = vi.fn();
    const { result, rerender, unmount } = renderHook(
      ({ deafened }) => useMeshPushToTalk(true, deafened, mute),
      { initialProps: { deafened: false } },
    );
    act(() => result.current.press());
    expect(mute).toHaveBeenLastCalledWith(false);
    rerender({ deafened: true });
    expect(mute).toHaveBeenLastCalledWith(true);
    act(() => result.current.press());
    expect(mute).toHaveBeenLastCalledWith(true);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves the existing browser mesh behavior', () => {
    vi.stubGlobal('desktop', undefined);
    const mute = vi.fn();
    renderHook(() => useMeshPushToTalk(true, false, mute));
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV' })));
    expect(mute).not.toHaveBeenCalled();
  });

  it('gives the connected conversation call priority and restores mesh PTT afterwards', () => {
    const mute = vi.fn();
    const { result } = renderHook(() => useMeshPushToTalk(true, false, mute));
    act(() => result.current.press());
    expect(mute).toHaveBeenLastCalledWith(false);
    act(() => useCallStore.setState({ callStatus: 'connected' }));
    expect(result.current.enabled).toBe(false);
    expect(mute).toHaveBeenLastCalledWith(true);
    act(() => useCallStore.setState({ callStatus: 'idle' }));
    expect(result.current.enabled).toBe(true);
  });
});
