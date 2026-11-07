import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWakeLock } from '../useWakeLock';

describe('useWakeLock', () => {
  const originalNavigator = window.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  it('keeps desktop calls awake while hidden and releases the correct scope', async () => {
    const setCallActive = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('desktop', { setCallActive });
    const { rerender, unmount } = renderHook(({ active }) => useWakeLock(active, 'mesh'), {
      initialProps: { active: true },
    });
    expect(setCallActive).toHaveBeenCalledExactlyOnceWith('mesh', true);
    rerender({ active: false });
    expect(setCallActive).toHaveBeenLastCalledWith('mesh', false);
    unmount();
    expect(setCallActive).toHaveBeenCalledTimes(2);
  });

  it('requests screen wake lock when active', async () => {
    const mockRelease = vi.fn().mockResolvedValue(undefined);
    const mockRequest = vi.fn().mockResolvedValue({
      release: mockRelease,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    Object.defineProperty(window, 'navigator', {
      value: {
        ...originalNavigator,
        wakeLock: {
          request: mockRequest,
        },
      },
      writable: true,
    });

    const { unmount } = renderHook(() => useWakeLock(true));

    await vi.waitFor(() => expect(mockRequest).toHaveBeenCalledWith('screen'));

    unmount();
    expect(mockRelease).toHaveBeenCalled();
  });

  it('does nothing when inactive', () => {
    const mockRequest = vi.fn();
    Object.defineProperty(window, 'navigator', {
      value: {
        ...originalNavigator,
        wakeLock: {
          request: mockRequest,
        },
      },
      writable: true,
    });

    renderHook(() => useWakeLock(false));
    expect(mockRequest).not.toHaveBeenCalled();
  });
});
