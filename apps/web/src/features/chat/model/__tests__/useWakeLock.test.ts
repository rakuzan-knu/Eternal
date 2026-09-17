import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWakeLock } from '../useWakeLock';

describe('useWakeLock', () => {
  const originalNavigator = window.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
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
