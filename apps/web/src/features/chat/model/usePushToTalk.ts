import { useCallback, useEffect, useRef } from 'react';
import { useCallStore } from './callStore';
import { playPTTPressChirp, playPTTReleaseChirp } from '../lib/callRingtone';

export interface UsePushToTalkOptions {
  toggleMuteTrack?: (isMuted: boolean) => void;
}

/**
 * Checks if the focused element is an editable input or form control
 */
function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }
  return target.isContentEditable;
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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || isEditableElement(e.target)) return;
      e.preventDefault();
      startTalking();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isEditableElement(e.target)) return;
      e.preventDefault();
      stopTalkingWithTail();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (releaseTimerRef.current) {
        clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
    };
  }, [callStatus, isPTTEnabled, isPTTActive, startTalking, stopTalkingWithTail, setIsPTTActive]);

  return {
    isPTTEnabled,
    isPTTActive,
    startTalking,
    stopTalkingWithTail,
  };
}
