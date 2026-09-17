/**
 * PN-Counter (Positive-Negative Counter) CRDT
 *
 * A state-based CRDT that supports both increment and decrement operations
 * while guaranteeing eventual consistency across concurrent updates.
 *
 * Structure: two GCounter arrays P (increments) and N (decrements),
 * each indexed by a nodeId string. Value = sum(P) - sum(N).
 * Merge: element-wise max of P and N arrays (no locks needed).
 *
 * Time complexity: O(n) where n = number of nodes.
 * Space: O(2n) — two maps of size n.
 *
 * V8 optimization: all objects maintain the same hidden-class shape.
 */

export interface PNCounterState {
  /** Node-id → positive increments from that node */
  readonly p: Readonly<Record<string, number>>;
  /** Node-id → negative decrements from that node */
  readonly n: Readonly<Record<string, number>>;
}

export class PNCounter {
  /** Positive accumulator — monotonically increasing per node */
  private readonly p: Record<string, number> = Object.create(null) as Record<string, number>;
  /** Negative accumulator — monotonically increasing per node */
  private readonly n: Record<string, number> = Object.create(null) as Record<string, number>;

  private _dirty = false;

  constructor(
    private readonly nodeId: string,
    initialState?: PNCounterState,
  ) {
    if (initialState) {
      this.applyState(initialState);
    }
  }

  /** Current value: sum(P) − sum(N) */
  get value(): number {
    return sumValues(this.p) - sumValues(this.n);
  }

  /** Whether the counter has unsynchronised local changes */
  get dirty(): boolean {
    return this._dirty;
  }

  /** Mark as synced (e.g. after flushing to Redis) */
  markClean(): void {
    this._dirty = false;
  }

  /**
   * Increment by `delta` (default 1).
   * Only mutates this node's P entry — O(1).
   */
  increment(delta = 1): void {
    if (delta <= 0) return;
    this.p[this.nodeId] = (this.p[this.nodeId] ?? 0) + delta;
    this._dirty = true;
  }

  /**
   * Decrement by `delta` (default 1).
   * Only mutates this node's N entry — O(1).
   */
  decrement(delta = 1): void {
    if (delta <= 0) return;
    this.n[this.nodeId] = (this.n[this.nodeId] ?? 0) + delta;
    this._dirty = true;
  }

  /**
   * Merge a remote counter state into this one using element-wise max.
   * Commutative, associative, idempotent — safe to call from any order.
   * O(n) where n = keys in remote state.
   */
  merge(remote: PNCounterState): void {
    mergeMax(this.p, remote.p);
    mergeMax(this.n, remote.n);
    this._dirty = true;
  }

  /** Serialize state for network transfer / Redis storage. */
  toState(): PNCounterState {
    return {
      p: { ...this.p },
      n: { ...this.n },
    };
  }

  /** Replace local state entirely from a serialized snapshot. */
  fromState(state: PNCounterState): void {
    clearObject(this.p);
    clearObject(this.n);
    this.applyState(state);
    this._dirty = false;
  }

  /** Reset to zero (local only — does NOT propagate). */
  reset(): void {
    clearObject(this.p);
    clearObject(this.n);
    this._dirty = true;
  }

  private applyState(state: PNCounterState): void {
    const pKeys = Object.keys(state.p);
    for (let i = 0; i < pKeys.length; i++) {
      this.p[pKeys[i]] = state.p[pKeys[i]];
    }
    const nKeys = Object.keys(state.n);
    for (let i = 0; i < nKeys.length; i++) {
      this.n[nKeys[i]] = state.n[nKeys[i]];
    }
  }
}

// ─── Pure helpers (tree-shakeable, V8-inlineable) ────────────────────────────

function sumValues(obj: Record<string, number>): number {
  let total = 0;
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    total += obj[keys[i]];
  }
  return total;
}

function mergeMax(local: Record<string, number>, remote: Readonly<Record<string, number>>): void {
  const keys = Object.keys(remote);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const rv = remote[k];
    const lv = local[k];
    if (lv === undefined || rv > lv) {
      local[k] = rv;
    }
  }
}

function clearObject(obj: Record<string, number>): void {
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    delete obj[keys[i]];
  }
}
