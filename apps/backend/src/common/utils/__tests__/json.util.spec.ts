import {
  safeJsonParse,
  safeJsonParseAsync,
  safeJsonStringify,
  safeJsonStringifyAsync,
} from '../json.util';
import type { ComputeWorkerService } from '../../workers/compute-worker.service';

describe('json.util', () => {
  describe('safeJsonParse', () => {
    it('parses valid JSON string correctly', () => {
      const input = JSON.stringify({ message: 'hello', count: 42 });
      const result = safeJsonParse<{ message: string; count: number }>(input);
      expect(result).toEqual({ message: 'hello', count: 42 });
    });

    it('returns fallback on invalid JSON when not in strict mode', () => {
      const result = safeJsonParse('invalid-json-string', {}, { fallback: true });
      expect(result).toEqual({ fallback: true });
    });

    it('throws on invalid JSON in strict mode', () => {
      expect(() => {
        safeJsonParse('{ corrupt json: true }', { strict: true });
      }).toThrow();
    });

    it('rejects oversized JSON payloads', () => {
      const largePayload = JSON.stringify({ data: 'x'.repeat(100) });
      const result = safeJsonParse(largePayload, { maxSizeBytes: 50 });
      expect(result).toBeNull();
    });

    it('throws on oversized JSON payload in strict mode', () => {
      const largePayload = JSON.stringify({ data: 'x'.repeat(100) });
      expect(() => {
        safeJsonParse(largePayload, { maxSizeBytes: 50, strict: true });
      }).toThrow(/exceeds limit/);
    });

    it('strips prototype pollution attempts (__proto__, constructor, prototype)', () => {
      const maliciousPayload =
        '{"__proto__": {"admin": true}, "constructor": {"polluted": true}, "valid": 123}';
      const result = safeJsonParse<Record<string, unknown>>(maliciousPayload);

      expect(result).toBeDefined();
      expect(result?.valid).toBe(123);
      expect(Object.prototype.hasOwnProperty.call(result ?? {}, '__proto__')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(result ?? {}, 'constructor')).toBe(false);
      expect(({} as Record<string, unknown>).admin).toBeUndefined();
    });

    it('handles null, undefined and object passthrough correctly', () => {
      expect(safeJsonParse(null)).toBeNull();
      expect(safeJsonParse(undefined)).toBeNull();
      expect(safeJsonParse({ existing: 'obj' })).toEqual({ existing: 'obj' });
    });
  });

  describe('safeJsonParseAsync', () => {
    it('parses small payloads using fast-path', async () => {
      const input = JSON.stringify({ fast: true, num: 10 });
      const result = await safeJsonParseAsync<{ fast: boolean; num: number }>(input);
      expect(result).toEqual({ fast: true, num: 10 });
    });

    it('delegates to workerService for large payloads', async () => {
      const mockWorkerService = {
        parseJsonAsync: jest.fn().mockResolvedValue({ offloaded: true }),
      } as unknown as ComputeWorkerService;

      const largeInput = JSON.stringify({ bigData: 'A'.repeat(70 * 1024) });
      const result = await safeJsonParseAsync(
        largeInput,
        { asyncOffloadThresholdBytes: 64 * 1024 },
        mockWorkerService,
      );

      expect(mockWorkerService.parseJsonAsync).toHaveBeenCalledWith(largeInput, expect.any(Number));
      expect(result).toEqual({ offloaded: true });
    });
  });

  describe('safeJsonStringify & safeJsonStringifyAsync', () => {
    it('serializes objects safely', () => {
      const obj = { key: 'value', num: 123 };
      expect(safeJsonStringify(obj)).toBe(JSON.stringify(obj));
    });

    it('returns null on circular references without crashing', () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      expect(safeJsonStringify(circular)).toBeNull();
    });

    it('serializes asynchronously with workerService when provided', async () => {
      const mockWorkerService = {
        stringifyJsonAsync: jest.fn().mockResolvedValue('{"async":true}'),
      } as unknown as ComputeWorkerService;

      const result = await safeJsonStringifyAsync({ test: 1 }, 2, mockWorkerService);
      expect(mockWorkerService.stringifyJsonAsync).toHaveBeenCalledWith({ test: 1 }, 2);
      expect(result).toBe('{"async":true}');
    });
  });
});
