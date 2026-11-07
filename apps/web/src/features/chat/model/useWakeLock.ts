/**
 * Screen Wake Lock Hook for Active Calls
 *
 * Keeps mobile and desktop screens awake during voice/video calls.
 * Automatically handles visibility changes to re-acquire the lock when returning to the tab.
 */

import { useEffect, useRef } from 'react';
import { getDesktopBridge } from '@/shared/lib/platform';

export function useWakeLock(isActive: boolean, scope: 'call' | 'mesh' = 'call'): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const desktop = getDesktopBridge();
    if (desktop?.setCallActive) {
      if (!isActive) return;
      void desktop
        .setCallActive(scope, true)
        .catch(() => console.debug('Desktop wake lock unavailable'));
      return () => {
        void desktop
          .setCallActive(scope, false)
          .catch(() => console.debug('Desktop wake lock release unavailable'));
      };
    }
    if (!isActive || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    let isSubscribed = true;

    const requestLock = async () => {
      try {
        if (document.visibilityState === 'visible' && !sentinelRef.current) {
          const sentinel = await navigator.wakeLock.request('screen');
          if (!isSubscribed) {
            await sentinel.release();
            return;
          }
          sentinelRef.current = sentinel;
          sentinel.onrelease = () => {
            if (sentinelRef.current === sentinel) {
              sentinelRef.current = null;
            }
          };
        }
      } catch (err) {
        // WakeLock request can fail due to battery saver or OS restrictions
        console.debug('WakeLock request suppressed or unavailable', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void requestLock();
      }
    };

    void requestLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isSubscribed = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (sentinelRef.current) {
        sentinelRef.current.release().catch(() => {});
        sentinelRef.current = null;
      }
    };
  }, [isActive, scope]);
}
