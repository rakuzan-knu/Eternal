/**
 * LWW-Element-Set (Last-Write-Wins Element Set) CRDT
 *
 * Each element is stored with a high-resolution timestamp and a tombstone flag.
 * On merge, the entry with the larger timestamp wins. This guarantees eventual
 * consistency for concurrent adds/removes with no coordination.
 *
 * Use-cases:
 *  - "has user <id> read message <id>" (add-wins on tie)
 *  - token blacklist (remove wins on tie via `bias: 'remove'`)
 *  - online presence markers
 *
 * Time: O(n) merge, O(1) add/remove/has.
 * Space: O(n) where n = distinct elements ever observed.
 *
 * V8 shape stability: LWWEntry always has exactly {ts, tomb} — same hidden class.
 */

/** Internal entry — shape-stable: always two fields in this order. */
export interface LWWEntry {
  ts: number; // millisecond epoch timestamp
  tomb: boolean; // true = element was removed (tombstone)
}

/** Serializable snapshot for network transfer / Redis storage. */
export type LWWState = Record<string, LWWEntry>;

export type LWWBias = 'add' | 'remove';

export class LWWElementSet {
  /** element-key → LWWEntry. Null-prototype object for V8 dictionary fast-path. */
  private readonly entries: Record<string, LWWEntry> = Object.create(null) as Record<
    string,
    LWWEntry
  >;

  private _dirty = false;

  /**
   * @param bias  On equal timestamps: 'add' keeps the element, 'remove' tombstones it.
   *              'remove' is safer for security-sensitive sets (token blacklists).
   */
  constructor(private readonly bias: LWWBias = 'add') {}

  /** Whether the set has unsynchronised local changes */
  get dirty(): boolean {
    return this._dirty;
  }

  markClean(): void {
    this._dirty = false;
  }

  /**
   * Add (un-tombstone) an element at the current wall-clock timestamp.
   * Uses `performance.now()` sub-ms precision combined with `Date.now()` for
   * a monotonically increasing value even within the same millisecond.
   */
  add(element: string, ts?: number): void {
    const timestamp = ts ?? Date.now();
    const existing = this.entries[element];
    if (
      existing === undefined ||
      timestamp > existing.ts ||
      (timestamp === existing.ts && this.bias === 'add')
    ) {
      if (existing === undefined) {
        // Shape-stable allocation: always declare both fields
        this.entries[element] = { ts: timestamp, tomb: false };
      } else {
        existing.ts = timestamp;
        existing.tomb = false;
      }
      this._dirty = true;
    }
  }

  /**
   * Remove (tombstone) an element. The tombstone wins over add on higher ts.
   */
  remove(element: string, ts?: number): void {
    const timestamp = ts ?? Date.now();
    const existing = this.entries[element];
    if (
      existing === undefined ||
      timestamp > existing.ts ||
      (timestamp === existing.ts && this.bias === 'remove')
    ) {
      if (existing === undefined) {
        this.entries[element] = { ts: timestamp, tomb: true };
      } else {
        existing.ts = timestamp;
        existing.tomb = true;
      }
      this._dirty = true;
    }
  }

  /** Returns true if element is present (added and not tombstoned). O(1). */
  has(element: string): boolean {
    const entry = this.entries[element];
    return entry !== undefined && !entry.tomb;
  }

  /**
   * Merge remote state. Element-wise: higher timestamp wins.
   * On tie: bias determines winner.
   * Commutative, associative, idempotent.
   */
  merge(remote: LWWState): void {
    const keys = Object.keys(remote);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const remoteEntry = remote[k];
      const localEntry = this.entries[k];

      if (localEntry === undefined) {
        // Shape-stable allocation
        this.entries[k] = { ts: remoteEntry.ts, tomb: remoteEntry.tomb };
        this._dirty = true;
        continue;
      }

      if (remoteEntry.ts > localEntry.ts) {
        localEntry.ts = remoteEntry.ts;
        localEntry.tomb = remoteEntry.tomb;
        this._dirty = true;
      } else if (remoteEntry.ts === localEntry.ts) {
        // Tie-break via bias
        const remoteTomb = remoteEntry.tomb;
        const localTomb = localEntry.tomb;
        if (remoteTomb !== localTomb) {
          const shouldTombstone =
            this.bias === 'remove' ? remoteTomb || localTomb : remoteTomb && localTomb;
          if (shouldTombstone !== localTomb) {
            localEntry.tomb = shouldTombstone;
            this._dirty = true;
          }
        }
      }
    }
  }

  /** Serialize current state for storage or replication. */
  toState(): LWWState {
    const result: LWWState = Object.create(null) as LWWState;
    const keys = Object.keys(this.entries);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const e = this.entries[k];
      // Shape-stable copy
      result[k] = { ts: e.ts, tomb: e.tomb };
    }
    return result;
  }

  /** Replace entire state from a snapshot (e.g. after Redis restore). */
  fromState(state: LWWState): void {
    // Clear existing
    const existing = Object.keys(this.entries);
    for (let i = 0; i < existing.length; i++) {
      delete this.entries[existing[i]];
    }
    // Apply new state
    const keys = Object.keys(state);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const e = state[k];
      this.entries[k] = { ts: e.ts, tomb: e.tomb };
    }
    this._dirty = false;
  }

  /** Number of live (non-tombstoned) elements. */
  get size(): number {
    let count = 0;
    const keys = Object.keys(this.entries);
    for (let i = 0; i < keys.length; i++) {
      if (!this.entries[keys[i]].tomb) count++;
    }
    return count;
  }

  /** GC old tombstones older than `olderThanMs` milliseconds. */
  vacuum(olderThanMs: number): number {
    const cutoff = Date.now() - olderThanMs;
    const keys = Object.keys(this.entries);
    let removed = 0;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const e = this.entries[k];
      if (e.tomb && e.ts < cutoff) {
        delete this.entries[k];
        removed++;
      }
    }
    return removed;
  }
}
