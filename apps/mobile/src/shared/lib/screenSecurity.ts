import * as React from 'react';
import { Platform } from 'react-native';

/**
 * Enterprise Screen Security Hook
 * Prevents screen recordings, screenshots, and task-switcher previews (FLAG_SECURE on Android)
 * during sensitive authentication and credential operations. Safe no-op on Web.
 */
export function useScreenSecurity(enabled: boolean = true) {
  React.useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;

    try {
      // Lazy load native screen capture module on iOS/Android only
      const ScreenCapture = require('expo-screen-capture');
      ScreenCapture.preventScreenCaptureAsync().catch(() => {});

      return () => {
        ScreenCapture.allowScreenCaptureAsync().catch(() => {});
      };
    } catch {
      // Safe no-op fallback
    }
  }, [enabled]);
}
