/**
 * Lock-free process-local codec counters.
 *
 * Plain number fields on a single object: no Map lookups, no atomics
 * (Node is single-threaded per process), safe to touch on the hot path.
 * Aggregate across pods in Prometheus/Grafana via the backend metrics
 * endpoint — this module never does I/O itself.
 */

import type { CodecMetricsSnapshot } from './types';

export interface CodecMetrics {
  encodeCalls: number;
  decodeCalls: number;
  headerOnlyCalls: number;
  encodeBytes: number;
  decodeBytes: number;
  errors: Record<string, number>;
}

export function createCodecMetrics(): CodecMetrics {
  return {
    encodeCalls: 0,
    decodeCalls: 0,
    headerOnlyCalls: 0,
    encodeBytes: 0,
    decodeBytes: 0,
    errors: {},
  };
}

export function recordEncode(metrics: CodecMetrics, bytes: number): void {
  metrics.encodeCalls += 1;
  metrics.encodeBytes += bytes;
}

export function recordDecode(metrics: CodecMetrics, bytes: number): void {
  metrics.decodeCalls += 1;
  metrics.decodeBytes += bytes;
}

export function recordHeaderOnly(metrics: CodecMetrics): void {
  metrics.headerOnlyCalls += 1;
}

export function recordError(metrics: CodecMetrics, code: string): void {
  metrics.errors[code] = (metrics.errors[code] ?? 0) + 1;
}

export function snapshotMetrics(metrics: CodecMetrics): CodecMetricsSnapshot {
  return {
    encodeCalls: metrics.encodeCalls,
    decodeCalls: metrics.decodeCalls,
    headerOnlyCalls: metrics.headerOnlyCalls,
    encodeBytes: metrics.encodeBytes,
    decodeBytes: metrics.decodeBytes,
    errors: { ...metrics.errors },
  };
}

export function resetMetrics(metrics: CodecMetrics): void {
  metrics.encodeCalls = 0;
  metrics.decodeCalls = 0;
  metrics.headerOnlyCalls = 0;
  metrics.encodeBytes = 0;
  metrics.decodeBytes = 0;
  for (const key of Object.keys(metrics.errors)) {
    delete metrics.errors[key];
  }
}
