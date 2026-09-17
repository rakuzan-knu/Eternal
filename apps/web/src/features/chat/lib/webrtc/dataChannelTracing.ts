/**
 * OpenTelemetry Distributed Tracing over WebRTC DataChannel (W3C Trace Context)
 *
 * Implements binary and header-level injection/extraction of W3C Trace Context
 * (traceparent: version-trace_id-parent_id-trace_flags) across RTCDataChannel frames,
 * enabling seamless end-to-end distributed tracing across client P2P interactions
 * and NestJS telemetry ingestion.
 */

export interface W3CTraceContext {
  version: string; // "00"
  traceId: string; // 32 hex chars (16 bytes)
  spanId: string; // 16 hex chars (8 bytes)
  traceFlags: string; // "01" (sampled) or "00"
}

export const TRACE_CONTEXT_BINARY_SIZE = 26; // 1 byte version + 16 bytes traceId + 8 bytes spanId + 1 byte flags
export const W3C_VERSION_BYTE = 0x00;

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  // Ensure non-zero
  if (bytes.every((b) => b === 0)) bytes[0] = 0x01;

  let hex = '';
  for (let i = 0; i < byteLength; i++) {
    hex += bytes[i]!.toString(16).padStart(2, '0');
  }
  return hex;
}

export function generateTraceId(): string {
  return randomHex(16);
}

export function generateSpanId(): string {
  return randomHex(8);
}

export function formatTraceparent(trace: W3CTraceContext): string {
  return `${trace.version}-${trace.traceId}-${trace.spanId}-${trace.traceFlags}`;
}

export function parseTraceparent(header: string): W3CTraceContext | null {
  if (!header || typeof header !== 'string') return null;
  const parts = header.trim().split('-');
  if (parts.length < 4) return null;

  const [version, traceId, spanId, traceFlags] = parts;
  if (!version || !traceId || !spanId || !traceFlags) return null;
  if (
    version.length !== 2 ||
    traceId.length !== 32 ||
    spanId.length !== 16 ||
    traceFlags.length !== 2
  ) {
    return null;
  }
  if (/^0+$/.test(traceId) || /^0+$/.test(spanId)) {
    return null; // All-zero IDs are invalid according to W3C spec
  }

  return {
    version: version.toLowerCase(),
    traceId: traceId.toLowerCase(),
    spanId: spanId.toLowerCase(),
    traceFlags: traceFlags.toLowerCase(),
  };
}

export function createTraceContext(parent?: W3CTraceContext | string | null): W3CTraceContext {
  if (typeof parent === 'string') {
    parent = parseTraceparent(parent);
  }

  if (parent) {
    return {
      version: '00',
      traceId: parent.traceId,
      spanId: generateSpanId(),
      traceFlags: parent.traceFlags,
    };
  }

  return {
    version: '00',
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    traceFlags: '01', // Sampled by default
  };
}

/**
 * Serializes W3CTraceContext into a compact 26-byte binary buffer
 */
export function serializeTraceContextToBinary(trace: W3CTraceContext): Uint8Array {
  const buf = new Uint8Array(TRACE_CONTEXT_BINARY_SIZE);
  buf[0] = parseInt(trace.version, 16) || 0x00;

  // Trace ID (16 bytes)
  for (let i = 0; i < 16; i++) {
    buf[1 + i] = parseInt(trace.traceId.substring(i * 2, i * 2 + 2), 16) || 0;
  }

  // Span ID (8 bytes)
  for (let i = 0; i < 8; i++) {
    buf[17 + i] = parseInt(trace.spanId.substring(i * 2, i * 2 + 2), 16) || 0;
  }

  // Trace Flags (1 byte)
  buf[25] = parseInt(trace.traceFlags, 16) || 0x01;
  return buf;
}

/**
 * Deserializes 26-byte binary buffer into W3CTraceContext
 */
export function deserializeTraceContextFromBinary(
  bytes: Uint8Array,
  offset = 0,
): W3CTraceContext | null {
  if (bytes.byteLength < offset + TRACE_CONTEXT_BINARY_SIZE) {
    return null;
  }

  const version = bytes[offset]!.toString(16).padStart(2, '0');

  let traceId = '';
  for (let i = 0; i < 16; i++) {
    traceId += bytes[offset + 1 + i]!.toString(16).padStart(2, '0');
  }

  let spanId = '';
  for (let i = 0; i < 8; i++) {
    spanId += bytes[offset + 17 + i]!.toString(16).padStart(2, '0');
  }

  const traceFlags = bytes[offset + 25]!.toString(16).padStart(2, '0');

  if (/^0+$/.test(traceId) || /^0+$/.test(spanId)) {
    return null;
  }

  return {
    version,
    traceId,
    spanId,
    traceFlags,
  };
}

/**
 * Wraps raw payload bytes with binary W3C trace context header
 */
export function wrapPacketWithTrace(
  payload: Uint8Array,
  trace: W3CTraceContext = createTraceContext(),
): Uint8Array {
  const traceBytes = serializeTraceContextToBinary(trace);
  const out = new Uint8Array(TRACE_CONTEXT_BINARY_SIZE + payload.byteLength);
  out.set(traceBytes, 0);
  out.set(payload, TRACE_CONTEXT_BINARY_SIZE);
  return out;
}

/**
 * Unwraps binary trace header from packet bytes
 */
export function unwrapPacketWithTrace(packet: Uint8Array): {
  trace: W3CTraceContext | null;
  payload: Uint8Array;
} {
  if (packet.byteLength < TRACE_CONTEXT_BINARY_SIZE) {
    return {
      trace: null,
      payload: packet,
    };
  }

  const trace = deserializeTraceContextFromBinary(packet, 0);
  const payload = packet.subarray(TRACE_CONTEXT_BINARY_SIZE);

  return {
    trace,
    payload,
  };
}
