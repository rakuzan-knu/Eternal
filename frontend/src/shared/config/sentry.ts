import * as Sentry from '@sentry/react';

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn || dsn === 'undefined' || dsn === 'null' || !dsn.startsWith('http')) {
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
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
