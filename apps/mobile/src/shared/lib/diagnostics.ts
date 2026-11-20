import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { ReactNativeOptions } from '@sentry/react-native';
import { create } from 'zustand';

const storageKey = 'eternal-diagnostics-consent-v1';
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
type ErrorEvent = Parameters<NonNullable<ReactNativeOptions['beforeSend']>>[0];

export const diagnosticsAvailable =
  typeof __DEV__ !== 'undefined' && !__DEV__ && Boolean(dsn?.startsWith('https://'));

type DiagnosticsState = {
  enabled: boolean;
  busy: boolean;
  failed: boolean;
  retryValue: boolean | 'load' | null;
};

export const useDiagnostics = create<DiagnosticsState>(() => ({
  enabled: false,
  busy: diagnosticsAvailable,
  failed: false,
  retryValue: null,
}));

let clientStarted = false;
let loading: Promise<void> | undefined;

async function startClient() {
  if (clientStarted) return;

  const Sentry = await import('@sentry/react-native');
  Sentry.init({
    ...(dsn ? { dsn } : {}),
    enableNative: false,
    patchGlobalPromise: false,
    autoSessionTracking: false,
    sendDefaultPii: false,
    sendClientReports: false,
    maxBreadcrumbs: 0,
    tracesSampleRate: 0,
    integrations: (defaults) =>
      defaults.filter(
        ({ name }) => name === 'ReactNativeErrorHandlers' || name === 'GlobalHandlers',
      ),
    async beforeSend(event, hint) {
      if (!useDiagnostics.getState().enabled) return null;
      if (
        Platform.OS === 'web' &&
        (await AsyncStorage.getItem(storageKey).catch(() => null)) !== 'on'
      ) {
        useDiagnostics.setState({ enabled: false });
        return null;
      }
      if (!useDiagnostics.getState().enabled) return null;
      hint.attachments = [];
      return minimizeEvent(event);
    },
  });
  if (!Sentry.getClient()?.getDsn()) throw new Error('Diagnostics destination unavailable');
  clientStarted = true;
}

function minimizeEvent(event: ErrorEvent): ErrorEvent {
  return {
    type: undefined,
    ...(event.event_id ? { event_id: event.event_id } : {}),
    ...(event.timestamp !== undefined ? { timestamp: event.timestamp } : {}),
    platform: 'javascript',
    release: 'eternal-mobile@' + (Constants.expoConfig?.version ?? 'unknown'),
    tags: { runtime: Platform.OS },
    message: 'Eternal JavaScript error',
    ...(event.exception?.values?.length
      ? {
          exception: {
            values: event.exception.values.map(({ stacktrace }) => ({
              type: 'AppError',
              value: 'Eternal JavaScript error',
              ...(stacktrace?.frames
                ? {
                    stacktrace: {
                      frames: stacktrace.frames.map((frame) => {
                        const filename =
                          /(?:^|[/\\])(index\.android\.bundle|main\.jsbundle|index-[a-f0-9]{32}\.js)$/.exec(
                            frame.filename ?? '',
                          )?.[1];
                        return {
                          ...(filename ? { filename } : {}),
                          ...(frame.lineno !== undefined ? { lineno: frame.lineno } : {}),
                          ...(frame.colno !== undefined ? { colno: frame.colno } : {}),
                          ...(frame.in_app !== undefined ? { in_app: frame.in_app } : {}),
                        };
                      }),
                    },
                  }
                : {}),
            })),
          },
        }
      : {}),
  };
}

export function loadDiagnosticsPreference() {
  if (!diagnosticsAvailable) return;
  loading ??= (async () => {
    useDiagnostics.setState({ busy: true, failed: false, retryValue: null });
    try {
      if ((await AsyncStorage.getItem(storageKey)) !== 'on') return;
      await startClient();
      useDiagnostics.setState({ enabled: true });
    } catch {
      useDiagnostics.setState({ failed: true, retryValue: 'load' });
    } finally {
      useDiagnostics.setState({ busy: false });
    }
  })();
  return loading;
}

export function retryDiagnosticsPreference() {
  const { busy, retryValue } = useDiagnostics.getState();
  if (busy || retryValue === null) return;
  if (retryValue === 'load') {
    loading = undefined;
    return loadDiagnosticsPreference();
  }
  return setDiagnosticsPreference(retryValue);
}

export async function setDiagnosticsPreference(value: boolean) {
  if (!diagnosticsAvailable || useDiagnostics.getState().busy) return;
  useDiagnostics.setState({ busy: true, failed: false, retryValue: null, enabled: false });
  try {
    if (value) {
      await startClient();
      await AsyncStorage.setItem(storageKey, 'on');
      useDiagnostics.setState({ enabled: true });
    } else {
      await AsyncStorage.removeItem(storageKey);
    }
  } catch {
    useDiagnostics.setState({ failed: true, retryValue: value });
  } finally {
    useDiagnostics.setState({ busy: false });
  }
}
