/**
 * Frontend CPU Circuit Breaker & 5ms Time-Budget Interceptor
 *
 * Protects browser main thread and React rendering from being frozen by
 * massive formatted text, complex Markdown AST processing, or KaTeX math expressions.
 * If an operation takes longer than the time budget (5ms), trips to OPEN
 * and returns simplified plain text to maintain 60 FPS UI responsiveness.
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CpuCircuitBreakerOptions {
  budgetMs?: number;
  tripThreshold?: number;
  cooldownMs?: number;
}

export class CpuCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private consecutiveTrips = 0;
  private lastTripTimestamp = 0;

  public readonly budgetMs: number;
  public readonly tripThreshold: number;
  public readonly cooldownMs: number;

  constructor(
    public readonly name: string,
    options: CpuCircuitBreakerOptions = {},
  ) {
    this.budgetMs = options.budgetMs ?? 5;
    this.tripThreshold = options.tripThreshold ?? 3;
    this.cooldownMs = options.cooldownMs ?? 8_000;
  }

  execute<T>(fn: () => T, fallback: (reason: string, elapsedMs: number) => T): T {
    const now = Date.now();

    if (this.state === CircuitState.OPEN) {
      if (now - this.lastTripTimestamp >= this.cooldownMs) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        return fallback('CIRCUIT_OPEN', 0);
      }
    }

    const start = performance.now();
    let result: T;
    try {
      result = fn();
    } catch {
      this.recordTrip();
      return fallback('ERROR', performance.now() - start);
    }
    const elapsed = performance.now() - start;

    if (elapsed > this.budgetMs) {
      this.recordTrip();
      if (this.state === CircuitState.HALF_OPEN) {
        this.state = CircuitState.OPEN;
      }
      return fallback('BUDGET_EXCEEDED', elapsed);
    }

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.consecutiveTrips = 0;
    } else {
      this.consecutiveTrips = Math.max(0, this.consecutiveTrips - 1);
    }

    return result;
  }

  private recordTrip(): void {
    this.consecutiveTrips++;
    this.lastTripTimestamp = Date.now();
    if (this.consecutiveTrips >= this.tripThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.consecutiveTrips = 0;
  }
}

export function withTimeBudget<T>(
  fn: () => T,
  budgetMs = 5,
  fallback: (elapsedMs: number) => T,
): T {
  const start = performance.now();
  try {
    const result = fn();
    const elapsed = performance.now() - start;
    if (elapsed > budgetMs) {
      return fallback(elapsed);
    }
    return result;
  } catch {
    return fallback(performance.now() - start);
  }
}
