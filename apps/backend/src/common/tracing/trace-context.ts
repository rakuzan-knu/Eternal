import { AsyncLocalStorage } from 'node:async_hooks';

export interface TraceStore {
  traceId: string;
  correlationId?: string | undefined;
  userId?: string | undefined;
  reqMethod?: string | undefined;
  reqUrl?: string | undefined;
  startTime?: number | undefined;
  startHrTime?: bigint | undefined;
  abortSignal?: AbortSignal | undefined;
  abortController?: AbortController | undefined;
}

export class TraceContext {
  private static readonly storage = new AsyncLocalStorage<TraceStore>();

  static run<R>(store: TraceStore, callback: () => R): R {
    return this.storage.run({ ...store }, callback);
  }

  static runIsolated<R>(store: TraceStore, callback: () => Promise<R> | R): Promise<R> | R {
    const isolatedStore: TraceStore = { ...store };
    return this.storage.run(isolatedStore, callback);
  }

  static exit<R>(callback: () => R): R {
    return this.storage.exit(callback);
  }

  static bind<TArgs extends unknown[], TReturn>(
    fn: (...args: TArgs) => TReturn,
    store?: TraceStore,
  ): (...args: TArgs) => TReturn {
    const currentStore = this.getStore();
    const boundStore = store ? { ...store } : currentStore ? { ...currentStore } : undefined;
    if (!boundStore) return fn;
    return (...args: TArgs): TReturn => this.storage.run(boundStore, () => fn(...args));
  }

  static getStore(): TraceStore | undefined {
    return this.storage.getStore();
  }

  static snapshot(): TraceStore | undefined {
    const store = this.storage.getStore();
    return store ? { ...store } : undefined;
  }

  static getTraceId(): string | undefined {
    return this.storage.getStore()?.traceId;
  }

  static getUserId(): string | undefined {
    return this.storage.getStore()?.userId;
  }

  static setUserId(userId: string): void {
    const store = this.storage.getStore();
    if (store) {
      store.userId = userId;
    }
  }

  static setTraceId(traceId: string): void {
    const store = this.storage.getStore();
    if (store) {
      store.traceId = traceId;
      store.correlationId = traceId;
    }
  }

  static getAbortSignal(): AbortSignal | undefined {
    return this.storage.getStore()?.abortSignal;
  }

  static setAbortSignal(signal: AbortSignal): void {
    const store = this.storage.getStore();
    if (store) {
      store.abortSignal = signal;
    }
  }

  static getAbortController(): AbortController | undefined {
    return this.storage.getStore()?.abortController;
  }

  static setAbortController(controller: AbortController): void {
    const store = this.storage.getStore();
    if (store) {
      store.abortController = controller;
      store.abortSignal = controller.signal;
    }
  }

  static clear(): void {
    const store = this.storage.getStore();
    if (store) {
      store.abortController = undefined;
      store.abortSignal = undefined;
    }
  }
}
