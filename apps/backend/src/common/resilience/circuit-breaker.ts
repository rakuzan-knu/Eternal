export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  halfOpenSuccessThreshold?: number;
  name?: string | undefined;
  onStateChange?: ((from: CircuitState, to: CircuitState) => void) | undefined;
}

export class CircuitBreakerOpenException extends Error {
  constructor(serviceName: string) {
    super(`Circuit breaker is OPEN for service: ${serviceName}`);
    this.name = 'CircuitBreakerOpenException';
  }
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttemptNano = 0n;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenSuccessThreshold: number;
  private readonly name: string;
  private readonly onStateChange?: ((from: CircuitState, to: CircuitState) => void) | undefined;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 10_000;
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold ?? 2;
    this.name = options.name ?? 'default';
    this.onStateChange = options.onStateChange;
  }

  getState(): CircuitState {
    if (this.state === CircuitState.OPEN && process.hrtime.bigint() >= this.nextAttemptNano) {
      this.transitionTo(CircuitState.HALF_OPEN);
    }
    return this.state;
  }

  async execute<T>(
    action: () => Promise<T>,
    fallback?: (err?: unknown) => T | Promise<T>,
  ): Promise<T> {
    const currentState = this.getState();

    if (currentState === CircuitState.OPEN) {
      if (fallback) {
        return fallback(new CircuitBreakerOpenException(this.name));
      }
      throw new CircuitBreakerOpenException(this.name);
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) {
        return fallback(error);
      }
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.state === CircuitState.HALF_OPEN || this.failureCount >= this.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    if (newState === CircuitState.OPEN) {
      this.nextAttemptNano = process.hrtime.bigint() + BigInt(this.resetTimeoutMs) * 1_000_000n;
      this.successCount = 0;
    } else if (newState === CircuitState.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successCount = 0;
    }
    if (oldState !== newState && this.onStateChange) {
      this.onStateChange(oldState, newState);
    }
  }

  reset(): void {
    this.transitionTo(CircuitState.CLOSED);
  }
}
