/**
 * Call Keyboard Shortcuts & Accessible Controls Hook
 *
 * Provides global hotkeys for WebRTC calls:
 * - Space (hold) -> Push-to-Talk (temporary unmute with release tail hangover)
 * - Cmd/Ctrl + Shift + M -> Global microphone toggle
 * - Cmd/Ctrl + Shift + V -> Global camera video toggle
 *
 * Properly ignores input events when user is typing in form controls or contenteditable elements.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useCallStore } from './callStore';
import { playPTTPressChirp, playPTTReleaseChirp } from '../lib/callRingtone';
import { triggerHaptic } from '../lib/webrtc/hapticFeedback';

export interface UseCallKeyboardShortcutsOptions {
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
  onToggleWhiteboard?: () => void;
}

export function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }
  return target.isContentEditable;
}

export function useCallKeyboardShortcuts(options: UseCallKeyboardShortcutsOptions = {}) {
  const { onToggleMute, onToggleVideo, onToggleWhiteboard } = options;

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
      triggerHaptic('unmute');
    }
  }, [isPTTSoundEnabled, setIsPTTActive, setIsMuted]);

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
      triggerHaptic('mute');
      releaseTimerRef.current = null;
    }, pttReleaseTailMs);
  }, [isPTTSoundEnabled, pttReleaseTailMs, setIsPTTActive, setIsMuted]);

  useEffect(() => {
    if (callStatus !== 'connected') {
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
      if (isEditableElement(e.target)) return;
      if (useCallStore.getState().callStatus !== 'connected') return;

      const isMac =
        typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      const currentPTTEnabled = useCallStore.getState().isPTTEnabled;

      // 1. Spacebar Push-to-Talk (Hold)
      if (e.code === 'Space' && !e.repeat && currentPTTEnabled) {
        e.preventDefault();
        startTalking();
        return;
      }

      // 2. Cmd/Ctrl + Shift + M OR standalone 'm'/'M' without Ctrl/Alt/Meta -> Toggle Microphone
      const isMuteShortcut =
        (modifier && e.shiftKey && (e.key === 'M' || e.key === 'm')) ||
        (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'm' || e.key === 'M'));
      if (isMuteShortcut) {
        e.preventDefault();
        onToggleMute?.();
        return;
      }

      // 3. Cmd/Ctrl + Shift + V OR standalone 'v'/'V' without Ctrl/Alt/Meta -> Toggle Camera Video
      const isVideoShortcut =
        (modifier && e.shiftKey && (e.key === 'V' || e.key === 'v')) ||
        (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'v' || e.key === 'V'));
      if (isVideoShortcut) {
        e.preventDefault();
        onToggleVideo?.();
        return;
      }

      // 4. Standalone 'w'/'W' without Ctrl/Alt/Meta -> Toggle Whiteboard
      if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        onToggleWhiteboard?.();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isEditableElement(e.target)) return;
      const currentPTTEnabled = useCallStore.getState().isPTTEnabled;

      if (e.code === 'Space' && currentPTTEnabled) {
        e.preventDefault();
        stopTalkingWithTail();
      }
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
  }, [
    callStatus,
    isPTTEnabled,
    isPTTActive,
    startTalking,
    stopTalkingWithTail,
    onToggleMute,
    onToggleVideo,
    onToggleWhiteboard,
    setIsPTTActive,
  ]);

  return {
    startTalking,
    stopTalkingWithTail,
  };
}
