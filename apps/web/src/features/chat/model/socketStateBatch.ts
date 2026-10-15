const STATE_BATCH_WINDOW_MS = 50;
const MAX_PENDING_KEYS = 500;

/** Latest replaceable state per key; message/cache events use the FIFO batch. */
export function createSocketStateBatch<T>(publish: (updates: ReadonlyMap<string, T>) => void) {
  const pending = new Map<string, T>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    pending.clear();
  };
  const flush = () => {
    if (disposed) return;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (pending.size === 0) return;
    const updates = new Map(pending);
    pending.clear();
    publish(updates);
  };
  const schedule = () => {
    if (pending.size >= MAX_PENDING_KEYS) flush();
    else if (timer === undefined && pending.size > 0)
      timer = setTimeout(flush, STATE_BATCH_WINDOW_MS);
  };
  return {
    enqueue: (key: string, update: (previous: T | undefined) => T) => {
      if (disposed) return;
      pending.set(key, update(pending.get(key)));
      schedule();
    },
    enqueueMany: (updates: Iterable<readonly [string, (previous: T | undefined) => T]>) => {
      if (disposed) return;
      for (const [key, update] of updates) pending.set(key, update(pending.get(key)));
      // An authoritative server batch publishes atomically. Large inputs flush
      // now rather than retaining more than the pending-key bound for 50 ms.
      schedule();
    },
    flush,
    cancel,
    dispose: () => {
      cancel();
      disposed = true;
    },
  };
}
