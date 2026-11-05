import { useEffect, useRef } from 'react';
import { getDesktopBridge } from '@/shared/lib/platform';

export function useDesktopCallActions(
  active: boolean,
  scope: 'call' | 'mesh',
  onMute: () => void,
  ptt?: {
    enabled: boolean;
    key: string;
    press: () => void;
    release: () => void;
    reset: () => void;
  },
): void {
  const muteRef = useRef(onMute);
  const pttRef = useRef(ptt);
  useEffect(() => {
    muteRef.current = onMute;
    pttRef.current = ptt;
  }, [onMute, ptt]);
  const pttEnabled = ptt?.enabled ?? false;
  const pttKey = ptt?.key ?? 'KeyV';
  useEffect(() => {
    const desktop = getDesktopBridge();
    if (!active || !desktop?.configurePushToTalk) return;
    void desktop
      .configurePushToTalk(scope, pttEnabled, pttKey)
      .catch(() => console.debug('Desktop push-to-talk unavailable'));
    return () => {
      pttRef.current?.reset();
      void desktop.configurePushToTalk(scope, false, pttKey).catch(() => {});
    };
  }, [active, scope, pttEnabled, pttKey]);
  useEffect(() => {
    const desktop = getDesktopBridge();
    if (!active || !desktop?.waitForCallAction) return;
    let cancelled = false;
    const listen = async () => {
      try {
        while (!cancelled) {
          const action = await desktop.waitForCallAction(scope);
          if (!cancelled && action === 'mute') muteRef.current();
          if (!cancelled && action === 'ptt-down' && pttRef.current?.enabled)
            pttRef.current.press();
          if (!cancelled && action === 'ptt-up') pttRef.current?.release();
          if (!cancelled && action === 'ptt-reset') pttRef.current?.reset();
        }
      } catch {
        pttRef.current?.reset();
        console.debug('Desktop call shortcuts unavailable');
      }
    };
    void listen();
    return () => {
      cancelled = true;
    };
  }, [active, scope]);
}
