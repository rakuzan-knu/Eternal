import * as Sentry from '@sentry/react';

// Suppress bearer invitations and registration requests, including Axios payloads.
export function containsInvitationCredential(value: unknown): boolean {
  try {
    return /\/(?:messenger\/communities\/invites|invite)\/|\/auth\/register(?:[/?#"\s]|$)/i.test(
      JSON.stringify(value) ?? '',
    );
  } catch {
    return true;
  }
}

let stopSentry: (() => void) | undefined;

export function syncSentryConsent(analyticsAllowed: boolean): void {
  if (!analyticsAllowed || window.desktop?.telemetryDisabled) {
    stopSentry?.();
    stopSentry = undefined;
    return;
  }
  if (stopSentry) return;
  // Never initialize Sentry or Session Replay in development mode or with mock DSNs
  if (!import.meta.env.PROD) {
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (
    !dsn ||
    dsn === 'undefined' ||
    dsn === 'null' ||
    !dsn.startsWith('http') ||
    dsn.includes('mock')
  ) {
    return;
  }

  try {
    let active = true;
    const client = Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [Sentry.browserTracingIntegration()],
      tracePropagationTargets: [],
      beforeBreadcrumb: (breadcrumb) =>
        !active || containsInvitationCredential(breadcrumb) ? null : breadcrumb,
      beforeSend: (event) =>
        !active ||
        containsInvitationCredential(event) ||
        containsInvitationCredential(location.pathname)
          ? null
          : event,
      beforeSendTransaction: (event) =>
        !active ||
        containsInvitationCredential(event) ||
        containsInvitationCredential(location.pathname)
          ? null
          : event,
      tracesSampleRate: import.meta.env.PROD ? 0.2 : 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0.5,
      ignoreErrors: [
        'Network Error',
        'Request failed with status code 401',
        'Request failed with status code 403',
        'Request failed with status code 404',
        'Request failed with status code 400',
        'WebSocket is closed before the connection is established',
      ],
    });
    if (client) {
      stopSentry = () => {
        active = false;
        client.getOptions().enabled = false;
        Sentry.getIsolationScope().clearBreadcrumbs();
        void Promise.resolve(client.close(1000)).catch(() => {});
      };
    }
  } catch {
    // Gracefully ignore Sentry init errors
  }
}
