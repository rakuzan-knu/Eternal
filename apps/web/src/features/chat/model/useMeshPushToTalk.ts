import { useCallback, useEffect, useMemo, useRef } from 'react';
import { isDesktop } from '@/shared/lib/platform';
import { useCallStore } from './callStore';
import { isEditableElement, matchesPTTKey } from './usePushToTalk';

export function useMeshPushToTalk(
  active: boolean,
  deafened: boolean,
  setMuted: (muted: boolean) => void,
) {
  const configured = useCallStore((s) => s.isPTTEnabled);
  const key = useCallStore((s) => s.pttKey);
  const tail = useCallStore((s) => s.pttReleaseTailMs);
  const directConnected = useCallStore((s) => s.callStatus === 'connected');
  const enabled = isDesktop() && configured && !directConnected;
  const pressed = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reset = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    if (pressed.current) {
      pressed.current = false;
      setMuted(true);
    }
  }, [setMuted]);
  const press = useCallback(() => {
    if (!active || !enabled || deafened) return;
    clearTimeout(timer.current);
    timer.current = undefined;
    if (!pressed.current) {
      pressed.current = true;
      setMuted(false);
    }
  }, [active, enabled, deafened, setMuted]);
  const release = useCallback(() => {
    if (!pressed.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(reset, tail);
  }, [reset, tail]);
  useEffect(() => {
    if (!active || !enabled) return;
    setMuted(true);
    const down = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isEditableElement(event.target) ||
        !matchesPTTKey(event, key)
      )
        return;
      event.preventDefault();
      press();
    };
    const up = (event: KeyboardEvent) => {
      if (!pressed.current || !matchesPTTKey(event, key)) return;
      event.preventDefault();
      release();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', reset);
      reset();
    };
  }, [active, enabled, key, press, release, reset, setMuted]);
  return useMemo(
    () => ({ enabled, key, press, release, reset }),
    [enabled, key, press, release, reset],
  );
}
