import { basename } from 'node:path';
import { app, crashReporter } from 'electron';
import * as Sentry from '@sentry/electron/main';
import { getPolicies } from './policies';
import { diagnostic } from './logging';

export function sanitizeEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  return {
    type: undefined,
    ...(event.event_id ? { event_id: event.event_id } : {}),
    ...(event.timestamp !== undefined ? { timestamp: event.timestamp } : {}),
    ...(event.level ? { level: event.level } : {}),
    platform: 'node',
    release: `eternal-desktop@${app.getVersion()}`,
    environment: 'production',
    tags: { platform: 'desktop' },
    message: 'Desktop process error',
    ...(event.exception
      ? {
          exception: {
            values: (event.exception.values ?? []).map((value) => ({
              type: 'DesktopError',
              value: 'Desktop process error',
              ...(value.stacktrace
                ? {
                    stacktrace: {
                      frames: (value.stacktrace.frames ?? []).map((frame) => ({
                        ...(frame.filename &&
                        !frame.filename.includes('://') &&
                        basename(frame.filename.replace(/\\/g, '/')) === 'index.cjs'
                          ? { filename: 'index.cjs' }
                          : {}),
                        ...(frame.lineno !== undefined ? { lineno: frame.lineno } : {}),
                        ...(frame.colno !== undefined ? { colno: frame.colno } : {}),
                        ...(frame.in_app !== undefined ? { in_app: frame.in_app } : {}),
                      })),
                    },
                  }
                : {}),
            })),
          },
        }
      : {}),
  };
}

export function initializeTelemetry(): void {
  if (!app.isPackaged || getPolicies().DisableTelemetry) return;
  try {
    crashReporter.start({ uploadToServer: false, compress: true });
    const dsn = process.env.ETERNAL_DESKTOP_SENTRY_DSN || import.meta.env.MAIN_VITE_SENTRY_DSN;
    if (!dsn) return;
    Sentry.init({
      dsn,
      release: `eternal-desktop@${app.getVersion()}`,
      environment: 'production',
      initialScope: { tags: { platform: 'desktop' } },
      defaultIntegrations: false,
      integrations: [
        Sentry.onUncaughtExceptionIntegration(),
        Sentry.onUnhandledRejectionIntegration(),
      ],
      ipcMode: Sentry.IPCMode.Protocol,
      getSessions: () => [],
      dataCollection: { userInfo: false },
      tracesSampleRate: 0,
      maxBreadcrumbs: 0,
      sendClientReports: false,
      beforeSend: sanitizeEvent,
      transport: Sentry.makeElectronTransport,
    });
  } catch {
    diagnostic('telemetry-unavailable');
  }
}

export function reportProcessFailure(): void {
  if (!getPolicies().DisableTelemetry) Sentry.captureMessage('Desktop process terminated', 'error');
}

export function telemetryRequestBlocked(value: string): boolean {
  if (!getPolicies().DisableTelemetry) return false;
  const url = new URL(value);
  return (
    url.hostname === 'sentry.io' ||
    url.hostname.endsWith('.sentry.io') ||
    /\/api\/[^/]+\/(?:envelope|store|minidump)\/?$/.test(url.pathname) ||
    /\/calls\/telemetry\/?$/.test(url.pathname)
  );
}
