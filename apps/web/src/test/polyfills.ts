// Polyfill Web Streams API (TransformStream, ReadableStream, WritableStream)
// for jsdom environment. @mswjs/interceptors@0.41.x requires these globals at
// module-load time but jsdom does not expose them on globalThis.
// This file must be listed FIRST in vitest.config.ts / vite.config.ts `test.setupFiles`.
import {
  TransformStream,
  ReadableStream,
  WritableStream,
  ByteLengthQueuingStrategy,
  CountQueuingStrategy,
  TextEncoderStream,
  TextDecoderStream,
  CompressionStream,
  DecompressionStream,
} from 'node:stream/web';

const streams: Record<string, unknown> = {
  TransformStream,
  ReadableStream,
  WritableStream,
  ByteLengthQueuingStrategy,
  CountQueuingStrategy,
  TextEncoderStream,
  TextDecoderStream,
  CompressionStream,
  DecompressionStream,
};

for (const [key, value] of Object.entries(streams)) {
  if (value) {
    if (typeof (globalThis as Record<string, unknown>)[key] === 'undefined') {
      (globalThis as Record<string, unknown>)[key] = value;
    }
    if (typeof (global as unknown as Record<string, unknown>)[key] === 'undefined') {
      (global as unknown as Record<string, unknown>)[key] = value;
    }
    if (
      typeof window !== 'undefined' &&
      typeof (window as unknown as Record<string, unknown>)[key] === 'undefined'
    ) {
      (window as unknown as Record<string, unknown>)[key] = value;
    }
  }
}

import { webcrypto } from 'node:crypto';

if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
    configurable: true,
  });
}
if (
  typeof (global as unknown as Record<string, unknown>).crypto === 'undefined' ||
  !(global as unknown as { crypto: Crypto }).crypto?.subtle
) {
  Object.defineProperty(global, 'crypto', {
    value: webcrypto,
    writable: true,
    configurable: true,
  });
}
if (typeof window !== 'undefined' && (!window.crypto || !window.crypto.subtle)) {
  Object.defineProperty(window, 'crypto', {
    value: webcrypto,
    writable: true,
    configurable: true,
  });
}
