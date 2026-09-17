import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePushToTalk } from '../usePushToTalk';
import { useCallStore } from '../callStore';
import * as ringtone from '../../lib/callRingtone';

describe('usePushToTalk Hook (Release Tail & Walkie-Talkie Audio)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(ringtone, 'playPTTPressChirp').mockImplementation(() => {});
    vi.spyOn(ringtone, 'playPTTReleaseChirp').mockImplementation(() => {});

    useCallStore.setState({
      callStatus: 'connected',
      isPTTEnabled: true,
      isPTTActive: false,
      pttReleaseTailMs: 250,
      isPTTSoundEnabled: true,
      isMuted: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('activates microphone on Space keydown and plays press chirp', () => {
    const toggleMuteTrack = vi.fn();
    renderHook(() => usePushToTalk({ toggleMuteTrack }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    });

    expect(toggleMuteTrack).toHaveBeenCalledWith(false);
    expect(useCallStore.getState().isPTTActive).toBe(true);
    expect(useCallStore.getState().isMuted).toBe(false);
    expect(ringtone.playPTTPressChirp).toHaveBeenCalledTimes(1);
  });

  it('keeps audio open during 250ms release tail before muting on keyup', () => {
    const toggleMuteTrack = vi.fn();
    renderHook(() => usePushToTalk({ toggleMuteTrack }));

    // Press
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    });
    expect(useCallStore.getState().isPTTActive).toBe(true);

    // Release
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    });

    // 150ms later (still inside release tail hangover)
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(useCallStore.getState().isPTTActive).toBe(true);
    expect(ringtone.playPTTReleaseChirp).not.toHaveBeenCalled();

    // Advance remaining 100ms (total 250ms)
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(useCallStore.getState().isPTTActive).toBe(false);
    expect(useCallStore.getState().isMuted).toBe(true);
    expect(toggleMuteTrack).toHaveBeenLastCalledWith(true);
    expect(ringtone.playPTTReleaseChirp).toHaveBeenCalledTimes(1);
  });

  it('ignores Space events when user is typing in an input element', () => {
    const toggleMuteTrack = vi.fn();
    renderHook(() => usePushToTalk({ toggleMuteTrack }));

    const input = document.createElement('input');
    document.body.appendChild(input);

    act(() => {
      const event = new KeyboardEvent('keydown', { code: 'Space', bubbles: true });
      input.dispatchEvent(event);
    });

    expect(toggleMuteTrack).not.toHaveBeenCalled();
    expect(useCallStore.getState().isPTTActive).toBe(false);

    document.body.removeChild(input);
  });
});
