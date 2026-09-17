import { Logger } from '@nestjs/common';
import { vi } from 'vitest';
import * as dotenv from 'dotenv';
import path from 'path';

interface ViWithConfig {
  setConfig?: (opts: { testTimeout?: number; retry?: number }) => void;
  [key: string]: unknown;
}

const viTarget = vi as unknown as ViWithConfig;

// Expose vi as jest globally with comprehensive Jest API polyfills for legacy tests
const jestProxy = new Proxy(viTarget, {
  get(target, prop, receiver) {
    if (prop === 'setTimeout') {
      return (ms: number) => {
        try {
          vi.setConfig({ testTimeout: ms });
        } catch {
          // ignore if called before runner context init
        }
      };
    }
    if (prop === 'isolateModules') {
      return (fn: () => void) => fn();
    }
    if (prop === 'retryTimes') {
      return (num: number) => {
        try {
          if (typeof target.setConfig === 'function') {
            target.setConfig({ retry: num });
          }
        } catch {
          // ignore
        }
      };
    }
    return Reflect.get(target, prop, receiver) as unknown;
  },
});

const globalObj = globalThis as unknown as Record<string, unknown>;
globalObj.jest = jestProxy;

type DoneFn = (err?: unknown) => void;
type TestCallback = (done?: DoneFn) => void | Promise<unknown>;
type AnyFn = (...args: unknown[]) => unknown;

// Legacy Jest (done) callback compatibility wrapper for Vitest 3.x
const wrapTestFn = (fn: unknown): unknown => {
  if (typeof fn === 'function' && fn.length > 0) {
    const callbackFn = fn as TestCallback;
    return () =>
      new Promise<void>((resolve, reject) => {
        const done = (err?: unknown) => {
          if (err) {
            const message =
              typeof err === 'string' ? err : err instanceof Error ? err.message : 'Unknown error';
            reject(err instanceof Error ? err : new Error(message));
          } else {
            resolve();
          }
        };
        try {
          const result = callbackFn(done);
          if (
            result &&
            typeof result === 'object' &&
            'then' in result &&
            typeof (result as { then?: unknown }).then === 'function'
          ) {
            void Promise.resolve(result).then(
              () => resolve(),
              (reason: unknown) => {
                const message =
                  typeof reason === 'string'
                    ? reason
                    : reason instanceof Error
                      ? reason.message
                      : 'Unknown rejection';
                reject(reason instanceof Error ? reason : new Error(message));
              },
            );
          }
        } catch (e) {
          const message =
            typeof e === 'string' ? e : e instanceof Error ? e.message : 'Unknown error';
          reject(e instanceof Error ? e : new Error(message));
        }
      });
  }
  return fn;
};

const createTestWrapper = <T extends AnyFn>(orig: T): T => {
  if (!orig) return orig;
  const wrapped = ((name: string, fn: unknown, timeout?: number) =>
    orig(name, wrapTestFn(fn), timeout)) as unknown as T;
  Object.assign(wrapped, orig);
  const origAny = orig as unknown as Record<string, unknown>;
  const wrappedAny = wrapped as unknown as Record<string, unknown>;
  if (typeof origAny.only === 'function') {
    wrappedAny.only = (name: string, fn: unknown, timeout?: number) =>
      (origAny.only as AnyFn)(name, wrapTestFn(fn), timeout);
  }
  if (origAny.skip) wrappedAny.skip = origAny.skip;
  if (typeof origAny.concurrent === 'function') {
    wrappedAny.concurrent = (name: string, fn: unknown, timeout?: number) =>
      (origAny.concurrent as AnyFn)(name, wrapTestFn(fn), timeout);
  }
  return wrapped;
};

if (typeof globalObj.it === 'function') {
  globalObj.it = createTestWrapper(globalObj.it as AnyFn);
}
if (typeof globalObj.test === 'function') {
  globalObj.test = createTestWrapper(globalObj.test as AnyFn);
}

// Load backend/.env if present
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Silence NestJS info/warn logging in unit tests to keep test outputs clean and legible
Logger.overrideLogger(['error']);

// Provide fallback test environment variables for modules validating env on import
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/social?schema=public';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'test-jwt-access-secret-at-least-32-chars-long-for-testing';
process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-at-least-32-chars-long-for-testing';
process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL || '7d';

afterAll(async () => {
  // Allow pending async microtasks/timers to drain cleanly before Jest terminates
  await new Promise((resolve) => setTimeout(resolve, 100));
});
