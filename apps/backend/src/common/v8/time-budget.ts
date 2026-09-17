/**
 * V8 CPU-Bound Isolation & Time-Budget Circuit Breaker
 *
 * Prevents heavy string parsing, regex scanning, or markdown/HTML processing
 * from monopolizing the Node.js Event Loop for tens of milliseconds.
 *
 * If an operation takes longer than the time budget (default 5ms),
 * the circuit breaker trips to OPEN, instantly returning simplified fallbacks
 * without executing the CPU-bound algorithm until a cooldown period passes.
 */

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation: executing full algorithm
  OPEN = 'OPEN', // Tripped: skipping heavy execution, returning fallback
  HALF_OPEN = 'HALF_OPEN', // Probing: testing if performance has recovered
}

export interface CpuCircuitBreakerOptions {
  /** Time budget in milliseconds per execution (default: 5ms) */
  budgetMs?: number;
  /** Consecutive trips before opening circuit (default: 3) */
  tripThreshold?: number;
  /** Cooldown in milliseconds before probing HALF_OPEN (default: 10_000ms) */
  cooldownMs?: number;
  /** Optional logger / alert hook */
  onTrip?: (name: string, elapsedMs: number, consecutiveTrips: number) => void;
}

export class CpuCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private consecutiveTrips = 0;
  private lastTripTimestamp = 0;
  private totalCalls = 0;
  private totalFallbacks = 0;

  public readonly budgetMs: number;
  public readonly tripThreshold: number;
  public readonly cooldownMs: number;

  constructor(
    public readonly name: string,
    options: CpuCircuitBreakerOptions = {},
  ) {
    this.budgetMs = options.budgetMs ?? 5;
    this.tripThreshold = options.tripThreshold ?? 3;
    this.cooldownMs = options.cooldownMs ?? 10_000;
  }

  /**
   * Executes `fn` within the CPU budget. If the circuit is OPEN or the execution
   * exceeds the budget, falls back to `fallback` to protect the Event Loop.
   */
  execute<T>(fn: () => T, fallback: (reason: string, elapsedMs: number) => T): T {
    this.totalCalls++;
    const now = Date.now();

    // Check if OPEN and whether cooldown has expired
    if (this.state === CircuitState.OPEN) {
      if (now - this.lastTripTimestamp >= this.cooldownMs) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        this.totalFallbacks++;
        return fallback('CIRCUIT_OPEN', 0);
      }
    }

    const start = performance.now();
    let result: T;
    try {
      result = fn();
    } catch {
      this.recordTrip(performance.now() - start);
      return fallback('EXECUTION_ERROR', performance.now() - start);
    }
    const elapsed = performance.now() - start;

    if (elapsed > this.budgetMs) {
      this.recordTrip(elapsed);
      // If we are in HALF_OPEN, reopen immediately
      if (this.state === CircuitState.HALF_OPEN) {
        this.state = CircuitState.OPEN;
      }
      this.totalFallbacks++;
      return fallback('BUDGET_EXCEEDED', elapsed);
    }

    // Success under budget
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.consecutiveTrips = 0;
    } else {
      this.consecutiveTrips = Math.max(0, this.consecutiveTrips - 1);
    }

    return result;
  }

  private recordTrip(_elapsedMs?: number): void {
    this.consecutiveTrips++;
    this.lastTripTimestamp = Date.now();
    if (this.consecutiveTrips >= this.tripThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics() {
    return {
      name: this.name,
      state: this.state,
      consecutiveTrips: this.consecutiveTrips,
      totalCalls: this.totalCalls,
      totalFallbacks: this.totalFallbacks,
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.consecutiveTrips = 0;
    this.lastTripTimestamp = 0;
  }
}

/**
 * Functional wrapper for one-off CPU-budgeted operations.
 * If execution exceeds `budgetMs` (default 5ms), returns fallback value.
 */
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
