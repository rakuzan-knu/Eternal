import * as Sentry from '@sentry/react';

// Invitation URLs are bearer credentials. Suppress telemetry containing them,
// including failed Axios requests and navigation breadcrumbs.
export function containsInvitationCredential(value: unknown): boolean {
  try {
    return /\/(?:messenger\/communities\/invites|invite)\//i.test(JSON.stringify(value) ?? '');
  } catch {
    return true;
  }
}

export function initSentry(): void {
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
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [Sentry.browserTracingIntegration()],
      beforeBreadcrumb: (breadcrumb) =>
        containsInvitationCredential(breadcrumb) ? null : breadcrumb,
      beforeSend: (event) =>
        containsInvitationCredential(event) || containsInvitationCredential(location.pathname)
          ? null
          : event,
      beforeSendTransaction: (event) =>
        containsInvitationCredential(event) || containsInvitationCredential(location.pathname)
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
  } catch {
    // Gracefully ignore Sentry init errors
  }
}
