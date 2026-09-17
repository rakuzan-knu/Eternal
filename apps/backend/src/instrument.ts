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

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',

  tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
    ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
    : isProduction
      ? 0.2
      : 1.0,

  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    return event;
  },

  enabled: process.env.NODE_ENV !== 'test',
});
