# ADR 004: Correlation ID Tracing & Observability Architecture

## Status

Accepted

## Context

Diagnosing distributed system issues across HTTP endpoints, WebSocket gateways, asynchronous BullMQ queues, and database operations requires continuous end-to-end request tracing and standardized metric instrumentation.

## Decision

1. Implement a globally applied `CorrelationIdMiddleware` in NestJS:
   - Reads incoming `x-correlation-id` or `x-request-id` headers, falling back to generating a UUID v4 via Node's native `crypto.randomUUID()`.
   - Propagates `x-correlation-id` on the HTTP response headers.
2. Maintain Prometheus metrics instrumentation via `MetricsMiddleware` and `MetricsService` (`prom-client`), exposing standard RED (Rate, Errors, Duration) metrics on `/metrics`.
3. Support Sentry error tracking integration for production fault reporting.

## Consequences

### Positive

- Unified request tracking across logs and downstream services.
- Zero external dependencies required for UUID generation (uses native Node crypto).
- Real-time Prometheus metrics for latency percentiles and error rates.

### Negative / Trade-offs

- Slight per-request middleware processing overhead (~0.01ms).
