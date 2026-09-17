/**
 * Haptic Feedback Engine via Vibration API
 *
 * Delivers distinct physical tactile feedback patterns on mobile devices
 * and haptic-enabled touchpads for call signaling events (mute/unmute,
 * incoming rings, hand raises, and stream toggles).
 */

import { useCallStore } from '../../model/callStore';

export type HapticEventType =
  | 'mute'
  | 'unmute'
  | 'incomingCall'
  | 'handRaised'
  | 'callEnded'
  | 'screenShare'
  | 'cameraToggle'
  | 'error';

export const HAPTIC_PATTERNS: Record<HapticEventType, number | number[]> = {
  mute: [30, 40, 30],
  unmute: [45],
  incomingCall: [200, 100, 200, 100, 500],
  handRaised: [70, 50, 70],
  callEnded: [100, 50, 100],
  screenShare: [50],
  cameraToggle: [35],
  error: [150, 50, 150, 50, 250],
};

export function isVibrationSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'vibrate' in navigator &&
    typeof navigator.vibrate === 'function'
  );
}

/**
 * Triggers a tailored tactile vibration pattern
 */
export function triggerHaptic(type: HapticEventType, customPattern?: number | number[]): boolean {
  if (!isVibrationSupported()) {
    return false;
  }

  // Check store setting if available (defaults to true)
  try {
    const isEnabled = useCallStore.getState().isHapticsEnabled;
    if (isEnabled === false) {
      return false;
    }
  } catch {
    // In unit test or non-store environments, allow default
  }

  const pattern = customPattern ?? HAPTIC_PATTERNS[type];

  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

/**
 * Immediately cancels ongoing vibration patterns (e.g. when answering incoming call)
 */
export function cancelHaptic(): void {
  if (!isVibrationSupported()) return;
  try {
    navigator.vibrate(0);
  } catch {
    // Ignore browser vibration exceptions
  }
}
