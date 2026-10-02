import { useCallback, useEffect, useRef } from 'react';
import { useCallStore } from './callStore';
import { playPTTPressChirp, playPTTReleaseChirp } from '../lib/callRingtone';

export interface UsePushToTalkOptions {
  toggleMuteTrack?: (isMuted: boolean) => void;
}

/**
 * Checks if the focused element is an editable input or form control
 */
export function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }
  return target.isContentEditable;
}

/**
 * Matches key event with user's configured PTT key
 * Supports physical codes (e.g. 'KeyV', 'Space'), direct letters (e.g. 'v', 'V', 'м', 'М'),
 * and Space as a universal fallback.
 */
export function matchesPTTKey(e: KeyboardEvent, targetKey?: string | null): boolean {
  const activeKey = targetKey || 'KeyV';
  if (e.code === activeKey) return true;
  if (activeKey.startsWith('Key')) {
    const letter = activeKey.slice(3).toLowerCase();
    if (e.key.toLowerCase() === letter) return true;
  } else if (activeKey.startsWith('Digit')) {
    const digit = activeKey.slice(5);
    if (e.key === digit) return true;
  } else if (e.key.toLowerCase() === activeKey.toLowerCase()) {
    return true;
  }
  // Allow Space as fallback default
  if (e.code === 'Space') return true;
  return false;
}

/**
 * Push-to-Talk (PTT) Hook with Software Audio Release Tail (Hangover)
 *
 * Prevents word truncation when releasing the push-to-talk key by keeping
 * the audio gate open for an additional grace period (default 250ms).
 */
export function usePushToTalk(options: UsePushToTalkOptions = {}) {
  const { toggleMuteTrack } = options;

  const {
    callStatus,
    isPTTEnabled,
    isPTTActive,
    pttKey,
    pttReleaseTailMs,
    isPTTSoundEnabled,
    setIsPTTActive,
    setIsMuted,
  } = useCallStore();

  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTalking = useCallback(() => {
    if (releaseTimerRef.current) {
      clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }

    if (!useCallStore.getState().isPTTActive) {
      if (isPTTSoundEnabled) {
        playPTTPressChirp();
      }
      setIsPTTActive(true);
      setIsMuted(false);
      toggleMuteTrack?.(false);
    }
  }, [isPTTSoundEnabled, setIsPTTActive, setIsMuted, toggleMuteTrack]);

  const stopTalkingWithTail = useCallback(() => {
    if (releaseTimerRef.current) {
      clearTimeout(releaseTimerRef.current);
    }

    releaseTimerRef.current = setTimeout(() => {
      if (isPTTSoundEnabled) {
        playPTTReleaseChirp();
      }
      setIsPTTActive(false);
      setIsMuted(true);
      toggleMuteTrack?.(true);
      releaseTimerRef.current = null;
    }, pttReleaseTailMs);
  }, [isPTTSoundEnabled, pttReleaseTailMs, setIsPTTActive, setIsMuted, toggleMuteTrack]);

  // Enforce silence whenever PTT is enabled and key is not actively pressed
  useEffect(() => {
    if (callStatus === 'connected' && isPTTEnabled && !isPTTActive) {
      if (!useCallStore.getState().isMuted) {
        setIsMuted(true);
        toggleMuteTrack?.(true);
      }
    }
  }, [callStatus, isPTTEnabled, isPTTActive, setIsMuted, toggleMuteTrack]);

  useEffect(() => {
    if (callStatus !== 'connected' || !isPTTEnabled) {
      if (releaseTimerRef.current) {
        clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
      if (isPTTActive) {
        setIsPTTActive(false);
      }
      return;
    }

    const currentKey = pttKey || 'KeyV';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        !matchesPTTKey(e, currentKey) ||
        e.repeat ||
        isEditableElement(e.target)
      )
        return;
      e.preventDefault();
      startTalking();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!matchesPTTKey(e, currentKey) || isEditableElement(e.target)) return;
      e.preventDefault();
      stopTalkingWithTail();
    };

    const handleBlur = () => {
      if (useCallStore.getState().isPTTActive) {
        stopTalkingWithTail();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (releaseTimerRef.current) {
        clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
    };
  }, [
    callStatus,
    isPTTEnabled,
    isPTTActive,
    pttKey,
    startTalking,
    stopTalkingWithTail,
    setIsPTTActive,
  ]);

  return {
    isPTTEnabled,
    isPTTActive,
    startTalking,
    stopTalkingWithTail,
  };
}
