import { describe, it, expect } from 'vitest';
import {
  createTraceContext,
  formatTraceparent,
  parseTraceparent,
  serializeTraceContextToBinary,
  deserializeTraceContextFromBinary,
  wrapPacketWithTrace,
  unwrapPacketWithTrace,
} from '../dataChannelTracing';

describe('OpenTelemetry DataChannel Tracing', () => {
  it('generates a valid W3C Trace Context with 32-char traceId and 16-char spanId', () => {
    const trace = createTraceContext();
    expect(trace.version).toBe('00');
    expect(trace.traceId).toHaveLength(32);
    expect(trace.spanId).toHaveLength(16);
    expect(trace.traceFlags).toBe('01');

    const formatted = formatTraceparent(trace);
    expect(formatted).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });

  it('correctly parses and formats valid traceparent headers', () => {
    const header = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    const parsed = parseTraceparent(header);

    expect(parsed).not.toBeNull();
    expect(parsed?.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    expect(parsed?.spanId).toBe('00f067aa0ba902b7');
    expect(formatTraceparent(parsed!)).toBe(header);
  });

  it('rejects invalid traceparent formats', () => {
    expect(parseTraceparent('invalid-trace')).toBeNull();
    // All-zero traceId is invalid per W3C specification
    expect(parseTraceparent('00-00000000000000000000000000000000-0000000000000000-01')).toBeNull();
  });

  it('creates child spans inheriting parent traceId while generating new spanId', () => {
    const parent = createTraceContext();
    const child = createTraceContext(parent);

    expect(child.traceId).toBe(parent.traceId);
    expect(child.spanId).not.toBe(parent.spanId);
    expect(child.spanId).toHaveLength(16);
  });

  it('serializes and deserializes binary W3C trace context into exact 26 bytes', () => {
    const original = createTraceContext();
    const binary = serializeTraceContextToBinary(original);

    expect(binary.byteLength).toBe(26);

    const recovered = deserializeTraceContextFromBinary(binary);
    expect(recovered).toEqual(original);
  });

  it('wraps and unwraps DataChannel packet payloads with trace context', () => {
    const trace = createTraceContext();
    const payload = new Uint8Array([10, 20, 30, 40, 50]);

    const packet = wrapPacketWithTrace(payload, trace);
    expect(packet.byteLength).toBe(26 + 5);

    const unwrapped = unwrapPacketWithTrace(packet);
    expect(unwrapped.trace).toEqual(trace);
    expect(Array.from(unwrapped.payload)).toEqual([10, 20, 30, 40, 50]);
  });
});
