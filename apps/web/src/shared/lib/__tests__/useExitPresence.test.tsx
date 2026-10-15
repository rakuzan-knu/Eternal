import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useExitPresence } from '../useExitPresence';
afterEach(() => vi.useRealTimers());
describe('overlay exit presence', () => {
  it('unmounts after exit and cancels stale timers on rapid reopen', () => {
    vi.useFakeTimers();
    const view = renderHook(({ open }) => useExitPresence(open), { initialProps: { open: true } });
    view.rerender({ open: false });
    expect(view.result.current).toBe(true);
    act(() => vi.advanceTimersByTime(80));
    view.rerender({ open: true });
    act(() => vi.advanceTimersByTime(200));
    expect(view.result.current).toBe(true);
    view.rerender({ open: false });
    act(() => vi.advanceTimersByTime(160));
    expect(view.result.current).toBe(false);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
