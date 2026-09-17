import { CircuitBreaker, CircuitBreakerOpenException, CircuitState } from '../circuit-breaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts in CLOSED state and executes actions successfully', async () => {
    const cb = new CircuitBreaker({ name: 'test-service' });
    expect(cb.getState()).toBe(CircuitState.CLOSED);

    const result = await cb.execute(async () => 'success-payload');
    expect(result).toBe('success-payload');
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('transitions to OPEN state when failure threshold is reached', async () => {
    const onStateChange = jest.fn();
    const cb = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 5000,
      name: 'failing-service',
      onStateChange,
    });

    const failingAction = async () => {
      throw new Error('Service unavailable');
    };

    // 1st failure
    await expect(cb.execute(failingAction)).rejects.toThrow('Service unavailable');
    expect(cb.getState()).toBe(CircuitState.CLOSED);

    // 2nd failure
    await expect(cb.execute(failingAction)).rejects.toThrow('Service unavailable');
    expect(cb.getState()).toBe(CircuitState.CLOSED);

    // 3rd failure -> Opens circuit
    await expect(cb.execute(failingAction)).rejects.toThrow('Service unavailable');
    expect(cb.getState()).toBe(CircuitState.OPEN);
    expect(onStateChange).toHaveBeenCalledWith(CircuitState.CLOSED, CircuitState.OPEN);

    // Immediate next call fails fast with CircuitBreakerOpenException without executing action
    const mockAction = jest.fn();
    await expect(cb.execute(mockAction)).rejects.toThrow(CircuitBreakerOpenException);
    expect(mockAction).not.toHaveBeenCalled();
  });

  it('executes fallback when circuit is OPEN', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeoutMs: 5000,
      name: 'fallback-service',
    });

    const failingAction = async () => {
      throw new Error('Downstream failure');
    };

    await expect(cb.execute(failingAction)).rejects.toThrow();
    await expect(cb.execute(failingAction)).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitState.OPEN);

    const fallbackResult = await cb.execute(
      async () => 'never-reached',
      async () => 'graceful-fallback-data',
    );
    expect(fallbackResult).toBe('graceful-fallback-data');
  });

  it('transitions from OPEN to HALF_OPEN after resetTimeoutMs and closes on successes', async () => {
    const onStateChange = jest.fn();
    const cb = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeoutMs: 3000,
      halfOpenSuccessThreshold: 2,
      name: 'recovery-service',
      onStateChange,
    });

    // Cause 2 failures to OPEN
    await expect(
      cb.execute(async () => {
        throw new Error('fail');
      }),
    ).rejects.toThrow();
    await expect(
      cb.execute(async () => {
        throw new Error('fail');
      }),
    ).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitState.OPEN);

    // Advance time past reset timeout
    jest.advanceTimersByTime(3500);
    expect(cb.getState()).toBe(CircuitState.HALF_OPEN);
    expect(onStateChange).toHaveBeenCalledWith(CircuitState.OPEN, CircuitState.HALF_OPEN);

    // 1st success in HALF_OPEN
    const res1 = await cb.execute(async () => 'attempt-1-success');
    expect(res1).toBe('attempt-1-success');
    expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

    // 2nd success in HALF_OPEN -> Re-closes circuit
    const res2 = await cb.execute(async () => 'attempt-2-success');
    expect(res2).toBe('attempt-2-success');
    expect(cb.getState()).toBe(CircuitState.CLOSED);
    expect(onStateChange).toHaveBeenCalledWith(CircuitState.HALF_OPEN, CircuitState.CLOSED);
  });

  it('transitions back to OPEN if execution fails in HALF_OPEN state', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeoutMs: 3000,
      name: 'half-open-fail-service',
    });

    await expect(
      cb.execute(async () => {
        throw new Error('fail');
      }),
    ).rejects.toThrow();
    await expect(
      cb.execute(async () => {
        throw new Error('fail');
      }),
    ).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitState.OPEN);

    jest.advanceTimersByTime(3500);
    expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

    // Failure in HALF_OPEN immediately re-opens the circuit
    await expect(
      cb.execute(async () => {
        throw new Error('still failing');
      }),
    ).rejects.toThrow('still failing');
    expect(cb.getState()).toBe(CircuitState.OPEN);
  });

  it('resets to CLOSED on manual reset()', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    await expect(
      cb.execute(async () => {
        throw new Error('fail');
      }),
    ).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitState.OPEN);

    cb.reset();
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });
});
