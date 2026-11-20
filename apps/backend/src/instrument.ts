import { redactRequestUrl } from './common/utils/redact-url.util';
import { EventEmitter } from 'node:events';
import * as Sentry from '@sentry/nestjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

EventEmitter.defaultMaxListeners = 50;
if (typeof process.setMaxListeners === 'function') {
  process.setMaxListeners(50);
}

const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../.env') : undefined,
  typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../../../.env') : undefined,
].filter((p): p is string => Boolean(p));

for (const p of envPaths) {
  dotenv.config({ path: p });
}

const isProduction = process.env.NODE_ENV === 'production';

function minimizeUrl(value: string): string {
  return redactRequestUrl(value.split('?')[0]);
}

function minimizeHttpSpanData(data: Record<string, unknown> | undefined): void {
  if (!data) return;
  delete data['http.client_ip'];
  delete data['http.user_agent'];
  for (const key of ['url', 'url.full', 'url.path', 'http.url', 'http.target']) {
    const value = data[key];
    if (typeof value === 'string') data[key] = minimizeUrl(value);
  }
}

function minimizeRequest<T extends Sentry.Event>(event: T): T {
  if (event.request) {
    const { method, url } = event.request;
    event.request = {
      ...(method ? { method } : {}),
      ...(url ? { url: minimizeUrl(url) } : {}),
    };
  }
  if (event.transaction) event.transaction = minimizeUrl(event.transaction);
  minimizeHttpSpanData(event.contexts?.trace?.data);
  return event;
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  integrations: [Sentry.httpIntegration({ maxIncomingRequestBodySize: 'none' })],
  dataCollection: {
    httpBodies: [],
    httpHeaders: false,
    cookies: false,
    urlQueryParams: false,
    userInfo: false,
  },

  tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
    ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
    : isProduction
      ? 0.2
      : 1.0,

  beforeSend: minimizeRequest,
  beforeSendTransaction: minimizeRequest,
  beforeBreadcrumb(breadcrumb) {
    if (typeof breadcrumb.data?.url === 'string') {
      breadcrumb.data.url = minimizeUrl(breadcrumb.data.url);
    }
    return breadcrumb;
  },
  beforeSendSpan(span) {
    minimizeHttpSpanData(span.data);
    return span;
  },
  enabled: process.env.NODE_ENV !== 'test',
});
