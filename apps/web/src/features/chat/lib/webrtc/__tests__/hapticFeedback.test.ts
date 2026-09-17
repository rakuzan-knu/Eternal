import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  triggerHaptic,
  cancelHaptic,
  isVibrationSupported,
  HAPTIC_PATTERNS,
} from '../hapticFeedback';
import { useCallStore } from '../../../model/callStore';

describe('Haptic Feedback Engine (Vibration API)', () => {
  const originalVibrate = navigator.vibrate;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'vibrate', {
      value: originalVibrate,
      configurable: true,
      writable: true,
    });
  });

  it('detects vibration support accurately', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn().mockReturnValue(true),
      configurable: true,
      writable: true,
    });
    expect(isVibrationSupported()).toBe(true);

    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    expect(isVibrationSupported()).toBe(false);
  });

  it('triggers specific vibration patterns for mute and handRaised', () => {
    const vibrateMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      configurable: true,
      writable: true,
    });

    const muteResult = triggerHaptic('mute');
    expect(muteResult).toBe(true);
    expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.mute);

    const handResult = triggerHaptic('handRaised');
    expect(handResult).toBe(true);
    expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.handRaised);
  });

  it('cancels active vibration pattern', () => {
    const vibrateMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      configurable: true,
      writable: true,
    });

    cancelHaptic();
    expect(vibrateMock).toHaveBeenCalledWith(0);
  });

  it('respects isHapticsEnabled store flag when disabled', () => {
    const vibrateMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      configurable: true,
      writable: true,
    });

    useCallStore.setState({ isHapticsEnabled: false });

    const result = triggerHaptic('mute');
    expect(result).toBe(false);
    expect(vibrateMock).not.toHaveBeenCalled();

    // Reset store state
    useCallStore.setState({ isHapticsEnabled: true });
    const resultEnabled = triggerHaptic('unmute');
    expect(resultEnabled).toBe(true);
    expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.unmute);
  });
});
