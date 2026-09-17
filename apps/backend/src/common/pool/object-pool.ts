export interface ObjectPoolOptions<T> {
  name?: string | undefined;
  factory: () => T;
  resetFn?: ((item: T) => void) | undefined;
  initialCapacity?: number | undefined;
  maxCapacity?: number | undefined;
}

/**
 * High-performance, zero-allocation Object Pool.
 *
 * Eliminates V8 heap allocation churn and Garbage Collection (GC) pauses
 * for high-frequency operations (WebSocket frames, event dispatching, packet wrapping).
 */
export class ObjectPool<T> {
  private readonly items: T[] = [];
  private readonly factory: () => T;
  private readonly resetFn?: ((item: T) => void) | undefined;
  private readonly maxCapacity: number;

  constructor(options: ObjectPoolOptions<T>) {
    this.factory = options.factory;
    this.resetFn = options.resetFn;
    this.maxCapacity = options.maxCapacity ?? 2000;

    const initial = options.initialCapacity ?? 16;
    for (let i = 0; i < initial; i++) {
      this.items.push(this.factory());
    }
  }

  /**
   * Acquires an object from the pool, or allocates a new one if pool is empty.
   */
  acquire(): T {
    if (this.items.length > 0) {
      return this.items.pop()!;
    }
    return this.factory();
  }

  /**
   * Releases an object back to the pool after resetting its state.
   */
  release(item: T): void {
    if (!item) return;

    if (this.resetFn) {
      try {
        this.resetFn(item);
      } catch {
        // Drop malformed object on reset error
        return;
      }
    }

    if (this.items.length < this.maxCapacity) {
      this.items.push(item);
    }
  }

  /**
   * Executes a synchronous function with an acquired object and automatically releases it.
   */
  runWith<R>(fn: (item: T) => R): R {
    const item = this.acquire();
    try {
      return fn(item);
    } finally {
      this.release(item);
    }
  }

  /**
   * Executes an asynchronous function with an acquired object and automatically releases it.
   */
  async runWithAsync<R>(fn: (item: T) => Promise<R>): Promise<R> {
    const item = this.acquire();
    try {
      return await fn(item);
    } finally {
      this.release(item);
    }
  }

  /**
   * Number of available pooled objects in standby.
   */
  get size(): number {
    return this.items.length;
  }

  /**
   * Clears all pooled objects.
   */
  clear(): void {
    this.items.length = 0;
  }
}
