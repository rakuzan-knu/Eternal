import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCallKeyboardShortcuts } from '../useCallKeyboardShortcuts';
import { useCallStore } from '../callStore';

describe('useCallKeyboardShortcuts Hook', () => {
  const onToggleMute = vi.fn();
  const onToggleVideo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    useCallStore.setState({
      callStatus: 'connected',
      isPTTEnabled: true,
      isPTTActive: false,
      isMuted: true,
      isVideoOff: false,
      pttReleaseTailMs: 250,
      isPTTSoundEnabled: false,
    });
  });

  it('triggers Push-to-Talk unmute on Space down and mutes after release tail', () => {
    renderHook(() => useCallKeyboardShortcuts({ onToggleMute, onToggleVideo }));

    // Press Space down
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    });

    expect(useCallStore.getState().isPTTActive).toBe(true);
    expect(useCallStore.getState().isMuted).toBe(false);

    // Release Space
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    });

    // Still unmuted during tail
    expect(useCallStore.getState().isPTTActive).toBe(true);

    // Advance timers past 250ms release tail
    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(useCallStore.getState().isPTTActive).toBe(false);
    expect(useCallStore.getState().isMuted).toBe(true);
  });

  it('triggers onToggleMute on Cmd/Ctrl + Shift + M', () => {
    renderHook(() => useCallKeyboardShortcuts({ onToggleMute, onToggleVideo }));

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'M',
          ctrlKey: true,
          shiftKey: true,
        }),
      );
    });

    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });

  it('triggers onToggleVideo on Cmd/Ctrl + Shift + V', () => {
    renderHook(() => useCallKeyboardShortcuts({ onToggleMute, onToggleVideo }));

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'V',
          ctrlKey: true,
          shiftKey: true,
        }),
      );
    });

    expect(onToggleVideo).toHaveBeenCalledTimes(1);
  });

  it('ignores hotkeys when typing inside an input element', () => {
    renderHook(() => useCallKeyboardShortcuts({ onToggleMute, onToggleVideo }));

    const input = document.createElement('input');
    document.body.appendChild(input);

    act(() => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          code: 'Space',
          bubbles: true,
        }),
      );
    });

    expect(useCallStore.getState().isPTTActive).toBe(false);
    input.remove();
  });
});
