import { sanitizeProtoPollution } from '../workers/compute-worker.tasks';
import type { ComputeWorkerService } from '../workers/compute-worker.service';
import { fastDecodeUtf8 } from '../v8/zero-alloc-parser';

export interface SafeJsonParseOptions {
  /**
   * Maximum allowed byte size for JSON payload (default: 5MB = 5 * 1024 * 1024).
   */
  maxSizeBytes?: number;
  /**
   * If string length exceeds this threshold in bytes, offload parsing to Worker Thread / async compute (default: 64KB = 64 * 1024).
   */
  asyncOffloadThresholdBytes?: number;
  /**
   * If true, throws Error when parsing fails instead of returning fallback.
   */
  strict?: boolean;
}

const DEFAULT_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const DEFAULT_OFFLOAD_THRESHOLD_BYTES = 64 * 1024; // 64 KB

/**
 * Parses a JSON string synchronously with strict byte-size and prototype pollution protections.
 * Returns null (or throws in strict mode) if invalid or oversized.
 */
export function safeJsonParse<T = unknown>(
  payload: unknown,
  options?: SafeJsonParseOptions,
  fallback: T | null = null,
): T | null {
  if (payload === null || payload === undefined) {
    return fallback;
  }

  if (typeof payload !== 'string') {
    if (Buffer.isBuffer(payload) || payload instanceof Uint8Array) {
      const maxBytes = options?.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
      const byteLength = payload.byteLength;
      if (byteLength > maxBytes) {
        if (options?.strict) {
          throw new Error(
            `JSON payload size (${byteLength} bytes) exceeds limit of ${maxBytes} bytes`,
          );
        }
        return fallback;
      }
      try {
        const decoded = fastDecodeUtf8(payload);
        const parsed = JSON.parse(decoded) as unknown;
        return sanitizeProtoPollution(parsed) as T;
      } catch (err) {
        if (options?.strict) {
          throw err;
        }
        return fallback;
      }
    }
    if (typeof payload === 'object') {
      return sanitizeProtoPollution(payload) as T;
    }
    if (options?.strict) {
      throw new TypeError('Payload must be a string, Buffer, or object');
    }
    return fallback;
  }

  const maxBytes = options?.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
  const byteLength = Buffer.byteLength(payload, 'utf8');

  if (byteLength > maxBytes) {
    if (options?.strict) {
      throw new Error(`JSON payload size (${byteLength} bytes) exceeds limit of ${maxBytes} bytes`);
    }
    return fallback;
  }

  try {
    const parsed = JSON.parse(payload) as unknown;
    return sanitizeProtoPollution(parsed) as T;
  } catch (err) {
    if (options?.strict) {
      throw err;
    }
    return fallback;
  }
}

/**
 * Parses JSON asynchronously, delegating payloads larger than threshold to Worker Threads
 * to keep the Node.js Event Loop completely unblocked and responsive.
 */
export async function safeJsonParseAsync<T = unknown>(
  payload: unknown,
  options?: SafeJsonParseOptions,
  workerService?: ComputeWorkerService,
  fallback: T | null = null,
): Promise<T | null> {
  if (payload === null || payload === undefined) {
    return fallback;
  }

  if (typeof payload !== 'string') {
    if (Buffer.isBuffer(payload) || payload instanceof Uint8Array) {
      const decoded = fastDecodeUtf8(payload);
      return safeJsonParseAsync<T>(decoded, options, workerService, fallback);
    }
    if (typeof payload === 'object') {
      return sanitizeProtoPollution(payload) as T;
    }
    if (options?.strict) {
      throw new TypeError('Payload must be a string, Buffer, or object');
    }
    return fallback;
  }

  const maxBytes = options?.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
  const offloadThreshold = options?.asyncOffloadThresholdBytes ?? DEFAULT_OFFLOAD_THRESHOLD_BYTES;
  const byteLength = Buffer.byteLength(payload, 'utf8');

  if (byteLength > maxBytes) {
    if (options?.strict) {
      throw new Error(`JSON payload size (${byteLength} bytes) exceeds limit of ${maxBytes} bytes`);
    }
    return fallback;
  }

  // Fast-path for small JSON payloads under threshold
  if (byteLength <= offloadThreshold || !workerService) {
    return safeJsonParse<T>(payload, options, fallback);
  }

  // Offload large payloads to Worker Thread pool
  try {
    const result = await workerService.parseJsonAsync<T>(payload, maxBytes);
    return result;
  } catch (err) {
    if (options?.strict) {
      throw err;
    }
    return fallback;
  }
}

import { fastStringify, type SchemaKey } from '../serialization/fast-json.service';

/**
 * Stringifies data safely with optional schema-based fast-json-stringify acceleration.
 */
export function safeJsonStringify(
  data: unknown,
  spaceOrSchema?: number | SchemaKey,
): string | null {
  try {
    if (typeof spaceOrSchema === 'string') {
      return fastStringify(data, spaceOrSchema);
    }
    return JSON.stringify(data, null, spaceOrSchema);
  } catch {
    return null;
  }
}

/**
 * Stringifies large objects asynchronously in a Worker Thread when workerService is provided.
 */
export async function safeJsonStringifyAsync(
  data: unknown,
  space?: number,
  workerService?: ComputeWorkerService,
): Promise<string | null> {
  if (workerService) {
    try {
      return await workerService.stringifyJsonAsync(data, space);
    } catch {
      return null;
    }
  }
  return safeJsonStringify(data, space);
}
