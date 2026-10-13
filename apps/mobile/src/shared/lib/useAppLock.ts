import * as React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { checkBiometricCapability, authenticateWithBiometrics } from './biometrics';
import { haptics } from './haptics';

// Standard enterprise banking / Telegram auto-lock threshold: 2 minutes
const AUTO_LOCK_TIMEOUT_MS = 2 * 60 * 1000;

export interface UseAppLockResult {
  isLocked: boolean;
  unlock: () => Promise<boolean>;
  lockNow: () => void;
}

/**
 * Enterprise App State Lock:
 * Automatically locks the app with Face ID / Fingerprint when minimized in background for >= 2 minutes.
 */
export function useAppLock(isAuthenticated: boolean): UseAppLockResult {
  const [isLocked, setIsLocked] = React.useState(false);
  const appStateRef = React.useRef<AppStateStatus>(AppState.currentState);
  const backgroundTimestampRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated) {
      setIsLocked(false);
      backgroundTimestampRef.current = null;
      return;
    }

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextAppState;

      // When app goes to background / inactive
      if (prev === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
        backgroundTimestampRef.current = Date.now();
      }

      // When app returns to foreground
      if ((prev === 'background' || prev === 'inactive') && nextAppState === 'active') {
        if (backgroundTimestampRef.current) {
          const elapsed = Date.now() - backgroundTimestampRef.current;
          if (elapsed >= AUTO_LOCK_TIMEOUT_MS) {
            const bio = await checkBiometricCapability();
            if (bio.isAvailable) {
              setIsLocked(true);
            }
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated]);

  const unlock = async (): Promise<boolean> => {
    haptics.light();
    const success = await authenticateWithBiometrics('Unlock Eternal');
    if (success) {
      haptics.success();
      setIsLocked(false);
      backgroundTimestampRef.current = null;
      return true;
    } else {
      haptics.error();
      return false;
    }
  };

  const lockNow = () => {
    setIsLocked(true);
  };

  return {
    isLocked,
    unlock,
    lockNow,
  };
}
